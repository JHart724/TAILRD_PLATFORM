# Data Deduplication Plan — `patients` on `(hospitalId, fhirPatientId)`

**Status:** **RESOLVED 2026-04-22** (Option 2 / in-place dedup executed on production)
**Discovered:** Day 7 Phase 7F (2026-04-21)
**Resolved:** Day 7 Phase 7G-REVISED (2026-04-22T16:47Z)
**Source of truth:** production RDS `tailrd-production-postgres` prod db `tailrd`
**Change record context:** `docs/CHANGE_RECORD_2026_04_22_wave2_prep.md` Phase 7G

## 0. Resolution summary (added 2026-04-22)

Re-checked the constraint state on both RDS and Aurora during Phase 7G: **no `UNIQUE(hospitalId, fhirPatientId)`** on either side. Only `@@index([fhirPatientId])` in the Prisma schema. The duplicates were therefore **not actually a Wave 2 blocker** — DMS full-load would have replicated all 14k dirty rows to Aurora without constraint violations.

Corrected assessment: the dupes were a data-quality issue, not a migration blocker. User re-authorized Option 2 (in-place dedup keeping oldest) with staging rehearsal.

**Executed (all invariants PASS):**
- Snapshot: `tailrd-production-postgres-pre-mcd-wipe-2026-04-21` (available)
- Rehearsal instance `tailrd-staging-mcd-rehearsal` restored from snapshot, dedup dry-run + real run both clean. Teardown complete.
- Production dedup 2026-04-22T16:47:33Z, committed ~2 min later. Post-verification: 0 dupes, 6,147 patients (was 14,170), 353,512 encounters unchanged. Zero alarms. Backend probe showed one /health timeout + several 3-9s slow responses during the 2-min txn window, then recovered to ~2-3s — no sustained impact.
- FK reassignments: encounters 752, procedures 6,375, conditions 186,452, medications 183,271, device_implants 206, allergy_intolerances 15. Delete: 8,023 patients.

Script: `infrastructure/scripts/mcdPatientDedup.js` (transactional, SAVEPOINTed, invariant-checked, DRY_RUN-capable).

Tech debt #2 RESOLVED. Tech debt #20 also RESOLVED earlier in Phase 7A.

Note: the original plan considered "Wave 2 BLOCKED" based on an assumed `UNIQUE(hospitalId, fhirPatientId)` constraint on Aurora. Constraint audit proved no such constraint exists. Plan sections 1-8 below are the historical record at discovery time; the actual remediation was a narrower Option B-variant than originally proposed.

---

### Original discovery (preserved for audit)

---

## 1. The finding

Aurora V2 schema requires `UNIQUE(hospitalId, fhirPatientId)` on `patients` and `UNIQUE(hospitalId, fhirEncounterId)` on `encounters` (introduced by PR #158 to enforce per-tenant FHIR ID uniqueness). Production RDS source violates the patient constraint:

| Metric | Value |
|---|---:|
| Total patients | 14,170 |
| Patients with `fhirPatientId` | 14,155 |
| **Distinct `(hospitalId, fhirPatientId)` keys with duplicates** | **5,053** |
| **Total rows involved in duplicates** | **13,076** |
| **Excess rows that must be eliminated for uniqueness** | **8,023** |
| Dupe count range | 2–6 per key |
| Affected hospitals | 1 (`demo-medical-city-dallas` — 100% of duplicates) |

Encounters are clean: 353,512 rows, 0 duplicates on `(hospitalId, fhirEncounterId)`.

**Blast radius if left unfixed:** DMS full-load of `patients` would fail with unique-constraint violations for the 8,023 excess rows. DMS would suspend the table (`TableErrorEscalationPolicy: STOP_TASK` per our Wave 2 task settings). Wave 2 blocks immediately.

## 2. Dupe count distribution

| `dupe_count` | Keys |
|---:|---:|
| 2 | 3,103 |
| 3 | 950 |
| 4 | 990 |
| 6 | 10 |

## 3. Root cause

The duplicates were created by **repeat Synthea seed runs on different dates without cleanup**. Sample (`fhirPatientId` truncated to first 8 chars):

| `fhirPatientId` | Created | `id` (CUID) | `firstName` matches first row? |
|---|---|---|---|
| `0012a480...` | 2026-04-14 23:12 | `cmnz8lbawd0p3...` | (first) |
| `0012a480...` | 2026-04-15 18:53 | `cmo0esiqsd08b...` | no |
| `0012a480...` | 2026-04-16 12:32 | `cmo1gmj0fe6j4...` | no |
| `0012a480...` | 2026-04-17 17:17 | `cmo3687358acq...` | no |

Same FHIR patient id, four separate CUIDs, different first names across rows. This is the smoking gun for **tech debt item #2 (MCD data in partial wipe state)** — `seedFromSynthea.ts` was run multiple times over the Apr 14-17 window without a preceding tenant-wipe, so each run inserted new patient rows with the same Synthea-derived `fhirPatientId` but fresh CUIDs and re-randomized per-run demographics.

## 4. Dependent-data scope

Deleting the 8,023 excess patient rows affects:

| Table | Rows referencing duplicate patients |
|---|---:|
| `encounters` | **290,064** (82% of the 353,512 total encounters) |
| `observations` | 0 |
| `therapy_gaps` | 0 |

The 290k encounter rows have FK `patientId` → `patients.id` (the CUID). If we delete the patient row, we either:
- CASCADE delete the encounters (if FK is `ON DELETE CASCADE`)
- Orphan them (if FK is `RESTRICT`)
- Need to reassign FK to the surviving patient row

## 5. Remediation options

### Option A — Full MCD wipe + clean re-seed (recommended)

Resolves tech debt #2 at the same time as this issue.

1. Wipe all `demo-medical-city-dallas` data from production RDS (patients, encounters, observations, therapy_gaps, all dependents) using `backend/scripts/wipeMCDData.ts` chunked pattern (already built for this purpose).
2. Re-seed with a single clean Synthea run via `backend/scripts/seedFromSynthea.ts`. Modify the seed script to check `UNIQUE(hospitalId, fhirPatientId)` before INSERT and skip if exists — prevents recurrence regardless of how many times seed runs.
3. Verify clean state: re-run `wave2DataIntegrityPreflight.js` — expect 0 duplicates.

**Pros:**
- Clean slate; no complex reassignment logic
- Resolves tech debt #2
- Future seed runs safe
- Demo data, no PHI concerns — free to wipe

**Cons:**
- Re-seed is slow. Synthea run-time for 14k patients is hours-to-a-day range depending on config.
- Test data may be regenerated with different demographics, so any test scenarios hard-coded to specific patient IDs need updating.

### Option B — In-place dedup keeping oldest row, reassign FKs

Preserve all 290k encounters by reassigning their `patientId` from deleted dupe patients to the surviving (oldest) dupe patient.

```sql
BEGIN;
-- Reassign encounters' patientId to the oldest patient per (hospitalId, fhirPatientId)
UPDATE "encounters" e
SET "patientId" = keep_map.keep_id
FROM (
  SELECT
    p."id" AS dupe_id,
    (SELECT p2."id" FROM "patients" p2
     WHERE p2."hospitalId" = p."hospitalId" AND p2."fhirPatientId" = p."fhirPatientId"
     ORDER BY p2."createdAt" ASC LIMIT 1) AS keep_id
  FROM "patients" p
  WHERE ("hospitalId", "fhirPatientId") IN (
    SELECT "hospitalId", "fhirPatientId" FROM "patients"
    WHERE "fhirPatientId" IS NOT NULL
    GROUP BY "hospitalId", "fhirPatientId" HAVING COUNT(*) > 1
  )
) keep_map
WHERE e."patientId" = keep_map.dupe_id AND keep_map.dupe_id != keep_map.keep_id;

-- Delete the 8023 non-oldest duplicates
DELETE FROM "patients" p
USING (
  SELECT "hospitalId", "fhirPatientId",
         (SELECT p2."id" FROM "patients" p2
          WHERE p2."hospitalId" = p3."hospitalId" AND p2."fhirPatientId" = p3."fhirPatientId"
          ORDER BY p2."createdAt" ASC LIMIT 1) AS keep_id
  FROM (SELECT DISTINCT "hospitalId", "fhirPatientId" FROM "patients"
        WHERE "fhirPatientId" IS NOT NULL GROUP BY "hospitalId", "fhirPatientId"
        HAVING COUNT(*) > 1) p3
) keep_map
WHERE p."hospitalId" = keep_map."hospitalId"
  AND p."fhirPatientId" = keep_map."fhirPatientId"
  AND p."id" != keep_map.keep_id;
COMMIT;
```

**Pros:**
- Preserves the 290k encounters — no data loss
- Faster than re-seed
- Aurora will see the same encounter volume

**Cons:**
- Encounter rows end up pointing at a patient row whose demographics may not match what the encounter originally recorded (different firstName etc.). Data fidelity is mixed.
- Complex SQL — needs careful testing on a snapshot clone first
- Doesn't resolve tech debt #2; MCD remains in a partial-seed state
- Future seed runs will re-create the same problem

### Option C — Drop UNIQUE constraint pre-Wave-2, dedup on Aurora post-load, re-add constraint

1. ALTER Aurora `patients` to drop the UNIQUE(hospitalId, fhirPatientId) constraint
2. Run Wave 2 full-load+CDC — Aurora ends up with same 14,155 rows (including the 8,023 duplicates)
3. Dedup on Aurora (same logic as Option B but against Aurora)
4. Re-ADD the UNIQUE constraint

**Pros:**
- Fastest path to a running Wave 2
- Dedup work happens on Aurora (the new system) rather than RDS (the old system)

**Cons:**
- Aurora schema violates design intent during the interim
- Encounter FK reassignment still needed on Aurora, same complexity as Option B
- If CDC is active during the window, concurrent new writes could interleave with the cleanup

### Option D — Scope-limit Wave 2 to non-MCD hospitals first

All duplicates are on `demo-medical-city-dallas`. Restrict Wave 2's DMS table mapping to exclude MCD patients:

```json
{"rules":[
  {"rule-type":"selection", ...
   "object-locator":{"schema-name":"public","table-name":"patients"},
   "rule-action":"include",
   "filters":[{"filter-type":"source","column-name":"hospitalId",
               "filter-conditions":[{"filter-operator":"noteq","value":"demo-medical-city-dallas"}]}]},
  ... (same for encounters)
]}
```

**Pros:**
- Unblocks Wave 2 for real hospital data (if any) with no cleanup
- MCD can be handled as a separate backfill after Option A wipe+reseed

**Cons:**
- Checking the data: `hosp-001` has 10 patients, `hosp-002` has 5. So non-MCD is 15 patients total. Wave 2 would migrate 15 rows. The 14,155 MCD patients would still need to be migrated eventually.
- Doesn't actually solve the problem — just defers it

## 6. Recommendation

**Option A (full MCD wipe + clean re-seed).** Rationale:

1. The data is demo data. Not PHI. Not customer-facing. Wiping is zero-risk.
2. This closes tech debt #2 in the same ship.
3. Option B's FK reassignment introduces data-fidelity noise in the encounter → patient linkage (an encounter's `firstName` etc. no longer matches the surviving patient row's `firstName`).
4. Option C's "dedup on Aurora" means we're doing the same cleanup work, just on the new system. Same complexity, worse testing surface.
5. Option D doesn't solve the problem.

**Sub-recommendation:** if the seed-time cost of Option A is unacceptable, fall back to **Option B** with these guardrails:
- Run the SQL against a throwaway RDS restored-from-snapshot first; verify row counts match expectations before running on prod
- Add a `wipeMCDData.ts`-style trigger-disable step so the bulk UPDATE doesn't thrash audit triggers

## 7. Day 8 start implication

Original Day 8 sequence was:
1. Re-run Wave 1 full-load (hospitals + users — these got wiped by Day 4 chaos Test 2)
2. Run shadow validator; confirm Wave 1 parity
3. Start Wave 2 (patients + encounters)

Updated sequence if Option A chosen:
1. Wipe MCD data from prod RDS + re-seed Synthea (can run in background overnight before Day 8)
2. Re-run Wave 1 full-load
3. Shadow validator Wave 1 parity
4. Re-run `wave2DataIntegrityPreflight.js` — verify 0 duplicates
5. Start Wave 2

Updated sequence if Option B chosen:
1. Run dedup SQL on throwaway clone of prod RDS (restored from snapshot); verify
2. Apply dedup SQL on prod RDS
3. Re-run `wave2DataIntegrityPreflight.js` — verify 0 duplicates
4. Re-run Wave 1 full-load
5. Shadow validator
6. Start Wave 2

## 8. Decision needed

**From Jonathan, before Day 8 start:**

- [ ] Choose remediation option (A / B / C / D)
- [ ] If A: confirm re-seed timing is acceptable (check Synthea run-time on current config)
- [ ] If B: authorize the throwaway-clone test run before applying to prod
- [ ] Update tech debt #2 plan if Option A selected (this becomes its resolution path)
- [ ] Schedule Day 8 start with the updated sequence

**Do NOT start Wave 2 until decision made and remediation executed.**
