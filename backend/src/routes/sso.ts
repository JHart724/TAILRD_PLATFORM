/**
 * SSO / SAML Routes — Cognito Hosted UI Integration
 *
 * Enables SAML-based SSO via AWS Cognito:
 *   GET  /api/sso/login    — Redirect to Cognito hosted UI
 *   GET  /api/sso/callback — Exchange code for tokens, issue TAILRD JWT
 *   POST /api/sso/logout   — Terminate session, redirect to Cognito SLO
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { buildUserPermissions } from '../config/rolePermissions';
import { writeAuditLog } from '../middleware/auditLogger';
import { logger } from '../utils/logger';

const router = Router();

const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const API_URL = process.env.API_URL || 'https://api.tailrd-heart.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.tailrd-heart.com';
const JWT_SECRET = process.env.JWT_SECRET!;

// SSO initiation — redirect to Cognito hosted UI
router.get('/login', (req: Request, res: Response) => {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
    return res.status(503).json({ success: false, error: 'SSO not configured. Set COGNITO_DOMAIN and COGNITO_CLIENT_ID.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = encodeURIComponent(`${API_URL}/api/sso/callback`);

  const authUrl = `https://${COGNITO_DOMAIN}/oauth2/authorize?` +
    `response_type=code&client_id=${COGNITO_CLIENT_ID}&redirect_uri=${redirectUri}` +
    `&identity_provider=SamlProvider&scope=openid+email+profile&state=${state}`;

  return res.redirect(authUrl);
});

// OAuth2 callback from Cognito after SAML assertion
router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
  }

  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
    return res.redirect(`${FRONTEND_URL}/login?error=sso_not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenEndpoint = `https://${COGNITO_DOMAIN}/oauth2/token`;
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: COGNITO_CLIENT_ID,
        code: code as string,
        redirect_uri: `${API_URL}/api/sso/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      logger.error('Cognito token exchange failed', { status: tokenResponse.status });
      return res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json() as { id_token: string; access_token: string };

    // Decode ID token for user attributes
    const idTokenPayload = JSON.parse(
      Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
    );

    const email = idTokenPayload.email;
    const hospitalId = idTokenPayload['custom:hospitalId'];
    const samlNameId = idTokenPayload['custom:samlNameId'] || idTokenPayload.sub;

    if (!email || !hospitalId) {
      logger.error('SSO token missing required attributes', { hasEmail: !!email, hasHospitalId: !!hospitalId });
      return res.redirect(`${FRONTEND_URL}/login?error=missing_attributes`);
    }

    // Find or provision user (JIT provisioning)
    let user = await prisma.user.findUnique({
      where: { email },
      include: { hospital: true },
    });

    if (!user) {
      const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
      if (!hospital) {
        return res.redirect(`${FRONTEND_URL}/login?error=hospital_not_found`);
      }

      user = await prisma.user.create({
        data: {
          email,
          firstName: idTokenPayload.given_name || '',
          lastName: idTokenPayload.family_name || '',
          hospitalId,
          role: 'PHYSICIAN',
          isActive: true,
          isVerified: true,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          ssoProvider: 'saml',
          samlNameId,
          lastSsoLogin: new Date(),
        },
        include: { hospital: true },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { samlNameId, lastSsoLogin: new Date(), ssoProvider: 'saml' },
      });
    }

    if (!user.isActive) {
      return res.redirect(`${FRONTEND_URL}/login?error=account_inactive`);
    }

    const permissions = buildUserPermissions(user, user.hospital);

    const appToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: user.hospital?.name,
        mfaVerified: true, // SSO satisfies MFA requirement
        permissions,
        ssoSession: true,
      },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '8h' }
    );

    // Create session
    const tokenHash = crypto.createHash('sha256').update(appToken).digest('hex');
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        hospitalId: user.hospitalId,
        sessionToken: tokenHash,
        isActive: true,
        userAgent: req.headers['user-agent'] ?? 'SSO',
        ipAddress: req.ip ?? 'unknown',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });

    await writeAuditLog(
      { user: { userId: user.id, hospitalId: user.hospitalId } } as any,
      'SSO_LOGIN',
      'User',
      user.id,
      `SSO login via SAML`
    );

    return res.redirect(`${FRONTEND_URL}/auth/callback?token=${appToken}`);

  } catch (error) {
    logger.error('SSO callback error', { error: error instanceof Error ? error.message : String(error) });
    return res.redirect(`${FRONTEND_URL}/login?error=sso_error`);
  }
});

// SSO logout
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
      if (decoded.userId) {
        await prisma.loginSession.updateMany({
          where: { userId: decoded.userId, isActive: true },
          data: { isActive: false },
        });
        await writeAuditLog(
          { user: { userId: decoded.userId, hospitalId: decoded.hospitalId } } as any,
          'SSO_LOGOUT', 'User', decoded.userId, 'SSO session terminated'
        );
      }
    } catch { /* token expired or invalid — still log out */ }
  }

  if (COGNITO_DOMAIN && COGNITO_CLIENT_ID) {
    const logoutUri = encodeURIComponent(`${FRONTEND_URL}/login`);
    return res.json({
      success: true,
      logoutUrl: `https://${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${logoutUri}`,
    });
  }

  return res.json({ success: true, message: 'Session terminated' });
});

export default router;
