/**
 * renderAddendum.ts — generate <MODULE>_AUDIT_ADDENDUM.md from canonical inputs.
 *
 * Per AUDIT_METHODOLOGY.md §11 hierarchy:
 *   §1 Summary                            (generated)
 *   §2 Coverage by classification         (generated)
 *   §3 Coverage by tier                   (generated)
 *   §4 Per-subcategory breakdown          (generated)
 *   §4.5 T1 SPEC_ONLY work items          (generated)
 *   §4.6 EXTRA rules + architectural patterns  (generated)
 *   §5 Tier 1 priority gaps surfaced      (generated)
 *   §6 Implementation notes
 *     §6.1 EXTRA rules detail             (generated)
 *     §6.2 BSW ROI pathway implications   (generated)
 *     §6.3 Strategic posture              (hand-authored, from crosswalk.strategicPosture)
 *   §7 Working hypothesis verdict         (generated)
 *   §8 Implications for v2.0              (generated)
 *   §9 Module-specific findings           (generated, currently lightweight)
 *   §10 Cross-references                  (generated)
 *   §11 Cross-module synthesis (optional) (generated)
 *     §11.5 Sequencing notes              (hand-authored)
 *   §12 Lessons learned                   (hand-authored)
 *   §13 Wall-clock empirical entry        (generated, from crosswalk metadata)
 *   §14 Audit verdict                     (generated)
 *   §15 Methodology citation appendix     (generated, static)
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/renderAddendum.ts --module VHD
 *   npx tsx backend/scripts/auditCanonical/renderAddendum.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ModuleCode,
  SpecExtract,
  SpecGap,
  CodeExtract,
  Tier,
} from './lib/types';
import { Crosswalk, CrosswalkRow, Classification } from './crosswalkSchema';
import { ReconciliationResult } from './reconcile';
import {
  MODULE_CONFIGS,
  CANONICAL_OUTPUT_DIR,
  REPO_ROOT,
} from './lib/modules';

const MODULE_TITLES: Record<ModuleCode, string> = {
  HF: 'Heart Failure',
  EP: 'Electrophysiology',
  SH: 'Structural Heart',
  CAD: 'Coronary Artery Disease',
  VHD: 'Valvular Heart Disease',
  PV: 'Peripheral Vascular',
};

interface RenderContext {
  readonly module: ModuleCode;
  readonly spec: SpecExtract;
  readonly code: CodeExtract;
  readonly crosswalk: Crosswalk;
  readonly reconciliation: ReconciliationResult;
}

// =============================================================================
// Aggregate computations
// =============================================================================

interface ClassificationCounts {
  PRODUCTION_GRADE: number;
  DET_OK: number;
  PARTIAL_DETECTION: number;
  SPEC_ONLY: number;
}

function emptyCounts(): ClassificationCounts {
  return { PRODUCTION_GRADE: 0, DET_OK: 0, PARTIAL_DETECTION: 0, SPEC_ONLY: 0 };
}

function countByClassification(rows: readonly CrosswalkRow[]): ClassificationCounts {
  const c = emptyCounts();
  for (const r of rows) c[r.classification]++;
  return c;
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return ((n / total) * 100).toFixed(1) + '%';
}

function anyCoverageCount(c: ClassificationCounts): number {
  return c.PRODUCTION_GRADE + c.DET_OK + c.PARTIAL_DETECTION;
}

// =============================================================================
// §1 Summary
// =============================================================================

function renderSummary(ctx: RenderContext): string {
  const { module, spec, crosswalk } = ctx;
  const total = spec.totalGaps;
  const counts = countByClassification(crosswalk.rows);
  const t1Rows = crosswalk.rows.filter((r) => r.tier === 'T1');
  const t1Counts = countByClassification(t1Rows);

  const safetyRows = crosswalk.rows.filter((r) => {
    const sg = spec.gaps.find((g) => g.id === r.specGapId);
    return sg?.safetyTagCategory != null;
  });
  const safetyCovered = safetyRows.filter((r) => r.classification === 'DET_OK' || r.classification === 'PRODUCTION_GRADE').length;
  const safetyUncovered = safetyRows.length - safetyCovered;

  return [
    `# Phase 0B ${module} Audit Addendum — generated from canonical crosswalk`,
    '',
    `**Module:** ${MODULE_TITLES[module]} (${module})`,
    `**Spec source:** \`${spec.specSource}\` ${spec.specSection}`,
    `**Code source:** \`${ctx.code.codeSource}\` (registry=${ctx.code.registry.length}, evaluator=${ctx.code.evaluatorBlocks.length}, gapsPush=${ctx.code.gapsPushCount})`,
    `**Crosswalk:** \`docs/audit/canonical/${module}.crosswalk.json\` (auditMethod: ${crosswalk.auditMethod})`,
    `**Audit date:** ${crosswalk.auditDate}`,
    '',
    '## 1. Summary',
    '',
    `${MODULE_TITLES[module]} has **${total} spec gaps** across ${spec.subcategories.length} subcategories. ` +
      `Implementation: **${counts.DET_OK} DET_OK + ${counts.PARTIAL_DETECTION} PARTIAL + ${counts.SPEC_ONLY} SPEC_ONLY** ` +
      `(any-coverage: ${anyCoverageCount(counts)}/${total} = ${pct(anyCoverageCount(counts), total)}).`,
    '',
    `**Tier 1 priority status:** ${t1Counts.DET_OK} DET_OK + ${t1Counts.PARTIAL_DETECTION} PARTIAL + ${t1Counts.SPEC_ONLY} SPEC_ONLY ` +
      `of ${t1Rows.length} T1 gaps (T1 any-coverage: ${pct(anyCoverageCount(t1Counts), t1Rows.length)}).`,
    '',
    safetyRows.length > 0
      ? `**Spec-explicit SAFETY-tagged gaps:** ${safetyRows.length} total; ${safetyCovered} covered (DET_OK), ${safetyUncovered} uncovered. ` +
        (safetyUncovered > 0 ? `Uncovered SAFETY gaps qualify for Tier S triage queue per §6.3.` : `All SAFETY gaps covered.`)
      : `**Spec-explicit SAFETY-tagged gaps:** 0.`,
  ].join('\n');
}

// =============================================================================
// §2 Coverage by classification
// =============================================================================

function renderCoverageByClassification(ctx: RenderContext): string {
  const total = ctx.spec.totalGaps;
  const c = countByClassification(ctx.crosswalk.rows);
  const lines = [
    '## 2. Coverage by classification',
    '',
    '| Classification | Count | % of total |',
    '|---|---:|---:|',
    `| PRODUCTION_GRADE | ${c.PRODUCTION_GRADE} | ${pct(c.PRODUCTION_GRADE, total)} |`,
    `| DET_OK | ${c.DET_OK} | ${pct(c.DET_OK, total)} |`,
    `| PARTIAL_DETECTION | ${c.PARTIAL_DETECTION} | ${pct(c.PARTIAL_DETECTION, total)} |`,
    `| SPEC_ONLY | ${c.SPEC_ONLY} | ${pct(c.SPEC_ONLY, total)} |`,
    `| **Total** | **${total}** | **100.0%** |`,
    '',
    '**PRODUCTION_GRADE = 0** is platform-wide; gated on closure of AUDIT-001 P0 (test coverage gap). Per AUDIT_METHODOLOGY.md §3.1, no rule classifies PRODUCTION_GRADE until the platform testing baseline is established.',
  ];
  return lines.join('\n');
}

// =============================================================================
// §3 Coverage by tier
// =============================================================================

function renderCoverageByTier(ctx: RenderContext): string {
  const { spec, crosswalk } = ctx;
  const lines = [
    '## 3. Coverage by tier',
    '',
    '| Tier | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage % |',
    '|------|------:|-------:|--------:|----------:|---------------:|',
  ];
  for (const tier of ['T1', 'T2', 'T3'] as Tier[]) {
    const tierRows = crosswalk.rows.filter((r) => r.tier === tier);
    const c = countByClassification(tierRows);
    const total = spec.tierTotals[tier];
    lines.push(
      `| **${tier}** | ${total} | ${c.DET_OK} | ${c.PARTIAL_DETECTION} | ${c.SPEC_ONLY} | ${pct(anyCoverageCount(c), total)} |`,
    );
  }
  const allCounts = countByClassification(crosswalk.rows);
  lines.push(
    `| **Overall** | **${spec.totalGaps}** | **${allCounts.DET_OK}** | **${allCounts.PARTIAL_DETECTION}** | **${allCounts.SPEC_ONLY}** | **${pct(anyCoverageCount(allCounts), spec.totalGaps)}** |`,
  );
  return lines.join('\n');
}

// =============================================================================
// §4 Per-subcategory breakdown
// =============================================================================

function renderSubcategoryBreakdown(ctx: RenderContext): string {
  const { spec, crosswalk } = ctx;
  const rowsByGapId = new Map(crosswalk.rows.map((r) => [r.specGapId, r]));
  const lines = [
    '## 4. Per-subcategory breakdown',
    '',
    '| Subcategory | T1/T2/T3 | DET_OK | PARTIAL | SPEC_ONLY | Coverage |',
    '|---|---|---:|---:|---:|---:|',
  ];
  for (const subcat of spec.subcategories) {
    const subcatGaps = spec.gaps.filter((g) => g.subcategory === subcat.name);
    const subcatRows = subcatGaps.map((g) => rowsByGapId.get(g.id)!).filter(Boolean);
    const tierMix = {
      T1: subcatGaps.filter((g) => g.tier === 'T1').length,
      T2: subcatGaps.filter((g) => g.tier === 'T2').length,
      T3: subcatGaps.filter((g) => g.tier === 'T3').length,
    };
    const c = countByClassification(subcatRows);
    lines.push(
      `| ${subcat.name} (${subcat.gapCount}) | ${tierMix.T1}/${tierMix.T2}/${tierMix.T3} | ${c.DET_OK} | ${c.PARTIAL_DETECTION} | ${c.SPEC_ONLY} | ${pct(anyCoverageCount(c), subcatGaps.length)} |`,
    );
  }
  return lines.join('\n');
}

// =============================================================================
// §4.5 T1 SPEC_ONLY work items
// =============================================================================

function renderT1SpecOnly(ctx: RenderContext): string {
  const { spec, crosswalk } = ctx;
  const t1SpecOnlyGapIds = new Set(
    crosswalk.rows.filter((r) => r.tier === 'T1' && r.classification === 'SPEC_ONLY').map((r) => r.specGapId),
  );
  const items = spec.gaps.filter((g) => t1SpecOnlyGapIds.has(g.id));

  const lines = [
    '## 4.5 — T1 SPEC_ONLY work items (load-bearing for v2.0 Phase 1)',
    '',
  ];
  if (items.length === 0) {
    lines.push('No T1 SPEC_ONLY gaps. All Tier 1 priority gaps have at least PARTIAL detection coverage.');
    return lines.join('\n');
  }
  lines.push(
    `${items.length} T1 spec gaps with zero implementation. These are the load-bearing v2.0 Phase 1 work items for ${MODULE_TITLES[ctx.module]}.`,
    '',
    '| GAP-ID | Spec line | Subcategory | Detection Logic (excerpt) | Spec SAFETY | BSW pathway |',
    '|---|---:|---|---|---|---|',
  );
  for (const g of items) {
    const safetyDisplay = g.safetyTagLiteral ?? '—';
    const pathwayDisplay = g.bswPathwayTags.length > 0 ? g.bswPathwayTags.join(', ') : '—';
    const logicExcerpt = (g.detectionLogic || g.name).slice(0, 80) + ((g.detectionLogic || g.name).length > 80 ? '...' : '');
    lines.push(`| ${g.id} | ${g.specLine} | ${g.subcategory} | ${logicExcerpt} | ${safetyDisplay} | ${pathwayDisplay} |`);
  }
  return lines.join('\n');
}

// =============================================================================
// §4.6 EXTRA rules + architectural patterns
// =============================================================================

function renderExtras(ctx: RenderContext): string {
  const { code, crosswalk, reconciliation } = ctx;
  const lines = ['## 4.6 — EXTRA rules + architectural patterns', ''];

  // Registry-without-evaluator rules (orphans)
  if (reconciliation.registryOrphans.length > 0) {
    lines.push(
      `**Registry-without-evaluator (${reconciliation.registryOrphans.length}):** registry entries with no matching evaluator block body.`,
      '',
    );
    for (const o of reconciliation.registryOrphans) {
      lines.push(`- \`${o.registryId}\` (registry line ${o.registryLine}): ${o.reason}`);
    }
    lines.push('');
  }

  // Evaluator-without-registry blocks
  if (reconciliation.evaluatorOrphans.length > 0) {
    lines.push(
      `**Evaluator-without-registry (${reconciliation.evaluatorOrphans.length}):** evaluator blocks with no registry entry.`,
      '',
    );
    for (const o of reconciliation.evaluatorOrphans) {
      lines.push(`- \`${o.evaluatorBlockName}\` (line ${o.commentLine}): ${o.reason}`);
    }
    lines.push('');
  }

  // Naming convention mismatches
  if (reconciliation.namingMismatches.length > 0) {
    lines.push(
      `**Naming convention mismatches (${reconciliation.namingMismatches.length}):** registry IDs not following \`${reconciliation.namingMismatches[0].expectedPrefix}\` convention.`,
      '',
    );
    for (const m of reconciliation.namingMismatches) {
      lines.push(`- \`${m.registryId}\` (line ${m.registryLine}): expected prefix \`${m.expectedPrefix}\`, got \`${m.actualPrefix}\``);
    }
    lines.push('');
  }

  // Crosswalk extras (rules without spec backing)
  if (crosswalk.extras.length > 0) {
    lines.push(`**Implementation rules without spec backing (${crosswalk.extras.length}):**`, '');
    for (const e of crosswalk.extras) {
      lines.push(`- \`${e.registryId}\`: ${e.rationale}`);
    }
    lines.push('');
  }

  if (
    reconciliation.registryOrphans.length === 0 &&
    reconciliation.evaluatorOrphans.length === 0 &&
    reconciliation.namingMismatches.length === 0 &&
    crosswalk.extras.length === 0
  ) {
    lines.push('No EXTRA rules or architectural patterns surfaced. Reconciliation is clean.');
  }

  return lines.join('\n');
}

// =============================================================================
// §5 Tier 1 priority gaps surfaced
// =============================================================================

function renderT1Priority(ctx: RenderContext): string {
  const { crosswalk } = ctx;
  const t1Rows = crosswalk.rows.filter((r) => r.tier === 'T1');
  const lines = ['## 5. Tier 1 priority gaps surfaced', ''];
  lines.push(
    '| GAP-ID | Spec line | Class | Rule body cite | Notes |',
    '|---|---:|---|---|---|',
  );
  for (const r of t1Rows) {
    const cite = r.ruleBodyCite
      ? `\`${r.ruleBodyCite.registryId}\` (${r.ruleBodyCite.evaluatorBlockName} @${r.ruleBodyCite.evaluatorBodyLineRange[0]}-${r.ruleBodyCite.evaluatorBodyLineRange[1]})${r.ruleBodyCite.evaluatorModule !== ctx.module ? ` **[cross-module: ${r.ruleBodyCite.evaluatorModule}]**` : ''}`
      : '—';
    const notesExcerpt = (r.auditNotes || '').slice(0, 100).replace(/\|/g, '\\|');
    lines.push(`| ${r.specGapId} | ${r.specLine} | ${r.classification} | ${cite} | ${notesExcerpt} |`);
  }
  return lines.join('\n');
}

// =============================================================================
// §6 Implementation notes
// =============================================================================

function renderImplementationNotes(ctx: RenderContext): string {
  const lines = ['## 6. Implementation notes', ''];

  // §6.1 EXTRA rules detail (link to §4.6)
  lines.push('### 6.1 — EXTRA rules detail', '');
  if (ctx.crosswalk.extras.length === 0) {
    lines.push('See §4.6 for EXTRA rules + architectural patterns.');
  } else {
    lines.push('Detail of registry rules without spec backing:');
    for (const e of ctx.crosswalk.extras) {
      lines.push(`- **\`${e.registryId}\`**: ${e.rationale}`);
    }
  }
  lines.push('');

  // §6.2 BSW ROI pathway implications
  lines.push('### 6.2 — BSW ROI pathway implications', '');
  const t1SpecOnly = ctx.crosswalk.rows.filter((r) => r.tier === 'T1' && r.classification === 'SPEC_ONLY');
  const pathwayCounts: Record<string, number> = {};
  for (const r of t1SpecOnly) {
    const sg = ctx.spec.gaps.find((g) => g.id === r.specGapId);
    if (!sg) continue;
    for (const p of sg.bswPathwayTags) {
      pathwayCounts[p] = (pathwayCounts[p] || 0) + 1;
    }
  }
  const pathwayKeys = Object.keys(pathwayCounts).sort();
  if (pathwayKeys.length === 0) {
    lines.push('No T1 SPEC_ONLY gaps carry literal BSW pathway tags in CK v4.0 spec text. Pathway analysis is in the §11.5 sequencing notes (hand-authored) and the cross-module synthesis document.');
  } else {
    lines.push('T1 SPEC_ONLY work items by literal BSW pathway tag:', '');
    for (const p of pathwayKeys) {
      lines.push(`- **${p}**: ${pathwayCounts[p]} T1 SPEC_ONLY gap(s)`);
    }
  }
  lines.push('');

  // §6.3 Strategic posture (hand-authored)
  lines.push('### 6.3 — Strategic posture', '');
  lines.push(
    ctx.crosswalk.strategicPosture && ctx.crosswalk.strategicPosture.trim().length > 0
      ? ctx.crosswalk.strategicPosture
      : '*Strategic posture not yet authored. Set `strategicPosture` field in `' + ctx.module + '.crosswalk.json` to populate this section.*',
  );

  return lines.join('\n');
}

// =============================================================================
// §7 Working hypothesis verdict
// =============================================================================

function renderHypothesisVerdict(ctx: RenderContext): string {
  const { spec, crosswalk } = ctx;
  const counts = countByClassification(crosswalk.rows);
  const total = spec.totalGaps;
  const anyCov = anyCoverageCount(counts);
  const detRate = pct(counts.DET_OK, total);
  const anyRate = pct(anyCov, total);

  let verdict: string;
  if (anyCov === 0) {
    verdict = 'Module has zero implementation coverage';
  } else if (counts.DET_OK / total >= 0.4) {
    verdict = 'Strong implementation coverage; module is broadly built';
  } else if (counts.DET_OK / total >= 0.2) {
    verdict = 'Moderate implementation coverage; medication/screening surfaces typically built, procedural surfaces often lighter';
  } else {
    verdict = 'Light implementation coverage; significant v2.0 Phase 1 build work required';
  }

  return [
    '## 7. Working hypothesis verdict',
    '',
    `**For ${ctx.module}:** ${verdict}.`,
    '',
    `Coverage data: ${anyCov}/${total} any-coverage (${anyRate}); ${counts.DET_OK}/${total} DET_OK only (${detRate}); ${counts.PARTIAL_DETECTION} PARTIAL via broad-rule consolidation or partial-trigger match; ${counts.SPEC_ONLY} SPEC_ONLY.`,
    '',
    `Rules-per-DET_OK efficiency: ${ctx.code.registry.length} registry rules / ${counts.DET_OK} DET_OK = ${counts.DET_OK > 0 ? (ctx.code.registry.length / counts.DET_OK).toFixed(2) : 'n/a'}.`,
  ].join('\n');
}

// =============================================================================
// §8 Implications for v2.0
// =============================================================================

function renderV2Implications(ctx: RenderContext): string {
  const { crosswalk } = ctx;
  const t1SpecOnly = crosswalk.rows.filter((r) => r.tier === 'T1' && r.classification === 'SPEC_ONLY').length;
  const t1Partial = crosswalk.rows.filter((r) => r.tier === 'T1' && r.classification === 'PARTIAL_DETECTION').length;
  const t1DetOk = crosswalk.rows.filter((r) => r.tier === 'T1' && r.classification === 'DET_OK').length;

  return [
    '## 8. Implications for v2.0',
    '',
    `v2.0 Phase 1 (T1 priority) work items for ${ctx.module}:`,
    `- **${t1SpecOnly} T1 SPEC_ONLY** gaps requiring full build (detection + UI + tests)`,
    `- **${t1Partial} T1 PARTIAL** gaps requiring hardening (broad-rule discrimination, missing exclusions, dose-protocol specificity)`,
    `- **${t1DetOk} T1 DET_OK** gaps requiring test coverage + UI polish to reach PRODUCTION_GRADE`,
    '',
    `Cross-module satisfaction (HF Device Therapy → EP CRT/ICD pattern; CAD-027 → PV; etc.) is captured structurally in \`ruleBodyCite.evaluatorModule\` per AUDIT_METHODOLOGY.md §2.1.C.`,
  ].join('\n');
}

// =============================================================================
// §9 Module-specific findings
// =============================================================================

function renderModuleSpecificFindings(ctx: RenderContext): string {
  const lines = ['## 9. Module-specific findings', ''];
  const overrideRows = ctx.crosswalk.rows.filter((r) => r.auditNotes && r.auditNotes.includes('MANUAL OVERRIDE'));

  if (overrideRows.length > 0) {
    lines.push(`### Manual classification overrides (${overrideRows.length})`, '');
    lines.push('Rows where the auto-classifier was wrong and the audit author corrected the classification with explicit reasoning:');
    lines.push('');
    for (const r of overrideRows) {
      const cite = r.ruleBodyCite
        ? `\`${r.ruleBodyCite.registryId}\` (${r.ruleBodyCite.evaluatorBlockName})${r.ruleBodyCite.evaluatorModule !== ctx.module ? ` cross-module to ${r.ruleBodyCite.evaluatorModule}` : ''}`
        : 'no cite';
      lines.push(`- **${r.specGapId}** (${r.tier}, ${r.classification}, ${cite}): ${r.auditNotes}`);
    }
    lines.push('');
  } else {
    lines.push('No manual classification overrides for this module.');
    lines.push('');
  }
  return lines.join('\n');
}

// =============================================================================
// §10 Cross-references
// =============================================================================

function renderCrossReferences(ctx: RenderContext): string {
  return [
    '## 10. Cross-references',
    '',
    `- \`${ctx.spec.specSource}\` ${ctx.spec.specSection} — spec source`,
    `- \`${ctx.code.codeSource}\` — code source`,
    `- \`docs/audit/canonical/${ctx.module}.crosswalk.json\` — canonical crosswalk`,
    `- \`docs/audit/canonical/${ctx.module}.spec.json\` — canonical spec extract`,
    `- \`docs/audit/canonical/${ctx.module}.code.json\` — canonical code extract`,
    `- \`docs/audit/canonical/${ctx.module}.reconciliation.json\` — canonical reconciliation`,
    `- \`docs/audit/AUDIT_METHODOLOGY.md\` — canonical audit methodology contract`,
    `- \`docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md\` — cross-module synthesis`,
    `- \`docs/audit/AUDIT_FINDINGS_REGISTER.md\` — findings register`,
  ].join('\n');
}

// =============================================================================
// §11 Cross-module synthesis (per-module slice) + §11.5 Sequencing notes
// =============================================================================

function renderCrossModuleSlice(ctx: RenderContext): string {
  const lines = ['## 11. Cross-module synthesis (per-module slice)', ''];
  const xModRows = ctx.crosswalk.rows.filter((r) => r.ruleBodyCite && r.ruleBodyCite.evaluatorModule !== ctx.module);
  if (xModRows.length === 0) {
    lines.push(`No cross-module satisfaction cases for ${ctx.module}.`);
  } else {
    lines.push(`${xModRows.length} cross-module satisfaction case(s) where ${ctx.module} spec gap is satisfied by an evaluator owned by another module:`, '');
    lines.push('| Spec gap | Tier | Class | Owning module | Evaluator block |', '|---|---|---|---|---|');
    for (const r of xModRows) {
      lines.push(
        `| ${r.specGapId} | ${r.tier} | ${r.classification} | ${r.ruleBodyCite!.evaluatorModule} | \`${r.ruleBodyCite!.evaluatorBlockName}\` |`,
      );
    }
  }
  lines.push('');
  lines.push('### 11.5 — Sequencing notes', '');
  lines.push(
    ctx.crosswalk.sequencingNotes && ctx.crosswalk.sequencingNotes.trim().length > 0
      ? ctx.crosswalk.sequencingNotes
      : '*Sequencing notes not yet authored. Set `sequencingNotes` field in `' + ctx.module + '.crosswalk.json` to populate.*',
  );
  return lines.join('\n');
}

// =============================================================================
// §12 Lessons learned + §13 Wall-clock + §14 Verdict + §15 Methodology
// =============================================================================

function renderLessonsLearned(ctx: RenderContext): string {
  return [
    '## 12. Lessons learned',
    '',
    ctx.crosswalk.lessonsLearned && ctx.crosswalk.lessonsLearned.trim().length > 0
      ? ctx.crosswalk.lessonsLearned
      : '*Lessons learned not yet authored. Set `lessonsLearned` field in `' + ctx.module + '.crosswalk.json` to populate.*',
  ].join('\n');
}

function renderWallClock(ctx: RenderContext): string {
  return [
    '## 13. Wall-clock empirical entry',
    '',
    `Audit method: \`${ctx.crosswalk.auditMethod}\`. Audit date: ${ctx.crosswalk.auditDate}.`,
    '',
    'Per-module wall-clock data lives in `docs/audit/canonical/audit_runs.jsonl` (append-only). Aggregate empirical floor table maintained in AUDIT_METHODOLOGY.md §7.2.',
  ].join('\n');
}

function renderVerdict(ctx: RenderContext): string {
  const { spec, crosswalk } = ctx;
  const counts = countByClassification(crosswalk.rows);
  const t1Rows = crosswalk.rows.filter((r) => r.tier === 'T1');
  const t1Counts = countByClassification(t1Rows);
  const total = spec.totalGaps;

  const oneLineHeadline =
    counts.DET_OK / total >= 0.4
      ? 'BROADLY BUILT'
      : counts.DET_OK / total >= 0.2
        ? 'MODERATELY BUILT'
        : counts.DET_OK / total >= 0.05
          ? 'LIGHTLY BUILT'
          : 'NEAR-EMPTY';

  return [
    '## 14. Audit verdict',
    '',
    `**${ctx.module} module: ${oneLineHeadline}.**`,
    '',
    `- ${counts.DET_OK} DET_OK (${pct(counts.DET_OK, total)}), ${counts.PARTIAL_DETECTION} PARTIAL (${pct(counts.PARTIAL_DETECTION, total)}), ${counts.SPEC_ONLY} SPEC_ONLY (${pct(counts.SPEC_ONLY, total)})`,
    `- ${t1Counts.DET_OK}/${t1Rows.length} T1 priority gaps DET_OK; ${t1Counts.SPEC_ONLY} T1 SPEC_ONLY gaps require v2.0 Phase 1 work`,
    `- Audit method: \`${crosswalk.auditMethod}\`. Generated from canonical crosswalk on ${crosswalk.auditDate}.`,
  ].join('\n');
}

function renderMethodologyAppendix(ctx: RenderContext): string {
  return [
    '## 15. Methodology citation appendix',
    '',
    'Audit methodology per `docs/audit/AUDIT_METHODOLOGY.md` v1.0. Specifically:',
    '- §2 data model (spec/code/crosswalk artifact triplet)',
    '- §3 classification taxonomy (PRODUCTION_GRADE / DET_OK / PARTIAL_DETECTION / SPEC_ONLY) with §3.2 decision rules + §3.2.1 broad-rule consolidation handling',
    '- §4 citation requirements (AUDIT-030)',
    '- §5 evaluator inventory completeness (AUDIT-030.D, 5 comment patterns)',
    '- §6 SAFETY-tag classification rules + Tier S triage queue inclusion',
    '- §11 addendum markdown template (this document\'s structure)',
    '',
    'This addendum is a **generated artifact** rendered from canonical inputs by `backend/scripts/auditCanonical/renderAddendum.ts`. Hand-editing this markdown is rejected by CI; edit `' + ctx.module + '.crosswalk.json` (hand-authored fields: `strategicPosture`, `sequencingNotes`, `lessonsLearned`) and re-render.',
    '',
    `*Generated from \`docs/audit/canonical/${ctx.module}.crosswalk.json\`.*`,
  ].join('\n');
}

// =============================================================================
// Compose full addendum
// =============================================================================

export function renderAddendum(ctx: RenderContext): string {
  const sections = [
    renderSummary(ctx),
    renderCoverageByClassification(ctx),
    renderCoverageByTier(ctx),
    renderSubcategoryBreakdown(ctx),
    renderT1SpecOnly(ctx),
    renderExtras(ctx),
    renderT1Priority(ctx),
    renderImplementationNotes(ctx),
    renderHypothesisVerdict(ctx),
    renderV2Implications(ctx),
    renderModuleSpecificFindings(ctx),
    renderCrossReferences(ctx),
    renderCrossModuleSlice(ctx),
    renderLessonsLearned(ctx),
    renderWallClock(ctx),
    renderVerdict(ctx),
    renderMethodologyAppendix(ctx),
  ];
  return sections.join('\n\n---\n\n') + '\n';
}

// =============================================================================
// CLI
// =============================================================================

function main(): void {
  let mod: ModuleCode | undefined;
  let all = false;
  let inputDir = CANONICAL_OUTPUT_DIR;
  let outputDir = path.join(REPO_ROOT, 'docs', 'audit');
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--module' && process.argv[i + 1]) {
      mod = process.argv[i + 1].toUpperCase() as ModuleCode;
      i++;
    } else if (a === '--all') all = true;
    else if (a === '--input' && process.argv[i + 1]) {
      inputDir = path.resolve(process.argv[i + 1]);
      i++;
    } else if (a === '--output' && process.argv[i + 1]) {
      outputDir = path.resolve(process.argv[i + 1]);
      i++;
    }
  }
  if (!mod && !all) {
    console.error('ERROR: must specify --module <CODE> or --all');
    process.exit(2);
  }

  const targets = all ? MODULE_CONFIGS : MODULE_CONFIGS.filter((m) => m.code === mod);
  console.log('=== renderAddendum.ts ===');
  for (const cfg of targets) {
    const sp = path.join(inputDir, `${cfg.code}.spec.json`);
    const cp = path.join(inputDir, `${cfg.code}.code.json`);
    const xp = path.join(inputDir, `${cfg.code}.crosswalk.json`);
    const rp = path.join(inputDir, `${cfg.code}.reconciliation.json`);
    if (![sp, cp, xp, rp].every(fs.existsSync)) {
      console.error(`  ${cfg.code}: SKIPPED — missing one of spec/code/crosswalk/reconciliation`);
      continue;
    }
    const ctx: RenderContext = {
      module: cfg.code,
      spec: JSON.parse(fs.readFileSync(sp, 'utf8')),
      code: JSON.parse(fs.readFileSync(cp, 'utf8')),
      crosswalk: JSON.parse(fs.readFileSync(xp, 'utf8')),
      reconciliation: JSON.parse(fs.readFileSync(rp, 'utf8')),
    };
    const md = renderAddendum(ctx);
    const outPath = path.join(outputDir, `PHASE_0B_${cfg.code}_AUDIT_ADDENDUM.md`);
    fs.writeFileSync(outPath, md);
    console.log(`  ${cfg.code}: ${md.length} chars → ${path.relative(REPO_ROOT, outPath).replace(/\\/g, '/')}`);
  }
}

if (require.main === module) {
  main();
}
