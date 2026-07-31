# Ingestion-source unlock requirements (data-availability record)

**Status: NOT SCHEDULED WORK.** This is a requirements record, not a backlog and not a plan. Nothing
here is proposed, estimated, or sequenced. It exists so that when a data source changes - the DUA
lands, or an operator-side synthetic regeneration happens - the blocked gap clusters can be
re-opened against evidence instead of re-derived from scratch.

**Filed:** 2026-07-31, at the close of Threading Tranche 3.
**Canonical plan reference:** `docs/PATH_TO_ROBUST.md` section 1.4 step 1, TRANCHE 3 CLOSURE RECORD.
**Primary path:** real-EHR data post-DUA. Synthetic regeneration (a custom Synthea module) is an
operator-side option, the same decision shape as AUDIT-198 for the echo-morphometric cluster - it is
recorded here as an option, NOT recommended and NOT proposed.

## Why this record exists

Threading Tranche 3 scoped three candidates and threaded one (Slice 1: PCI/CABG occurrence + dates,
PR #513). Candidates A and B closed on measured data-absence rather than on effort or priority. The
distinction matters: these clusters are not un-built because nobody got to them, they are un-buildable
because the signal the guideline logic requires is not present in the substrate. Every entry below was
MEASURED live against production `demo-synthea-threaded`, not inferred from a schema read.

The discipline this record serves is the platform-wide one: **no gap, trial-criterion, or registry
field asserts on a signal no ingestion path threads.** A gap that cannot see its discriminating signal
either fires for ~100% of its cohort (the AUDIT-194 hollow signature), or reads presence as a positive
result (the AUDIT-197 defect). Recording the wall honestly is the correct outcome; building the rule
anyway is not.

## Blocked clusters, by required signal

Each row names the signal, what was measured, and which gaps unlock. Gap ids are canonical spec ids.

| Required signal | Measured state (2026-07-31, demo-synthea-threaded) | Unlocks |
|---|---|---|
| **Stress-test RESULT values** (positive/negative ischemia, METs, Duke score) | ZERO result-bearing observation types tenant-wide; 3 of 412 stress procedures carry any same-day observation and those are the routine wellness panel; no result field on the Procedure row | GAP-CAD-031, GAP-CAD-048, GAP-CAD-089 |
| **Prosthesis TYPE** (mechanical vs bioprosthetic) | Not carried by the procedure code. TAVR (773996000) implies bioprosthetic; SAVR (26212005) is type-agnostic. `Z95*` device-status conditions: **0 rows / 0 patients** - so the procedure row is the only possible source and it is silent on type | GAP-VHD-010 (SAVR arm), GAP-VHD-018, GAP-VHD-019 |
| **Cardiac CT** (4D CT for leaflet thrombosis) | No cardiac-CT code among the 420 distinct SNOMED procedure codes present; chest / chest-abdomen / head CTs exist but are not cardiac gated studies | GAP-VHD-012, GAP-SH-058 |
| **Anticoagulant medication rows** (warfarin, DOACs) | warfarin rows **0**, warfarin patients **0**, DOAC patients **0** - by name match at any status. An absence-of-anticoagulation rule would fire 100% of its cohort (reverse-hollow) | GAP-VHD-014, GAP-VHD-015 |
| **Antiplatelet medication rows** (aspirin, P2Y12) | aspirin patients **0**, P2Y12 patients **0** - by RxNorm AND by name, at any status. This is why the threaded GAP-CAD-061 is runtime-inert (0 fires) despite being correctly built | raises GAP-CAD-061 from 0 fires; affects any DAPT-dependent criterion |
| **Valve hemodynamics** (mean gradient, EOA, valve size, BSA-indexed iEOA) | gradient observation types **[]**; valve patients with any post-valve gradient **0**; no valve-size or EOA field anywhere | GAP-VHD-021, GAP-VHD-022, GAP-VHD-078, GAP-SH-062 |
| **Annulus / aortic root dimensions** | Absent (same echo-morphometric bucket as AUDIT-198) | GAP-VHD-023 |
| **FDG-PET procedure** | Absent from the 420-code list | GAP-VHD-046 |
| **Structural-deterioration / HALT imaging FINDINGS** (not just the imaging procedure) | No finding stream of any kind; the substrate carries procedure occurrences and numeric observations only | GAP-VHD-013, GAP-VHD-017 |
| **Encounters** | encounters table: **0 rows** for this tenant | GAP-CAD-054, GAP-CAD-055 (both also reverse-hollow on the empty table) |
| **Intra-encounter TIMESTAMPS** (first-medical-contact, device time) | Procedures carry a single `procedureDate`, no times | GAP-CAD-063, GAP-CAD-064 |
| **Symptom / ECG event stream** (chest pain, ST changes, with intra-day granularity) | Absent | GAP-CAD-075 |
| **Stent-thrombosis diagnoses + DAPT fill/adherence data** | `T82.86*` conditions: **0**; no fill data | GAP-CAD-076 |
| **PCI access site** (radial vs femoral) | Not in any ingested field | GAP-CAD-053 |

## Cross-references to existing records

- **AUDIT-198** (operator decision, do NOT build without GO): the echo-morphometric cluster - PASP,
  LVESD, TAPSE, FAC, valve_severity, mitral_regurg_grade, LA size, aortic root, vegetation size. Same
  decision shape as this record; standard Synthea emits only LVEF among echo signals.
- **AUDIT-070**: FHIR-path threading ceiling (ABI / LVEF / QTc / QRS LOINC mappings absent from
  `observationService.CARDIOVASCULAR_LAB_CODES`), a threading ceiling on the FHIR ingestion path
  rather than on source-data availability.
- **`docs/audit/DUA_DEFERRED_GAP_REGISTER.md`**: the pre-existing DUA-deferred register.
- **CLAUDE.md section 20**: the pattern-class sweep discipline and its counter-discipline - a wall is
  recorded per-instance, and suppressing or duplicating a legitimate rule is as wrong as shipping an
  over-fire. GAP-VHD-010's TAVR arm is the worked example: technically threadable, ruled NOT threaded
  because it would duplicate the live VD-ECHO-INTERVAL rule on substantially the same cohort.

## What this record does NOT claim

It does not claim these gaps are close to buildable, or that unlocking one signal unlocks its whole
row cheaply - a signal arriving in source still needs an ingestion path, a value set, section-16
verification, hollow checks, and the full section-9.2 canonical pipeline before any gap moves off
SPEC_ONLY. It also does not claim the list is exhaustive: it covers the clusters Tranche 3 measured,
not every SPEC_ONLY gap on the platform.
