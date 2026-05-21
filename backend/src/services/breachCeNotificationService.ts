/**
 * breachCeNotificationService - BA-to-CE breach notification orchestration.
 *
 * Implements the §164.410 primary BA obligation workflow gap surfaced as
 * 5-BRC-06. Orchestrates the multi-channel notification framework (Q-5BRC-B),
 * the 7-state CE notification state machine (Q-5BRC-C), async out-of-band
 * acknowledgment recording (Q-5BRC-D), template-with-variable-substitution
 * (Q-5BRC-E), and dual event-level + notification-level audit trail
 * (Q-5BRC-F).
 *
 * State machine (per Q-5BRC-C + 45 CFR 164.410(b) burden-of-proof):
 *
 *   (entry from existing BreachStatus flow)
 *      |
 *      v
 *   CE_NOTIFICATION_QUEUED ---> CE_NOTIFICATION_SENT ---> CE_NOTIFICATION_DELIVERED
 *                                                              |
 *                                                              v
 *                                                       CE_ACKNOWLEDGED
 *                                                              |
 *                                                              v
 *                                                CE_FOLLOWUP_REQUESTED <--> CE_FOLLOWUP_RESPONDED
 *                                                              |
 *                                                              v
 *                                                          CE_CLOSED
 *
 * Invalid transitions throw InvalidStateTransitionError. No silent default to
 * "current state" (CLAUDE.md §14 NEVER silent-defaults rule).
 *
 * Tenant-isolation (Q-5BRC-G + AUDIT-011 + CLAUDE.md NEVER DO rules 6-8):
 *   Every method enforces tenantId scoping on BOTH the BreachIncident
 *   record (via hospitalId scope; BreachIncident already carries hospitalId)
 *   AND the linked CoveredEntity (via tenantId scope). Mismatch throws
 *   TenantScopeViolationError.
 *
 * Channel framework (per Q-5BRC-B; v1.0 scope):
 *   - email     concrete via emailService.sendEmail (existing AWS SES integration)
 *   - signedPdf concrete; deferred to v3.0 channel due to no current
 *               PDF-signing infrastructure (NotImplementedError); flagged as
 *               §17.1 architectural-precedent candidate at P1.3.4 self-review
 *   - securePortal v3.0 placeholder (NotImplementedError)
 *   - sms       v3.0 placeholder (NotImplementedError)
 */

import type { BreachIncident, BreachStatus, CoveredEntity, Hospital } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { auditLogger } from '../middleware/auditLogger';
import { sendEmail } from './emailService';
import {
  renderBreachCeNotification,
  type BreachCeNotificationTemplateInput,
} from '../templates/breach-ce-notification';
import type { AuthenticatedActor } from './coveredEntityService';
import { TenantScopeViolationError } from './coveredEntityService';

// ─── State machine ─────────────────────────────────────────────────────────

const VALID_STATE_TRANSITIONS: ReadonlyMap<BreachStatus, ReadonlySet<BreachStatus>> = new Map<
  BreachStatus,
  ReadonlySet<BreachStatus>
>([
  // Entry from any pre-CE status into the queued state.
  ['DISCOVERED', new Set<BreachStatus>(['CE_NOTIFICATION_QUEUED'])],
  ['INVESTIGATING', new Set<BreachStatus>(['CE_NOTIFICATION_QUEUED'])],
  ['CONTAINED', new Set<BreachStatus>(['CE_NOTIFICATION_QUEUED'])],
  ['RISK_ASSESSED', new Set<BreachStatus>(['CE_NOTIFICATION_QUEUED'])],
  // CE workflow progression.
  ['CE_NOTIFICATION_QUEUED', new Set<BreachStatus>(['CE_NOTIFICATION_SENT'])],
  ['CE_NOTIFICATION_SENT', new Set<BreachStatus>(['CE_NOTIFICATION_DELIVERED'])],
  ['CE_NOTIFICATION_DELIVERED', new Set<BreachStatus>(['CE_ACKNOWLEDGED'])],
  ['CE_ACKNOWLEDGED', new Set<BreachStatus>(['CE_FOLLOWUP_REQUESTED', 'CE_CLOSED'])],
  ['CE_FOLLOWUP_REQUESTED', new Set<BreachStatus>(['CE_FOLLOWUP_RESPONDED'])],
  ['CE_FOLLOWUP_RESPONDED', new Set<BreachStatus>(['CE_FOLLOWUP_REQUESTED', 'CE_CLOSED'])],
  // Terminal.
  ['CE_CLOSED', new Set<BreachStatus>([])],
]);

function assertValidTransition(current: BreachStatus, next: BreachStatus): void {
  const validNexts = VALID_STATE_TRANSITIONS.get(current);
  if (!validNexts || !validNexts.has(next)) {
    throw new InvalidStateTransitionError(current, next);
  }
}

// ─── Structured errors ─────────────────────────────────────────────────────

export class BreachCeNotificationServiceError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'BreachCeNotificationServiceError';
    this.code = code;
  }
}

export class InvalidStateTransitionError extends BreachCeNotificationServiceError {
  readonly currentStatus: BreachStatus;
  readonly attemptedStatus: BreachStatus;
  constructor(currentStatus: BreachStatus, attemptedStatus: BreachStatus) {
    super(
      'INVALID_STATE_TRANSITION',
      `Invalid BreachStatus transition: ${currentStatus} -> ${attemptedStatus}. Allowed next states: ${Array.from(VALID_STATE_TRANSITIONS.get(currentStatus) ?? new Set()).join(', ') || '(terminal)'}`,
    );
    this.name = 'InvalidStateTransitionError';
    this.currentStatus = currentStatus;
    this.attemptedStatus = attemptedStatus;
  }
}

export class CoveredEntityNotLinkedError extends BreachCeNotificationServiceError {
  readonly breachId: string;
  constructor(breachId: string) {
    super(
      'COVERED_ENTITY_NOT_LINKED',
      `BreachIncident ${breachId} has no linked CoveredEntity; cannot send CE notification`,
    );
    this.name = 'CoveredEntityNotLinkedError';
    this.breachId = breachId;
  }
}

export class BreachIncidentNotFoundError extends BreachCeNotificationServiceError {
  readonly breachId: string;
  constructor(breachId: string) {
    super('BREACH_INCIDENT_NOT_FOUND', `BreachIncident not found: ${breachId}`);
    this.name = 'BreachIncidentNotFoundError';
    this.breachId = breachId;
  }
}

export class NotImplementedError extends BreachCeNotificationServiceError {
  readonly feature: string;
  constructor(feature: string, rationale: string) {
    super('NOT_IMPLEMENTED', `${feature} not implemented: ${rationale}`);
    this.name = 'NotImplementedError';
    this.feature = feature;
  }
}

// ─── Channel framework ─────────────────────────────────────────────────────

export type NotificationChannel =
  | { type: 'email' }
  | { type: 'signedPdf' }
  | { type: 'securePortal' }
  | { type: 'sms' };

export interface DeliveryConfirmation {
  channel: NotificationChannel['type'];
  deliveredAt: Date;
  recipientConfirmation: string;
  externalMessageId?: string | null;
}

export interface CeAcknowledgmentInput {
  acknowledgedAt: Date;
  acknowledgmentSource: 'email' | 'phone' | 'signed_document' | 'portal_v3';
  recordedBy: string;
  notes?: string | null;
}

export interface CeFollowupRequestInput {
  requestedAt: Date;
  question: string;
  requestedBy: string;
}

export interface CeFollowupResponseInput {
  respondedAt: Date;
  response: string;
  recordedBy: string;
}

// ─── Breach + CE loader with tenant-isolation enforcement ──────────────────

interface BreachContext {
  breach: BreachIncident;
  coveredEntity: CoveredEntity;
  tenant: Hospital;
}

async function loadBreachContext(
  tenantId: string,
  breachId: string,
  actor: AuthenticatedActor,
): Promise<BreachContext> {
  const breach = await prisma.breachIncident.findFirst({
    where: { id: breachId, hospitalId: tenantId },
  });
  if (!breach) {
    throw new BreachIncidentNotFoundError(breachId);
  }

  if (actor.role !== 'SUPER_ADMIN' && breach.hospitalId !== actor.hospitalId) {
    throw new TenantScopeViolationError(actor.hospitalId, breach.hospitalId ?? '<null>');
  }

  if (!breach.coveredEntityId) {
    throw new CoveredEntityNotLinkedError(breachId);
  }

  const coveredEntity = await prisma.coveredEntity.findFirst({
    where: { id: breach.coveredEntityId, tenantId },
  });
  if (!coveredEntity) {
    throw new CoveredEntityNotLinkedError(breachId);
  }

  const tenant = await prisma.hospital.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new TenantScopeViolationError(actor.hospitalId, tenantId);
  }

  return { breach, coveredEntity, tenant };
}

// ─── Audit emission ────────────────────────────────────────────────────────

function emitStateTransitionAudit(
  action: string,
  actor: AuthenticatedActor,
  breachId: string,
  coveredEntityId: string,
  payload: Record<string, unknown>,
): void {
  auditLogger.info('audit_event', {
    timestamp: new Date().toISOString(),
    userId: actor.userId,
    userEmail: actor.email,
    userRole: actor.role,
    hospitalId: actor.hospitalId,
    action,
    resourceType: 'BreachIncident',
    resourceId: breachId,
    source: 'breachCeNotificationService',
    coveredEntityId,
    ...payload,
  });
}

// ─── Template input projection ─────────────────────────────────────────────

const DEFAULT_PHI_MITIGATION_STEPS: readonly string[] = [
  'Monitor financial accounts and credit reports for unauthorized activity',
  'Place a fraud alert with a national credit reporting agency if account-level PHI was involved',
  'Contact your healthcare provider if you receive unexpected medical bills or records',
];

export function projectBreachToTemplateInput(
  breach: BreachIncident,
  ce: CoveredEntity,
  tenant: Hospital,
): BreachCeNotificationTemplateInput {
  const sixtyDayDeadline = new Date(breach.discoveredAt.getTime() + 60 * 24 * 60 * 60 * 1000);

  return {
    breachId: breach.id,
    ceName: ce.name,
    ceLegalName: ce.legalName,
    cePrimaryContactName: ce.primaryContactName,

    affectedIndividualsCount: breach.affectedRecords ?? 0,
    affectedIndividualsDescription:
      breach.affectedPatientIds.length > 0
        ? `${breach.affectedPatientIds.length} individuals identified by internal patient ID; full identification list available upon request from the Covered Entity Privacy Officer.`
        : 'Individual identification in progress at time of notification; final list to be provided in the burden-of-proof addendum.',

    discoveredAt: breach.discoveredAt,
    breachOccurredAt: null,
    breachDescription: breach.description,
    breachType: breach.incidentType,

    typesOfPhiInvolved: breach.affectedFields,
    mitigationStepsForIndividuals: [...DEFAULT_PHI_MITIGATION_STEPS],
    baMitigationActions:
      breach.containmentActions ??
      breach.remediationPlan ??
      'Investigation ongoing; mitigation actions documented in the BreachIncident record and forthcoming burden-of-proof addendum.',

    baContactName: 'TAILRD Heart Platform Privacy Officer',
    baContactEmail: 'privacy@tailrd-heart.com',
    baContactPhone: '+1-555-TAILRD-0',
    baContactAddress: null,

    sixtyDayDeadline,
    baActsAsAgent: breach.baActsAsAgent,
    baActsAsAgentRationale: breach.baActsAsAgentRationale,
  };
}

// ─── Channel dispatch ──────────────────────────────────────────────────────

async function dispatchChannel(
  channel: NotificationChannel,
  ce: CoveredEntity,
  rendered: { subject: string; bodyText: string; bodyHtml: string },
): Promise<void> {
  switch (channel.type) {
    case 'email': {
      if (!ce.primaryContactEmail) {
        throw new BreachCeNotificationServiceError(
          'CE_PRIMARY_EMAIL_MISSING',
          `CoveredEntity ${ce.id} has no primaryContactEmail; cannot dispatch email channel`,
        );
      }
      await sendEmail({
        to: ce.primaryContactEmail,
        subject: rendered.subject,
        text: rendered.bodyText,
        html: rendered.bodyHtml,
      });
      return;
    }
    case 'signedPdf': {
      // §17.1 architectural-precedent candidate: PDF-signing infrastructure
      // does not currently exist in the codebase. Flagged for P1.3.4
      // self-review codification decision per Q-5BRC-B v1.0 channel scope
      // deferral.
      throw new NotImplementedError(
        'signedPdf channel',
        'PDF-signing infrastructure deferred to v3.0 per Q-5BRC-B; AUDIT entry filed at P1.3.3c per Deliverable 11',
      );
    }
    case 'securePortal': {
      throw new NotImplementedError(
        'securePortal channel',
        'in-platform CE portal deferred to v3.0 per Q-5BRC-B + Q-5BRC-D',
      );
    }
    case 'sms': {
      throw new NotImplementedError(
        'sms channel',
        'SMS escalation deferred to v3.0 per Q-5BRC-B',
      );
    }
  }
}

// ─── Public state-transition API ───────────────────────────────────────────

export async function queueCeNotification(
  tenantId: string,
  breachId: string,
  coveredEntityId: string,
  actor: AuthenticatedActor,
): Promise<BreachIncident> {
  if (actor.role !== 'SUPER_ADMIN' && actor.hospitalId !== tenantId) {
    throw new TenantScopeViolationError(actor.hospitalId, tenantId);
  }

  const breach = await prisma.breachIncident.findFirst({
    where: { id: breachId, hospitalId: tenantId },
  });
  if (!breach) {
    throw new BreachIncidentNotFoundError(breachId);
  }

  assertValidTransition(breach.status, 'CE_NOTIFICATION_QUEUED');

  const ce = await prisma.coveredEntity.findFirst({
    where: { id: coveredEntityId, tenantId },
  });
  if (!ce) {
    throw new CoveredEntityNotLinkedError(breachId);
  }

  const updated = await prisma.breachIncident.update({
    where: { id: breachId },
    data: {
      coveredEntityId,
      status: 'CE_NOTIFICATION_QUEUED',
    },
  });

  emitStateTransitionAudit('BREACH_CE_QUEUED', actor, breachId, coveredEntityId, {
    fromStatus: breach.status,
    toStatus: 'CE_NOTIFICATION_QUEUED',
  });

  return updated;
}

export async function sendCeNotification(
  tenantId: string,
  breachId: string,
  channel: NotificationChannel,
  actor: AuthenticatedActor,
): Promise<BreachIncident> {
  const ctx = await loadBreachContext(tenantId, breachId, actor);

  assertValidTransition(ctx.breach.status, 'CE_NOTIFICATION_SENT');

  const templateInput = projectBreachToTemplateInput(ctx.breach, ctx.coveredEntity, ctx.tenant);
  const rendered = renderBreachCeNotification(templateInput);

  await dispatchChannel(channel, ctx.coveredEntity, rendered);

  const now = new Date();
  const updated = await prisma.breachIncident.update({
    where: { id: breachId },
    data: {
      status: 'CE_NOTIFICATION_SENT',
      ceNotifiedAt: now,
    },
  });

  emitStateTransitionAudit('BREACH_CE_NOTIFIED', actor, breachId, ctx.coveredEntity.id, {
    fromStatus: ctx.breach.status,
    toStatus: 'CE_NOTIFICATION_SENT',
    channel: channel.type,
    ceNotifiedAt: now.toISOString(),
  });

  return updated;
}

export async function recordCeDelivery(
  tenantId: string,
  breachId: string,
  deliveryConfirmation: DeliveryConfirmation,
  actor: AuthenticatedActor,
): Promise<BreachIncident> {
  const ctx = await loadBreachContext(tenantId, breachId, actor);
  assertValidTransition(ctx.breach.status, 'CE_NOTIFICATION_DELIVERED');

  const existingHistory = (ctx.breach.statusHistory as Prisma.JsonArray | null) ?? [];
  const updated = await prisma.breachIncident.update({
    where: { id: breachId },
    data: {
      status: 'CE_NOTIFICATION_DELIVERED',
      statusHistory: [
        ...existingHistory,
        {
          status: 'CE_NOTIFICATION_DELIVERED',
          timestamp: deliveryConfirmation.deliveredAt.toISOString(),
          updatedBy: actor.userId,
          channel: deliveryConfirmation.channel,
          recipientConfirmation: deliveryConfirmation.recipientConfirmation,
          externalMessageId: deliveryConfirmation.externalMessageId ?? null,
        },
      ] as Prisma.InputJsonValue,
    },
  });

  emitStateTransitionAudit('BREACH_CE_DELIVERED', actor, breachId, ctx.coveredEntity.id, {
    fromStatus: ctx.breach.status,
    toStatus: 'CE_NOTIFICATION_DELIVERED',
    channel: deliveryConfirmation.channel,
    deliveredAt: deliveryConfirmation.deliveredAt.toISOString(),
  });

  return updated;
}

export async function recordCeAcknowledgment(
  tenantId: string,
  breachId: string,
  acknowledgment: CeAcknowledgmentInput,
  actor: AuthenticatedActor,
): Promise<BreachIncident> {
  const ctx = await loadBreachContext(tenantId, breachId, actor);
  assertValidTransition(ctx.breach.status, 'CE_ACKNOWLEDGED');

  const burdenOfProofRetentionUntil = new Date(
    ctx.breach.discoveredAt.getTime() + 6 * 365 * 24 * 60 * 60 * 1000,
  );

  const updated = await prisma.breachIncident.update({
    where: { id: breachId },
    data: {
      status: 'CE_ACKNOWLEDGED',
      ceAcknowledgedAt: acknowledgment.acknowledgedAt,
      burdenOfProofRetentionUntil,
    },
  });

  emitStateTransitionAudit('BREACH_CE_ACKNOWLEDGED', actor, breachId, ctx.coveredEntity.id, {
    fromStatus: ctx.breach.status,
    toStatus: 'CE_ACKNOWLEDGED',
    acknowledgmentSource: acknowledgment.acknowledgmentSource,
    recordedBy: acknowledgment.recordedBy,
    burdenOfProofRetentionUntil: burdenOfProofRetentionUntil.toISOString(),
  });

  return updated;
}

export async function recordCeFollowupRequest(
  tenantId: string,
  breachId: string,
  followupRequest: CeFollowupRequestInput,
  actor: AuthenticatedActor,
): Promise<BreachIncident> {
  const ctx = await loadBreachContext(tenantId, breachId, actor);
  assertValidTransition(ctx.breach.status, 'CE_FOLLOWUP_REQUESTED');

  const updated = await prisma.breachIncident.update({
    where: { id: breachId },
    data: {
      status: 'CE_FOLLOWUP_REQUESTED',
      ceFollowupRequestedAt: followupRequest.requestedAt,
    },
  });

  emitStateTransitionAudit('BREACH_CE_FOLLOWUP_REQUESTED', actor, breachId, ctx.coveredEntity.id, {
    fromStatus: ctx.breach.status,
    toStatus: 'CE_FOLLOWUP_REQUESTED',
    requestedBy: followupRequest.requestedBy,
    question: followupRequest.question,
  });

  return updated;
}

export async function recordCeFollowupResponse(
  tenantId: string,
  breachId: string,
  response: CeFollowupResponseInput,
  actor: AuthenticatedActor,
): Promise<BreachIncident> {
  const ctx = await loadBreachContext(tenantId, breachId, actor);
  assertValidTransition(ctx.breach.status, 'CE_FOLLOWUP_RESPONDED');

  const updated = await prisma.breachIncident.update({
    where: { id: breachId },
    data: {
      status: 'CE_FOLLOWUP_RESPONDED',
      ceFollowupRespondedAt: response.respondedAt,
    },
  });

  emitStateTransitionAudit('BREACH_CE_FOLLOWUP_RESPONDED', actor, breachId, ctx.coveredEntity.id, {
    fromStatus: ctx.breach.status,
    toStatus: 'CE_FOLLOWUP_RESPONDED',
    recordedBy: response.recordedBy,
    response: response.response,
  });

  return updated;
}

export async function closeCeNotification(
  tenantId: string,
  breachId: string,
  actor: AuthenticatedActor,
): Promise<BreachIncident> {
  const ctx = await loadBreachContext(tenantId, breachId, actor);
  assertValidTransition(ctx.breach.status, 'CE_CLOSED');

  const updated = await prisma.breachIncident.update({
    where: { id: breachId },
    data: { status: 'CE_CLOSED' },
  });

  emitStateTransitionAudit('BREACH_CE_CLOSED', actor, breachId, ctx.coveredEntity.id, {
    fromStatus: ctx.breach.status,
    toStatus: 'CE_CLOSED',
  });

  return updated;
}
