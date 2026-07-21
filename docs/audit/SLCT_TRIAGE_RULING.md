# SL/CT Triage Ruling - the arc-opening disposition table

**Status:** RULING INPUT (not a register finding). Awaiting operator disposition.
**Basis:** origin/main `ed914d2` (post honesty-hotfix). Every row verified against current code with file:line.
**Scope:** the 12 Service Line + Care Team tiers (HF/EP/SH/CAD/VHD/PV x SL+CT) plus the Research module (3 tiers, included because it is the flagship wire target).
**Purpose:** the SL/CT arc opens with SUBTRACTION, not convergence. Each panel is dispositioned against its CLINICAL ASSET so the platform ends with more real clinical capability on fewer, denser surfaces and zero clinical depth lost. The operator rules on this document; the arc then sequences kill -> wire -> converge.

---

## THE LOAD-BEARING ARCHITECTURAL FACT (read first)

**Most config files are RUNTIME ORPHANS.** The modules render through hand-written views, and the parallel `config/serviceLineConfig.tsx` / `config/careTeamConfig.tsx` objects are, in most cases, imported only by a label test (`audit303.labels.test.tsx`) - never by a production view. Verified mechanically:

| Module | careTeamConfig | serviceLineConfig |
|---|---|---|
| HF  | ORPHAN (test-only) | ORPHAN (test-only) |
| EP  | ORPHAN (test-only) | `.exportData` consumed; `tabContent` ORPHAN |
| SH  | ORPHAN (test-only) | ORPHAN (test-only) |
| CAD | **RENDERED** (CoronaryCareTeamView) | ORPHAN (test-only) |
| VHD | ORPHAN (test-only) | ORPHAN (test-only) |
| PV  | **RENDERED** (PeripheralCareTeamView) | `.exportData` consumed; `tabContent` ORPHAN |

Consequence: the "config-driven CT" framing is true only for **CAD and PV CT**. Everywhere else the config panels are DEAD CODE - a parallel, superseded implementation. This reframes the entire triage: an orphan-config panel is a KILL (dead code), not a shipping UNBADGED-MOCK defect. It also means the orphan configs are a **resurrection reservoir** - several contain richer, gap-KB-driven tables than the simpler inline panels that actually ship.

---

## 1. SUMMARY SHEET

### Rendered panel inventory (per tier)
| Tier | Rendered panels | Live-wired | Demo-badged | Unbadged-mock | Calculator | Stub/empty | Kill(rendered) |
|---|---|---|---|---|---|---|---|
| HF SL | 14 | 4 | 1 | 5 | 1 | 1 shim | 0 |
| HF CT | 13 + 9 tray | 6 | 0 | 3 | 8 | 2 dup-tabs | 0 |
| EP SL | 15 (+1 unreachable) | 2 | 3 | 8 | 2 | 2 shim | 1 (outcomes-cohort) |
| EP CT | 9 + 8 tabs (5 tools) | 1 (dup) | 0 | 12 | 3 | 1 shim | 0 |
| SH SL | 17 | 2 | 1 | 9 | 1 | 2 shim | 0 |
| SH CT | 10 + 6 tray | 1 (dup) | 1 (dup) | 6 | 2 | 1 shim | 0 |
| CAD SL | 17 | 2 | 2 | 6 | 3 | 2 shim | 0 |
| CAD CT | 11 (7 tools) | 1 (dup) | 0 | 4 | 3 | 0 | 0 |
| VHD SL | 14 | 2 | 1 | 10 | 0 | 0 | 0 |
| VHD CT | 10 | 1 (dup) | 0 | 8 | 1 | 0 | 0 |
| PV SL | 17 | 2 | 1 | 9 | 2 | 2 shim | 2 (network tab, PADRiskCalculators) |
| PV CT | 12 | 1 (dup) | 0 | 5 | 5 | 0 | 0 |
| Research (Exec+SL+CT) | ~28 | 1 (external CT.gov) | 0 | ~24 | 0 | 3 | 1 (auto-fill chart) |

Approx rendered totals: **~97 SL panels + ~98 CT panels + ~28 Research = ~223 rendered panels.** Plus **~71 non-rendered dead surfaces** (orphan components + orphan-config panels).

### Per-disposition counts (rendered + dead surfaces)
| Disposition | Count (approx) | What it is |
|---|---|---|
| **KEEP (already LIVE)** | ~20 | 6 KPI banners + 6 gap dashboards (one per module, deduped) + 6 HF/EP CT live panels + Research CT.gov feed |
| **WIRE** | ~14 | Research registry/trials panels (~12) + SH CT patients worklist + HF CT workflow counts. Endpoint exists, panel not consuming it |
| **KEEP-CALC** | ~34 instruments (with dedup targets) | Deterministic clinical calculators (MAGGIC, INTERMACS, GRACE, TIMI, SYNTAX, STS, CHA2DS2-VASc, HAS-BLED/ORBIT, WIfI, Wells PE, contraindication checkers, phenotype classifiers) |
| **KEEP-AND-BADGE** | ~105 | Unbadged-mock panels anchored to a real guideline/registry/gap but shipping without a demo pill. The dominant bucket |
| **KILL** | ~22 orphan components + 8 orphan-config files + 3 rendered (unreachable/empty/descriptive) | Positive no-anchor / 0-importer / unreachable evidence; gap coverage preserved elsewhere |

### Per-tier before -> after panel projection (post-triage, converge phase)
| Tier | Before (rendered) | After (est.) | Delta driver |
|---|---|---|---|
| HF SL | 14 | ~11 | -HFCareNetworkVis (shim), merge quality/outcomes-adjacent, dedup MAGGIC |
| HF CT | 22 | ~18 | -dup hospital-alerts tab, -dup team tab, dedup MAGGICx2 |
| EP SL | 16 | ~13 | -outcomes-cohort (unreachable), -AutomatedReporting(from EP), fold network shim |
| EP CT | ~21 | ~18 | -dup gap dashboard, fold hospital-alerts shim |
| SH SL | 17 | ~14 | dedup TAVR/referral-network, fold care-network shim |
| SH CT | 16 | ~12 | -dup TAVR (relocate-UP), -dup gap, fold hospital-alerts shim |
| CAD SL | 17 | ~15 | fold 2 shim tabs, dedup GRACE |
| CAD CT | 11 | ~10 | -dup gap dashboard |
| VHD SL | 14 | ~13 | dedup heatmap/network vs CT |
| VHD CT | 10 | ~9 | -dup gap dashboard |
| PV SL | 17 | ~14 | -network empty tab, -PADRiskCalculators, dedup WIfI/wound vs CT |
| PV CT | 12 | ~11 | -dup gap dashboard |
Net: fewer, denser tabs; every deleted surface is a duplicate, a shim, an orphan, or gap-covered elsewhere.

### KB crosswalk reclassification: **5**
Five orphan `serviceLineConfig` gap-pipeline panels read the module gap KB and were reclassified from plain KILL to **KILL-WITH-HARVEST** (see section 3). Coverage is preserved regardless because every live gap dashboard already carries the same `_CLINICAL_GAPS` KB.

### Top-10 wire targets (ranked) - see section 4 for detail
1. `GET /trials/:trialId/eligible-patients` -> Research SL eligible-patients box (`ResearchServiceLineView.tsx:1073`) - **flagship**; kills the false-provenance caption and gives the backend `INDETERMINATE` state its first UI home.
2. `GET /registry/:registryType/cases` -> Research SL registry queue/form/completeness/source + CT abstraction queue + Exec registry KPIs (~6 panels).
3. `POST /registry/cases/:caseId/submit` -> **CREATE `submitRegistryCase`** -> SL "Approve & Submit" button (`:845`).
4. `POST /registry/cases/:caseId/reject` -> **CREATE `rejectRegistryCase`** (required `reason`) -> SL "Flag for Review" (`:849`).
5. `POST /registry/cases/:caseId/approve` -> `approveRegistryCase` (retype to return caseView) -> SL approve action.
6. `GET /trials` -> Research trial list (`:918`) + trial KPIs.
7. `POST /trials/:trialId/refer` -> `referPatientToTrial` (add `notes`, return referral, handle 409) -> SL refer action (net-new).
8. `PATCH /registry/cases/:caseId` -> `updateRegistryCase` -> SL registry form field edits.
9. `GET /modules/structural-heart/patients` -> SH CT patients worklist (`StructuralCareTeamView.tsx:145`, hardcoded; the banner already calls this endpoint) - the only non-Research wire target.
10. `GET /modules/<slug>/dashboard` `summary.gapsByType` -> HF CT workflow counts (`CareTeamView.tsx:219-227`, hardcoded "23 patients pending").

### Top-10 kills by size (lines deleted)
| # | Target | Lines | Kind |
|---|---|---|---|
| 1 | `EPReferralTrackerEnhanced.tsx` | 977 | orphan component (0 importers) |
| 2 | SH `careTeamConfig.tsx` | 934 | orphan config (whole file) |
| 3 | VHD `careTeamConfig.tsx` | 862 | orphan config (whole file) |
| 4 | CAD `serviceLineConfig.tsx` | 828 | orphan config (HARVEST gap-pipeline first) |
| 5 | `EPPatientPanelTable.tsx` | 794 | orphan component |
| 6 | EP `careTeamConfig.tsx` | 786 | orphan config (whole file) |
| 7 | `EPDevicePathwayFunnel.tsx` | 786 | orphan component |
| 8 | SH `serviceLineConfig.tsx` | 782 | orphan config (HARVEST gap-pipeline first) |
| 9 | `EPOutcomesByCohort.tsx` | 744 | unreachable (dead `case`, no tab id) |
| 10 | HF `careTeamConfig.tsx` | 690 | orphan config (whole file) |
Total top-10 ~= 8,183 lines. Full orphan-component + orphan-config deletion ~= 12,000+ lines.

### Judgment calls flagged for operator attention (close dispositions) - see section 6.

---

## 2. THE FOUR-WAY TEST (applied per panel)
- **KEEP-AND-WIRE** - a live endpoint (or the gap engine) exists and should feed the panel. Endpoint named.
- **KEEP-AND-BADGE** - no engine yet, but a REAL clinical spec anchors it (KB gap, guideline COR/LOE, registry measure). The badge is the UI form of INDETERMINATE honesty. Anchor named.
- **KEEP (calculator)** - client-side deterministic clinical logic (real tools). Dedup multiple mounts to one; never kill.
- **KILL** - anchored to NOTHING: no endpoint, no KB gap, no spec, no citation; plus orphans (0 importers), unreachable tabs, empty-tab shims, duplicates. KILL requires POSITIVE no-anchor evidence; when in doubt, KEEP-AND-BADGE. Every kill records a resurrection line.

---

## 3. KB CROSSWALK VALIDATION (Part 3, run BEFORE finalizing)

**Anchor sources:** 603 KB gap IDs (`CLINICAL_KNOWLEDGE_BASE_v4.0.md`; HF 126 / PV 105 / VHD 105 / CAD 90 / EP 89 / SH 88), the 6 Phase 0B addenda (DET_OK / SPEC_ONLY status per gap), the ROI pathways.

**Pass result: 5 kills reclassified.** Five orphan `serviceLineConfig` files contain a gap-pipeline panel that reads the module's `_CLINICAL_GAPS` KB. A plain deletion would discard gap-driven presentation logic, so these move to **KILL-WITH-HARVEST**: resurrect the gap-pipeline into the live SL view, then delete the orphan config.

| Reclassified panel | Orphan file | Reads | Harvest target |
|---|---|---|---|
| `HFAdvancedTherapyPipeline` | HF serviceLineConfig | `HF_CLINICAL_GAPS` (6 refs) | HF SL - fold gap-driven pipeline into gap-detection or a new pipeline tab; drop the "$6M Revenue Acceleration" exec framing |
| `EPDeviceAblationPipeline` | EP serviceLineConfig:280 | `EP_CLINICAL_GAPS` gaps 4/10/11/65/69/70 | EP SL; trim revenue projections (relocate-UP) |
| `TAVRCandidatePipeline` | SH serviceLineConfig:93 | `SH_CLINICAL_GAPS` (5 refs) | SH SL - richer than the live provider-scorecard; drop revenue forecast |
| `CADInterventionPipeline` | CAD serviceLineConfig:341 | `CAD_CLINICAL_GAPS` gaps 46/47/48/52 | CAD SL; drop the $2.4M/$4.7M revenue lines |
| `PVVascularPipeline` | PV serviceLineConfig:475 | `PV_CLINICAL_GAPS` (5 refs) | PV SL; drop "$3.6M Revenue Acceleration" |

**Coverage-preservation proof:** every live gap dashboard carries the same `_CLINICAL_GAPS` KB (HF/EP/SH/CAD/PV/VD dashboards each `grep` positive). So even if harvest is deferred, no gap is lost - the live dashboard still surfaces it. **No RENDERED panel was a mis-triaged KILL:** the three rendered kills (EP `outcomes-cohort` unreachable, PV `network` empty tab, PV `PADRiskCalculators` descriptive-only) all have their clinical content covered elsewhere (the gap dashboard, or the real WIfI calculator on the `wifi` tab). The pass earned its place: 5 reclassifications.

---

## 4. WIRE TARGETS (the depth-increase list)

The flagship is the **trials/registry engine**: a real three-state eligibility service and a real registry state machine that the frontend does not consume.

**Backend (verified):**
- `trialMatchService.ts:53` `TrialMatchStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'INDETERMINATE'`; verdict `:169`. Emitted by `GET /trials/:trialId/eligible-patients` (`trials.ts:66-121`), which RETURNS indeterminate patients rather than filtering them.
- Registry state machine `schema.prisma:2736` `DRAFT/SUBMITTED/APPROVED/REJECTED`; transitions enforced in `registry.ts` (submit/approve/reject, 409 off-transition).

**Frontend gap (verified):** the Research view calls NO TAILRD backend (only an external `clinicaltrials.gov` fetch at `ResearchServiceLineView.tsx:527`). It renders three hardcoded arrays: `curatedTrials` 14 (`:281`), `trials` 5 (Exec `:71`), `trialQueue` 10 (CT `:41`). The eligible-patients box (`:1073-1084`) renders a literal count under a FALSE-PROVENANCE caption ("Based on EHR-matched inclusion/exclusion criteria...").

**Client delta:**
- **CREATE 2:** `submitRegistryCase` (backend `registry.ts:140` exists), `rejectRegistryCase` (backend `registry.ts:230` exists). Both ABSENT in `api.ts`.
- **WIRE 6 dead-but-present:** `getTrials`, `getTrialEligiblePatients` (also RETYPE - currently `Patient[]`, silently dropping `matchStatus`/`criteriaResults`/`indeterminateSignals`), `referPatientToTrial` (add `notes`, return the referral, handle 409), `getRegistryCases`, `updateRegistryCase`, `approveRegistryCase` (retype to return caseView). All defined in `api.ts`, consumed by no component.
- **2 dead hooks:** `useTrials`, `useRegistryCases` (defined, consumed by nothing). At minimum add `useTrialEligiblePatients` for the flagship box.
- **Net-new UI:** the `INDETERMINATE` ("one test away") state has NO widget anywhere; wiring the flagship requires building it, plus loading/error/unavailable states per the exec-arc honest-state convention.
- **~9-10 Research panels** go mock -> live.

Non-Research wire target: `GET /modules/structural-heart/patients` -> SH CT patients worklist (hardcoded at `StructuralCareTeamView.tsx:145` though the banner already calls it). Several UNBADGED-MOCK "workflow count" panels can WIRE to `dashboard.summary.gapsByType` instead of badging.

**Honest-state requirement (all wires):** every wired read ships with loading / error / unavailable states (the exec-arc convention). No silent-mock fallback.

---

## 5. STRUCTURAL NOTES (feed the converge phase; no rulings needed yet)

### Cross-cutting duplicates (dedup targets)
- **Gap dashboards render on BOTH SL and CT, unfiltered, in all 6 modules** (SL keep; CT should get a care-team-filtered view or drop). HF SL:137/CT:358; EP SL:276/CT:360; SH SL:397/CT:202; CAD SL:665/CT:172; VHD SL:548/CT:220; PV SL:327/CT:173.
- **TAVRAnalyticsDashboard** mounted SH SL:96 + SH CT:142 (+2 dead default branches +2 orphan-config). It is program/quality analytics -> keep on SL, relocate-OUT of CT.
- **MAGGIC** mounted twice in the HF CT tray (`risk-calc` + `maggic-standalone`) -> collapse to one.
- **GRACE** mounted 3x in CAD (careTeamConfig:151, ServiceLineView:100 survivor + :673 dup fallback) + an orphan + a different shared `riskCalculators/GRACE` -> collapse.
- **WIfI** mounted 2x in PV (SL wifi:315 + CT dashboard config:110) -> collapse.
- **StructuralReferralNetworkVisualization** SH SL:100 + CT:328; **ValvularSurgicalNetworkVisualization** VHD SL:106 + CT:294; **PVWoundCareNetworkVisualization** PV SL:321 + CT dashboard -> dedup.
- **HF CT** has a redundant `hospital-alerts` tab (dup of dashboard RealTimeHospitalAlerts) and a redundant `team` tab (dup of dashboard TeamCollaborationPanel).

### Empty-tab shims (AUDIT-300 P2 gutted to EmptyState; P4 per-module-data seams)
`PatientRiskHeatmap` (5 mounts) and `CareTeamNetworkGraph` (4 mounts) are honest EmptyState shims. Pure empty tabs (shim is the sole child) = merge/kill candidates: EP SL `network`, EP CT `hospital-alerts`, SH CT `hospital-alerts`, SH SL `care-network`, PV SL `network`. `RealTimeHospitalAlerts` exists only for HF/EP/SH (none on CAD/VHD/PV).

### SL group shape post-triage
Each SL converges toward: a live KPI banner + a live gap-detection group (dashboard + relocated GapResponseRate/Trajectory) + a calculators group (deduped instruments) + a procedure-pathways group (the guideline-anchored inline funnels, badged, or the harvested gap-pipeline) + a quality/outcomes group (badged registry measures) + a reporting utility. The orphan-config "richer twins" (real tables) are the resurrection source for the analytics/quality/provider panels currently shipping as 2-card stubs (notably PV, EP).

### CT relocation candidates (content answering SL/exec questions - flagged, NOT ruled; CT contract is a separate operator ruling)
- SH CT: TAVRAnalyticsDashboard + 4 KPI cards (`:104-141`) = program/quality metrics -> relocate-UP.
- EP CT: `EPTreatmentGapQueue` duplicates SL gap content (down-tier overlap).
- Volume/CMI-flavored SL panels (VHD SL Analytics "Total Surgical Volume 423 +6.2%"; PV SL PAD Analytics "1,456 +11.2%"; CAD SL analytics volumes; EP AutomatedReportingSystem exec-summary) -> relocate-UP candidates.
- The genuine ROI/revenue content ("Revenue Acceleration $X.XM", pipeline forecasts) lives almost entirely in the ORPHAN configs, so it is not a live tier-doctrine violation today; it must be dropped, not relocated, when the gap-pipelines are harvested.

---

## 6. JUDGMENT CALLS (close dispositions - operator attention)

1. **The 5 harvest-before-kill gap-pipelines (section 3).** Option A: harvest the richer gap-driven tables into the live SL views, then delete the orphan configs (more work, more depth). Option B: badge the simpler shipped inline panels and delete the configs outright (cheaper, loses the richer presentation - but gap coverage survives via the live dashboards). Recommendation: A for the pipeline panels (they are genuinely richer and gap-anchored); B for the rest of each orphan config.

2. **HFCareNetworkVisualization** (`ServiceLineView.tsx:128`). The last un-remediated fully-fabricated network (hardcoded nodes incl. a fake "Dr. Sarah Martinez", no endpoint/gap/cite). The other 4-5 network visualizations were gutted to EmptyState shims by AUDIT-300 P2. Ruled KEEP-AND-BADGE by the "when unsure, badge" rule, but the consistent move is KILL-to-shim. Operator to pick badge vs shim-replace.

3. **AutomatedReportingSystem on the EP `reporting` tab.** Generic GDMT/HF reporting content (not EP) with `Math.random()` fabricated recipient counts. Shared component (not orphan), but mis-placed on an EP tab. KILL-from-EP vs BADGE.

4. **The ~105 KEEP-AND-BADGE panels: badge vs wire.** Many (procedure funnels, quality metrics, phenotype charts) map to a KB gap and could WIRE to the gap engine rather than just carry a demo pill. The badge-vs-wire split within KEEP is a per-panel converge-phase decision; wholesale badging is the floor, not the ceiling.

5. **PV `PADRiskCalculators`** (`PeripheralServiceLineView.tsx:95`). Descriptive-only text cards naming WIfI/ABI/GLASS but functioning as none; the real WIfI calculator ships on the adjacent `wifi` tab. KILL the descriptive panel and either point the tab at the existing WIfI calc or resurrect the config twin (`serviceLineConfig:135` mounts real `<WIfIClassification/>`).

6. **The "Last updated: <ticking clock>" class** (e.g. `StructuralReferralNetworkVisualization` `setInterval` 30s clock, `:83-88`). AUDIT-303 ruled the clock acceptable ("a clock, not a data claim") and its test pins it intact. Revisit in this arc (remove the freshness affordance over static data) or leave per the standing ruling?

7. **Cross-tier gap-dashboard dedup (all 6 modules).** Keep on SL; the CT mount is an unfiltered duplicate. Decision: does CT get a care-team-filtered/worklist-scoped gap view, or drop the tab and rely on the SL surface?

8. **CrossReferralEngine dead links.** `window.open('/referral/${id}')` at `CrossReferralEngine.tsx:429,491` with no `/referral` route in `App.tsx` (opens a blank tab). Shared component on HF SL + CAD SL + SH SL. Fix the links (add route) or the whole panel is mock -> badge + disable the links.

---

## 7. PER-TIER DISPOSITION TABLES

Notation in "State": LIVE:<endpoint> / DEMO-BADGED / MOCK (unbadged) / STUB / CALC / DUP-of:<x> / ORPHAN / UNREACHABLE. Disposition: WIRE / BADGE / KEEP-CALC / KILL.

### HF SERVICE LINE (`views/ServiceLineView.tsx`) - 14 panels, 0 rendered kills
| Tab | Panel (file:line) | State | Clinical asset | Disp | Notes |
|---|---|---|---|---|---|
| gdmt | GDMTAnalyticsDashboard (:104) | LIVE:/heart-failure/dashboard+patients | 4-pillar GDMT coverage | KEEP | wired |
| heatmap | PatientRiskHeatmap (:107) | STUB shim | none (P4 seam) | BADGE | shares tab w/ Trajectory |
| heatmap | TrajectoryTrendsCard (:110) | DEMO-BADGED | KCCQ/ATTR-CM trajectory | BADGE | relocated Exec->SL |
| phenotype-detection | PhenotypeDetectionChart (:127) | MOCK | 12 HF phenotypes (amyloid/HCM/Fabry) | BADGE | anchor=phenotype list |
| gap-detection | ClinicalGapDetectionDashboard (:137) | LIVE gap adapter + 25-gap KB | gap engine (COR/LOE) | KEEP | DUP-of CT:358 |
| gap-detection | GapResponseRateCard (:141) | STUB honest-empty | none yet | BADGE | relocated Exec->SL |
| devices | DevicePathwayFunnel (:126) | LIVE:/dashboard+patients | deviceCandidates | KEEP | wired |
| device-underutil | DeviceUnderutilizationPanel (:132) | MOCK | CRT/ICD/WATCHMAN/CardioMEMS criteria | BADGE | DRG$ = mild relocate-UP |
| providers | ProviderScorecard (:125) | LIVE(summary)/EHR-blocked | summary totals | KEEP | provider attr honest-blocked |
| network | HFCareNetworkVisualization (:128) | MOCK (fabricated) | NONE (fake Dr. names) | BADGE-or-KILL | judgment call #2 |
| cross-referral | CrossReferralEngine (:133) | MOCK + dead links | referral concept | BADGE | judgment call #8 |
| quality | QualityMetricsDashboard (:129) | MOCK + 3 silent stubs | GDMT/readmit/mortality/KCCQ | BADGE + strip | stubs L446/456/466 |
| kccq-outcomes | KCCQOutcomesPanel (:131) | DEMO-BADGED | KCCQ (Spertus/UMKC) | KEEP-CALC | honest badge |
| reporting | AutomatedReportingSystem (:130) | MOCK | none clinical | BADGE | infra scaffolding |

### HF CARE TEAM (`views/CareTeamView.tsx`) - 13 panels + 9-tool tray, 0 rendered kills
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| dashboard | RealTimeHospitalAlerts (:152) | LIVE:/dashboard recentAlerts | gap alerts (honest post-300) | KEEP | DUP-of :296 |
| dashboard | CareGapAnalyzer (:154) | LIVE:/dashboard+patients | gapsByType | KEEP | |
| dashboard | TeamCollaborationPanel (:155) | STUB honest-empty | none (needs directory) | KEEP | DUP-of :302 |
| patients | PatientWorklistEnhanced (:162) | LIVE:/patients | worklist+gap badges | KEEP | |
| workflow | 4-Pillar GDMT card (:174-213) | LIVE:/dashboard | gdmtMetrics | KEEP | |
| workflow | Workflow Actions card (:214-231) | MOCK (nav works) | none (hardcoded counts) | WIRE-or-BADGE | wire counts to gapsByType |
| safety | Safety Monitoring card (:238-290) | LIVE:/dashboard | gapsByType safety | KEEP | |
| hospital-alerts | RealTimeHospitalAlerts (:296) | LIVE | dup | KEEP/dedup | redundant tab |
| team | TeamCollaborationPanel (:302) | STUB | dup | KEEP/merge | empty-tab |
| documentation | Recent Activity card (:314-333) | LIVE:/dashboard | recentAlerts timeline | KEEP | |
| documentation | Documentation Tools (:334-350) | STUB fake-success | none | WIRE-or-BADGE | fake "Template Loaded" 2s |
| clinicaltools | ClinicalToolsPanel shell (:356) | LIVE:/patients selector | 9-instrument host | KEEP | |
| clinical-gaps | ClinicalGapDetectionDashboard (:358) | LIVE | dup | KEEP/dedup | cross-tier dup |
| tray | HFPhenotypeClassification | CALC | iron-def/OSA classifier | KEEP-CALC | |
| tray | MAGGICScoreCalculator (risk-calc) | CALC | MAGGIC | KEEP-CALC | DEDUP w/ maggic-standalone |
| tray | GDMTContraindicationChecker | CALC | ARNi/BB/SGLT2i/MRA CDS | KEEP-CALC | |
| tray | SpecialtyPhenotypesDashboard | MOCK (COR-cited) | JACC HF 2019 / Gillmore NEJM | BADGE | |
| tray | AdvancedDeviceTracker | MOCK (SCD-HeFT cited) | 2 disclosed toasts | BADGE | honest toasts L390/400 |
| tray | MAGGICCalculator (maggic-standalone) | CALC | MAGGIC (2nd copy) | KEEP-CALC + DEDUP | collapse to one |
| tray | INTERMACSCalculator | CALC | INTERMACS profile | KEEP-CALC | |
| tray | AmyloidosisScreener | CALC | ATTR-CM weighted screen | KEEP-CALC | |
| tray | PhenotypeScreeningPanel | MOCK | phenotype board | BADGE | |
HF ORPHAN KILL: `ReferralTrackerEnhanced` (imported CareTeamView:8, never rendered), `PatientWorklist`/`ReferralTracker`/`PatientDetailPanel` chain, HF careTeamConfig (orphan), HF serviceLineConfig (orphan; HFAdvancedTherapyPipeline = harvest).

### EP SERVICE LINE (`views/EPServiceLineView.tsx`) - 15 reachable + 1 unreachable
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| (banner) | ServiceLineKPIBanner (:292) | LIVE:/electrophysiology/dashboard+patients | endpoint | KEEP | only live SL surface |
| analytics | ElectrophysiologyAnalytics (:239) | MOCK | none | BADGE | orphan has richer twin |
| heatmap | PatientRiskHeatmap (:242) | STUB shim | none | BADGE | + Trajectory below |
| heatmap | TrajectoryTrendsCard (:245) | DEMO-BADGED | QTc/CHA2DS2 trajectory | BADGE | relocated |
| phenotype-detection | EPPhenotypeDetectionChart (:260) | MOCK | phenotype prevalence | BADGE | |
| gap-detection | EPClinicalGapDetectionDashboard (:276) | LIVE gap adapter + KB | CHA2DS2/CASTLE-AF/DANISH/LAAC/dofetilide | KEEP | crown jewel; DUP-of CT:360 |
| gap-detection | GapResponseRateCard (:280) | DEMO-BADGED honest-empty | none yet | BADGE | relocated |
| arrhythmia | ArrhythmiaManagement (:261) | MOCK (stub) | none | BADGE | orphan richer table :190 |
| safety | AnticoagulationSafetyChecker (:263) | CALC | contraindication logic | KEEP-CALC | |
| laac-risk | LAACRiskDashboard (:262) | CALC (mock data) | LAAC/CHA2DS2/HAS-BLED | KEEP-CALC | badge the data |
| automated-support | EPAutomatedClinicalSupport (:264) | DEMO-BADGED (disclosed toasts) | none | BADGE | toasts :761/772 |
| device-network | EPDeviceNetworkVisualization (:265) | MOCK | none | BADGE | |
| network | CareTeamNetworkGraph (:266) | STUB shim (pure empty) | none | BADGE/merge | empty tab |
| providers | EPProviderPerformance (:267) | MOCK | none | BADGE | orphan richer :145 |
| quality | EPQualityMetrics (:268) | MOCK | none | BADGE | orphan richer :234 |
| outcomes-trends | EPOutcomesTrends (:269) | MOCK + stubs | none | BADGE + strip | demoAction/console.log |
| equity-analysis | EPEquityAnalysis (:270) | DEMO-BADGED + 1 silent | none | BADGE + strip :645 | |
| reporting | AutomatedReportingSystem (:272) | MOCK (generic GDMT) | none | KILL-from-EP/BADGE | judgment call #3 |
| outcomes-cohort | EPOutcomesByCohort (:271) | UNREACHABLE (744ln) | none; 5 console.log | **KILL** | dead case, no tab id |

### EP CARE TEAM (`views/EPCareTeamView.tsx`) - 9 dashboard sub + 8 tabs (5 tools)
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| dashboard | KPI strip (:113-149) | MOCK | none (127/8/15/23) | BADGE | |
| dashboard | EPPriorityWorklist (:153) | MOCK | none | BADGE | |
| dashboard | EPActionQueue (:154) | MOCK | none | BADGE | |
| dashboard | EPTreatmentGapQueue (:159) | MOCK | closest gap engine | BADGE | overlaps SL gap |
| dashboard | EPFollowUpQueue (:160) | MOCK | none | BADGE | |
| dashboard | EPAlertDashboard (:165) | MOCK | none | BADGE | |
| dashboard | EPPatientTimeline (:170) | MOCK | none | BADGE | |
| dashboard | Quick Actions (:177) | STUB fake-success | none | BADGE/strip | |
| dashboard | Communication (:203) | MOCK | none | BADGE | |
| patients | inline table (:234) | MOCK | none | BADGE | |
| clinical-gaps | EPClinicalGapDetectionDashboard (:360) | DUP-of SL:276 | gap engine | DEDUP | |
| workflow | inline (:278) | MOCK | none | BADGE | |
| safety | inline (:313) | MOCK | QTc/INR/REMS | BADGE | |
| hospital-alerts | EPRealTimeHospitalAlerts (:356) | STUB shim (pure empty) | none | BADGE/merge | empty tab |
| tools | EPPhenotypeClassification (:33) | MOCK (consumes patientData) | phenotype KB | BADGE | |
| tools | EPCHADSVAScCalculator (:34) | CALC | CHA2DS2-VASc | KEEP-CALC | |
| tools | EPAnticoagulationContraindicationChecker (:35) | CALC | anticoag CDS | KEEP-CALC | |
| tools | EPAdvancedDeviceTracker (:36) | MOCK (ignores patientData) | none | BADGE | prop mismatch |
| tools | ORBITBleedingCalculator (:37) | CALC (ignores patientData) | ORBIT bleeding | KEEP-CALC | manual input |
| team | inline (:361) | MOCK | none | BADGE | |
| documentation | inline (:427) | MOCK | none | BADGE | |
EP ORPHAN KILL (all 0-importer, verified): EPGapAnalysisPanel(562,14 stubs), EPDevicePathwayFunnel(786), EPPatientPanelTable(794), EPPhysicianPerformanceHeatmap(613), EPReferralTrackerEnhanced(977), EPReferralTracker(223), EPPatientWorklist(254), AblationPlanningChecklist(644), DeviceImplantChecklist(638), OACManagementPanel(604), EP careTeamConfig(786), EP serviceLineConfig tabContent (EPDeviceAblationPipeline=harvest).

### SH SERVICE LINE (`views/StructuralServiceLineView.tsx`) - 17 panels
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| (banner) | ServiceLineKPIBanner (:420) | LIVE:/structural-heart/dashboard+patients | endpoint | KEEP | |
| tavr | TAVRAnalyticsDashboard (:96) | DEMO-BADGED | STS/TVT quality (mortality/stroke/AKI/PVL) | BADGE | honesty-hotfix landed; DUP-of CT:142 |
| teer-mitral | inline funnel (:101) | MOCK | TEER/COAPT criteria | BADGE | + candidate WIRE to Gap 5 |
| teer-tricuspid | inline (:144) | MOCK | tricuspid TEER (Gap 8) | BADGE | |
| tmvr | inline (:166) | MOCK | TMVR candidacy | BADGE | |
| pfo-asd | inline (:221) | MOCK | PFO/ASD closure (sh-12) | BADGE | |
| gap-detection | SHClinicalGapDetectionDashboard (:397) | LIVE gap adapter + 24-gap KB | EARLY-TAVR/COAPT/TRILUMINATE | KEEP | DUP-of CT:202 |
| gap-detection | GapResponseRateCard (:401) | DEMO-BADGED honest-empty | none yet | BADGE | relocated |
| sts-risk | STSRiskCalculator (:98) | CALC | STS PROM | KEEP-CALC | two STS instruments exist |
| risk-heatmap | PatientRiskHeatmap (:374) | STUB shim | none | BADGE | + Trajectory |
| risk-heatmap | TrajectoryTrendsCard (:377) | DEMO-BADGED | AS/BAV progression | BADGE | relocated |
| quality | inline (:296) | MOCK | STS/TVT measures | BADGE | |
| outcomes | inline (:276) | MOCK | 30-day mortality/stroke | BADGE | near-dup of quality |
| phenotype-detection | SHPhenotypeDetection (:407) | MOCK | phenotype KB | BADGE | |
| referrals | StructuralReferralNetworkVisualization (:100) | MOCK + setInterval clock | none | BADGE | DUP-of CT:328; clock #6 |
| provider-scorecard | SHProviderScorecard (:405) | MOCK ("Mock provider data") | none | BADGE | |
| cross-referral | CrossReferralEngine (:409) | MOCK | none | BADGE | shared |
| care-network | CareTeamNetworkGraph (:393) | STUB shim (pure empty) | none | BADGE/merge | empty tab |
| reporting | AutomatedReportingSystem (:370) | MOCK (Math.random recipients) | none | BADGE + strip | |

### SH CARE TEAM (`views/StructuralCareTeamView.tsx`) - 10 tabs + 6 tools
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| dashboard | 4 KPI cards (:104-141) | MOCK | none | BADGE | relocate-UP |
| dashboard | TAVRAnalyticsDashboard (:142) | DEMO-BADGED | dup | BADGE/relocate-UP | program analytics on CT |
| patients | inline worklist (:145) | MOCK | none (roster fabricated) | **WIRE** | endpoint exists, not read |
| clinical-gaps | SHClinicalGapDetectionDashboard (:202) | DUP-of SL:397 | gap engine | DEDUP | |
| workflow | inline (:205) | MOCK | TAVR pathway | BADGE | |
| hospital-alerts | SHRealTimeHospitalAlerts (:204) | STUB shim (pure empty) | none | BADGE/merge | empty tab |
| safety | inline (:290) | MOCK | safety categories | BADGE | |
| calculator | SHValveRiskScoreCalculator (:196) | CALC | valve risk | KEEP-CALC | tab mislabeled "STS Risk" |
| tools | phenotype/risk-calc/contraindication (3) | CALC | deterministic | KEEP-CALC | |
| tools | procedure-tracker/specialty/amyloidosis (3) | MOCK | ignore patientData (3/6) | BADGE | prop mismatch |
| team | StructuralReferralNetworkVisualization (:328) | DUP-of SL:100 | none | BADGE/dedup | |
| documentation | inline (:332) | MOCK | none | BADGE | |
SH ORPHAN KILL (0-importer): StructuralInterventionPathwayFunnel, SHValveCareNetworkVisualization, SHReferralTracker, SHReferralTrackerEnhanced, SH careTeamConfig(934), SH serviceLineConfig(782; TAVRCandidatePipeline=harvest).

### CAD SERVICE LINE (`views/CoronaryServiceLineView.tsx`) - 17 panels
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| (banner) | ServiceLineKPIBanner (:682) | LIVE:/coronary-intervention/dashboard | endpoint | KEEP | |
| analytics | Procedure Analytics inline (:420) | MOCK | volumes | WIRE-or-BADGE | relocate-UP |
| risk-heatmap | PatientRiskHeatmap (:640) | STUB shim | none | BADGE | + Trajectory |
| risk-heatmap | TrajectoryTrendsCard (:643) | DEMO-BADGED | PCSK9i/SAQ trajectory | BADGE | relocated |
| grace | GRACEScoreCalculator (:100) | CALC | GRACE | KEEP-CALC | DEDUP (x3) survivor |
| timi | TIMIScoreCalculator (:102) | CALC | TIMI | KEEP-CALC | |
| syntax | SYNTAXScoreCalculator (:104) | CALC | SYNTAX | KEEP-CALC | two SYNTAX comps exist |
| cabg-vs-pci | inline (:109) | MOCK | EXCEL/NOBLE/2021 ACC-AHA | BADGE | guideline ref |
| protected-pci | inline (:210) | MOCK | selection criteria | BADGE | |
| multi-arterial | inline (:260) | MOCK | ART/RADIAL | BADGE | |
| on-off-pump | inline (:331) | MOCK | CORONARY/ROOBY/GOPCABE | BADGE | |
| safety | CoronarySafetyScreening (:106) | component | safety screening | KEEP | also CT |
| gap-detection | CADClinicalGapDetectionDashboard (:665) | LIVE + 71-gap KB | gap engine (double-unwrap fixed) | KEEP | DUP-of CT:172 |
| gap-detection | GapResponseRateCard (:669) | STUB honest-empty | none yet | BADGE | relocated |
| network | PCINetworkVisualization (:108) | component (clock only) | PCI network | KEEP | AUDIT-303 cleared |
| care-network | CareTeamNetworkGraph (:659) | STUB shim | none | BADGE/merge | empty-tab |
| cross-referral | CrossReferralEngine (:661) | MOCK + dead links | none | BADGE | judgment #8 |
| saq-outcomes | SAQOutcomesPanel (:636) | DEMO-BADGED | Seattle Angina PRO | KEEP-CALC/BADGE | validated instrument |
| outcomes | inline (:527) | MOCK | CathPCI/STS | WIRE-or-BADGE | |
| reporting | AutomatedReportingSystem (:634) | shared | reporting | KEEP/verify | |

### CAD CARE TEAM (`views/CoronaryCareTeamView.tsx` + careTeamConfig RENDERED) - 11 panels
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| dashboard | CoronaryDashboard (config:18) | MOCK | none (247/78min/94.2%) | WIRE/relocate-UP | SL/exec KPIs on CT |
| patients | CoronaryPatients (config:66) | MOCK + embedded GRACE/TIMI/SYNTAX | roster + calcs | BADGE/KEEP-CALC | "Export Registry":76 silent |
| clinical-gaps | CADClinicalGapDetectionDashboard (view:172) | LIVE (dup of SL) | gap engine | DEDUP | config wrapper :660 dead |
| workflow | CoronaryWorkflow (config:176) | MOCK | SYNTAX/STEMI reference | BADGE | |
| safety | CoronarySafety (config:299) | components | safety + risk calc | KEEP | |
| team | CoronaryClinicalCollaboration (config:310) | MOCK + 2 toasts + 2 silent | pathway text | BADGE + strip | toasts :452/461; silent :467/471 |
| documentation | CoronaryDocumentation (config:484) | MOCK + 2 toasts + silent | none | BADGE + strip | toasts :628/640; 6 template btns :575 |
| planning | CasePlanningTool (view:168) | component | SYNTAX/conduit planning | KEEP | |
| checklist | ProtectedPCIChecklist (view:169) | component | procedure checklist | KEEP | |
| worklist | CoronaryWorklist (view:170) | component | DAPT/rehab worklist | KEEP | |
| tools | ClinicalToolsPanel 7 ActiveTools (view:26) | mixed; 4/7 ignore patientData | calcs + phenotype | KEEP-CALC + fix | prop mismatch |
CAD careTeamConfig stubs: 4 disclosed toasts + 11 silent dead onClicks. CAD ORPHAN KILL: CADInterventionPathwayFunnel(0-imp), CAD serviceLineConfig(828; CADInterventionPipeline=harvest).

### VHD SERVICE LINE (`views/ValvularServiceLineView.tsx`) - 14 panels
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| (banner) | ServiceLineKPIBanner (:565) | LIVE:/valvular-disease/dashboard+patients | endpoint | KEEP | |
| gap-detection | VDClinicalGapDetectionDashboard (:548) | LIVE + VD-1..32 KB | gap engine (double-unwrap fixed) | KEEP | DUP-of CT:220 |
| gap-detection | GapResponseRateCard (:552) | DEMO-BADGED honest-empty | none yet | BADGE | relocated |
| heatmap | ValvePatientHeatmap (:87) | MOCK (Math.sin PRNG 120pts) | valve staging | BADGE | DUP-of CT:155 |
| heatmap | TrajectoryTrendsCard (:90) | DEMO-BADGED | AS Vmax progression | BADGE | relocated |
| referrals | ValvularSurgicalNetworkVisualization (:106) | MOCK | referral network | BADGE | DUP-of CT:294 |
| bicuspid | inline (:107) | MOCK | BAV repair pathway | BADGE | |
| ross | inline (:172) | MOCK | Ross criteria | BADGE | |
| repair-replace | inline (:214) | MOCK | decision factors | BADGE | |
| echo-surveillance | inline (:308) | MOCK | surveillance intervals | BADGE | |
| quality | inline (:490) | MOCK | STS quality | BADGE | |
| analytics | inline (:369) | MOCK | case-mix/volume | BADGE/relocate-UP | "Volume 423 +6.2%" |
| outcomes | inline (:431) | MOCK | outcomes vs benchmark | BADGE | |
| reporting | AutomatedReportingSystem (:544) | shared | reporting | KEEP | |

### VHD CARE TEAM (`views/ValvularCareTeamView.tsx` inline) - 10 tabs
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| dashboard | 4 KPI + ValvePatientHeatmap (:114-156) | MOCK | valve staging | BADGE | heatmap DUP-of SL:87 |
| patients | inline table (:158) | MOCK | registry | BADGE | |
| clinical-gaps | VDClinicalGapDetectionDashboard (:220) | LIVE (dup of SL) | gap engine | DEDUP | |
| surgical-planning | inline checklist (:222) | MOCK (interactive) | pre-op + STS/EuroSCORE | BADGE | |
| valve-surveillance | inline (:275) | MOCK | surveillance | BADGE | |
| surgical-referral-network | ValvularSurgicalNetworkVisualization (:294) | MOCK | referral net | BADGE | label fixed (AUDIT-303); DUP-of SL:106 |
| clinical-intelligence | ClinicalToolsPanel (:295) | mixed | phenotype/STS/contraindication | KEEP-CALC | |
| safety | inline (:297) | MOCK | safety alerts | BADGE | |
| team | inline (:310) | MOCK | roster | BADGE | |
| documentation | inline (:323) | MOCK | templates (dead buttons) | BADGE | |
VHD ORPHAN KILL: ValvularInterventionPathwayFunnel(0-imp, fixed-inset :615), VHD careTeamConfig(862), VHD serviceLineConfig(438; no gap KB -> plain kill).

### PV SERVICE LINE (`views/PeripheralServiceLineView.tsx`) - 17 panels, 2 rendered kills
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| (banner) | ServiceLineKPIBanner (:343) | LIVE:/peripheral-vascular/dashboard+patients | endpoint | KEEP | |
| gap-detection | PVClinicalGapDetectionDashboard (:327) | LIVE + KB (COMPASS/ABI/SET/AAA/VTE) | gap engine (double-unwrap fixed) | KEEP | DUP-of CT:173 |
| gap-detection | GapResponseRateCard (:331) | DEMO-BADGED honest-empty | none yet | BADGE | relocated |
| heatmap | PatientRiskHeatmap (:295) | STUB shim | none | BADGE | + Trajectory |
| heatmap | TrajectoryTrendsCard (:298) | DEMO-BADGED | ABI decline/CLI/HERDOO2 | BADGE | relocated |
| network | CareTeamNetworkGraph (:320) | STUB shim (SOLE child) | none | **KILL tab** | pure empty tab |
| wifi | WIfIClassification (:315) | CALC | WIfI instrument | KEEP-CALC | DUP-of CT:110 |
| analytics | PeripheralVascularAnalytics (:291) | MOCK | PAD volume | BADGE/relocate-UP | "1,456 +11.2%" |
| providers | PeripheralVascularProviderScorecard (:313) | MOCK (2 cards) | provider (thin) | BADGE | orphan richer twin |
| calculators | PADRiskCalculators (:314) | MOCK (descriptive-only) | WIfI/ABI/GLASS named, non-functional | **KILL/resurrect** | judgment #5; real wifi tab exists |
| interventions | PADInterventionAnalytics (:316) | MOCK (2 cards) | endovascular metrics | BADGE | orphan richer table |
| cli-management | CLIManagement (:317) | MOCK (2 cards) | limb salvage/CLI | BADGE | orphan richer table |
| limb-salvage | LimbSalvageScreening (:318) | interactive | limb salvage screen | KEEP | real |
| safety | PADSafetyScreening (:319) | MOCK (2 cards) | pre-proc safety | BADGE | orphan richer table |
| wound-care-network | PVWoundCareNetworkVisualization (:321) | MOCK | wound network | BADGE | DUP-of CT dashboard |
| quality | PADQualityMetrics (:322) | MOCK (3 cards) | VQI quality | BADGE | orphan richer table |
| reporting | PADReportingSystem (:323) | utility | reporting | KEEP | |

### PV CARE TEAM (`views/PeripheralCareTeamView.tsx` + careTeamConfig RENDERED) - 12 tabs
| Tab | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| dashboard | PeripheralDashboard (config:59) + WIfI + wound-net | MOCK + calcs | KPIs/WIfI/wound | BADGE + dedup | WIfI DUP-of SL:315; wound DUP-of SL:321 |
| patients | PeripheralPatients (config:125) | MOCK | PAD registry | BADGE | |
| clinical-gaps | PVClinicalGapDetectionDashboard (view:173) | LIVE (dup of SL) | gap engine | DEDUP | config wrapper :483 shadowed |
| workflow | PeripheralWorkflow->PADReportingSystem (config:184) | utility wrapper | reporting | KEEP | thin wrapper |
| safety | PeripheralSafety (config:198) | mixed | LimbSalvage + PADRiskScore + ContraindicationChecker | KEEP-CALC | LimbSalvage DUP-of SL:318 |
| team | PeripheralClinicalCollaboration (config:218) | MOCK + 3 silent stubs | collab / WIfI (flag-gated) | BADGE + strip | :363/373/383 |
| documentation | PeripheralDocumentation (config:412) | MOCK | doc alerts (dead buttons) | BADGE | |
| limb-salvage | LimbSalvageChecklist (view:168) | interactive | WIfI/amputation checklist | KEEP | |
| case-planning | CasePlanningWorksheet (view:169) | interactive | TASC/GLASS | KEEP | |
| wound-care | WoundCareIntegration (view:170) | interactive | CLI/CLTI wound mgmt | KEEP | |
| peripheral-worklist | PeripheralWorklist (view:171) | interactive | worklist + lab sched | KEEP | |
| clinical-intelligence | ClinicalToolsPanel (view:172) | mixed | phenotype/risk/contraindication/Wells-PE | KEEP-CALC | Wells PE ignores patientData |
PV careTeamConfig stubs: 3 silent "implementation pending" (:363/373/383) + ~5 dead buttons; 0 toasts, 0 console.log. PV ORPHAN KILL: PADInterventionPathwayFunnel(0-imp, fixed-inset :615). PV serviceLineConfig tabContent orphan (PVVascularPipeline=harvest; .exportData kept).

### RESEARCH (`ui/research/*`) - ~28 panels (flagship wire target; not an SL/CT tier)
| Tier | Panel (file:line) | State | Asset | Disp | Notes |
|---|---|---|---|---|---|
| Exec | Registry KPI row (:7-12) | MOCK | GET /registry/:type/cases | WIRE | literals 159/80%/212/117 |
| Exec | Registry cards x4 (:14-55) | MOCK | GET /registry cases | WIRE/BADGE | casesPerMonth/autoFillRate |
| Exec | Auto-Fill vs Target chart (:57) | MOCK | none (autoFill% invented) | **KILL/BADGE** | no backend metric; derive from field completeness if live |
| Exec | Trial KPI row (:64-69) | MOCK | GET /trials + eligible counts | WIRE | |
| Exec | Top-5 Active Trials (:71) | MOCK | GET /trials | WIRE | |
| SL | Registry case queue (:657) | MOCK | GET /registry cases | WIRE | 10+8+8+12 cases |
| SL | Registry form field sections (:704) | MOCK | case `fields` Json | WIRE | confidence/source per field |
| SL | Completeness summary (:758) | MOCK (calc) | case fields | KEEP-CALC-after-WIRE | |
| SL | Flags panel (:793) | MOCK | none (no flag engine) | BADGE/KILL | derive from low-confidence fields |
| SL | Source Attribution (:819) | MOCK (calc) | case fields | KEEP-CALC-after-WIRE | |
| SL | Action buttons (:844) | STUB (no onClick) | submit/approve/reject/patch | **WIRE** | maker-checker mutations |
| SL | Trial search+filter (:869) | STUB search | GET /trials?phase=&status= | WIRE | |
| SL | "Live: ClinicalTrials.gov" (:879) | LIVE (external) | public CT.gov API | KEEP | genuinely live, external |
| SL | Curated Trials list 14 (:918) | MOCK + live-external appended | GET /trials | WIRE | the hardcoded 14 |
| SL | **Eligible-patients box (:1073)** | MOCK + FALSE-PROVENANCE | GET /trials/:id/eligible-patients (3-state) | **WIRE (flagship)** | caption :1081 falsely claims EHR-match |
| CT | Registry Abstraction Queue (:135) | MOCK (15 rows) | GET /registry cases | WIRE | |
| CT | Trial Eligibility Queue (:232) | MOCK (10 rows) | GET /trials/:id/eligible-patients | WIRE | invented confidence/status -> real matchStatus |

---

## 8. RESURRECTION REGISTER (what every KILL claimed to show)

**Orphan components (0-importer, KILL):**
- EP (10): `EPGapAnalysisPanel` "EP treatment-gap analysis" (superseded by live gap dashboard); `EPDevicePathwayFunnel` "EP device therapy pathway funnel"; `EPPatientPanelTable` "EP patient panel"; `EPPhysicianPerformanceHeatmap` "EP physician performance"; `EPReferralTrackerEnhanced`/`EPReferralTracker` "referral management"; `EPPatientWorklist` "care-team worklist"; `AblationPlanningChecklist`/`DeviceImplantChecklist` "procedure checklists"; `OACManagementPanel` "OAC/perioperative bridging".
- SH (4): `StructuralInterventionPathwayFunnel` "valve procedure funnel" (resurrect wired to gaps); `SHValveCareNetworkVisualization` "valve care network" (for SL care-network shim); `SHReferralTracker`/`SHReferralTrackerEnhanced` "referral tracking".
- HF (4): `ReferralTrackerEnhanced`/`ReferralTracker`/`PatientWorklist`/`PatientDetailPanel` (orphan chain).
- CAD (1): `CADInterventionPathwayFunnel` "coronary intervention funnel".
- VHD (1): `ValvularInterventionPathwayFunnel` "valve intervention funnel (screen->guidelines->eval->heart-team->procedure)" - resurrect wired to VD-7/VD-12; strip the fixed-inset drawer.
- PV (1): `PADInterventionPathwayFunnel` "PAD intervention funnel (Endovascular/Bypass/Atherectomy/CLI-Salvage)" - resurrect wired to pv-13/pv-14; strip the fixed-inset drawer.

**Orphan config files (KILL; resurrection cost = update the `audit303.labels.test.tsx` imports):** HF careTeamConfig + serviceLineConfig; EP careTeamConfig (serviceLineConfig `.exportData` kept); SH careTeamConfig + serviceLineConfig; CAD serviceLineConfig; VHD careTeamConfig + serviceLineConfig. The 5 gap-pipeline panels (section 3) are harvested first.

**Rendered kills:** EP `outcomes-cohort` "EP outcomes by patient cohort" (unreachable dead `case`); PV `network` empty tab (shim-only); PV `PADRiskCalculators` "WIfI/ABI/GLASS calculators" (descriptive-only; the real WIfI ships on the `wifi` tab); Research "Auto-Fill vs Target" chart (invented metric).

---

*End of ruling input. The operator rules on the dispositions (approve / flip rows); the arc then sequences kill -> wire -> converge.*
