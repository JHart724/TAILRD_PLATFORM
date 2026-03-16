/**
 * CSRF Protection Middleware
 *
 * Implements Double-Submit Cookie pattern for CSRF protection.
 * Since the app uses JWT in Authorization header (not cookies for auth),
 * the primary CSRF risk is on state-changing endpoints. This middleware
 * generates a CSRF token via a secure cookie and validates it on
 * mutating requests (POST, PUT, PATCH, DELETE).
 *
 * For SPA (React) clients:
 *   1. GET /api/auth/csrf-token → returns token + sets cookie
 *   2. Client sends token in X-CSRF-Token header on mutations
 *   3. Middleware validates header matches cookie
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE_NAME = '__tailrd_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;
const isDemoMode = process.env.DEMO_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// Generate a cryptographically secure CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Middleware to set CSRF cookie on every response if not already present
export function csrfCookieSetter(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateCSRFToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,       // Must be readable by JS to send in header
      secure: isProduction,  // HTTPS only in production
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  next();
}

// Middleware to validate CSRF token on mutating requests
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip for demo mode
  if (isDemoMode) return next();

  // Only validate on state-changing methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  // Skip for webhook endpoints (server-to-server, uses HMAC auth)
  if (req.path.startsWith('/api/webhooks')) return next();

  // Skip for auth endpoints (login, register — user doesn't have token yet)
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) return next();

  // Skip for password reset (user doesn't have session)
  if (req.path.startsWith('/api/account/password-reset')) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token missing. Include X-CSRF-Token header.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const cookieBuf = Buffer.from(cookieToken, 'utf8');
    const headerBuf = Buffer.from(headerToken, 'utf8');

    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      res.status(403).json({
        success: false,
        error: 'CSRF token mismatch',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  } catch {
    res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

// Express route handler to issue a CSRF token to the SPA
export function csrfTokenEndpoint(req: Request, res: Response): void {
  const token = generateCSRFToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ success: true, data: { csrfToken: token } });
}
