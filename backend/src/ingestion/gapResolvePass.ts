/**
 * AUDIT-223 resolve semantics - the guarded deactivate pass, shared by BOTH gap runners.
 *
 * Until now the runners were append-only: a stored gap whose rule stopped firing stayed open forever, so the
 * clinician-facing open-gap surface OVER-REPORTED (retired rules, corrected conditions, aged-out windows).
 * `gapFlagsResolved` was declared and never incremented - a dead field.
 *
 * This pass closes that, and is only safe BECAUSE AUDIT-222 gave the write path a trustworthy identity: you
 * can only assert "this rule no longer fires for this patient" if you can match stored rows to rules. Under
 * the old `gapType::module` key the runner could not distinguish "a sibling relabelled this row" from "this
 * rule stopped firing", so resolving would have mass-closed siblings.
 *
 * THE SAFETY PROPERTIES (append-only is no longer one of them):
 *   1. NEVER resolve a clinician-touched row - `resolvedBy IS NOT NULL`. See the guard note below.
 *   2. NEVER delete. Resolution is an UPDATE; the row and its original status text survive.
 *   3. ABORT below the completeness fraction rather than resolve on partial evaluation (AUDIT-193 class).
 *   4. Every resolution records a REASON with the two-clock discriminator (clock vs state).
 *   5. Every run leaves a durable GapDetectionRun record (AUDIT-224).
 *
 * See docs/audit/AUDIT_222_223_JOINT_DESIGN.md sections 5 and 10.
 */
import { SYSTEM_ACTOR_PREFIX } from '../services/gapResolutionActor';

/** The actor recorded when a run resolves a gap its rule no longer fires. Reserved `system:` prefix. */
export const RESOLVE_ACTOR = 'system:audit-223-no-longer-detected' as const;

/** Machine-recognizable marker opening the resolution suffix appended to currentStatus. */
export const RESOLVE_MARKER = ' [RESOLVED ' as const;

/**
 * AUDIT-193 class. Mirrors patientWriter's COMPLETENESS_MIN_FRACTION: if a run evaluates materially fewer
 * patients than the tenant holds, something truncated the run and resolving would mass-close live gaps.
 */
export const COMPLETENESS_MIN_FRACTION = 0.9;

/**
 * Two-clock discriminator.
 *
 * `buildPatientEvalContext(patient, nowMs)` is a pure function of the patient's rows and a clock, so
 * evaluating the SAME rows at two clocks isolates the clock's contribution EXACTLY:
 *   - fired at the row's identifiedAt but not now -> `clock` (a staleness window moved past the observation)
 *   - fired at neither                            -> `state` (the data no longer supports the rule; it fired
 *                                                     at creation because the data was different then)
 *
 * These are different clinical facts - "this aged out of a window" is not "a clinician fixed this" - and are
 * deliberately NOT collapsed into a single "no longer applicable".
 */
export type ResolveReason = 'clock' | 'state';

export function classifyResolveReason(firedAtIdentifiedAt: boolean): ResolveReason {
  return firedAtIdentifiedAt ? 'clock' : 'state';
}

/**
 * THE PRESERVATION GUARD, and the subtle part of this whole design.
 *
 * It keys on `resolvedBy`, NOT on `resolvedAt`. `routes/gaps.ts` is the only clinician write site and it sets
 * `resolvedBy` for ALL FOUR actions but sets `resolvedAt` only for INITIATED/CONTRAINDICATED - explicitly
 * null for REFERRED and DEFERRED. So a deferred or referred gap is STILL OPEN yet clinician-touched. A guard
 * keyed on `resolvedAt` would auto-resolve gaps a clinician deliberately deferred, which is precisely the
 * harm this pass must not cause.
 */
export function isClinicianTouched(resolvedBy: string | null | undefined): boolean {
  if (!resolvedBy) return false;
  return !resolvedBy.startsWith(SYSTEM_ACTOR_PREFIX);
}

/** Append the resolution suffix, preserving the original status text verbatim. Shape-idempotent. */
export function resolvedStatus(original: string, reason: ResolveReason, onDate: string): string {
  if (original.includes(RESOLVE_MARKER)) return original;
  const why =
    reason === 'clock'
      ? 'rule no longer fires: staleness window elapsed (clock)'
      : 'rule no longer fires: patient data no longer supports it (state)';
  return `${original}${RESOLVE_MARKER}${onDate}: ${why}]`;
}

export interface StoredOpenRow {
  id: string;
  ruleId: string | null;
  currentStatus: string;
  identifiedAt: Date;
  resolvedBy: string | null;
}

export interface ResolveTarget {
  id: string;
  ruleId: string;
  currentStatus: string;
  identifiedAt: Date;
}

/**
 * Select the rows this patient's evaluation says should close: stored, OPEN, ATTRIBUTED, not clinician-touched,
 * and whose ruleId is absent from the freshly detected set. NULL-ruleId rows are never eligible - they have no
 * identity to reason about (AUDIT-222 orphan semantics).
 */
export function selectResolveTargets(
  storedOpenRows: readonly StoredOpenRow[],
  detectedRuleIds: ReadonlySet<string>,
): ResolveTarget[] {
  const out: ResolveTarget[] = [];
  for (const r of storedOpenRows) {
    if (!r.ruleId) continue;
    if (isClinicianTouched(r.resolvedBy)) continue;
    if (detectedRuleIds.has(r.ruleId)) continue;
    out.push({ id: r.id, ruleId: r.ruleId, currentStatus: r.currentStatus, identifiedAt: r.identifiedAt });
  }
  return out;
}

export interface CompletenessVerdict {
  fraction: number;
  ok: boolean;
  message?: string;
}

/**
 * Gate the resolve pass on evaluation completeness. Returns a verdict rather than throwing so the caller can
 * record it on the run record and still complete its create/update work - resolving is the only thing that
 * must be withheld on a truncated run.
 */
export function evaluateCompleteness(evaluated: number, storedPatients: number): CompletenessVerdict {
  if (storedPatients === 0) return { fraction: 1, ok: true };
  const fraction = evaluated / storedPatients;
  if (fraction < COMPLETENESS_MIN_FRACTION) {
    return {
      fraction,
      ok: false,
      message:
        `GapResolveCompletenessError: evaluated ${evaluated} of ${storedPatients} stored patients ` +
        `(${(fraction * 100).toFixed(1)}%), below ${COMPLETENESS_MIN_FRACTION * 100}%. Resolve pass WITHHELD ` +
        `to avoid mass false-resolution on a truncated run; creates and updates still applied.`,
    };
  }
  return { fraction, ok: true };
}
