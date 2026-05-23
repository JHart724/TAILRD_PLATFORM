/**
 * prismaBaaGuard (5-ADM-09 P1.3.3c IMPLEMENT-2C) Layer 3 BAA-execution guard
 * integration-style unit tests.
 *
 * Covers:
 *   - parseBaaGuardMode / hasBaaBypassMarker / extractHospitalIdFromWhere pure
 *     helpers (default-resolution + error path + where-shape branches).
 *   - applyPrismaBaaGuard $extends middleware: BAA_GUARD_MODE three-mode
 *     enforcement (off / audit / strict) + HIPAA_GRADE_TENANT_MODELS allow-list
 *     reuse + __baaGuardBypass marker + __tenantGuardBypass marker honored +
 *     PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED audit emission shape + cached
 *     Hospital.baaExecuted lookup mechanic (TTL-bounded; tx-scoped cache reset).
 *
 * Locked Q-decision provenance:
 *   Q-5ADM-B Path (c) Layer 3 Prisma extension at ORM layer for most-robust
 *   PHI-flow gating posture. Q-5ADM-C single-source-of-truth (Hospital cache
 *   is derived; this guard reads cache only). Q-5ADM-M Path A per-service-file
 *   test suite (file 3 of 3; final). Q-5ADM-T Path A 5-block decomposition.
 *
 * Sister-precedent:
 *   - IMPLEMENT-2A coveredEntityBaaExecution.test.ts (jest.fn closures + jest.mock
 *     module pattern + sister-identifier discipline h-test-N + tenant-test-a).
 *   - IMPLEMENT-2B baaDocumentService.test.ts (same closure + module-mock
 *     pattern; multi-service mock surface composition).
 *   - audit-011-cross-tenant.test.ts setMode helper pattern (process.env mutation
 *     + _resetGuardModeCacheForTests reset).
 *   - prismaTenantGuard.ts sister Layer 3 wrapper (this file's PHI-gating
 *     companion); IMPLEMENT-2C tests the same $extends callback-capture
 *     pattern in semi-integration style (mocked $extends + direct middleware
 *     invocation) rather than the RUN_INTEGRATION_TESTS-gated real-DB style.
 *
 * V.5-RECOVERY catches surfaced at PAUSE A.IMPLEMENT-2C (brief authoring-spec
 * vs running code at commit 81dbea4):
 *   - catch #19: brief implied default-mode was off; running code defaults to
 *     'audit' when env unset/empty (prismaBaaGuard.ts line 169). Tests now
 *     align with default='audit' semantics.
 *   - catch #20: brief omitted that __tenantGuardBypass marker ALSO bypasses
 *     BAA guard (prismaBaaGuard.ts line 403). Tests cover both bypass paths.
 *   - catch #21: brief did not specify strip-bypass-marker semantics; running
 *     code strips __baaGuardBypass from args before query() call (lines
 *     360-366). Tests assert query() receives cleaned args.
 *   - catch #22: BAANotExecutedError constructor signature confirmed as
 *     (hospitalId, { model, operation }) per coveredEntityService.ts line 127.
 *
 * Synthetic-data discipline: synthetic hospital ids only (h-test-N); no real
 * PHI patterns; no realistic MRN / SSN / patient-name strings in fixtures.
 */

// === Mocks ===

const auditLoggerError = jest.fn();
const auditLoggerInfo = jest.fn();
const auditLoggerWarn = jest.fn();

jest.mock('../middleware/auditLogger', () => ({
  auditLogger: {
    error: (...args: unknown[]) => auditLoggerError(...args),
    info: (...args: unknown[]) => auditLoggerInfo(...args),
    warn: (...args: unknown[]) => auditLoggerWarn(...args),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  applyPrismaBaaGuard,
  parseBaaGuardMode,
  hasBaaBypassMarker,
  extractHospitalIdFromWhere,
  validateBaaGuardModeOrThrow,
  BaaGuardConfigError,
  BAA_GUARD_BYPASS_KEY,
  _resetBaaGuardModeCacheForTests,
  _resetBaaCacheForTests,
} from '../lib/prismaBaaGuard';
import { BAANotExecutedError } from '../services/coveredEntityService';
import { HIPAA_GRADE_TENANT_MODELS } from '../lib/prismaTenantGuard';

// === Helpers ===

const HOSPITAL_1 = 'h-test-1';
const HOSPITAL_2 = 'h-test-2';

/**
 * Build a mock Prisma client that captures the $extends middleware callback
 * registered by applyPrismaBaaGuard. The captured callback is invoked
 * directly with synthetic ({ args, model, operation, query }) params so
 * middleware logic is exercised in isolation without a real Prisma engine.
 *
 * The mock $extends returns the same prisma object so the readBaaExecutedCached
 * lookup (prisma.hospital.findUnique) routes back through the same closures
 * the tests assert against.
 */
type MiddlewareFn = (params: {
  args: unknown;
  model: string;
  operation: string;
  query: (args: unknown) => Promise<unknown>;
}) => Promise<unknown>;

function buildMockPrisma(): {
  prisma: unknown;
  capturedMiddleware: { fn: MiddlewareFn | null };
  hospitalFindUnique: jest.Mock;
} {
  const hospitalFindUnique = jest.fn();
  const capturedMiddleware: { fn: MiddlewareFn | null } = { fn: null };

  const prisma: Record<string, unknown> = {
    hospital: { findUnique: hospitalFindUnique },
  };
  prisma.$extends = (config: {
    query: { $allModels: { $allOperations: MiddlewareFn } };
  }): unknown => {
    capturedMiddleware.fn = config.query.$allModels.$allOperations;
    return prisma;
  };

  return { prisma, capturedMiddleware, hospitalFindUnique };
}

/**
 * Reset env + module-level mode cache + Hospital BAA cache between tests.
 * Sister-precedent: audit-011-cross-tenant.test.ts setMode helper, adapted
 * for jest beforeEach lifecycle (no async DB ops here).
 */
function resetGuardState(mode?: 'off' | 'audit' | 'strict'): void {
  if (mode === undefined) {
    delete process.env.BAA_GUARD_MODE;
  } else {
    process.env.BAA_GUARD_MODE = mode;
  }
  _resetBaaGuardModeCacheForTests();
  _resetBaaCacheForTests();
}

beforeEach(() => {
  jest.clearAllMocks();
  resetGuardState('audit');
});

afterEach(() => {
  resetGuardState();
});

// === Pure helpers ===

describe('parseBaaGuardMode (pure helper)', () => {
  it('returns audit when env is undefined (robustness-first default)', () => {
    expect(parseBaaGuardMode(undefined)).toBe('audit');
  });

  it('returns audit when env is empty string', () => {
    expect(parseBaaGuardMode('')).toBe('audit');
  });

  it('returns off when env is off', () => {
    expect(parseBaaGuardMode('off')).toBe('off');
  });

  it('returns audit when env is audit', () => {
    expect(parseBaaGuardMode('audit')).toBe('audit');
  });

  it('returns strict when env is strict', () => {
    expect(parseBaaGuardMode('strict')).toBe('strict');
  });

  it('throws BaaGuardConfigError on invalid env value (fail-fast at module init)', () => {
    expect(() => parseBaaGuardMode('disabled')).toThrow(BaaGuardConfigError);
    expect(() => parseBaaGuardMode('STRICT')).toThrow(BaaGuardConfigError);
    expect(() => parseBaaGuardMode('1')).toThrow(BaaGuardConfigError);
  });

  it('validateBaaGuardModeOrThrow reads from process.env by default', () => {
    process.env.BAA_GUARD_MODE = 'strict';
    expect(validateBaaGuardModeOrThrow()).toBe('strict');
  });
});

describe('hasBaaBypassMarker (pure helper)', () => {
  it('returns true when args carry __baaGuardBypass: true', () => {
    expect(hasBaaBypassMarker({ [BAA_GUARD_BYPASS_KEY]: true })).toBe(true);
  });

  it('returns true when args carry __baaGuardBypass with any truthy value', () => {
    expect(hasBaaBypassMarker({ [BAA_GUARD_BYPASS_KEY]: 'yes' })).toBe(true);
  });

  it('returns false when args missing the bypass key', () => {
    expect(hasBaaBypassMarker({ where: { hospitalId: HOSPITAL_1 } })).toBe(false);
  });

  it('returns false when args explicitly set __baaGuardBypass: false (defensive)', () => {
    expect(hasBaaBypassMarker({ [BAA_GUARD_BYPASS_KEY]: false })).toBe(false);
  });

  it('returns false for null / undefined / non-object args', () => {
    expect(hasBaaBypassMarker(null)).toBe(false);
    expect(hasBaaBypassMarker(undefined)).toBe(false);
    expect(hasBaaBypassMarker('string')).toBe(false);
  });
});

describe('extractHospitalIdFromWhere (pure helper)', () => {
  it('extracts hospitalId from top-level where', () => {
    expect(extractHospitalIdFromWhere({ where: { hospitalId: HOSPITAL_1 } })).toBe(HOSPITAL_1);
  });

  it('extracts hospitalId from AND-array compound where', () => {
    expect(
      extractHospitalIdFromWhere({
        where: { AND: [{ id: 'x' }, { hospitalId: HOSPITAL_1 }] },
      }),
    ).toBe(HOSPITAL_1);
  });

  it('extracts hospitalId from AND-object compound where', () => {
    expect(
      extractHospitalIdFromWhere({ where: { AND: { hospitalId: HOSPITAL_1 } } }),
    ).toBe(HOSPITAL_1);
  });

  it('returns null when hospitalId is absent at all supported positions', () => {
    expect(extractHospitalIdFromWhere({ where: { id: 'only-id' } })).toBeNull();
    expect(extractHospitalIdFromWhere({ where: {} })).toBeNull();
    expect(extractHospitalIdFromWhere({})).toBeNull();
    expect(extractHospitalIdFromWhere(undefined)).toBeNull();
  });

  it('returns null when hospitalId value is non-string (defensive)', () => {
    expect(extractHospitalIdFromWhere({ where: { hospitalId: 123 } })).toBeNull();
    expect(extractHospitalIdFromWhere({ where: { hospitalId: null } })).toBeNull();
  });
});

// === Middleware behavior ===

describe('applyPrismaBaaGuard ($extends Layer 3 BAA enforcement)', () => {
  // ─── BAA_GUARD_MODE three-mode enforcement ──────────────────────────

  describe('BAA_GUARD_MODE three-mode enforcement', () => {
    it('mode off: BAA-not-executed PHI query proceeds without lookup or audit emission', async () => {
      resetGuardState('off');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ ok: true });

      const result = await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(result).toEqual({ ok: true });
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(hospitalFindUnique).not.toHaveBeenCalled();
      expect(auditLoggerError).not.toHaveBeenCalled();
    });

    it('mode audit: BAA-not-executed PHI query proceeds AND emits PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED audit', async () => {
      resetGuardState('audit');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ patients: [] });

      const result = await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(result).toEqual({ patients: [] });
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(auditLoggerError).toHaveBeenCalledTimes(1);
    });

    it('mode strict: BAA-not-executed PHI query throws BAANotExecutedError; query NOT invoked', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn();

      await expect(
        capturedMiddleware.fn!({
          args: { where: { hospitalId: HOSPITAL_1 } },
          model: 'Patient',
          operation: 'findFirst',
          query: queryFn,
        }),
      ).rejects.toBeInstanceOf(BAANotExecutedError);

      expect(queryFn).not.toHaveBeenCalled();
      expect(auditLoggerError).toHaveBeenCalledTimes(1);
    });

    it('mode audit with baaExecuted true: PHI query proceeds with no audit emission', async () => {
      resetGuardState('audit');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: true });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue([{ id: 'p-1' }]);

      const result = await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findMany',
        query: queryFn,
      });

      expect(result).toEqual([{ id: 'p-1' }]);
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(auditLoggerError).not.toHaveBeenCalled();
    });

    it('mode strict with baaExecuted true: PHI query proceeds; no throw, no audit', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: true });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ count: 5 });

      const result = await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'count',
        query: queryFn,
      });

      expect(result).toEqual({ count: 5 });
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(auditLoggerError).not.toHaveBeenCalled();
    });

    it('applyPrismaBaaGuard throws BaaGuardConfigError on invalid env at wire-up', () => {
      resetGuardState();
      process.env.BAA_GUARD_MODE = 'invalid-value';
      _resetBaaGuardModeCacheForTests();
      const { prisma } = buildMockPrisma();

      expect(() => applyPrismaBaaGuard(prisma as never)).toThrow(BaaGuardConfigError);
    });
  });

  // ─── HIPAA_GRADE_TENANT_MODELS allow-list ────────────────────────────

  describe('HIPAA_GRADE_TENANT_MODELS allow-list', () => {
    it('allow-list model (Patient) on enforced action: BAA cache lookup runs', async () => {
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: true });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ id: 'enc-1' });

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Encounter',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(hospitalFindUnique).toHaveBeenCalledTimes(1);
    });

    it('non-allow-list model (User): BAA guard skips; pass-through, no Hospital lookup', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ email: 'u@test.example' });

      const result = await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'User',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(result).toEqual({ email: 'u@test.example' });
      expect(hospitalFindUnique).not.toHaveBeenCalled();
      expect(auditLoggerError).not.toHaveBeenCalled();
    });

    it('33-model allow-list completeness preserved (sister-precedent HIPAA_GRADE_TENANT_MODELS)', () => {
      expect(HIPAA_GRADE_TENANT_MODELS.size).toBe(33);
      expect(HIPAA_GRADE_TENANT_MODELS.has('Patient')).toBe(true);
      expect(HIPAA_GRADE_TENANT_MODELS.has('Encounter')).toBe(true);
      expect(HIPAA_GRADE_TENANT_MODELS.has('Observation')).toBe(true);
      expect(HIPAA_GRADE_TENANT_MODELS.has('TherapyGap')).toBe(true);
      expect(HIPAA_GRADE_TENANT_MODELS.has('User')).toBe(false);
      expect(HIPAA_GRADE_TENANT_MODELS.has('Hospital')).toBe(false);
    });

    it('create action on allow-list model: skips BAA enforcement (bootstrap-safe)', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ id: 'new-rec' });

      await capturedMiddleware.fn!({
        args: { data: { hospitalId: HOSPITAL_1, firstName: 'synth' } },
        model: 'Patient',
        operation: 'create',
        query: queryFn,
      });

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(hospitalFindUnique).not.toHaveBeenCalled();
    });

    it('forward-compat: unknown operation not in ENFORCED_ACTIONS passes through', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue('raw');

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'someNewPrismaOperation',
        query: queryFn,
      });

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(hospitalFindUnique).not.toHaveBeenCalled();
    });
  });

  // ─── __baaGuardBypass marker ─────────────────────────────────────────

  describe('__baaGuardBypass marker', () => {
    it('bypass marker present: pass-through despite BAA-not-executed in strict mode', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ ok: true });

      const result = await capturedMiddleware.fn!({
        args: {
          where: { hospitalId: HOSPITAL_1 },
          [BAA_GUARD_BYPASS_KEY]: true,
        },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(result).toEqual({ ok: true });
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(auditLoggerError).not.toHaveBeenCalled();
    });

    it('bypass marker is stripped from args before query() call (Prisma 5.22 hygiene)', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({});

      await capturedMiddleware.fn!({
        args: {
          where: { hospitalId: HOSPITAL_1 },
          [BAA_GUARD_BYPASS_KEY]: true,
        },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      const cleanedArgs = queryFn.mock.calls[0][0] as Record<string, unknown>;
      expect(cleanedArgs).not.toHaveProperty(BAA_GUARD_BYPASS_KEY);
      expect(cleanedArgs).toHaveProperty('where');
    });

    it('__tenantGuardBypass marker also bypasses BAA guard (sister-marker alignment)', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({ ok: true });

      const result = await capturedMiddleware.fn!({
        args: {
          where: { hospitalId: HOSPITAL_1 },
          __tenantGuardBypass: true,
        },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(result).toEqual({ ok: true });
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(auditLoggerError).not.toHaveBeenCalled();
    });

    it('explicit __baaGuardBypass: false does NOT bypass (defensive contract)', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn();

      await expect(
        capturedMiddleware.fn!({
          args: {
            where: { hospitalId: HOSPITAL_1 },
            [BAA_GUARD_BYPASS_KEY]: false,
          },
          model: 'Patient',
          operation: 'findFirst',
          query: queryFn,
        }),
      ).rejects.toBeInstanceOf(BAANotExecutedError);
      expect(queryFn).not.toHaveBeenCalled();
    });
  });

  // ─── PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED audit emission ────────────────

  describe('PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED audit emission', () => {
    it('strict-mode violation emits audit event with action=PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn();

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Encounter',
        operation: 'update',
        query: queryFn,
      }).catch(() => { /* strict-mode throw expected */ });

      expect(auditLoggerError).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED',
          resourceType: 'Encounter',
          hospitalId: HOSPITAL_1,
        }),
      );
    });

    it('audit-mode violation emits same audit shape (action + resourceType + hospitalId)', async () => {
      resetGuardState('audit');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue([]);

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'TherapyGap',
        operation: 'findMany',
        query: queryFn,
      });

      expect(auditLoggerError).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'PHI_FLOW_BLOCKED_BAA_NOT_EXECUTED',
          resourceType: 'TherapyGap',
          hospitalId: HOSPITAL_1,
          userId: 'system:baa-guard',
          userRole: 'SYSTEM',
        }),
      );
    });

    it('audit payload includes full actor metadata (system attribution)', async () => {
      resetGuardState('audit');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({});

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_2 } },
        model: 'Observation',
        operation: 'findFirst',
        query: queryFn,
      });

      const auditCall = auditLoggerError.mock.calls[0];
      expect(auditCall[0]).toBe('audit_event');
      const payload = auditCall[1] as Record<string, unknown>;
      expect(payload.userId).toBe('system:baa-guard');
      expect(payload.userEmail).toBe('system@tailrd-heart.com');
      expect(payload.userRole).toBe('SYSTEM');
      expect(payload.hospitalId).toBe(HOSPITAL_2);
      expect(payload.timestamp).toEqual(expect.any(String));
    });

    it('no audit emission in off mode (extension inert)', async () => {
      resetGuardState('off');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({});

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(auditLoggerError).not.toHaveBeenCalled();
    });

    it('BAANotExecutedError carries hospitalId + model + operation context for forensic triage', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: false });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn();

      let captured: unknown = null;
      try {
        await capturedMiddleware.fn!({
          args: { where: { hospitalId: HOSPITAL_1 } },
          model: 'Alert',
          operation: 'delete',
          query: queryFn,
        });
      } catch (err) {
        captured = err;
      }

      expect(captured).toBeInstanceOf(BAANotExecutedError);
      const err = captured as BAANotExecutedError;
      expect(err.hospitalId).toBe(HOSPITAL_1);
      expect(err.model).toBe('Alert');
      expect(err.operation).toBe('delete');
      expect(err.code).toBe('BAA_NOT_EXECUTED');
    });
  });

  // ─── Cached Hospital.baaExecuted lookup ───────────────────────────────

  describe('cached Hospital.baaExecuted lookup', () => {
    it('cache hit within TTL: second lookup for same hospitalId skips DB roundtrip', async () => {
      resetGuardState('audit');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: true });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({});

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });
      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findMany',
        query: queryFn,
      });
      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Encounter',
        operation: 'count',
        query: queryFn,
      });

      expect(hospitalFindUnique).toHaveBeenCalledTimes(1);
      expect(queryFn).toHaveBeenCalledTimes(3);
    });

    it('separate hospitalIds maintain separate cache entries', async () => {
      resetGuardState('audit');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve({ baaExecuted: where.id === HOSPITAL_1 }),
      );
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({});

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });
      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_2 } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(hospitalFindUnique).toHaveBeenCalledTimes(2);
      expect(hospitalFindUnique).toHaveBeenNthCalledWith(1, {
        where: { id: HOSPITAL_1 },
        select: { baaExecuted: true },
      });
      expect(hospitalFindUnique).toHaveBeenNthCalledWith(2, {
        where: { id: HOSPITAL_2 },
        select: { baaExecuted: true },
      });
    });

    it('cache miss: Hospital.findUnique called with id + select shape per running code', async () => {
      resetGuardState('audit');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue({ baaExecuted: true });
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({});

      await capturedMiddleware.fn!({
        args: { where: { hospitalId: HOSPITAL_1 } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(hospitalFindUnique).toHaveBeenCalledWith({
        where: { id: HOSPITAL_1 },
        select: { baaExecuted: true },
      });
    });

    it('Hospital not found (findUnique returns null): treated as baaExecuted=false (fail-closed in strict)', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      hospitalFindUnique.mockResolvedValue(null);
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn();

      await expect(
        capturedMiddleware.fn!({
          args: { where: { hospitalId: HOSPITAL_1 } },
          model: 'Patient',
          operation: 'findFirst',
          query: queryFn,
        }),
      ).rejects.toBeInstanceOf(BAANotExecutedError);
      expect(queryFn).not.toHaveBeenCalled();
    });

    it('hospitalId absent from where: pass-through (tenant guard handles structural absence)', async () => {
      resetGuardState('strict');
      const { prisma, capturedMiddleware, hospitalFindUnique } = buildMockPrisma();
      applyPrismaBaaGuard(prisma as never);
      const queryFn = jest.fn().mockResolvedValue({});

      await capturedMiddleware.fn!({
        args: { where: { id: 'only-id' } },
        model: 'Patient',
        operation: 'findFirst',
        query: queryFn,
      });

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(hospitalFindUnique).not.toHaveBeenCalled();
      expect(auditLoggerError).not.toHaveBeenCalled();
    });
  });
});
