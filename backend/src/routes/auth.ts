import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { APIResponse, JWTPayload, UserPermissions } from '../types';
import { buildUserPermissions, FULL_ACCESS_PERMISSIONS } from '../config/rolePermissions';
import { writeAuditLog } from '../middleware/auditLogger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const isDemoMode = process.env.DEMO_MODE === 'true';

// ─── Demo users (only used when DEMO_MODE=true) ───────────────────────────────

// Demo passwords hashed at module load — never stored or returned as plaintext
const demoUsers = [
  {
    id: 'user-000',
    email: 'superadmin@tailrd.com',
    passwordHash: bcrypt.hashSync('admin123', 12),
    firstName: 'Platform',
    lastName: 'Administrator',
    title: 'Super Administrator',
    role: 'super-admin',
    hospitalId: 'platform',
    hospitalName: 'TAILRD Platform',
    permissions: FULL_ACCESS_PERMISSIONS,
  },
  {
    id: 'user-jhart',
    email: 'JHart@tailrd-heart.com',
    passwordHash: bcrypt.hashSync('Demo2026!', 12),
    firstName: 'Jonathan',
    lastName: 'Hart',
    title: 'CEO & Founder',
    role: 'super-admin',
    hospitalId: 'platform',
    hospitalName: 'TAILRD Heart',
    permissions: FULL_ACCESS_PERMISSIONS,
  },
  {
    id: 'user-001',
    email: 'admin@stmarys.org',
    passwordHash: bcrypt.hashSync('demo123', 12),
    firstName: 'Sarah',
    lastName: 'Johnson',
    title: 'Chief Medical Officer',
    role: 'hospital-admin',
    hospitalId: 'hosp-001',
    hospitalName: 'St. Mary\'s Regional Medical Center',
    permissions: FULL_ACCESS_PERMISSIONS,
  },
  {
    id: 'user-002',
    email: 'cardio@stmarys.org',
    passwordHash: bcrypt.hashSync('demo123', 12),
    firstName: 'Dr. Michael',
    lastName: 'Chen',
    title: 'Interventional Cardiologist',
    role: 'physician',
    hospitalId: 'hosp-001',
    hospitalName: 'St. Mary\'s Regional Medical Center',
    permissions: {
      modules: {
        heartFailure: true,
        electrophysiology: false,
        structuralHeart: true,
        coronaryIntervention: true,
        peripheralVascular: false,
        valvularDisease: false,
      },
      views: { executive: false, serviceLines: true, careTeam: true },
      actions: {
        viewReports: true,
        exportData: false,
        manageUsers: false,
        configureAlerts: false,
        accessPHI: true,
      },
    } as UserPermissions,
  },
  {
    id: 'user-003',
    email: 'admin@community.org',
    passwordHash: bcrypt.hashSync('demo123', 12),
    firstName: 'Lisa',
    lastName: 'Rodriguez',
    title: 'Quality Director',
    role: 'quality-director',
    hospitalId: 'hosp-002',
    hospitalName: 'Community General Hospital',
    permissions: {
      modules: {
        heartFailure: true,
        electrophysiology: false,
        structuralHeart: false,
        coronaryIntervention: true,
        peripheralVascular: true,
        valvularDisease: false,
      },
      views: { executive: true, serviceLines: true, careTeam: false },
      actions: {
        viewReports: true,
        exportData: true,
        manageUsers: false,
        configureAlerts: true,
        accessPHI: false,
      },
    } as UserPermissions,
  },
];

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password required',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  // ── Demo mode: use hardcoded users ──
  if (isDemoMode) {
    const user = demoUsers.find((u) => u.email === email && bcrypt.compareSync(password, u.passwordHash));
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      hospitalName: user.hospitalName,
      permissions: user.permissions,
      mfaVerified: false,
      demoMode: true,
    });

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
          hospitalName: user.hospitalName,
          permissions: user.permissions,
        },
      },
      message: 'Login successful',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  // ── Production mode: real DB auth ──
  try {
    const user = await prisma.user.findUnique({
      where: { email },
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
  if (!isDemoMode && req.user?.userId) {
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
    let newToken: string;
    if (!isDemoMode) {
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
      newToken = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: user.hospital.name,
        permissions: freshPermissions,
        demoMode: decoded.demoMode,
      });
    } else {
      newToken = signToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        hospitalId: decoded.hospitalId,
        hospitalName: decoded.hospitalName,
        permissions: decoded.permissions,
        demoMode: decoded.demoMode,
      });
    }

    // Update session in DB (production only) -- store hashed tokens
    if (!isDemoMode) {
      const crypto = require('crypto');
      const oldHash = crypto.createHash('sha256').update(token).digest('hex');
      const newHash = crypto.createHash('sha256').update(newToken).digest('hex');
      await prisma.loginSession.updateMany({
        where: { sessionToken: oldHash, isActive: true },
        data: { sessionToken: newHash, lastActivity: new Date() },
      });
    }

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

// ─── GET /api/auth/demo-users (demo mode only) ────────────────────────────────

router.get('/demo-users', (req: Request, res: Response) => {
  if (!isDemoMode) {
    return res.status(404).json({
      success: false,
      error: 'Not found',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  const publicUsers = demoUsers.map((user) => ({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.title,
    role: user.role,
    hospitalName: user.hospitalName,
  }));

  return res.json({
    success: true,
    data: publicUsers,
    message: 'Demo users available for testing',
    timestamp: new Date().toISOString(),
  } as APIResponse);
});

export = router;
