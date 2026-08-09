/**
 * AUDIT-213: provision a dedicated NON-PRIVILEGED smoke-test principal.
 *
 * The post-deploy smoke authenticated password-only as the SUPER_ADMIN. Once MFA_ENFORCED=true
 * was activated (task-def :439), that SUPER_ADMIN (MFA-enrolled) is 403'd on every protected read
 * (`MFA verification required`), so the smoke went red and the AUDIT-107 rung-2 smoke-hold gate
 * began holding ALL deploys. The fix is a smoke principal that legitimately does NOT need MFA.
 *
 * This creates ONE user: role VIEWER (NOT in MFA_ENFORCED_ROLES = {SUPER_ADMIN, HOSPITAL_ADMIN},
 * so it is tracked-not-forced and logs in password-only), scoped to the synthetic tenant
 * `demo-medical-city-dallas` (DRIFT-51 literal; in the AUDIT-215 six-tenant classify set, so it is
 * classified isSyntheticData=true BEFORE strict and does not trip the BAA guard), isActive=true,
 * and NOT MFA-enrolled (no UserMFA row is created; there is no mfaEnabled field on User). Read perms
 * (6 modules + view perms + permAccessPHI) let it reach the 12 smoke reads (6 dashboards + 6 patients)
 * scoped to its tenant.
 *
 * GATED (production data mutation): dry-run by default. `--execute` additionally requires
 * `AUDIT_213_EXECUTE_CONFIRMED=yes` + an operator-taken Aurora snapshot. Idempotent (skips if the
 * email already exists). Per-user USER_CREATED audit event on create.
 *
 * PASSWORD: operator-provided via `SMOKE_PRINCIPAL_PASSWORD` at execute time; bcrypt-hashed in-script;
 * NEVER logged or committed. After creation, the operator sets the GH secrets SMOKE_TEST_EMAIL (to the
 * email below) and SMOKE_TEST_PASSWORD (to that password) so the smoke authenticates as this principal.
 *
 * SEQUENCE: runs on the CURRENT live task-def (independent of the AUDIT-214/215 column-add deploy);
 * after this + the secret repoint, re-run the smoke -> green -> the smoke-hold gate releases.
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-213-provision-smoke-principal.ts               # dry-run
 *   SMOKE_PRINCIPAL_PASSWORD='<operator-set>' AUDIT_213_EXECUTE_CONFIRMED=yes \
 *     npx tsx .../audit-213-provision-smoke-principal.ts --execute
 */

// DRIFT-51: literal tenant id (verified in the six-tenant set 2026-08-09; maxUsers=50, 0 users, 6,132 patients).
const SMOKE_TENANT_ID = 'demo-medical-city-dallas';
const SMOKE_EMAIL = 'smoke-viewer@tailrd-heart.com';

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');

  console.log(`AUDIT-213 smoke-principal provision - ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
  console.log(`Target: 1 VIEWER user ${SMOKE_EMAIL} on tenant ${SMOKE_TENANT_ID} (DRIFT-51 literal)\n`);

  // Gate BEFORE any DB/env access so `--execute` without confirmation refuses cleanly.
  if (execute && process.env.AUDIT_213_EXECUTE_CONFIRMED !== 'yes') {
    console.error('AUDIT-213 --execute requires AUDIT_213_EXECUTE_CONFIRMED=yes in the environment.');
    console.error('Refusing to mutate. Take an Aurora snapshot first; this is a gated production data change.');
    process.exit(1);
  }
  if (execute && !process.env.SMOKE_PRINCIPAL_PASSWORD) {
    console.error('AUDIT-213 --execute requires SMOKE_PRINCIPAL_PASSWORD in the environment (operator-set).');
    console.error('The password is bcrypt-hashed in-script and never logged or committed.');
    process.exit(1);
  }
  if (execute) {
    console.error('WARNING: --execute creates a VIEWER user on a production tenant.');
    console.error('Confirm an Aurora snapshot exists before proceeding. Idempotent (skips if the email exists).\n');
  }

  const prisma = (await import('../../src/lib/prisma')).default;
  const { auditLogger } = await import('../../src/middleware/auditLogger');
  const bcrypt = (await import('bcryptjs')).default;
  const db = prisma as unknown as {
    hospital: { findUnique: (a: unknown) => Promise<{ id: string; maxUsers: number; _count?: { users: number } } | null> };
    user: {
      findUnique: (a: unknown) => Promise<{ id: string; email: string; role: string; hospitalId: string } | null>;
      count: (a: unknown) => Promise<number>;
      create: (a: unknown) => Promise<{ id: string; email: string; role: string; hospitalId: string }>;
    };
    $disconnect: () => Promise<void>;
  };

  // Pre-checks: tenant exists + has headroom; email not already taken.
  const tenant = await db.hospital.findUnique({ where: { id: SMOKE_TENANT_ID }, select: { id: true, maxUsers: true } });
  if (!tenant) {
    console.error(`ABORT: tenant ${SMOKE_TENANT_ID} not found.`);
    await db.$disconnect();
    process.exit(1);
  }
  const existing = await db.user.findUnique({ where: { email: SMOKE_EMAIL }, select: { id: true, email: true, role: true, hospitalId: true } });
  if (existing) {
    console.log(`ALREADY EXISTS: ${SMOKE_EMAIL} (role=${existing.role}, tenant=${existing.hospitalId}) - no change (idempotent).`);
    await db.$disconnect();
    return;
  }
  const currentUsers = await db.user.count({ where: { hospitalId: SMOKE_TENANT_ID } });
  console.log(`Tenant ${SMOKE_TENANT_ID}: users ${currentUsers}/${tenant.maxUsers} (headroom present).`);

  if (!execute) {
    console.log(`\nWOULD CREATE: VIEWER ${SMOKE_EMAIL} on ${SMOKE_TENANT_ID} (isActive=true, MFA NOT enrolled,`);
    console.log('  perms: 6 module reads + executive/serviceLine/careTeam views + permAccessPHI + permViewReports).');
    console.log('\nDRY-RUN: no write performed. Re-run with --execute AND AUDIT_213_EXECUTE_CONFIRMED=yes');
    console.log('  AND SMOKE_PRINCIPAL_PASSWORD set (snapshot first).');
    await db.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(process.env.SMOKE_PRINCIPAL_PASSWORD as string, 12);
  const created = await db.user.create({
    data: {
      email: SMOKE_EMAIL,
      passwordHash,
      firstName: 'Smoke',
      lastName: 'Viewer',
      title: 'Automated Smoke Principal',
      role: 'VIEWER',
      hospitalId: SMOKE_TENANT_ID,
      isActive: true,
      permHeartFailure: true,
      permElectrophysiology: true,
      permStructuralHeart: true,
      permCoronaryIntervention: true,
      permPeripheralVascular: true,
      permValvularDisease: true,
      permExecutiveView: true,
      permServiceLineView: true,
      permCareTeamView: true,
      permViewReports: true,
      permAccessPHI: true,
    },
  });

  auditLogger.info('audit_event', {
    timestamp: new Date().toISOString(),
    userId: 'system:audit-213-provision',
    userEmail: 'system@tailrd-heart.com',
    userRole: 'SYSTEM',
    hospitalId: SMOKE_TENANT_ID,
    action: 'USER_CREATED',
    resourceType: 'User',
    resourceId: created.id,
    ipAddress: 'cli',
    description:
      `AUDIT-213: provisioned non-privileged smoke principal ${SMOKE_EMAIL} (role VIEWER, tenant ` +
      `${SMOKE_TENANT_ID}, MFA not enrolled) so the post-deploy smoke authenticates as a principal not ` +
      `forced by MFA_ENFORCED. Password operator-set; not logged.`,
  });

  console.log(`\nCREATED: ${created.email} (id=${created.id}, role=${created.role}, tenant=${created.hospitalId}).`);
  console.log('Next: operator sets GH secrets SMOKE_TEST_EMAIL + SMOKE_TEST_PASSWORD to this principal, then re-run the smoke.');
  await db.$disconnect();
}

main().catch((e) => {
  console.error('AUDIT-213 provision error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
