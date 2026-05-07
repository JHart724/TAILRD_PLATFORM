/**
 * AUDIT-071 — cdsHooksAuth middleware tests.
 *
 * Mock-based unit tests per existing codebase pattern. Covers:
 *   - Path A (EHR-initiated, happy path) — JWT verified, issuer mapped, ctx populated
 *   - Path B (no fhirAuthorization) — deny via 200 + empty cards (D2)
 *   - JWT signature failure → 401 (D3 auth-boundary)
 *   - Missing required JWT claim → 401
 *   - JWT iss mismatch with fhirAuthorization.subject → 401
 *   - Unmapped issuer → 200 + empty cards
 *   - Discovery endpoint exemption (GET /)
 *   - Feedback endpoint exemption (POST /:hookId/feedback)
 *   - Demo-mode non-inheritance (no super-admin synthesis)
 *   - Audit log writes for each failure mode (HIPAA-graded actions)
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const findFirstHei = jest.fn();
const writeAuditLog = jest.fn().mockResolvedValue(undefined);
const jwtVerifyMock = jest.fn();
const createRemoteJWKSetMock = jest.fn().mockReturnValue({});

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    hospitalEhrIssuer: {
      findFirst: (...args: unknown[]) => findFirstHei(...args),
    },
  },
}));

jest.mock('../auditLogger', () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...args),
  auditLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('jose', () => ({
  __esModule: true,
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
  createRemoteJWKSet: (...args: unknown[]) => createRemoteJWKSetMock(...args),
}));

import { cdsHooksAuth, _resetJwksCacheForTests } from '../cdsHooksAuth';
import type { Request, Response, NextFunction } from 'express';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    path: '/tailrd-cardiovascular-gaps',
    headers: { authorization: 'Bearer FAKE.JWT.TOKEN' },
    body: {
      fhirAuthorization: { subject: 'https://fhir.epic.com/interconnect-fhir-oauth' },
      context: { patientId: 'fhir-patient-123' },
    },
    ...overrides,
  } as Request;
}

function makeRes(): Response {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn().mockImplementation(function (this: Response, code: number) {
      (this as unknown as { statusCode: number }).statusCode = code;
      return this;
    }),
    json: jest.fn().mockImplementation(function (this: Response, body: unknown) {
      (this as unknown as { body: unknown }).body = body;
      return this;
    }),
  };
  return res as unknown as Response;
}

/**
 * Assertion helper: extract the latest writeAuditLog call and verify the
 * relevant fields without struggling against expect.anything()/null mismatch.
 * writeAuditLog signature: (req, action, resourceType, resourceId, description, previousValues, newValues)
 */
function lastAuditCall(): {
  action: string;
  resourceType: string;
  resourceId: unknown;
  description: string;
  metadata: Record<string, unknown> | null;
} {
  const call = writeAuditLog.mock.calls[writeAuditLog.mock.calls.length - 1];
  return {
    action: call[1],
    resourceType: call[2],
    resourceId: call[3],
    description: call[4],
    metadata: call[6],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetJwksCacheForTests();
  jwtVerifyMock.mockResolvedValue({
    payload: {
      iss: 'https://fhir.epic.com/interconnect-fhir-oauth',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: 'jti-test',
    },
  });
  findFirstHei.mockResolvedValue({
    id: 'hei-test-id',
    hospitalId: 'hospital-test-id',
  });
});

describe('cdsHooksAuth middleware — AUDIT-071', () => {
  // ── Path A: EHR-initiated happy path ─────────────────────────────────────

  it('Path A happy path: JWT verified + issuer mapped → req.cdsHooks populated; next() called', async () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as Request & { cdsHooks?: unknown }).cdsHooks).toEqual({
      hospitalId: 'hospital-test-id',
      issuerUrl: 'https://fhir.epic.com/interconnect-fhir-oauth',
      ehrIssuerId: 'hei-test-id',
    });
    expect(res.json).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  // ── Path B (D2): no fhirAuthorization ──────────────────────────────────

  it('Path B (D2): missing fhirAuthorization.subject → 200 + empty cards + audit CDS_HOOKS_NO_TENANT_RESOLVED', async () => {
    const req = makeReq({ body: { context: { patientId: 'fhir-patient-123' } } });
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ cards: [] });
    const audit = lastAuditCall();
    expect(audit.action).toBe('CDS_HOOKS_NO_TENANT_RESOLVED');
    expect(audit.resourceType).toBe('CdsHooks');
    expect(audit.description).toMatch(/missing fhirAuthorization\.subject/);
    expect(audit.metadata).toEqual(expect.objectContaining({ path: '/tailrd-cardiovascular-gaps' }));
  });

  it('Path B header-skip closure: empty body → 200 + empty cards + audit', async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ cards: [] });
    expect(lastAuditCall().action).toBe('CDS_HOOKS_NO_TENANT_RESOLVED');
  });

  // ── JWT signature failures (D3 → 401) ──────────────────────────────────

  it('JWT signature failure → 401 + audit CDS_HOOKS_JWT_VALIDATION_FAILURE', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('signature verification failed'));
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid CDS Hooks JWT' });
    const audit = lastAuditCall();
    expect(audit.action).toBe('CDS_HOOKS_JWT_VALIDATION_FAILURE');
    expect(audit.description).toMatch(/signature verification failed/);
    expect(audit.metadata).toEqual(expect.objectContaining({ issuerUrl: 'https://fhir.epic.com/interconnect-fhir-oauth' }));
  });

  it('Missing Bearer prefix → 401 + audit', async () => {
    const req = makeReq({ headers: { authorization: 'NotBearer FAKE' } });
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const audit = lastAuditCall();
    expect(audit.action).toBe('CDS_HOOKS_JWT_VALIDATION_FAILURE');
    expect(audit.description).toMatch(/missing or malformed/);
  });

  it('Missing required JWT claim (jti) → 401 + audit', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { iss: 'https://fhir.epic.com/interconnect-fhir-oauth', iat: 1, exp: 9999999999 },
    });
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(lastAuditCall().description).toMatch(/missing required claim/);
  });

  it('JWT iss mismatch with fhirAuthorization.subject → 401 + audit (defends against subject spoofing)', async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: {
        iss: 'https://attacker-controlled.example/oauth',
        iat: 1,
        exp: 9999999999,
        jti: 'jti',
      },
    });
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(lastAuditCall().description).toMatch(/iss claim.*does not match/);
  });

  // ── Unmapped issuer → 200 + empty cards ────────────────────────────────

  it('JWT valid but issuer not in HospitalEhrIssuer → 200 + empty cards + audit CDS_HOOKS_UNMAPPED_ISSUER', async () => {
    findFirstHei.mockResolvedValue(null);
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ cards: [] });
    const audit = lastAuditCall();
    expect(audit.action).toBe('CDS_HOOKS_UNMAPPED_ISSUER');
    expect(audit.description).toMatch(/not registered/);
    expect(audit.metadata).toEqual(expect.objectContaining({ issuerUrl: 'https://fhir.epic.com/interconnect-fhir-oauth' }));
  });

  it('Issuer registered but isActive=false → unmapped (lookup filters isActive: true)', async () => {
    findFirstHei.mockResolvedValue(null);
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(findFirstHei).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isActive: true }),
    }));
    expect(res.json).toHaveBeenCalledWith({ cards: [] });
  });

  // ── Discovery + feedback exemptions ────────────────────────────────────

  it('Discovery endpoint (GET /) bypasses middleware', async () => {
    const req = makeReq({ method: 'GET', path: '/', body: undefined });
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(jwtVerifyMock).not.toHaveBeenCalled();
    expect(findFirstHei).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('Feedback endpoint (POST /<hookId>/feedback) bypasses middleware', async () => {
    const req = makeReq({
      method: 'POST',
      path: '/tailrd-cardiovascular-gaps/feedback',
      body: { card: 'uuid', outcome: 'accepted' },
    });
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  // ── Demo-mode non-inheritance (Phase A inventory #13) ──────────────────

  it('DEMO_MODE=true does NOT bypass tenant resolution', async () => {
    const orig = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';
    try {
      const req = makeReq({ body: { context: { patientId: 'fhir-x' } } });
      const res = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      await cdsHooksAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ cards: [] });
      expect(lastAuditCall().action).toBe('CDS_HOOKS_NO_TENANT_RESOLVED');
    } finally {
      process.env.DEMO_MODE = orig;
    }
  });

  // ── Audit log identity for CDS Hooks events ────────────────────────────

  it('Audit log entries use system:cds-hooks identity (not anonymous)', async () => {
    const req = makeReq({ body: { context: { patientId: 'fhir-x' } } });
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await cdsHooksAuth(req, res, next);

    const auditCall = writeAuditLog.mock.calls[0];
    const auditReq = auditCall[0] as Request & { user?: { userId: string; email: string; role: string } };
    expect(auditReq.user?.userId).toBe('system:cds-hooks');
    expect(auditReq.user?.role).toBe('SYSTEM');
  });

  // ── HIPAA-grade promotion verification ────────────────────────────────

  it('Audit failure throws when writeAuditLog throws (HIPAA-grade DB write must propagate)', async () => {
    writeAuditLog.mockRejectedValueOnce(
      new Error('Audit DB write failed for HIPAA-grade event: CDS_HOOKS_NO_TENANT_RESOLVED'),
    );
    const req = makeReq({ body: {} });
    const res = makeRes();
    const next = jest.fn() as unknown as NextFunction;

    await expect(cdsHooksAuth(req, res, next)).rejects.toThrow(/HIPAA-grade/);
  });
});
