import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { APIResponse, JWTPayload } from '../types';
import { buildUserPermissions } from '../config/rolePermissions';
import { writeAuditLog } from '../middleware/auditLogger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ─── Helper: sign a JWT token ──────────────────────────────────────────────────

function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const fullPayload: JWTPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 1 * 60 * 60, // 1 hour (HIPAA: short-lived tokens)
  };
  return jwt.sign(fullPayload, process.env.JWT_SECRET!, { algorithm: 'HS256' });
}

// ─── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const rawEmail = req.body?.email;
  const password = req.body?.password;

  if (!rawEmail || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password required',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  // Case-insensitive email lookup. Stored emails were inserted via
  // createSuperAdmin / invite flows that may have preserved input case
  // (e.g., "JHart@tailrd-heart.com" in production). The login lookup must
  // match regardless of the case the user types.
  //
  // We use findFirst + Prisma's `mode: 'insensitive'` rather than
  // lowercasing the inbound email + findUnique — that breaks for existing
  // mixed-case stored emails (they don't lowercase on disk, so the
  // unique-key match misses). `mode: 'insensitive'` generates ILIKE on
  // PostgreSQL and matches stored data as-is. The DB still enforces
  // uniqueness on the email column; we just relax the lookup.
  const email = String(rawEmail).trim();

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { hospital: true },
    });

    if (!user || !user.isActive) {
      await writeAuditLog(req, 'LOGIN_FAILED', 'User', null, 'Authentication failed');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await writeAuditLog(req, 'LOGIN_FAILED', 'User', user.id, 'Authentication failed');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Build permissions from user + hospital flags
    const permissions = buildUserPermissions(user, user.hospital);

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      hospitalName: user.hospital.name,
      permissions,
      mfaVerified: false,
    });

    // Create login session (store hashed token, not plaintext)
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        hospitalId: user.hospitalId,
        sessionToken: tokenHash,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await writeAuditLog(req, 'LOGIN_SUCCESS', 'User', user.id, `Successful login: ${user.role} at ${user.hospitalId}`);

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          title: user.title,
          role: user.role,
          hospitalId: user.hospitalId,
          hospitalName: user.hospital.name,
          permissions,
        },
      },
      message: 'Login successful',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    logger.error('Login error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────
// FINDING-1.1-006: authenticateToken validates the JWT before invalidating.
// Invalidates by userId (not token hash) to catch all concurrent sessions.

router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.userId) {
    try {
      await prisma.loginSession.updateMany({
        where: { userId: req.user.userId, isActive: true },
        data: { isActive: false },
      });
    } catch (error) {
      logger.error('Logout session cleanup error:', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  await writeAuditLog(req, 'LOGOUT', 'User', req.user?.userId ?? null, 'User logged out');

  return res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString(),
  } as APIResponse);
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token required',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!,
      { algorithms: ['HS256'] }
    ) as JWTPayload;

    // Re-validate user is still active and rebuild permissions from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { hospital: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Rebuild permissions from current DB state (not stale JWT claims)
    const freshPermissions = buildUserPermissions(user, user.hospital);
    const newToken = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      hospitalName: user.hospital.name,
      permissions: freshPermissions,
      mfaVerified: false,
    });

    // Update session in DB — store hashed tokens
    const crypto = require('crypto');
    const oldHash = crypto.createHash('sha256').update(token).digest('hex');
    const newHash = crypto.createHash('sha256').update(newToken).digest('hex');
    await prisma.loginSession.updateMany({
      where: { sessionToken: oldHash, isActive: true },
      data: { sessionToken: newHash, lastActivity: new Date() },
    });

    return res.json({
      success: true,
      data: { token: newToken },
      message: 'Token refreshed',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ─── POST /api/auth/verify ─────────────────────────────────────────────────────

router.post('/verify', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token required',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }, (err: any, decoded: any) => {
    if (err) {
      return res.json({
        success: false,
        data: { valid: false },
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    return res.json({
      success: true,
      data: { valid: true, expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null },
      timestamp: new Date().toISOString(),
    } as APIResponse);
  });
});

export = router;
