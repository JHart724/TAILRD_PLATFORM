/**
 * SMART on FHIR Launch Handler
 *
 * Enables TAILRD to be launched from within Epic, Cerner, and other SMART-compliant EHRs.
 *
 *   GET /api/smart/launch     — EHR launch initiation (PKCE)
 *   GET /api/smart/callback   — Token exchange
 *   GET /api/smart/.well-known/smart-configuration — Discovery
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { getRedisClient } from '../lib/redis';

const router = Router();
const API_URL = process.env.API_URL || 'https://api.tailrd-heart.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.tailrd-heart.com';
const SMART_CLIENT_ID = process.env.SMART_CLIENT_ID || 'tailrd-heart';
const PKCE_TTL_SECONDS = 600; // 10 minutes

// SMART EHR Launch — Step 1
router.get('/launch', async (req: Request, res: Response) => {
  const { iss, launch } = req.query;

  if (!iss || !launch) {
    return res.status(400).json({ error: 'Missing iss or launch parameter' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // Store PKCE verifier in Redis — never in the state parameter.
  // The state param is exposed in the redirect URL and EHR server logs.
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(`smart:pkce:${state}`, JSON.stringify({ codeVerifier, iss }), { EX: PKCE_TTL_SECONDS });
  } else {
    logger.warn('Redis not available — PKCE verifier stored in memory fallback (single-instance only)');
    (globalThis as any).__smartPkceStore = (globalThis as any).__smartPkceStore || new Map();
    (globalThis as any).__smartPkceStore.set(state, { codeVerifier, iss, expires: Date.now() + PKCE_TTL_SECONDS * 1000 });
  }

  const authUrl = new URL(`${iss}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', SMART_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', `${API_URL}/api/smart/callback`);
  authUrl.searchParams.set('launch', launch as string);
  authUrl.searchParams.set('scope', 'launch openid fhirUser patient/*.read user/*.read');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('aud', iss as string);

  logger.info('SMART launch initiated', { iss });
  return res.redirect(authUrl.toString());
});

// SMART Callback — Step 2: Exchange code for access token
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/login?error=smart_callback_missing_params`);
  }

  try {
    // Retrieve PKCE verifier from Redis (or in-memory fallback)
    let codeVerifier: string | undefined;
    let iss: string | undefined;

    const redis = await getRedisClient();
    if (redis) {
      const stored = await redis.get(`smart:pkce:${state}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        codeVerifier = parsed.codeVerifier;
        iss = parsed.iss;
        await redis.del(`smart:pkce:${state}`);
      }
    } else {
      const store = (globalThis as any).__smartPkceStore as Map<string, { codeVerifier: string; iss: string; expires: number }> | undefined;
      const entry = store?.get(state as string);
      if (entry && entry.expires > Date.now()) {
        codeVerifier = entry.codeVerifier;
        iss = entry.iss;
      }
      store?.delete(state as string);
    }

    if (!codeVerifier || !iss) {
      logger.warn('SMART callback: PKCE state not found or expired', { state });
      return res.status(400).json({ error: 'Invalid or expired SMART session. Please relaunch from EHR.' });
    }

    const tokenResponse = await fetch(`${iss}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${API_URL}/api/smart/callback`,
        client_id: SMART_CLIENT_ID,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      logger.error('SMART token exchange failed', { status: tokenResponse.status });
      return res.redirect(`${FRONTEND_URL}/login?error=smart_token_failed`);
    }

    const tokenData = await tokenResponse.json() as { access_token: string; patient?: string; id_token?: string };
    const { access_token, patient } = tokenData;

    const smartContext = Buffer.from(JSON.stringify({
      accessToken: access_token,
      fhirPatientId: patient,
      fhirBaseUrl: iss,
    })).toString('base64url');

    return res.redirect(`${FRONTEND_URL}/smart/launch?context=${smartContext}`);
  } catch (error) {
    logger.error('SMART callback error', { error: error instanceof Error ? error.message : String(error) });
    return res.redirect(`${FRONTEND_URL}/login?error=smart_error`);
  }
});

// SMART Configuration Discovery
router.get('/.well-known/smart-configuration', (_req: Request, res: Response) => {
  // TAILRD is a SMART *client*, not an authorization server.
  // authorization_endpoint and token_endpoint are EHR-specific and resolved
  // at launch time from the EHR's .well-known/smart-configuration.
  // This discovery document advertises TAILRD's client capabilities only.
  return res.json({
    capabilities: [
      'launch-ehr',
      'client-public',
      'sso-openid-connect',
      'context-ehr-patient',
      'permission-patient',
      'permission-user',
    ],
    scopes_supported: ['openid', 'fhirUser', 'launch', 'patient/*.read', 'user/*.read'],
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
    grant_types_supported: ['authorization_code'],
    app_launch_url: `${API_URL}/api/smart/launch`,
  });
});

export default router;
