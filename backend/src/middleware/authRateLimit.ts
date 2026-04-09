/**
 * Authentication-specific Rate Limiting
 *
 * Applies aggressive rate limits to auth endpoints to prevent:
 *   - Brute-force password attacks
 *   - Credential stuffing
 *   - Account enumeration via timing
 *
 * Separate from global API rate limit (which is 100 req/15min).
 * Uses Redis store when available for consistency across ECS instances.
 * Call upgradeAuthRateLimitStores() after Redis connects.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { createRedisRateLimitStore } from '../lib/redis';
import { APIResponse } from '../types';

// Active limiters — start with in-memory, upgraded to Redis via upgradeAuthRateLimitStores()
let activeLoginLimiter = createInMemoryLoginLimiter();
let activePasswordResetLimiter = createInMemoryPasswordResetLimiter();
let activeTokenRefreshLimiter = createInMemoryTokenRefreshLimiter();
let activeRegistrationLimiter = createInMemoryRegistrationLimiter();
let activeExportLimiter = createInMemoryExportLimiter();

function createInMemoryLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      error: 'Too many login attempts. Please try again in 15 minutes.',
      timestamp: new Date().toISOString(),
    } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = req.body?.email || '';
      return `${req.ip}-${email}`;
    },
  });
}

function createInMemoryPasswordResetLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
      success: false,
      error: 'Too many password reset requests. Please try again later.',
      timestamp: new Date().toISOString(),
    } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

function createInMemoryTokenRefreshLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
      success: false,
      error: 'Too many token refresh attempts.',
      timestamp: new Date().toISOString(),
    } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

function createInMemoryRegistrationLimiter() {
  return rateLimit({
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
}

function createInMemoryExportLimiter() {
  return rateLimit({
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
      return req.user?.userId || req.ip;
    },
  });
}

// Delegate middleware — allows hot-swapping to Redis stores
export const loginRateLimit: express.RequestHandler = (req, res, next) => activeLoginLimiter(req, res, next);
export const passwordResetRateLimit: express.RequestHandler = (req, res, next) => activePasswordResetLimiter(req, res, next);
export const tokenRefreshRateLimit: express.RequestHandler = (req, res, next) => activeTokenRefreshLimiter(req, res, next);
export const registrationRateLimit: express.RequestHandler = (req, res, next) => activeRegistrationLimiter(req, res, next);
export const exportRateLimit: express.RequestHandler = (req, res, next) => activeExportLimiter(req, res, next);

/**
 * Upgrade all auth rate limiters to use Redis stores.
 * Call this after Redis connects in server startup.
 */
export function upgradeAuthRateLimitStores(): boolean {
  const loginStore = createRedisRateLimitStore('auth:login');
  if (!loginStore) return false;

  activeLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.', timestamp: new Date().toISOString() } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}-${req.body?.email || ''}`,
    store: loginStore,
  });

  activePasswordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { success: false, error: 'Too many password reset requests. Please try again later.', timestamp: new Date().toISOString() } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisRateLimitStore('auth:pwreset')!,
  });

  activeTokenRefreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many token refresh attempts.', timestamp: new Date().toISOString() } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisRateLimitStore('auth:refresh')!,
  });

  activeRegistrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { success: false, error: 'Too many registration attempts. Please try again later.', timestamp: new Date().toISOString() } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisRateLimitStore('auth:register')!,
  });

  activeExportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Export rate limit exceeded. Please try again later.', timestamp: new Date().toISOString() } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.userId || req.ip,
    store: createRedisRateLimitStore('auth:export')!,
  });

  return true;
}
