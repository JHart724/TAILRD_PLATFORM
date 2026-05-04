/**
 * renderSynthesis.ts — generate docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md.
 *
 * Reads all 6 module crosswalks + spec extracts. Emits cross-module aggregation:
 *   - Coverage stats by module + by tier + by classification
 *   - Tier S triage queue (spec-explicit SAFETY uncovered T1 + structurally-inferred SAFETY)
 *   - Cross-module satisfaction patterns (HF Device → EP, CAD-027 → PV, VHD-024 → SH, EP-007 → VHD)
 *   - Procedural-Pathway-1 blind spot analysis (subcategories with 0% any-coverage)
 *   - BSW pathway-tagged gap distribution
 *
 * Run:
 *   npx tsx backend/scripts/auditCanonical/renderSynthesis.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ModuleCode, SpecExtract, SpecGap } from './lib/types';
import { Crosswalk, CrosswalkRow } from './crosswalkSchema';
import { MODULE_CONFIGS, CANONICAL_OUTPUT_DIR, REPO_ROOT } from './lib/modules';

const MODULE_TITLES: Record<ModuleCode, string> = {
  HF: 'Heart Failure',
  EP: 'Electrophysiology',
  SH: 'Structural Heart',
  CAD: 'Coronary Artery Disease',
  VHD: 'Valvular Heart Disease',
  PV: 'Peripheral Vascular',
};

interface ModuleData {
  readonly module: ModuleCode;
  readonly spec: SpecExtract;
  readonly crosswalk: Crosswalk;
}

function loadAllModules(inputDir: string): ModuleData[] {
  const out: ModuleData[] = [];
  for (const cfg of MODULE_CONFIGS) {
    const sp = path.join(inputDir, `${cfg.code}.spec.json`);
    const xp = path.join(inputDir, `${cfg.code}.crosswalk.json`);
    if (!fs.existsSync(sp) || !fs.existsSync(xp)) continue;
    out.push({
      module: cfg.code,
      spec: JSON.parse(fs.readFileSync(sp, 'utf8')),
      crosswalk: JSON.parse(fs.readFileSync(xp, 'utf8')),
    });
  }
  return out;
}

function pct(n: number, total: number): string {
  if (total === 0) return '0.0%';
  return ((n / total) * 100).toFixed(1) + '%';
}

function countBy(rows: readonly CrosswalkRow[]) {
  return {
    DET_OK: rows.filter((r) => r.classification === 'DET_OK').length,
    PARTIAL: rows.filter((r) => r.classification === 'PARTIAL_DETECTION').length,
    SPEC_ONLY: rows.filter((r) => r.classification === 'SPEC_ONLY').length,
    PRODUCTION: rows.filter((r) => r.classification === 'PRODUCTION_GRADE').length,
  };
}

// =============================================================================
// Section renderers
// =============================================================================

function renderHeader(): string {
  return [
    '# Phase 0B Cross-Module Synthesis — generated from canonical crosswalks',
    '',
    'Aggregate audit findings across all 6 active modules (HF, EP, SH, CAD, VHD, PV). ' +
      'Generated from `docs/audit/canonical/<MODULE>.crosswalk.json` files. ' +
      'See per-module addenda (`PHASE_0B_<MODULE>_AUDIT_ADDENDUM.md`) for module-specific detail.',
    '',
    '**Source of truth:** canonical crosswalks. Hand-editing this document is rejected by CI; ' +
      'edit crosswalk JSON and re-run `renderSynthesis.ts`.',
  ].join('\n');
}

function renderCoverageOverview(modules: readonly ModuleData[]): string {
  const lines = ['## 1. Coverage overview', '', '| Module | Spec gaps | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage | DET_OK rate |', '|---|---:|---:|---:|---:|---:|---:|'];
  let totalSpec = 0;
  let totalDet = 0;
  let totalPart = 0;
  let totalSpecOnly = 0;
  for (const m of modules) {
    const c = countBy(m.crosswalk.rows);
    const total = m.spec.totalGaps;
    const any = c.DET_OK + c.PARTIAL + c.PRODUCTION;
    lines.push(
      `| ${m.module} | ${total} | ${c.DET_OK} | ${c.PARTIAL} | ${c.SPEC_ONLY} | ${any}/${total} (${pct(any, total)}) | ${pct(c.DET_OK, total)} |`,
    );
    totalSpec += total;
    totalDet += c.DET_OK;
    totalPart += c.PARTIAL;
    totalSpecOnly += c.SPEC_ONLY;
  }
  const totalAny = totalDet + totalPart;
  lines.push(
    `| **TOTAL** | **${totalSpec}** | **${totalDet}** | **${totalPart}** | **${totalSpecOnly}** | **${totalAny}/${totalSpec} (${pct(totalAny, totalSpec)})** | **${pct(totalDet, totalSpec)}** |`,
  );
  return lines.join('\n');
}

function renderTierDistribution(modules: readonly ModuleData[]): string {
  const lines = ['## 2. Tier distribution', '', '| Module | T1 total | T1 DET_OK | T1 PARTIAL | T1 SPEC_ONLY | T1 any-coverage |', '|---|---:|---:|---:|---:|---:|'];
  for (const m of modules) {
    const t1 = m.crosswalk.rows.filter((r) => r.tier === 'T1');
    const c = countBy(t1);
    const any = c.DET_OK + c.PARTIAL + c.PRODUCTION;
    lines.push(`| ${m.module} | ${t1.length} | ${c.DET_OK} | ${c.PARTIAL} | ${c.SPEC_ONLY} | ${pct(any, t1.length)} |`);
  }
  return lines.join('\n');
}

interface TierSEntry {
  readonly module: ModuleCode;
  readonly specGapId: string;
  readonly tier: string;
  readonly category: 'spec-explicit' | 'structurally-inferred';
  readonly safetyTagLiteral: string | null;
  readonly inferredSafetyTag: string | null;
  readonly inferredSafetyRationale: string | null;
  readonly classification: string;
  readonly specLine: number;
  readonly detectionLogic: string;
}

function buildTierSQueue(modules: readonly ModuleData[]): TierSEntry[] {
  const entries: TierSEntry[] = [];
  for (const m of modules) {
    const specByGap = new Map(m.spec.gaps.map((g) => [g.id, g]));
    for (const r of m.crosswalk.rows) {
      // Per §6.3: T1 + uncovered + (spec-explicit SAFETY OR structural-inferred SAFETY)
      if (r.tier !== 'T1') continue;
      if (r.classification === 'DET_OK' || r.classification === 'PRODUCTION_GRADE') continue;
      const sg = specByGap.get(r.specGapId);
      const specSafety = sg?.safetyTagCategory ?? null;
      const inferredSafety = r.inferredSafetyTag;
      if (!specSafety && !inferredSafety) continue;
      entries.push({
        module: m.module,
        specGapId: r.specGapId,
        tier: r.tier,
        category: specSafety ? 'spec-explicit' : 'structurally-inferred',
        safetyTagLiteral: sg?.safetyTagLiteral ?? null,
        inferredSafetyTag: inferredSafety,
        inferredSafetyRationale: r.inferredSafetyRationale,
        classification: r.classification,
        specLine: r.specLine,
        detectionLogic: sg?.detectionLogic ?? sg?.name ?? '',
      });
    }
  }
  // Sort: spec-explicit first, then by module, then by spec line
  entries.sort((a, b) => {
    if (a.category !== b.category) return a.category === 'spec-explicit' ? -1 : 1;
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    return a.specLine - b.specLine;
  });
  return entries;
}

function renderTierSQueue(modules: readonly ModuleData[]): string {
  const entries = buildTierSQueue(modules);
  const explicit = entries.filter((e) => e.category === 'spec-explicit');
  const inferred = entries.filter((e) => e.category === 'structurally-inferred');

  const lines = ['## 3. Tier S triage queue', ''];
  lines.push(
    'Per AUDIT_METHODOLOGY.md §6.3, Tier S inclusion requires ALL THREE: ' +
      '(SAFETY-relevant) AND (T1) AND (uncovered). Spec-explicit auto-include; structurally-inferred require operator decision.',
    '',
  );

  lines.push(`### 3.1 Spec-explicit SAFETY uncovered T1 (${explicit.length} — automatic Tier S)`, '');
  if (explicit.length === 0) {
    lines.push('None. All spec-explicit SAFETY-tagged T1 gaps have at least PARTIAL coverage.');
  } else {
    lines.push('| Spec gap | Module | Spec line | Class | SAFETY tag | Detection logic (excerpt) |', '|---|---|---:|---|---|---|');
    for (const e of explicit) {
      lines.push(`| **${e.specGapId}** | ${e.module} | ${e.specLine} | ${e.classification} | \`${e.safetyTagLiteral}\` | ${e.detectionLogic.slice(0, 80)}${e.detectionLogic.length > 80 ? '...' : ''} |`);
    }
  }
  lines.push('');

  lines.push(`### 3.2 Structurally-inferred SAFETY (${inferred.length} — operator decision required)`, '');
  if (inferred.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Spec gap | Module | Spec line | Class | inferredSafetyTag | Rationale |', '|---|---|---:|---|---|---|');
    for (const e of inferred) {
      lines.push(`| ${e.specGapId} | ${e.module} | ${e.specLine} | ${e.classification} | ${e.inferredSafetyTag} | ${(e.inferredSafetyRationale ?? '').slice(0, 100)} |`);
    }
  }

  return lines.join('\n');
}

function renderCrossModulePatterns(modules: readonly ModuleData[]): string {
  const lines = ['## 4. Cross-module satisfaction patterns', ''];
  const allXMod: { fromModule: ModuleCode; toModule: ModuleCode; specGapId: string; tier: string; classification: string; evaluatorBlockName: string }[] = [];
  for (const m of modules) {
    for (const r of m.crosswalk.rows) {
      if (r.ruleBodyCite && r.ruleBodyCite.evaluatorModule !== m.module) {
        allXMod.push({
          fromModule: m.module,
          toModule: r.ruleBodyCite.evaluatorModule,
          specGapId: r.specGapId,
          tier: r.tier,
          classification: r.classification,
          evaluatorBlockName: r.ruleBodyCite.evaluatorBlockName,
        });
      }
    }
  }
  if (allXMod.length === 0) {
    lines.push('No cross-module satisfaction cases.');
    return lines.join('\n');
  }
  lines.push(`${allXMod.length} cross-module satisfaction case(s) where a spec gap in module X is satisfied by an evaluator owned by module Y.`, '');

  // Group by (fromModule → toModule) pair
  const byPair = new Map<string, typeof allXMod>();
  for (const x of allXMod) {
    const key = `${x.fromModule}→${x.toModule}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(x);
  }
  const pairKeys = [...byPair.keys()].sort();

  lines.push('### Pattern summary', '', '| Spec module | Owns evaluator | Count | Example gaps |', '|---|---|---:|---|');
  for (const key of pairKeys) {
    const xs = byPair.get(key)!;
    const [from, to] = key.split('→');
    const examples = xs.slice(0, 4).map((x) => x.specGapId).join(', ');
    lines.push(`| ${from} | ${to} | ${xs.length} | ${examples}${xs.length > 4 ? ', ...' : ''} |`);
  }
  lines.push('');
  lines.push('### Detail', '');
  lines.push('| Spec gap | Tier | Class | From module | Owning evaluator block | To module |', '|---|---|---|---|---|---|');
  for (const x of allXMod) {
    lines.push(`| ${x.specGapId} | ${x.tier} | ${x.classification} | ${x.fromModule} | \`${x.evaluatorBlockName}\` | ${x.toModule} |`);
  }
  return lines.join('\n');
}

function renderProceduralBlindSpot(modules: readonly ModuleData[]): string {
  const lines = ['## 5. Procedural-Pathway-1 blind spot analysis', ''];
  lines.push('Subcategories with 0% any-coverage indicate entire procedural surfaces missing implementation:', '');
  lines.push('| Module | Subcategory | Gaps | DET_OK | PARTIAL | SPEC_ONLY |', '|---|---|---:|---:|---:|---:|');

  const blindSpots: { module: ModuleCode; subcategory: string; total: number }[] = [];
  for (const m of modules) {
    const rowsByGapId = new Map(m.crosswalk.rows.map((r) => [r.specGapId, r]));
    for (const subcat of m.spec.subcategories) {
      const gapsInSubcat = m.spec.gaps.filter((g) => g.subcategory === subcat.name);
      const rowsInSubcat = gapsInSubcat.map((g) => rowsByGapId.get(g.id)).filter((r): r is CrosswalkRow => !!r);
      const c = countBy(rowsInSubcat);
      const any = c.DET_OK + c.PARTIAL + c.PRODUCTION;
      if (any === 0 && rowsInSubcat.length > 0) {
        blindSpots.push({ module: m.module, subcategory: subcat.name, total: rowsInSubcat.length });
        lines.push(`| ${m.module} | ${subcat.name} | ${rowsInSubcat.length} | 0 | 0 | ${rowsInSubcat.length} |`);
      }
    }
  }
  if (blindSpots.length === 0) {
    lines.push('No subcategories with 0% any-coverage.');
  } else {
    lines.push('', `**Total: ${blindSpots.length} subcategories with 0% any-coverage across ${new Set(blindSpots.map((b) => b.module)).size} modules.**`);
  }
  return lines.join('\n');
}

function renderBswPathway(modules: readonly ModuleData[]): string {
  const lines = ['## 6. BSW pathway-tagged gap distribution', ''];
  const counts: Record<string, { total: number; det: number; part: number; specOnly: number }> = {};
  for (const m of modules) {
    const rowsByGap = new Map(m.crosswalk.rows.map((r) => [r.specGapId, r]));
    for (const g of m.spec.gaps) {
      if (g.bswPathwayTags.length === 0) continue;
      const r = rowsByGap.get(g.id);
      if (!r) continue;
      for (const p of g.bswPathwayTags) {
        if (!counts[p]) counts[p] = { total: 0, det: 0, part: 0, specOnly: 0 };
        counts[p].total++;
        if (r.classification === 'DET_OK' || r.classification === 'PRODUCTION_GRADE') counts[p].det++;
        else if (r.classification === 'PARTIAL_DETECTION') counts[p].part++;
        else counts[p].specOnly++;
      }
    }
  }
  const keys = Object.keys(counts).sort();
  if (keys.length === 0) {
    lines.push('No spec gaps carry literal BSW pathway tags. Pathway analysis lives in per-module §6.2 sections.');
    return lines.join('\n');
  }
  lines.push('| Pathway | Total | DET_OK | PARTIAL | SPEC_ONLY | Any-coverage |', '|---|---:|---:|---:|---:|---:|');
  for (const p of keys) {
    const c = counts[p];
    const any = c.det + c.part;
    lines.push(`| ${p} | ${c.total} | ${c.det} | ${c.part} | ${c.specOnly} | ${pct(any, c.total)} |`);
  }
  return lines.join('\n');
}

function renderFooter(): string {
  return [
    '## 7. Methodology + provenance',
    '',
    'Generated by `backend/scripts/auditCanonical/renderSynthesis.ts` from canonical crosswalks. ' +
      'Methodology per `docs/audit/AUDIT_METHODOLOGY.md` v1.0.',
    '',
    '*Hand-editing this document is rejected by CI. Update crosswalk JSON files and re-run the renderer.*',
  ].join('\n');
}

// =============================================================================
// Compose
// =============================================================================

export function renderSynthesis(modules: readonly ModuleData[]): string {
  return [
    renderHeader(),
    renderCoverageOverview(modules),
    renderTierDistribution(modules),
    renderTierSQueue(modules),
    renderCrossModulePatterns(modules),
    renderProceduralBlindSpot(modules),
    renderBswPathway(modules),
    renderFooter(),
  ].join('\n\n---\n\n') + '\n';
}

// =============================================================================
// CLI
// =============================================================================

function main(): void {
  let inputDir = CANONICAL_OUTPUT_DIR;
  let outputPath = path.join(REPO_ROOT, 'docs', 'audit', 'PHASE_0B_CROSS_MODULE_SYNTHESIS.md');
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--input' && process.argv[i + 1]) {
      inputDir = path.resolve(process.argv[i + 1]);
      i++;
    } else if (process.argv[i] === '--output' && process.argv[i + 1]) {
      outputPath = path.resolve(process.argv[i + 1]);
      i++;
    }
  }
  const modules = loadAllModules(inputDir);
  if (modules.length === 0) {
    console.error('ERROR: no module crosswalks found in ' + inputDir);
    process.exit(2);
  }
  const md = renderSynthesis(modules);
  fs.writeFileSync(outputPath, md);
  console.log(`renderSynthesis: ${modules.length} modules → ${path.relative(REPO_ROOT, outputPath).replace(/\\/g, '/')} (${md.length} chars)`);
}

if (require.main === module) {
  main();
}
