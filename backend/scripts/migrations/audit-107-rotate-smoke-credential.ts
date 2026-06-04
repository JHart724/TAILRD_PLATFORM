/**
 * audit-107-rotate-smoke-credential.ts - rotate the burned smoke/verification
 * account password (AUDIT-107). The prior credential appeared in diagnostics /
 * chat / logs and is burned; this sets a fresh bcrypt hash on the account.
 *
 * SECRET DISCIPLINE: the new password is read from the SMOKE_NEW_PASSWORD env
 * var (operator-supplied at run-task time) and is NEVER logged, NEVER echoed,
 * NEVER written to repo. The account email is read from SMOKE_TEST_EMAIL (a
 * GitHub secret) and is also NOT logged by value. The script logs only
 * located:yes/no and rowsUpdated:N.
 *
 * EXECUTION: ECS run-task command override on the production image (census /
 * backfill precedent); never from a developer machine. After rotation the
 * operator updates the SMOKE_TEST_* GitHub secrets to the new value and
 * workflow_dispatches the smoke to confirm Login green end-to-end (runbook).
 *
 * GATES:
 *   --dry-run (default)  locate the account by SMOKE_TEST_EMAIL; report
 *                        located:yes/no; NO write.
 *   --execute            bcrypt-hash SMOKE_NEW_PASSWORD + raw UPDATE the
 *                        passwordHash. Requires AUDIT_107_ROTATE_CONFIRMED=yes
 *                        AND a non-empty SMOKE_NEW_PASSWORD. DEMO_MODE declines.
 *
 * Usage:
 *   npx tsx backend/scripts/migrations/audit-107-rotate-smoke-credential.ts --dry-run
 *   AUDIT_107_ROTATE_CONFIRMED=yes SMOKE_NEW_PASSWORD='<operator-supplied>' \
 *     npx tsx backend/scripts/migrations/audit-107-rotate-smoke-credential.ts --execute
 *
 * Exit codes: 0 ok; 1 gate/pre-flight failure or account not found; 2 runtime error.
 */

import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';

export interface CliOptions { execute: boolean; }

export function parseArgs(argv: string[]): CliOptions {
  let execute = false;
  for (const a of argv) {
    if (a === '--execute') execute = true;
    else if (a === '--dry-run') execute = false;
  }
  return { execute };
}

export interface PreFlight { ok: boolean; errors: string[]; }

export function preFlightValidate(env: NodeJS.ProcessEnv = process.env): PreFlight {
  const errors: string[] = [];
  if (env.DEMO_MODE === 'true') errors.push('DEMO_MODE=true is incompatible with --execute.');
  if (!env.SMOKE_TEST_EMAIL) errors.push('SMOKE_TEST_EMAIL is required (the account to rotate).');
  if (!env.SMOKE_NEW_PASSWORD) errors.push('SMOKE_NEW_PASSWORD is required for --execute (operator-supplied; never logged).');
  else if (env.SMOKE_NEW_PASSWORD.length < 12) errors.push('SMOKE_NEW_PASSWORD must be at least 12 characters.');
  return { ok: errors.length === 0, errors };
}

export function checkRotateConfirmation(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AUDIT_107_ROTATE_CONFIRMED === 'yes';
}

async function locate(email: string): Promise<{ id: string } | null> {
  // Case-insensitive match, mirroring the login lookup (auth.ts findFirst insensitive).
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
    email,
  );
  return rows[0] ?? null;
}

async function main(): Promise<number> {
  const opts = parseArgs(process.argv.slice(2));
  const email = process.env.SMOKE_TEST_EMAIL;

  if (!email) {
    console.error('SMOKE_TEST_EMAIL not set; cannot locate the account.');
    return 1;
  }

  // Locate (read-only) for both modes; never log the email value.
  const acct = await locate(email);
  console.log(`Account located by SMOKE_TEST_EMAIL: ${acct ? 'yes' : 'no'}`);
  if (!acct) {
    console.error('No account matched SMOKE_TEST_EMAIL. Provision the smoke account first (runbook).');
    return 1;
  }

  if (!opts.execute) {
    console.log('DRY-RUN: would rotate the located account passwordHash. No write performed.');
    return 0;
  }

  const pf = preFlightValidate();
  if (!pf.ok) {
    console.error('Pre-flight FAILED:');
    pf.errors.forEach((e) => console.error(`  - ${e}`));
    return 1;
  }
  if (!checkRotateConfirmation()) {
    console.error('--execute requires AUDIT_107_ROTATE_CONFIRMED=yes in the environment.');
    return 1;
  }

  const newPassword = process.env.SMOKE_NEW_PASSWORD as string;
  const hash = await bcrypt.hash(newPassword, 12); // never logged
  const updated = await prisma.$executeRawUnsafe(
    'UPDATE users SET "passwordHash" = $1 WHERE id = $2',
    hash,
    acct.id,
  );
  console.log(`Rotation complete. rowsUpdated: ${updated}`);
  console.log('NEXT (operator-side, runbook): update SMOKE_TEST_PASSWORD secret to the new value + workflow_dispatch the smoke.');
  return updated === 1 ? 0 : 1;
}

if (require.main === module) {
  main()
    .then((code) => prisma.$disconnect().then(() => process.exit(code)))
    .catch((e) => {
      console.error('FATAL:', (e as Error).message);
      prisma.$disconnect().finally(() => process.exit(2));
    });
}
