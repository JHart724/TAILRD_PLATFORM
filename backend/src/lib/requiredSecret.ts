/**
 * requiredSecret - the single way a provisioning script obtains a password.
 *
 * WHY THIS EXISTS, and why it has no default parameter. Three seed/provisioning scripts each shipped a
 * password literal in a PUBLIC repository:
 *
 *   backend/prisma/seed.ts:77          bcrypt.hash('demo123', 12)          - no env path at all
 *   backend/scripts/seedBSW.ts:37      process.env.DEMO_PASSWORD || 'Bsw2026!Tailrd'
 *   backend/scripts/createSuperAdmin.ts:22  --password arg, else 'TailrdAdmin2026!'
 *
 * The second and third are the instructive ones. `docs/PLATFORM_AUDIT_2026_04.md:119` records
 * "P2-AUTH-2: Hardcoded seed passwords" as `[x]` COMPLETE, naming those two files. What the remediation
 * actually did was add an env READ in front of the literal (seedBSW) and CHANGE the literal from
 * 'demo123!' to 'TailrdAdmin2026!' (createSuperAdmin). Both still ship a working default credential, so
 * the finding closed while the defect class survived by substitution - and `seed.ts`, which was never
 * named, was never touched.
 *
 * THE DESIGN CONCLUSION: `process.env.X || 'literal'` is not a fix, it is the defect wearing an env var.
 * A fallback that works is a credential. This helper therefore THROWS rather than returning anything,
 * and it is deliberately impossible to call with a default - there is no second parameter to pass one
 * to. `backend/tests/scripts/noDefaultCredentials.test.ts` is the mechanical backstop that stops the
 * class returning a third time, because the 2026-04 pass proves vigilance did not hold.
 *
 * NOT A SECRET STORE. This reads an environment variable an operator has set for a one-shot script run.
 * It does no validation of strength beyond a non-empty check, because the caller's own policy (the
 * 12-character rule the admin API enforces at `admin.ts:679`) is the authority on that, and duplicating
 * it here would create two rules that can drift apart.
 */

/** Thrown when a provisioning script is run without the operator supplying its password. */
export class MissingSecretError extends Error {
  constructor(public readonly varName: string, hint: string) {
    super(
      `${varName} is not set. This script provisions login credentials and will not invent one.\n` +
        `  Set it for this run only, e.g.:  ${varName}='<a password you choose>' <your command>\n` +
        `  ${hint}\n` +
        `  Do NOT add a default value in code - see backend/src/lib/requiredSecret.ts for why.`,
    );
    this.name = 'MissingSecretError';
  }
}

/**
 * Read a required password from the environment, or throw.
 *
 * There is intentionally no `fallback` parameter. Adding one would reintroduce exactly the
 * `process.env.X || 'literal'` shape this module exists to eliminate.
 */
export function requiredSecret(varName: string, hint: string): string {
  const raw = process.env[varName];
  if (raw === undefined || raw.trim() === '') {
    throw new MissingSecretError(varName, hint);
  }
  return raw;
}
