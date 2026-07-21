/**
 * C2 / AUDIT_METHODOLOGY section 23 (measurement-validity): the register OPEN count,
 * DERIVED not hand-counted.
 *
 * The prior BUILD_STATE figure of 80 was not reproducible and its own documented arithmetic
 * was self-contradictory (it claimed "naive parse 83, minus 6 addenda = 80", but 83 - 6 = 77).
 * Four different reconstruction rules yielded four different numbers (195 / 92 / 54 / 51). Per
 * section 23 the fix is to DEFINE the measurement precisely and let a script be the source of
 * truth - the same durable-answer pattern as checkTsNocheck.ts (AUDIT-204).
 *
 * CANONICAL RULE (operator-ratified 2026-07-21):
 *   An entry is OPEN iff its severity-index bullet carries an OPEN status token AND no dated
 *   RESOLVED / OBSOLETE addendum supersedes it. Each AUDIT id counts EXACTLY ONCE regardless of
 *   how many severity buckets it appears in (dedup by id).
 *
 * TWO STATUS CONVENTIONS coexist in the register (verified 2026-07-21) and the rule must honor both:
 *   - NEW (bold): `**OPEN**`, `**OPEN - PRODUCTION-READINESS GATE**`, `**OPEN-DEFERRED**`,
 *     `**RESOLVED 2026-07-15 ...**`, `[RESOLVED 2026-07-14 ...` addenda.
 *   - OLD (plain, in the trailing status parenthetical): `(Phase 1, OPEN)`, `(Phase 1, RESOLVED
 *     2026-05-27, PR #307)`, `(Phase 0A/0C frontend, REMEDIATED 2026-07-15 ...)`.
 *
 * OPEN status token (either convention): a bold `**OPEN...**` span (excluding the prose `**OPEN
 * QUESTION ...**`), OR a plain `OPEN` delimited as a status word by comma/paren (`, OPEN)` / `(OPEN)`).
 *
 * TERMINAL (superseding) status vocabulary: the operator's rule names RESOLVED/OBSOLETE; the register
 * organically uses SYNONYMS for the same terminal state, so the terminal set is EXTENDED (a stated
 * decision, reported at runtime) to: RESOLVED, OBSOLETE, CLOSED, REMEDIATED, RETIRED, FIXED, VERIFIED,
 * CONFIRMED-SOUND, SUPERSEDED, DUPLICATE, INVALID, REFUTED. A terminal marker supersedes an OPEN token
 * (filed-open-then-resolved -> NOT OPEN: AUDIT-139/197/205/206/201) when it appears as a status token:
 * bold `**TERM...**`, bracketed `[TERM ...`, dated `TERM YYYY-MM-DD`, or status-delimited `(..., TERM`.
 *
 * SUB-ID DECISION: each distinct `AUDIT-<token>` string is one id. Sub-ids (AUDIT-199-B,
 * AUDIT-199-B-BB, AUDIT-184-CAD-EXT, AUDIT-025-SLICE2, AUDIT-107-STAGING-GATE, ...) are counted as
 * distinct findings, matching how the register indexes them as their own bullets.
 *
 * The script is pure + testable (exported functions) with a CLI main(), mirroring checkTsNocheck.ts.
 * It only READS the register; it never writes. BUILD_STATE is updated by hand from its output, with
 * the canonical rule recorded verbatim alongside the number.
 */

import * as fs from 'fs';
import * as path from 'path';

const INDEX_START = '## Findings by severity';
const INDEX_END = '## Full findings detail';

const BULLET = /^- \*\*(AUDIT-[0-9A-Za-z-]+)\*\*/;
const HEADER = /^### (.+?)\s*$/;

// OPEN status token: bold **OPEN...** (excluding prose "**OPEN QUESTION...**"), OR plain OPEN in a
// status parenthetical - immediately after a comma/paren (only whitespace between), as a whole word.
// The trailing char varies in the register: ")", ";", ",", or " -" (e.g. "(Phase 1, OPEN)",
// "(Phase 2A, OPEN; ...)", "(..., OPEN - surfaced ...)"). Requiring OPEN to sit right after the
// comma/paren keeps prose like "(..., an OPEN gap ...)" from matching (that OPEN is not in status
// position). NOTE: distinct statuses DEPLOYED / IN PROGRESS are deliberately NOT OPEN tokens.
const OPEN_TOKEN = /\*\*OPEN\b(?!\s+QUESTION)[^*]*\*\*|[,(]\s*OPEN\b(?!\s+QUESTION)/;

// Terminal (superseding) status vocabulary - EXTENDED beyond the operator's literal RESOLVED/OBSOLETE
// to the synonyms the register actually uses (reported at runtime as a stated decision).
//
// A terminal marker supersedes an OPEN token ONLY when it appears as a STATUS TOKEN, detected in the
// three forms these markers actually take (verified against the live register): bold `**TERM`,
// bracketed addendum `[TERM`, or dated `TERM YYYY-MM-DD` (old convention `(Phase 1, RESOLVED 2026-...`).
//
// DELIBERATELY EXCLUDED: VERIFIED and FIXED. Both occur as PROSE ADJECTIVES here - `**VERIFIED ABSENT**`
// (AUDIT-211/215), `VERIFIED SAFE ... 2026-07-21` (AUDIT-217), "prod was fixed" (AUDIT-111) - never as a
// standalone resolution status, so admitting them wrongly closed live OPEN findings. Resolution in this
// register is always carried by RESOLVED (or a dated synonym), never by VERIFIED/FIXED alone.
export const TERMINAL_STATUSES: readonly string[] = [
  'RESOLVED', 'OBSOLETE', 'CLOSED', 'REMEDIATED', 'RETIRED', 'CONFIRMED-SOUND', 'SUPERSEDED',
];
const TERM_ALT = TERMINAL_STATUSES.join('|');
const SUPERSEDE = new RegExp(
  `\\*\\*(?:${TERM_ALT})\\b` +                    // bold      **RESOLVED / **REMEDIATED / ...
  `|\\[(?:${TERM_ALT})\\b` +                      // bracketed [RESOLVED 2026-07-14 ...
  `|\\b(?:${TERM_ALT})\\s+\\d{4}-\\d{2}-\\d{2}`,  // dated     RESOLVED 2026-05-27 (old-convention paren)
);
// Undated terminal VERDICT tokens for findings refuted/invalidated/duplicated at filing (no remediation
// date). Narrow to bold/bracket status position to avoid prose ("INVALID input", "DUPLICATE key").
const VERDICT_SUPERSEDE = /\*\*(?:REFUTED|DUPLICATE|INVALID)\b|\[(?:REFUTED|DUPLICATE|INVALID)\b/;

export interface BulletRecord {
  id: string;
  bucket: string;
  line: number; // 1-indexed line in the file
  hasOpenToken: boolean;
  superseded: boolean;
}

export interface CountResult {
  total: number;
  bySeverity: Record<string, number>;
  openIds: string[];
  duplicateIds: string[]; // ids appearing in more than one bucket (a register-hygiene smell)
  unclassifiedBullets: Array<{ id: string; bucket: string; line: number }>; // no OPEN token, no supersession
  bucketOrder: string[];
}

/** Slice the severity-index section (between INDEX_START and INDEX_END) and return one record per bullet. */
export function parseIndex(md: string): BulletRecord[] {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(INDEX_START));
  const end = lines.findIndex((l) => l.startsWith(INDEX_END));
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('registerOpenCount: could not locate the severity-index section boundaries.');
  }
  const records: BulletRecord[] = [];
  let bucket = '(none)';
  for (let i = start; i < end; i++) {
    const line = lines[i];
    const h = HEADER.exec(line);
    if (h) {
      bucket = h[1].trim();
      continue;
    }
    const b = BULLET.exec(line);
    if (b) {
      records.push({
        id: b[1],
        bucket,
        line: i + 1,
        hasOpenToken: OPEN_TOKEN.test(line),
        superseded: SUPERSEDE.test(line) || VERDICT_SUPERSEDE.test(line),
      });
    }
  }
  return records;
}

/**
 * Apply the canonical rule, deduping by id. An id is OPEN iff ANY of its bullets carries an OPEN
 * token AND NONE of its bullets is superseded. An OPEN id is assigned to the bucket of its first
 * open-token-bearing bullet.
 */
export function computeOpen(records: BulletRecord[]): CountResult {
  const byId = new Map<string, BulletRecord[]>();
  for (const r of records) {
    const arr = byId.get(r.id) ?? [];
    arr.push(r);
    byId.set(r.id, arr);
  }

  const bySeverity: Record<string, number> = {};
  const openIds: string[] = [];
  const duplicateIds: string[] = [];
  const unclassifiedBullets: Array<{ id: string; bucket: string; line: number }> = [];
  const bucketOrder: string[] = [];
  const seenBucket = new Set<string>();
  for (const r of records) {
    if (!seenBucket.has(r.bucket)) {
      seenBucket.add(r.bucket);
      bucketOrder.push(r.bucket);
    }
  }

  for (const [id, bullets] of byId) {
    const buckets = new Set(bullets.map((b) => b.bucket));
    if (buckets.size > 1) duplicateIds.push(id);

    const anyOpenToken = bullets.some((b) => b.hasOpenToken);
    const anySuperseded = bullets.some((b) => b.superseded);
    // Visibility: a bullet with neither an OPEN token nor a supersession marker is unclassified by
    // this rule (typically a bare **RESOLVED**-less / **IN_PROGRESS** / tombstone bullet). Report it
    // so nothing is silently dropped; it does NOT count as OPEN.
    for (const b of bullets) {
      if (!b.hasOpenToken && !b.superseded) {
        // Only flag if the id is not otherwise classified as OPEN via a sibling bullet.
        if (!anyOpenToken) unclassifiedBullets.push({ id, bucket: b.bucket, line: b.line });
        break;
      }
    }

    if (anyOpenToken && !anySuperseded) {
      openIds.push(id);
      const home = bullets.find((b) => b.hasOpenToken) ?? bullets[0];
      bySeverity[home.bucket] = (bySeverity[home.bucket] ?? 0) + 1;
    }
  }

  openIds.sort();
  duplicateIds.sort();
  return {
    total: openIds.length,
    bySeverity,
    openIds,
    duplicateIds,
    unclassifiedBullets,
    bucketOrder,
  };
}

export function runCount(registerPath: string): CountResult {
  const md = fs.readFileSync(registerPath, 'utf8');
  return computeOpen(parseIndex(md));
}

function main(): void {
  const registerPath = path.resolve(__dirname, '..', '..', 'docs', 'audit', 'AUDIT_FINDINGS_REGISTER.md');
  const r = runCount(registerPath);

  console.log(`[registerOpenCount] register: ${path.relative(process.cwd(), registerPath).split(path.sep).join('/')}`);
  console.log(`[registerOpenCount] canonical rule: OPEN iff bullet has an OPEN status token AND no dated RESOLVED/OBSOLETE addendum supersedes it; each id counted once.`);
  console.log(`[registerOpenCount] OPEN TOTAL: ${r.total}`);
  console.log('[registerOpenCount] per-severity split:');
  // Print in the register's own bucket order, then any stragglers.
  const printed = new Set<string>();
  for (const bucket of r.bucketOrder) {
    if (r.bySeverity[bucket] !== undefined) {
      console.log(`  ${bucket.padEnd(16)} ${r.bySeverity[bucket]}`);
      printed.add(bucket);
    }
  }
  for (const [bucket, n] of Object.entries(r.bySeverity)) {
    if (!printed.has(bucket)) console.log(`  ${bucket.padEnd(16)} ${n}`);
  }

  if (r.duplicateIds.length > 0) {
    console.warn(`[registerOpenCount] WARNING - ids appearing in >1 bucket (register-hygiene smell): ${r.duplicateIds.join(', ')}`);
  } else {
    console.log('[registerOpenCount] no duplicate-bucket ids.');
  }
  if (r.unclassifiedBullets.length > 0) {
    console.warn(`[registerOpenCount] NOTE - ${r.unclassifiedBullets.length} bullet(s) with neither OPEN token nor supersession (not counted as OPEN):`);
    for (const u of r.unclassifiedBullets) console.warn(`    ${u.id} @ line ${u.line} [${u.bucket}]`);
  }
}

if (require.main === module) main();
