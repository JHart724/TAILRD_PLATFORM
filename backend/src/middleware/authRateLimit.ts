/**
 * Authentication-specific Rate Limiting
 *
 * Applies aggressive rate limits to auth endpoints to prevent:
 *   - Brute-force password attacks
 *   - Credential stuffing
 *   - Account enumeration via timing
 *
 * Separate from global API rate limit (which is 100 req/15min).
 */

import rateLimit from 'express-rate-limit';
import { APIResponse } from '../types';

// Login: 5 attempts per 15 minutes per IP
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
    timestamp: new Date().toISOString(),
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + email to prevent distributed attacks on single account
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  },
});

// Password reset request: 3 per hour per IP
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Too many password reset requests. Please try again later.',
    timestamp: new Date().toISOString(),
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Token refresh: 10 per minute per IP
export const tokenRefreshRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: 'Too many token refresh attempts.',
    timestamp: new Date().toISOString(),
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// User registration: 3 per hour per IP
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Data export: 10 per hour per user (prevents bulk PHI exfiltration)
export const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Export rate limit exceeded. Please try again later.',
    timestamp: new Date().toISOString(),
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Per-user rate limiting for exports
    return req.user?.userId || req.ip;
  },
});
