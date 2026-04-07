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

Last Updated: 2026-04-07
