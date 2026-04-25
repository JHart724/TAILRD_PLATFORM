import { Router, Response } from 'express';
import { mfaService } from '../services/mfaService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { writeAuditLog } from '../middleware/auditLogger';
import prisma from '../lib/prisma';

const router = Router();

// All MFA routes require authentication
router.use(authenticateToken);

// POST /api/mfa/setup -- Generate TOTP secret and QR code
router.post('/setup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hospital: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await mfaService.generateSecret(
      userId,
      user.email,
      user.hospital?.name || 'TAILRD Heart'
    );

    res.json({
      qrCodeUrl: result.qrCodeUrl,
      manualEntryKey: result.manualEntryKey,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'MFA setup failed' });
  }
});

// POST /api/mfa/verify-setup -- Verify TOTP and enable MFA
router.post('/verify-setup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;

    if (!userId || !token) return res.status(400).json({ error: 'Token required' });

    const result = await mfaService.enableMFA(userId, token);

    await writeAuditLog(req, 'MFA_ENABLED', 'user', userId, 'MFA enabled via authenticator app');

    // Send backup codes email
    const { sendEmail, buildMFABackupCodesEmail } = await import('../services/emailService');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const emailOpts = buildMFABackupCodesEmail({
        backupCodes: result.backupCodes,
        userName: `${user.firstName} ${user.lastName}`,
      });
      emailOpts.to = user.email;
      await sendEmail(emailOpts);
    }

    res.json({
      enabled: true,
      backupCodes: result.backupCodes,
      message: 'MFA enabled successfully. Save your backup codes securely.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

// POST /api/mfa/verify -- Verify TOTP during login
router.post('/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;

    if (!userId || !token) return res.status(400).json({ error: 'Token required' });

    const valid = await mfaService.verifyTOTP(userId, token);
    if (!valid) {
      await writeAuditLog(req, 'MFA_VERIFY_FAILED', 'user', userId, 'Invalid TOTP token');
      return res.status(401).json({ error: 'Invalid authentication code' });
    }

    await writeAuditLog(req, 'MFA_VERIFIED', 'user', userId, 'MFA verification successful');

    // Issue full JWT with mfaVerified: true
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hospital: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    const { buildUserPermissions } = require('../config/rolePermissions');
    const permissions = buildUserPermissions(user, user.hospital);
    const fullToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        hospitalId: user.hospitalId,
        role: user.role,
        permissions,
        mfaVerified: true,
      },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    // Invalidate pre-MFA session and create post-MFA session
    await prisma.loginSession.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });
    const tokenHash = crypto.createHash('sha256').update(fullToken).digest('hex');
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        hospitalId: user.hospitalId,
        sessionToken: tokenHash,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    res.json({ token: fullToken, mfaVerified: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'MFA verification failed' });
  }
});

// POST /api/mfa/verify-backup -- Verify backup code
router.post('/verify-backup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body;

    if (!userId || !code) return res.status(400).json({ error: 'Backup code required' });

    const result = await mfaService.verifyBackupCode(userId, code);

    if (!result.valid) {
      await writeAuditLog(req, 'MFA_BACKUP_FAILED', 'user', userId, 'Invalid backup code');
      return res.status(401).json({ error: 'Invalid backup code' });
    }

    await writeAuditLog(req, 'MFA_BACKUP_USED', 'user', userId,
      `Backup code used. ${result.codesRemaining} remaining`);

    // Issue full JWT
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hospital: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    const { buildUserPermissions: buildPerms } = require('../config/rolePermissions');
    const backupPermissions = buildPerms(user, user.hospital);
    const fullToken = jwt.sign(
      { userId: user.id, email: user.email, hospitalId: user.hospitalId, role: user.role, permissions: backupPermissions, mfaVerified: true },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    // Invalidate pre-MFA session and create post-MFA session
    await prisma.loginSession.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });
    const tokenHash = crypto.createHash('sha256').update(fullToken).digest('hex');
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        hospitalId: user.hospitalId,
        sessionToken: tokenHash,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    res.json({
      token: fullToken,
      mfaVerified: true,
      codesRemaining: result.codesRemaining,
      warning: result.codesRemaining <= 2 ? 'You have very few backup codes remaining. Consider regenerating.' : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Backup verification failed' });
  }
});

// GET /api/mfa/status -- Get MFA status for current user
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const status = await mfaService.getMFAStatus(userId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get MFA status' });
  }
});

// DELETE /api/mfa/disable -- Disable MFA (requires TOTP verification)
router.delete('/disable', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { token } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const normalizedRole = userRole?.toLowerCase().replace(/_/g, '-') || '';
    if (normalizedRole === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin cannot disable their own MFA' });
    }

    await mfaService.disableMFA(userId, token);

    await writeAuditLog(req, 'MFA_DISABLED', 'user', userId, 'MFA disabled by user');

    // Send security alert
    const { sendEmail, buildSecurityAlertEmail } = await import('../services/emailService');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const alertEmail = buildSecurityAlertEmail({
        alertType: 'mfa_disabled',
        details: 'Two-factor authentication has been disabled on your TAILRD Heart account. If you did not do this, contact your administrator immediately.',
        timestamp: new Date().toISOString(),
      });
      alertEmail.to = user.email;
      await sendEmail(alertEmail);
    }

    res.json({ disabled: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to disable MFA' });
  }
});

export default router;
