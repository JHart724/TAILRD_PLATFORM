#!/usr/bin/env node
/**
 * sweepClinicalCodes.mjs - §16 clinical-code verification sweep (READ-ONLY)
 * =========================================================================
 *
 * PURPOSE
 *   Independently re-verify every RxNorm / LOINC / ICD-10 code that the gap
 *   rules can gate on, against an authoritative external source, and emit ONE
 *   report flagging claimed-vs-actual MISMATCHES. This is the mechanical
 *   sweep behind AUDIT-100 / AUDIT-102 (wrong-provenance + wrong-drug RxNorm)
 *   and the Cat A 15.5% wrong-drug rate documented in AUDIT_METHODOLOGY.md §16.
 *
 * READ-ONLY CONTRACT (non-negotiable)
 *   - This script NEVER writes to, edits, or imports any rule/source file.
 *     It reads source files as TEXT only (importing gapRuleEngine.ts would
 *     execute it and pull in Prisma/DB - we deliberately do static extraction).
 *   - It writes ONLY two artifacts, both under --out (default docs/audit/sweeps/):
 *       1. the report markdown  (clinical-code-sweep-report.md)
 *       2. a checkpoint json     (clinical-code-sweep-checkpoint.json)
 *   - It runs NO git command. It does NOT commit, push, open, or merge anything.
 *   - The operator runs it directly:  node backend/scripts/sweepClinicalCodes.mjs
 *
 * EXTERNAL SOURCES (the §16 authoritative resolvers)
 *   - RxNorm : RxNav properties.json   (rxnav.nlm.nih.gov) - the §16 standard
 *   - LOINC  : NLM Clinical Tables loinc_items  (clinicaltables.nlm.nih.gov)
 *   - ICD-10 : NLM Clinical Tables icd10cm (CMS ICD-10-CM source)
 *
 * THROTTLED + CHECKPOINTED / RESTARTABLE
 *   - One request at a time, --throttle ms between calls (default 200ms).
 *   - Retries with exponential backoff on network error / 429 / 5xx.
 *   - Resolved codes are checkpointed to disk; re-running RESUMES (skips
 *     already-resolved codes). Ctrl-C flushes the checkpoint before exit.
 *   - Use --no-resume to ignore an existing checkpoint and start fresh.
 *
 * USAGE
 *   node backend/scripts/sweepClinicalCodes.mjs [flags]
 *     --extract-only        Extract + print counts, write NO report, make NO API calls
 *     --systems a,b,c       Subset of {rxnorm,loinc,icd10} (default: all three)
 *     --limit N             Query only the first N unresolved codes (smoke test)
 *     --throttle MS         Delay between API calls (default 200)
 *     --no-resume           Ignore existing checkpoint, re-query everything
 *     --out DIR             Output dir (default docs/audit/sweeps)
 *     --help                Show this help
 *
 * Requires Node 18+ (global fetch). Zero npm dependencies.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// --------------------------------------------------------------------------
// Paths (resolved relative to repo root, derived from this file's location)
// --------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..'); // backend/scripts -> repo root

const SOURCE_FILES = {
  gapEngine: join(REPO_ROOT, 'backend/src/ingestion/gaps/gapRuleEngine.ts'),
  rxnorm:    join(REPO_ROOT, 'backend/src/terminology/rxnorm.ts'),
  loinc:     join(REPO_ROOT, 'backend/src/terminology/loinc.ts'),
  icd10:     join(REPO_ROOT, 'backend/src/terminology/icd10.ts'),
  valuesets: join(REPO_ROOT, 'backend/src/terminology/cardiovascularValuesets.ts'),
};

// --------------------------------------------------------------------------
// CLI args
// --------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { systems: ['rxnorm', 'loinc', 'icd10'], throttle: 200, resume: true,
              extractOnly: false, limit: Infinity, out: join(REPO_ROOT, 'docs/audit/sweeps') };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') { a.help = true; }
    else if (t === '--extract-only') { a.extractOnly = true; }
    else if (t === '--no-resume') { a.resume = false; }
    else if (t === '--systems') { a.systems = argv[++i].split(',').map(s => s.trim()).filter(Boolean); }
    else if (t === '--throttle') { a.throttle = parseInt(argv[++i], 10); }
    else if (t === '--limit') { a.limit = parseInt(argv[++i], 10); }
    else if (t === '--out') { a.out = resolve(argv[++i]); }
    else { console.error(`Unknown flag: ${t} (use --help)`); process.exit(2); }
  }
  return a;
}

const HELP = `§16 clinical-code verification sweep (READ-ONLY)

Reads the gap engine + terminology files as text, extracts every RxNorm/LOINC/
ICD-10 code the rules gate on, re-verifies each against RxNav / NLM Clinical
Tables, and writes ONE report flagging claimed-vs-actual MISMATCHES.

It edits NOTHING, imports NOTHING, runs NO git. It writes only a report + a
resumable checkpoint under --out.

Flags:
  --extract-only     Extract + print counts only (no API calls, no report)
  --systems a,b,c    Subset of rxnorm,loinc,icd10 (default all)
  --limit N          Query first N unresolved codes (smoke test)
  --throttle MS      Delay between API calls (default 200)
  --no-resume        Ignore checkpoint, re-query everything
  --out DIR          Output dir (default docs/audit/sweeps)
  --help             This help
`;

// --------------------------------------------------------------------------
// Extraction helpers (all static text parsing - NO module import/execution)
// --------------------------------------------------------------------------

// Stopwords stripped from RxNorm actual names before token comparison.
const DOSE_FORM_WORDS = new Set([
  'mg', 'ml', 'mcg', 'g', 'meq', 'unit', 'units', 'actuat', 'hr', 'hour',
  'injection', 'tablet', 'tablets', 'capsule', 'capsules', 'oral', 'solution',
  'suspension', 'extended', 'release', 'delayed', 'prefilled', 'syringe', 'pen',
  'patch', 'spray', 'inhalation', 'powder', 'concentrate', 'in', 'and', 'of',
  'per', 'film', 'coated', 'metered', 'dose', 'pack', 'sodium', 'hcl',
  'hydrochloride', 'auto', 'injector', 'cartridge', 'product', 'ophthalmic',
]);

// Words that are not real drug claims (avoid false claimed-name extraction).
const NON_DRUG_CLAIM = new Set([
  'rxnorm', 'doacs', 'doac', 'codes', 'warfarin+doacs', 'acei', 'arb', 'arni',
  'or', 'and', 'the', 'a', 'an',
]);

function normTokens(s) {
  return String(s).toLowerCase()
    .replace(/[\/]/g, ' ')                // split combo drugs
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean);
}

function significantTokens(name) {
  return normTokens(name).filter(t => !DOSE_FORM_WORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Code registry: key `${system}|${code}` -> {
 *   system, code, claims: Map<name -> Set<provenance>>, locations: Set<string>
 * }
 */
function makeRegistry() { return new Map(); }
function regKey(system, code) { return `${system}|${code}`; }
function addCode(reg, system, code, location, claimName, claimProvenance) {
  const key = regKey(system, code);
  let e = reg.get(key);
  if (!e) { e = { system, code, claims: new Map(), locations: new Set() }; reg.set(key, e); }
  if (location) e.locations.add(location);
  if (claimName) {
    const n = claimName.trim();
    if (n && !NON_DRUG_CLAIM.has(n.toLowerCase())) {
      if (!e.claims.has(n)) e.claims.set(n, new Set());
      e.claims.get(n).add(claimProvenance || location || '');
    }
  }
  return e;
}

// ---- gapRuleEngine.ts extraction -----------------------------------------
function extractFromGapEngine(reg, text, label) {
  const lines = text.split(/\r?\n/);

  // (1) Multi-line *_CODES* arrays: capture all numeric (RxNorm) + ICD + LOINC
  //     literals inside, and align positional trailing-comment names if present.
  let inArray = false, arrayName = '', arrayBuf = [], arrayStart = 0;
  const flushArray = (endLine) => {
    const blob = arrayBuf.join('\n');
    // Positional names from a trailing `// a, b, c` comment if counts align.
    const rxInArr = [...blob.matchAll(/'(\d{3,7})'/g)].map(m => m[1]);
    const commentMatch = blob.match(/\/\/\s*([^\n]+)$/m);
    let names = [];
    if (commentMatch) {
      names = commentMatch[1].split(',').map(s => s.trim())
        .map(s => s.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
    }
    rxInArr.forEach((code, idx) => {
      const claim = (names.length === rxInArr.length) ? names[idx] : null;
      addCode(reg, 'rxnorm', code, `${label}:${arrayStart} (${arrayName})`, claim,
        claim ? `${label}:${arrayStart} positional comment` : null);
    });
    // ICD + LOINC inside CODES arrays too
    for (const m of blob.matchAll(/'([A-TV-Z]\d{2}(?:\.[0-9A-Z]{1,4})?)'/g))
      addCode(reg, 'icd10', m[1], `${label}:${arrayStart} (${arrayName})`);
    for (const m of blob.matchAll(/'(\d{1,5}-\d)'/g))
      addCode(reg, 'loinc', m[1], `${label}:${arrayStart} (${arrayName})`);
  };

  lines.forEach((line, i) => {
    const ln = i + 1;

    if (!inArray) {
      const open = line.match(/const\s+(\w*CODES\w*|\w*RXCUI\w*)\s*=\s*\[/i);
      if (open) {
        arrayName = open[1]; arrayStart = ln; arrayBuf = [line]; inArray = true;
        if (line.includes(']')) { inArray = false; flushArray(ln); }
        return;
      }
    } else {
      arrayBuf.push(line);
      if (line.includes(']')) { inArray = false; flushArray(ln); }
      return;
    }

    // (2) Inline membership / equality checks: includes('rxcui'), === 'rxcui'
    for (const m of line.matchAll(/\.includes\(\s*'(\d{4,7})'\s*\)/g))
      addCode(reg, 'rxnorm', m[1], `${label}:${ln}`);
    for (const m of line.matchAll(/[=!]==\s*'(\d{4,7})'/g))
      addCode(reg, 'rxnorm', m[1], `${label}:${ln}`);

    // (3) Comment / string claims:  name (rxcui)   and   RxNorm name: rxcui
    for (const m of line.matchAll(/([A-Za-z][A-Za-z\/\- ]{2,40}?)\s*\((?:RxNorm\s+)?(\d{3,7})\)/g))
      addCode(reg, 'rxnorm', m[2], `${label}:${ln}`, m[1], `${label}:${ln} "name (code)"`);
    for (const m of line.matchAll(/RxNorm\s+([A-Za-z][A-Za-z\/\- ]{2,40}?):\s*(\d{3,7})/g))
      addCode(reg, 'rxnorm', m[2], `${label}:${ln}`, m[1], `${label}:${ln} "RxNorm name: code"`);

    // (4) ICD-10 + LOINC literals + LOINC comment mentions outside CODES arrays
    for (const m of line.matchAll(/'([A-TV-Z]\d{2}(?:\.[0-9A-Z]{1,4})?)'/g))
      addCode(reg, 'icd10', m[1], `${label}:${ln}`);
    for (const m of line.matchAll(/'(\d{1,5}-\d)'/g))
      addCode(reg, 'loinc', m[1], `${label}:${ln}`);
    for (const m of line.matchAll(/LOINC\s+(\d{1,5}-\d)/g))
      addCode(reg, 'loinc', m[1], `${label}:${ln}`, null);
  });
}

// ---- rxnorm.ts: { rxcui: 'code', name: 'claim' } --------------------------
function extractFromRxnormTs(reg, text, label) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/rxcui:\s*'(\d{2,7})'\s*,\s*name:\s*'([^']+)'/g))
      addCode(reg, 'rxnorm', m[1], `${label}:${i + 1}`, m[2], `${label}:${i + 1} (canonical name field)`);
  });
}

// ---- loinc.ts: 'code': { ... component: 'claim' } -------------------------
function extractFromLoincTs(reg, text, label) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/'(\d{1,5}-\d)':\s*\{[^}]*?component:\s*'([^']+)'/);
    if (m) addCode(reg, 'loinc', m[1], `${label}:${i + 1}`, m[2], `${label}:${i + 1} (canonical component)`);
  });
}

// ---- icd10.ts: 'code': { ... description: 'claim' } -----------------------
function extractFromIcd10Ts(reg, text, label) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/'([A-TV-Z]\d{2}(?:\.[0-9A-Z]{1,4})?)':\s*\{[^}]*?description:\s*'([^']+)'/);
    if (m) addCode(reg, 'icd10', m[1], `${label}:${i + 1}`, m[2], `${label}:${i + 1} (canonical description)`);
  });
}

// ---- cardiovascularValuesets.ts: concept-label comment + ICD/LOINC arrays --
function extractFromValuesets(reg, text, label) {
  const lines = text.split(/\r?\n/);
  let lastConcept = null;
  lines.forEach((line, i) => {
    const c = line.match(/\/\*\*\s*(.+?)\s*(?:--|\*\/)/);
    if (c) lastConcept = c[1].replace(/\(.*?\)/g, '').trim();
    for (const m of line.matchAll(/'([A-TV-Z]\d{2}(?:\.[0-9A-Z]{1,4})?)'/g))
      addCode(reg, 'icd10', m[1], `${label}:${i + 1}`, lastConcept, `${label}:${i + 1} (valueset concept label)`);
    for (const m of line.matchAll(/'(\d{1,5}-\d)'/g))
      addCode(reg, 'loinc', m[1], `${label}:${i + 1}`, lastConcept, `${label}:${i + 1} (valueset concept label)`);
    for (const m of line.matchAll(/'(\d{3,7})'/g))
      addCode(reg, 'rxnorm', m[1], `${label}:${i + 1}`, lastConcept, `${label}:${i + 1} (valueset concept label)`);
  });
}

// --------------------------------------------------------------------------
// External resolvers (throttled, retried)
// --------------------------------------------------------------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJson(url, attempt = 1) {
  const MAX = 3;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (res.status === 404) return { __notFound: true };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt >= MAX) return { __error: String(err && err.message || err) };
    await sleep(500 * Math.pow(3, attempt - 1)); // 500, 1500ms
    return fetchJson(url, attempt + 1);
  }
}

async function resolveRxnorm(code) {
  const j = await fetchJson(`https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(code)}/properties.json`);
  if (j.__error) return { status: 'ERROR', actual: null, type: null, note: j.__error };
  const p = j && j.properties;
  if (!p || !p.name) return { status: 'NO_API_MATCH', actual: null, type: null, note: 'no RxNav properties' };
  return { status: 'OK', actual: p.name, type: p.tty || null, note: '' };
}

async function resolveLoinc(code) {
  const url = `https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search?terms=${encodeURIComponent(code)}&df=LOINC_NUM,LONG_COMMON_NAME&maxList=20`;
  const j = await fetchJson(url);
  if (j.__error) return { status: 'ERROR', actual: null, type: null, note: j.__error };
  // clinicaltables returns [total, codes, extra, displayRows]
  const rows = Array.isArray(j) && Array.isArray(j[3]) ? j[3] : [];
  const hit = rows.find(r => r[0] === code);
  if (!hit) return { status: 'NO_API_MATCH', actual: null, type: 'LOINC', note: 'no exact LOINC_NUM match' };
  return { status: 'OK', actual: hit[1], type: 'LOINC', note: '' };
}

async function resolveIcd10(code) {
  const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${encodeURIComponent(code)}&df=code,name&maxList=50`;
  const j = await fetchJson(url);
  if (j.__error) return { status: 'ERROR', actual: null, type: null, note: j.__error };
  const rows = Array.isArray(j) && Array.isArray(j[3]) ? j[3] : [];
  const exact = rows.find(r => r[0] === code);
  if (exact) return { status: 'OK', actual: exact[1], type: 'ICD-10-CM (billable)', note: '' };
  const child = rows.find(r => r[0].startsWith(code));
  if (child) return { status: 'OK', actual: `${child[1]}  [matched via child ${child[0]}; queried code is a non-billable category]`,
                      type: 'ICD-10-CM (category)', note: 'category/non-billable; matched by prefix' };
  return { status: 'NO_API_MATCH', actual: null, type: 'ICD-10-CM', note: 'no code or child match' };
}

const RESOLVERS = { rxnorm: resolveRxnorm, loinc: resolveLoinc, icd10: resolveIcd10 };

// --------------------------------------------------------------------------
// MISMATCH classification
// --------------------------------------------------------------------------
function classify(entry, resolved) {
  const claims = [...entry.claims.keys()];
  if (resolved.status === 'ERROR') return 'ERROR';
  if (resolved.status === 'NO_API_MATCH') return claims.length ? 'NO_API_MATCH' : 'NO_API_MATCH_NOCLAIM';
  if (claims.length === 0) return 'INFO'; // resolved, but nothing claimed to compare
  const actualSig = significantTokens(resolved.actual);
  const actualJoined = actualSig.join(' ');
  for (const claim of claims) {
    const claimSig = significantTokens(claim).filter(t => !NON_DRUG_CLAIM.has(t));
    if (claimSig.length === 0) continue;            // e.g. "RxNorm", "DOACs" - skip as claim
    const allPresent = claimSig.every(t => actualJoined.includes(t));
    if (allPresent) return 'OK';                    // at least one claim matches actual
  }
  return 'MISMATCH';
}

// --------------------------------------------------------------------------
// Checkpoint (atomic)
// --------------------------------------------------------------------------
function loadCheckpoint(path) {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
}
function saveCheckpoint(path, obj) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, path);
}

// --------------------------------------------------------------------------
// Report
// --------------------------------------------------------------------------
function renderReport(reg, results, args, meta) {
  const rows = [];
  for (const [key, e] of reg) {
    const r = results[key] || { status: 'PENDING', actual: null, type: null, note: 'not queried' };
    const flag = r.status === 'PENDING' ? 'PENDING' : classify(e, r);
    rows.push({ key, system: e.system, code: e.code,
                claims: [...e.claims.keys()],
                claimProv: [...e.claims.values()].map(s => [...s].join('; ')),
                actual: r.actual, type: r.type, note: r.note,
                flag, locations: [...e.locations] });
  }
  const order = { MISMATCH: 0, NO_API_MATCH: 1, ERROR: 2, OK: 3, INFO: 4, NO_API_MATCH_NOCLAIM: 5, PENDING: 6 };
  rows.sort((a, b) => (order[a.flag] - order[b.flag]) || a.system.localeCompare(b.system) || a.code.localeCompare(b.code));

  const counts = {};
  for (const r of rows) counts[r.flag] = (counts[r.flag] || 0) + 1;

  const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const tbl = (subset) => {
    const out = ['| System | Code | Claimed name(s) | Actual (API) | Type | Flag | Source location(s) | Note |',
                 '|---|---|---|---|---|---|---|---|'];
    for (const r of subset)
      out.push(`| ${r.system} | \`${esc(r.code)}\` | ${esc(r.claims.join(' / ')) || '-'} | ${esc(r.actual) || '-'} | ${esc(r.type) || '-'} | ${r.flag} | ${esc(r.locations.slice(0, 4).join('; '))}${r.locations.length > 4 ? ` (+${r.locations.length - 4})` : ''} | ${esc(r.note)} |`);
    return out.join('\n');
  };

  const mism = rows.filter(r => r.flag === 'MISMATCH');
  const noMatch = rows.filter(r => r.flag === 'NO_API_MATCH');
  const errs = rows.filter(r => r.flag === 'ERROR');

  const L = [];
  L.push('# Clinical-code verification sweep report (§16)');
  L.push('');
  L.push('> READ-ONLY sweep. Generated by `backend/scripts/sweepClinicalCodes.mjs`.');
  L.push('> This report is advisory triage; every MISMATCH must be confirmed by a human against');
  L.push('> the rule body (per `AUDIT_METHODOLOGY.md` §1) before any AUDIT finding or code change.');
  L.push('');
  L.push(`- Generated: ${meta.generatedAt}`);
  L.push(`- Systems swept: ${args.systems.join(', ')}`);
  L.push(`- Throttle: ${args.throttle}ms; resume: ${args.resume}; limit: ${args.limit === Infinity ? 'none' : args.limit}`);
  L.push(`- Sources: gapRuleEngine.ts + terminology/{rxnorm,loinc,icd10}.ts + cardiovascularValuesets.ts`);
  L.push(`- Unique codes extracted: ${rows.length}  (rxnorm ${rows.filter(r=>r.system==='rxnorm').length}, loinc ${rows.filter(r=>r.system==='loinc').length}, icd10 ${rows.filter(r=>r.system==='icd10').length})`);
  L.push('');
  L.push('## Flag counts');
  L.push('');
  L.push('| Flag | Count | Meaning |');
  L.push('|---|---|---|');
  L.push(`| MISMATCH | ${counts.MISMATCH || 0} | A claimed name does NOT match the authoritative name - REVIEW |`);
  L.push(`| NO_API_MATCH | ${counts.NO_API_MATCH || 0} | Code (with a claim) returned no authoritative match - REVIEW |`);
  L.push(`| ERROR | ${counts.ERROR || 0} | Network/API error after retries - re-run to resolve |`);
  L.push(`| OK | ${counts.OK || 0} | A claimed name matches the authoritative name |`);
  L.push(`| INFO | ${counts.INFO || 0} | Resolved, but no claimed name in source to compare against |`);
  L.push(`| NO_API_MATCH_NOCLAIM | ${counts.NO_API_MATCH_NOCLAIM || 0} | No match AND no claim (often a threshold/non-code numeric literal) |`);
  L.push(`| PENDING | ${counts.PENDING || 0} | Not yet queried (partial run / --extract-only) |`);
  L.push('');
  L.push('## 1. MISMATCH (priority triage)');
  L.push('');
  L.push(mism.length ? tbl(mism) : '_None flagged._');
  L.push('');
  L.push('## 2. NO_API_MATCH (claimed code with no authoritative match)');
  L.push('');
  L.push(noMatch.length ? tbl(noMatch) : '_None._');
  L.push('');
  L.push('## 3. ERROR (unresolved after retries - re-run to clear)');
  L.push('');
  L.push(errs.length ? tbl(errs) : '_None._');
  L.push('');
  L.push('## 4. Full results (all codes, all flags)');
  L.push('');
  L.push(tbl(rows));
  L.push('');
  L.push('## 5. Methodology + limits');
  L.push('');
  L.push('- Extraction is STATIC text parsing (no module import/execution), so it captures the');
  L.push('  literal codes the rules gate on plus the canonical terminology tables. Canonical');
  L.push('  constants referenced only symbolically in gapRuleEngine (e.g. `RXNORM_GDMT.CARVEDILOL`)');
  L.push('  are resolved via the terminology files, not by executing the engine.');
  L.push('- RxNorm candidates are quoted numeric literals inside `*_CODES*` arrays, `.includes()`/');
  L.push('  equality checks (>=4 digits), `name (code)` / `RxNorm name: code` comment claims, and');
  L.push('  the `rxcui:` fields in rxnorm.ts. 2-digit numerics (clinical thresholds) are NOT swept.');
  L.push('- A MISMATCH means the *claimed* name (a code comment or a terminology `name`/`description`/');
  L.push('  `component` field) does not token-match the authoritative name. Dose/form words are');
  L.push('  stripped before comparison. Confirm each against the rule body before acting (§1).');
  L.push('- ICD-10 category (non-billable) codes are matched to a representative billable child;');
  L.push('  the note records this. This is expected for 3-char category codes (e.g. I50, E11).');
  L.push('- To resume an interrupted run: re-run the same command (checkpoint auto-loads).');
  L.push('  To force a clean re-query: add `--no-resume`.');
  L.push('');
  return L.join('\n');
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return; }

  console.log('=== §16 clinical-code sweep (READ-ONLY: edits nothing, runs no git) ===');

  // ---- Extract ----
  const reg = makeRegistry();
  const read = (p) => readFileSync(p, 'utf8');
  extractFromGapEngine(reg, read(SOURCE_FILES.gapEngine), 'gapRuleEngine.ts');
  extractFromRxnormTs(reg, read(SOURCE_FILES.rxnorm), 'rxnorm.ts');
  extractFromLoincTs(reg, read(SOURCE_FILES.loinc), 'loinc.ts');
  extractFromIcd10Ts(reg, read(SOURCE_FILES.icd10), 'icd10.ts');
  extractFromValuesets(reg, read(SOURCE_FILES.valuesets), 'cardiovascularValuesets.ts');

  // Filter to requested systems
  const wanted = new Set(args.systems);
  for (const [k, e] of [...reg]) if (!wanted.has(e.system)) reg.delete(k);

  const bySystem = { rxnorm: 0, loinc: 0, icd10: 0 };
  for (const [, e] of reg) bySystem[e.system]++;
  console.log(`Extracted ${reg.size} unique codes  (rxnorm ${bySystem.rxnorm}, loinc ${bySystem.loinc}, icd10 ${bySystem.icd10})`);

  if (args.extractOnly) {
    console.log('--extract-only: skipping API calls and report. Sample:');
    let n = 0;
    for (const [, e] of reg) { if (n++ >= 25) break;
      console.log(`  [${e.system}] ${e.code}  claims=${[...e.claims.keys()].join(' / ') || '(none)'}  @ ${[...e.locations][0]}`); }
    return;
  }

  // ---- Output dir + checkpoint ----
  mkdirSync(args.out, { recursive: true });
  const reportPath = join(args.out, 'clinical-code-sweep-report.md');
  const ckptPath = join(args.out, 'clinical-code-sweep-checkpoint.json');
  const results = args.resume ? loadCheckpoint(ckptPath) : {};
  const generatedAt = new Date().toISOString();

  // Flush checkpoint on Ctrl-C so a long run is always resumable.
  let interrupted = false;
  const flush = () => { try { saveCheckpoint(ckptPath, results); } catch {} };
  process.on('SIGINT', () => { interrupted = true; console.log('\nSIGINT: flushing checkpoint...'); flush();
    try { writeFileSync(reportPath, renderReport(reg, results, args, { generatedAt }), 'utf8'); } catch {}
    process.exit(130); });

  // ---- Query (throttled, checkpointed, resumable) ----
  const pending = [...reg.keys()].filter(k => !results[k] || results[k].status === 'ERROR');
  const toQuery = pending.slice(0, args.limit);
  console.log(`${pending.length} unresolved; querying ${toQuery.length} (throttle ${args.throttle}ms). Ctrl-C is safe (checkpoint flushes).`);

  let done = 0;
  for (const key of toQuery) {
    if (interrupted) break;
    const e = reg.get(key);
    const resolver = RESOLVERS[e.system];
    results[key] = await resolver(e.code);
    done++;
    if (done % 25 === 0) { saveCheckpoint(ckptPath, results); console.log(`  ...${done}/${toQuery.length} resolved`); }
    await sleep(args.throttle);
  }
  saveCheckpoint(ckptPath, results);

  // ---- Report ----
  const report = renderReport(reg, results, args, { generatedAt });
  writeFileSync(reportPath, report, 'utf8');
  console.log(`\nReport written: ${reportPath}`);
  console.log(`Checkpoint:     ${ckptPath}`);
  const mism = [...reg.keys()].filter(k => results[k] && classify(reg.get(k), results[k]) === 'MISMATCH').length;
  console.log(`MISMATCH flags: ${mism}  (review section 1 of the report)`);
  console.log('Done. Nothing was edited; no git action taken.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
