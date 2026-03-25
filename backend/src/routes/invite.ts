import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { writeAuditLog } from '../middleware/auditLogger';
import { UserRole } from '@prisma/client';

const router = Router();

// POST /api/users/invite
router.post('/invite', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    const user = req.user;

    if (!email || !role) {
      return res.status(400).json({ error: 'email and role required' });
    }

    if (!user?.hospitalId || !user?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate role is a valid UserRole
    const validRoles: string[] = [
      'SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHYSICIAN',
      'NURSE_MANAGER', 'QUALITY_DIRECTOR', 'ANALYST', 'VIEWER',
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    const token = crypto.randomBytes(32).toString('hex');

    const invite = await prisma.inviteToken.create({
      data: {
        email,
        role: role as UserRole,
        hospitalId: user.hospitalId,
        createdById: user.userId,
        token,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${invite.token}`;

    // In dev: log URL. In production: send via SES
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_INVITE_URL === 'true') {
      console.log(`\nINVITE URL for ${email}:\n${inviteUrl}\n`);
    }

    await writeAuditLog(req, 'INVITE_SENT', 'InviteToken', invite.id, `Invite sent to ${email} as ${role}`);

    res.json({ inviteId: invite.id, expiresAt: invite.expiresAt, email });
  } catch (error) {
    console.error('Invite creation error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// GET /api/users/invite/validate/:token
router.get('/invite/validate/:token', async (req, res) => {
  try {
    const invite = await prisma.inviteToken.findUnique({
      where: { token: req.params.token },
      include: { hospital: { select: { name: true } } },
    });

    if (!invite) return res.status(404).json({ error: 'Invalid invite link' });
    if (invite.usedAt) return res.status(410).json({ error: 'This invite has already been used' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: 'This invite has expired' });

    res.json({ email: invite.email, role: invite.role, hospitalName: invite.hospital.name });
  } catch (error) {
    console.error('Invite validation error:', error);
    res.status(500).json({ error: 'Failed to validate invite' });
  }
});

// POST /api/users/invite/accept/:token
router.post('/invite/accept/:token', async (req, res) => {
  try {
    const { password, firstName, lastName } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const invite = await prisma.inviteToken.findUnique({ where: { token: req.params.token } });
    if (!invite) return res.status(404).json({ error: 'Invalid invite' });
    if (invite.usedAt) return res.status(410).json({ error: 'Already used' });
    if (invite.expiresAt < new Date()) return res.status(410).json({ error: 'Expired' });

    const hash = await bcrypt.hash(password, 12);

    // Set permissions based on role
    const rolePerms: Record<string, Record<string, boolean>> = {
      QUALITY_DIRECTOR: { permExecutiveView: true, permServiceLineView: true, permCareTeamView: false },
      PHYSICIAN: { permExecutiveView: true, permServiceLineView: true, permCareTeamView: true },
      HOSPITAL_ADMIN: { permExecutiveView: true, permServiceLineView: true, permCareTeamView: true, permManageUsers: true, permExportData: true },
      ANALYST: { permExecutiveView: true, permServiceLineView: true, permCareTeamView: false },
      VIEWER: { permExecutiveView: true, permServiceLineView: false, permCareTeamView: false },
      NURSE_MANAGER: { permExecutiveView: false, permServiceLineView: true, permCareTeamView: true },
      SUPER_ADMIN: { permExecutiveView: true, permServiceLineView: true, permCareTeamView: true, permManageUsers: true, permExportData: true },
    };

    const perms = rolePerms[invite.role] || rolePerms.VIEWER;

    const user = await prisma.user.create({
      data: {
        email: invite.email,
        passwordHash: hash,
        firstName: firstName || invite.email.split('@')[0],
        lastName: lastName || '',
        role: invite.role,
        hospitalId: invite.hospitalId,
        permHeartFailure: true,
        permElectrophysiology: true,
        permStructuralHeart: true,
        permCoronaryIntervention: true,
        permPeripheralVascular: true,
        permValvularDisease: true,
        ...perms,
        permViewReports: true,
        isActive: true,
      },
    });

    // Mark invite as used
    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    // Auto-login: generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const authToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, hospitalId: user.hospitalId },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({ token: authToken, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Invite accept error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// GET /api/users — list users for hospital
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hospitalId = req.user?.hospitalId;
    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital context required' });
    }

    const users = await prisma.user.findMany({
      where: { hospitalId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('User list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
