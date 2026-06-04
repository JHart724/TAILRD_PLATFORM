import winston from 'winston';
import { redactPHIFragments } from './phiRedaction';

/**
 * Winston Logger Configuration
 * HIPAA-compliant logging for healthcare applications
 * Excludes PHI and PII from logs
 */

const { combine, timestamp, errors, json, simple, colorize } = winston.format;

// Custom format to exclude sensitive data
const excludeSensitiveData = winston.format((info) => {
  // Remove sensitive fields from log data
  const sensitiveFields = [
    'ssn', 'socialSecurityNumber', 'password', 'token', 'apiKey',
    'dob', 'dateOfBirth', 'phone', 'phoneNumber', 'email',
    'address', 'zipCode', 'postalCode', 'creditCard', 'bankAccount',
    'mrn', 'medicalRecordNumber', 'firstName', 'lastName', 'name',
    'patientName', 'patientMRN', 'street', 'city', 'state',
  ];

  const cleanObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowercaseKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowercaseKey.includes(field))) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        cleaned[key] = cleanObject(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  return {
    ...info,
    ...cleanObject(info)
  };
});

// --- AUDIT-109: content-pattern PHI redaction at the format layer ---
// `excludeSensitiveData` above redacts by FIELD NAME. This second, complementary
// layer redacts by CONTENT PATTERN (via redactPHIFragments) over free-form string
// VALUES - specifically the error-context fields (message / stack / error) where a
// leaked patient name or identifier surfaces *inside* an exception string, which a
// field-name filter cannot catch (the AUDIT-108 login-500 motivating case). Applied
// at the logger format level so every transport inheriting the logger format -
// including the production stdout transport below - emits PHI-safe records.
//
// FAIL-CLOSED: redaction is wrapped per value; on any failure the value is replaced
// with a placeholder, never emitted raw, and the format never throws (it runs on the
// error/request path, where a throw would break logging itself).
//
// See docs/architecture/AUDIT_109_ERROR_LOGGING_OBSERVABILITY_NOTES.md §3.

// Maximum object-nesting depth walked when redacting meta values. Beyond this,
// subtrees are replaced with a placeholder (fail-closed) to bound cost and avoid
// pathological / cyclic structures.
const MAX_REDACTION_DEPTH = 4;

// Error-context keys redacted with the AGGRESSIVE pattern set (adds the
// `patient`-anchored NAME pattern). These are where clinical / FHIR parse errors
// surface "patient <First> <Last>". All other string leaves use CONSERVATIVE.
const ERROR_CONTEXT_KEYS: ReadonlySet<string> = new Set(['message', 'stack', 'error']);

const REDACTION_ERROR_PLACEHOLDER = '[REDACTION-ERROR]';
const REDACTION_DEPTH_PLACEHOLDER = '[REDACTION-DEPTH-LIMIT]';

// Redact a single string fail-closed. redactPHIFragments only throws on non-string
// input (never reached here), so the catch is defense-in-depth: never emit raw.
function redactStringFailClosed(value: string, aggressive: boolean): string {
  try {
    return redactPHIFragments(value, { aggressive });
  } catch {
    return REDACTION_ERROR_PLACEHOLDER;
  }
}

// Recursively redact string leaves of a value. Non-string primitives pass through;
// objects/arrays are rebuilt; depth is bounded (fail-closed beyond the limit).
function redactDeep(value: unknown, aggressive: boolean, depth: number): unknown {
  if (typeof value === 'string') {
    return redactStringFailClosed(value, aggressive);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_REDACTION_DEPTH) {
    return REDACTION_DEPTH_PLACEHOLDER;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, aggressive, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childAggressive = aggressive || ERROR_CONTEXT_KEYS.has(key);
    result[key] = redactDeep(child, childAggressive, depth + 1);
  }
  return result;
}

/**
 * Redact PHI fragments from a log record's own enumerable string keys in place.
 *
 * Mutates `info` (rather than rebuilding) so winston's Symbol-keyed internals
 * (level / message symbols, splat) survive. Each top-level key is redacted
 * independently and fail-closed: a failure on one key cannot corrupt or leak
 * another, and nothing throws out of this function. Error-context keys
 * (message / stack / error) use AGGRESSIVE redaction; all other string leaves use
 * CONSERVATIVE. Exported for unit testing.
 */
export function redactLogInfo<T extends Record<string, unknown>>(info: T): T {
  const record = info as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    try {
      const aggressive = ERROR_CONTEXT_KEYS.has(key);
      record[key] = redactDeep(record[key], aggressive, 1);
    } catch {
      record[key] = REDACTION_ERROR_PLACEHOLDER;
    }
  }
  return info;
}

// Winston format wrapper around redactLogInfo. Runs after excludeSensitiveData and
// before json() in the format chain below.
const redactPhiFragmentsFormat = winston.format((info) =>
  redactLogInfo(info as Record<string, unknown>) as winston.Logform.TransformableInfo,
);

// Production stdout transport verbosity. Tunable via LOG_STDOUT_LEVEL (default
// 'warn'); see §2 of the design note. The transport's PRESENCE is unconditional
// (constructed below regardless of env) - only this level is configurable.
const STDOUT_TRANSPORT_LEVEL = process.env.LOG_STDOUT_LEVEL || 'warn';

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    excludeSensitiveData(),
    redactPhiFragmentsFormat(),
    json()
  ),
  defaultMeta: {
    service: 'tailrd-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Audit log for HIPAA compliance
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 50, // Keep more audit logs
      tailable: true,
      format: combine(
        timestamp(),
        json()
      )
    }),

    // AUDIT-109: production stdout Console JSON transport. Mirrors the
    // auditLogger.ts dual-transport pattern (AUDIT-013). Captured by the ECS
    // awslogs driver into CloudWatch (/ecs/tailrd-production-backend) so production
    // 500 stacks are diagnosable from logs. PRESENCE IS UNCONDITIONAL - this
    // transport is not gated on any environment variable (the AUDIT-108 silent-absence failure
    // mode is structurally impossible to recur). Only its verbosity is tunable, via
    // LOG_STDOUT_LEVEL (default 'warn'). No per-transport format is set, so it
    // inherits the logger format chain above (timestamp + errors + field-name
    // redaction + content-pattern redaction + json) and emits PHI-safe JSON to
    // stdout. See docs/architecture/AUDIT_109_ERROR_LOGGING_OBSERVABILITY_NOTES.md.
    new winston.transports.Console({
      level: STDOUT_TRANSPORT_LEVEL
    })
  ],

  // Don't exit on handled exceptions
  exitOnError: false
});

// Add a human-readable colorized console transport for non-production
// environments (developer ergonomics). This is in ADDITION to the unconditional
// JSON stdout transport above; in dev both are present (the colorized one for the
// terminal, the JSON one matching production behavior). In production only the
// JSON transport above ships.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      simple()
    )
  }));
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Don't exit immediately in production - give time for logging
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    process.exit(1);
  }
});

// Graceful shutdown logging
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - initiating graceful shutdown');
});

process.on('SIGINT', () => {
  logger.info('SIGINT received - initiating graceful shutdown');
});

export default logger;