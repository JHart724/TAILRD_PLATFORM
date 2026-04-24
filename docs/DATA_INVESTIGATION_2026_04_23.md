# Production data investigation — 2026-04-23

**Trigger:** Day 9 Phase 9-PRE-5 reported 6,147 patients on production RDS. Jonathan's domain knowledge said the count should be "hundreds of thousands." Wave 2 stopped pending investigation.

**Mode:** Read-only audit. No migration, no DB writes.

**Verdict (TL;DR):** No data loss. The 6,147 count exactly matches every piece of documented history (DATA_DEDUPLICATION_PLAN.md, tech debt #2, MCD dedup change record from 2026-04-22). Production has never held real PHI — it holds the **MCD Synthea demo dataset** plus 15 manually-seeded demo patients. The "hundreds of thousands" expectation does not match what was ever ingested.

This is a **mental-model vs. reality calibration issue**, not a system failure. Wave 2 itself is correctly scoped (the runbook's expected values exactly match the pre-flight numbers).

---

## 1. What the data actually shows

### Patients by hospital

| Hospital | Patients | Active |
|---|---:|---:|
| `demo-medical-city-dallas` (Medical City Dallas) | **6,132** | 6,132 |
| `hosp-001` (TAILRD Demo Hospital) | 10 | 10 |
| `hosp-002` (TAILRD Demo Hospital 2) | 5 | 5 |
| `tailrd-platform` (TAILRD Platform) | 0 | 0 |
| **Total** | **6,147** | **6,147** |

All 4 hospitals are **demo tenants**. There is no `bsw`, no `mount-sinai`, no `commonspirit`, no `hca`, no `medical-city-dallas-hca`. The DEMO MCD tenant is named `demo-medical-city-dallas` to make this clear.

### Patients by status

| Status | Count |
|---|---:|
| `isActive=true AND isMerged=false` | 6,147 |
| `isActive=false` | 0 |
| `isMerged=true` | 0 |

No soft-deleted patients. No merged patients. No "hidden" data behind a filter.

### Patient creation timeline

| Day | Patients created |
|---|---:|
| 2026-04-16 | 1,079 |
| 2026-04-15 | 1,584 |
| 2026-04-14 | 3,469 |
| 2026-04-07 | 15 |
| (no patients created after 2026-04-16) | — |

The 6,132 MCD patients were ingested over Apr 14-16 (Synthea bulk loads). The 15 demo-hospital patients were seeded earlier (Apr 7). After the Apr 22 dedup, no new patients have been added.

### Clinical-data table counts (live `SELECT COUNT(*)`)

| Table | Rows |
|---|---:|
| patients | 6,147 |
| encounters | **353,512** |
| observations | **60** |
| conditions | 225,439 |
| medications | 220,552 |
| procedures | **971,135** |
| device_implants | 36,793 |
| allergy_intolerances | 5,506 |
| hospitals | 4 |
| users | 1 |
| alerts | 8 |
| orders | 0 |

Note: `pg_stat_user_tables.n_live_tup` shows 0 for procedures/encounters/observations because no VACUUM has run since the Day 6 reboot (`last_vacuum: null` for every table). The numbers above are the truth, not the n_live_tup.

### Recent patient sample

5 most-recent patient IDs all from `demo-medical-city-dallas`, all created 2026-04-16, all with Synthea-shape FHIR UUIDs (e.g., `9be06497-f02f-506c-e208-3269e7058971`). Not real-EHR FHIR IDs.

---

## 2. Historical evidence

### From `pg_stat_user_tables` (since Day 6 reboot 2026-04-21)

| Table | n_tup_ins | n_tup_upd | n_tup_del | n_live_tup |
|---|---:|---:|---:|---:|
| patients | 0 | 0 | **8,023** | 6,147 |
| conditions | 0 | 186,452 | 0 | 225,439 |
| medications | 0 | 183,271 | 0 | 220,552 |
| procedures | 0 | 6,375 | 0 | 0¹ |
| encounters | 0 | 752 | 0 | 0¹ |
| device_implants | 0 | 206 | 0 | 0¹ |
| allergy_intolerances | 0 | 15 | 0 | 0¹ |

¹ stale n_live_tup — true counts in §1.

The 8,023 patient deletes match the MCD dedup operation exactly (tech debt #2 / DATA_DEDUPLICATION_PLAN.md). The updates on the other tables match the FK reassignments performed during the same dedup. **Zero inserts since the Day 6 reboot.** No clandestine data deletions.

### From audit_logs

- Total audit log entries: 30
- Patient-related actions: 16 total (15 PATIENT_LIST_VIEWED + 1 PATIENT_DETAIL_VIEWED)

A working production cardiology platform with hundreds of thousands of patients would generate orders of magnitude more audit traffic. 30 events total is consistent with internal-only use during the Aurora migration sprint.

### From RDS snapshots

| Snapshot | Created | Type | Storage |
|---|---|---|---|
| `pre-mcd-wipe-2026-04-21` | 2026-04-22T14:43Z | manual | 100 GB |
| `pre-logical-repl-2026-04-21` | 2026-04-21T10:17Z | manual | 100 GB |
| `pre-consolidation-2026-04-20` | 2026-04-20T17:28Z | manual | 100 GB |
| Daily automated 04-16 → 04-23 | various | automated | 100 GB |

All snapshots show same 100 GB allocated. (Allocated storage doesn't track used data; FreeStorageSpace metric below does.)

### From CloudWatch FreeStorageSpace (last 30 days)

| Date | Free GB | Δ |
|---|---:|---|
| 2026-04-05 | 101.98 | baseline |
| 2026-04-12 | 101.97 | flat |
| **2026-04-13** | **99.96** | **-2.01 GB (data ingest start)** |
| **2026-04-14** | **97.10** | **-2.86 GB (Synthea Apr 14 load)** |
| 2026-04-15 | 96.80 | -0.30 GB |
| 2026-04-16 | 96.77 | -0.03 GB |
| 2026-04-17 | 96.81 | +0.04 GB |
| 2026-04-22 | 98.40 | +1.59 GB (MCD dedup recovered space) |
| 2026-04-23 | 98.40 | flat |

Total clinical data on disk: ~5 GB at peak (Apr 14-15). This matches the documented Synthea MCD ingestion. **There is no signature of a "hundreds of thousands of patients" dataset that was deleted** — that would be 10-100× larger and would show up as 50-500 GB of FreeStorageSpace drop, not 5 GB.

---

## 3. What the ingestion pipeline shows

`backend/scripts/`:
- `processSynthea.ts` — Synthea bundle processor
- `seedFromSynthea.ts` — bulk Synthea seeding
- `seedBSW.ts` — creates BSW hospital + 4 demo USERS only (no patients)
- `wipeMCDData.ts` — MCD wipe utility (used during Apr 22 dedup remediation)
- `validateMigration.ts`, `shadowReadValidation.ts` — Aurora migration helpers
- `retentionPurge.ts` — data retention purge (was not run in this period per audit logs)

S3 `tailrd-cardiovascular-datasets-863518424332/` contains many large clinical datasets that were **not** ingested into production:
- `synthea/nyc-population-2026/` — Synthea NYC population (target scale: large, but NOT ingested)
- `mimic-iv-ecg-official/`, `mimic-aggressive/`, `mimic-correct-structure/`, `mimic-working/`, `mimic-zip-download/` — MIMIC-IV (BIDMC ICU)
- `echonext-complete/`, `echonext-killer-actual/` — Echo dataset
- `base-physionet/`, `physionet-auto/`, `physionet-software/` — PhysioNet
- `hhs-cardiac-data/`, `hhs-comprehensive-feb2026/` — HHS
- `cms-data/`, `cms-data-2/` — CMS claims
- `pubmed-470k-restart/` — 470k PubMed abstracts

These S3 datasets exist as **raw source artifacts**. None have been ingested into the production RDS database. The only ingestion that fed production was the Synthea-MCD demo run over Apr 14-17.

---

## 4. Mapping the gap to Jonathan's expectation

| Hypothesis | Evidence supports? |
|---|---|
| Mass deletion event we're missing | **NO** — pg_stat shows only 8,023 deletes (the MCD dedup), audit_logs shows no admin action, FreeStorageSpace shows no large drop |
| Data is in a different table / schema | **NO** — `information_schema.tables` lists 54 public tables; only `patients` and `patient_data_requests` match a patient-shaped name; no archive/backup schemas |
| Filter / soft-delete hiding data | **NO** — `isActive=false` count is 0, `isMerged=true` count is 0 |
| Aurora has the data RDS doesn't | **NO** — pre-flight verified Aurora is 0 patients, 0 encounters; Aurora was empty before the migration began |
| Different tenant we're not querying | **NO** — query covers all 4 hospitals via LEFT JOIN; `tailrd-platform` returned 0; no other hospitals exist |
| Data was never ingested at the scale Jonathan expects | **YES** — every artifact (timeline, snapshot history, S3 raw datasets that never ran, ingestion logs, change records) is consistent with "MCD demo only" |

**Most likely interpretation:** Jonathan's "hundreds of thousands" reflects either (a) the **target/post-pilot scale** the platform is being built to handle, or (b) the **S3 raw datasets** (NYC Synthea, MIMIC) that were stored for future ingestion but never actually loaded. Production has been a pre-pilot demo carrying 6,147 Synthea-generated MCD patients since the platform's inception.

---

## 5. What this means for Wave 2

The Wave 2 runbook **was always scoped to migrate exactly what's in production**:
- patients: 6,147 (matches runbook expected value exactly)
- encounters: 353,512 (matches runbook expected value exactly)

The runbook itself states these expected values in `DAY_9_PREFLIGHT_CHECKLIST.md` §4 and `CHANGE_RECORD_2026_04_24_dms_config_fix.md` Phase 2-D-TEARDOWN. Every prior session — Day 4 Wave 1 (hospitals + users), Day 6 logical-repl proof, Day 7 dedup, Day 8 rehearsal — operated on these same numbers.

**Wave 2 will migrate exactly the demo dataset that exists.** Aurora will hold the same 6,147 patients + 353,512 encounters after migration. CDC will keep them in sync as new data lands (which currently is zero).

If Jonathan's intent was to migrate a much larger production dataset, that dataset **does not exist in production yet** — it would need to be ingested first (separate workstream), then migrated.

---

## 6. Options for Jonathan

### Option 1 — Resume Wave 2 today as planned
The pre-flight numbers are correct. The migration target is exactly what it was designed to be (demo data slice). Wave 2 proves the migration mechanism end-to-end on the real production environment with the actual data shape, even if the data volume is small. This is the foundation Day 10-13 (cutover) builds on. Recommended if the goal is to validate the Aurora cutover path before pilot.

### Option 2 — Delay Wave 2 until production is loaded with a larger dataset
If the goal is to migrate "hundreds of thousands of patients" before cutover, that data has to be ingested first. Candidates:
- Run a fresh Synthea NYC bulk load (~hundreds of thousands of patients available in `s3://...synthea/nyc-population-2026/`) → ingestion runtime estimate: many hours, would need its own change record, would re-trigger MCD-style dedup risks
- Wait for first real EHR pilot connection (Redox / Epic) → unknown timeline
- Use MIMIC-IV (~40k ICU patients) → wrong patient population (ICU, not cardiology)

This delays Wave 2 by at least the time required to safely ingest a new large dataset. Not recommended unless the target dataset is already chosen and de-risked.

### Option 3 — Investigate further before any decision
If Jonathan suspects this investigation is missing something, the additional reads to consider:
- Other AWS account / region: confirm we have the right account (production deploys verify via task def deploys to `863518424332` — same account this audit ran in)
- Backup/snapshot from an earlier date: could restore to a temp instance and inspect — but the documented history (DATA_DEDUPLICATION_PLAN, tech debt #2) makes this unlikely to surface anything new
- Backend code review: confirm there's no shadow tenant / sub-org filtering that hides patients from queries — the schema shows `hospitalId` is the only tenant key

### Option 4 — Stop the Aurora migration plan entirely
Reconsider whether Wave 2 / Aurora cutover is the right priority right now. If real customer data isn't going to land for months, Aurora cutover may be premature optimization. Stay on RDS, focus engineering time on customer acquisition / pilot scoping. Resume Aurora migration when there's a real pilot date.

---

## 7. Recommendation

**Option 1 — resume Wave 2.**

Reasoning: every artifact in this investigation aligns with the pre-flight numbers being correct. The migration was always scoped to the demo dataset. Validating the cutover path on the real production environment (even with small data) is the entire point of Day 9. The migration's value is the proof, not the volume. Real-PHI ingestion is a separate, sequenced workstream (Redox connect, hospital go-live).

If Jonathan's gut still says something is wrong: take Option 3 to identify what specifically he's worried about. But if the discrepancy is "expected scale vs actual" rather than "data was lost," resuming is the right call.

---

## 8. Next steps

Awaiting Jonathan's direction on Options 1-4. No actions taken without explicit authorization.

If Option 1: re-record the data integrity baseline (current S3 baseline from 22:49Z is from <2 hours ago and still valid — encounter sample is rand()-seeded so technically a fresh capture is more rigorous, but the data hasn't changed since). Then proceed to Phase 9-A.

If Option 2/3/4: Wave 2 stays paused. Phase 2D-TempSecretsAccess policy already detached. No ongoing infrastructure changes. The 22:49Z S3 baseline artifacts can be aged out at any time without harm.

Investigation artifacts:
- This document
- `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/wave2-production/dataInvestigation.js`
- Fargate task `c2298bd6cc114ff89be2eb04ec53fc55` log stream in `/ecs/tailrd-production-backend`
- Updated `infrastructure/scripts/phase-2d/dataInvestigation.js` + `overrides-investigation.json` locally
