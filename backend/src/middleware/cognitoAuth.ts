/**
 * Cognito JWT Verification
 *
 * Validates AWS Cognito-issued JWTs by fetching the JWKS from the Cognito
 * User Pool and verifying the token signature. Maps Cognito claims to
 * the TAILRD JWTPayload interface so downstream middleware works unchanged.
 *
 * When COGNITO_USER_POOL_ID is set, authenticateToken in auth.ts will
 * try Cognito verification if the local JWT verification fails. This
 * allows both local-issued tokens (demo, existing users) and Cognito
 * tokens (SSO/SAML users) to coexist during migration.
 *
 * To add a health system's SAML IdP:
 *   aws cognito-idp create-identity-provider \
 *     --user-pool-id $POOL_ID \
 *     --provider-name "HealthSystemName" \
 *     --provider-type SAML \
 *     --provider-details '{"MetadataURL":"https://their-idp/metadata.xml"}' \
 *     --attribute-mapping '{"email":"email","custom:hospitalId":"hospitalId","custom:role":"role"}'
 */

import jwt from 'jsonwebtoken';
import https from 'https';
import { JWTPayload } from '../types';
import { buildUserPermissions } from '../config/rolePermissions';
import prisma from '../lib/prisma';

const COGNITO_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_REGION = process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1';
const COGNITO_ISSUER = COGNITO_POOL_ID
  ? `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_POOL_ID}`
  : null;
const JWKS_URL = COGNITO_ISSUER ? `${COGNITO_ISSUER}/.well-known/jwks.json` : null;

// Cache JWKS keys in memory (they rotate infrequently)
let jwksCache: Record<string, string> = {};
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/** Fetch and cache JWKS public keys from Cognito */
async function getSigningKey(kid: string): Promise<string> {
  if (Date.now() - jwksCacheTime > JWKS_CACHE_TTL || !jwksCache[kid]) {
    if (!JWKS_URL) throw new Error('Cognito not configured');
    const jwks = await fetchJSON(JWKS_URL);
    jwksCache = {};
    for (const key of jwks.keys) {
      // Convert JWK to PEM format for jwt.verify
      jwksCache[key.kid] = jwkToPem(key);
    }
    jwksCacheTime = Date.now();
  }
  if (!jwksCache[kid]) throw new Error(`Signing key not found for kid: ${kid}`);
  return jwksCache[kid];
}

/** Verify a Cognito-issued JWT and map to TAILRD JWTPayload */
export async function verifyCognitoToken(token: string): Promise<JWTPayload | null> {
  if (!COGNITO_ISSUER) return null; // Cognito not configured

  try {
    // Decode header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) return null;

    // Verify issuer matches before fetching keys
    const payload = decoded.payload as Record<string, any>;
    if (payload.iss !== COGNITO_ISSUER) return null;

    const signingKey = await getSigningKey(decoded.header.kid);

    const verified = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      issuer: COGNITO_ISSUER,
    }) as Record<string, any>;

    // Map Cognito claims to TAILRD JWTPayload
    const email = verified.email || verified['cognito:username'];
    const hospitalId = verified['custom:hospitalId'];
    const role = verified['custom:role'] || 'VIEWER';

    if (!email) return null;

    // Look up user in DB to get full permissions
    const user = await prisma.user.findUnique({
      where: { email },
      include: { hospital: true },
    });

    if (!user || !user.isActive) return null;

    const permissions = buildUserPermissions(user, user.hospital);

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      hospitalName: user.hospital.name,
      permissions,
      iat: verified.iat || Math.floor(Date.now() / 1000),
      exp: verified.exp || Math.floor(Date.now() / 1000) + 3600,
    };
  } catch {
    return null; // Cognito verification failed, fall back to local JWT
  }
}

/** Check if Cognito is configured */
export function isCognitoEnabled(): boolean {
  return !!COGNITO_POOL_ID;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/** Minimal JWK-to-PEM conversion for RSA keys */
function jwkToPem(jwk: { n: string; e: string; kty: string }): string {
  if (jwk.kty !== 'RSA') throw new Error('Only RSA keys supported');
  const n = base64urlToBuffer(jwk.n);
  const e = base64urlToBuffer(jwk.e);

  // DER encode RSA public key
  const nBytes = encodeLength(n.length) ;
  const eBytes = encodeLength(e.length);
  const seqInner = Buffer.concat([
    Buffer.from([0x02]), nBytes, n,
    Buffer.from([0x02]), eBytes, e,
  ]);
  const seqOuter = Buffer.concat([Buffer.from([0x30]), encodeLength(seqInner.length), seqInner]);

  // Wrap in PKCS#1 structure
  const bitString = Buffer.concat([Buffer.from([0x00]), seqOuter]);
  const bitStringWrapped = Buffer.concat([Buffer.from([0x03]), encodeLength(bitString.length), bitString]);

  // RSA OID
  const rsaOid = Buffer.from([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const body = Buffer.concat([rsaOid, bitStringWrapped]);
  const der = Buffer.concat([Buffer.from([0x30]), encodeLength(body.length), body]);

  const b64 = der.toString('base64');
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

function base64urlToBuffer(str: string): Buffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const buf = Buffer.from(str, 'base64');
  // Ensure positive integer (prepend 0x00 if high bit set)
  if (buf[0] & 0x80) return Buffer.concat([Buffer.from([0x00]), buf]);
  return buf;
}

function encodeLength(len: number): Buffer {
  if (len < 128) return Buffer.from([len]);
  if (len < 256) return Buffer.from([0x81, len]);
  return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
}
