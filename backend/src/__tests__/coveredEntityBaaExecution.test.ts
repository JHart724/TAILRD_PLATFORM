/**
 * coveredEntityBaaExecution (5-ADM-09 P1.3.3c IMPLEMENT-2A) F1 + F2 unit tests.
 *
 * Covers:
 *   - F1 updateHospitalBaaCache: idempotent cache propagation + audit emission
 *     + tx-scope vs singleton-scope client + validation-error path.
 *   - F2 upsertCoveredEntityBaaExecution: RBAC + tenant-scope + CE-not-found +
 *     state-transition validation (InvalidBaaTransitionError + BAAExpiredError)
 *     + NULL/Date transitions (RECORDED + REVOKED audit routing) + idempotent
 *     skip + multi-hospital fan-out per-cardinality (Q-5ADM-R Path A) +
 *     transactional rollback on partial F1 failure.
 *
 * Locked Q-decision provenance:
 *   Q-5ADM-C single-source-of-truth (CoveredEntity owns authoritative BAA
 *   state; Hospital cache is derived). Q-5ADM-M Path A per-service-file test
 *   suite (this is file 1 of 3). Q-5ADM-R Path A per-cardinality fan-out
 *   coverage (0 / 1 / N>=3 / rollback). Q-5ADM-T Path A 5-block decomposition.
 *
 * Sister-precedent: PR #292 D10 coveredEntity.test.ts pattern. Same
 * jest.fn closure + jest.mock module pattern. No jest-mock-extended.
 *
 * V.5-RECOVERY divergence catches (surfaced at PAUSE A.IMPLEMENT-2A; tests
 * align with running code at commit 81dbea4, not brief speculation):
 *   - F1 hospital-not-found surfaces CoveredEntityValidationError('hospitalId',
 *     ...) per linkHospitalToCoveredEntity sister-precedent line 532. The
 *     HospitalBaaCacheStaleError class exists in the error hierarchy but is
 *     NOT thrown by F1; drift-detection cache-refresh is a future evolution.
 *   - F2 does not enforce baaExecutedAt future-date or baaDocumentUrl length.
 *     Validation surface is: baaExpiresAt > baaExecutedAt (InvalidBaaTransition
 *     Error) and baaExpiresAt >= Date.now() at write time (BAAExpiredError).
 *
 * Synthetic-data discipline: all identifiers are obviously-synthetic; zero
 * realistic PHI patterns (MRN-format / SSN-format / real-looking names).
 */

// === Mocks ===

const coveredEntityFindFirst = jest.fn();
const coveredEntityUpdate = jest.fn();
const hospitalFindUnique = jest.fn();
const hospitalFindFirst = jest.fn();
const hospitalFindMany = jest.fn();
const hospitalUpdate = jest.fn();
const prismaTransaction = jest.fn();
const writeAuditLog = jest.fn().mockResolvedValue(undefined);
const auditLoggerInfo = jest.fn();
const auditLoggerWarn = jest.fn();
const auditLoggerError = jest.fn();

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    coveredEntity: {
      findFirst: (...args: unknown[]) => coveredEntityFindFirst(...args),
      update: (...args: unknown[]) => coveredEntityUpdate(...args),
    },
    hospital: {
      findUnique: (...args: unknown[]) => hospitalFindUnique(...args),
      findFirst: (...args: unknown[]) => hospitalFindFirst(...args),
      findMany: (...args: unknown[]) => hospitalFindMany(...args),
      update: (...args: unknown[]) => hospitalUpdate(...args),
    },
    $transaction: (...args: unknown[]) => prismaTransaction(...args),
  },
}));

jest.mock('../middleware/auditLogger', () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...args),
  auditLogger: {
    info: (...args: unknown[]) => auditLoggerInfo(...args),
    warn: (...args: unknown[]) => auditLoggerWarn(...args),
    error: (...args: unknown[]) => auditLoggerError(...args),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  updateHospitalBaaCache,
  upsertCoveredEntityBaaExecution,
  CoveredEntityNotFoundError,
  TenantScopeViolationError,
  CoveredEntityAccessDeniedError,
  CoveredEntityValidationError,
  InvalidBaaTransitionError,
  BAAExpiredError,
  type AuthenticatedActor,
} from '../services/coveredEntityService';

// === Helpers ===

const TENANT_A = 'tenant-test-a';
const TENANT_B = 'tenant-test-b';
const CE_ID = 'ce-test-1';
const HOSPITAL_1 = 'h-test-1';
const HOSPITAL_2 = 'h-test-2';
const HOSPITAL_3 = 'h-test-3';
const USER_ID = 'user-test-1';

function actor(
  role: AuthenticatedActor['role'],
  hospitalId: string = TENANT_A,
): AuthenticatedActor {
  return { userId: USER_ID, email: 'test@example.test', role, hospitalId };
}

function fakeCe(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CE_ID,
    tenantId: TENANT_A,
    name: 'Synthetic Health Test',
    legalName: null,
    primaryContactName: null,
    primaryContactEmail: null,
    primaryContactPhone: null,
    primaryContactAddress: null,
    escalationContactName: null,
    escalationContactEmail: null,
    escalationContactPhone: null,
    ceType: null,
    baaExecutedAt: null,
    baaExpiresAt: null,
    baaDocumentUrl: null,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function fakeHospital(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: HOSPITAL_1,
    baaExecuted: false,
    baaExecutedAt: null,
    ...overrides,
  };
}

// Default $transaction mock: invoke callback with tx scope routed to the same
// jest.fn closures as the prisma singleton mock. This lets tests assert call
// counts on a single closure regardless of whether the invocation went via
// prisma.* or tx.* (the mock module re-uses the closures for both surfaces).
function installTransactionMock(): void {
  prismaTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    const tx = {
      coveredEntity: {
        update: (...args: unknown[]) => coveredEntityUpdate(...args),
      },
      hospital: {
        findUnique: (...args: unknown[]) => hospitalFindUnique(...args),
        findMany: (...args: unknown[]) => hospitalFindMany(...args),
        update: (...args: unknown[]) => hospitalUpdate(...args),
      },
    };
    return await callback(tx);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  installTransactionMock();
});

// === F1: updateHospitalBaaCache ===

describe('updateHospitalBaaCache (F1)', () => {
  describe('happy-path cache writes', () => {
    it('writes cache transition false to true and emits HOSPITAL_BAA_CACHE_UPDATED', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospital({ baaExecuted: false, baaExecutedAt: null }),
      );
      hospitalUpdate.mockResolvedValue(undefined);
      const executedAt = new Date('2026-05-10T12:00:00.000Z');

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: true,
          authoritativeBaaExecutedAt: executedAt,
        },
        { actor: actor('HOSPITAL_ADMIN') },
      );

      expect(hospitalUpdate).toHaveBeenCalledWith({
        where: { id: HOSPITAL_1 },
        data: { baaExecuted: true, baaExecutedAt: executedAt },
      });
      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'HOSPITAL_BAA_CACHE_UPDATED',
          resourceType: 'Hospital',
          resourceId: HOSPITAL_1,
        }),
      );
    });

    it('writes cache transition true to false and emits HOSPITAL_BAA_CACHE_UPDATED', async () => {
      const priorExecutedAt = new Date('2026-04-01T00:00:00.000Z');
      hospitalFindUnique.mockResolvedValue(
        fakeHospital({ baaExecuted: true, baaExecutedAt: priorExecutedAt }),
      );
      hospitalUpdate.mockResolvedValue(undefined);

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: false,
          authoritativeBaaExecutedAt: null,
        },
        { actor: actor('HOSPITAL_ADMIN') },
      );

      expect(hospitalUpdate).toHaveBeenCalledWith({
        where: { id: HOSPITAL_1 },
        data: { baaExecuted: false, baaExecutedAt: null },
      });
      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'HOSPITAL_BAA_CACHE_UPDATED',
          previousBaaExecuted: true,
          newBaaExecuted: false,
        }),
      );
    });

    it('writes when executedAt timestamp differs even though baaExecuted flag matches', async () => {
      const priorAt = new Date('2026-04-01T00:00:00.000Z');
      const newAt = new Date('2026-05-15T00:00:00.000Z');
      hospitalFindUnique.mockResolvedValue(
        fakeHospital({ baaExecuted: true, baaExecutedAt: priorAt }),
      );
      hospitalUpdate.mockResolvedValue(undefined);

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: true,
          authoritativeBaaExecutedAt: newAt,
        },
        { actor: actor('HOSPITAL_ADMIN') },
      );

      expect(hospitalUpdate).toHaveBeenCalledTimes(1);
      expect(auditLoggerInfo).toHaveBeenCalledTimes(1);
    });

    it('emits audit payload with full actor attribution and resourceType=Hospital', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospital());
      hospitalUpdate.mockResolvedValue(undefined);

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: true,
          authoritativeBaaExecutedAt: new Date('2026-05-10T00:00:00.000Z'),
        },
        { actor: actor('HOSPITAL_ADMIN', TENANT_A) },
      );

      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          userId: USER_ID,
          userEmail: 'test@example.test',
          userRole: 'HOSPITAL_ADMIN',
          hospitalId: TENANT_A,
          action: 'HOSPITAL_BAA_CACHE_UPDATED',
          resourceType: 'Hospital',
          resourceId: HOSPITAL_1,
          source: 'coveredEntityService',
        }),
      );
    });
  });

  describe('idempotent skip', () => {
    it('skips write when authoritative state matches existing false to false null both sides', async () => {
      hospitalFindUnique.mockResolvedValue(
        fakeHospital({ baaExecuted: false, baaExecutedAt: null }),
      );

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: false,
          authoritativeBaaExecutedAt: null,
        },
        { actor: actor('HOSPITAL_ADMIN') },
      );

      expect(hospitalUpdate).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('skips write when authoritative state matches existing true to true same Date', async () => {
      const sameAt = new Date('2026-04-01T00:00:00.000Z');
      hospitalFindUnique.mockResolvedValue(
        fakeHospital({ baaExecuted: true, baaExecutedAt: sameAt }),
      );

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: true,
          authoritativeBaaExecutedAt: new Date(sameAt.getTime()),
        },
        { actor: actor('HOSPITAL_ADMIN') },
      );

      expect(hospitalUpdate).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('throws CoveredEntityValidationError when hospital not found', async () => {
      hospitalFindUnique.mockResolvedValue(null);

      await expect(
        updateHospitalBaaCache(
          {
            hospitalId: 'h-missing',
            authoritativeBaaExecuted: true,
            authoritativeBaaExecutedAt: new Date(),
          },
          { actor: actor('HOSPITAL_ADMIN') },
        ),
      ).rejects.toBeInstanceOf(CoveredEntityValidationError);
    });

    it('emits no audit when hospital not found', async () => {
      hospitalFindUnique.mockResolvedValue(null);

      await expect(
        updateHospitalBaaCache(
          {
            hospitalId: 'h-missing',
            authoritativeBaaExecuted: true,
            authoritativeBaaExecutedAt: new Date(),
          },
          { actor: actor('HOSPITAL_ADMIN') },
        ),
      ).rejects.toThrow();

      expect(hospitalUpdate).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
    });

    it('attaches field=hospitalId to thrown validation error for forensic triage', async () => {
      hospitalFindUnique.mockResolvedValue(null);

      let caught: unknown;
      try {
        await updateHospitalBaaCache(
          {
            hospitalId: 'h-missing',
            authoritativeBaaExecuted: true,
            authoritativeBaaExecutedAt: new Date(),
          },
          { actor: actor('HOSPITAL_ADMIN') },
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(CoveredEntityValidationError);
      expect((caught as CoveredEntityValidationError).field).toBe('hospitalId');
      expect((caught as CoveredEntityValidationError).code).toBe(
        'COVERED_ENTITY_VALIDATION_FAILED',
      );
    });
  });

  describe('client selection', () => {
    it('uses tx client when context.client is provided', async () => {
      const txFindUnique = jest.fn().mockResolvedValue(fakeHospital());
      const txUpdate = jest.fn().mockResolvedValue(undefined);
      const tx = {
        hospital: { findUnique: txFindUnique, update: txUpdate },
      };

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: true,
          authoritativeBaaExecutedAt: new Date('2026-05-10T00:00:00.000Z'),
        },
        { actor: actor('HOSPITAL_ADMIN'), client: tx as unknown as never },
      );

      expect(txFindUnique).toHaveBeenCalledTimes(1);
      expect(txUpdate).toHaveBeenCalledTimes(1);
      expect(hospitalFindUnique).not.toHaveBeenCalled();
      expect(hospitalUpdate).not.toHaveBeenCalled();
    });

    it('falls back to singleton prisma when context.client is absent', async () => {
      hospitalFindUnique.mockResolvedValue(fakeHospital());
      hospitalUpdate.mockResolvedValue(undefined);

      await updateHospitalBaaCache(
        {
          hospitalId: HOSPITAL_1,
          authoritativeBaaExecuted: true,
          authoritativeBaaExecutedAt: new Date('2026-05-10T00:00:00.000Z'),
        },
        { actor: actor('HOSPITAL_ADMIN') },
      );

      expect(hospitalFindUnique).toHaveBeenCalledTimes(1);
      expect(hospitalUpdate).toHaveBeenCalledTimes(1);
    });
  });
});

// === F2: upsertCoveredEntityBaaExecution ===

describe('upsertCoveredEntityBaaExecution (F2)', () => {
  describe('authorization', () => {
    it('rejects when actor role is not in MANAGE_ROLES with CoveredEntityAccessDeniedError', async () => {
      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          { baaExecutedAt: new Date() },
          actor('QUALITY_DIRECTOR' as AuthenticatedActor['role']),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
    });

    it('rejects PHYSICIAN role with CoveredEntityAccessDeniedError', async () => {
      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          { baaExecutedAt: new Date() },
          actor('PHYSICIAN' as AuthenticatedActor['role']),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityAccessDeniedError);
    });

    it('emits no audit when access denied', async () => {
      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          { baaExecutedAt: new Date() },
          actor('PHYSICIAN' as AuthenticatedActor['role']),
        ),
      ).rejects.toThrow();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
      expect(prismaTransaction).not.toHaveBeenCalled();
    });
  });

  describe('tenant scope', () => {
    it('rejects cross-tenant write with TenantScopeViolationError for HOSPITAL_ADMIN', async () => {
      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_B,
          CE_ID,
          { baaExecutedAt: new Date() },
          actor('HOSPITAL_ADMIN', TENANT_A),
        ),
      ).rejects.toBeInstanceOf(TenantScopeViolationError);
    });

    it('SUPER_ADMIN bypasses tenant scope and proceeds', async () => {
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ tenantId: TENANT_B }));
      coveredEntityUpdate.mockResolvedValue(
        fakeCe({ tenantId: TENANT_B, baaExecutedAt: new Date('2026-05-10T00:00:00.000Z') }),
      );
      hospitalFindMany.mockResolvedValue([]);

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_B,
          CE_ID,
          { baaExecutedAt: new Date('2026-05-10T00:00:00.000Z') },
          actor('SUPER_ADMIN', TENANT_A),
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('CoveredEntity lookup', () => {
    it('rejects when CE not found in tenant with CoveredEntityNotFoundError', async () => {
      coveredEntityFindFirst.mockResolvedValue(null);

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          'ce-missing',
          { baaExecutedAt: new Date() },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toBeInstanceOf(CoveredEntityNotFoundError);
    });

    it('emits no audit and no $transaction when CE not found', async () => {
      coveredEntityFindFirst.mockResolvedValue(null);

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          'ce-missing',
          { baaExecutedAt: new Date() },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toThrow();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
      expect(prismaTransaction).not.toHaveBeenCalled();
    });
  });

  describe('state-transition validation', () => {
    it('rejects when baaExpiresAt is not strictly after baaExecutedAt with InvalidBaaTransitionError', async () => {
      coveredEntityFindFirst.mockResolvedValue(fakeCe());

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          {
            baaExecutedAt: new Date('2026-05-10T00:00:00.000Z'),
            baaExpiresAt: new Date('2026-05-10T00:00:00.000Z'),
          },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toBeInstanceOf(InvalidBaaTransitionError);
    });

    it('rejects when baaExpiresAt is before baaExecutedAt with InvalidBaaTransitionError', async () => {
      coveredEntityFindFirst.mockResolvedValue(fakeCe());

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          {
            baaExecutedAt: new Date('2026-05-10T00:00:00.000Z'),
            baaExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toBeInstanceOf(InvalidBaaTransitionError);
    });

    it('rejects when baaExpiresAt is in the past with BAAExpiredError', async () => {
      coveredEntityFindFirst.mockResolvedValue(fakeCe());

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          {
            baaExecutedAt: new Date('2020-01-01T00:00:00.000Z'),
            baaExpiresAt: new Date('2021-01-01T00:00:00.000Z'),
          },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toBeInstanceOf(BAAExpiredError);
    });

    it('emits no audit and no $transaction on validation failure', async () => {
      coveredEntityFindFirst.mockResolvedValue(fakeCe());

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          {
            baaExecutedAt: new Date('2026-05-10T00:00:00.000Z'),
            baaExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toThrow();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
      expect(prismaTransaction).not.toHaveBeenCalled();
    });
  });

  describe('state transitions and audit routing', () => {
    it('NULL to Date transition emits BAA_EXECUTION_RECORDED', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(
        fakeCe({ baaExecutedAt: newAt, baaExpiresAt: null }),
      );
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'BAA_EXECUTION_RECORDED',
          resourceType: 'CoveredEntity',
          resourceId: CE_ID,
        }),
      );
    });

    it('Date to NULL transition emits BAA_EXECUTION_REVOKED', async () => {
      const priorAt = new Date('2026-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: priorAt }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: null },
        actor('HOSPITAL_ADMIN'),
      );

      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({
          action: 'BAA_EXECUTION_REVOKED',
          resourceType: 'CoveredEntity',
          resourceId: CE_ID,
        }),
      );
    });

    it('Date to Date value-update transition emits BAA_EXECUTION_RECORDED not UPDATED', async () => {
      const priorAt = new Date('2026-04-01T00:00:00.000Z');
      const newAt = new Date('2026-05-15T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: priorAt }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: newAt }));
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      const recordedCall = auditLoggerInfo.mock.calls.find(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_RECORDED',
      );
      expect(recordedCall).toBeDefined();
    });

    it('expires-only change emits BAA_EXECUTION_RECORDED', async () => {
      const sameAt = new Date('2026-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(
        fakeCe({ baaExecutedAt: sameAt, baaExpiresAt: null }),
      );
      coveredEntityUpdate.mockResolvedValue(
        fakeCe({
          baaExecutedAt: sameAt,
          baaExpiresAt: new Date('2027-04-01T00:00:00.000Z'),
        }),
      );
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        {
          baaExecutedAt: new Date(sameAt.getTime()),
          baaExpiresAt: new Date('2027-04-01T00:00:00.000Z'),
        },
        actor('HOSPITAL_ADMIN'),
      );

      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({ action: 'BAA_EXECUTION_RECORDED' }),
      );
    });

    it('URL-only change emits BAA_EXECUTION_RECORDED', async () => {
      const sameAt = new Date('2026-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(
        fakeCe({ baaExecutedAt: sameAt, baaDocumentUrl: null }),
      );
      coveredEntityUpdate.mockResolvedValue(
        fakeCe({
          baaExecutedAt: sameAt,
          baaDocumentUrl: 's3://test-bucket/baa-doc.pdf',
        }),
      );
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        {
          baaExecutedAt: new Date(sameAt.getTime()),
          baaDocumentUrl: 's3://test-bucket/baa-doc.pdf',
        },
        actor('HOSPITAL_ADMIN'),
      );

      expect(auditLoggerInfo).toHaveBeenCalledWith(
        'audit_event',
        expect.objectContaining({ action: 'BAA_EXECUTION_RECORDED' }),
      );
    });
  });

  describe('idempotent skip', () => {
    it('skips CE write and F1 dispatch when all input fields match existing state', async () => {
      const sameAt = new Date('2026-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(
        fakeCe({ baaExecutedAt: sameAt, baaExpiresAt: null, baaDocumentUrl: null }),
      );
      hospitalFindFirst.mockResolvedValue(null);

      const result = await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: new Date(sameAt.getTime()) },
        actor('HOSPITAL_ADMIN'),
      );

      expect(coveredEntityUpdate).not.toHaveBeenCalled();
      expect(hospitalUpdate).not.toHaveBeenCalled();
      expect(prismaTransaction).not.toHaveBeenCalled();
      expect(auditLoggerInfo).not.toHaveBeenCalled();
      expect(result.coveredEntity.id).toBe(CE_ID);
    });

    it('idempotent-skip with zero linked hospitals returns baaExecuted=false baaExecutedAt=null', async () => {
      coveredEntityFindFirst.mockResolvedValue(
        fakeCe({ baaExecutedAt: null, baaExpiresAt: null, baaDocumentUrl: null }),
      );
      hospitalFindFirst.mockResolvedValue(null);

      const result = await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: null },
        actor('HOSPITAL_ADMIN'),
      );

      expect(result.hospitalCache.baaExecuted).toBe(false);
      expect(result.hospitalCache.baaExecutedAt).toBeNull();
    });

    it('idempotent-skip samples first linked hospital for return shape', async () => {
      const sampledAt = new Date('2026-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(
        fakeCe({ baaExecutedAt: null, baaExpiresAt: null, baaDocumentUrl: null }),
      );
      hospitalFindFirst.mockResolvedValue({
        baaExecuted: true,
        baaExecutedAt: sampledAt,
      });

      const result = await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: null },
        actor('HOSPITAL_ADMIN'),
      );

      expect(hospitalFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { coveredEntityId: CE_ID },
        }),
      );
      expect(result.hospitalCache.baaExecuted).toBe(true);
      expect(result.hospitalCache.baaExecutedAt).toEqual(sampledAt);
    });

    it('treats undefined baaExpiresAt as no-change (does not write)', async () => {
      const sameAt = new Date('2026-04-01T00:00:00.000Z');
      const existingExpires = new Date('2027-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(
        fakeCe({
          baaExecutedAt: sameAt,
          baaExpiresAt: existingExpires,
          baaDocumentUrl: null,
        }),
      );
      hospitalFindFirst.mockResolvedValue(null);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: new Date(sameAt.getTime()) },
        actor('HOSPITAL_ADMIN'),
      );

      expect(coveredEntityUpdate).not.toHaveBeenCalled();
      expect(prismaTransaction).not.toHaveBeenCalled();
    });

    it('treats explicit null baaExpiresAt as a clear-field write distinct from undefined', async () => {
      const sameAt = new Date('2026-04-01T00:00:00.000Z');
      const existingExpires = new Date('2027-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(
        fakeCe({
          baaExecutedAt: sameAt,
          baaExpiresAt: existingExpires,
          baaDocumentUrl: null,
        }),
      );
      coveredEntityUpdate.mockResolvedValue(
        fakeCe({ baaExecutedAt: sameAt, baaExpiresAt: null }),
      );
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: new Date(sameAt.getTime()), baaExpiresAt: null },
        actor('HOSPITAL_ADMIN'),
      );

      expect(coveredEntityUpdate).toHaveBeenCalledTimes(1);
      expect(prismaTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-hospital fan-out cardinality (Q-5ADM-R Path A)', () => {
    it('0-linked-hospital scenario: CE updates with zero F1 dispatches and zero HOSPITAL_BAA_CACHE_UPDATED emissions', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: newAt }));
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      expect(coveredEntityUpdate).toHaveBeenCalledTimes(1);
      expect(hospitalFindUnique).not.toHaveBeenCalled();
      expect(hospitalUpdate).not.toHaveBeenCalled();
      const cacheCalls = auditLoggerInfo.mock.calls.filter(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'HOSPITAL_BAA_CACHE_UPDATED',
      );
      expect(cacheCalls).toHaveLength(0);
      const recordedCalls = auditLoggerInfo.mock.calls.filter(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_RECORDED',
      );
      expect(recordedCalls).toHaveLength(1);
    });

    it('1-linked-hospital scenario: CE updates with 1 F1 dispatch and 1 HOSPITAL_BAA_CACHE_UPDATED emission', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: newAt }));
      hospitalFindMany.mockResolvedValue([{ id: HOSPITAL_1 }]);
      hospitalFindUnique.mockResolvedValue(
        fakeHospital({ id: HOSPITAL_1, baaExecuted: false, baaExecutedAt: null }),
      );
      hospitalUpdate.mockResolvedValue(undefined);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      expect(hospitalFindUnique).toHaveBeenCalledTimes(1);
      expect(hospitalUpdate).toHaveBeenCalledTimes(1);
      const cacheCalls = auditLoggerInfo.mock.calls.filter(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'HOSPITAL_BAA_CACHE_UPDATED',
      );
      expect(cacheCalls).toHaveLength(1);
      const recordedCalls = auditLoggerInfo.mock.calls.filter(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_RECORDED',
      );
      expect(recordedCalls).toHaveLength(1);
    });

    it('N>=3-linked-hospital scenario: CE updates with N F1 dispatches and N HOSPITAL_BAA_CACHE_UPDATED emissions', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: newAt }));
      hospitalFindMany.mockResolvedValue([
        { id: HOSPITAL_1 },
        { id: HOSPITAL_2 },
        { id: HOSPITAL_3 },
      ]);
      hospitalFindUnique
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_1 }))
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_2 }))
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_3 }));
      hospitalUpdate.mockResolvedValue(undefined);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      expect(hospitalFindUnique).toHaveBeenCalledTimes(3);
      expect(hospitalUpdate).toHaveBeenCalledTimes(3);
      const cacheCalls = auditLoggerInfo.mock.calls.filter(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'HOSPITAL_BAA_CACHE_UPDATED',
      );
      expect(cacheCalls).toHaveLength(3);
      const recordedCalls = auditLoggerInfo.mock.calls.filter(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_RECORDED',
      );
      expect(recordedCalls).toHaveLength(1);
    });

    it('transactional rollback: 2nd F1 dispatch throws and outer caller observes the error with BAA_EXECUTION_RECORDED absent', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: newAt }));
      hospitalFindMany.mockResolvedValue([
        { id: HOSPITAL_1 },
        { id: HOSPITAL_2 },
        { id: HOSPITAL_3 },
      ]);
      hospitalFindUnique
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_1 }))
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_2 }))
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_3 }));
      hospitalUpdate
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('simulated F1 fan-out failure'))
        .mockResolvedValueOnce(undefined);

      await expect(
        upsertCoveredEntityBaaExecution(
          TENANT_A,
          CE_ID,
          { baaExecutedAt: newAt },
          actor('HOSPITAL_ADMIN'),
        ),
      ).rejects.toThrow('simulated F1 fan-out failure');

      const recordedCalls = auditLoggerInfo.mock.calls.filter(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_RECORDED',
      );
      expect(recordedCalls).toHaveLength(0);
    });
  });

  describe('authoritative cache derivation per Q-5ADM-C', () => {
    it('baaExecutedAt set with baaExpiresAt null derives authoritativeBaaExecuted=true', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(
        fakeCe({ baaExecutedAt: newAt, baaExpiresAt: null }),
      );
      hospitalFindMany.mockResolvedValue([{ id: HOSPITAL_1 }]);
      hospitalFindUnique.mockResolvedValue(fakeHospital({ baaExecuted: false }));
      hospitalUpdate.mockResolvedValue(undefined);

      const result = await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      expect(result.hospitalCache.baaExecuted).toBe(true);
      expect(result.hospitalCache.baaExecutedAt).toEqual(newAt);
    });

    it('baaExecutedAt set with baaExpiresAt in the future derives authoritativeBaaExecuted=true', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      const futureExpires = new Date('2030-01-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(
        fakeCe({ baaExecutedAt: newAt, baaExpiresAt: futureExpires }),
      );
      hospitalFindMany.mockResolvedValue([{ id: HOSPITAL_1 }]);
      hospitalFindUnique.mockResolvedValue(fakeHospital());
      hospitalUpdate.mockResolvedValue(undefined);

      const result = await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt, baaExpiresAt: futureExpires },
        actor('HOSPITAL_ADMIN'),
      );

      expect(result.hospitalCache.baaExecuted).toBe(true);
    });

    it('baaExecutedAt null revoke derives authoritativeBaaExecuted=false', async () => {
      const priorAt = new Date('2026-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: priorAt }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      hospitalFindMany.mockResolvedValue([{ id: HOSPITAL_1 }]);
      hospitalFindUnique.mockResolvedValue(
        fakeHospital({ baaExecuted: true, baaExecutedAt: priorAt }),
      );
      hospitalUpdate.mockResolvedValue(undefined);

      const result = await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: null },
        actor('HOSPITAL_ADMIN'),
      );

      expect(result.hospitalCache.baaExecuted).toBe(false);
      expect(result.hospitalCache.baaExecutedAt).toBeNull();
    });
  });

  describe('audit payload content', () => {
    it('BAA_EXECUTION_RECORDED payload includes previousBaaExecutedAt + newBaaExecutedAt + linkedHospitalCount + authoritativeBaaExecuted', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: newAt }));
      hospitalFindMany.mockResolvedValue([{ id: HOSPITAL_1 }, { id: HOSPITAL_2 }]);
      hospitalFindUnique
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_1 }))
        .mockResolvedValueOnce(fakeHospital({ id: HOSPITAL_2 }));
      hospitalUpdate.mockResolvedValue(undefined);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      const recordedCall = auditLoggerInfo.mock.calls.find(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_RECORDED',
      );
      expect(recordedCall).toBeDefined();
      const payload = recordedCall![1] as Record<string, unknown>;
      expect(payload.previousBaaExecutedAt).toBeNull();
      expect(payload.newBaaExecutedAt).toBe(newAt.toISOString());
      expect(payload.linkedHospitalCount).toBe(2);
      expect(payload.authoritativeBaaExecuted).toBe(true);
      expect(payload.tenantId).toBe(TENANT_A);
    });

    it('BAA_EXECUTION_REVOKED payload includes previousBaaExecutedAt non-null + newBaaExecutedAt null', async () => {
      const priorAt = new Date('2026-04-01T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: priorAt }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: null },
        actor('HOSPITAL_ADMIN'),
      );

      const revokedCall = auditLoggerInfo.mock.calls.find(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_REVOKED',
      );
      expect(revokedCall).toBeDefined();
      const payload = revokedCall![1] as Record<string, unknown>;
      expect(payload.previousBaaExecutedAt).toBe(priorAt.toISOString());
      expect(payload.newBaaExecutedAt).toBeNull();
    });

    it('audit resourceType is CoveredEntity not Hospital for F2 emissions', async () => {
      const newAt = new Date('2026-05-10T00:00:00.000Z');
      coveredEntityFindFirst.mockResolvedValue(fakeCe({ baaExecutedAt: null }));
      coveredEntityUpdate.mockResolvedValue(fakeCe({ baaExecutedAt: newAt }));
      hospitalFindMany.mockResolvedValue([]);

      await upsertCoveredEntityBaaExecution(
        TENANT_A,
        CE_ID,
        { baaExecutedAt: newAt },
        actor('HOSPITAL_ADMIN'),
      );

      const recordedCall = auditLoggerInfo.mock.calls.find(
        (call) =>
          typeof call[1] === 'object' &&
          (call[1] as { action: string }).action === 'BAA_EXECUTION_RECORDED',
      );
      expect((recordedCall![1] as { resourceType: string }).resourceType).toBe(
        'CoveredEntity',
      );
    });
  });
});
