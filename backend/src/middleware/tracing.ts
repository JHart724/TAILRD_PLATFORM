/**
 * 4-APM-01 - AWS X-Ray application performance instrumentation.
 *
 * Two instrumentation surfaces, both PHI-safe (HIPAA 45 CFR 164.312):
 *   1. Express HTTP request tracing via X-Ray segments (openSegment +
 *      closeSegment from aws-xray-sdk-express), plus a URL scrub step that
 *      strips query strings and masks id-like path segments so no patient
 *      identifier reaches a trace.
 *   2. Prisma query tracing via a $extends layer that opens one X-Ray
 *      subsegment per database operation. Subsegment name + annotations carry
 *      the model + operation name ONLY. No SQL text, no argument values, no PHI.
 *
 * Tracing is OFF unless XRAY_ENABLED=true. The X-Ray daemon / ADOT sidecar is
 * deployed operator-side (4-APM-01 Q-3 Path b); the operator flips
 * XRAY_ENABLED=true in the production task def environment once the daemon is
 * live. Default-off keeps development, test, and any daemon-less environment
 * free of emit attempts and overhead.
 *
 * Cross-references:
 *   - backend/src/utils/phiRedaction.ts (redactPHIFragments content scrub)
 *   - backend/src/lib/prisma.ts (applyPrismaTracing wire-in, outermost layer)
 *   - backend/src/server.ts (openSegment first / closeSegment last mount)
 *   - docs/audit/PHASE_4_REPORT.md 4-APM-01
 */
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import type { PrismaClient } from '@prisma/client';
import {
  getSegment,
  setContextMissingStrategy,
  setDaemonAddress,
} from 'aws-xray-sdk-core';
import type { Subsegment } from 'aws-xray-sdk-core';
import {
  openSegment as xrayOpenSegment,
  closeSegment as xrayCloseSegment,
} from 'aws-xray-sdk-express';
import { redactPHIFragments } from '../utils/phiRedaction';

const SERVICE_NAME = process.env.AWS_XRAY_TRACING_NAME || 'tailrd-backend';

/**
 * Tracing is active only when XRAY_ENABLED is the literal string "true".
 */
export function isTracingEnabled(): boolean {
  return process.env.XRAY_ENABLED === 'true';
}

let initialized = false;

/**
 * One-time X-Ray SDK setup. Idempotent. Runs only when tracing is enabled.
 *
 * setContextMissingStrategy('LOG_ERROR') downgrades the SDK default
 * (RUNTIME_ERROR, which throws) so a getSegment() call outside an active
 * segment (cron jobs, startup queries, unsampled requests) logs and continues
 * instead of throwing. Tracing must never crash request handling on a clinical
 * platform.
 */
function initTracing(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  setContextMissingStrategy('LOG_ERROR');
  const daemonAddress = process.env.AWS_XRAY_DAEMON_ADDRESS;
  if (daemonAddress) {
    setDaemonAddress(daemonAddress);
  }
}

if (isTracingEnabled()) {
  initTracing();
}

// ID-like path segment patterns. Any segment matching these is masked to ":id"
// before the URL lands on a trace so populated path params (patient UUIDs,
// numeric ids, opaque tokens) never appear in X-Ray.
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_NUMERIC_SEGMENT = /^[0-9]{4,}$/;
const OPAQUE_TOKEN_SEGMENT = /^[A-Za-z0-9_-]{16,}$/;

function isIdLikeSegment(segment: string): boolean {
  return (
    UUID_SEGMENT.test(segment) ||
    LONG_NUMERIC_SEGMENT.test(segment) ||
    OPAQUE_TOKEN_SEGMENT.test(segment)
  );
}

/**
 * Return a PHI-safe form of a request URL. Drops the query string entirely,
 * masks id-like path segments to ":id", then runs the shared content-pattern
 * PHI scrub as defense in depth. Pure function.
 */
export function sanitizeTraceUrl(rawUrl: string): string {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    return '/';
  }
  const queryIndex = rawUrl.indexOf('?');
  const pathOnly = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  const masked = pathOnly
    .split('/')
    .map((segment) => (isIdLikeSegment(segment) ? ':id' : segment))
    .join('/');
  return redactPHIFragments(masked);
}

const passThrough: RequestHandler = (_req, _res, next) => next();
const passThroughError: ErrorRequestHandler = (err, _req, _res, next) => next(err);

/**
 * X-Ray segment open middleware. Mount FIRST, before all other middleware, so
 * the segment spans the entire request. No-op pass-through when tracing is
 * disabled.
 */
export function openSegment(): RequestHandler {
  if (!isTracingEnabled()) {
    return passThrough;
  }
  initTracing();
  return xrayOpenSegment(SERVICE_NAME);
}

interface SegmentHttp {
  request?: { url?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/**
 * Overwrite the auto-captured request URL on the active segment with a PHI-safe
 * form. Mount directly after openSegment so the segment already exists. The
 * X-Ray express middleware records the full request URL (path params + query
 * string) by default; this removes any patient identifier before the segment is
 * flushed. No-op pass-through when tracing is disabled.
 */
export function scrubSegmentUrl(): RequestHandler {
  if (!isTracingEnabled()) {
    return passThrough;
  }
  return (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const segment = getSegment();
      const http = (segment as unknown as { http?: SegmentHttp } | undefined)?.http;
      if (http && http.request && typeof http.request.url === 'string') {
        http.request.url = sanitizeTraceUrl(http.request.url);
      }
    } catch {
      // No active segment (request not sampled) or context missing. Tracing
      // must never interfere with request handling.
    }
    next();
  };
}

/**
 * X-Ray segment close middleware. Mount LAST, after the global error handler,
 * per the aws-xray-sdk-express documented pattern. No-op pass-through when
 * tracing is disabled.
 */
export function closeSegment(): ErrorRequestHandler {
  if (!isTracingEnabled()) {
    return passThroughError;
  }
  return xrayCloseSegment();
}

/**
 * Wrap every Prisma operation in an X-Ray subsegment that measures database
 * call latency. Applied as the OUTERMOST $extends layer so the subsegment spans
 * the full Prisma call (tenant guard + BAA guard + PHI encryption + engine + DB
 * round trip).
 *
 * PHI safety: subsegment name + annotations carry the model + operation name
 * ONLY. No SQL text, no argument values, no result data. On error the
 * subsegment is flagged and annotated with the error class name only (never the
 * error message or stack, which can echo column values). HIPAA 45 CFR 164.312.
 *
 * No-op (returns the client unchanged) when tracing is disabled.
 */
export function applyPrismaTracing<TClient extends PrismaClient>(client: TClient) {
  if (!isTracingEnabled()) {
    return client;
  }
  initTracing();
  return client.$extends({
    name: 'xray-tracing',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          let subsegment: Subsegment | undefined;
          try {
            const segment = getSegment();
            subsegment = segment?.addNewSubsegment(`prisma.${model}.${operation}`);
            if (subsegment) {
              subsegment.namespace = 'remote';
              subsegment.addAnnotation('prisma_model', String(model));
              subsegment.addAnnotation('prisma_operation', String(operation));
            }
          } catch {
            subsegment = undefined;
          }
          try {
            return await query(args);
          } catch (err) {
            if (subsegment) {
              try {
                subsegment.addErrorFlag();
                subsegment.addAnnotation(
                  'prisma_error',
                  err instanceof Error ? err.name : 'PrismaError',
                );
              } catch {
                // Annotation failure must not mask the original error.
              }
            }
            throw err;
          } finally {
            if (subsegment) {
              try {
                subsegment.close();
              } catch {
                // Subsegment close failure must not affect the query result.
              }
            }
          }
        },
      },
    },
  });
}
