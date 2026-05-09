# AUDIT-078 — Production Aurora Backup IaC + Restore-Test Design Refinement Note

**Authored:** 2026-05-08 during AUDIT-078 PAUSE 2 design-refinement phase. Sister to `AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md` 14-section template.

**Status:** PAUSE 2 deliverable — D1-D7 enumerated with pre-recommendations + rejected alternatives; awaiting operator decisions before Phase C implementation.

**Cross-references:**
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` AUDIT-078 (this finding) + AUDIT-082 (terraform/ deferral filing per D6) + AUDIT-016 PR 3 sister-pattern + AUDIT-022 PR #253 sister-pattern + AUDIT-014 / AUDIT-081 (deferral filing precedent)
- `docs/runbooks/AUDIT_022_PRODUCTION_RUNBOOK.md` (8-section operator runbook structure baseline)
- `docs/runbooks/AUDIT_016_PR_3_MIGRATION_RUNBOOK.md` (tooling-ships-repo / execute-operator-side baseline)
- `infrastructure/cloudformation/tailrd-staging.yml` (staging Aurora codification baseline)
- `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` (snapshot evidence)
- `docs/CHANGE_RECORD_2026_04_29_day11_rds_decommission.md` (untested restore procedure)
- HIPAA §164.308(a)(7) Contingency Plan + §164.308(a)(7)(ii)(B) Disaster Recovery Plan testing + §164.308(a)(7)(ii)(D) Procedures for periodic testing and revision of contingency plans
- `BUILD_STATE.md` §6 production-readiness gate top-3 (AUDIT-078 advanced to #1 post-AUDIT-075 merge)

---

## 1. Purpose + scope

AUDIT-078 closure ships three load-bearing deliverables (α scope):

1. **Production Aurora backup config applied via aws-cli** — operator-side `aws rds modify-db-cluster` apply of HIPAA-strong overrides (BackupRetentionPeriod=35, DeletionProtection=true) directly on live `tailrd-production-aurora` cluster; runbook documents pre-apply state + apply commands + post-apply verification. CFN stack-import deferred to AUDIT-XXX-future-aurora-cfn-import per §13.
2. **End-to-end restore-test executed + RTO/RPO documented** — sandbox-restore methodology per register §6 step 5; pass-criteria verification (schema + sample-row + PHI-decrypt); RTO <30 min target.
3. **HIPAA §164.308(a)(7) Contingency Plan posture upgraded** — automated testing cadence locked + audit-trail entries for restore-test execution; sister to AUDIT-013 audit-log durability discipline.

**Reframe α locked at PAUSE 2.5 fresh-attention 2026-05-08 (document-and-defer-IaC):** AUDIT-078 closes the load-bearing HIPAA §164.308(a)(7) gap (restore procedure tested + backup retention enforced) without taking on CFN stack-import rollback risk on live BSW-pilot Aurora cluster. CFN stack-import deferred to AUDIT-XXX-future-aurora-cfn-import per §17.3 scope discipline. Sister to AUDIT-081 D4 option-C deferral pattern (User.email blind-index deferred from AUDIT-075 to preserve login-flow integrity; AUDIT-078 defers CFN-import to preserve cluster-availability integrity). The IaC-coverage gap remains real but is scoped as operational hygiene, not production-readiness blocker. terraform/ stale-state separately deferred to AUDIT-082 per PAUSE 1 §17.3 catch.

**Out of scope (deferred):**
- **CFN stack-import of `tailrd-production-aurora`** — deferred to AUDIT-XXX-future-aurora-cfn-import per α reframe 2026-05-08; design context preserved at §6 + §6.5 as forward-reference for future work block (sister to AUDIT-075 PAUSE 2.5 DOB-removal documented-rejection pattern)
- terraform/ tree disposition (delete / migrate / mark legacy) — AUDIT-082 entry filed
- Long-term IaC framework decision (CFN vs Terraform as production framework) — gated on operator capacity; scoped into AUDIT-082 work block
- Multi-region cross-region replication / Aurora Global — gated on multi-region adoption; AUDIT-XXX-future entry per §13
- AWS Backup adoption — gated on multi-DB-tier expansion; D5 keeps RDS-native; AUDIT-XXX-future revisit per §13

---

## 2. PAUSE 1 inventory reconciliation

Sister to AUDIT-075 §1 PAUSE 1 inventory reconciliation discipline. Pre-flight inventory caught a register Phase A framing miss; codified as 13th §17.1 architectural-precedent (see §14).

### 2.1 Inventory items 1.0-1.7 results table

| # | Item | Result |
|---|------|--------|
| 1.0 | Operator-side-vs-repo-side scope split | Mapped per §3 below; sister to AUDIT-016 PR 3 + AUDIT-022 |
| 1.1 | IaC repo presence | **§17.1 catch surfacing — TWO frameworks present (CFN + Terraform)** |
| 1.2 | Current Aurora backup state | Operator-supplied facts required (D4 input); cluster ID + region known from CLAUDE.md §9 |
| 1.3 | Restore-test methodology candidates | 4 options (a/b/c/d) — D1 |
| 1.4 | Restore-test cadence | 4 options (a/b/c/d) — D2 |
| 1.5 | Restore-test pass criteria | 4 options (a/b/c/d, multi-select) — D3 |
| 1.6 | Sister-discipline cross-references | AUDIT-016 PR 3 + AUDIT-022 best-fit |
| 1.7 | Operator-side resources | AWS account access + billing impact + HIPAA BAA verification + framework reframe engineering time |

### 2.2 terraform/ stale-state finding (§17.1 catalyst)

Discovered at PAUSE 1 inventory item 1.1:
- `terraform/` directory contains 13 `.tf` files + `terraform.tfvars`, last edited April 5-9 2026
- `terraform/main.tf` configures S3 backend at `tailrd-terraform-state-863518424332`
- `terraform/rds.tf` codifies `aws_db_instance` (single Postgres RDS, NOT `aws_rds_cluster` for Aurora)
- Identifier resolves to `tailrd-production-postgres` — the predecessor RDS decommissioned 2026-04-30 per Day 11 runbook
- Zero Aurora references anywhere in terraform/ (`grep -rln "aurora\|Aurora\|aws_rds_cluster" terraform/` → empty)
- terraform/ files predate Aurora cutover (2026-04-29) AND predecessor RDS decommission (2026-04-30) by ~3 weeks
- terraform.tfvars declares `environment = "production"` — terraform/ targets production, but the production database resource it codifies no longer exists

**Drift state:** terraform/ codifies decommissioned predecessor; either (i) terraform was never applied, (ii) was applied to predecessor only and tfstate now has stale resource references, or (iii) was applied to a different account/region. Operator-side investigation required (AUDIT-082 scope).

**Why this matters for AUDIT-078 framing:** the AUDIT-078 register entry's `Location` section enumerates only `infrastructure/cloudformation/`. Phase A inventory missed terraform/. Without PAUSE 1 inventory catch, Phase C implementation could have authored CFN production template AND been blind to a parallel-framework drift that operator must reconcile. This is a 13th §17.1 architectural-precedent class catch — IaC-FRAMEWORK axis (see §14).

---

## 3. Operator-side-vs-repo-side scope split

Sister-pattern: combined AUDIT-016 PR 3 + AUDIT-022 PR #253 (tooling ships repo-side; production execute operator-side per runbook).

### 3.1 Repo-side deliverables (PR-mergeable in this work block)

| Deliverable | File | Purpose |
|-------------|------|---------|
| CFN production template | `infrastructure/cloudformation/tailrd-production.yml` NEW | Mirror of `tailrd-staging.yml` Aurora pattern + production-tuned overrides (see §6) |
| Operator runbook | `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` NEW | 8-section structure sister to AUDIT-022 (see §7) |
| CLI scaffolding (optional per D-decision) | `infrastructure/scripts/audit-078/*.sh` NEW | Pre-flight + restore-test + verification helpers (see §8) |
| Ledger updates | `BUILD_STATE.md` + `docs/audit/AUDIT_FINDINGS_REGISTER.md` | AUDIT-078 status flip + AUDIT-082 filing + 13th §17.1 codification (in this PR's design note §14) |
| Design refinement note | `docs/architecture/AUDIT_078_AURORA_BACKUP_RESTORE_NOTES.md` (this file) | D-decisions + sister-pattern mapping + §17.1 catalog + engineering tightening tracking |

### 3.2 Operator-side execution (post-PR-merge AWS console + CLI)

| Step | Action | Verification |
|------|--------|--------------|
| 1 | CFN stack-import flow (existing production cluster → CFN-managed via `aws cloudformation create-change-set --change-set-type IMPORT`) | `aws cloudformation describe-stack-resources` shows cluster as IMPORT_COMPLETE |
| 2 | Apply backup retention + deletion-protection via CFN drift-correct (`aws cloudformation execute-change-set` after parameter override) | `aws rds describe-db-clusters` shows BackupRetentionPeriod=35 + DeletionProtection=true |
| 3 | Execute restore-test per runbook §4 | RTO timer captures wall-clock from snapshot-restore command to cluster Available status |
| 4 | RTO measurement + pass-criteria verification (D3 (a) schema + (b) sample-row + (d) PHI-decrypt) | Pass-criteria checks ✅; RTO <30 min target met |
| 5 | Test cluster destroy (`aws rds delete-db-cluster --skip-final-snapshot --db-cluster-identifier tailrd-production-aurora-restore-test`) | Cluster gone; no residual cost |
| 6 | Sign-off ledger update PR — flips AUDIT-078 status IN PROGRESS → RESOLVED per AUDIT-011 sister-discipline merge-time-flip pattern | Sister-PR closes AUDIT-078 work block |

---

## 4. D1-D7 decisions enumeration

Each D-decision has alternatives + rejection reasons surfaced inline (sister to AUDIT-075 D1-D6 discipline).

### D1 — Restore-test methodology

| Option | Description | Cost | RPO/RTO measurement |
|--------|-------------|------|---------------------|
| (a) | Synthetic restore — RDS clone-restore to ephemeral test instance; verify schema + sample row read | Low | RTO captured |
| (b) | Production-clone-test — snapshot-restore to staging environment; full integration test on restored data | Medium | RTO + integration-correctness captured |
| **(c)** | **Sandbox-restore — ephemeral isolated instance for restore-only verification** | **Low** | **RTO captured; matches register §6 step 5** |
| (d) | Docs-only — restore procedure documented; manual quarterly execution per HIPAA §164.308(a)(7)(ii)(D) | Lowest | No RTO measurement |

**Pre-recommendation: (c).**
**Rationale:** register § 6 step 5 alignment; capacity-calibration discipline; RTO-measurable; lowest cost while meeting HIPAA minimum.
**Rejected:** (a) similar cost but less HIPAA-fit framing; (b) heaviest test infra burden + staging-clone-clobber risk (could break staging on test failure); (d) no RTO measurement = weakest robust posture (RTO claim becomes theoretical not empirical).

### D2 — Restore-test cadence

| Option | Frequency | Cost | HIPAA fit |
|--------|-----------|------|-----------|
| (a) | Per-PR (CI gate) | Highest | Excessive for backup posture |
| (b) | Weekly automated | High | Strong |
| **(c)** | **Quarterly automated** | **Low** | **Meets §164.308(a)(7)(ii)(D) minimum** |
| (d) | On-demand operator-triggered | Variable | Manual discipline |

**Pre-recommendation: (c).**
**Rationale:** HIPAA §164.308(a)(7)(ii)(D) explicitly specifies periodic testing; quarterly is industry-standard cadence; weekly excessive given Aurora's automated backup retention; operator-side discipline already strong (sister to AUDIT-016 PR 3 production-execute timing operator-side per runbook).
**Rejected:** (a) excessive cost vs marginal benefit (CI gate on backup-restore is theatrical not load-bearing); (b) doubles ops cost vs (c) for marginal incremental coverage; (d) loses automation property (automated cadence is a HIPAA discipline aid, not just convenience).

### D3 — Restore-test pass criteria (multi-select)

| Option | Coverage | Sister-discipline |
|--------|----------|-------------------|
| **(a)** | **Schema integrity — restored DB schema parity vs production** | Register §6 step 5 partial |
| **(b)** | **Sample-row integrity — N representative rows restore correctly** | AUDIT-016 PR 3 round-trip discipline |
| (c) | Full integration — entire test suite vs restored DB | Heaviest |
| **(d)** | **PHI-decrypt verification — KMS context end-to-end** | **AUDIT-016 + AUDIT-017 + AUDIT-075 sister-discipline** |

**Pre-recommendation: (a) + (b) + (d) bundled.**
**Rationale:** register §6 step 5 specifies (a) + partial (b); (d) added per AUDIT-016/AUDIT-017/AUDIT-075 lineage — encryption-at-rest claim depends on KMS context restoration working end-to-end. Quarterly cadence is the validation-frequency boundary for the HIPAA §164.312(a)(2)(iv) addressable encryption posture; without (d) the quarterly check leaves KMS-context-restoration as a theoretical-not-empirical claim.
**Rejected:** (c) full integration too heavy for quarterly cadence + doesn't add HIPAA-relevant signal beyond (a)+(b)+(d) at this scale; integration test failures during quarterly restore-test create false-positive operational noise.

### D4 — RPO/RTO targets

Currently undefined per register entry. Must be set in this PR.

**RPO target options:**
- **(a) <5 min** (Aurora continuous backup default; PITR window)
- (b) <1 hour (manual snapshot-only baseline)
- (c) <24 hours (daily snapshot baseline)

**RTO target options:**
- **(i) <30 min** (register §6 step 5 pre-specification)
- (ii) <1 hour
- (iii) <4 hours (HIPAA-typical; operationally generous)

**Pre-recommendation: RPO (a) <5 min + RTO (i) <30 min.**
**Rationale:** Aurora continuous backup makes RPO <5 min free (it's the engine default; comes with `BackupRetentionPeriod` >= 1); register §6 step 5 pre-specified <30 min RTO. Both align with industry-standard cardiology CDS posture.
**Rejected (RPO):** (b)/(c) undershoot Aurora-native capability without cost savings.
**Rejected (RTO):** (ii)/(iii) under-target Aurora restore-from-snapshot empirical performance (typically 5-15 min for clusters of this scale); aligning RTO with empirical performance preserves alarm-actionability when restore takes longer than expected.

**RTO measurement methodology (clarification per CONCERN D PAUSE 2.5 2026-05-08):** RTO timer starts at `aws rds restore-db-cluster-from-snapshot` command execution; stops when restored cluster status reaches `available` AND first `psql` connection succeeds. NOT just CFN status; restore-cluster-from-snapshot has Aurora-specific provisioning phases that complete after CFN reports `CREATE_COMPLETE` but before psql can connect. Sister-discipline to AUDIT-016 PR 3 production-execute timing instrumentation (`postCutoverSoakMonitor.sh` precedent).

### D5 — AWS Backup vs RDS automated backups vs both

| Option | Description | Posture |
|--------|-------------|---------|
| **(a)** | **RDS automated backups only (BackupRetentionPeriod parameter; native; included in RDS pricing)** | **HIPAA-sufficient at current scale** |
| (b) | AWS Backup plan only (cross-service consistency; centralized policy; separate billing) | Loses native PITR |
| (c) | Both (RDS automated + AWS Backup) — defense-in-depth | Strongest robust posture |

**Pre-recommendation: (a).**
**Rationale:** Aurora cluster + automated backup retention is HIPAA-sufficient at current scale; AWS Backup adds complexity + cost + BAA coverage verification + operator ramp-up without proportional value for single-DB-tier deployment. (c) is the strongest robust posture but doubles operational surface; (b) loses native PITR.
**Rejected:** (b) loses Aurora-native PITR (which D4 RPO depends on); (c) doubles operational surface for marginal HIPAA benefit at current scale; revisit post-multi-region adoption (AUDIT-XXX-future per §13).

### D6 — AUDIT-082 filing for terraform/ deferral

**Confirm filing per α reframe + §17.3 scope discipline.**

**Entry shape (sister to AUDIT-081 filing per AUDIT-075 D4 + AUDIT-014 sister-pattern):**
- Sequence: AUDIT-082 (next after AUDIT-081)
- Severity: LOW (P3) — operational debt; not blocking AUDIT-078 closure; not security-relevant
- Status: OPEN — DEFERRED per AUDIT-078 α reframe pivot
- Scope: terraform/ tree codifies decommissioned RDS predecessor; reconcile via either (i) delete tree + remove S3 backend state, (ii) migrate Aurora into terraform/aurora.tf if Terraform wins long-term IaC framework decision, (iii) mark legacy with README.md note
- Decision deferred to dedicated work block + platform-level IaC framework decision
- Effort estimate: S-M (2-4h)
- Cross-references: AUDIT-078 (deferred-from); CLAUDE.md §9 Aurora cutover; Day 11 RDS decommission runbook; HIPAA §164.308(a)(1)(ii)(B) Risk Management (operational debt risk)

**Decision: confirmed at PAUSE 2 close; AUDIT-082 entry filed in this PR per §17.3 sister-bundle scope discipline.**

### D7 — 13th §17.1 architectural-precedent codification

**Add to design-note §14 catalog (this PR; sister to AUDIT-075 §14 11→12 codification pattern):**

13th IaC-FRAMEWORK axis: register Phase A `Location` enumeration must enumerate ALL parallel IaC frameworks present in repo, not just the framework matching surface-syntax (e.g., "CloudFormation"). Sister to:
- 10th SCOPE axis (schema-column ≠ scoping-axis; AUDIT-011 PR #262 Phase B callsite verification)
- 12th NAME-PATTERN axis (column-name-pattern ≠ PHI-candidate-axis; AUDIT-075 PR #263 Phase A inventory catch)

All three are Phase A inventory framing-discipline catches that expand work-block scope dimension. The 10th-13th decomposition continues the coherent axis-pattern for future audits: INPUT (9th) / SCOPE (10th) / TYPE (11th) / NAME-PATTERN (12th) / **IaC-FRAMEWORK (13th)**.

**Discipline rule:** at any work block touching infrastructure / data layer / clinical logic, Phase A inventory must enumerate ALL parallel codifications/frameworks/registries that could shadow or duplicate the surface-named target.

**Decision: confirmed at PAUSE 2 close; 13th §17.1 codified in §14 of this design note.**

---

## 5. Sister-discipline mapping

### 5.1 AUDIT-016 PR 3 ops-PR boundary precedent

**Pattern:** tooling (`scripts/migrations/audit-016-pr3-v0v1-to-v2.ts`) ships repo-side; production execute operator-side per runbook §6.2. Repo PR closes the tooling-readiness scope; operator-side execution scoped per runbook with explicit pre-flight + execute + verify + rollback gates.

**Adoption:** AUDIT-078 mirrors this — CFN production template + operator runbook + optional CLI scaffolding ship in repo PR; CFN stack-import + drift-correct apply + restore-test execution + RTO measurement + sign-off live operator-side.

### 5.2 AUDIT-022 PR #253 8-section operator runbook structure

**Pattern:** 8 sections covering Purpose+Scope / Pre-flight Checklist / Execution / Monitoring During Run / Post-Run Validation / Rollback Procedure / Concurrent-Write Safety / Cross-References. Production-grade migration tooling pattern.

**Adoption:** AUDIT-078 runbook mirrors this 8-section structure adapted for backup-restore domain (see §7). Sections renamed: Concurrent-Write Safety → Test Cluster Isolation; Execution → Restore Execution; Monitoring → RTO Timer; Post-Run Validation → Pass-Criteria Verification.

### 5.3 AUDIT-013 / AUDIT-011 Phase d weak-fit notes

- **AUDIT-013** audit-logger: bundled into general audit-log PR; no clean ops-PR precedent. Not adopted.
- **AUDIT-011 Phase d**: 14-day soak window + operator-side env flip. Different domain (timing-discipline pattern only). Not adopted as primary sister; AUDIT-016 PR 3 + AUDIT-022 combined sister-pattern is the load-bearing reference.

---

## 6. CFN production template authoring plan

> **DEFERRED per α reframe 2026-05-08 (PAUSE 2.5 fresh-attention pivot).** This section preserved as design context for **AUDIT-XXX-future-aurora-cfn-import** (filed in §13). When the future work block opens (e.g., adjacent to next Aurora major version upgrade OR multi-environment IaC consolidation OR pre-v2.0 production-readiness wave), the CFN template authoring plan below is the starting baseline. Pattern: documented-rejection — sister to AUDIT-075 PAUSE 2.5 DOB-removal preservation (rejected design preserved for forward-reference, not deleted).

**File:** `infrastructure/cloudformation/tailrd-production.yml` NEW

**Source baseline:** `infrastructure/cloudformation/tailrd-staging.yml` (22.8KB; Engine: aurora-postgresql; cluster + 2-instance pattern).

**Production-tuned overrides:**

| Property | Staging value | Production value | HIPAA rationale |
|----------|--------------|-----------------|-----------------|
| `BackupRetentionPeriod` | 1 (staging-low) | **35** (max for Aurora automated) | §164.308(a)(7)(ii)(A) Data Backup Plan |
| `DeletionProtection` | (varies) | **true** | §164.308(a)(7)(ii)(B) Disaster Recovery Plan; prevents accidental destroy |
| `StorageEncrypted` | true | **true** (preserved) | §164.312(a)(2)(iv) addressable encryption |
| `KmsKeyId` | staging KMS alias | **production KMS alias** (parameter) | Production key isolation per AUDIT-016/AUDIT-017 |
| `PreferredBackupWindow` | (default) | **`03:00-04:00` UTC** (configurable param) | Low-traffic window; sister to terraform/rds.tf existing pattern |
| `PreferredMaintenanceWindow` | (default) | **`sun:04:30-sun:05:30` UTC** (configurable param) | Low-traffic window |
| `EnableCloudwatchLogsExports` | varies | **`['postgresql']`** | §164.312(b) audit controls |
| Cluster identifier | tailrd-staging-aurora | **tailrd-production-aurora** (existing; import target) | Live resource match |

**Stack-import design:** CFN production template authored to MATCH the existing live cluster's current state for stack-import; HIPAA-strong overrides applied via subsequent change-set + execute. Two-step adoption preserves cluster availability + avoids drift-on-import errors.

**Snapshot lifecycle policy:** documented in template header comment + runbook:
- Automated daily backups (35-day rolling retention) via `BackupRetentionPeriod: 35`
- Monthly HIPAA-tagged manual snapshots (6-year retention per HIPAA §164.530(j)(2)) — manual operator action OR optional Lambda automation (deferred to AUDIT-XXX-future per §13)

---

## 6.5 CFN stack-import risk + dry-run protocol

> **DEFERRED per α reframe 2026-05-08 (PAUSE 2.5 fresh-attention pivot).** Risk surface preserved as forward-reference for **AUDIT-XXX-future-aurora-cfn-import** (filed in §13). The α reframe rationale was specifically to AVOID the rollback risk enumerated in §6.5.1 on live BSW-pilot Aurora cluster; the dry-run protocol + import-rollback recovery procedure remain authoritative when the future work block executes. Sister to PAUSE 2.5 documented-rejection pattern (AUDIT-075 DOB-removal preservation).
>
> **PAUSE 2.6 OUTCOME A clarification (added 2026-05-08):** AUDIT-078 facts dump confirmed Aurora cluster KmsKeyId resolves to alias `alias/tailrd-aurora-production` (key `ec93e66e-...`); AUDIT-016 PHI envelope key is separate alias `alias/tailrd-production-phi` (key `46f6551f-...`). Two-key defense-in-depth architecture is BY-DESIGN, not drift. AUDIT-XXX-future-aurora-cfn-import work block MUST preserve key separation when CFN-codifying cluster — production CFN template KmsKeyId parameter binds to Aurora storage key, NOT PHI envelope key. Sister-discipline: AUDIT-016 PR 2 per-record EncryptionContext binding pattern (envelope key separation reinforced by KMS audit-trail). See AUDIT-XXX-future-encryption-at-rest-architecture-summary (§13) for consolidated layered-architecture documentation work.

**(Added 2026-05-08 per CONCERN B PAUSE 2.5; sister to AUDIT-016 PR 3 8th §17.1 "obvious-but-load-bearing" risk surfacing. Section content authored before α reframe locked; preserved in full per documented-rejection discipline.)**

### 6.5.1 Risk surface

CFN stack-import of existing `tailrd-production-aurora` cluster has non-trivial risk surface:

1. **Parameter exact-match requirement** — every CFN property in the import template must match the live cluster's CURRENT value. Any drift (e.g., template says `BackupRetentionPeriod: 35` but cluster currently has `7`) causes import-fail.
2. **Non-importable properties** — some Aurora properties (e.g., `MasterUserPassword`, certain ServerlessV2 scaling fields) cannot be specified in import templates; must be omitted at import.
3. **Rollback-on-import-fail unrecoverable state** — if import fails mid-way, stack lands in `ROLLBACK_FAILED` state requiring `aws cloudformation continue-update-rollback` OR AWS Support escalation.
4. **Snapshot non-import** — existing automated + manual snapshots are NOT pulled into CFN management; they remain RDS-managed. Import-export-snapshot flows are separate operator-side workflows.
5. **Two-step adoption requirement** — import must use CURRENT state values; HIPAA-strong overrides (BackupRetentionPeriod=35, DeletionProtection=true) apply via SUBSEQUENT change-set + execute. Skipping the two-step flow guarantees import-fail.

### 6.5.2 Dry-run protocol (operator-side; before live import)

```bash
# 1. Author template with CURRENT cluster values (per CONCERN A facts dump)

# 2. Create dry-run change-set (does NOT execute)
aws cloudformation create-change-set \
  --change-set-type IMPORT \
  --stack-name tailrd-production \
  --change-set-name import-dry-run \
  --template-body file://infrastructure/cloudformation/tailrd-production.yml \
  --resources-to-import file://infrastructure/cloudformation/tailrd-production-imports.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

# 3. Verify dry-run output
aws cloudformation describe-change-set --change-set-name import-dry-run --stack-name tailrd-production
# Verify: expected resources + zero parameter-mismatch errors

# 4. ONLY after dry-run clean: execute change-set OR delete-change-set + iterate
```

### 6.5.3 Import-rollback recovery procedure

If import fails into `ROLLBACK_FAILED`:

```bash
# Capture diagnostic state
aws cloudformation describe-stack-events --stack-name tailrd-production

# Attempt continue-rollback
aws cloudformation continue-update-rollback --stack-name tailrd-production

# If still failed — delete stack with --retain-resources MANDATORY to preserve cluster
aws cloudformation delete-stack \
  --stack-name tailrd-production \
  --retain-resources <ProductionAuroraCluster> <ProductionAuroraInstance1> <ProductionAuroraInstance2>

# Worst case: AWS Support ticket; cluster remains untouched throughout (the load-bearing safety property)
```

### 6.5.4 Two-step adoption mandatory

- **Step 1:** import with CURRENT values (no overrides; matches live cluster reality exactly)
- **Step 2:** separate change-set with HIPAA-strong overrides (`BackupRetentionPeriod: 35`, `DeletionProtection: true`)
- Skipping Step 1 = guaranteed import-fail per Risk #1 above
- Sister-discipline: AUDIT-016 PR 3 two-step (dry-run + execute) gating; AUDIT-022 PR #253 confirmation-gate pattern

### 6.5.5 Operator-side post-import verification

```bash
# Verify import landed all resources
aws cloudformation describe-stack-resources --stack-name tailrd-production

# Verify cluster status unchanged
aws rds describe-db-clusters --db-cluster-identifier tailrd-production-aurora --query 'DBClusters[0].Status'

# Verify post-Step-2 (override-apply) values
aws rds describe-db-clusters --db-cluster-identifier tailrd-production-aurora \
  --query 'DBClusters[0].{BackupRetentionPeriod:BackupRetentionPeriod,DeletionProtection:DeletionProtection}'
# Expected: BackupRetentionPeriod=35, DeletionProtection=true
```

---

## 7. Operator runbook structure

**File:** `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` NEW

**Sister-discipline:** AUDIT-022 8-section structure adapted for backup-restore domain.

| § | Section | Content |
|---|---------|---------|
| 1 | Purpose + Scope | AUDIT-078 closure; HIPAA §164.308(a)(7) posture; CFN-scope per α reframe |
| 2 | Pre-flight Checklist | AWS account access verified; current backup config snapshot via `aws rds describe-db-clusters`; CFN stack-import permissions; KMS key access; production cluster identifier confirmed; baseline RTO timer instrumentation |
| 3 | CFN Stack-Import Execution | `aws cloudformation create-change-set --change-set-type IMPORT` flow; verify IMPORT_COMPLETE; subsequent change-set for parameter overrides (BackupRetentionPeriod=35, DeletionProtection=true) |
| 4 | Restore-Test Execution | Snapshot identification (`tailrd-production-aurora-pre-cutover-20260428-231342` per register §6 step 5 OR latest automated snapshot); `aws rds restore-db-cluster-from-snapshot --db-cluster-identifier tailrd-production-aurora-restore-test`; RTO timer wrap |
| 5 | RTO Timer + Pass-Criteria Verification | RTO target <30 min; D3 (a) schema parity check; (b) sample-row decrypt N=10 representative rows; (d) PHI-decrypt KMS context end-to-end verification |
| 6 | Restore-Test Sign-off + Ledger Update PR | Pass-criteria results table; RTO wall-clock measurement; sister-PR opened with AUDIT-078 status flip |
| 7 | Test Cluster Destroy | `aws rds delete-db-cluster --skip-final-snapshot --db-cluster-identifier tailrd-production-aurora-restore-test`; cleanup verification |
| 8 | Quarterly Cadence + Cross-References | Reminder mechanism (calendar / runbook-rerun anchor); next cadence date; cross-references to AUDIT-016 PR 3 runbook + AUDIT-022 runbook |

---

## 8. Optional CLI scaffolding

**Directory:** `infrastructure/scripts/audit-078/` NEW (gated on operator preference; D-decision input)

**Files:**
- `verify-backup-config.sh` — operator pre-flight helper (`aws rds describe-db-clusters | jq` query for BackupRetentionPeriod / DeletionProtection / StorageEncrypted / KmsKeyId)
- `restore-test.sh` — snapshot identification + restore-cluster invocation + RTO timer wrap (POSIX timestamp delta)
- `schema-parity-check.sh` — D3 (a) verification; runs `pg_dump --schema-only` against production + restore-test cluster; diff
- `sample-row-decrypt.sh` — D3 (b) + (d) verification using existing PHI decryption tooling (calls into `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` decrypt helpers OR standalone harness)
- `destroy-test-cluster.sh` — cleanup helper with confirmation gate (`AUDIT_078_DESTROY_CONFIRMED=yes`)

**Decision-gate:** if operator prefers pure-runbook approach (no CLI scaffolding), defer to AUDIT-XXX-future per §13.

**Precedent:** sister to AUDIT-016 PR 3 + AUDIT-022 production-grade migration tooling pattern; CLI scripts reduce operator-side error rate during quarterly restore-test execution.

---

## 9. Test plan

**No backend code changes; no jest delta expected.**

**Verification covered by:**
- CFN template lint (`cfn-lint` or `aws cloudformation validate-template`)
- Runbook section completeness check (all 8 sections authored; cross-reference targets exist)
- Optional CLI scripts: shell-lint via `shellcheck`
- Default-suite jest stability: 603/603 passing (unchanged from main HEAD `5b0b346`)

**Verification battery for PR open:**
1. CFN validate green
2. Markdown lint green (runbook + design note)
3. ShellCheck green (if CLI scripts authored)
4. Default-suite jest 603/603 unchanged
5. Demo PID 60172 LISTENING

---

## 10. Demo-safety

**Repo-side:** No backend service impact; no jest changes; no Prisma schema changes.

**Operator-side:**
- CFN stack-import is metadata-only (CloudFormation gains awareness of existing cluster without modifying it)
- Backup retention + deletion-protection apply via CFN drift-correct (Aurora live; no downtime; parameter changes are dynamic-apply on Aurora)
- Restore-test creates separate cluster (`tailrd-production-aurora-restore-test`); production cluster untouched
- Test cluster destroy at end of restore-test; no residual cost

**Demo PID 60172 must remain LISTENING throughout AUDIT-078 work block.** Repo-side PR has zero backend service touchpoints.

---

## 11. Rollback path

**Repo-side rollback (PR revert):**
- `git revert <PR-merge-SHA>` removes CFN template + runbook + scripts; no production state impact (CFN never imported); demo unaffected

**Operator-side rollback (post-execution):**
- CFN stack delete (`aws cloudformation delete-stack`) — preserves cluster via `Retain` deletion policy if configured (recommended for production)
- Backup retention / deletion-protection setting reversion via CFN drift-revert change-set OR manual `aws rds modify-db-cluster --no-deletion-protection --backup-retention-period <prior-value>`
- Test cluster destroy via `aws rds delete-db-cluster --skip-final-snapshot --db-cluster-identifier tailrd-production-aurora-restore-test`
- Documentation: rollback log entry in BUILD_STATE.md §9 closing prose for any rollback execution

**Audit-trail preservation:** rollback events logged to CloudTrail per AWS-default; sister to AUDIT-013 audit-log durability discipline.

---

## 12. Effort estimate

**α scope (current; document-and-defer-IaC reframe 2026-05-08):**

| Phase | Effort | Notes |
|-------|--------|-------|
| PAUSE 2 design refinement note authoring | ~1.5-2h | DONE (sections §1-§14 + §6.5 PAUSE 2.5 addition + α reframe pivot edits) |
| Phase C Block A Step 1 — operator-side aws-cli backup config apply | ~5 min | `aws rds modify-db-cluster` BackupRetentionPeriod=35 + DeletionProtection=true; agent surfaces command + verification |
| Phase C Block A Step 2 — runbook authoring | ~1.5-2h | Sister to AUDIT-022 8-section structure (§7); CFN-import sections REMOVED from α scope |
| Phase C Block B Step 3 — CLI scaffolding | ~1-1.5h | Reduced α set: `00-preflight.sh` + `03-execute-restore-test.sh` + `04-rotate-cadence.sh` + `05-verify-backup-config.sh` (`01-import-stack.sh` + `02-apply-backup-config.sh` REMOVED to AUDIT-XXX-future-aurora-cfn-import) |
| Phase C Block C Step 4 — register flips + ledger updates | ~30 min | AUDIT-078 RESOLVED (post-merge sister-PR pattern) + BUILD_STATE.md §1+§6+§6.1+§9; AGENT_DRIFT_REGISTRY DRIFT-09 + DRIFT-10 codification |
| Phase C Block C Step 5 — SESSION_JOURNAL Day 9 entry | ~10 min | Sister to Day 8 close template |
| Phase C Block C Step 6 — verification battery | ~15 min | Markdown lint + shellcheck + jest 603/603 sanity |
| Phase C Block C Step 6.5 — Lever 4 self-check | ~30 min | Sister to AUDIT-075 Step 11.5 |
| PR open + CI + operator-substance-check + merge | ~30 min | Sister to PR #263/#264 cadence; single PR with 3 explicit Review Section A/B/C headers per CONCERN C (i) |
| Operator-side execution + sign-off ledger PR | (out of repo PR scope) | Per runbook + sister-PR pattern |

**Total repo-side α scope: ~3-4h.** Pivot reduced from γ-scope ~6-9h estimate via CFN stack-import deferral.

**Operator-side execution wall-clock:** ~30-60 min for first-run aws-cli backup config apply + restore-test (no CFN import learning curve in α scope).

**Deferred-scope effort (preserved for AUDIT-XXX-future-aurora-cfn-import):** ~6-9h plus operator-side dry-run + import-execute + post-import-verify cycles. Sister-pattern when future work block opens.

---

## 13. Engineering tightening follow-ups (NOT §17.1; tracked deferred items)

Sister to AUDIT-075 §13 engineering-tightening follow-ups discipline. Follow-up entries tracked deferred:

- **AUDIT-082 — terraform/ stale-state reconciliation (D6 deferral)** — filed in this PR; LOW P3; ~2-4h dedicated work block; gated on platform-level IaC framework decision
- **AUDIT-XXX-future-aurora-cfn-import** (added 2026-05-08 per α reframe PAUSE 2.5 fresh-attention pivot) — CFN stack-import of `tailrd-production-aurora` into CFN-managed stack. Scope deferred from AUDIT-078 closure per α reframe 2026-05-08 to avoid CFN-import rollback risk on live BSW-pilot cluster. Design context preserved at §6 (CFN production template authoring plan) + §6.5 (CFN stack-import risk + dry-run protocol + import-rollback recovery procedure). Future work block: select low-stakes window (e.g., adjacent to next Aurora major version upgrade OR multi-environment IaC consolidation OR pre-v2.0 production-readiness wave); execute dry-run protocol per §6.5.2; two-step adoption per §6.5.4. Effort estimate: M (~6-9h plus operator-side dry-run + import-execute + post-import-verify cycles). Sister-discipline: AUDIT-081 D4 option-C deferral pattern + AUDIT-082 terraform/ stale-state deferral pattern + AUDIT-075 PAUSE 2.5 DOB-removal documented-rejection pattern.
- **AUDIT-XXX-future-aws-backup-multi-region** (added 2026-05-08 per CONCERN D PAUSE 2.5; replaces prior `aws-backup-evaluation` framing) — revisit D5 (c) Both posture (RDS automated + AWS Backup) when multi-region adoption begins. AWS Backup's value proposition is centralized cross-region-cross-service backup policy; at single-region single-DB-tier scale today, RDS-native PITR + automated snapshots cover HIPAA §164.308(a)(7) without AWS Backup overhead. Cross-region replication via Aurora Global Database is the natural next-tier upgrade ahead of AWS Backup adoption.
- **AUDIT-XXX-future-cross-region-replication** — Aurora Global cluster; HIPAA-stronger contingency plan posture; gated on multi-region adoption
- **AUDIT-XXX-future-restore-test-automation** — if D2 selects (d) on-demand initially; upgrade to automated cadence (b)/(c) when operator capacity allows
- **AUDIT-XXX-future-monthly-hipaa-snapshot-lambda** — automate monthly HIPAA-tagged 6-year-retention snapshots via Lambda + EventBridge schedule; sister to existing automated-snapshot pattern
- **AUDIT-XXX-future-cli-scaffolding** — if D8 (CLI scaffolding) selects "no" at this PR; revisit when quarterly cadence reveals operator-side error patterns
- **`infrastructure/README.md` staleness** — 3-stack table in README is itself stale (no mention of `tailrd-staging.yml` Aurora stack OR `terraform/`); consider opportunistic refresh in this PR vs separate AUDIT-XXX-future
- **§17.1 architectural-precedent catalog consolidation** (added 2026-05-08 per CONCERN D PAUSE 2.5) — catalog currently lives in design refinement notes (sister-pattern: AUDIT-011 §14 / AUDIT-075 §14 / AUDIT-078 §14 of this note). Consolidation into `AUDIT_METHODOLOGY.md` core file as dedicated §17.1-architectural-precedent section would centralize the 13-entry catalog + reduce next-author lookup cost; gated on operator preference (single source of truth in methodology vs distributed sister-pattern). Tracked as engineering tightening; not blocking AUDIT-078 PR.
- **AUDIT-XXX-future-iam-db-auth** (added 2026-05-08 per PAUSE 2.5-α Block A Step 1 reconciliation) — `IAMDatabaseAuthenticationEnabled=false` on production Aurora cluster surfaced via CONCERN A facts dump. Defense-in-depth opportunity (allows IAM-token-based DB connections vs password-only); not blocking AUDIT-078 closure (HIPAA §164.308(a)(7) gap closes via backup config + restore-test). Future work block: enable via `aws rds modify-db-cluster --enable-iam-database-authentication`; coordinate with backend connection-pool refactor (Prisma DATABASE_URL would need IAM token rotation OR keep password-auth + add IAM as alternative); sister-discipline to AUDIT-009 MFA enforcement (defense-in-depth identity layer). Effort estimate: M (~4-6h including Prisma integration + tests). Severity LOW (P3) — defense-in-depth, not security-blocking.
- **AUDIT-XXX-future-ci-shellcheck-coverage** (added 2026-05-08 per Block C Observation 2 mitigation) — repo CI lacks shellcheck step; verified via `grep -rln "shellcheck" .github/` returning empty 2026-05-08. AUDIT-078 CLI scripts pass `bash -n` syntax floor only (operator-side local validation). Future work block: add shellcheck CI gate to existing `.github/workflows/` pipeline for any `*.sh` file in repo (sister-discipline to ESLint + tsc CI gates already present). Effort estimate: XS (~1h CI workflow YAML + sample-PR validation). Severity LOW (P3) — engineering-tightening; not security-blocking; covers AUDIT-078 + AUDIT-022 + AUDIT-016 PR 3 + future shell scripts. Sister to AUDIT-XXX-future-iam-db-auth + AUDIT-XXX-future-aurora-pg-param-group-customize defense-in-depth tooling-coverage pattern.
- **AUDIT-XXX-future-aurora-pg-param-group-customize** (added 2026-05-08 per Block A Step 2 runbook authoring 2026-05-08 reconciliation) — production Aurora cluster currently uses `default.aurora-postgresql15` (AWS-managed) DB cluster parameter group. Custom DB cluster parameter group would enable HIPAA-relevant settings: `rds.force_ssl=1`, `log_statement=ddl`, `log_connections=1`, `log_disconnections=1`, `shared_preload_libraries=pgaudit`, etc. — coordinated with AUDIT-013 audit-log defense-in-depth posture. Sister-discipline: terraform/rds.tf already codified these parameters for predecessor RDS (lines 22-55) — pattern is precedent-correct, just unapplied on Aurora. Future work block: create custom `tailrd-aurora-production-postgres15-params` cluster parameter group; modify-db-cluster apply with soak window. Effort estimate: M (~4-6h custom parameter group + apply via modify-db-cluster + soak window). Severity LOW (P3) — defense-in-depth, not security-blocking. Sister to AUDIT-XXX-future-iam-db-auth + AUDIT-XXX-future-aurora-cfn-import deferred-defense-in-depth pattern.
- **AUDIT-XXX-future-encryption-at-rest-architecture-summary** (added 2026-05-08 per PAUSE 2.6 OUTCOME A load-bearing surfacing; DRIFT-11 codification — consolidated treatment, not bullet-buried) — TAILRD HIPAA encryption-at-rest posture currently documented across 4+ scattered references (AUDIT-016 design doc §59 PHI envelope D1-D7 / AUDIT-016 PR 2 V2 envelope + KMS wiring / AUDIT-078 Aurora storage encryption / AUDIT-075 PHI_FIELD_MAP routing). No single doc consolidates the layered architecture (AWS storage envelope + application field-level envelope + KMS key separation + EncryptionContext binding + middleware routing). Audit-readiness implications: BSW DUA reviewer / Mount Sinai compliance / future HIPAA audit asks "how does TAILRD encrypt PHI at rest?" → answer requires reading 4+ documents to assemble layered architecture. Three remediation paths: (i) dedicated `docs/architecture/HIPAA_ENCRYPTION_AT_REST_ARCHITECTURE.md` consolidated 2-3 page doc with layered diagram + KMS key inventory + PHI_FIELD_MAP routing summary + EncryptionContext binding architecture + cross-references + HIPAA §164.312(a)(2)(iv) mapping; (ii) CLAUDE.md §X-NEW operational-doc context section; (iii) `AUDIT_METHODOLOGY.md` §X-NEW methodology-doc context. Effort estimate: S (~2-3h authoring + cross-reference resolution). Severity LOW (P3) — engineering-tightening; not security-blocking; not HIPAA-violating; documentation-clarity gap with audit-readiness implications. Sister-discipline: AUDIT-XXX-future-methodology-17.1-consolidation (scattered-vs-consolidated documentation pattern); AUDIT-075 PAUSE 2.5 DOB-removal documented-rejection treatment (preserve architectural finding with full design context, not buried bullet). Cross-references: AUDIT-016 design doc §59 + PR #260/#261; AUDIT-075 PR #263; AUDIT-078 design refinement note + this PAUSE 2.6 OUTCOME A reconciliation; AUDIT-XXX-future-aurora-cfn-import (key-separation preservation requirement); HIPAA §164.312(a)(2)(iv).

---

## 14. §17.1 architectural-precedent catalog (12 → 13)

| § | Precedent | Catalyst | What was caught |
|---|---|---|---|
| 1-7 | Prior arc precedents (HIPAA-foundations / Phase 0B / Phase 3 / AUDIT-071) | Various | See `AUDIT_011_PHASE_BCD_PRISMA_EXTENSION_NOTES.md` §14 row 1-7 |
| 8 | AUDIT-016 PR 3 raw SQL bypass (PR #261) | Phase B design | migrateRecord write-path middleware double-encrypt risk |
| 9 | AUDIT-011 Layer 3 Option 0 plumbing (PR #262) | Inventory Item 11 reframing | Layer 3 INPUT axis — pure params.args inspection sufficient |
| 10 | AUDIT-011 schema-column ≠ scoping-axis (PR #262) | Phase B callsite verification | Layer 3 SCOPE axis — content classification not schema-column presence |
| 11 | AUDIT-011 TS inference erosion (PR #262) | Phase C Step 3 TS verification | Layer 3 TYPE axis — generic-extends return-type erosion |
| 12 | AUDIT-075 column-name-pattern ≠ PHI-candidate-axis (PR #263) | PAUSE 1 inventory content classification | PHI-coverage NAME-PATTERN axis — content + model context, not column-name pattern matching |
| **13** | **AUDIT-078 parallel IaC framework not enumerated in register Location (this PR)** | **PAUSE 1 inventory item 1.1 IaC repo presence** | **IaC-FRAMEWORK axis — register Phase A Location enumeration must enumerate ALL parallel IaC frameworks present in repo, not just the framework matching surface-syntax (e.g., "CloudFormation")** |

**Sister to 10th SCOPE axis = 12th NAME-PATTERN axis = 13th IaC-FRAMEWORK axis; all three Phase A inventory catches.** The 10th-13th decomposition forms a coherent axis-pattern recognizable for future audits: INPUT (9th) / SCOPE (10th) / TYPE (11th) / NAME-PATTERN (12th) / **IaC-FRAMEWORK (13th)**.

**Discipline rule (codified at PAUSE 2 close):** at any work block touching infrastructure / data layer / clinical logic, Phase A inventory must enumerate ALL parallel codifications/frameworks/registries that could shadow or duplicate the surface-named target.

§17.1 architectural-precedent count advances **12 → 13**.

---

*Authored 2026-05-08 during AUDIT-078 PAUSE 2 design-refinement-note authorship. Catalyst: AUDIT-078 PAUSE 1 inventory caught register's CFN-only Location enumeration (parallel terraform/ tree codifying decommissioned RDS predecessor surfaced); D1-D7 decisions surfaced with pre-recommendations + rejection reasons; design refinement note authorship per AUDIT-075 / AUDIT-011 sister-pattern (Mechanism 1 + Mechanism 2 + pre-step inventory + Step 11.5 self-check + Lever 6 discipline).*
