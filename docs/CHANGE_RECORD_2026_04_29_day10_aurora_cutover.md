# Change Record — Day 10 Aurora Cutover (2026-04-29)

**Cutover window:** 2026-04-29T00:36:30Z (READ_ONLY=true) → 2026-04-29T01:02:45Z (writes restored)
**Total READ_ONLY blast window:** 26 minutes 15 seconds
**Outcome:** Successful. Production now reads/writes Aurora Serverless v2.
**Operator:** JHart (solo)
**Walkthrough mode:** Phase-by-phase user authorization across Phases 67–77.

---

## Timeline (UTC)

| Phase | Action | Start | End | Duration |
|-------|--------|-------|-----|----------|
| 67 | Pre-cutover validation (6 checks pass) | — | — | — |
| 68 | Pre-cutover snapshots (RDS + Aurora) | 23:13:42Z | 23:25:57Z | 12m 15s |
| 69-EXT | Aurora pre-warm (background, 15-min) | 00:12:51Z | ~00:27:51Z | 15m |
| 70 | READ_ONLY=true deploy | 00:36:30Z | 00:39:37Z | 3m 7s |
| 71 | Stop DMS replication | 00:42:42Z | 00:43:09Z | 27s |
| 72 | **Secret flip (POINT OF NO RETURN)** | 00:51:53Z | 00:51:55Z | **2s** |
| 73 | ECS force-deploy onto Aurora | 00:52:38Z | 00:55:59Z | 3m 21s |
| 74 | READ_ONLY=false deploy (writes restored) | 00:59:04Z | 01:02:45Z | 3m 41s |
| 75-77 | Post-cutover validation + soak launch | 01:02:45Z | ~01:08Z | ~5m |

---

## Snapshots (Phase 68)

Both encrypted with production KMS key.

| Resource | Snapshot ID | Duration |
|----------|-------------|----------|
| RDS instance (`tailrd-production-postgres`) | `tailrd-production-postgres-pre-cutover-20260428-231342` | 735s (~12 min) |
| Aurora cluster (`tailrd-production-aurora`) | `tailrd-production-aurora-pre-cutover-20260428-231342` | 101s (~1.7 min) |

Tags: `Project=tailrd`, `Environment=production`, `HIPAA=true`, `Purpose=pre-cutover-snapshot`, `CutoverDate=2026-04-28`, `CreatedBy=jhart`.

---

## DMS final parity (Phase 71)

Drift = 0 across all replicated tables at the moment DMS was stopped:

| Table | Row count |
|-------|-----------|
| patients | 6,147 |
| observations | 60 |
| encounters | 353,512 |
| audit_logs | 93 |
| login_sessions | 105 |

---

## Secret flip (Phase 72)

- VersionId: `3c0074fb-ac80-4b01-9402-4e6e47de7351`
- DATABASE_URL host: `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com`
- Rollback URL sealed at: `C:/Users/JHart/AppData/Local/Temp/day10-rollback-url-FULL.txt` (RDS endpoint, retained for 24h soak window)

---

## Production state at end of cutover (01:02:45Z)

- Backend image: `tailrd-backend:123` (READ_ONLY=false)
- Database: Aurora-served (Prisma startup log confirms)
- DMS: stopped (clean cutover, drift=0 at stop)
- RDS: connection count 0 (no longer in service path); retained for rollback + HIPAA snapshot
- IAM: `Phase2D-AuroraPreWarm` attached transiently for pre-warm; `Phase2D-PostCutoverValidation` attached for soak monitor (trap-protected detach)

---

## Lessons learned

### What worked
- **Walkthrough mode**: Phase-by-phase authorization caught two issues mid-flight before they became outages (task-def family-name typo, pre-warm column-name error).
- **JSON envelope validation pattern** (`{ ready, checks, blockers, warnings }`) made per-phase go/no-go decisions deterministic — every blocker had to clear before advancing.
- **Trap-based IAM detach** (`trap cleanup_iam EXIT INT TERM HUP`) preserved the non-negotiable detach discipline across the 24h soak even if the script crashes.
- **Pre-staged rollback URL** at known temp path — operator never had to look it up under pressure.
- **Sequenced READ_ONLY → stop DMS → secret flip → force-deploy → READ_ONLY=false** kept the volatile-data write window minimal (26m 15s end-to-end, with the actual no-write window narrower than that since READ_ONLY rejects writes with 503+Retry-After rather than swallowing them).

### What surprised us
- **Aurora pre-warm queries were too lightweight to drive ACU above 0.5 baseline.** Connection-warm was achieved but ACU scale-up was validated separately (3.0 ACU peak in load-test rehearsal). Decision: proceed since scale-up was already proven; this is a documentation/script gap, not a production risk.
- **Task-def family name confusion**: runbook referenced `tailrd-production-backend` (the SERVICE name); correct family is `tailrd-backend`. Fixed mid-execution. Day 11 runbook update will inherit the corrected naming.
- **`encounterDateTime` column mismatch** in pre-warm script — actual schema column is `startDateTime`. Pre-warm continued because the script tolerates per-query failures; no production impact.

### What we would do differently
- Pre-stage the **final HIPAA RDS snapshot script** so Phase 81 is a single `aws rds create-db-snapshot` command rather than ad-hoc.
- Add **task-def family name** as a top-of-runbook constant rather than embedded in each phase's commands.
- Build a **synthetic write-load script** for Aurora pre-warm so ACU does scale during warm-up, eliminating the "what if first prod write spikes" residual concern.

---

## References

- Pre-cutover validation: `infrastructure/scripts/phase-2d/preCutoverValidation.js`
- Post-cutover validation: `infrastructure/scripts/phase-2d/postCutoverValidation.js`
- Soak monitor: `infrastructure/scripts/phase-2d/postCutoverSoakMonitor.sh`
- Aurora pre-warm: `infrastructure/scripts/phase-2d/auroraPreWarm.js`
- Day 10 runbook: `docs/DAY_10_WEDNESDAY_RUNBOOK.md` (corrections pending Phase 82 PR)
- Snapshot record: `C:/Users/JHart/AppData/Local/Temp/day10-snapshot-record.txt`
- Rollback URL (sealed): `C:/Users/JHart/AppData/Local/Temp/day10-rollback-url-FULL.txt`

---

*Recorded 2026-04-29. Next review: Day 11 RDS decommission (after 24h soak completes clean).*
