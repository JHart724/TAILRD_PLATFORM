/**
 * AUDIT-071 — cdsHooks handler integration tests.
 *
 * Mock-based unit tests verifying mandatory tenant filter post-mitigation.
 * Sister to `cdsHooksAuth.test.ts` (which tests the middleware itself); this
 * file verifies that handlers consume `req.cdsHooks` correctly + emit
 * mandatory `where: { hospitalId: ctx.hospitalId, ... }` clauses.
 *
 * Tests:
 *   - Mandatory tenant filter in tailrd-cardiovascular-gaps handler
 *   - Mandatory tenant filter in tailrd-discharge-gaps handler
 *   - cdsHooksSession.create fix-by-construction (line 163 hospitalId
 *     inherited from resolved patient, which is tenant-scoped by mandatory filter)
 *   - requireCdsHooksContext defense-in-depth (middleware-bypass simulation)
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const patientFindFirst = jest.fn();
const therapyGapFindMany = jest.fn().mockResolvedValue([]);
const cdsHooksSessionCreate = jest.fn().mockResolvedValue({ id: 'session-id' });
const writeAuditLog = jest.fn().mockResolvedValue(undefined);

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: { findFirst: (...args: unknown[]) => patientFindFirst(...args) },
    therapyGap: { findMany: (...args: unknown[]) => therapyGapFindMany(...args) },
    cdsHooksSession: { create: (...args: unknown[]) => cdsHooksSessionCreate(...args) },
  },
}));

jest.mock('../../middleware/auditLogger', () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...args),
  auditLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import type { Request, Response } from 'express';

// ── Helpers ────────────────────────────────────────────────────────────────

const TEST_HOSPITAL_ID = 'hospital-test-id';
const TEST_PATIENT_FHIR_ID = 'fhir-patient-test';
const TEST_PATIENT_ID = 'patient-test-id';

interface CdsHooksReq extends Request {
  cdsHooks?: { hospitalId: string; issuerUrl: string; ehrIssuerId: string };
}

function makeReq(opts: { skipCtx?: boolean; hookPath?: string } = {}): CdsHooksReq {
  const req: CdsHooksReq = {
    method: 'POST',
    path: opts.hookPath || '/tailrd-cardiovascular-gaps',
    headers: {},
    body: {
      fhirAuthorization: { subject: 'https://fhir.epic.com/test' },
      context: { patientId: TEST_PATIENT_FHIR_ID },
    },
  } as unknown as CdsHooksReq;
  if (!opts.skipCtx) {
    req.cdsHooks = {
      hospitalId: TEST_HOSPITAL_ID,
      issuerUrl: 'https://fhir.epic.com/test',
      ehrIssuerId: 'ehr-issuer-test',
    };
  }
  return req;
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
 * Extract the route handler function from the cdsHooks Router for a given
 * method+path. Avoids needing supertest for request handling.
 */
function getHandler(method: 'post' | 'get', path: string): (req: Request, res: Response) => Promise<void> {
  const router = require('../cdsHooks').default;
  for (const layer of router.stack) {
    const route = layer.route;
    if (!route) continue;
    if (route.path === path && route.methods[method]) {
      return route.stack[route.stack.length - 1].handle;
    }
  }
  throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  patientFindFirst.mockResolvedValue({
    id: TEST_PATIENT_ID,
    hospitalId: TEST_HOSPITAL_ID,
    fhirPatientId: TEST_PATIENT_FHIR_ID,
  });
});

describe('cdsHooks handlers — AUDIT-071 mandatory tenant filter', () => {
  // ── Mandatory tenant filter — cardiovascular-gaps ──────────────────────

  it('tailrd-cardiovascular-gaps: prisma.patient.findFirst called with mandatory hospitalId from req.cdsHooks', async () => {
    const handler = getHandler('post', '/tailrd-cardiovascular-gaps');
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    expect(patientFindFirst).toHaveBeenCalledWith({
      where: {
        fhirPatientId: TEST_PATIENT_FHIR_ID,
        hospitalId: TEST_HOSPITAL_ID,
        isActive: true,
      },
    });
    // Mandatory pattern — no permissive fallback. The where clause is fully scoped.
    const where = patientFindFirst.mock.calls[0][0].where;
    expect(where.hospitalId).toBe(TEST_HOSPITAL_ID);
    expect(where.hospitalId).not.toBeUndefined();
  });

  // ── Mandatory tenant filter — discharge-gaps ────────────────────────────

  it('tailrd-discharge-gaps: prisma.patient.findFirst called with mandatory hospitalId from req.cdsHooks', async () => {
    const handler = getHandler('post', '/tailrd-discharge-gaps');
    const req = makeReq({ hookPath: '/tailrd-discharge-gaps' });
    const res = makeRes();

    await handler(req, res);

    expect(patientFindFirst).toHaveBeenCalledWith({
      where: {
        fhirPatientId: TEST_PATIENT_FHIR_ID,
        hospitalId: TEST_HOSPITAL_ID,
        isActive: true,
      },
    });
  });

  // ── cdsHooksSession.create fix-by-construction ─────────────────────────

  it('cdsHooksSession.create fix-by-construction: session.hospitalId === ctx.hospitalId (matches resolved patient.hospitalId)', async () => {
    const handler = getHandler('post', '/tailrd-cardiovascular-gaps');
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    // The session record's hospitalId should match the resolved patient,
    // which (post-mandatory-filter) is structurally the same as ctx.hospitalId.
    expect(cdsHooksSessionCreate).toHaveBeenCalled();
    const sessionData = cdsHooksSessionCreate.mock.calls[0][0].data;
    expect(sessionData.hospitalId).toBe(TEST_HOSPITAL_ID);
    // Also verify the patient is correctly tenant-scoped
    const patientWhere = patientFindFirst.mock.calls[0][0].where;
    expect(sessionData.hospitalId).toBe(patientWhere.hospitalId);
  });

  // ── Defense-in-depth: middleware-bypass simulation ─────────────────────

  it('requireCdsHooksContext: handler short-circuits with 200 + empty cards when req.cdsHooks is missing (middleware bypass)', async () => {
    const handler = getHandler('post', '/tailrd-cardiovascular-gaps');
    const req = makeReq({ skipCtx: true }); // No req.cdsHooks
    const res = makeRes();

    await handler(req, res);

    // Should return empty cards without ever doing patient lookup
    expect(res.json).toHaveBeenCalledWith({ cards: [] });
    expect(patientFindFirst).not.toHaveBeenCalled();
    expect(cdsHooksSessionCreate).not.toHaveBeenCalled();

    // Audit log fires for cross-tenant attempt blocked (defense-in-depth signal)
    const auditCalls = writeAuditLog.mock.calls;
    expect(auditCalls.length).toBeGreaterThan(0);
    expect(auditCalls[0][1]).toBe('CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED');
  });

  it('requireCdsHooksContext: discharge-gaps handler also short-circuits without ctx', async () => {
    const handler = getHandler('post', '/tailrd-discharge-gaps');
    const req = makeReq({ skipCtx: true, hookPath: '/tailrd-discharge-gaps' });
    const res = makeRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ cards: [] });
    expect(patientFindFirst).not.toHaveBeenCalled();
  });
});
