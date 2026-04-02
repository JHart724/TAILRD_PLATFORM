import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { APIResponse, JWTPayload, UserPermissions } from '../types';
import { buildUserPermissions, FULL_ACCESS_PERMISSIONS } from '../config/rolePermissions';

const router = Router();
const prisma = new PrismaClient();
const isDemoMode = process.env.DEMO_MODE === 'true';

// ─── Demo users (only used when DEMO_MODE=true) ───────────────────────────────

// Demo passwords hashed at module load — never stored or returned as plaintext
const demoUsers = [
  {
    id: 'user-000',
    email: 'superadmin@tailrd.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    firstName: 'Platform',
    lastName: 'Administrator',
    title: 'Super Administrator',
    role: 'super-admin',
    hospitalId: 'platform',
    hospitalName: 'TAILRD Platform',
    permissions: FULL_ACCESS_PERMISSIONS,
  },
  {
    id: 'user-001',
    email: 'admin@stmarys.org',
    passwordHash: bcrypt.hashSync('demo123', 10),
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
    passwordHash: bcrypt.hashSync('demo123', 10),
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
    passwordHash: bcrypt.hashSync('demo123', 10),
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
  return jwt.sign(fullPayload, process.env.JWT_SECRET!);
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
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
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
    });

    // Create login session
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        hospitalId: user.hospitalId,
        sessionToken: token,
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
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!isDemoMode && token) {
    try {
      await prisma.loginSession.updateMany({
        where: { sessionToken: token, isActive: true },
        data: { isActive: false },
      });
    } catch (error) {
      console.error('Logout session cleanup error:', error);
    }
  }

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
      process.env.JWT_SECRET!
    ) as JWTPayload;

    // Issue a fresh token with same payload
    const newToken = signToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      hospitalId: decoded.hospitalId,
      hospitalName: decoded.hospitalName,
      permissions: decoded.permissions,
      demoMode: decoded.demoMode,
    });

    // Update session in DB (production only)
    if (!isDemoMode) {
      await prisma.loginSession.updateMany({
        where: { sessionToken: token, isActive: true },
        data: { sessionToken: newToken, lastActivity: new Date() },
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

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    return res.json({
      success: true,
      data: decoded,
      message: 'Token valid',
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
