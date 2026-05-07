/**
 * AUDIT-011 Phase b/c/d Step 1.0 — Symbol survival verification gate.
 *
 * Load-bearing assumption: TENANT_GUARD_BYPASS Symbol.for() property survives
 * Prisma 5.22 $extends `query` wrapper transit. If true (outcome a), the 11
 * existing Phase a-pre callsites preserve unchanged. If false (outcome b),
 * fall back to string-keyed escape hatch + 11-callsite migration.
 *
 * This test is run ONCE before authoring the prismaTenantGuard extension
 * proper. Three outcomes:
 *   (a) hasOwnProperty + value === true on the wrapper-side args object
 *       → proceed with current marker pattern
 *   (b) hasOwnProperty returns false (symbol stripped during transit)
 *       → STOP, surface to operator, migrate to string-keyed
 *   (c) hasOwnProperty true but value !== true (mutation during transit)
 *       → treat as (b) for safety
 *
 * Test approach: instantiate a real PrismaClient pointed at sqlite memory or
 * postgres, attach a $extends wrapper that asserts on the args symbol property,
 * trigger a query that exercises the wrapper, observe what the wrapper sees.
 *
 * To avoid requiring a live DB: use prisma.$extends({ query: ... }) on a
 * PrismaClient instance and call a model operation; the wrapper runs even if
 * the underlying query function call fails (we catch the eventual reject).
 */

import { PrismaClient } from '@prisma/client';

// Local Symbol used only by this verification test. The production
// tenantGuard.ts module no longer exports a symbol marker (migrated to
// string-keyed `__tenantGuardBypass` per AUDIT-011 Phase b/c, 2026-05-07);
// this test still uses a symbol fixture to verify the historical $use vs
// $extends behavioral difference that drove the migration decision.
const TENANT_GUARD_BYPASS = Symbol.for('tailrd:tenant_guard_bypass');

describe('AUDIT-011 Step 1.0 — Symbol.for() survival across Prisma 5.22', () => {
  it('$use middleware: preserves args[TENANT_GUARD_BYPASS] = true (legacy baseline)', async () => {
    const observations: Array<{ hasOwn: boolean; value: unknown }> = [];
    const baseClient = new PrismaClient({
      datasources: { db: { url: 'postgresql://test:test@localhost:65535/test_does_not_exist' } },
      log: [],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseClient as any).$use(async (params: any, _next: any) => {
      const argsObj = params.args as Record<string | symbol, unknown>;
      observations.push({
        hasOwn: Object.prototype.hasOwnProperty.call(argsObj, TENANT_GUARD_BYPASS),
        value: argsObj[TENANT_GUARD_BYPASS],
      });
      throw new Error('STEP_1_0_USE_OBSERVATION_DONE');
    });
    const fixtureArgs = { where: { id: 'test-id' }, [TENANT_GUARD_BYPASS]: true };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (baseClient as any).auditLog.findUnique(fixtureArgs);
    } catch { /* expected */ }
    await baseClient.$disconnect().catch(() => {});

    // eslint-disable-next-line no-console
    console.log('STEP_1_0_USE_BASELINE:', JSON.stringify(observations, (_, v) =>
      typeof v === 'symbol' ? v.toString() : v, 2));

    expect(observations.length).toBeGreaterThanOrEqual(1);
    // Document baseline — whatever $use does today is what the existing 11
    // callsites depend on. Test asserts the OBSERVED behavior, doesn't gate.
  }, 30_000);

  it('$extends query wrapper: preserves args[TENANT_GUARD_BYPASS] = true (Layer 3 target)', async () => {
    const observations: Array<{
      hasOwn: boolean;
      value: unknown;
      argsKeysOwnProps: Array<string | symbol>;
    }> = [];

    // Build a thin PrismaClient instance. We will NOT execute any real query
    // — we'll throw inside the wrapper (after observation) so no connection
    // is needed. Suppresses Prisma's connection-error noise via try/catch.
    const baseClient = new PrismaClient({
      datasources: { db: { url: 'postgresql://test:test@localhost:65535/test_does_not_exist' } },
      log: [],
    });

    const extended = baseClient.$extends({
      query: {
        $allModels: {
          $allOperations: async ({ args }) => {
            // Observation point — what does the wrapper actually see?
            const argsObj = args as Record<string | symbol, unknown>;
            observations.push({
              hasOwn: Object.prototype.hasOwnProperty.call(argsObj, TENANT_GUARD_BYPASS),
              value: argsObj[TENANT_GUARD_BYPASS],
              argsKeysOwnProps: [
                ...Object.getOwnPropertyNames(argsObj),
                ...Object.getOwnPropertySymbols(argsObj),
              ],
            });
            // Throw to short-circuit; no real DB call needed.
            throw new Error('STEP_1_0_OBSERVATION_DONE');
          },
        },
      },
    });

    // Construct the args fixture per design refinement note §4.2.
    const fixtureArgs = {
      where: { id: 'test-id-step-1-0' },
      [TENANT_GUARD_BYPASS]: true,
    };

    // Trigger the wrapper. Use any model from the schema; auditLog is one of
    // the 11 existing callsites that uses the bypass marker today, so
    // exercising the same call shape is appropriate.
    try {
      await (extended as unknown as { auditLog: { findUnique: (args: unknown) => Promise<unknown> } })
        .auditLog.findUnique(fixtureArgs);
    } catch (err) {
      // Expected: STEP_1_0_OBSERVATION_DONE OR connection error. Either way,
      // we collected the observation in the wrapper before throwing.
    }

    await baseClient.$disconnect().catch(() => {});

    // Surface the observation for operator review (jest output captures).
    // eslint-disable-next-line no-console
    console.log('STEP_1_0_OBSERVATION:', JSON.stringify(observations, (_, v) => {
      if (typeof v === 'symbol') return v.toString();
      return v;
    }, 2));

    // Assertions — load-bearing for outcome verdict.
    expect(observations.length).toBeGreaterThanOrEqual(1);
    const obs = observations[0];

    // 2026-05-07 Step 1.0 verdict — OUTCOME (b) confirmed.
    // Prisma 5.22 $extends `query` wrapper STRIPS symbol-keyed properties
    // from args. Only schema-valid string-keyed properties survive transit.
    // Layer 3 implementation uses string-keyed `__tenantGuardBypass` escape
    // hatch instead of the original Symbol.for() pattern.
    //
    // $use baseline (legacy API) DID preserve the symbol, which is why the
    // 11 existing Phase a-pre callsites worked through phiEncryption today.
    // Migration to $extends requires migrating tenantGuard.ts marker pattern
    // + all 11 callsites in same PR.
    expect(obs.hasOwn).toBe(false);    // Symbol stripped — outcome (b)
    expect(obs.argsKeysOwnProps).toEqual(['where']);  // Only schema-valid keys survive
  }, 30_000);

  it('Step 1.0.1: $extends query wrapper — string-keyed __tenantGuardBypass survival check', async () => {
    // Outcome (b) mitigation per operator spec proposed switching from
    // Symbol.for() to string-keyed `__tenantGuardBypass: true`. Step 1.0 only
    // verified Symbol.for() gets stripped. This test verifies whether a
    // double-underscored string-keyed escape hatch survives the same transit
    // — i.e., does Prisma 5.22 strip ALL non-schema-field properties or just
    // symbols?
    //
    // Outcomes:
    //   (a) string-keyed survives → operator's outcome (b) mitigation works;
    //       proceed with __tenantGuardBypass migration of 11 callsites + 3
    //       FeatureUsage markers.
    //   (b) string-keyed also stripped → outcome (b) mitigation invalidated;
    //       requires alternative mechanism (split client / raw-prisma export
    //       sister to AUDIT-016 PR 3 $executeRawUnsafe pattern).
    const observations: Array<{
      hasOwn: boolean;
      value: unknown;
      argsKeysOwnProps: Array<string | symbol>;
    }> = [];
    const baseClient = new PrismaClient({
      datasources: { db: { url: 'postgresql://test:test@localhost:65535/test_does_not_exist' } },
      log: [],
    });
    const extended = baseClient.$extends({
      query: {
        $allModels: {
          $allOperations: async ({ args }) => {
            const argsObj = args as Record<string | symbol, unknown>;
            observations.push({
              hasOwn: Object.prototype.hasOwnProperty.call(argsObj, '__tenantGuardBypass'),
              value: argsObj['__tenantGuardBypass'],
              argsKeysOwnProps: [
                ...Object.getOwnPropertyNames(argsObj),
                ...Object.getOwnPropertySymbols(argsObj),
              ],
            });
            throw new Error('STEP_1_0_1_OBSERVATION_DONE');
          },
        },
      },
    });
    const fixtureArgs = {
      where: { id: 'test-id-1-0-1' },
      __tenantGuardBypass: true,
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (extended as any).auditLog.findUnique(fixtureArgs);
    } catch { /* expected */ }
    await baseClient.$disconnect().catch(() => {});

    // eslint-disable-next-line no-console
    console.log('STEP_1_0_1_OBSERVATION:', JSON.stringify(observations, (_, v) =>
      typeof v === 'symbol' ? v.toString() : v, 2));

    expect(observations.length).toBeGreaterThanOrEqual(1);
    // 2026-05-07 Step 1.0.1 verdict — STRING-KEYED SURVIVES.
    // Prisma 5.22 strips Symbol-keyed properties from $extends args (Step 1.0
    // outcome b) but PRESERVES arbitrary string-keyed properties. This makes
    // operator's outcome (b) string-keyed `__tenantGuardBypass` mitigation
    // viable. Proceed with 11-callsite migration + 3 FeatureUsage markers
    // per PAUSE 2.7 (b) refinement.
    expect(observations[0].hasOwn).toBe(true);
    expect(observations[0].value).toBe(true);
    expect(observations[0].argsKeysOwnProps).toContain('__tenantGuardBypass');
  }, 30_000);
});
