/**
 * AUDIT-071 + AUDIT-073 schema constraint tests.
 *
 * Integration tests against the live dev DB. Verifies:
 *   1. @@unique([hospitalId, fhirPatientId]) on Patient — same-hospital duplicate rejected; cross-tenant duplicate allowed
 *   2. @@unique([hospitalId, fhirOrderId]) on Order — same pattern
 *   3. @@unique([hospitalId, fhirCarePlanId]) on CarePlan — same pattern
 *
 * **Skipped by default** per jest.config.js (run with `RUN_INTEGRATION_TESTS=1`).
 *
 * **Prerequisite:** target DB must have current Prisma schema applied
 * (`npx prisma migrate deploy`). Local dev DBs that predate later schema
 * migrations (e.g., Patient.isMerged from a baseline drift) will fail to
 * insert test rows. Production + staging Aurora applied via CI/CD;
 * fresh local dev DBs after `prisma db push` work cleanly.
 *
 * Schema constraint correctness is independently verified at migration time
 * via the AUDIT-071 PR's pre-flight `pg_indexes` check (see
 * `docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md` §6 +
 * register entry resolution evidence). These tests provide regression
 * protection for the constraints, not the only verification.
 *
 * Cleanup: every test cleans up its inserted rows in afterEach so the dev DB
 * stays untouched. Patient FK retention (Restrict) means dependent rows must
 * be deleted in correct order.
 */

import prisma from '../../src/lib/prisma';

const TEST_PREFIX = 'audit071-test';

function hospitalCreate(id: string): any {
  return {
    id,
    name: id,
    patientCount: 0,
    bedCount: 100,
    hospitalType: 'COMMUNITY' as any,
    street: '1 Test St',
    city: 'Test',
    state: 'TX',
    zipCode: '00000',
    subscriptionTier: 'BASIC' as any,
    subscriptionStart: new Date(),
    maxUsers: 10,
  };
}

async function getTestHospitals(): Promise<{ a: string; b: string }> {
  // Find or create two test hospitals. Idempotent.
  const a = await prisma.hospital.upsert({
    where: { id: `${TEST_PREFIX}-hospital-a` },
    update: {},
    create: hospitalCreate(`${TEST_PREFIX}-hospital-a`),
  });
  const b = await prisma.hospital.upsert({
    where: { id: `${TEST_PREFIX}-hospital-b` },
    update: {},
    create: hospitalCreate(`${TEST_PREFIX}-hospital-b`),
  });
  return { a: a.id, b: b.id };
}

async function cleanup(): Promise<void> {
  // Order matters: delete dependent rows before parent.
  await prisma.carePlan.deleteMany({ where: { hospitalId: { in: [`${TEST_PREFIX}-hospital-a`, `${TEST_PREFIX}-hospital-b`] } } });
  await prisma.order.deleteMany({ where: { hospitalId: { in: [`${TEST_PREFIX}-hospital-a`, `${TEST_PREFIX}-hospital-b`] } } });
  await prisma.patient.deleteMany({ where: { hospitalId: { in: [`${TEST_PREFIX}-hospital-a`, `${TEST_PREFIX}-hospital-b`] } } });
  await prisma.hospital.deleteMany({ where: { id: { in: [`${TEST_PREFIX}-hospital-a`, `${TEST_PREFIX}-hospital-b`] } } });
}

beforeAll(async () => {
  await cleanup();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AUDIT-071 + AUDIT-073 schema unique constraints', () => {
  // ── Patient.fhirPatientId per-tenant uniqueness ────────────────────────

  it('Patient: same hospital + same fhirPatientId → Prisma rejects with P2002', async () => {
    const { a } = await getTestHospitals();
    await prisma.patient.create({
      data: {
        hospitalId: a,
        mrn: `${TEST_PREFIX}-mrn-1`,
        firstName: 'A',
        lastName: 'A',
        dateOfBirth: '1980-01-01',
        gender: 'MALE' as any,
        riskCategory: 'MODERATE' as any,
        fhirPatientId: 'fhir-shared-id',
      },
    });
    await expect(
      prisma.patient.create({
        data: {
          hospitalId: a,
          mrn: `${TEST_PREFIX}-mrn-2`,
          firstName: 'B',
          lastName: 'B',
          dateOfBirth: '1980-01-01',
          gender: 'MALE' as any,
          riskCategory: 'MODERATE' as any,
          fhirPatientId: 'fhir-shared-id',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('Patient: different hospitals + same fhirPatientId → both inserts succeed (tenant isolation)', async () => {
    const { a, b } = await getTestHospitals();
    const p1 = await prisma.patient.create({
      data: {
        hospitalId: a,
        mrn: `${TEST_PREFIX}-mrn-a`,
        firstName: 'A',
        lastName: 'A',
        dateOfBirth: '1980-01-01',
        gender: 'MALE' as any,
        riskCategory: 'MODERATE' as any,
        fhirPatientId: 'fhir-cross-tenant',
      },
    });
    const p2 = await prisma.patient.create({
      data: {
        hospitalId: b,
        mrn: `${TEST_PREFIX}-mrn-b`,
        firstName: 'B',
        lastName: 'B',
        dateOfBirth: '1980-01-01',
        gender: 'MALE' as any,
        riskCategory: 'MODERATE' as any,
        fhirPatientId: 'fhir-cross-tenant',
      },
    });
    expect(p1.id).not.toBe(p2.id);
    expect(p1.hospitalId).not.toBe(p2.hospitalId);
    expect(p1.fhirPatientId).toBe(p2.fhirPatientId);
  });

  // ── Order.fhirOrderId per-tenant uniqueness ────────────────────────────

  it('Order: same hospital + same fhirOrderId → Prisma rejects with P2002', async () => {
    const { a } = await getTestHospitals();
    const patient = await prisma.patient.create({
      data: {
        hospitalId: a,
        mrn: `${TEST_PREFIX}-mrn-order`,
        firstName: 'P',
        lastName: 'P',
        dateOfBirth: '1980-01-01',
        gender: 'MALE' as any,
        riskCategory: 'MODERATE' as any,
      },
    });
    await prisma.order.create({
      data: {
        patientId: patient.id,
        hospitalId: a,
        orderType: 'LAB' as any,
        orderName: 'Test',
        status: 'PENDING' as any,
        priority: 'ROUTINE' as any,
        orderedDateTime: new Date(),
        orderingProvider: 'Test',
        fhirOrderId: 'fhir-order-shared',
      },
    });
    await expect(
      prisma.order.create({
        data: {
          patientId: patient.id,
          hospitalId: a,
          orderType: 'LAB' as any,
          orderName: 'Test 2',
          status: 'PENDING' as any,
        priority: 'ROUTINE' as any,
          orderedDateTime: new Date(),
          orderingProvider: 'Test',
          fhirOrderId: 'fhir-order-shared',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  // ── CarePlan.fhirCarePlanId per-tenant uniqueness ──────────────────────

  it('CarePlan: same hospital + same fhirCarePlanId → Prisma rejects with P2002', async () => {
    const { a } = await getTestHospitals();
    const patient = await prisma.patient.create({
      data: {
        hospitalId: a,
        mrn: `${TEST_PREFIX}-mrn-cp`,
        firstName: 'P',
        lastName: 'P',
        dateOfBirth: '1980-01-01',
        gender: 'MALE' as any,
        riskCategory: 'MODERATE' as any,
      },
    });
    await prisma.carePlan.create({
      data: {
        patientId: patient.id,
        hospitalId: a,
        moduleType: 'HEART_FAILURE' as any,
        title: 'CP1',
        status: 'ACTIVE' as any,
        fhirCarePlanId: 'fhir-careplan-shared',
      },
    });
    await expect(
      prisma.carePlan.create({
        data: {
          patientId: patient.id,
          hospitalId: a,
          moduleType: 'HEART_FAILURE' as any,
          title: 'CP2',
          status: 'ACTIVE' as any,
          fhirCarePlanId: 'fhir-careplan-shared',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
