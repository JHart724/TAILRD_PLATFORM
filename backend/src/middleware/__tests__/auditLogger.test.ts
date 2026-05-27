/**
 * AUDIT-001 Tier A coverage extension for backend/src/middleware/auditLogger.ts
 * (P1.AUDIT-001.C file 3 of 7).
 *
 * 11 axes (a-k) / 58 test invocations / NEW file (no prior test coverage).
 *
 * Per V.5-RECOVERY discipline + Q-C.C1 Path (b) comprehensive lock:
 *   - Axis (b) HIPAA_GRADE_ACTIONS exhaustive via test.each (27 entries) per
 *     HIPAA Security Rule 164.312(b) audit-control evidence trail.
 *   - Sister-precedent: auth.test.ts buildReq + phiEncryption.test.ts axis (j)
 *     parameterized pattern.
 *
 * Mock policy (NOVEL infrastructure scope LOCKED):
 *   - jest.mock prisma     -> auditLog.create capture + failure simulation
 *   - jest.mock phiRedaction -> redactPHIFragments isolation (signature only)
 *   - jest.spyOn auditLogger.info / auditLogger.error -> transport capture
 *     without filesystem writes
 *   - NOT mocked: winston (preserves axis k transport-configuration assertions)
 *   - NOT mocked: auditLogger module itself (sister catch #47 root cause -
 *     cdsHooksAuth.test.ts mocks auditLogger preventing transitive coverage;
 *     this NEW test MUST use REAL execution)
 */
import type { Request } from 'express';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../utils/phiRedaction', () => ({
  __esModule: true,
  redactPHIFragments: jest.fn((input: string) => `REDACTED:${input}`),
}));

import prisma from '../../lib/prisma';
import { redactPHIFragments } from '../../utils/phiRedaction';
import { writeAuditLog, auditLogger } from '../auditLogger';

const mockCreate = (prisma as any).auditLog.create as jest.Mock;
const mockRedact = redactPHIFragments as jest.Mock;

let infoSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

function buildReq(overrides: any = {}): Request {
  return {
    headers: {},
    params: {},
    query: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

function buildAuthReq(
  userOverrides: any = {},
  reqOverrides: any = {},
): Request {
  const defaultUser = {
    userId: 'user-123',
    email: 'user@example.com',
    role: 'PHYSICIAN',
    hospitalId: 'hosp-1',
    hospitalName: 'Test Hospital',
    permissions: {},
    iat: 0,
    exp: 0,
  };
  const user = { ...defaultUser, ...userOverrides };
  return {
    headers: {},
    params: {},
    query: {},
    socket: { remoteAddress: '10.0.0.1' },
    user,
    ...reqOverrides,
  } as unknown as Request;
}

beforeEach(() => {
  mockCreate.mockReset().mockResolvedValue({ id: 'log-1' });
  mockRedact.mockReset().mockImplementation((input: string) => `REDACTED:${input}`);
  infoSpy = jest.spyOn(auditLogger, 'info').mockImplementation(() => auditLogger as any);
  errorSpy = jest.spyOn(auditLogger, 'error').mockImplementation(() => auditLogger as any);
});

afterEach(() => {
  infoSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('auditLogger - AUDIT-001 Tier A coverage extension', () => {
  // ==================================================================
  // Axis (a): writeAuditLog happy path
  // ==================================================================
  describe('(a) writeAuditLog happy path', () => {
    it('a.1: entry shape includes timestamp, userId, userEmail, userRole, hospitalId, action, resourceType, resourceId, ipAddress, description', async () => {
      await writeAuditLog(
        buildAuthReq(),
        'PHI_VIEW',
        'Patient',
        'pat-1',
        'view-encounter',
      );
      expect(infoSpy).toHaveBeenCalledTimes(1);
      const entry = infoSpy.mock.calls[0][1];
      expect(entry).toEqual(
        expect.objectContaining({
          timestamp: expect.any(String),
          userId: 'user-123',
          userEmail: 'user@example.com',
          userRole: 'PHYSICIAN',
          hospitalId: 'hosp-1',
          action: 'PHI_VIEW',
          resourceType: 'Patient',
          resourceId: 'pat-1',
          ipAddress: '10.0.0.1',
          description: 'REDACTED:view-encounter',
        }),
      );
    });

    it('a.2: AuditEntry field invariants - action + resourceType persisted verbatim; resourceId + description nullable', async () => {
      await writeAuditLog(buildAuthReq(), 'LOGOUT', 'Session', null, null);
      const entry = infoSpy.mock.calls[0][1];
      expect(entry.action).toBe('LOGOUT');
      expect(entry.resourceType).toBe('Session');
      expect(entry.resourceId).toBeNull();
      expect(entry.description).toBeNull();
    });

    it('a.3: transport invocation - auditLogger.info called with literal "audit_event" tag + entry object', async () => {
      await writeAuditLog(buildAuthReq(), 'LOGIN_SUCCESS', 'Session', 'sess-1', 'login');
      expect(infoSpy).toHaveBeenCalledWith('audit_event', expect.any(Object));
    });

    it('a.4: DB write success - prisma.auditLog.create invoked exactly once and writeAuditLog resolves', async () => {
      await expect(
        writeAuditLog(buildAuthReq(), 'PHI_VIEW', 'Patient', 'pat-1', 'view'),
      ).resolves.toBeUndefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  // ==================================================================
  // Axis (b): HIPAA_GRADE_ACTIONS exhaustive (27 parameterized;
  // HIPAA Security Rule 164.312(b) audit-control evidence trail)
  // ==================================================================
  describe('(b) HIPAA_GRADE_ACTIONS exhaustive throw-on-DB-failure', () => {
    const HIPAA_GRADE_ACTIONS = [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PHI_VIEW',
      'PHI_EXPORT',
      'PATIENT_CREATED',
      'PATIENT_UPDATED',
      'PATIENT_DELETED',
      'BREACH_DATA_ACCESSED',
      'BREACH_DATA_MODIFIED',
      'CDS_HOOKS_JWT_VALIDATION_FAILURE',
      'CDS_HOOKS_UNMAPPED_ISSUER',
      'CDS_HOOKS_CROSS_TENANT_ATTEMPT_BLOCKED',
      'CDS_HOOKS_NO_TENANT_RESOLVED',
      'KMS_KEY_VALIDATION_FAILURE',
      'KMS_ENVELOPE_DECRYPT_FAILURE',
      'TENANT_GUARD_VIOLATION',
      'BREACH_CE_NOTIFIED',
      'BREACH_CE_ACKNOWLEDGED',
      'BREACH_CE_FOLLOWUP_REQUESTED',
      'BREACH_CE_FOLLOWUP_RESPONDED',
      'BAA_EXECUTION_RECORDED',
      'BAA_EXECUTION_REVOKED',
      'SIGNED_BAA_UPLOADED',
      'SIGNED_BAA_RETRIEVED',
      'PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED',
      'HOSPITAL_BAA_CACHE_UPDATED',
    ];

    test.each(HIPAA_GRADE_ACTIONS)(
      'b: HIPAA-grade action %s throws when prisma.auditLog.create rejects',
      async (action) => {
        mockCreate.mockRejectedValueOnce(new Error('db down'));
        await expect(
          writeAuditLog(buildAuthReq(), action, 'Resource', 'r-1', 'desc'),
        ).rejects.toThrow(
          new RegExp(`Audit DB write failed for HIPAA-grade event: ${action}`),
        );
      },
    );
  });

  // ==================================================================
  // Axis (c): Non-HIPAA action DB-failure swallow
  // ==================================================================
  describe('(c) Non-HIPAA action DB-failure swallow', () => {
    it('c.1: throw NOT raised; auditLogger.error emitted with hipaaGrade=false', async () => {
      mockCreate.mockRejectedValueOnce(new Error('db down'));
      await expect(
        writeAuditLog(buildAuthReq(), 'NON_HIPAA_INFO_EVENT', 'Resource', 'r-1', 'desc'),
      ).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        'audit_db_write_failed',
        expect.objectContaining({ hipaaGrade: false }),
      );
    });

    it('c.2: happy continuation - writeAuditLog returns void on non-HIPAA swallow', async () => {
      mockCreate.mockRejectedValueOnce(new Error('db down'));
      const result = await writeAuditLog(
        buildAuthReq(),
        'ARBITRARY_EVENT',
        'Resource',
        'r-1',
        'desc',
      );
      expect(result).toBeUndefined();
    });
  });

  // ==================================================================
  // Axis (d): getClientIp branch coverage
  // ==================================================================
  describe('(d) getClientIp branch coverage', () => {
    it('d.1: X-Forwarded-For string - first comma-separated value, trimmed', async () => {
      const req = buildAuthReq({}, {
        headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
      });
      await writeAuditLog(req, 'LOGIN_SUCCESS', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].ipAddress).toBe('203.0.113.7');
    });

    it('d.2: X-Forwarded-For Array - first element, first comma-separated value, trimmed', async () => {
      const req = buildAuthReq({}, {
        headers: { 'x-forwarded-for': ['198.51.100.4, 10.0.0.2', '198.51.100.5'] },
      });
      await writeAuditLog(req, 'LOGIN_SUCCESS', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].ipAddress).toBe('198.51.100.4');
    });

    it('d.3: socket.remoteAddress fallback when no X-Forwarded-For header', async () => {
      const req = buildAuthReq({}, {
        headers: {},
        socket: { remoteAddress: '192.0.2.55' },
      });
      await writeAuditLog(req, 'LOGIN_SUCCESS', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].ipAddress).toBe('192.0.2.55');
    });

    it("d.4: 'unknown' fallback when neither X-Forwarded-For nor socket.remoteAddress present", async () => {
      const req = buildAuthReq({}, { headers: {}, socket: {} });
      await writeAuditLog(req, 'LOGIN_SUCCESS', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].ipAddress).toBe('unknown');
    });
  });

  // ==================================================================
  // Axis (e): AuthenticatedRequest null-safe fallbacks
  // ==================================================================
  describe('(e) AuthenticatedRequest null-safe fallbacks', () => {
    it("e.1: no user on req -> userId defaults to 'anonymous'", async () => {
      await writeAuditLog(buildReq(), 'LOGIN_FAILED', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].userId).toBe('anonymous');
    });

    it("e.2: user present without email -> userEmail defaults to 'unknown'", async () => {
      const req = buildAuthReq({ email: undefined });
      await writeAuditLog(req, 'LOGIN_FAILED', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].userEmail).toBe('unknown');
    });

    it("e.3: user present without role -> userRole defaults to 'unknown'", async () => {
      const req = buildAuthReq({ role: undefined });
      await writeAuditLog(req, 'LOGIN_FAILED', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].userRole).toBe('unknown');
    });

    it('e.4: user present with hospitalId null -> entry.hospitalId persisted as null via ?? nullish coalesce', async () => {
      const req = buildAuthReq({ hospitalId: null });
      await writeAuditLog(req, 'LOGIN_FAILED', 'Session', null, null);
      expect(infoSpy.mock.calls[0][1].hospitalId).toBeNull();
    });
  });

  // ==================================================================
  // Axis (f): redactPHIFragments integration
  // ==================================================================
  describe('(f) redactPHIFragments integration', () => {
    it('f.1: PHI-containing description routed through redactPHIFragments before persist', async () => {
      await writeAuditLog(buildAuthReq(), 'PHI_VIEW', 'Patient', 'p1', 'patient John Doe');
      expect(mockRedact).toHaveBeenCalledWith('patient John Doe');
      expect(infoSpy.mock.calls[0][1].description).toBe('REDACTED:patient John Doe');
    });

    it('f.2: null description bypasses redactPHIFragments (no invocation)', async () => {
      await writeAuditLog(buildAuthReq(), 'PHI_VIEW', 'Patient', 'p1', null);
      expect(mockRedact).not.toHaveBeenCalled();
      expect(infoSpy.mock.calls[0][1].description).toBeNull();
    });

    it('f.3: invocation signature - redactPHIFragments called with description string only (single arg)', async () => {
      await writeAuditLog(buildAuthReq(), 'PHI_VIEW', 'Patient', 'p1', 'desc-only');
      expect(mockRedact).toHaveBeenCalledTimes(1);
      expect(mockRedact.mock.calls[0]).toHaveLength(1);
      expect(mockRedact.mock.calls[0][0]).toBe('desc-only');
    });
  });

  // ==================================================================
  // Axis (g): DB-write success path
  // ==================================================================
  describe('(g) DB-write success path', () => {
    it('g.1: prisma.auditLog.create invoked with __tenantGuardBypass: true marker', async () => {
      await writeAuditLog(buildAuthReq(), 'PHI_VIEW', 'Patient', 'p1', 'desc');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ __tenantGuardBypass: true }),
      );
    });

    it('g.2: entry data shape mirror - create.data fields align with AuditEntry fields', async () => {
      await writeAuditLog(buildAuthReq(), 'LOGIN_SUCCESS', 'Session', 'sess-1', 'login');
      const args = mockCreate.mock.calls[0][0];
      expect(args.data).toEqual(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          resourceType: 'Session',
          resourceId: 'sess-1',
          userId: 'user-123',
          userEmail: 'user@example.com',
          userRole: 'PHYSICIAN',
          hospitalId: 'hosp-1',
          ipAddress: '10.0.0.1',
        }),
      );
    });

    it('g.3: hospitalId nullable persisted to DB when no user on req (AUDIT-011 LEGITIMATE_BYPASS path)', async () => {
      await writeAuditLog(buildReq(), 'LOGIN_FAILED', 'Session', null, null);
      const args = mockCreate.mock.calls[0][0];
      expect(args.data.hospitalId).toBeNull();
    });
  });

  // ==================================================================
  // Axis (h): DB-write failure error logging
  // ==================================================================
  describe('(h) DB-write failure error logging', () => {
    it("h.1: auditLogger.error called with 'audit_db_write_failed' event tag", async () => {
      mockCreate.mockRejectedValueOnce(new Error('db down'));
      await writeAuditLog(buildAuthReq(), 'NON_HIPAA', 'Resource', 'r1', 'd');
      expect(errorSpy).toHaveBeenCalledWith('audit_db_write_failed', expect.any(Object));
    });

    it('h.2: Error instance message captured; non-Error value stringified', async () => {
      mockCreate.mockRejectedValueOnce(new Error('boom'));
      await writeAuditLog(buildAuthReq(), 'NON_HIPAA', 'Resource', 'r1', 'd');
      expect(errorSpy.mock.calls[0][1].error).toBe('boom');

      errorSpy.mockClear();
      mockCreate.mockRejectedValueOnce('string-throw');
      await writeAuditLog(buildAuthReq(), 'NON_HIPAA', 'Resource', 'r1', 'd');
      expect(errorSpy.mock.calls[0][1].error).toBe('string-throw');
    });

    it('h.3: hipaaGrade boolean flag + originalEntry payload preserved in error context (HIPAA-graded path)', async () => {
      mockCreate.mockRejectedValueOnce(new Error('db down'));
      try {
        await writeAuditLog(buildAuthReq(), 'PHI_VIEW', 'Patient', 'p1', 'desc');
      } catch {
        // PHI_VIEW is HIPAA-graded; throw expected
      }
      const ctx = errorSpy.mock.calls[0][1];
      expect(ctx.hipaaGrade).toBe(true);
      expect(ctx.originalEntry).toEqual(
        expect.objectContaining({
          action: 'PHI_VIEW',
          resourceType: 'Patient',
          resourceId: 'p1',
        }),
      );
    });
  });

  // ==================================================================
  // Axis (i): timestamp ISO 8601 format invariant + monotonic ordering
  // ==================================================================
  describe('(i) AuditEntry timestamp ISO 8601 + monotonic ordering', () => {
    it('i.1: timestamp matches ISO 8601 pattern (YYYY-MM-DDTHH:mm:ss.sssZ)', async () => {
      await writeAuditLog(buildAuthReq(), 'LOGIN_SUCCESS', 'Session', null, null);
      const ts = infoSpy.mock.calls[0][1].timestamp;
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('i.2: monotonic ordering across two consecutive writes', async () => {
      await writeAuditLog(buildAuthReq(), 'LOGIN_SUCCESS', 'Session', null, null);
      await new Promise((resolve) => setTimeout(resolve, 5));
      await writeAuditLog(buildAuthReq(), 'LOGOUT', 'Session', null, null);
      const t1 = Date.parse(infoSpy.mock.calls[0][1].timestamp);
      const t2 = Date.parse(infoSpy.mock.calls[1][1].timestamp);
      expect(t2).toBeGreaterThanOrEqual(t1);
    });
  });

  // ==================================================================
  // Axis (j): previousValues + newValues defaults + pass-through
  // ==================================================================
  describe('(j) previousValues + newValues defaults + pass-through', () => {
    it('j.1: undefined previousValues + newValues -> null defaults via || fallback', async () => {
      await writeAuditLog(buildAuthReq(), 'LOGIN_SUCCESS', 'Session', null, null);
      const entry = infoSpy.mock.calls[0][1];
      expect(entry.previousValues).toBeNull();
      expect(entry.newValues).toBeNull();
    });

    it('j.2: non-null previousValues + newValues passed through verbatim', async () => {
      const prev = { status: 'active' };
      const next = { status: 'inactive' };
      await writeAuditLog(
        buildAuthReq(),
        'PATIENT_UPDATED',
        'Patient',
        'p1',
        'status change',
        prev,
        next,
      );
      const entry = infoSpy.mock.calls[0][1];
      expect(entry.previousValues).toEqual(prev);
      expect(entry.newValues).toEqual(next);
    });

    it('j.3: nested JSON-castable shapes preserved (arrays + nested objects) to prisma create.data', async () => {
      const prev = { meds: ['carvedilol', 'lisinopril'], dose: { value: 25, unit: 'mg' } };
      const next = { meds: ['metoprolol'], dose: { value: 50, unit: 'mg' } };
      await writeAuditLog(
        buildAuthReq(),
        'PATIENT_UPDATED',
        'Patient',
        'p1',
        'med change',
        prev,
        next,
      );
      const args = mockCreate.mock.calls[0][0];
      expect(args.data.previousValues).toEqual(prev);
      expect(args.data.newValues).toEqual(next);
    });
  });

  // ==================================================================
  // Axis (k): auditLogger Logger instance shape (module-level
  // introspection without filesystem writes)
  // ==================================================================
  describe('(k) auditLogger Logger instance shape', () => {
    it("k.1: level 'info' + defaultMeta service 'tailrd-audit'", () => {
      expect(auditLogger.level).toBe('info');
      expect((auditLogger as any).defaultMeta).toEqual({ service: 'tailrd-audit' });
    });

    it('k.2: dual-transport array (file/rotate + Console) per AUDIT-013 remediation', () => {
      const transports = (auditLogger as any).transports;
      expect(Array.isArray(transports)).toBe(true);
      expect(transports.length).toBe(2);
    });

    it('k.3: exitOnError false (audit logs must persist; never exit on uncaught)', () => {
      expect((auditLogger as any).exitOnError).toBe(false);
    });
  });
});
