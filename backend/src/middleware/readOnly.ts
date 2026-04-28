/**
 * READ_ONLY mode middleware.
 *
 * When `READ_ONLY=true` is set in the environment, all non-GET requests are
 * rejected with HTTP 503 + a `Retry-After` header. GET requests pass through
 * unchanged.
 *
 * Purpose: maintenance windows during which the backing DB is being switched
 * (e.g., Day 10 RDS -> Aurora cutover, see docs/DAY_10_PLAN.md). Set
 * READ_ONLY=true on the running task def, force-new-deployment so all live
 * tasks pick up the gate, drain in-flight writes, perform the DB switch,
 * then set READ_ONLY=false and force-new-deployment again.
 *
 * Bypass paths (always allowed even in read-only mode):
 *   - GET /health        (ALB target health check must continue passing)
 *   - GET /api/status    (lightweight liveness probe)
 *   - POST /api/auth/login (so users can authenticate to read the
 *                           maintenance message; login does write a
 *                           LoginSession row, accept that small write)
 *
 * The flag is read at request time from process.env.READ_ONLY so a config
 * change via task def deploy takes effect on the next request after the
 * tasks restart.
 */

import { Request, Response, NextFunction } from 'express';

const ALLOWED_WRITE_PATHS = new Set<string>([
  '/api/auth/login',
]);

export function readOnlyGuard(req: Request, res: Response, next: NextFunction): void {
  if (process.env.READ_ONLY !== 'true') {
    return next();
  }

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (ALLOWED_WRITE_PATHS.has(req.path)) {
    return next();
  }

  res.setHeader('Retry-After', '60');
  res.status(503).json({
    success: false,
    error: 'Service is in read-only mode for scheduled maintenance. Please try again shortly.',
    code: 'READ_ONLY_MODE',
    retryAfterSeconds: 60,
    timestamp: new Date().toISOString(),
  });
}
