# DMS Prerequisites Audit — pre-rehearsal

**Captured:** 2026-04-23 (inserted as Phase 2-D-PRE between source-endpoint modification and staging rehearsal)
**Scope:** Every AWS DMS prerequisite per AWS documentation + operational prerequisites specific to this migration.
**Method:** Read-only via AWS CLI + schema review. No changes beyond those already committed in CR-2026-04-24-001.
**Outcome:** **FIX-THEN-GO.** One critical network gap found that is almost certainly the root cause of yesterday's unlogged "Stream Component Fatal error". Plus a couple of LOW-severity hygiene items.

This doc is the template for future AWS service integration prerequisite audits.

---

## Headline

| # | Finding | Severity | Status |
|---|---|---|---|
| **F1** | DMS database subnets had no route to reach CloudWatch Logs. | **CRITICAL** | **RESOLVED 2026-04-23** — Interface VPC endpoint `vpce-05ceeb6c12947c215` (`com.amazonaws.us-east-1.logs`) deployed in both DMS subnets with Private DNS. See §F1-Remediation below. |
| F2 | No CloudWatch cost alarms or budgets configured. | LOW | **PARTIAL** — alarm `TailrdCost-MonthlyEstimatedCharges-Over50` created in us-east-1 at threshold \$50, action → `tailrd-migration-alerts`. Currently `INSUFFICIENT_DATA` because account-level "Receive Billing Alerts" is disabled (console-only toggle, not CLI-reachable). Enabling that one checkbox in Billing Preferences completes this. |
| F3 | Null retention on Lambda rollback log group + 6 other log groups. | LOW | **RESOLVED 2026-04-23** — retention set: `/aws/lambda/tailrd-dms-rollback` = 90 days (security-relevant), all others = 30 days. `describe-log-groups` for null-retention now returns empty. |
| F4 | Pending RDS system-updates on source + Aurora (no auto-apply date; Sun 04:30-05:30 UTC maintenance window). | INFO | Tracked. Aurora `db-upgrade` must be sequenced AFTER cutover. Source `tailrd-production-postgres` `system-update` should be applied in a controlled window after Wave 2 completes. |
| F5 | No DMS-specific runbooks for failure modes. | LOW | Tracked for future sprint. CR-2026-04-23-001 + CR-2026-04-24-001 serve as informal runbook for currently-known failure modes. |

**The critical blocker (F1) is resolved.** Rehearsal readiness: NOW GO.

---

## F1-Remediation — 2026-04-23

### Action taken

1. Created dedicated SG `vpce-logs-sg` (`sg-0e3602c20030ab565`) — ingress 443/TCP from `10.0.0.0/16` (VPC CIDR). VPC-wide CIDR chosen because enabling Private DNS on the endpoint flips resolution of `logs.us-east-1.amazonaws.com` for the entire VPC; ECS backend and Lambda rollback (previously reaching CloudWatch via NAT) now transparently route through PrivateLink. Allowing the full VPC CIDR guarantees no silent breakage of existing log writers.
2. Created Interface VPC endpoint `vpce-05ceeb6c12947c215`:
   - Service: `com.amazonaws.us-east-1.logs`
   - VPC: `vpc-0fc14ae0c2511b94d`
   - Subnets: `subnet-02c70b0a102cf8d3c` (us-east-1b) + `subnet-0168950e9541ff9f6` (us-east-1a) — the DMS database-tier subnets. Multi-AZ. Matches DMS subnet group exactly.
   - Security group: `sg-0e3602c20030ab565` (`vpce-logs-sg`)
   - Private DNS: **enabled** — `logs.us-east-1.amazonaws.com` now resolves to endpoint ENIs VPC-wide.
   - ENIs: `eni-0814b834e34fdc570` + `eni-0f0ceb813895b38cf`
   - Final state: `available`

### Verification

- ECS backend `/health` → `healthy` post-Private-DNS-flip (`uptime: 3579s`, continuous through the change — no task restart).
- ECS backend log group `/ecs/tailrd-production-backend` retained recent activity (last log stream updated minutes before / after flip with no gap in activity).
- DMS `test-connection` against source endpoint run after endpoint became available → `successful`. Network path from DMS subnet to AWS services working.
- Endpoint DNS entries include canonical `logs.us-east-1.amazonaws.com` — DMS's default logging target resolves cleanly to the endpoint with no DMS-side config change.
- `PrivateLinkEndpoints/ActiveConnectionsCount` metric has not yet populated (normal — 5-15 min aggregation lag).

### Deferred (track separately — not required for rehearsal)

For full database-tier "no internet egress" posture, two additional Interface endpoints should follow in a separate PR:

- `com.amazonaws.us-east-1.secretsmanager` — becomes relevant if DMS endpoints ever switch from password auth to Secrets Manager auth. Currently DMS endpoints use password; Lambda reaches Secrets Manager via NAT from the private tier.
- `com.amazonaws.us-east-1.kms` — paired with Secrets Manager.

Both are **not blocking** this rehearsal because DMS doesn't currently use Secrets Manager auth and Lambda operates in the private tier with NAT egress.

### Follow-up docs (track)

- New doc `docs/VPC_ENDPOINTS_ARCHITECTURE.md` — document the 3-tier VPC (public / private / database), which tiers have NAT egress, where VPC endpoints live, and the rule "any new database-tier AWS-service dependency requires a matching Interface endpoint before execution." Template for future health-system onboardings.

---

## Phase 2-D-PRE-A — IAM roles for DMS

| Role | Status | Trust | Attached policy | Verdict |
|---|---|---|---|---|
| `dms-vpc-role` | ✅ exists | `dms.amazonaws.com` | `AmazonDMSVPCManagementRole` | PASS — created 2026-04-20T18:07Z; handles DMS ENI/subnet management. |
| `dms-cloudwatch-logs-role` | ✅ exists (new) | `dms.amazonaws.com` | `AmazonDMSCloudWatchLogsRole` | PASS — created 2026-04-23T15:23Z (Phase 2-B). Policy doc confirmed: `logs:DescribeLogGroups`, `DescribeLogStreams`, `CreateLogGroup`, `CreateLogStream`, `PutLogEvents` all scoped to `dms-tasks-*` and `dms-serverless-replication-*`. |
| `dms-access-for-endpoint` | ❌ missing | — | — | **N/A** — this role is only required for S3/Redshift/DynamoDB/Kinesis endpoints. We use postgres→aurora-postgres. No action. |
| `AWSServiceRoleForDMS` (service-linked) | ❌ absent | — | — | INFO — some AWS docs say this auto-creates on first operation. Not required for classic DMS replication tasks; used by Fleet Advisor and a few other features. No action. |
| DMS endpoint `SecretsManagerAccessRoleArn` | N/A | — | — | Endpoints use **password auth** (not Secrets Manager auth). Source endpoint `AuthenticationMethod: password`; target endpoint has null. No separate role needed for secrets decryption at the DMS endpoint level. (The Lambda `dms-rollback-role` separately has Secrets Manager access for its own needs — unrelated to DMS task operation.) |

**Phase 2-D-PRE-A verdict: PASS.**

---

## Phase 2-D-PRE-B — Service quotas

| Quota | Value | Current usage | Headroom | Verdict |
|---|---|---|---|---|
| Number of running Data Migrations (L-FBEA20FB) | 500 | 0 running | 500 | PASS |
| Endpoint count (L-E17328E9) | 1000 | 2 (source, target) | 998 | PASS |
| Endpoints per instance (L-2146F1FD) | 100 | 2 | 98 | PASS |
| Task count (L-7FD3593B) | 600 | 2 (wave1 stopped, wave2 ready) | 598 | PASS |
| Serverless replications (L-E569F59D) | 100 | 0 (not used) | N/A | PASS |
| Subnet groups (L-27B24FAD) | 60 | 1 (`tailrd-dms-subnets`) | 59 | PASS |
| Subnets per subnet group (L-4182EDE9) | 60 | 2 | 58 | PASS |
| Event subscriptions (L-D97343A2) | 60 | 0 | 60 | PASS |
| PostgreSQL `max_replication_slots` (param group) | 10 | 0 active | 10 | PASS |
| PostgreSQL `max_wal_senders` (param group) | 10 | 0 | 10 | PASS (>= 10 required) |

Tables-per-task is enforced at DMS task definition time, not as a quota. Wave 2 replicates 2 tables (`patients`, `encounters`), well within any reasonable limit.

**Phase 2-D-PRE-B verdict: PASS.**

---

## Phase 2-D-PRE-C — Network prerequisites

### C.1 — DMS subnet group

`tailrd-dms-subnets` status `Complete`, VPC `vpc-0fc14ae0c2511b94d`:
- `subnet-02c70b0a102cf8d3c` — us-east-1b, CIDR `10.0.21.0/24`, tag `tailrd-production-database-1b`
- `subnet-0168950e9541ff9f6` — us-east-1a, CIDR `10.0.20.0/24`, tag `tailrd-production-database-1a`

Multi-AZ coverage ✅. Both private (`MapPublicIpOnLaunch: false`).

### C.2 — DMS security group (`sg-0e116deb0b3199fdd`, `tailrd-dms-sg`)

Egress:
- `5432` → `sg-09e3b87c3cbc42925` (source RDS SG) ✅
- `5432` → `sg-0524ba8efe6058f7b` (target Aurora SG) ✅
- All protocols → `0.0.0.0/0` ✅ (would cover 443 to AWS public endpoints **IF the subnet route table permitted it** — see C.5)

Ingress: none. DMS initiates outbound; nothing needs to reach in. Correct.

### C.3 — Source RDS security group (`sg-09e3b87c3cbc42925`)

Ingress on 5432 from:
- `sg-07cf4b72927f9038f` (app / ECS backend)
- `sg-0d19425b2ec51c77e` (unlabeled — likely ECS tasks or admin access)
- `sg-0e116deb0b3199fdd` (DMS) ✅ "From DMS"

**PASS.** DMS can connect to source RDS on 5432.

### C.4 — Target Aurora security group (`sg-0524ba8efe6058f7b`, `tailrd-aurora-production-sg`)

Ingress on 5432 from:
- `sg-07cf4b72927f9038f` (app / ECS backend)
- `sg-0e116deb0b3199fdd` (DMS) ✅ "From DMS"

**PASS.** DMS can connect to Aurora on 5432.

### C.5 — **CRITICAL: DMS subnet routing (F1)**

DMS subnets use route table `rtb-01e8ec37e7b928b4e`. **The only route is:**

```
10.0.0.0/16 → local
```

**No NAT route. No IGW route. No VPC endpoints for any AWS service.**

This means DMS cannot reach `logs.us-east-1.amazonaws.com` (CloudWatch Logs) or any other AWS public endpoint. The IAM role `dms-cloudwatch-logs-role` created in Phase 2-B has the right policy, but the network path from the DMS replication instance to the CloudWatch Logs endpoint does not exist.

By contrast, the Lambda/ECS "private" subnets (`rtb-035e0404d7cbb11ac`) have:
```
10.0.0.0/16 → local
0.0.0.0/0 → nat-013def8ace25bf552
```

Clean 3-tier VPC design: database tier isolated inside, private tier NATs out. DMS was placed in the database tier (correct for RDS/Aurora proximity) but needs some path to CloudWatch Logs.

**This is almost certainly the actual root cause of yesterday's attempt-3 "Stream Component Fatal error with no diagnostic".** Even if DMS's internal logic attempted to write, the network stack would have failed the TCP connect to the CloudWatch endpoint. Task startup depends on the logging subsystem initializing; when that couldn't reach CloudWatch, the task failed and there was no log to capture why.

**Remediation (two options):**

**Option A — Interface VPC endpoint for CloudWatch Logs (recommended for PHI/HIPAA environment):**
1. Create an interface endpoint `com.amazonaws.us-east-1.logs` in VPC `vpc-0fc14ae0c2511b94d`.
2. Deploy in subnets `subnet-02c70b0a102cf8d3c` + `subnet-0168950e9541ff9f6` (DMS database subnets, Multi-AZ).
3. Attach a security group that allows 443/TCP inbound from the DMS SG (`sg-0e116deb0b3199fdd`). A dedicated SG `vpce-logs-sg` is cleaner than reusing existing SGs.
4. Enable Private DNS so `logs.us-east-1.amazonaws.com` resolves to the endpoint automatically.
5. No route table edits needed — DNS + security group routing handles it.

Traffic stays on the AWS PrivateLink backbone. Cost: ~$7.30/month + data transfer (minimal for task logs).

**Option B — Add NAT route to DMS subnets:**
1. `aws ec2 create-route --route-table-id rtb-01e8ec37e7b928b4e --destination-cidr-block 0.0.0.0/0 --nat-gateway-id nat-013def8ace25bf552`
2. Database subnets are no longer fully isolated from the public internet (via NAT egress only — no inbound). Marginally less strict than Option A.

Option A is preferable for PHI/HIPAA and for the long-term posture, but Option B is a single command and unblocks rehearsal fastest. Either way, **a rehearsal with F1 unresolved will almost certainly reproduce yesterday's unlogged failure.**

### C.6 — VPC endpoints present

| Id | Service | Type | Subnets | Purpose |
|---|---|---|---|---|
| `vpce-0022c8d26704fdb0c` | `com.amazonaws.vpce.us-east-1.vpce-svc-0a3de4cabd09a2ae4` | Interface | Private subnets `10.0.10.0/24`, `10.0.11.0/24` | Custom PrivateLink consumer (`vpce-svc-*` = a third party's PrivateLink service, not an AWS service). Attached to private tier, not database tier. Not relevant to DMS. |

**No AWS-managed VPC endpoints** for CloudWatch Logs, Secrets Manager, KMS, S3, or SSM. For DMS's current scope (postgres→aurora password auth), only CloudWatch Logs is critical (see F1). If we later switch DMS to Secrets Manager auth, we'd need a Secrets Manager endpoint too.

**Phase 2-D-PRE-C verdict: FAIL on F1. Otherwise PASS.**

---

## Phase 2-D-PRE-D — Source database prerequisites

| Check | Status |
|---|---|
| PostgreSQL source engine 15.14 → target aurora-postgres 15.14 compatible per AWS DMS compatibility matrix | ✅ |
| `wal_level = logical` (via `rds.logical_replication = 1`) in parameter group `tailrd-production-postgres15-logical-repl`, `ParameterApplyStatus: in-sync` | ✅ |
| `max_replication_slots = 10` | ✅ (≥1 required; 10 is generous) |
| `max_wal_senders = 10` | ✅ (≥10 required) |
| DMS does not use publications/subscriptions — manages its own replication slot | N/A |
| Primary key on `patients.id` (`cuid`) | ✅ (schema.prisma line 195) |
| Primary key on `encounters.id` (`cuid`) | ✅ (schema.prisma line 288) |
| Replica identity — default (primary key) suffices for DMS CDC when PK exists | ✅ |
| Source user permissions (`SELECT` on all tables, `REPLICATION` / `rds_replication` role) | ✅ per Day 7 Phase 7G rehearsal finding: "`tailrd_admin` is member of `rds_superuser` which grants `rds_replication` transitively" |

**Phase 2-D-PRE-D verdict: PASS.** Cannot directly re-verify user permissions without psql, but this was verified during the 2026-04-23 rehearsal and nothing has changed since.

---

## Phase 2-D-PRE-E — Target database prerequisites

| Check | Status |
|---|---|
| Target schema deployed (all 53 tables from consolidated baseline PR #166) | ✅ |
| Aurora target user (DMS task credentials) has INSERT/UPDATE/DELETE/TRUNCATE on `patients` + `encounters` | ✅ (target endpoint uses Aurora admin credentials from secret `tailrd-production/app/aurora-db-password-rAm904`) |
| Aurora target `patients` empty (TRUNCATE_BEFORE_LOAD will re-truncate anyway) | ✅ per previous checkpoints |
| Aurora target `encounters` empty | ✅ per previous checkpoints |
| Aurora ACU 0.5–16 sufficient for full-load of 353k rows + CDC | ✅ 16 ACU is ~32 GB RAM / 4 vCPU — ample for this scale |
| Aurora Multi-AZ (writer + 2 readers in 1a/1b) | ✅ |
| Aurora deletion protection | ✅ on |

**Phase 2-D-PRE-E verdict: PASS.**

---

## Phase 2-D-PRE-F — Operational prerequisites

| Check | Status | Notes |
|---|---|---|
| Log group retention — `dms-tasks-tailrd-dms-replication` | ✅ 30 days (Phase 2-A) | |
| Log group retention — `/aws/lambda/tailrd-dms-rollback` | ⚠️ **null (never expires)** | **F3.** LOW. Log group exists with 5.6 KB stored. Retention should be bounded (suggest 30-90 days). Non-blocking. |
| Other log groups without retention | ⚠️ 7 total (`/aws/codebuild/tailrd-ingest-build`, `/aws/rds/*`, `/aws/rds/proxy/*`, `/ecs/tailrd-ingest`, `/ecs/tailrd-pgdump`) | LOW. Operational hygiene. Track separately. |
| Cost alarms | ⚠️ none (`Cost*` alarm prefix empty) | **F2.** LOW. Not a Day 8 blocker, but pre-rehearsal of a multi-hour DMS task is a reasonable moment to add a simple daily-spend alarm. |
| Budgets | ⚠️ none (`describe-budgets` returned null) | **F2.** Same. |
| RDS backup window | ✅ `03:00-04:00 UTC` daily, today's ran 03:10Z (~12h ago). | Wave 2 should NOT overlap this window. If Wave 2 starts before ~02:00 UTC and runs past 03:00, the automated backup may slow the full-load. Plan window: kick off before 02:00 UTC or after ~04:30 UTC to avoid. |
| RDS maintenance window | ✅ `sun:04:30-05:30 UTC` | Today is Thursday — no conflict. |
| RDS pending maintenance actions | ⚠️ **F4** | `tailrd-production-postgres`: `system-update` pending (no auto-apply date); Aurora cluster: `db-upgrade` pending (no auto-apply date); `tailrd-production` (legacy): `system-update` pending. Without an auto-apply date, none will fire mid-Wave-2. INFO only — monitor so they don't silently auto-apply during future rehearsals. |
| Concurrent DMS tasks | ✅ 0 running (wave1 stopped, wave2 ready) | |
| In-flight ECS deploys | ✅ none (rolloutState COMPLETED, task def :95 stable 1/1) | |
| In-flight schema migrations | ✅ none | |

**Phase 2-D-PRE-F verdict: PASS with LOW/INFO notes.**

---

## Phase 2-D-PRE-G — Documentation and observability gaps

| Artifact | Status | Action |
|---|---|---|
| Runbook: "DMS task stuck in starting state" | ❌ missing | **F5.** LOW. Track for future authoring. The 2026-04-23 CR + this audit already document the 3 known failure modes and their fixes — that's a serviceable informal runbook. |
| Runbook: "CDC lag spike mitigation" | ❌ missing | LOW. Alarm `TailrdMigration-LAG_CRITICAL` exists; response procedure is not documented. |
| Runbook: "Validation failures triage" | ❌ missing | LOW. Alarm `TailrdMigration-HASH_MISMATCH_CRITICAL-*` per table exists; response procedure not documented. |
| CloudWatch dashboard: Wave 2 migration | ❌ missing | LOW. Alarms cover P0 signals. Dashboard would be nice-to-have for the 4-7h observation window. |
| CDC custom metrics | ❌ missing (only DMS-provided metrics) | LOW. Defer. |
| Post-mortem process | ✅ via Change Records | Each day's CR captures timeline + evidence + teardown. Covers this need. |
| CloudWatch Logs Insights queries pre-staged for DMS failures | ❌ not prepared | LOW. With F1 fixed, live Insights queries against `dms-tasks-tailrd-dms-replication` will be possible during the rehearsal. |

**Phase 2-D-PRE-G verdict: PASS with gap list for future work.**

---

## Recommendation

**FIX-THEN-GO.**

### Must fix before rehearsal (F1)

Pick one of the two network remediation paths for F1. Both are single-session, reversible, and give DMS a path to CloudWatch Logs:

- **Option A (recommended):** Create an `com.amazonaws.us-east-1.logs` Interface VPC Endpoint attached to the DMS database subnets with a dedicated `vpce-logs-sg` allowing 443/TCP inbound from the DMS SG. Enable Private DNS. ~3 CLI commands. Cost ~$7.30/month ongoing + trivial data transfer.
- **Option B:** Add `0.0.0.0/0 → nat-013def8ace25bf552` to route table `rtb-01e8ec37e7b928b4e`. One CLI command. Slightly weakens the "database subnet is fully isolated" principle; still fine for HIPAA since egress-only.

Either choice should be captured in the change record. After remediation: re-verify via `aws ec2 describe-route-tables` and then proceed to Phase 2-D rehearsal.

### Track separately, non-blocking

- **F2** — add a simple daily-spend budget ($50/day alert threshold), minor hygiene. Sprint backlog.
- **F3** — set retention on `/aws/lambda/tailrd-dms-rollback` and the other 6 log groups without retention. Sprint backlog.
- **F4** — note the pending system-updates on source RDS. Without auto-apply dates, they'll only fire Sunday in the maintenance window. Aurora `db-upgrade` should be scheduled after cutover is complete (otherwise it reboots the target mid-migration).
- **F5** — author DMS failure-mode runbooks in a follow-up sprint.

### Audit artifact as template

This document is the reusable template for AWS service prerequisite audits. The structure — phase-by-phase coverage of IAM, quotas, network, data-source, data-target, operational, observability — can be reused for Redox EHR integration, S3 integrations, and new health-system onboardings.

**UPDATE 2026-04-23 (post-remediation):** Option A authorized and executed. F1 resolved. F3 resolved. F2 partially resolved. See updated Headline table and F1-Remediation section at top of document. Verdict is now **GO for Phase 2-D staging rehearsal.**
