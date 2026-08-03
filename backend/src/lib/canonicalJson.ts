/**
 * Canonical JSON stringify + content hashing for runtime (`src/`) consumers.
 *
 * WHY THIS EXISTS AS A SECOND COPY. The canonical audit pipeline already has a `stableStringify` at
 * `backend/scripts/auditCanonical/lib/utils.ts`, but that is a SCRIPTS path: importing scripts -> src
 * is the wrong dependency direction, and `src/` needs stable stringification at runtime for the
 * TrialMatch `criteriaVersion` content hash (design doc R1).
 *
 * The alternative was relocating the canonical implementation into `src/lib/` and importing it back
 * from scripts. That was REJECTED for this PR on scope grounds: `stableStringify` has ten-plus
 * importers across the canonical pipeline - the machinery that gates every source-changing PR through
 * CI Gates 2/3/4/5 - and dragging that refactor into a schema+runner change is exactly the unrelated
 * blast radius section 17.3 tells us not to bundle. Relocation stays available as its own PR if a
 * third consumer appears.
 *
 * DUPLICATION IS MADE SAFE BY MECHANISM, NOT BY HOPE: `canonicalJsonParity.test.ts` imports BOTH
 * implementations and asserts byte-identical output over shared fixtures, so a divergence fails CI
 * rather than drifting silently. That test is the reason this file is allowed to exist.
 */

import { createHash } from 'crypto';

/**
 * Stringify with stable key ordering. Recursively sorts object keys alphabetically.
 * Arrays preserve caller-supplied order (caller responsible for sorting where appropriate).
 *
 * Trailing newline ensured for POSIX-friendly diffs.
 *
 * BYTE-IDENTICAL to `backend/scripts/auditCanonical/lib/utils.ts#stableStringify` - see the parity
 * test. Any edit here must be mirrored there (or the parity test will fail, which is the point).
 */
export function stableStringify(value: unknown, indent = 2): string {
  const seen = new WeakSet();
  function sortKeys(v: unknown): unknown {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(sortKeys);
    if (seen.has(v as object)) {
      throw new Error('stableStringify: circular reference detected');
    }
    seen.add(v as object);
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((v as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return JSON.stringify(sortKeys(value), null, indent) + '\n';
}

/** Length of the hex digest kept for `criteriaVersion`. 16 hex chars = 64 bits. */
export const CRITERIA_HASH_LENGTH = 16;

/**
 * `criteriaVersion` for a trial: a CONTENT HASH of its structured criteria (design doc R1).
 *
 * A content hash rather than a bumped integer because a bumped integer depends on a writer
 * remembering to bump it - documented discipline standing in for a mechanism, which is the failure
 * DRIFT-58 exists to name. The hash cannot drift from the content, because it IS the content.
 *
 * Key ordering and whitespace are neutralized by `stableStringify`, so a semantically-identical
 * criteria array always hashes the same regardless of how it was serialized upstream.
 *
 * Truncated to 64 bits: this is a CHANGE DETECTOR, not a security primitive. Collision probability is
 * negligible at the scale of curated trials (tens), and a short hash keeps stored rows readable when
 * a human is reading provenance during an investigation.
 */
export function criteriaHash(criteria: unknown): string {
  return createHash('sha256')
    .update(stableStringify(criteria))
    .digest('hex')
    .slice(0, CRITERIA_HASH_LENGTH);
}
