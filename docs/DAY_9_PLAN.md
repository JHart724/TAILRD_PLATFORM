# Day 9 - Permanent Staging Environment

**Status:** Plan authored 2026-04-27. Pre-flight investigation complete. CF template authoring next. Execution starts Tuesday 2026-04-28 morning.
**Owner:** Jonathan Hart
**Companion docs:** `docs/ARCHITECTURE_V2_MIGRATION.md` §Day 9, `docs/CHANGE_RECORD_2026_04_27_wave2_combined_execution.md`, `docs/DMS_MIGRATION_PLAN.md`
**Predecessor work:** Wave 2 combined-scope migration shipped 2026-04-27 (1.82M rows, CDC active, 30-min sustained validation passed)

---

## 1. Objective

Stand up `tailrd-staging` as a **permanent** environment that mirrors production architecturally but runs on its own Aurora cluster, ECS cluster, and ALB with a `staging-api.tailrd-heart.com` subdomain. Every merge to `main` deploys to staging automatically; production stays manual. Staging holds a 25,000-patient Synthea-seeded dataset for realistic gap detection + Sinai-scale demo.

**Per `ARCHITECTURE_V2_MIGRATION.md` Day 9 spec:**
- New CloudFormation stack `tailrd-staging` - separate Aurora cluster (Serverless v2 0.5 min ACU), backend ECS cluster + service, same ALB pattern
- Staging uses its own Secrets Manager entries, its own subdomain (`staging-api.tailrd-heart.com`)
- CI/CD: GitHub Actions adds a staging deploy job that runs on every merge to `main`, production deploy triggers manually

**Acceptance:** `staging-api.tailrd-heart.com/health` returns 200. Smoke login works. `/api/hospitals` returns the seeded staging dataset. CI auto-deploys to staging on merge to `main`.

---

## 2. Pre-flight findings (from Phase A investigation 2026-04-27)

### 2.1 Mystery resources investigated and dispositioned

| Resource | Truth | Day 9 disposition |
|---|---|---|
| `tailrd-staging-postgres` (db.t3.medium, PG 15.14, created 2026-04-20) | Tagged `Purpose=logical-repl-rehearsal`. The Wave 2-prep Postgres for testing the `rds.logical_replication=on` parameter group reboot. 0 connections, idle. Not a permanent staging environment. | **LEAVE ALONE** for Day 9. Different name (`-postgres` not `-aurora`), different purpose, won't collide. Add to post-migration cleanup list. |
| `tailrd-production` (db.t4g.medium, PG 15.10, created 2026-04-03) | Predecessor production RDS. Database name `tailrd_platform` (not `tailrd`). DeletionProtection=TRUE. HIPAA-tagged. 0 connections, dormant. Pre-dates the Aurora migration sprint. | **DON'T TOUCH.** Investigate ownership separately. Not in Day 9 scope. |
| `tailrd-production` (ECS cluster) | Empty: 0 services, 0 tasks. Predecessor of `tailrd-production-cluster`. | **DON'T TOUCH** for Day 9. Cleanup-eligible later. |

### 2.2 Active production landscape (confirmed working state)

| Layer | Resource |
|---|---|
| RDS source (Wave 2 source-of-truth) | `tailrd-production-postgres` (db.t3.medium, PG 15.14) |
| Aurora target (Wave 2 destination) | `tailrd-production-aurora` Serverless v2 cluster (writer `tailrd-aurora-production-writer` + readers 1, 2) |
| ECS cluster | `tailrd-production-cluster` (1 service, 1 task) |
| ECS service | `tailrd-production-backend` (task def `tailrd-backend:105`, image `2f7768f...` from PR #184) |
| ALB | `tailrd-production-alb` |
| VPC | `vpc-0fc14ae0c2511b94d` |
| DMS task | `tailrd-migration-wave2-combined` (`YFGGBH5LXRHDBHYD76DVX5MQRA`, running, CDC active) |

### 2.3 Foundation CloudFormation stacks (March 12, reusable)

| Stack | Owns |
|---|---|
| `tailrd-production-vpc` | VPC, subnets, route tables, IGW, NAT |
| `tailrd-production-s3-kms` | S3 buckets + KMS keys |
| `tailrd-production-waf-cloudtrail` | WAF rules + CloudTrail |

**All Aurora, RDS, ECS, ALB, Secrets Manager resources beyond these were created out-of-band of CloudFormation.** The new staging stack restores the IaC-as-source-of-truth pattern for a contained scope (sets a precedent for future cleanup of the manually-created production infra).

---

## 3. Decisions locked (2026-04-27 authorization)

### 3.1 VPC strategy: SHARED with production
Staging will live in `vpc-0fc14ae0c2511b94d` (the existing production VPC). New security groups within that VPC isolate staging traffic from production traffic.

**Trade-off accepted:** weaker blast-radius isolation than separate VPCs, but matches the existing reused-foundation pattern, cuts setup complexity ~30%, and keeps cross-environment debugging possible (e.g., reading production Aurora from a staging ECS task one-off when troubleshooting).

**Mitigation:** distinct security groups + Secrets Manager + IAM roles ensure no cross-environment credentials or routes.

### 3.2 Seed data: SYNTHEA FRESH-LOAD, 25,000 patients
Use the existing Synthea ingestion pipeline (`backend/scripts/processSynthea*` + the FHIR-bundle-to-DB writer chain). Target ~25,000 patients - production-scale × 4. Projected derived counts:
- ~150-200K encounters
- ~500K-1M procedures
- ~25-30K patients (1:1 with the seed)
- diverse module coverage across HF / EP / Structural / Coronary / Valvular / Peripheral

**Reasoning:** enough volume for realistic gap detection, diverse phenotypes, headroom for Sinai-scale demos, ability to stress-test query performance at scale before introducing production cutover risk.

**Estimated seed runtime:** 6-8 hours, runs as Fargate one-off long-running task.

### 3.3 Execution pacing: multi-day split
| When | Scope | Hours |
|---|---|---|
| **Today (Mon 2026-04-27 PM)** | Plan authoring (this doc) + CF template authoring (`tailrd-staging.yml`) - pure documentation/IaC, zero infra changes. Ship as PR for review. | ~2.5-3 |
| **Tuesday morning (2026-04-28 AM)** | Tasks 2-6: CF deploy, ACM cert, Wix DNS, Secrets Manager, Aurora migrations | ~2-2.5 |
| **Tuesday afternoon (2026-04-28 PM)** | Task 7: kick off Synthea 25K seed (background Fargate, 6-8 hr) - Jonathan walks away once kicked off | ~30 min kickoff + monitor |
| **Wednesday morning (2026-04-29 AM)** | Task 7 seed verification + Tasks 8-9: CI/CD wiring + smoke tests + acceptance | ~2-3 |

**Total calendar time: 3 days; total focused work: 7-9 hours.**

The seed's natural 6-8 hour runtime is the multi-day breakpoint - Tuesday afternoon kickoff, Wednesday morning verification.

---

## 4. Resource naming (authoritative for the CF template)

| Resource type | Name |
|---|---|
| CloudFormation stack | `tailrd-staging` |
| Template file | `infrastructure/cloudformation/tailrd-staging.yml` |
| Aurora cluster | `tailrd-staging-aurora` |
| Aurora writer instance | `tailrd-staging-aurora-writer` |
| Aurora reader instance (single, 0.5 ACU) | `tailrd-staging-aurora-reader-1` |
| Aurora cluster parameter group | `tailrd-staging-aurora-cluster-params` |
| Aurora DB subnet group | `tailrd-staging-aurora-subnet-group` (reuses production private subnets) |
| Aurora security group | `tailrd-staging-aurora-sg` (ingress 5432 from staging-ecs-sg only) |
| ECS cluster | `tailrd-staging-cluster` |
| ECS task definition family | `tailrd-staging-backend` |
| ECS service | `tailrd-staging-backend` |
| ECS task SG | `tailrd-staging-ecs-sg` |
| ALB | `tailrd-staging-alb` |
| ALB target group | `tailrd-staging-tg` |
| ALB security group | `tailrd-staging-alb-sg` (ingress 443 from 0.0.0.0/0) |
| Subdomain | `staging-api.tailrd-heart.com` |
| ACM cert | new cert in us-east-1 for `staging-api.tailrd-heart.com` |
| Secrets Manager entries | `tailrd-staging-aurora/app/database-url`, `tailrd-staging-aurora/app/jwt-secret`, `tailrd-staging-aurora/app/phi-encryption-key`, `tailrd-staging-aurora/app/aurora-db-password` (entire namespace `tailrd-staging-aurora/*` to disambiguate from existing `tailrd-staging/*` namespace already used by the dormant `tailrd-staging-postgres` rehearsal Postgres) |
| ECS execution role | `tailrd-staging-ecs-execution-role` |
| ECS task role | `tailrd-staging-ecs-task` |
| CloudWatch log group | `/ecs/tailrd-staging-backend` |

**Naming guarantee:** every resource is `tailrd-staging-*` - no collision with `tailrd-production-*`, no collision with `tailrd-staging-postgres` (the rehearsal Postgres has different suffix `-postgres`, while the Aurora cluster is `-aurora`).

---

## 5. Sub-task breakdown

### Task 1 - Author `tailrd-staging.yml` CloudFormation template (Today, ~1.5-2 hr)

Create `infrastructure/cloudformation/tailrd-staging.yml`. Resources:

1. **Aurora cluster + instances** (`AWS::RDS::DBCluster`, `AWS::RDS::DBInstance` × 2 - writer + reader)
   - Engine `aurora-postgresql` 15.14
   - ServerlessV2ScalingConfiguration: MinCapacity 0.5, MaxCapacity 4
   - DatabaseName: `tailrd`
   - MasterUsername: `tailrd_admin`
   - MasterUserPassword: from Secrets Manager (created in step 5)
   - VpcSecurityGroupIds: !Ref AuroraSecurityGroup
   - DBSubnetGroupName: !Ref AuroraSubnetGroup
   - DBClusterParameterGroupName: !Ref AuroraClusterParams (`logical_replication=1`, matching production for future repurposing)
   - StorageEncrypted: true
   - DeletionProtection: false (staging - easy delete)

2. **DB subnet group** (`AWS::RDS::DBSubnetGroup`)
   - Subnets: production private DB subnets (lookup via Fn::ImportValue from `tailrd-production-vpc` exports OR hardcode subnet IDs after listing)

3. **Aurora security group** (`AWS::EC2::SecurityGroup`)
   - Ingress: 5432/tcp from `tailrd-staging-ecs-sg`
   - No public ingress

4. **Aurora cluster parameter group** (`AWS::RDS::DBClusterParameterGroup`)
   - Family `aurora-postgresql15`
   - Params: `rds.logical_replication=1` (parity with production, allows future DMS replay if needed)

5. **ECS cluster** (`AWS::ECS::Cluster` `tailrd-staging-cluster`)
   - CapacityProviders: FARGATE, FARGATE_SPOT
   - DefaultCapacityProviderStrategy: FARGATE weight 1

6. **ECS task definition** (`AWS::ECS::TaskDefinition`)
   - Family `tailrd-staging-backend`
   - NetworkMode: awsvpc, RequiresCompatibilities: [FARGATE]
   - Cpu: **1024**, Memory: **2048** - match production sizing (per 2026-04-27 Refinement 1: staging-at-half-prod can't test production loads, defeating staging's purpose; cost delta at idle ~$15/mo is negligible)
   - ContainerDefinitions:
     - Name `tailrd-backend`
     - Image (parameter - set by deploy job; default to placeholder `:latest` for initial stack create)
     - Environment vars: `NODE_ENV=staging`, `AWS_REGION=us-east-1`, `PORT=3001`, plus the same set as production (FRONTEND_URL, CORS_ORIGINS, etc., adapted for staging subdomain)
     - Secrets:
       - `DATABASE_URL` from `tailrd-staging-aurora/app/database-url`
       - `JWT_SECRET` from `tailrd-staging/app/jwt-secret`
       - `PHI_ENCRYPTION_KEY` from `tailrd-staging/app/phi-encryption-key`
     - LogConfiguration: awslogs to `/ecs/tailrd-staging-backend`

7. **ECS service** (`AWS::ECS::Service`)
   - Cluster: !Ref ECSCluster
   - DesiredCount: 1 (staging - single task)
   - LaunchType: FARGATE
   - NetworkConfiguration: AwsvpcConfiguration in private subnets, AssignPublicIp DISABLED
   - LoadBalancers: TargetGroupArn → TG, ContainerName tailrd-backend, ContainerPort 3001
   - DependsOn: HTTPSListener (so service waits for ALB to be ready)

8. **ALB** (`AWS::ElasticLoadBalancingV2::LoadBalancer`)
   - Type: application
   - Scheme: internet-facing
   - Subnets: production public subnets
   - SecurityGroups: !Ref AlbSecurityGroup

9. **ALB target group** (`AWS::ElasticLoadBalancingV2::TargetGroup`)
   - Protocol: HTTP, Port 3001
   - TargetType: ip (Fargate awsvpc requirement)
   - HealthCheckPath: `/health`
   - HealthCheckIntervalSeconds: 30, HealthyThresholdCount: 2

10. **ALB HTTPS listener** (`AWS::ElasticLoadBalancingV2::Listener`)
    - Port 443, Protocol HTTPS
    - Certificates: !Ref AcmCertificate (parameter - staging-api.tailrd-heart.com cert ARN, created in step 4 of execution)
    - DefaultActions: forward to target group

11. **ALB HTTP→HTTPS redirect listener** (Port 80 → Port 443 redirect)

12. **ECS execution role** (`AWS::IAM::Role`)
    - AssumeRolePolicy: ecs-tasks.amazonaws.com
    - ManagedPolicyArns: `AmazonECSTaskExecutionRolePolicy`
    - Policies: secretsmanager:GetSecretValue scoped to `tailrd-staging/*` secrets, kms:Decrypt for the secrets-encryption KMS key

13. **ECS task role** (`AWS::IAM::Role`)
    - Inline policies:
      - secretsmanager:GetSecretValue scoped to `tailrd-staging/*`
      - cloudwatch:PutMetricData scoped to `TailrdStaging` namespace
      - logs:CreateLogStream + logs:PutLogEvents scoped to `/ecs/tailrd-staging-backend`
      - s3 read/write on the staging Synthea-bundles S3 prefix (TBD)

14. **CloudWatch log group** (`AWS::Logs::LogGroup`)
    - LogGroupName: `/ecs/tailrd-staging-backend`
    - RetentionInDays: 30

15. **Outputs** (CF stack outputs)
    - AuroraWriterEndpoint
    - ALBDNSName
    - ECSClusterArn
    - ECSServiceName

**Parameters:**
- `AcmCertificateArn` - staging-api cert ARN (validated externally Tuesday morning, passed in at stack create)
- `BackendImage` - ECR image URI (default to current production image for placeholder; CI/CD updates per merge)
- `AuroraMasterPassword` - secret reference (set as Secrets Manager dynamic reference at deploy time)

**Self-review checklist before commit:**
- [ ] All 15 resource types present
- [ ] All references use !Ref / !GetAtt correctly
- [ ] Security groups don't allow inadvertent public exposure
- [ ] Secrets Manager references use dynamic-reference syntax `{{resolve:secretsmanager:...}}` or AWS::SecretsManager::Secret resources
- [ ] Stack creates idempotently (no hardcoded ARNs that vary across regions)
- [ ] Outputs include everything needed for downstream consumption

**Output:** `infrastructure/cloudformation/tailrd-staging.yml` - committed to feature branch, NOT deployed today.

### Task 2 - Validate template + commit + open PR (Today, ~30 min)

```bash
# Validate
aws cloudformation validate-template --template-body file://infrastructure/cloudformation/tailrd-staging.yml

# Lint via cfn-lint if installed (optional)
# cfn-lint infrastructure/cloudformation/tailrd-staging.yml

# Commit
git checkout -b feat/day9-staging-environment
git add docs/DAY_9_PLAN.md infrastructure/cloudformation/tailrd-staging.yml
git commit -m "docs(day9): plan + CF template for permanent staging environment"
git push -u origin feat/day9-staging-environment

# PR
gh pr create --title "feat(day9): plan + CF template for permanent staging environment" \
  --body "Day 9 plan + CloudFormation template authoring. NO infrastructure changes. Reviewed Tuesday morning before stack create."
```

**Acceptance for Task 2:** PR open with `validate-template` exit 0. CI green.

### Task 3 - Request ACM cert for `staging-api.tailrd-heart.com` (Tuesday AM, ~30 min including DNS)

```bash
aws acm request-certificate \
  --domain-name staging-api.tailrd-heart.com \
  --validation-method DNS \
  --region us-east-1 \
  --tags Key=Project,Value=tailrd Key=Environment,Value=staging
```

Capture cert ARN. Get DNS validation record:

```bash
aws acm describe-certificate --certificate-arn <arn> \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

**Manual step (Wix DNS UI):** Jonathan adds the validation CNAME at Wix. Per the SES setup runbook (`docs/SES_SETUP_2026_04_25.md`), Wix is authoritative for tailrd-heart.com - Route 53 is shadow only. ~10-15 min for validation to complete after Wix records propagate.

```bash
# Wait + confirm
aws acm describe-certificate --certificate-arn <arn> \
  --query 'Certificate.Status'
# Expected: ISSUED
```

**Acceptance for Task 3:** Cert status `ISSUED`. ARN captured for Task 4.

### Task 4 - Deploy CF stack (Tuesday AM, ~30 min)

**Initial-deploy image strategy (Refinement 3, 2026-04-27):** the CF template's `ECRImageUri` parameter defaults to the **current production image SHA** (`tailrd-backend:2f7768fe570627875e9d7f7a7ba6ffb9a549c4e3` - PR #184 deploy SHA). Initial ECS service create uses this image as the starting point so staging is immediately functional post-deploy. The CI/CD pipeline (Task 8) replaces this with fresh per-merge builds going forward. No staging-specific image build is required for stand-up; staging always tracks main.

```bash
aws cloudformation create-stack \
  --stack-name tailrd-staging \
  --template-body file://infrastructure/cloudformation/tailrd-staging.yml \
  --parameters \
    ParameterKey=AcmCertificateArn,ParameterValue=<cert-arn-from-task-3> \
    ParameterKey=ECRImageUri,ParameterValue=863518424332.dkr.ecr.us-east-1.amazonaws.com/tailrd-backend:2f7768fe570627875e9d7f7a7ba6ffb9a549c4e3 \
  --capabilities CAPABILITY_NAMED_IAM \
  --tags Key=Project,Value=tailrd Key=Environment,Value=staging
```

Wait for `CREATE_COMPLETE` (~15-25 min, mostly Aurora cluster bootstrap):

```bash
aws cloudformation wait stack-create-complete --stack-name tailrd-staging
```

Capture outputs:

```bash
aws cloudformation describe-stacks --stack-name tailrd-staging --query 'Stacks[0].Outputs' --output table
```

**Acceptance for Task 4:** Stack `CREATE_COMPLETE`. AuroraWriterEndpoint + ALBDNSName outputs present. Aurora cluster status `available`.

### Task 5 - Wix DNS for `staging-api.tailrd-heart.com` → ALB (Tuesday AM, ~15 min, manual)

ALB DNS name from Task 4 outputs. Add CNAME at Wix:
- Type: CNAME
- Host: `staging-api`
- Value: `<alb-dns-name>` (from CF output)
- TTL: 300

Verify resolution after propagation (~5-10 min):

```bash
nslookup staging-api.tailrd-heart.com
# Or PowerShell: Resolve-DnsName staging-api.tailrd-heart.com -Type CNAME
```

**Acceptance for Task 5:** `staging-api.tailrd-heart.com` resolves to the staging ALB.

### Task 6 - Apply Prisma migrations to staging Aurora (Tuesday AM, ~10 min)

Reuse the proven `applyAuroraSchemaParity.js` pattern from Wave 2 prep work. Connect via the `tailrd-staging/app/aurora-db-password` secret (created automatically by the CF stack), run `npx prisma migrate deploy` against the staging endpoint.

```bash
# Re-attach Phase2D-TempSecretsAccess (or create staging-specific equivalent - TBD)
# Run Fargate one-off using overrides-aurora-parity.json adapted for staging
# Verify all 3 migrations applied (consolidated_baseline + audit_log_hospital_nullable + add_performance_request_log)
```

**Acceptance for Task 6:** Aurora staging `_prisma_migrations` shows 3 rows, schema matches production.

### Task 7 - Synthea seed (Tuesday PM kickoff, Wednesday AM verify) - 6-8 hr background

Kick off Fargate long-running task that:
1. Fetches Synthea FHIR bundles from S3 (existing pipeline)
2. Generates 25,000 patient population
3. Streams through `processSynthea` ingestion pipeline against staging Aurora
4. Logs progress every 1k patients

**Kickoff command** (Tuesday PM):

```bash
# Override sets target-patient-count=25000, DATABASE_URL=staging Aurora
aws ecs run-task \
  --cluster tailrd-staging-cluster \
  --task-definition tailrd-staging-backend \
  --launch-type FARGATE \
  --network-configuration ... \
  --overrides file://infrastructure/scripts/staging-seed/overrides-synthea-seed.json
```

**Verification (Wednesday AM):**

```bash
# Quick Fargate inventory (reuse inventoryRdsAurora.js - but staging has no RDS counterpart, so simplify to count-only)
# Expected:
#   patients ≈ 25,000 ± 5%
#   encounters ≈ 150-200K
#   procedures ≈ 500K-1M
#   conditions ≈ 100-200K
#   medications ≈ 100-200K
#   gap detection across all 6 modules returns >0 gaps each
```

**Acceptance for Task 7:** All counts within target ranges. Gap detection finds therapy gaps in all 6 modules.

**PAUSE POINT before Task 8.** Do not stack CI/CD changes onto un-verified seed data.

### Task 8 - GitHub Actions staging deploy job (Wednesday AM, ~45 min)

Add to `.github/workflows/deploy.yml` (or appropriate file):

```yaml
deploy-staging:
  needs: [test, lint]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    - uses: aws-actions/amazon-ecr-login@v2
    - name: Build + push image
      run: |
        docker build -t $ECR_URI:$GITHUB_SHA .
        docker push $ECR_URI:$GITHUB_SHA
    - name: Update staging task def with new image
      run: |
        aws ecs describe-task-definition --task-definition tailrd-staging-backend > td.json
        # mutate image, register new revision
        # update service to new task def
```

**Acceptance for Task 8:** A test commit to main triggers the staging deploy job, new task def registered, ECS service rolling deploy completes, `staging-api/health` returns 200.

### Task 9 - Smoke tests + acceptance (Wednesday AM, ~30 min)

```bash
# Health
curl -f https://staging-api.tailrd-heart.com/health
# Login
curl -X POST https://staging-api.tailrd-heart.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<staging-test-user>","password":"<...>"}'
# Hospitals (verifies Aurora reachable + seeded)
curl -H "Authorization: Bearer <token>" https://staging-api.tailrd-heart.com/api/hospitals
```

**Acceptance for Task 9:** All three return 200 with expected payload.

---

## 6. Pause points (where to stop and confirm)

| Pause | Where | Decision required |
|---|---|---|
| P1 - Today | After CF template authored, before commit | Self-review checklist passes; cfn-lint clean |
| P2 - Tuesday | Before `aws cloudformation create-stack` | Fresh-eyes review of the template + parameters |
| P3 - Tuesday | After CF stack `CREATE_COMPLETE` | Verify all 15 resource types created; no surprise drifts |
| P4 - Tuesday | After Wix DNS for staging-api | Confirm `Resolve-DnsName` returns ALB CNAME |
| P5 - Tuesday | After `prisma migrate deploy` | Verify 3 migrations applied; schema parity |
| P6 - Tuesday PM | After Synthea seed kickoff | First 1-2 hours of CloudWatch log shows progress, no errors |
| P7 - Wednesday | After seed verified (counts + gap detection) | Counts within ranges; gaps in all 6 modules |
| P8 - Wednesday | After CI/CD wiring | One test push to main triggers deploy successfully |
| P9 - Wednesday | After smoke tests | Day 9 complete - close out |

---

## 7. Safety stops

- **CF stack create fails** → CF auto-rolls back. Capture failure reason from `describe-stack-events`. Don't retry blindly. Fix template, redeploy.
- **Aurora cluster fails to start** (post-CF) → check parameter group, security group, subnet group. Common cause: subnet group missing required AZ count.
- **ALB target group health checks fail** (after seed-less first deploy) → backend likely failing because no DB content; expected pre-seed. Reduce healthcheck threshold during initial stand-up if needed.
- **Wix DNS doesn't propagate** within 30 min → check Wix dashboard for typo in the CNAME records.
- **ACM cert validation never completes** → DNS record missing or wrong content. Re-pull validation record from `describe-certificate`, re-add at Wix.
- **Synthea seed fails partway** → logged in `/ecs/tailrd-staging-backend`. Common: OOM (increase Fargate memory), Aurora connection limits (Aurora Serverless v2 has connection ceilings at low ACU), schema mismatch (re-run Task 6).
- **CI/CD pipeline pushes wrong image** → ECS rolling deploy + container health check catch it. Roll back to previous task def revision.

---

## 8. Rollback plan for CF deploy failures

| Stage | Failure mode | Rollback |
|---|---|---|
| Stack create | Resources fail mid-create | CloudFormation `ROLLBACK_COMPLETE` automatic. `aws cloudformation delete-stack --stack-name tailrd-staging` to clean up. |
| Stack created but Aurora unhealthy | Aurora started but can't connect | Delete stack (deletes Aurora + ECS + ALB). |
| Stack stable but data corrupt during seed | Synthea ingestion produced bad data | Drop staging Aurora schema, re-apply migrations, re-seed. Doesn't require stack delete. |
| CI/CD job deploys broken image to staging | Backend crash on staging | `aws ecs update-service --task-definition <previous-revision>` rolls back. |
| Critical issue post-acceptance | Need to retire the entire env | Single command: `aws cloudformation delete-stack --stack-name tailrd-staging`. Aurora data lost (deletion-protection: false intentionally for cleanup). Recreate via plan. |

**Safety: staging Aurora has DeletionProtection=false** so cleanup is one command. Production Aurora has DeletionProtection=true (must be turned off explicitly).

---

## 9. Acceptance criteria - Day 9 complete

- [ ] `infrastructure/cloudformation/tailrd-staging.yml` reviewed, validated, committed
- [ ] `tailrd-staging` CF stack deployed and `CREATE_COMPLETE`
- [ ] All 15 resources created per the template
- [ ] ACM cert `ISSUED` for staging-api.tailrd-heart.com
- [ ] Wix DNS CNAME for staging-api → staging ALB
- [ ] All 3 Prisma migrations applied to staging Aurora
- [ ] Synthea seed completed: 25K ± 5% patients, 150-200K encounters, 500K-1M procedures
- [ ] Gap detection runs against staging and finds therapy gaps in all 6 modules
- [ ] GitHub Actions staging-deploy job auto-deploys on merge to main
- [ ] `staging-api.tailrd-heart.com/health` returns 200
- [ ] Smoke login works against staging
- [ ] `staging-api.tailrd-heart.com/api/hospitals` returns the seeded data
- [ ] PR for the CF template + plan merged to main

---

## 10. Followup work tracked separately

| Item | Tracking |
|---|---|
| Investigate `tailrd-production` (db.t4g.medium) ownership and decide retire-or-keep | New tech debt entry to add post-Sinai (HIPAA-tagged, deletion-protected, dormant predecessor) |
| Delete `tailrd-staging-postgres` (logical-repl rehearsal) | Post-migration cleanup, post-Day-10 |
| Delete empty `tailrd-production` ECS cluster | Post-migration cleanup |
| Codify Aurora-production cluster + ECS-production resources in CloudFormation | Post-Sinai infra-as-code consolidation; tech debt |
| Day 10 itself (`docs/RUNBOOK_AURORA.md` + `RUNBOOK_INGESTION.md` + RDS decommission) | Separate plan, post-Day-9 stabilization |

---

## 11. Revision history

| Date | Change |
|---|---|
| 2026-04-27 | Initial plan authored. Pre-flight investigation complete (mystery resources dispositioned). Decisions locked: shared VPC, Synthea 25K seed, multi-day execution split. CF template authoring next. |
| 2026-04-27 | **Refinement 1**: ECS task sizing increased from 512/1024 to **1024/2048** to match production (cost delta ~$15/mo, parity required for realistic staging). **Refinement 3**: initial-deploy image strategy locked - CF parameter `ECRImageUri` defaults to current production image SHA `2f7768f...`; CI/CD takes over per-merge thereafter. **Naming fix**: Secrets Manager namespace changed from `tailrd-staging/*` to `tailrd-staging-aurora/*` to disambiguate from the dormant `tailrd-staging-postgres` rehearsal Postgres that already owns `tailrd-staging/app/database-url`. |
