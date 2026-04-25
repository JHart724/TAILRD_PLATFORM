import { Router, Response } from 'express';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { APIResponse } from '../types';
import { authenticateToken, authorizeRole, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const passwordResetRequestSchema = z.object({
  email: z.string().email('Valid email required'),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const revokeUserSessionsSchema = z.object({
  reason: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET ROUTES (PUBLIC)
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /password-reset/request ────────────────────────────────────────────
// Public endpoint. Generates a reset token and stores it on the User record.
// Always returns a generic message to prevent email enumeration.
// NOTE: User model must have `resetToken String?` and `resetTokenExpiry DateTime?`
//       fields added to the Prisma schema for this to work.

router.post('/password-reset/request', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = passwordResetRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const { email } = validation.data;

    // Look up the user but never reveal whether the account exists
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store hashed token so DB compromise doesn't leak reset tokens
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashedToken,
          resetTokenExpiry,
        },
      });

      // TODO: Send email with resetToken (unhashed) via transactional email service.
      // The email link should include the raw token; we compare its hash on confirm.
      // Password reset token generated -- email delivery handled by emailService
    }

    // Always return the same response regardless of whether user exists
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Password reset request error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── POST /password-reset/confirm ────────────────────────────────────────────
// Public endpoint. Validates the reset token, updates password, and invalidates
// all active sessions for the user.

router.post('/password-reset/confirm', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = passwordResetConfirmSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const { token, newPassword } = validation.data;

    // Hash the incoming token to compare with what's stored
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching, non-expired reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all active sessions — forces re-login everywhere
    await prisma.loginSession.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Password reset confirm error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED PASSWORD & SESSION ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /change-password ───────────────────────────────────────────────────
// Authenticated. Verifies current password, hashes new one, invalidates other sessions.

router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    const { currentPassword, newPassword } = validation.data;
    const userId = req.user!.userId;

    // Fetch user with current password hash
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Get current session token from auth header to preserve it
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];
    const currentTokenHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex')
      : '';

    // Invalidate all OTHER active sessions (keep current one alive)
    if (currentTokenHash) {
      await prisma.loginSession.updateMany({
        where: {
          userId,
          isActive: true,
          sessionToken: { not: currentTokenHash },
        },
        data: { isActive: false },
      });
    }

    return res.json({
      success: true,
      message: 'Password changed successfully. Other sessions have been signed out.',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Change password error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── GET /sessions ───────────────────────────────────────────────────────────
// List active sessions for the current user.

router.get('/sessions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const sessions = await prisma.loginSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActivity: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        loginTime: true,
        lastActivity: true,
        expiresAt: true,
        location: true,
        createdAt: true,
      },
    });

    // Mark the current session so the frontend can highlight it
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];
    const currentTokenHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex')
      : '';

    let currentSessionId: string | null = null;
    if (currentTokenHash) {
      const currentSession = await prisma.loginSession.findUnique({
        where: { sessionToken: currentTokenHash },
        select: { id: true },
      });
      currentSessionId = currentSession?.id || null;
    }

    const sessionsWithCurrent = sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));

    return res.json({
      success: true,
      data: sessionsWithCurrent,
      message: `${sessions.length} active session(s)`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('List sessions error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── DELETE /sessions/:sessionId ─────────────────────────────────────────────
// Revoke a specific session belonging to the current user.

router.delete('/sessions/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    // Verify the session belongs to this user
    const session = await prisma.loginSession.findFirst({
      where: { id: sessionId, userId, isActive: true },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or already revoked',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    // Don't allow revoking the current session via this endpoint
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];
    const currentTokenHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex')
      : '';
    if (session.sessionToken === currentTokenHash) {
      return res.status(400).json({
        success: false,
        error: 'Cannot revoke your current session. Use /api/auth/logout instead.',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }

    await prisma.loginSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'Session revoked',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Revoke session error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke session',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── DELETE /sessions ────────────────────────────────────────────────────────
// Nuclear logout: revoke ALL sessions except the current one.

router.delete('/sessions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];
    const currentTokenHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex')
      : '';

    const result = await prisma.loginSession.updateMany({
      where: {
        userId,
        isActive: true,
        ...(currentTokenHash ? { sessionToken: { not: currentTokenHash } } : {}),
      },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      data: { revokedCount: result.count },
      message: `${result.count} session(s) revoked. Current session preserved.`,
      timestamp: new Date().toISOString(),
    } as APIResponse);
  } catch (error: any) {
    logger.error('Revoke all sessions error:', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke sessions',
      timestamp: new Date().toISOString(),
    } as APIResponse);
  }
});

// ── POST /sessions/revoke-user/:userId ──────────────────────────────────────
// Super-admin only: force-revoke all sessions for any user.

router.post(
  '/sessions/revoke-user/:userId',
  authenticateToken,
  authorizeRole(['SUPER_ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const validation = revokeUserSessionsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }

      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        } as APIResponse);
      }

      const result = await prisma.loginSession.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      logger.info('Session revoke by super-admin', {
        adminUserId: req.user!.userId,
        targetUserId: userId,
        sessionsRevoked: result.count,
      });

      return res.json({
        success: true,
        data: { revokedCount: result.count, targetUserId: userId },
        message: `${result.count} session(s) revoked for user ${targetUser.email}`,
        timestamp: new Date().toISOString(),
      } as APIResponse);
    } catch (error: any) {
      logger.error('Force revoke user sessions error:', { error: error instanceof Error ? error.message : String(error) });
      return res.status(500).json({
        success: false,
        error: 'Failed to revoke user sessions',
        timestamp: new Date().toISOString(),
      } as APIResponse);
    }
  }
);

export = router;
