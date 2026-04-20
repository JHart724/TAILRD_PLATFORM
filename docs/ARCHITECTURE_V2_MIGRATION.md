# Aurora V2 Migration — Architecture and 10-Day Plan

**Status:** Day 1 (2026-04-20) — planning + documentation only. No infrastructure changes yet.
**Owner:** Jonathan Hart
**Sprint:** Aurora V2 migration Phase 0

---

## 1. Why we are doing this

The current production database is a single `db.t3.medium` PostgreSQL instance. It is:

- Running at sustained ~54% CPU on baseline load (no ingestion, no QPS spike) — see §5 for root cause
- Burst-credit bound on t3 — any ingestion job that pushes above baseline eats CPU credits and stalls writes
- Single-writer, no horizontal read scaling
- No connection pooling layer, so ECS task cold-starts and Prisma reconnects drop concurrent connections onto PG directly
- Multi-AZ for HA only, not for read scale

We need Aurora so we can (a) absorb 500k-patient demo loads without the ingestion pipeline competing with live dashboard traffic, (b) scale reads horizontally when we onboard 3+ health systems, and (c) have a proxy-pooled front door that survives ECS task recycles without connection storms.

---

## 2. Current infrastructure (2026-04-20 snapshot)

### 2.1 RDS instance

| Field | Value |
|---|---|
| Identifier | `tailrd-production-postgres` |
| Class | `db.t3.medium` (2 vCPU, 4 GB RAM, burstable) |
| Engine | PostgreSQL 15.14 |
| Storage | `gp3`, 100 GB allocated, 3000 IOPS provisioned |
| Multi-AZ | `true` |
| Backup retention | 7 days |
| Backup window | 03:00–04:00 UTC |
| Maintenance window | Sunday 04:30–05:30 UTC |
| Storage encrypted | `true` (KMS key `arn:aws:kms:us-east-1:863518424332:key/109cd89c-bb71-4258-a205-369f6816c14f`) |
| Performance Insights | **DISABLED** (blocker noted in §5) |
| Parameter group | `tailrd-production-postgres15-params` |
| Subnet group | `tailrd-production-db-subnet-group` (2 DB subnets, 1a + 1b) |
| Security group | `sg-09e3b87c3cbc42925` (`tailrd-production-vpc-DatabaseSecurityGroup-ZU0BsrfQ15zd`) |
| Endpoint | `tailrd-production-postgres.csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432` |
| VPC | `vpc-0fc14ae0c2511b94d` |

### 2.2 Data inventory

Queried via `/api/hospitals`, `/api/admin/analytics`, `/api/patients`, and `/api/modules/heart-failure/dashboard` on 2026-04-20:

| Surface | Count |
|---|---|
| Hospital records | 2 (`demo-medical-city-dallas`, `hosp-001`) |
| Active users | 1 (`JHart@tailrd-heart.com`) |
| Patient rows (MCD) | 0 — just wiped via PR #159 |
| Patient rows (hosp-001) | 0 — Patient table is empty |
| HF dashboard patients (hosp-001) | 14,168 (computed from Observation/Encounter tables, *not* Patient) |
| HF dashboard open gaps (hosp-001) | 69 |
| Critical alerts | 0 |

**MCD wipe state:** The MCD wipe is complete at the Patient-table level for `demo-medical-city-dallas`. The `hosp-001` Patient table is also empty — indicates the platform is running on residual Observation/Encounter/Condition rows without Patient anchors. This will be resolved by either reseeding from Synthea into Aurora or by dropping orphaned rows during DMS replication.

Per-table row counts and on-disk size require ECS Exec with the Session Manager plugin (not installed on current workstation) or DB superuser psql access. Deferred to Day 2 when we stand up a short-lived ECS task with an `aws ecs run-task` override that runs `psql -c "\dt+"` against the instance.

### 2.3 Backend configuration (ECS)

| Field | Value |
|---|---|
| Cluster | `tailrd-production-cluster` |
| Service | `tailrd-production-backend` (desired 1, running 1) |
| Task definition | `tailrd-backend:84` |
| CPU / memory | 1024 / 2048 |
| Network mode | `awsvpc` |
| Subnets | `subnet-0e606d5eea0f4c89b` (private 1b), `subnet-0071588b7174f200a` (private 1a) |
| Security group | `sg-07cf4b72927f9038f` (backend app SG) |
| Task role | `tailrd-production-ecs-task` |
| Execution role | `tailrd-production-ecs-task-execution` |
| ECS Exec | Enabled |

**Secrets (injected via Secrets Manager):**

| Env var | Secret ARN |
|---|---|
| `DATABASE_URL` | `arn:aws:secretsmanager:us-east-1:863518424332:secret:tailrd-production/app/database-url-SagEmE` |
| `JWT_SECRET` | `arn:aws:secretsmanager:us-east-1:863518424332:secret:tailrd-production/app/jwt-secret-VIfleG` |
| `PHI_ENCRYPTION_KEY` | `arn:aws:secretsmanager:us-east-1:863518424332:secret:tailrd-production/app/phi-encryption-key-ktvX7y` |
| `REDOX_WEBHOOK_SECRET` | `arn:aws:secretsmanager:us-east-1:863518424332:secret:tailrd-production/app/redox-webhook-secret-ZJ2Q3a` |

**Plaintext environment variables:**
`SES_FROM_ADDRESS`, `AWS_REGION`, `API_URL`, `PORT`, `AWS_CLOUDWATCH_GROUP`, `CORS_ORIGINS`, `COGNITO_USER_POOL_ID`, `FRONTEND_URL`, `DEMO_FALLBACK_ENABLED`, `DEMO_MODE`, `SMART_CLIENT_ID`, `COGNITO_DOMAIN`, `COGNITO_REGION`, `NODE_ENV`, `LOG_LEVEL`, `COGNITO_CLIENT_ID`.

Note: `DEMO_MODE` and `DEMO_FALLBACK_ENABLED` are **present** in the task definition. Their current values should be audited (see tech debt register).

### 2.4 VPC networking

| Field | Value |
|---|---|
| VPC ID | `vpc-0fc14ae0c2511b94d` |
| VPC CIDR | `10.0.0.0/16` |
| Public subnets | `10.0.1.0/24` (1a), `10.0.2.0/24` (1b) |
| Private (app) subnets | `10.0.10.0/24` (1a), `10.0.11.0/24` (1b) |
| DB subnets | `10.0.20.0/24` (1a), `10.0.21.0/24` (1b) |
| NAT Gateway | `nat-013def8ace25bf552` in public subnet 1a |
| ALB | `tailrd-production-alb` (internet-facing, dualstack not confirmed) |
| DB ingress rule | Port 5432 TCP from `sg-07cf4b72927f9038f` (backend) and `sg-0d19425b2ec51c77e` (unconfirmed — to be audited) |

Aurora will reuse the same VPC, DB subnet group, and KMS key. No new NAT, no new routing.

---

## 3. Target architecture

```
                        ┌──────────────────────────────────┐
                        │        Internet users            │
                        └──────────────┬───────────────────┘
                                       │ HTTPS
                                       ▼
                         ┌─────────────────────────┐
                         │  CloudFront  +  ALB     │
                         │  (public subnets)       │
                         └──────────────┬──────────┘
                                        │
                ┌───────────────────────┴────────────────────────┐
                │                                                │
                ▼                                                ▼
    ┌──────────────────────┐                          ┌──────────────────────┐
    │  Backend ECS Fargate │                          │  S3 ingestion bucket │
    │  (private subnets)   │                          │  (Synthea uploads)   │
    │  tailrd-backend:NN   │                          └──────────┬───────────┘
    └──────┬───────────────┘                                     │
           │                                                     ▼
           │ DATABASE_URL points here                 ┌──────────────────────┐
           ▼                                          │  Lambda publisher    │
    ┌──────────────────────┐                          │  (S3 → SQS fan-out)  │
    │  RDS Proxy           │                          └──────────┬───────────┘
    │  (pooling + IAM)     │                                     │
    └──────┬───────────────┘                                     ▼
           │                                          ┌──────────────────────┐
           ▼                                          │  SQS ingestion queue │
    ┌───────────────────────────────────┐             └──────────┬───────────┘
    │  Aurora PostgreSQL Serverless v2  │◄────────────┐          │
    │  ┌─────────────┐  ┌─────────────┐ │             │          ▼
    │  │  Writer     │  │  Reader(s)  │ │             │ ┌──────────────────┐
    │  │             │  │  (auto)     │ │             │ │ Step Functions   │
    │  └─────────────┘  └─────────────┘ │             │ │ state machine    │
    └───────────────────────────────────┘             │ └──────┬───────────┘
            ▲                   ▲                     │        │
            │                   │                     │        ▼
            │ writes            │ reads               │ ┌──────────────────┐
            │                   │ (dashboard,         │ │ Ingest worker    │
            │                   │  gap engine)        └─┤ ECS pool (auto-  │
            │                   │                       │ scaled by queue) │
            │                   └───── Backend ECS ───►│ depth)            │
            └──────── Ingest workers (writes) ─────────┘└──────────────────┘
```

**Key design decisions:**

- **Aurora Serverless v2** (not provisioned Aurora). Scales ACU from 0.5 → 16 automatically. Pay for what we actually use. Demo pilots sit at 0.5 ACU; a 500k load test scales up temporarily.
- **RDS Proxy** in front of the writer. Pools connections so ECS task restarts do not storm the DB. Enables IAM auth later. Survives failover more gracefully than direct DSN.
- **Read replica(s)** — Aurora gives 1 free reader by default. Dashboard / gap-detection / analytics queries route to the reader. The Prisma client needs a small change to honor a `DATABASE_REPLICA_URL` for read transactions.
- **Ingestion decoupled via SQS** — today, Redox webhooks and Synthea uploads write directly via the backend. After migration, they publish to SQS and a dedicated ECS worker pool drains the queue at controlled concurrency. This is the real fix for "ingestion and dashboard compete for CPU."
- **Step Functions** orchestrates the ingest steps (parse → validate → transform → upsert → run gap detection). Replaces the current `ingestion/gapDetectionRunner.ts` inline flow with an observable, retryable state machine.

---

## 4. 10-day plan

Each day is one day of focused work — roughly 4-6 hours of execution plus context switching. Every day ends with a verifiable checkpoint.

### Day 1 — Documentation and baseline (2026-04-20) — **this ship**

- [x] Confirm MCD wipe tasks killed, RDS untouched
- [x] Investigate sustained 54% CPU root cause
- [x] Document current infrastructure (§2 above)
- [x] Write the 10-day plan
- [x] Write the tech debt register
- [x] PR both docs and merge

**Checkpoint:** `docs/ARCHITECTURE_V2_MIGRATION.md` and `docs/TECH_DEBT_REGISTER.md` merged on `main`. No infra changes.

### Day 2 — Provision Aurora Serverless v2 + RDS Proxy (2026-04-21)

- CloudFormation template under `infrastructure/cloudformation/aurora.yml`:
  - Aurora cluster (engine 15.x compatible), 1 writer + 1 reader, Serverless v2 scaling 0.5–8 ACU
  - Cluster parameter group (copy values from current PG15 param group where they apply)
  - DB subnet group (reuse `tailrd-production-db-subnet-group`)
  - New security group `tailrd-production-aurora-sg` — ingress 5432 from backend app SG and from RDS Proxy SG only
  - RDS Proxy pointing at the writer endpoint, auth via Secrets Manager
  - Performance Insights enabled (7-day retention, default tier)
  - KMS: reuse existing key
- Store new credentials in Secrets Manager (`tailrd-production/app/aurora-url`, not wired to ECS yet)
- No DMS, no data, no cutover — provision and idle

**Checkpoint:** `describe-db-clusters` returns the new cluster `available`, `describe-db-proxies` returns the proxy `available`. Cost starts accruing (~$0.50/hr idle).

### Day 3 — DMS replication RDS → Aurora (2026-04-22)

- Create DMS replication instance (`dms.t3.medium`, 50 GB, MultiAZ off for cost)
- Source endpoint: current RDS
- Target endpoint: Aurora writer
- Replication task: full load + CDC, all schemas except `pg_catalog` and `information_schema`
- Start task. Monitor `FullLoadProgressPercent` and `CDCLatencyTarget`

**Checkpoint:** DMS task in `Running` state, full-load complete, CDC latency < 60s.

### Day 4 — Verify Aurora data (2026-04-23)

- Run a row-count diff between RDS and Aurora for every table using a small Node script (read from both, compare)
- Spot-check 100 random Patient rows for field-level equality (with PHI encryption: compare ciphertexts, which should match byte-for-byte since the encryption key is the same)
- Run the gap detection engine against Aurora reader, diff results against RDS output for the same tenant
- Keep DMS running — RDS is still primary

**Checkpoint:** Zero row-count deltas, zero gap-detection deltas across all 6 modules.

### Day 5 — Ingestion pipeline rewrite (2026-04-24)

- New code under `backend/src/ingestion/queue/`:
  - `publisher.ts` — wraps S3 notifications, emits SQS messages
  - `worker.ts` — new ECS task family `tailrd-ingest-worker`, polls SQS, runs the same CSV parser + patient writer but against Aurora writer via RDS Proxy
  - Step Functions state machine under `infrastructure/cloudformation/ingest-stepfunctions.yml`
- Keep the old inline ingestion code intact behind a feature flag (`INGEST_MODE=inline|queue`). Day 5 lands the code, not the cutover.

**Checkpoint:** New ingest worker can drain a test queue against Aurora and produce identical gap output vs inline.

### Day 6 — Production cutover (2026-04-25)

- Pre-cutover: stop DMS CDC, confirm zero lag
- Pre-cutover: scale backend desired count to 2 (for rolling)
- Cutover (target window 15 min):
  1. Put app in read-only by flipping a feature flag that rejects non-GET requests at the middleware layer
  2. Confirm DMS lag = 0, stop replication task
  3. Update Secrets Manager `tailrd-production/app/database-url` to the RDS Proxy endpoint
  4. Update `tailrd-backend` task def with new Secrets Manager version, register a new revision, force-new-deployment
  5. Wait for healthy tasks on the new revision
  6. Smoke test: `/health`, login, HF dashboard — all must return 200 with matching data
  7. Flip feature flag off (re-enable writes)
- Post-cutover: leave RDS running for 48h as a rollback target

**Rollback (within 2 minutes):** Swap Secrets Manager `tailrd-production/app/database-url` back to the old RDS endpoint, register a new task def revision, force-new-deployment. DMS still has CDC state so we can replay forward.

**Checkpoint:** Live traffic on Aurora, zero failed requests, baseline CPU on Aurora < 15%.

### Day 7 — 500k patient load test (2026-04-26)

- Generate 500k Synthea patients into the S3 ingestion bucket
- Let the new SQS worker pool drain — auto-scaling kicks in
- Monitor: Aurora ACU usage, RDS Proxy connection count, SQS queue depth, Step Functions success rate, gap detection runtime per patient
- Success criteria: ingestion completes within 2 hours, no dead-letter messages, dashboard remains responsive (P95 < 500 ms) during ingest

**Checkpoint:** 500k patients loaded, gap counts match expected distribution, dashboard SLO held.

### Day 8 — Observability (2026-04-27)

- CloudWatch dashboard: `tailrd-production-aurora-dashboard` — ACU, CPU, active sessions, RDS Proxy pinning, SQS queue age, Step Functions failure rate
- SNS topic + alarms: Aurora CPU > 80% for 5 min, RDS Proxy `DatabaseConnectionRequestsExceedsAvailable` > 0, SQS queue depth > 10k, Step Functions error rate > 1%
- X-Ray: enable active tracing on backend ECS service, instrument Prisma with the X-Ray plugin or use `aws-xray-sdk-core` `captureHTTPs` + custom segments for DB calls

**Checkpoint:** Dashboard live, alarms subscribed to Jonathan's email + Slack webhook.

### Day 9 — Staging environment (2026-04-28)

- New CloudFormation stack `tailrd-staging` — separate Aurora cluster (Serverless v2 0.5 min ACU), backend ECS cluster + service, same ALB pattern
- Staging uses its own Secrets Manager entries, its own subdomain (`staging-api.tailrd-heart.com`)
- CI/CD: GitHub Actions adds a staging deploy job that runs on every merge to `main`, production deploy triggers manually

**Checkpoint:** `staging-api.tailrd-heart.com/health` returns 200. A smoke login works. `/api/hospitals` returns a seeded staging dataset.

### Day 10 — Runbooks + RDS decommission (2026-04-29)

- Write `docs/RUNBOOK_AURORA.md`: cutover/rollback, scaling ACU, reader promotion, DMS replay
- Write `docs/RUNBOOK_INGESTION.md`: SQS dead-letter triage, Step Functions restart, worker scale-up
- RDS decommission:
  - Take a final manual snapshot of `tailrd-production-postgres`
  - Confirm snapshot visible in `describe-db-snapshots`
  - Delete the RDS instance (with final snapshot retained)
  - Delete the DMS replication task and instance

**Checkpoint:** Runbooks merged. Old RDS gone. AWS bill reflects only Aurora going forward.

---

## 5. Root cause of the sustained 54% CPU

**Finding:** The RDS CPU pin is **not** residual ingestion. It is an external uptime monitor.

Evidence (CloudWatch logs `/ecs/tailrd-production-backend`, last 2 hours, 20,338 log lines):

- Every 30 seconds, exactly 5 endpoints are called in sequence:
  `/electrophysiology/dashboard`, `/coronary-intervention/dashboard`, `/structural-heart/dashboard`, `/valvular-disease/dashboard`, `/peripheral-vascular/dashboard` — **272 hits per endpoint** over the 2-hour window (272 × 30s ≈ 2.3 hours of continuous polling)
- User-Agent: `curl/8.18.0`
- Source IP as logged by the backend: `::ffff:10.0.1.189` — this is the **ALB ENI** (`eni-0def6e5c82361ef0a`, Description `ELB app/tailrd-production-alb/12cc0d46828a90ae`). The real client IP is not captured because the backend does not trust `X-Forwarded-For` (see tech debt register).
- No `Synthetics` canary exists. No EventBridge rule matches. No EC2 instance lives in the originating subnet. The caller is external, reaching us through the internet-facing ALB.
- ALB access logs are **not enabled** — we cannot currently identify the exact client IP without enabling them. Day 2 prerequisite: turn on ALB access logs to S3.

**Why this burns CPU:** Each of those 5 endpoints runs a real dashboard aggregation query (module-scoped Observation / Condition / MedicationRequest / Encounter joins + gap count rollups). 5 endpoints × 2 queries/second × t3.medium baseline CPU credits = sustained burn. HF is missing from the list, which is suspicious — it suggests someone configured the monitor before HF got wired (the 5 unwired modules are exactly the 5 being polled).

**Immediate remediation (not part of this PR):**
1. Enable ALB access logs to identify the client (~5 min)
2. Once identified, either turn off the monitor or retarget it to `/health` instead of dashboard endpoints
3. Add rate limiting at the ALB / WAF level for `/api/modules/*/dashboard` routes

**Why this matters for Aurora migration:** Aurora Serverless v2 will absorb this load elastically, but at cost (ACU scales up). The right fix is to stop the polling at the source. If we cut over to Aurora with this monitor still running, we pay for every hit in ACU-seconds. Identify and terminate before Day 6 cutover.

Top-5-queries-by-total-time from `pg_stat_statements` was not captured this ship because the workstation does not have the AWS Session Manager plugin installed (required for `aws ecs execute-command`). Deferred to Day 2 via a short-lived `aws ecs run-task` with a `psql` override.

---

## 6. Rollback plan by day

| Day | Rollback | Blast radius |
|---|---|---|
| 2 | Delete Aurora cluster + Proxy via `aws cloudformation delete-stack aurora` | Zero — not yet wired to production traffic |
| 3 | Stop and delete DMS replication task + instance | Zero — RDS is still primary |
| 4–5 | Aurora runs in parallel, no cutover yet | Zero — still RDS primary |
| 6 | Swap Secrets Manager `database-url` back to RDS endpoint, register new backend task def, force-new-deployment. DMS CDC state lets us replay inbound writes. | ~2 min of rejected writes during app-layer read-only flip, then restored |
| 7–10 | Already cut over. Rollback = reverse DMS (new task with Aurora source, RDS target), then repeat Day 6 swap in reverse. | 30–60 min depending on CDC lag, but reversible |

**Rollback is only irreversible after Day 10** when we delete the RDS instance. The final RDS snapshot remains available for 35 days by default.

---

## 7. Cost delta

Rough monthly estimates (us-east-1 on-demand, 730 hrs/month):

| Component | Current | Target |
|---|---|---|
| RDS `db.t3.medium` Multi-AZ + 100 GB gp3 | ~$100/mo | — |
| Aurora Serverless v2 writer (0.5 ACU baseline, bursts to 4 ACU ~10% of time) | — | ~$120/mo |
| Aurora Serverless v2 reader (0.5 ACU baseline) | — | ~$45/mo |
| Aurora storage (100 GB) | — | ~$10/mo |
| RDS Proxy | — | ~$15/mo |
| SQS + Lambda publisher (low volume) | — | ~$5/mo |
| Step Functions Standard (5k executions/mo) | — | ~$15/mo |
| Performance Insights (default 7-day) | — | $0 (free tier) |
| X-Ray (low sampling) | — | ~$5/mo |
| CloudWatch dashboard + alarms + extra logs | minimal | ~$15/mo |
| Staging environment (half-size) | — | ~$100/mo |
| DMS (only for 10-day migration window) | — | one-time ~$50 |
| **Total** | **~$100/mo** | **~$330–400/mo** |

**Net delta: +$230–300/mo** for production-ready scale, read/write separation, connection pooling, staging, and observability. Cheaper than the cost of one CMO demo going sideways because the DB pinned at 100%.

---

## 8. Pre-requisites checklist

Before Day 2:

- [ ] Enable ALB access logs to S3 (required to identify the 30s monitor source)
- [ ] Install AWS Session Manager plugin on the build workstation (required for ECS Exec and ad-hoc DB queries)
- [ ] Confirm DMS service-linked role exists: `aws iam get-role --role-name AWSServiceRoleForDMS`
- [ ] Confirm RDS Proxy service-linked role exists: `aws iam get-role --role-name AWSServiceRoleForRDS`
- [ ] Confirm IAM role for enhanced monitoring exists: `AmazonRDSEnhancedMonitoringRole` (create if missing)
- [ ] Confirm KMS key `109cd89c-bb71-4258-a205-369f6816c14f` has policy allowing both `rds.amazonaws.com` (Aurora) and `dms.amazonaws.com` (replication)
- [ ] Aurora subnet group: reuse `tailrd-production-db-subnet-group` (two DB subnets in 1a and 1b — sufficient for Aurora)
- [ ] New security group for Aurora (`tailrd-production-aurora-sg`) — ingress 5432 from backend SG `sg-07cf4b72927f9038f` and from RDS Proxy SG (TBD at Day 2)
- [ ] Backup and maintenance windows: match current RDS (03:00–04:00 UTC backup, Sun 04:30–05:30 UTC maintenance)
- [ ] Confirm AWS account service quotas allow: 1 Aurora cluster, 2 instances, 1 RDS Proxy, 1 DMS instance

---

## 9. Open questions for Day 2

1. **ALB access logs S3 bucket:** new bucket or reuse `tailrd-production-*`? (Prefer new, `tailrd-production-alb-logs`, lifecycle 30 days.)
2. **Aurora engine version:** PG 15.5 compat (matches source) or jump to 16.x? (Prefer 15.x to avoid compat surprises during cutover.)
3. **Auto minor upgrade:** on or off? (Prefer off for production, manual windows only.)
4. **Serverless v2 max ACU:** 8 or 16? (Start at 8, raise if Day 7 load test saturates.)
5. **Should we enable IAM auth on Aurora now or defer?** (Defer — RDS Proxy with Secrets Manager is already a security upgrade. IAM auth is a Day-11+ item.)

---

## 10. Aurora provisioning state (Day 2, 2026-04-20)

### KMS

| Field | Value |
|---|---|
| Alias | `alias/tailrd-aurora-production` |
| Key ID | `ec93e66e-0f65-46bf-b132-11c9b1b7e637` |
| ARN | `arn:aws:kms:us-east-1:863518424332:key/ec93e66e-0f65-46bf-b132-11c9b1b7e637` |
| Auto rotation | Enabled (annual) |
| Multi-region | No |

### Network

| Field | Value |
|---|---|
| DB subnet group | `tailrd-aurora-production-subnet-group` (subnets `0168950e9541ff9f6` 1a + `02c70b0a102cf8d3c` 1b) |
| Aurora SG | `sg-0524ba8efe6058f7b` (`tailrd-aurora-production-sg`) |
| Aurora SG ingress | `5432/tcp` from backend SG `sg-07cf4b72927f9038f` |
| Backend SG egress added | `5432/tcp` to Aurora SG (rule `sgr-0d59fcbcea0917bb1`) |

### Aurora cluster

| Field | Value |
|---|---|
| Cluster identifier | `tailrd-production-aurora` |
| Cluster ARN | `arn:aws:rds:us-east-1:863518424332:cluster:tailrd-production-aurora` |
| Engine | `aurora-postgresql` 15.14 (matches source RDS) |
| Database name | `tailrd` |
| Master username | `tailrd_admin` |
| Master password secret | `arn:aws:secretsmanager:us-east-1:863518424332:secret:tailrd-production/app/aurora-db-password-rAm904` |
| Writer endpoint | `tailrd-production-aurora.cluster-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432` |
| Reader endpoint | `tailrd-production-aurora.cluster-ro-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432` |
| Storage encryption | Enabled (KMS key above) |
| Backup retention | 7 days |
| Backup window | 09:00-10:00 UTC |
| Maintenance window | Sunday 10:00-11:00 UTC |
| Deletion protection | Enabled |
| Performance Insights | Enabled on each instance, 93-day retention |
| Enhanced monitoring | 15-second granularity, role `rds-monitoring-role` |
| CloudWatch log exports | `postgresql` |
| Serverless v2 scaling | Min 0.5 ACU, max 16 ACU |

### Instances

| Identifier | Class | Role | Promotion tier |
|---|---|---|---|
| `tailrd-aurora-production-writer` | `db.serverless` | writer | 0 (default) |
| `tailrd-aurora-production-reader-1` | `db.serverless` | reader | 1 |
| `tailrd-aurora-production-reader-2` | `db.serverless` | reader | 2 |

All instances: no public access, PI enabled with 93-day retention, enhanced monitoring 15s. Reader serverless scaling inherits cluster config (0.5-16 ACU by default). To constrain reader max to 8 ACU per the plan, add `--serverless-v2-scaling-configuration` at the instance level when Aurora supports it (today it is cluster-scoped, so readers share the cluster's max).

### RDS Proxy

| Field | Value |
|---|---|
| Name | `tailrd-aurora-proxy` |
| ARN | `arn:aws:rds:us-east-1:863518424332:db-proxy:prx-04ea6998eec317f48` |
| Engine family | POSTGRESQL |
| Endpoint | `tailrd-aurora-proxy.proxy-csp0w6g8u5uq.us-east-1.rds.amazonaws.com:5432` |
| Authentication | Secrets Manager only (`IAMAuth: DISABLED`) pointing at the master password secret |
| IAM role | `arn:aws:iam::863518424332:role/tailrd-aurora-rds-proxy-role` (inline `AuroraSecretsAccess` policy) |
| Subnets | All 4 private + DB subnets (1a + 1b) |
| Security group | Aurora SG `sg-0524ba8efe6058f7b` |
| Require TLS | Yes |
| Idle client timeout | 1800 s |
| Connection pool (MaxConnectionsPercent / MaxIdleConnectionsPercent / ConnectionBorrowTimeout) | 100 / 50 / 120 |
| Target group | `default` (Aurora cluster registered as `TRACKED_CLUSTER`) |

**Pool-max note:** The plan called for "connection pool max 200." RDS Proxy expresses pool size as a *percentage* of the target DB's `max_connections`, not an absolute count. 100% means the proxy can use all of whatever the Aurora cluster's `max_connections` ends up being (varies by current ACU). For Serverless v2, `max_connections` scales from ~400 at 0.5 ACU upward, so 100% is >= 400 concurrent backend connections at idle. Adjust if proxy-capped errors appear post-cutover.

### Endpoint secrets (new, not wired to backend yet)

| Name | ARN |
|---|---|
| `tailrd-production/app/aurora-writer-endpoint` | `...aurora-writer-endpoint-gSO4fx` |
| `tailrd-production/app/aurora-reader-endpoint` | `...aurora-reader-endpoint-s1Vn9f` |
| `tailrd-production/app/aurora-proxy-endpoint` | `...aurora-proxy-endpoint-c8ASYo` |
| `tailrd-production/app/aurora-db-password` | `...aurora-db-password-rAm904` |

The existing `tailrd-production/app/database-url` was **NOT modified**. Backend still points at the RDS instance. Secrets Manager swap happens at Day 6 cutover.

### Verified connectivity (ECS run-task, backend SG, via Prisma)

| Endpoint | `SELECT version()` | `pg_is_in_recovery()` | `SELECT 1` |
|---|---|---|---|
| Writer | PostgreSQL 15.14 on aarch64-unknown-linux-gnu | `false` | `1` |
| Reader | PostgreSQL 15.14 on aarch64-unknown-linux-gnu | `true` | `1` |
| Proxy | *pending target registration (PENDING_PROXY_CAPACITY)* | | |

Writer and reader connectivity verified end-to-end at 2026-04-20T11:51Z. Proxy target registration typically completes within 10-15 min after all cluster instances are available. Re-verify before Day 6 cutover.

---

## 11. Session log

| Date | Changes | Outcome |
|---|---|---|
| 2026-04-20 | Phase 0: Created this doc + tech debt register | PR #160 merged — baseline captured |
| 2026-04-20 | Phase 2A: ALB access logs enabled, Express trust proxy set to 1, `docs/RDS_QUERY_ANALYSIS_2026_04_20.md` added. Identified orphaned 17h45m MCD wipe DELETE (PID 19775) as the actual RDS CPU culprit. | PR #161 merged |
| 2026-04-20 | Phase 2B: Aurora cluster + writer + 2 readers + RDS Proxy + KMS key + SG + secrets provisioned. Writer/reader connectivity verified. Proxy target registration in progress. | Aurora sits empty, awaiting Day 3 DMS |
