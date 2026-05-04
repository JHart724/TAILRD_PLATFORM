/**
 * Canonical schema types per docs/audit/AUDIT_METHODOLOGY.md §2.1.A and §2.1.B.
 *
 * Two artifacts:
 *   - SpecExtract  → docs/audit/canonical/<MODULE>.spec.json
 *   - CodeExtract  → docs/audit/canonical/<MODULE>.code.json
 *
 * Plus sidecar provenance:
 *   - SpecMeta     → <MODULE>.spec.meta.json
 *   - CodeMeta     → <MODULE>.code.meta.json
 *
 * Mechanical-extraction-only. No clinical inference. Audit author's classifications
 * live in <MODULE>.crosswalk.json (Phase 3+).
 */

// =============================================================================
// Module identity
// =============================================================================

export type ModuleCode = 'HF' | 'EP' | 'SH' | 'CAD' | 'VHD' | 'PV';

export type ModuleEnumName =
  | 'HEART_FAILURE'
  | 'ELECTROPHYSIOLOGY'
  | 'STRUCTURAL_HEART'
  | 'CORONARY_INTERVENTION'
  | 'VALVULAR_DISEASE'
  | 'PERIPHERAL_VASCULAR';

export interface ModuleConfig {
  /** Canonical module code used in audit docs (HF, EP, SH, CAD, VHD, PV). */
  readonly code: ModuleCode;
  /** Prisma ModuleType enum value (HEART_FAILURE, etc.). */
  readonly enumName: ModuleEnumName;
  /** CK v4.0 spec section identifier (e.g., "6.5"). */
  readonly specSection: string;
  /** Inclusive [start, end] line range in CK v4.0 spec file. */
  readonly specLineRange: readonly [number, number];
  /** Code-side prefix for registry IDs and evaluator names (e.g., "vd" for VHD's gap-vd-* rules). */
  readonly codePrefix: string;
  /** Spec-side ID prefix for GAP-{PREFIX}-NNN (e.g., "VHD" — NOT always equal to code.) */
  readonly specCodePrefix: string;
}

// =============================================================================
// Spec extract (§2.1.A)
// =============================================================================

export type Tier = 'T1' | 'T2' | 'T3';

export type SafetyTagCategory =
  | 'SAFETY'
  | 'CRITICAL'
  | 'CRITICAL_SAFETY'
  | 'SAFETY_PREFIX'
  | null;

/**
 * BSW pathway tags are extracted only when literally present in the spec gap text
 * (e.g., as `(P1)`, `(P2)`, `(P3)`, `(P4)`). The CK v4.0 spec rarely tags inline
 * but the audit framework records the pathway elsewhere; this field captures
 * literal cases only.
 */
export type BswPathwayTag = 'P1' | 'P2' | 'P3' | 'P4';

export interface SpecGap {
  readonly id: string;
  readonly specLine: number;
  readonly tier: Tier;
  readonly tierMarkerLiteral: string;
  readonly subcategory: string;
  readonly subcategoryHeaderLine: number;
  readonly name: string;
  readonly detectionLogic: string;
  readonly structuredDataElements: string;
  readonly domains: readonly string[];
  readonly phi: string;
  readonly bswPathwayTags: readonly BswPathwayTag[];
  readonly safetyTagLiteral: string | null;
  readonly safetyTagCategory: SafetyTagCategory;
}

export interface SpecSubcategory {
  readonly name: string;
  readonly headerLine: number;
  readonly gapCount: number;
}

export interface SpecExtract {
  readonly module: ModuleCode;
  readonly specSource: string;
  readonly specSection: string;
  readonly moduleHeaderLine: number;
  readonly totalGaps: number;
  readonly tierTotals: { readonly T1: number; readonly T2: number; readonly T3: number };
  readonly subcategories: readonly SpecSubcategory[];
  readonly gaps: readonly SpecGap[];
}

// =============================================================================
// Code extract (§2.1.B)
// =============================================================================

export type CommentPattern =
  | 'ID_NAME'
  | 'GAP_MOD_N'
  | 'GAP_N'
  | 'GAP_MOD_NAME'
  | 'ID_N';

export interface RegistryEntry {
  readonly id: string;
  readonly registryLine: number;
  readonly name: string | null;
  readonly guidelineSource: string | null;
  readonly classOfRecommendation: string | null;
  readonly levelOfEvidence: string | null;
  readonly lastReviewDate: string | null;
  readonly nextReviewDue: string | null;
}

export interface EvaluatorBlock {
  readonly name: string;
  readonly commentLine: number;
  readonly commentLiteral: string;
  readonly commentPattern: CommentPattern;
  readonly bodyStartLine: number;
  readonly bodyEndLine: number;
  readonly gapsPushIds: readonly string[];
}

export interface CodeExtract {
  readonly module: ModuleCode;
  readonly codeSource: string;
  readonly registry: readonly RegistryEntry[];
  readonly evaluatorBlocks: readonly EvaluatorBlock[];
  readonly gapsPushCount: number;
  readonly moduleTagPattern: string;
}

// =============================================================================
// Sidecar provenance
// =============================================================================

export interface ExtractMeta {
  readonly module: ModuleCode;
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly extractorVersion: string;
  readonly extractorScript: string;
  readonly sourceSha256: string;
}

// =============================================================================
// Errors (structured, never silent defaults)
// =============================================================================

/** Thrown when the brace-balanced walker can't find a matching closing brace. */
export class UnbalancedBraceError extends Error {
  constructor(
    message: string,
    public readonly commentLine: number,
    public readonly blockName: string,
    public readonly searchStart: number,
    public readonly searchEnd: number,
  ) {
    super(message);
    this.name = 'UnbalancedBraceError';
  }
}

/** Thrown when a spec table cell has a tier marker that isn't T1/T2/T3. */
export class InvalidTierError extends Error {
  constructor(
    message: string,
    public readonly specLine: number,
    public readonly observedTier: string,
  ) {
    super(message);
    this.name = 'InvalidTierError';
  }
}

/** Thrown when the spec gap count for a subcategory doesn't match the header's literal. */
export class SubcategoryCountMismatchError extends Error {
  constructor(
    message: string,
    public readonly subcategoryName: string,
    public readonly expectedCount: number,
    public readonly actualCount: number,
  ) {
    super(message);
    this.name = 'SubcategoryCountMismatchError';
  }
}
