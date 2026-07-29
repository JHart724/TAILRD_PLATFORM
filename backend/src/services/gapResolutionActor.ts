/**
 * Gap resolution ACTOR conventions - who closed a therapy gap, and which closures count as clinical work.
 *
 * `TherapyGap.resolvedAt` is set by two very different things:
 *   1. A CLINICIAN action (routes/gaps.ts) - a human decided INITIATED / CONTRAINDICATED. This is clinical
 *      throughput and belongs in closure-rate, module-health, and captured-opportunity figures.
 *   2. A SYSTEM action - e.g. the AUDIT-222 retirement of rows whose rule the engine has retired. This is
 *      housekeeping. Counting it as a closure would credit the care team with work nobody did.
 *
 * The discriminator is `resolvedBy`. The `system:` PREFIX IS RESERVED for non-human actors and must never be
 * used for a real user id. Existing system writers already follow it (`system:proc-backfill`,
 * `system:ruleid-backfill`, `system:baa-guard`).
 *
 * Any metric that presents resolution as CLINICAL ACHIEVEMENT must filter with `clinicianResolvedWhere`.
 * See docs/audit/AUDIT_222_223_JOINT_DESIGN.md section 9.
 */
import { Prisma } from '@prisma/client';

/** Reserved prefix for non-human resolution actors. Never assign this to a user id. */
export const SYSTEM_ACTOR_PREFIX = 'system:' as const;

/** The actor recorded by the AUDIT-222 consolidation-orphan retirement. */
export const RETIREMENT_ACTOR = 'system:audit-222-retirement' as const;

/** Machine-recognizable marker opening the retirement suffix appended to currentStatus. */
export const RETIREMENT_MARKER = ' [RETIRED ' as const;

/**
 * Narrow a TherapyGap where-clause to CLINICIAN-resolved rows only.
 *
 * NULL handling is the subtle part and is deliberate: a plain `resolvedBy: { not: { startsWith: 'system:' } }`
 * compiles to `NOT (resolvedBy LIKE 'system:%')`, which is NULL - and therefore FALSE - for rows whose
 * resolvedBy is NULL. Legacy clinician closures and the data-request purge path (routes/dataRequests.ts) do
 * leave resolvedBy NULL, so that naive form would silently DROP real closures. The explicit OR keeps them.
 *
 * @throws if the base clause already carries a top-level OR, which this would otherwise clobber.
 */
export function clinicianResolvedWhere(
  base: Prisma.TherapyGapWhereInput,
): Prisma.TherapyGapWhereInput {
  if (base.OR !== undefined) {
    throw new Error(
      'clinicianResolvedWhere: base clause already has a top-level OR; compose with AND instead of spreading.',
    );
  }
  return {
    ...base,
    OR: [
      { resolvedBy: null },
      { resolvedBy: { not: { startsWith: SYSTEM_ACTOR_PREFIX } } },
    ],
  };
}

/** True when this resolution actor is a system (non-human) writer. */
export function isSystemActor(resolvedBy: string | null | undefined): boolean {
  return typeof resolvedBy === 'string' && resolvedBy.startsWith(SYSTEM_ACTOR_PREFIX);
}
