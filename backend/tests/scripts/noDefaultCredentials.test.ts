/**
 * AUDIT-236 - no provisioning script may ship a default credential.
 *
 * WHY A TEST AND NOT A CODE REVIEW. This defect class was already found and already closed once.
 * `docs/PLATFORM_AUDIT_2026_04.md:119` records "P2-AUTH-2: Hardcoded seed passwords" as `[x]` COMPLETE,
 * naming `seedBSW.ts` and `createSuperAdmin.ts`. What that remediation actually did:
 *
 *   seedBSW.ts          'Bsw2026!Tailrd'  ->  process.env.DEMO_PASSWORD || 'Bsw2026!Tailrd'
 *   createSuperAdmin.ts 'demo123!'        ->  'TailrdAdmin2026!'
 *
 * One gained an env read in front of the literal; the other swapped one literal for another. Both still
 * produced a working login with no operator input, and `prisma/seed.ts` - which the finding never named -
 * kept `bcrypt.hash('demo123', 12)` untouched. The finding closed; the class did not.
 *
 * So vigilance has a measured failure rate of 1.0 on this class in this repo. The durable answer is the
 * one AUDIT-208 reached for invariant coverage generally: a mechanical check that fails CI. This runs in
 * the default Jest suite.
 *
 * WHAT IT ASSERTS, and the reasoning behind each:
 *
 *  1. No `process.env.X || 'literal'` (or `??`) anywhere in the provisioning surface. This is the exact
 *     shape the 2026-04 pass introduced while believing it was the fix. A fallback that works IS a
 *     credential, so the ONLY acceptable shape is one that throws.
 *  2. No password-shaped assignment to a string literal. Catches the createSuperAdmin substitution
 *     without needing to know the next literal anyone picks.
 *  3. The three known sites specifically go through `requiredSecret`. Named because they are the sites
 *     that have already regressed once, and a generic rule cannot express "this file in particular must
 *     not lose its guard".
 *  4. The retired literals do not reappear anywhere in `backend/`. Deliberately NOT extended to `docs/`:
 *     the historical audit records that document this defect legitimately quote the literals, and a
 *     check that forbade naming them would make the defect undocumentable. See the exposure note in the
 *     AUDIT-236 register entry - the literals are permanently in public git history regardless, so the
 *     value here is preventing REINTRODUCTION into shipped code, not scrubbing the word.
 *
 * SCOPE HONESTY: this covers `backend/prisma/**` and `backend/scripts/**`, the provisioning surface. It
 * is not a general secret scanner and does not claim to be one; GitHub push protection and the Security
 * Audit CI job cover the broader case.
 */
import * as fs from 'fs';
import * as path from 'path';

const BACKEND = path.resolve(__dirname, '..', '..');

/** Files that provision accounts. Adding a provisioning script means adding it here. */
const PROVISIONING_FILES = [
  path.join(BACKEND, 'prisma', 'seed.ts'),
  path.join(BACKEND, 'scripts', 'seedBSW.ts'),
  path.join(BACKEND, 'scripts', 'createSuperAdmin.ts'),
];

/** Strip line and block comments so the explanatory prose in these files does not self-trip the rules. */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function read(p: string): string {
  return codeOnly(fs.readFileSync(p, 'utf-8'));
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== 'migrations') walk(full, out);
    } else if (e.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

const PROVISIONING_SURFACE = [
  ...walk(path.join(BACKEND, 'prisma')),
  ...walk(path.join(BACKEND, 'scripts')),
];

describe('AUDIT-236: no provisioning script ships a default credential', () => {
  it('no `process.env.<SECRET> || "literal"` fallback anywhere in the provisioning surface', () => {
    // The 2026-04 "fix" shape. Matches || and ?? against a quoted literal.
    const FALLBACK =
      /process\.env\.[A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|CREDENTIAL|PASS)[A-Z0-9_]*\s*(?:\|\||\?\?)\s*['"`]/;
    const offenders = PROVISIONING_SURFACE.filter(f => FALLBACK.test(read(f))).map(f =>
      path.relative(BACKEND, f),
    );
    expect(offenders).toEqual([]);
  });

  it('no password-shaped identifier is assigned a bare string literal', () => {
    // Catches `const password = 'Whatever2026!'` and the ternary-default form, which is how
    // createSuperAdmin.ts regressed. Empty strings are allowed (they are not credentials).
    const LITERAL =
      /(?:const|let|var)\s+\w*(?:password|passwd|pwd|secret)\w*\s*(?::\s*string\s*)?=\s*['"`][^'"`\n]+['"`]/i;
    const TERNARY_DEFAULT =
      /\?\s*[^\n:]+:\s*['"`][^'"`\n]{4,}['"`]\s*;?\s*$/;
    const offenders: string[] = [];
    for (const f of PROVISIONING_SURFACE) {
      const src = read(f);
      const rel = path.relative(BACKEND, f);
      if (LITERAL.test(src)) offenders.push(`${rel} (literal assignment)`);
      for (const line of src.split('\n')) {
        if (/password/i.test(line) && TERNARY_DEFAULT.test(line)) {
          offenders.push(`${rel} (ternary default: ${line.trim()})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('each known provisioning file obtains its password via requiredSecret', () => {
    for (const f of PROVISIONING_FILES) {
      const rel = path.relative(BACKEND, f);
      expect(fs.existsSync(f) ? rel : `MISSING:${rel}`).toBe(rel);
      expect(`${rel}:${read(f).includes('requiredSecret(')}`).toBe(`${rel}:true`);
    }
  });

  it('the retired literals do not reappear in shipped backend code', () => {
    // Scoped to backend/ ONLY. docs/ legitimately quotes these while documenting the finding.
    const RETIRED = ['demo123', 'Bsw2026!Tailrd', 'TailrdAdmin2026!', 'demo123!'];
    const files = [...walk(path.join(BACKEND, 'src')), ...PROVISIONING_SURFACE].filter(
      f => !f.includes('noDefaultCredentials'),
    );
    const offenders: string[] = [];
    for (const f of files) {
      const src = read(f);
      for (const lit of RETIRED) {
        if (src.includes(lit)) offenders.push(`${path.relative(BACKEND, f)} contains ${lit}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('requiredSecret throws rather than returning a fallback, and takes no default parameter', () => {
    // The API-shape assertion. If someone adds a `fallback` parameter, this fails - which is the point:
    // the helper's safety is structural, not conventional.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requiredSecret, MissingSecretError } = require('../../src/lib/requiredSecret');
    expect(requiredSecret.length).toBe(2); // (varName, hint) - no third slot for a default

    delete process.env.AUDIT236_PROBE;
    expect(() => requiredSecret('AUDIT236_PROBE', 'probe')).toThrow(MissingSecretError);

    process.env.AUDIT236_PROBE = '   ';
    expect(() => requiredSecret('AUDIT236_PROBE', 'probe')).toThrow(MissingSecretError);

    process.env.AUDIT236_PROBE = 'a-real-value';
    expect(requiredSecret('AUDIT236_PROBE', 'probe')).toBe('a-real-value');
    delete process.env.AUDIT236_PROBE;
  });

  it('seed.ts does not echo the password to stdout', () => {
    const src = read(path.join(BACKEND, 'prisma', 'seed.ts'));
    const echoes = src
      .split('\n')
      .filter(l => /console\.log/.test(l) && /Password:\s*\S/i.test(l));
    expect(echoes).toEqual([]);
  });
});
