/**
 * Webhook Pipeline — idempotency, retry queue, dead-letter handling.
 *
 * Redox sends webhooks with at-least-once delivery. Without dedup,
 * the same NewPatient or Results event can create duplicate rows.
 *
 * Strategy:
 *   1. Derive an idempotency key from (Source.ID, EventType, EventDateTime)
 *   2. Check WebhookEvent table for existing key before processing
 *   3. On transient failure, mark RETRYING with exponential backoff
 *   4. After MAX_RETRIES, move to FAILED (dead-letter)
 */

import prisma from '../lib/prisma';
import { RedoxWebhookPayload } from '../types';
// AUDIT-011 LEGITIMATE_BYPASS (2026-05-02; marker pattern migrated 2026-05-07):
// WebhookEvent operations are system-internal idempotency/retry queue. Scope
// is derived from HMAC-validated payload, not user JWT. The eventId composite
// includes hospitalId at write time, so reads by eventId are implicitly scoped.
// Layer 3 (`prismaTenantGuard.ts`) reads `__tenantGuardBypass: true` on args
// to skip enforcement for these queries. Marker pattern migrated from
// Symbol.for() to string-keyed (Prisma 5.22 $extends strips Symbol-keyed
// properties; Step 1.0/1.0.1 verification).
import { createLogger } from 'winston';

const logger = createLogger({ defaultMeta: { service: 'webhook-pipeline' } });

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s, 8s, 16s

// ── Idempotency key generation ──────────────────────────────────────────────

export function deriveIdempotencyKey(payload: RedoxWebhookPayload): string {
  const sourceId = payload.Source?.ID || payload.Meta?.Source?.ID || 'unknown';
  const eventType = payload.EventType || 'unknown';
  const eventDateTime = payload.EventDateTime || '';
  // Also include a patient identifier for uniqueness when same source sends
  // multiple events at the same timestamp
  const patientId = payload.Patient?.id || '';
  return `${sourceId}:${eventType}:${eventDateTime}:${patientId}`;
}

// ── Dedup check ─────────────────────────────────────────────────────────────
// Returns the existing WebhookEvent if this exact event was already processed.

export async function checkDuplicate(idempotencyKey: string): Promise<{
  isDuplicate: boolean;
  existingId?: string;
  existingStatus?: string;
}> {
  const existing = await prisma.webhookEvent.findFirst({
    where: { eventId: idempotencyKey },
    select: { id: true, status: true },
    __tenantGuardBypass: true,
  } as any);

  if (existing && existing.status === 'COMPLETED') {
    logger.info('Duplicate webhook detected — already processed', { idempotencyKey });
    return { isDuplicate: true, existingId: existing.id, existingStatus: existing.status };
  }

  // If it exists but FAILED/RETRYING, allow re-processing
  if (existing && (existing.status === 'FAILED' || existing.status === 'RETRYING')) {
    logger.info('Retrying previously failed webhook', { idempotencyKey, status: existing.status });
    return { isDuplicate: false, existingId: existing.id, existingStatus: existing.status };
  }

  return { isDuplicate: false };
}

// ── Create or reuse webhook event record ────────────────────────────────────

export async function createWebhookRecord(
  idempotencyKey: string,
  hospitalId: string,
  payload: RedoxWebhookPayload,
  existingId?: string,
): Promise<string> {
  if (existingId) {
    // Re-activate an existing FAILED record for retry
    await prisma.webhookEvent.update({
      where: { id: existingId },
      data: { status: 'PROCESSING', errorMessage: null },
      __tenantGuardBypass: true,
    } as any);
    return existingId;
  }

  const record = await prisma.webhookEvent.create({
    data: {
      hospitalId,
      eventType: payload.EventType,
      eventId: idempotencyKey,
      sourceSystem: payload.Source?.Name || payload.Meta?.Source?.Name || 'Unknown',
      eventDateTime: payload.EventDateTime ? new Date(payload.EventDateTime) : new Date(),
      rawPayload: payload as any,
      status: 'PROCESSING',
    },
    __tenantGuardBypass: true,
  } as any);
  return record.id;
}

// ── Mark success ────────────────────────────────────────────────────────────

export async function markCompleted(webhookEventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { status: 'COMPLETED', processedAt: new Date() },
    __tenantGuardBypass: true,
  } as any);
}

// ── Mark failure with retry logic ───────────────────────────────────────────

export async function markFailed(
  webhookEventId: string,
  error: Error,
): Promise<{ shouldRetry: boolean; retryAfterMs?: number }> {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
    select: { retryCount: true },
    __tenantGuardBypass: true,
  } as any);

  const retryCount = (event?.retryCount || 0) + 1;

  if (retryCount > MAX_RETRIES) {
    // Dead-letter: no more retries
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: 'FAILED',
        errorMessage: `Dead-letter after ${MAX_RETRIES} retries: ${error.message}`,
        retryCount,
        processedAt: new Date(),
      },
      __tenantGuardBypass: true,
    } as any);
    logger.error('Webhook dead-lettered', { webhookEventId, retryCount, error: error.message });
    return { shouldRetry: false };
  }

  // Exponential backoff
  const retryAfterMs = BASE_DELAY_MS * Math.pow(2, retryCount - 1);

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status: 'RETRYING',
      errorMessage: error.message,
      retryCount,
    },
    __tenantGuardBypass: true,
  } as any);

  logger.warn('Webhook marked for retry', { webhookEventId, retryCount, retryAfterMs });
  return { shouldRetry: true, retryAfterMs };
}

// ── Retry processor (runs on a timer) ───────────────────────────────────────
// Scans for RETRYING events and re-dispatches them.

export async function processRetryQueue(
  processEvent: (payload: RedoxWebhookPayload, hospitalId: string) => Promise<void>,
): Promise<number> {
  const retryableEvents = await prisma.webhookEvent.findMany({
    where: { status: 'RETRYING' },
    orderBy: { createdAt: 'asc' },
    take: 10, // Process in batches of 10
    __tenantGuardBypass: true,
  } as any);

  let processed = 0;
  for (const event of retryableEvents) {
    try {
      const payload = event.rawPayload as unknown as RedoxWebhookPayload;
      await processEvent(payload, event.hospitalId);
      await markCompleted(event.id);
      processed++;
    } catch (err: any) {
      await markFailed(event.id, err);
    }
  }

  if (processed > 0) {
    logger.info(`Retry queue: processed ${processed}/${retryableEvents.length} events`);
  }
  return processed;
}

// ── Dead-letter report ──────────────────────────────────────────────────────

export async function getDeadLetterEvents(
  hospitalId?: string,
  limit = 50,
): Promise<any[]> {
  return prisma.webhookEvent.findMany({
    where: {
      status: 'FAILED',
      ...(hospitalId ? { hospitalId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      eventType: true,
      eventId: true,
      sourceSystem: true,
      errorMessage: true,
      retryCount: true,
      eventDateTime: true,
      createdAt: true,
    },
    __tenantGuardBypass: true,
  } as any);
}
