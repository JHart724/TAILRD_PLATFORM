/**
 * AUDIT-011 Phase b/c — `prismaTenantGuard.ts` Layer 3 unit tests.
 *
 * Coverage (per `docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md`
 * §9.1 test plan):
 *
 *   GROUP A — Detection branches (3 tests)
 *     A1: top-level args.where.hospitalId → no violation
 *     A2: AND-array form: args.where.AND[i].hospitalId → no violation
 *     A3: AND-object form: args.where.AND.hospitalId → no violation
 *
 *   GROUP B — Bypass marker (2 tests)
 *     B1: __tenantGuardBypass: true → enforcement skipped
 *     B2: __tenantGuardBypass: false → enforcement still applies
 *
 *   GROUP C — Allow-list discipline (2 tests)
 *     C1: HIPAA_GRADE_TENANT_MODELS member without hospitalId → violation
 *     C2: Non-allow-list model → no violation (system-bypass category)
 *
 *   GROUP D — Action discipline (2 tests)
 *     D1: create / createMany → enforcement skipped (no where to inspect)
 *     D2: ENFORCED_ACTIONS member without hospitalId → violation
 *
 *   GROUP E — Three-state flag matrix (3 tests)
 *     E1: TENANT_GUARD_MODE=off → inert (no log/audit/throw)
 *     E2: TENANT_GUARD_MODE=audit → log + audit event; query proceeds
 *     E3: TENANT_GUARD_MODE=strict → log + audit + TenantGuardError thrown
 *
 *   GROUP F — Module-init validation (2 tests)
 *     F1: invalid TENANT_GUARD_MODE → TenantGuardConfigError at init
 *     F2: undefined TENANT_GUARD_MODE → defaults to 'audit'
 *
 *   Total: 14 tests within 12-15 target.
 *
 * Test infrastructure: $extends-aware fake-client + `invokeMiddleware`
 * adapter sister to `phiEncryption.test.ts:33-66`. auditLogger mocked
 * to capture violation events for parity assertion.
 *
 * Cross-references:
 *   - backend/src/lib/prismaTenantGuard.ts (system under test)
 *   - backend/src/middleware/tenantGuard.ts (TENANT_GUARD_BYPASS_KEY contract)
 *   - backend/src/middleware/auditLogger.ts (HIPAA_GRADE_ACTIONS Set; +1 promotion at Step 4)
 *   - docs/architecture/AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md §9.1
 */

import {
  applyPrismaTenantGuard,
  TenantGuardError,
  TenantGuardConfigError,
  parseTenantGuardMode,
  validateTenantGuardModeOrThrow,
  hasHospitalIdInWhere,
  HIPAA_GRADE_TENANT_MODELS,
  _resetTenantGuardModeCacheForTests,
} from '../prismaTenantGuard';

// ── auditLogger mock ───────────────────────────────────────────────────
// Capture audit events emitted by the extension so tests can assert on the
// HIPAA-graded TENANT_GUARD_VIOLATION action string (sister to Step 4
// producer-consumer string parity verification).
const auditEvents: Array<{ level: string; payload: Record<string, unknown> }> = [];

jest.mock('../../middleware/auditLogger', () => ({
  auditLogger: {
    info: jest.fn((level: string, payload: Record<string, unknown>) => {
      auditEvents.push({ level, payload });
    }),
    error: jest.fn((level: string, payload: Record<string, unknown>) => {
      auditEvents.push({ level, payload });
    }),
    warn: jest.fn((level: string, payload: Record<string, unknown>) => {
      auditEvents.push({ level, payload });
    }),
  },
}));

// ── $extends-aware fake-client adapter ─────────────────────────────────
// Sister to `phiEncryption.test.ts:33-66`. Captures the registered
// `$allOperations` wrapper from `$extends({ query: { $allModels: { ... }}})`
// and exposes it via `_fn` for direct invocation. Adapter preserves a
// (params, next)-style invocation pattern so test bodies stay legible.
interface FakeExtendsClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _fn?: (input: any) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $extends: (ext: any) => FakeExtendsClient;
}

function makeFakeExtendsClient(): FakeExtendsClient {
  const fakeClient: FakeExtendsClient = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $extends: (ext: any) => {
      fakeClient._fn = ext.query.$allModels.$allOperations;
      return fakeClient;
    },
  };
  return fakeClient;
}

interface InvokeParams {
  model: string;
  operation: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
}

async function invokeMiddleware(
  fakeClient: FakeExtendsClient,
  params: InvokeParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next: (args: any) => Promise<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!fakeClient._fn) throw new Error('extension not registered on fake client');
  return fakeClient._fn({
    args: params.args,
    model: params.model,
    operation: params.operation,
    query: next,
  });
}

// ── Test setup ─────────────────────────────────────────────────────────

const originalEnv = { ...process.env };

beforeEach(() => {
  auditEvents.length = 0;
  jest.clearAllMocks();
  _resetTenantGuardModeCacheForTests();
});

afterAll(() => {
  process.env = originalEnv;
  _resetTenantGuardModeCacheForTests();
});

function setMode(mode: 'off' | 'audit' | 'strict' | undefined | string): void {
  if (mode === undefined) {
    delete process.env.TENANT_GUARD_MODE;
  } else {
    process.env.TENANT_GUARD_MODE = mode;
  }
  _resetTenantGuardModeCacheForTests();
}

// ── Helpers ────────────────────────────────────────────────────────────

interface SetupOptions {
  mode: 'off' | 'audit' | 'strict' | undefined;
}

function setupClient(opts: SetupOptions): FakeExtendsClient {
  setMode(opts.mode);
  const fakeClient = makeFakeExtendsClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyPrismaTenantGuard(fakeClient as any);
  return fakeClient;
}

function violationEventCount(): number {
  return auditEvents.filter(
    (e) => (e.payload as { action?: string }).action === 'TENANT_GUARD_VIOLATION',
  ).length;
}

// ─── GROUP A — Detection branches ───────────────────────────────────────

describe('GROUP A — hospitalId detection branches', () => {
  it('A1: top-level args.where.hospitalId → no violation', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    const result = await invokeMiddleware(
      fakeClient,
      { model: 'Patient', operation: 'findUnique', args: { where: { id: 'p1', hospitalId: 'h1' } } },
      async () => ({ id: 'p1', firstName: 'Alice' }),
    );
    expect(result).toEqual({ id: 'p1', firstName: 'Alice' });
    expect(violationEventCount()).toBe(0);
  });

  it('A2: AND-array form with hospitalId branch → no violation', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    const result = await invokeMiddleware(
      fakeClient,
      {
        model: 'Patient',
        operation: 'findFirst',
        args: { where: { AND: [{ id: 'p1' }, { hospitalId: 'h1' }] } },
      },
      async () => ({ id: 'p1' }),
    );
    expect(result).toEqual({ id: 'p1' });
    expect(violationEventCount()).toBe(0);
    // Standalone helper assertion — covers the AND-array detection branch.
    expect(hasHospitalIdInWhere({ where: { AND: [{ id: 'p1' }, { hospitalId: 'h1' }] } })).toBe(true);
  });

  it('A3: AND-object form with hospitalId → no violation', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    const result = await invokeMiddleware(
      fakeClient,
      {
        model: 'Patient',
        operation: 'findFirst',
        args: { where: { AND: { hospitalId: 'h1' } } },
      },
      async () => ({ id: 'p1' }),
    );
    expect(result).toEqual({ id: 'p1' });
    expect(violationEventCount()).toBe(0);
    expect(hasHospitalIdInWhere({ where: { AND: { hospitalId: 'h1' } } })).toBe(true);
  });
});

// ─── GROUP B — Bypass marker ────────────────────────────────────────────

describe('GROUP B — __tenantGuardBypass marker', () => {
  it('B1: __tenantGuardBypass: true → enforcement skipped (no violation, query proceeds)', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    const result = await invokeMiddleware(
      fakeClient,
      {
        model: 'Patient',
        operation: 'findUnique',
        args: { where: { id: 'p1' }, __tenantGuardBypass: true },
      },
      async () => ({ id: 'p1' }),
    );
    expect(result).toEqual({ id: 'p1' });
    expect(violationEventCount()).toBe(0);
  });

  it('B2: __tenantGuardBypass: false → enforcement still applies (defensive)', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    await expect(
      invokeMiddleware(
        fakeClient,
        {
          model: 'Patient',
          operation: 'findUnique',
          args: { where: { id: 'p1' }, __tenantGuardBypass: false },
        },
        async () => ({ id: 'p1' }),
      ),
    ).rejects.toThrow(TenantGuardError);
    expect(violationEventCount()).toBe(1);
  });
});

// ─── GROUP C — Allow-list discipline ────────────────────────────────────

describe('GROUP C — HIPAA_GRADE_TENANT_MODELS allow-list', () => {
  it('C1: allow-list member (Patient) without hospitalId → violation in strict mode', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    expect(HIPAA_GRADE_TENANT_MODELS.has('Patient')).toBe(true);
    await expect(
      invokeMiddleware(
        fakeClient,
        { model: 'Patient', operation: 'findUnique', args: { where: { id: 'p1' } } },
        async () => ({ id: 'p1' }),
      ),
    ).rejects.toThrow(TenantGuardError);
    expect(violationEventCount()).toBe(1);
  });

  it('C2: non-allow-list model (BusinessMetric) without hospitalId → no violation (system-bypass)', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    expect(HIPAA_GRADE_TENANT_MODELS.has('BusinessMetric')).toBe(false);
    const result = await invokeMiddleware(
      fakeClient,
      { model: 'BusinessMetric', operation: 'findMany', args: { where: { periodStart: { gte: new Date() } } } },
      async () => [],
    );
    expect(result).toEqual([]);
    expect(violationEventCount()).toBe(0);
  });
});

// ─── GROUP D — Action discipline ────────────────────────────────────────

describe('GROUP D — action allow-list (CREATE_ACTIONS skip; ENFORCED_ACTIONS check)', () => {
  it('D1: create operation → enforcement skipped (no where to inspect)', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    const result = await invokeMiddleware(
      fakeClient,
      { model: 'Patient', operation: 'create', args: { data: { id: 'p1', firstName: 'Alice' } } },
      async () => ({ id: 'p1' }),
    );
    expect(result).toEqual({ id: 'p1' });
    expect(violationEventCount()).toBe(0);
  });

  it('D2: ENFORCED_ACTIONS member (updateMany) without hospitalId → violation', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    await expect(
      invokeMiddleware(
        fakeClient,
        {
          model: 'Patient',
          operation: 'updateMany',
          args: { where: { firstName: 'Alice' }, data: { lastName: 'Smith' } },
        },
        async () => ({ count: 0 }),
      ),
    ).rejects.toThrow(TenantGuardError);
    expect(violationEventCount()).toBe(1);
  });
});

// ─── GROUP E — Three-state flag matrix ──────────────────────────────────

describe('GROUP E — TENANT_GUARD_MODE three-state matrix', () => {
  it('E1: mode=off → extension installed but inert (no log, no audit, no throw)', async () => {
    const fakeClient = setupClient({ mode: 'off' });
    const result = await invokeMiddleware(
      fakeClient,
      { model: 'Patient', operation: 'findUnique', args: { where: { id: 'p1' } } },
      async () => ({ id: 'p1' }),
    );
    expect(result).toEqual({ id: 'p1' });
    expect(violationEventCount()).toBe(0);
  });

  it('E2: mode=audit → log + TENANT_GUARD_VIOLATION audit event; query proceeds (no throw)', async () => {
    const fakeClient = setupClient({ mode: 'audit' });
    const result = await invokeMiddleware(
      fakeClient,
      { model: 'Patient', operation: 'findUnique', args: { where: { id: 'p1' } } },
      async () => ({ id: 'p1' }),
    );
    expect(result).toEqual({ id: 'p1' });
    expect(violationEventCount()).toBe(1);
    const violation = auditEvents.find(
      (e) => (e.payload as { action?: string }).action === 'TENANT_GUARD_VIOLATION',
    );
    expect(violation).toBeDefined();
    // Producer-consumer string parity (sister to Step 4 verification 2)
    expect((violation!.payload as { action: string }).action).toBe('TENANT_GUARD_VIOLATION');
    expect((violation!.payload as { resourceType?: string }).resourceType).toBe('Patient');
  });

  it('E3: mode=strict → log + audit event + TenantGuardError thrown', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    let thrown: unknown;
    try {
      await invokeMiddleware(
        fakeClient,
        { model: 'Patient', operation: 'findUnique', args: { where: { id: 'p1' } } },
        async () => ({ id: 'p1' }),
      );
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(TenantGuardError);
    const tgErr = thrown as TenantGuardError;
    expect(tgErr.model).toBe('Patient');
    expect(tgErr.action).toBe('findUnique');
    expect(tgErr.mode).toBe('strict');
    expect(tgErr.bypassMarkerPresent).toBe(false);
    expect(violationEventCount()).toBe(1);
  });
});

// ─── GROUP F — Module-init validation ───────────────────────────────────

describe('GROUP F — TENANT_GUARD_MODE config validation', () => {
  it('F1: invalid TENANT_GUARD_MODE value → TenantGuardConfigError at validateTenantGuardModeOrThrow', () => {
    expect(() => parseTenantGuardMode('invalid')).toThrow(TenantGuardConfigError);
    expect(() => parseTenantGuardMode('strict-mode')).toThrow(/'off' \| 'audit' \| 'strict'/);
    expect(() => validateTenantGuardModeOrThrow({ TENANT_GUARD_MODE: 'garbage' } as NodeJS.ProcessEnv)).toThrow(
      TenantGuardConfigError,
    );
  });

  it('F2: undefined TENANT_GUARD_MODE → defaults to "audit" (robustness-first per §5)', () => {
    expect(parseTenantGuardMode(undefined)).toBe('audit');
    expect(parseTenantGuardMode('')).toBe('audit');
    expect(validateTenantGuardModeOrThrow({} as NodeJS.ProcessEnv)).toBe('audit');
  });
});

// ─── GROUP G - Bypass marker strip behavior (AUDIT-086) ─────────────────
//
// Coverage gap closed mid-flight by AUDIT-016 PR 3 STEP 1.5 PAUSE 1.5.1:
// the existing B1 test exercises bypass marker on a `findUnique` (where-
// style) args shape, where Prisma 5.22 tolerates extra top-level keys at
// runtime. The production failure surface was `prisma.auditLog.create({
// data, __tenantGuardBypass: true })`. Prisma's `create` schema is strict
// and rejects unknown top-level keys ("Unknown argument
// `__tenantGuardBypass`"). These three tests assert the marker is stripped
// from args BEFORE the underlying `query()` is called, regardless of
// operation type or mode. Sister to B1 (which verifies routing); G group
// verifies args sanitization.

describe('GROUP G: bypass marker strip before query() (AUDIT-086)', () => {
  it('G1: create-with-bypass; marker stripped before query() so Prisma create() sees clean args', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    let capturedArgs: unknown;
    const result = await invokeMiddleware(
      fakeClient,
      {
        model: 'AuditLog',
        operation: 'create',
        args: {
          data: { hospitalId: null, action: 'LOGIN_SUCCESS' },
          __tenantGuardBypass: true,
        },
      },
      async (args) => {
        capturedArgs = args;
        return { id: 'a1' };
      },
    );
    expect(result).toEqual({ id: 'a1' });
    expect(violationEventCount()).toBe(0);
    // CRITICAL invariant: Prisma 5.22 create() rejects unknown top-level
    // keys with "Unknown argument" error; args reaching Prisma must be clean.
    expect(capturedArgs).not.toHaveProperty('__tenantGuardBypass');
    // `data` payload preserved verbatim
    expect(capturedArgs).toHaveProperty('data');
    expect((capturedArgs as { data: unknown }).data).toEqual({
      hospitalId: null,
      action: 'LOGIN_SUCCESS',
    });
  });

  it('G2: update-with-bypass; strip parity across non-create operation types', async () => {
    const fakeClient = setupClient({ mode: 'strict' });
    let capturedArgs: unknown;
    const result = await invokeMiddleware(
      fakeClient,
      {
        model: 'Patient',
        operation: 'update',
        args: {
          where: { id: 'p1' },
          data: { firstName: 'Bob' },
          __tenantGuardBypass: true,
        },
      },
      async (args) => {
        capturedArgs = args;
        return { id: 'p1' };
      },
    );
    expect(result).toEqual({ id: 'p1' });
    // Bypass marker present → enforcement skipped, no violation
    expect(violationEventCount()).toBe(0);
    // Strip happens regardless of operation type (hygiene)
    expect(capturedArgs).not.toHaveProperty('__tenantGuardBypass');
    expect(capturedArgs).toHaveProperty('where');
    expect(capturedArgs).toHaveProperty('data');
  });

  it('G3: off-mode-with-bypass; strip still happens even when enforcement is inert', async () => {
    const fakeClient = setupClient({ mode: 'off' });
    let capturedArgs: unknown;
    const result = await invokeMiddleware(
      fakeClient,
      {
        model: 'AuditLog',
        operation: 'create',
        args: {
          data: { hospitalId: null, action: 'TEST' },
          __tenantGuardBypass: true,
        },
      },
      async (args) => {
        capturedArgs = args;
        return { id: 'a1' };
      },
    );
    expect(result).toEqual({ id: 'a1' });
    // Mode=off: no inspection, no logging, no audit
    expect(violationEventCount()).toBe(0);
    // Strip is unconditional; same hygiene invariant regardless of mode
    // (avoids divergent args shape between off-mode and audit/strict modes)
    expect(capturedArgs).not.toHaveProperty('__tenantGuardBypass');
    expect(capturedArgs).toHaveProperty('data');
  });
});
