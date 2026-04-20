# TAILRD Heart — Disaster Recovery Plan

## RTO / RPO Targets

| Tier | System | RTO | RPO |
|------|--------|-----|-----|
| Critical | Backend API (ECS Fargate) | 30 minutes | 0 (stateless) |
| Critical | Database (RDS Multi-AZ) | 5 minutes (auto failover) | 5 minutes (sync replication) |
| Critical | PHI Data (from backup) | 1 hour | 24 hours (daily snapshot) |
| Standard | Frontend (CloudFront/S3) | 15 minutes | 0 (static assets) |
| Standard | Redis Cache | 30 minutes | 0 (rebuildable cache) |

## Failover Procedures

### RDS Failover
RDS Multi-AZ handles automatically. Typical: 60-120 seconds.
Connection string unchanged (same DNS endpoint, new instance).

### ECS Service Failure
ECS restarts failed tasks automatically.
Manual: `aws ecs update-service --force-new-deployment`
Circuit breaker auto-rollbacks on repeated failures.

### Full Region Failure
Requires cross-region infrastructure (not yet configured).
Recovery: redeploy from Terraform in secondary region.

## Backup Verification
- [ ] Monthly: Restore RDS snapshot to test instance
- [ ] Quarterly: Full failover drill
- [ ] Annual: Cross-region recovery test

---

## Cold rebuild from migrations

**Unblocked as of 2026-04-20** by the migration history consolidation. Before the consolidation, fresh-database provisioning via `prisma migrate deploy` failed at PR #158's migration because six clinical tables were never created by a committed migration. The consolidated baseline at `backend/prisma/migrations/20260420000000_consolidated_baseline/` now reconstructs the entire production schema from scratch. See `docs/MIGRATION_HISTORY_CONSOLIDATION_2026_04_20.md` for the full story and the Phase C proof.

### When to use cold rebuild

Use automated snapshot restore as the primary recovery path (faster, preserves data). Cold rebuild is the fallback for:

- Snapshot corruption or past-retention scenarios
- Building a staging environment from scratch
- Disaster recovery in a new AWS account or region
- Annual DR drill that tests the migration path works end-to-end

### Cold rebuild procedure

1. **Create the target database** (RDS or Aurora) with matching engine version (PostgreSQL 15.14). Same VPC, same DB subnet group, same SG so the backend can reach it.

2. **Apply the consolidated baseline:**
   ```bash
   DATABASE_URL=<new-endpoint> npx prisma migrate deploy
   ```
   Expected output: `Applying migration '20260420000000_consolidated_baseline'` → `All migrations have been successfully applied.`

   Run this from inside the VPC (ECS one-shot task with the backend image works — see `docs/MIGRATION_VALIDATION_RUNBOOK.md` for the run-task pattern).

3. **Verify schema matches production:**
   ```bash
   pg_dump --schema-only --no-owner --no-acl <new-endpoint> | wc -l
   ```
   Should be ~3,647 lines. Diff against `s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/2026-04-20/rds-schema.sql` — expected delta is pg_dump session nonces only.

4. **Restore data** (if recovering production):
   - Primary: `pg_restore` from the latest logical backup (tech debt: automated logical backups are not yet configured)
   - Fallback: `npx prisma db seed` (seeds 3 demo hospitals, no patients)
   - For full Synthea dataset: `npx tsx scripts/seedFromSynthea.ts`

5. **Swap DATABASE_URL and redeploy:**
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id tailrd-production/app/database-url \
     --secret-string "postgresql://tailrd_admin:<password>@<new-endpoint>:5432/tailrd?sslmode=require"
   aws ecs update-service --cluster tailrd-production-cluster \
     --service tailrd-production-backend --force-new-deployment
   ```

6. **Verify:** `curl https://api.tailrd-heart.com/health` returns 200, login works, one authenticated endpoint returns data.

### Staging environment build

Identical to Scenario above, minus the data restore. Fresh DB + `prisma migrate deploy` + `prisma db seed` → usable staging environment. Target setup time: 15-20 minutes end-to-end.

### Last verified

Phase C of the 2026-04-20 consolidation built a fresh `tailrd-migration-test` RDS instance, ran `prisma migrate deploy`, and confirmed the resulting pg_dump matched production byte-for-byte (excluding nonces). Instance deleted after verification.

**Next scheduled drill:** 2026-07-20 (quarterly).

Last Updated: 2026-04-20
