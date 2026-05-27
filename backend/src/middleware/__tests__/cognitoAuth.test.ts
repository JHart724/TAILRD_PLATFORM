/**
 * AUDIT-001 Tier A coverage extension for backend/src/middleware/cognitoAuth.ts
 * (P1.AUDIT-001.D file 6 of 7; request-gate domain).
 *
 * 13 axes (a-n) / target 25+ test invocations / NEW file (no prior dedicated coverage;
 * 15.47/14.28/0/18.57 baseline was sister-test transitive via auth.test.ts module-load
 * constants only - V.5-RECOVERY catch #53).
 *
 * Per V.5-RECOVERY discipline + Q-D.D2 Path (b) comprehensive lock + sister catch
 * #47 + #53 root-cause avoidance: this test MUST NOT mock cognitoAuth module
 * (auth.test.ts L28-32 cognitoAuth self-mock blocks transitive coverage; NEW file
 * uses REAL verifyCognitoToken + isCognitoEnabled execution).
 *
 * Mock policy:
 *   NOT mocked: cognitoAuth module - REAL execution required for coverage instrumentation
 *   NOT mocked: jsonwebtoken - REAL jwt.sign/decode/verify via test RSA keypair
 *   NOT mocked: crypto - REAL keypair + base64url + DER chain
 *   REUSE: jest.mock('../../lib/prisma') sister auth.test.ts L20-26 + auditLogger.test.ts L25-32 pattern
 *   NOVEL (axis-required): RSA keypair via crypto.generateKeyPairSync(2048) + JWK export
 *   NOVEL (axis-required): jest.spyOn(https, 'get') JWKS mock (source uses https.get NOT node-fetch)
 *   REUSE: jest.isolateModules for module-load env var control (sister auth.test.ts L105-120 pattern)
 */
import crypto from 'crypto';
import https from 'https';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
  },
}));

import prisma from '../../lib/prisma';
const mockUserFindUnique = (prisma as any).user.findUnique as jest.Mock;

const TEST_POOL_ID = 'us-east-1_TestPool';
const TEST_REGION = 'us-east-1';
const TEST_ISSUER = `https://cognito-idp.${TEST_REGION}.amazonaws.com/${TEST_POOL_ID}`;
const TEST_KID = 'test-kid-001';

// Generate RSA keypair once for all tests (2048-bit; ~1s cost amortized)
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
const publicJwkBase = publicKey.export({ format: 'jwk' }) as any;
const publicJwk = { ...publicJwkBase, kid: TEST_KID, use: 'sig', alg: 'RS256' };
const defaultJwks = { keys: [publicJwk] };

// Second wrong keypair for signature-failure axis (g)
const wrongPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const wrongPrivatePem = wrongPair.privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;

// Arbitrary 130-byte n for encodeLength branch-2 coverage (128 <= len < 256).
// jwkToPem runs through with branch 2 of encodeLength; jwt.verify subsequently
// fails (fake n doesn't match real signing key) -> catch block -> null.
// Source jsonwebtoken v9 enforces 2048-bit min for RS256, so we cannot sign with
// a real 1024-bit key; instead we craft a JWK that exercises the DER length path.
const branch2NBuffer = Buffer.alloc(130, 0x42);
const branch2EBuffer = Buffer.from([0x01, 0x00, 0x01]);
const branch2Jwk = {
  kty: 'RSA',
  kid: 'branch2-kid',
  n: branch2NBuffer.toString('base64url'),
  e: branch2EBuffer.toString('base64url'),
  use: 'sig',
  alg: 'RS256',
};

let httpsGetSpy: jest.SpyInstance;

function setMockJwks(jwks: any) {
  httpsGetSpy.mockImplementation((_url: any, cb?: any) => {
    const req = new EventEmitter() as any;
    if (typeof cb === 'function') {
      setImmediate(() => {
        const stream = new EventEmitter() as any;
        cb(stream);
        stream.emit('data', JSON.stringify(jwks));
        stream.emit('end');
      });
    }
    return req;
  });
}

function setMockJwksError(error: Error) {
  httpsGetSpy.mockImplementation((_url: any, _cb?: any) => {
    const req = new EventEmitter() as any;
    setImmediate(() => {
      req.emit('error', error);
    });
    return req;
  });
}

function loadFreshCognito(env: Record<string, string | undefined> = {}): any {
  const defaults: Record<string, string | undefined> = {
    COGNITO_USER_POOL_ID: TEST_POOL_ID,
    COGNITO_REGION: TEST_REGION,
    AWS_REGION: undefined,
  };
  const merged = { ...defaults, ...env };
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(merged)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../cognitoAuth');
  });
  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return mod;
}

function buildDbUser(overrides: any = {}): any {
  return {
    id: 'user-db-id-1',
    email: 'user@example.com',
    role: 'PHYSICIAN',
    hospitalId: 'hosp-1',
    isActive: true,
    permHeartFailure: true,
    permElectrophysiology: false,
    permStructuralHeart: false,
    permCoronaryIntervention: false,
    permPeripheralVascular: false,
    permValvularDisease: false,
    permExecutiveView: false,
    permServiceLineView: true,
    permCareTeamView: true,
    permViewReports: true,
    permExportData: false,
    permManageUsers: false,
    permConfigureAlerts: false,
    permAccessPHI: true,
    hospital: {
      id: 'hosp-1',
      name: 'Test Hospital',
      moduleHeartFailure: true,
      moduleElectrophysiology: true,
      moduleStructuralHeart: true,
      moduleCoronaryIntervention: true,
      modulePeripheralVascular: true,
      moduleValvularDisease: true,
    },
    ...overrides,
  };
}

function signValidToken(
  payloadOverrides: Record<string, any> = {},
  opts: { kid?: string; key?: string; algorithm?: any; noTimestamp?: boolean } = {},
): string {
  const payload = {
    iss: TEST_ISSUER,
    email: 'user@example.com',
    'custom:hospitalId': 'hosp-1',
    'custom:role': 'PHYSICIAN',
    ...payloadOverrides,
  };
  const signOpts: any = {
    algorithm: opts.algorithm ?? 'RS256',
    keyid: opts.kid ?? TEST_KID,
  };
  if (opts.noTimestamp) {
    signOpts.noTimestamp = true;
  } else {
    signOpts.expiresIn = '1d';
  }
  return jwt.sign(payload, opts.key ?? privatePem, signOpts);
}

beforeAll(() => {
  httpsGetSpy = jest.spyOn(https, 'get').mockImplementation((_url: any, cb?: any) => {
    const req = new EventEmitter() as any;
    if (typeof cb === 'function') {
      setImmediate(() => {
        const stream = new EventEmitter() as any;
        cb(stream);
        stream.emit('data', JSON.stringify(defaultJwks));
        stream.emit('end');
      });
    }
    return req;
  });
});

afterAll(() => {
  httpsGetSpy.mockRestore();
});

beforeEach(() => {
  setMockJwks(defaultJwks);
  mockUserFindUnique.mockReset();
});

describe('cognitoAuth middleware - AUDIT-001 Tier A coverage extension', () => {
  describe('(a) isCognitoEnabled env-toggle', () => {
    it('a.1: returns true when COGNITO_USER_POOL_ID set', () => {
      const mod = loadFreshCognito({ COGNITO_USER_POOL_ID: TEST_POOL_ID });
      expect(mod.isCognitoEnabled()).toBe(true);
    });

    it('a.2: returns false when COGNITO_USER_POOL_ID unset', () => {
      const mod = loadFreshCognito({ COGNITO_USER_POOL_ID: undefined });
      expect(mod.isCognitoEnabled()).toBe(false);
    });
  });

  describe('(b) verifyCognitoToken returns null when COGNITO_ISSUER null (module-load unconfigured)', () => {
    it('b.1: returns null when COGNITO_USER_POOL_ID unset (no issuer constructed)', async () => {
      const mod = loadFreshCognito({ COGNITO_USER_POOL_ID: undefined });
      const result = await mod.verifyCognitoToken('any.token.value');
      expect(result).toBeNull();
    });
  });

  describe('(c) verifyCognitoToken happy path', () => {
    it('c.1: valid RS256 + issuer match + active DB user -> mapped JWTPayload', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const token = signValidToken();
      const result = await mod.verifyCognitoToken(token);
      expect(result).not.toBeNull();
      expect(result.userId).toBe('user-db-id-1');
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe('PHYSICIAN');
      expect(result.hospitalId).toBe('hosp-1');
      expect(result.hospitalName).toBe('Test Hospital');
      expect(typeof result.iat).toBe('number');
      expect(typeof result.exp).toBe('number');
    });

    it('c.2: returned permissions object includes modules/views/actions shape', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const token = signValidToken();
      const result = await mod.verifyCognitoToken(token);
      expect(result.permissions).toBeDefined();
      expect(result.permissions.modules).toBeDefined();
      expect(result.permissions.views).toBeDefined();
      expect(result.permissions.actions).toBeDefined();
    });

    it('c.3: prisma.user.findUnique called with where:{email} and hospital include', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const token = signValidToken({ email: 'lookup@example.com' });
      mockUserFindUnique.mockResolvedValue(buildDbUser({ email: 'lookup@example.com' }));
      await mod.verifyCognitoToken(token);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { email: 'lookup@example.com' },
        include: { hospital: true },
      });
    });
  });

  describe('(d) verifyCognitoToken malformed token paths', () => {
    it('d.1: completely malformed token string -> null (jwt.decode returns null)', async () => {
      const mod = loadFreshCognito();
      const result = await mod.verifyCognitoToken('not-a-jwt');
      expect(result).toBeNull();
    });

    it('d.2: empty string token -> null', async () => {
      const mod = loadFreshCognito();
      const result = await mod.verifyCognitoToken('');
      expect(result).toBeNull();
    });
  });

  describe('(e) verifyCognitoToken missing kid in header', () => {
    it('e.1: token without kid -> null', async () => {
      const mod = loadFreshCognito();
      const token = jwt.sign({ iss: TEST_ISSUER, email: 'a@b.com' }, privatePem, {
        algorithm: 'RS256',
        // intentionally no keyid
      });
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
    });
  });

  describe('(f) verifyCognitoToken issuer mismatch', () => {
    it('f.1: payload.iss != COGNITO_ISSUER -> null without fetching JWKS', async () => {
      const mod = loadFreshCognito();
      httpsGetSpy.mockClear();
      const token = signValidToken({ iss: 'https://attacker.example.com/wrong-pool' });
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
      expect(httpsGetSpy).not.toHaveBeenCalled();
    });
  });

  describe('(g) verifyCognitoToken signature verification failure', () => {
    it('g.1: token signed with wrong key -> null via catch block L104', async () => {
      const mod = loadFreshCognito();
      const token = signValidToken({}, { key: wrongPrivatePem });
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
    });

    it('g.2: signing key not found for kid -> null', async () => {
      const mod = loadFreshCognito();
      const token = signValidToken({}, { kid: 'nonexistent-kid' });
      // Default mock JWKS contains only TEST_KID, not nonexistent-kid
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
    });
  });

  describe('(h) verifyCognitoToken missing email AND cognito:username', () => {
    it('h.1: payload with neither email nor cognito:username -> null', async () => {
      const mod = loadFreshCognito();
      const token = jwt.sign(
        { iss: TEST_ISSUER, 'custom:hospitalId': 'hosp-1' },
        privatePem,
        { algorithm: 'RS256', keyid: TEST_KID, expiresIn: '1d' },
      );
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
    });

    it('h.2: payload with cognito:username fallback (email absent) -> valid payload', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser({ email: 'fallback@example.com' }));
      const token = jwt.sign(
        {
          iss: TEST_ISSUER,
          'cognito:username': 'fallback@example.com',
          'custom:hospitalId': 'hosp-1',
        },
        privatePem,
        { algorithm: 'RS256', keyid: TEST_KID, expiresIn: '1d' },
      );
      const result = await mod.verifyCognitoToken(token);
      expect(result).not.toBeNull();
      expect(result.email).toBe('fallback@example.com');
    });
  });

  describe('(i) verifyCognitoToken DB user validity', () => {
    it('i.1: prisma returns null -> verifyCognitoToken returns null', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(null);
      const token = signValidToken();
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
    });

    it('i.2: user.isActive=false -> null', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser({ isActive: false }));
      const token = signValidToken();
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
    });
  });

  describe('(j) JWKS cache behavior', () => {
    it('j.1: cache miss on first call triggers fetchJSON via https.get', async () => {
      const mod = loadFreshCognito();
      httpsGetSpy.mockClear();
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      await mod.verifyCognitoToken(signValidToken());
      expect(httpsGetSpy).toHaveBeenCalledTimes(1);
    });

    it('j.2: cache hit on second call skips fetch', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      await mod.verifyCognitoToken(signValidToken());
      httpsGetSpy.mockClear();
      await mod.verifyCognitoToken(signValidToken());
      expect(httpsGetSpy).not.toHaveBeenCalled();
    });

    it('j.3: cache TTL expiry (>1h) triggers refetch', async () => {
      const baseTime = 1700000000000;
      let currentTime = baseTime;
      const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
      try {
        const mod = loadFreshCognito();
        mockUserFindUnique.mockResolvedValue(buildDbUser());
        const token1 = signValidToken();
        await mod.verifyCognitoToken(token1);
        httpsGetSpy.mockClear();
        // Advance time past 1h TTL
        currentTime = baseTime + 61 * 60 * 1000;
        const token2 = signValidToken();
        await mod.verifyCognitoToken(token2);
        expect(httpsGetSpy).toHaveBeenCalledTimes(1);
      } finally {
        dateNowSpy.mockRestore();
      }
    });

    it('j.4: kid not in cached JWKS triggers refetch', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const altKidJwk = { ...publicJwkBase, kid: 'alt-kid', use: 'sig', alg: 'RS256' };
      setMockJwks({ keys: [publicJwk] });
      await mod.verifyCognitoToken(signValidToken({}, { kid: TEST_KID }));
      httpsGetSpy.mockClear();
      // Now request with different kid - cache hit fails, refetch
      setMockJwks({ keys: [altKidJwk] });
      await mod.verifyCognitoToken(signValidToken({}, { kid: 'alt-kid' }));
      expect(httpsGetSpy).toHaveBeenCalledTimes(1);
    });

    it('j.5: malformed JWKS JSON triggers fetchJSON JSON.parse catch (L122) -> verifyCognitoToken null', async () => {
      // Real failure mode: Cognito JWKS endpoint returning HTML error page,
      // mid-response truncation, or network corruption. fetchJSON L120-122 catch
      // rejects with the parse error -> getSigningKey rejects ->
      // verifyCognitoToken L104 catch returns null.
      const mod = loadFreshCognito();
      httpsGetSpy.mockImplementation((_url: any, cb?: any) => {
        const req = new EventEmitter() as any;
        if (typeof cb === 'function') {
          setImmediate(() => {
            const stream = new EventEmitter() as any;
            cb(stream);
            stream.emit('data', 'not-valid-json{');
            stream.emit('end');
          });
        }
        return req;
      });
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const result = await mod.verifyCognitoToken(signValidToken());
      expect(result).toBeNull();
    });
  });

  describe('(k) Internal helper coverage transitive via REAL verifyCognitoToken', () => {
    it('k.1: non-RSA kty key in JWKS triggers jwkToPem throw -> verifyCognitoToken null', async () => {
      const mod = loadFreshCognito();
      setMockJwks({ keys: [{ kty: 'EC', kid: TEST_KID, crv: 'P-256', x: 'aaa', y: 'bbb' }] });
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const result = await mod.verifyCognitoToken(signValidToken());
      expect(result).toBeNull();
    });

    it('k.2: 130-byte n in JWKS exercises encodeLength branch 2 (128 <= len < 256)', async () => {
      const mod = loadFreshCognito();
      setMockJwks({ keys: [branch2Jwk] });
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      // Sign with real privatePem but kid="branch2-kid". jwkToPem will run
      // through encodeLength(130) via the fake n, then jwt.verify fails because
      // the fake JWK does not match real signing key -> catch -> null.
      // Branch 2 of encodeLength is exercised; assertion verifies the catch path.
      const token = signValidToken({}, { kid: 'branch2-kid' });
      const result = await mod.verifyCognitoToken(token);
      expect(result).toBeNull();
    });
  });

  describe('(l) verified.iat and verified.exp fallback to Date.now-based defaults', () => {
    it('l.1: token without iat/exp claims -> returned payload still has iat/exp numbers', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const token = jwt.sign(
        {
          iss: TEST_ISSUER,
          email: 'user@example.com',
          'custom:hospitalId': 'hosp-1',
        },
        privatePem,
        { algorithm: 'RS256', keyid: TEST_KID, noTimestamp: true },
      );
      const result = await mod.verifyCognitoToken(token);
      expect(result).not.toBeNull();
      expect(typeof result.iat).toBe('number');
      expect(typeof result.exp).toBe('number');
      expect(result.exp).toBeGreaterThan(result.iat);
    });
  });

  describe('(m) custom:role default VIEWER fallback when claim absent', () => {
    it('m.1: token without custom:role still verifies successfully (role from DB user)', async () => {
      const mod = loadFreshCognito();
      mockUserFindUnique.mockResolvedValue(buildDbUser({ role: 'NURSE_MANAGER' }));
      const token = jwt.sign(
        {
          iss: TEST_ISSUER,
          email: 'user@example.com',
          'custom:hospitalId': 'hosp-1',
        },
        privatePem,
        { algorithm: 'RS256', keyid: TEST_KID, expiresIn: '1d' },
      );
      const result = await mod.verifyCognitoToken(token);
      expect(result).not.toBeNull();
      expect(result.role).toBe('NURSE_MANAGER');
    });
  });

  describe('(n) COGNITO_REGION fallback paths', () => {
    it('n.1: COGNITO_REGION unset -> AWS_REGION used to construct ISSUER', async () => {
      const altRegion = 'eu-west-1';
      const altIssuer = `https://cognito-idp.${altRegion}.amazonaws.com/${TEST_POOL_ID}`;
      const mod = loadFreshCognito({
        COGNITO_USER_POOL_ID: TEST_POOL_ID,
        COGNITO_REGION: undefined,
        AWS_REGION: altRegion,
      });
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const token = signValidToken({ iss: altIssuer });
      const result = await mod.verifyCognitoToken(token);
      expect(result).not.toBeNull();
      expect(result.email).toBe('user@example.com');
    });

    it('n.2: COGNITO_REGION and AWS_REGION both unset -> us-east-1 default', async () => {
      const defaultIssuer = `https://cognito-idp.us-east-1.amazonaws.com/${TEST_POOL_ID}`;
      const mod = loadFreshCognito({
        COGNITO_USER_POOL_ID: TEST_POOL_ID,
        COGNITO_REGION: undefined,
        AWS_REGION: undefined,
      });
      mockUserFindUnique.mockResolvedValue(buildDbUser());
      const token = signValidToken({ iss: defaultIssuer });
      const result = await mod.verifyCognitoToken(token);
      expect(result).not.toBeNull();
    });
  });
});
