import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWTPayload, APIResponse } from '../types';
import { FULL_ACCESS_PERMISSIONS, MODULE_KEY_MAP } from '../config/rolePermissions';

const prisma = new PrismaClient();

const isDemoMode = process.env.DEMO_MODE === 'true';
// Startup validation in server.ts ensures JWT_SECRET is set when not in demo mode.
const JWT_SECRET = process.env.JWT_SECRET!;

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  hospital?: {
    id: string;
    name: string;
    patientCount: number;
  };
}

// ─── authenticateToken ─────────────────────────────────────────────────────────
// Verifies JWT. In demo mode, allows unauthenticated requests with a synthetic
// super-admin payload so the frontend works without login.

const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // If a token is provided, always try to verify it (works in both modes)
  if (token) {
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      if (isDemoMode) {
        req.user = createDemoPayload();
        return next();
      }
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // MFA enforcement: if user has MFA enabled, require mfaVerified claim.
    // The login endpoint issues a pre-MFA token; /mfa/verify issues the
    // full token with mfaVerified: true. Block pre-MFA tokens from all
    // endpoints except MFA-related ones.
    if (payload.mfaRequired && !payload.mfaVerified) {
      const mfaAllowedPaths = ['/api/mfa/verify', '/api/mfa/setup', '/api/auth/logout'];
      if (!mfaAllowedPaths.includes(req.path)) {
        return res.status(403).json({
          success: false,
          error: 'MFA verification required',
          code: 'MFA_REQUIRED',
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }
    }

    // Session revocation check: verify session is still active in DB.
    // Ensures logged-out tokens can't be reused.
    if (payload.sessionId && !payload.demoMode) {
      try {
        const session = await prisma.loginSession.findUnique({
          where: { id: payload.sessionId },
          select: { isActive: true },
        });
        if (!session || !session.isActive) {
          return res.status(401).json({
            success: false,
            error: 'Session has been revoked',
            timestamp: new Date().toISOString(),
          } as APIResponse);
        }
      } catch {
        // DB unavailable — allow token-based auth as fallback
      }
    }

    req.user = payload;
    return next();
  }

  // No token provided
  if (isDemoMode) {
    // Auto-generate super-admin payload for demo mode
    req.user = createDemoPayload();
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Access token required',
    timestamp: new Date().toISOString(),
  } as APIResponse);
};

function createDemoPayload(): JWTPayload {
  return {
    userId: 'demo-user',
    email: 'demo@tailrd.com',
    role: 'super-admin',
    hospitalId: 'demo-hospital',
    hospitalName: 'Demo Hospital',
    permissions: FULL_ACCESS_PERMISSIONS,
    demoMode: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };
}

// ─── authorizeHospital ─────────────────────────────────────────────────────────
// Ensures users can only access their own hospital's data.
// Super-admins and demo mode bypass this check.

const authorizeHospital = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Demo mode and super-admins bypass hospital isolation
  if (isDemoMode || req.user?.role === 'super-admin') {
    return next();
  }

  const hospitalId = req.params.hospitalId || req.query.hospitalId as string;

  if (!hospitalId) {
    // No hospitalId requested — continue (the route handler should scope by req.user.hospitalId)
    return next();
  }

  // Ensure user can only access their own hospital's data
  if (req.user?.hospitalId !== hospitalId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Cannot access other hospital data',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  next();
};

// ─── authorizeRole ─────────────────────────────────────────────────────────────
// Checks if the user's role is in the allowed list.

const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (isDemoMode) return next();

    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied: Requires one of roles: ${allowedRoles.join(', ')}`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
    next();
  };
};

// ─── authorizeModule ───────────────────────────────────────────────────────────
// Checks if the user has permission for the requested clinical module.
// Uses the JWT permissions.modules object instead of a static allowlist.

const authorizeModule = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (isDemoMode) return next();

  const requestedModule = (req.params.moduleId || req.query.module) as string;
  if (!requestedModule) return next();

  // Map URL slug to permission key
  const permKey = MODULE_KEY_MAP[requestedModule];
  if (!permKey) return next(); // Unknown module — let the route handle 404

  const hasAccess = req.user?.permissions?.modules?.[permKey];
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: `Access denied: No permission for module ${requestedModule}`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  next();
};

// ─── authorizeView ─────────────────────────────────────────────────────────────
// Checks if the user has permission for the requested view type.

const authorizeView = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (isDemoMode) return next();

  const requestedView = (req.params.viewType || req.query.view) as string;
  if (!requestedView) return next();

  // Map URL view names to permission keys
  const viewKeyMap: Record<string, keyof JWTPayload['permissions']['views']> = {
    executive: 'executive',
    'service-line': 'serviceLines',
    'service-lines': 'serviceLines',
    'care-team': 'careTeam',
  };

  const permKey = viewKeyMap[requestedView];
  if (!permKey) return next();

  const hasAccess = req.user?.permissions?.views?.[permKey];
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      error: `Access denied: No permission for view ${requestedView}`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }

  next();
};

export {
  authenticateToken,
  authorizeHospital,
  authorizeRole,
  authorizeModule,
  authorizeView,
  AuthenticatedRequest,
};
