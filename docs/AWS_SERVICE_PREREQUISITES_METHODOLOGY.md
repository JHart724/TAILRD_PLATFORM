# AWS service prerequisites — methodology

**Purpose:** Every new AWS service integration (DMS, new Redox hook, future Aurora feature, Bedrock, S3 replication, etc.) runs through a prerequisites audit BEFORE execution. Prevents the class of problem that caused Day 8 attempt 1 to fail with "Stream Component Fatal error — no diagnostic trace" for hours.

The pattern was established by the DMS Wave 2 work documented in `docs/DMS_PREREQUISITES_AUDIT_2026_04_24.md`. This doc extracts the reusable frame.

---

## Why this matters

The Day 8 DMS rehearsal on 2026-04-23 failed three consecutive start attempts with no logs. Root causes surfaced only during the post-incident audit the next day:

1. `dms-cloudwatch-logs-role` IAM role didn't exist — DMS silently dropped all task-level logs.
2. `dms-tasks-tailrd-dms-replication` log group didn't exist — even if the role existed, DMS would have needed `logs:CreateLogGroup` to create it on first use.
3. DMS database subnets had no route to `logs.us-east-1.amazonaws.com` — no NAT, no IGW, no VPC endpoint. Even with IAM + log group in place, DMS could not TCP-connect to CloudWatch.
4. `FullLoadSettings.TargetTablePrepMode = TRUNCATE_BEFORE_LOAD` on the DMS task was incompatible with target schema FK graph (would have failed in production identically).

Any Phase 0 audit covering IAM + network + target-schema compatibility would have caught all four **before** touching production resources. This doc codifies that Phase 0.

---

## The seven phases

Every new AWS service integration runs through all seven before execution. The DMS audit doc is the canonical worked example.

### Phase 0-A — IAM roles required by the service

For each role the service expects (by convention or by explicit config):
- Does the role exist?
- Is the trust policy correct (service principal allowed to `sts:AssumeRole`)?
- Are required managed + inline policies attached?
- Does the role's permission boundary allow the intended actions?

**DMS example findings:** `dms-vpc-role` present but `dms-cloudwatch-logs-role` missing. Service-linked roles often don't auto-create for every scenario — verify.

**General rule:** AWS "convention-named" roles are not automatically created. If the service's docs say "DMS uses a role named `X`", the role must be explicitly created.

### Phase 0-B — Service quotas

For every dimension the workload will touch:
- Current quota value
- Current account usage
- Expected peak usage during this integration
- Time to raise the quota if needed (some AWS quotas require support tickets with multi-day lead time)

**DMS example:** verified all 10 quotas (tasks, endpoints, endpoints-per-instance, subnets-per-group, etc.) with wide headroom before execution.

### Phase 0-C — Network prerequisites

This is where most "silent failures" originate.

- **Subnet group / subnet assignments** — right AZs, right VPC, right tier.
- **Security groups** — ingress + egress for every port the service uses. Don't just check "can talk to DB" — check "can also talk to AWS services" if the service writes logs / fetches secrets / publishes metrics.
- **Route tables** — this is the step we missed on DMS. Subnets in the "database tier" of a classic 3-tier VPC often have NO default route. The service in those subnets may talk to RDS fine but cannot reach `logs.<region>.amazonaws.com` / `secretsmanager.<region>.amazonaws.com` / `s3.<region>.amazonaws.com`.
- **VPC endpoints** — for every AWS service the workload reaches from database tier, either a NAT route or a VPC endpoint is required. Prefer Interface endpoints for PHI/HIPAA-bounded accounts (keeps traffic on PrivateLink backbone).
- **DNS resolution** — if using Private DNS on interface endpoints, verify resolution from the service's subnet. If using NAT, verify the NAT gateway is healthy and in a routable path.
- **NACLs** — usually default-allow, but check.

**DMS example finding:** database subnets had only `10.0.0.0/16 → local`. Lambda private subnets had a NAT route. Adding a CloudWatch Logs Interface endpoint (Private DNS enabled, SG allowing VPC CIDR on 443) fixed it for all log writers in the VPC simultaneously.

### Phase 0-D — Source data prerequisites

For anything that reads from a database or data source:
- Engine version compatibility matrix (source vs target, service vs engine).
- Required parameter group settings (`wal_level`, `max_replication_slots`, etc. for logical replication).
- Required permissions on the user the service connects as.
- Required table-level properties (primary keys / replica identity for CDC).
- Required data-hygiene state (no ongoing DDL, no pending WAL backlog, etc.).

**DMS example:** verified `wal_level=logical`, `max_replication_slots≥10`, `tailrd_admin` member of `rds_superuser` (transitively grants `rds_replication`), Patient + Encounter primary keys via `schema.prisma`.

### Phase 0-E — Target data prerequisites

- Schema deployed on target?
- Target user permissions (INSERT/UPDATE/DELETE on target tables)?
- Target-side constraints that could conflict with the service's write pattern (FK graph, check constraints, unique indexes)?
- Target table state (empty / populated / partially populated)?
- Target resource headroom (ACU / IOPS / storage)?

**DMS example:** the audit doc caught schema deployment + ACU sizing but **did not catch the FK-graph-vs-TRUNCATE issue**. Day 8 rehearsal caught it. Future iterations of this audit should include a "simulate the service's write pattern against the target schema" check — e.g., for DMS: "does the target's FK graph allow TRUNCATE on every replicated table?" → if any table is referenced by an FK, TRUNCATE_BEFORE_LOAD will fail; use DO_NOTHING with pre-emptied targets or drop FKs during migration.

### Phase 0-F — Operational prerequisites

- Log group retention policies set for any new log group this service will create.
- Cost alarms armed (the first time DMS runs a 353 k-row full-load, the cost delta is trivial — but a sustained CDC misconfiguration can generate large CloudWatch/data-transfer costs that no alarm catches).
- Maintenance window collisions (don't start a long-running migration 90 minutes before the RDS nightly backup window).
- Concurrent-operation check (no in-flight deploys, no in-flight migrations on the same resources).

### Phase 0-G — Documentation and observability gaps

- Runbooks for common failure modes of this service.
- CloudWatch dashboard for the relevant metrics.
- CloudWatch Insights queries pre-staged for likely failure modes.
- Change record template + rollback plan ready.

This phase rarely blocks — it catches "you can run it today but you'll regret not having the runbook when the pager goes off."

---

## Rule: audit first, execute second

For any new AWS service integration:

1. Write `docs/<SERVICE>_PREREQUISITES_AUDIT_<DATE>.md` covering all seven phases.
2. Verdict: **GO** (all phases clean), **FIX-THEN-GO** (list specific gaps to close), **BLOCK** (critical gap).
3. Do not execute until verdict is GO.
4. Audit doc becomes a permanent part of the change record for that integration.
5. Future audits for the same service can reference the prior audit and verify nothing has drifted.

## Rule: rehearsal catches what audit misses

Even a clean Phase 0 audit cannot anticipate every runtime behavior. The rehearsal + teardown pattern (restore from fresh snapshot → stand up parallel infrastructure → run the real execution against parallel resources → tear down) is the second line of defense. Phase 2-D of the DMS work caught the TRUNCATE-vs-FK issue that the audit could not have predicted.

## Rule: first failure is an education opportunity, not a disaster

The Day 8 first-attempt failure produced no logs. That was the disaster — the missing observability meant the team spent time debugging without data. The configuration failure itself was recoverable; the lack of diagnostics was not. Prioritize observability prerequisites (Phases 0-A, 0-B, 0-C log/metric paths) over functional prerequisites (Phases 0-D, 0-E data-model fit). The first type, if missing, blinds you. The second type, if missing, fails loudly once observability works.
