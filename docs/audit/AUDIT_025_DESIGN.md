# AUDIT-025 Design Doc — Schema Migration Validation Gate

**Branch (when implemented):** `fix/audit-025-migration-gate`
**Author:** jhart
**Date:** 2026-05-03
**Status:** DESIGN (no infrastructure or workflow changes yet)
**Companion:** `docs/audit/AUDIT_011_DESIGN.md` (sibling design doc structure)
**Closes:** Tier B finding AUDIT-025

---

## Purpose

The original AUDIT-025 register entry framed this finding as "no staging environment for Aurora schema migrations." Investigation (§2 below) revealed the assumption was wrong: staging Aurora cluster + ECS service + deploy pipeline already exist and have been live since 2026-04-28. The actual gap is **CI-level migration validation timing** — two distinct sub-gaps that combined to let PR #220's CONCURRENTLY-in-transaction migration ship to production despite three nominal pre-prod checkpoints.

This design doc reframes the finding around the actual gaps, scopes a 2-phase remediation totaling 2-4h (down from the original 8-12h estimate), and captures a meta-lesson about register-entry hygiene.

---

## 1. Finding summary

> **AUDIT-025** — No staging environment for Aurora schema migrations
> - Severity: MEDIUM (P2) — real risk to future schema changes; surfaced via AUDIT-011 deploy failure
> - Tier: B
> - Detected: 2026-05-03 during AUDIT-011 Phase a-pre deploy

**Reframed scope (per §2 investigation):**

The staging environment exists. The gap is two-layered: CI's pre-merge validation uses `prisma db push --force-reset` (which bypasses the migration runner entirely), and the existing staging deploy fires *parallel* with production after merge (which is informative but not gating). PR #220's CONCURRENTLY-in-transaction failure passed CI green and crashed both staging and production simultaneously.

**Severity rationale stands.** Future schema migrations (AUDIT-022 backfill of 243 PHI rows is the next one queued) have no pre-merge verification path against the migration runner's actual semantics. Without remediation, this gap will recur.

---

## 2. Current state — schema migration deploy surface

### 2.1 The four-stage pipeline

| Stage | Database | Prisma command | When | Result for PR #220 |
|---|---|---|---|---|
| Local dev | local Postgres | `migrate dev` | manual / pre-push | not run before push (the CONCURRENTLY syntax was operator-side untested — Gap 0; out of scope for this finding) |
| CI tests | postgres:15 service container | **`db push --force-reset`** | every PR | **passed** — db push bypasses migrate runner (Gap 1) |
| Staging deploy | `tailrd-staging-aurora` (PG 15.14, ServerlessV2 0.5-4 ACU) | `migrate deploy` (container CMD) | post-merge to main, parallel with production | **crashlooped 18:25-18:35Z** — would have caught (Gap 2: timing) |
| Production deploy | `tailrd-production-aurora` (PG 15.14, ServerlessV2 0.5-16 ACU) | `migrate deploy` (container CMD) | post-merge to main, parallel with staging | **crashlooped — the production incident** |

### 2.2 Existing infrastructure (verified 2026-05-03)

- **Aurora staging cluster** `tailrd-staging-aurora`: live, available, PG 15.14 (engine parity with production)
- **ECS staging cluster** `tailrd-staging-cluster` with service `tailrd-staging-backend` (currently task def `:29`)
- **IAM roles**: `tailrd-staging-ecs-task`, `tailrd-staging-ecs-execution-role`
- **Secrets**: `tailrd-staging/app/database-url`, `tailrd-staging-aurora/app/database-url`, plus jwt/phi-key/db-password
- **Deploy workflow** `.github/workflows/deploy-staging.yml`: triggered on `push.branches: [main]`, runs in parallel with production deploy
- **DNS**: `staging-api.tailrd-heart.com` (per CLAUDE.md)

### 2.3 The critical CI gap — `db push --force-reset`

`.github/workflows/ci.yml` Jest Tests job:

```yaml
- name: Push database schema
  working-directory: backend
  run: npx prisma db push --force-reset --accept-data-loss
```

`prisma db push` syncs the schema directly without going through the migration runner. It does NOT execute migration SQL files. It does NOT wrap operations in transactions the way `migrate deploy` does. It cannot detect:

- CONCURRENTLY-in-transaction failures (PR #220's exact bug)
- Migration ordering / dependency issues
- Broken or malformed migration SQL files
- `_prisma_migrations` table state issues

The CI step exists for the legitimate purpose of preparing a fresh schema for unit tests. It is not the right tool for migration validation. **AUDIT-025 Phase a adds a separate validation step rather than replacing this one.**

---

## 3. Vulnerability characterization

### 3.1 Gap 1 (load-bearing): CI bypasses migration runner

`db push` is schema-comparison-driven; it diffs the Prisma schema against the live DB and applies the differences directly. It never reads migration files. Any bug specific to the migration runner's behavior — transaction wrapping, lock acquisition, statement ordering — is invisible.

**Class of bugs Gap 1 misses:**
- CONCURRENTLY in transaction (PR #220)
- DDL that requires multi-statement migration files
- Migration files with PG-version-specific syntax mismatches
- Failed-and-rolled-back migration state

### 3.2 Gap 2 (belt-and-suspenders): staging fires post-merge

`.github/workflows/deploy-staging.yml` triggers on `push.branches: [main]`. By the time it runs, the merge is already complete and `.github/workflows/deploy.yml` (production) is firing in parallel. Staging crashlooping does not block production — both are racing the same broken migration.

**Class of bugs Gap 2 catches but Gap 1 misses (and vice-versa):**
- Aurora-specific behaviors (engine version drift, ServerlessV2 ACU scaling during migrations, read replica behavior) — caught by Gap 2 only
- Container-environment issues (env vars, runtime libraries) — caught by Gap 2 only
- Network/IAM issues at deploy time — caught by Gap 2 only

### 3.3 Combined outcome (PR #220)

PR #220 was green at every pre-prod gate that existed:
- Local: not exercised (operator-side untested)
- CI: green (db push doesn't trigger the bug)
- Staging: not yet run when production deploy began
- Production: crashlooped at first task startup attempt

The remediation closes both gaps independently. Either alone would have caught PR #220.

---

## 4. Architecture decision

### 4.1 Decision: 2-phase fix, no new infrastructure

Phase a (load-bearing) closes Gap 1: a new CI job runs `prisma migrate deploy` against an ephemeral postgres:15 service container. Required check for merge.

Phase b (belt-and-suspenders) closes Gap 2: a new CI job runs `prisma migrate deploy` against the existing staging Aurora cluster. Required check for merge. GitHub Actions concurrency group prevents PR collisions.

### 4.2 Rejected alternatives

- **"Provision new staging cluster"** — staging already exists (per §2.2). Cost would be wasted; ignores existing infrastructure.
- **"Replace `db push --force-reset` with `migrate deploy` in the existing CI test job"** — works for catching transaction bugs but loses the clean-slate guarantee for unit tests, which depend on a freshly-reset schema. Adding a *separate* validation job is cleaner.
- **"Run staging deploy on PR instead of post-merge"** — closes Gap 2 but introduces new failure modes (in-flight PRs colliding on staging service state, longer PR feedback loop). Phase b's `migrate deploy` against staging Aurora directly is faster (~30s) and equally rigorous for migration validation.
- **"Phase c drift verification now"** — premature. Phase a + b ensure staging matches production immediately post-merge; drift is bounded by definition. Defer until evidence of actual drift in practice.

---

## 5. Phase a — CI migrate deploy gate (LOAD-BEARING)

### 5.1 Implementation

New job in `.github/workflows/ci.yml`:

```yaml
migration-validation:
  name: Migration Validation
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_USER: tailrd_migrate
        POSTGRES_PASSWORD: tailrd_migrate_pw
        POSTGRES_DB: tailrd_migrate
      ports:
        - 5433:5432  # different port from Jest's postgres to avoid collision
      options: >-
        --health-cmd "pg_isready -U tailrd_migrate"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@<pinned>
    - uses: actions/setup-node@<pinned>
      with:
        node-version: 18
    - working-directory: backend
      run: npm ci
    - name: Run prisma migrate deploy
      working-directory: backend
      run: npx prisma migrate deploy
      env:
        DATABASE_URL: postgresql://tailrd_migrate:tailrd_migrate_pw@localhost:5433/tailrd_migrate
```

Branch protection rule on `main`: add `Migration Validation` to required status checks.

### 5.2 What this catches

- Transaction wrapping bugs (PR #220)
- SQL syntax errors in migration files
- Migration ordering / idempotency violations
- Stale `_prisma_migrations` table state introduced by malformed past migrations
- Missing migration files referenced in lock

### 5.3 What this does NOT catch

- Aurora-specific engine behaviors (transaction isolation modes, ServerlessV2 scaling pauses)
- Data-migration bugs (no production-shape data in CI postgres)
- Performance issues at scale
- Container-environment issues (env vars, IAM at deploy time)

These are addressed by Phase b.

### 5.4 Effort estimate

**1-2h** including:
- Workflow YAML authoring + local YAML linting
- Test PR with deliberately broken migration to verify gate fires
- Branch protection update
- Documentation update (`docs/DEVELOPMENT.md` if exists, or runbook)

---

## 6. Phase b — Staging Aurora gate (BELT-AND-SUSPENDERS)

### 6.1 Implementation: Option B2 (CI-direct, not full deploy)

```yaml
staging-migration:
  name: Staging Migration Validation
  runs-on: ubuntu-latest
  needs: migration-validation  # only run after Phase a passes
  concurrency:
    group: staging-migration  # only one at a time
    cancel-in-progress: false
  steps:
    - uses: actions/checkout@<pinned>
    - uses: actions/setup-node@<pinned>
      with:
        node-version: 18
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@<pinned>
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    - name: Fetch staging DATABASE_URL
      run: |
        DATABASE_URL=$(aws secretsmanager get-secret-value \
          --secret-id tailrd-staging/app/database-url \
          --query SecretString --output text)
        echo "DATABASE_URL=$DATABASE_URL" >> $GITHUB_ENV
    - working-directory: backend
      run: npm ci
    - name: Run prisma migrate deploy against staging Aurora
      working-directory: backend
      run: npx prisma migrate deploy
```

Branch protection: also require `Staging Migration Validation`.

### 6.2 Why Option B2 over Option B1 (full staging deploy)

| Dimension | B1: Full staging deploy on PR | B2: migrate deploy direct |
|---|---|---|
| Speed | ~5 min (build + push + register + rolling deploy) | ~30s (just migration) |
| Isolation | Full staging service contention with other PRs | Concurrency group serializes |
| Catches | Aurora migration + container env + IAM at deploy | Aurora migration only |
| Failure modes | Deploy partial-failure states, stuck rollouts | Migration succeeds or fails atomically |
| Cost | More CI minutes; more AWS API calls | Minimal |

B2 catches the class of bug AUDIT-025 is designed to catch. Container/IAM bugs are caught by the existing post-merge staging deploy (which still runs) — they just fail post-merge instead of pre-merge, which is acceptable since they're far less frequent than migration bugs.

### 6.3 Concurrency design

GitHub Actions concurrency group `staging-migration`. Only one PR's `staging-migration` job can run against the staging Aurora at a time. Other PRs queue. Typical migration takes <1 min so queue depth is negligible at current PR velocity.

`cancel-in-progress: false` — never cancel a running migration mid-flight. If a stale PR's migration is running, newer PRs wait.

### 6.4 What this catches (beyond Phase a)

- Aurora ServerlessV2 ACU scaling during migration (cold-start issues, capacity scaling timing)
- PG 15.14 specific behaviors (vs CI's vanilla postgres:15)
- Network path issues from CI runner to RDS endpoint
- Secrets Manager access path from CI

### 6.5 Effort estimate

**1-2h** including:
- Workflow YAML authoring
- Verify CI's GitHub Actions IAM has `secretsmanager:GetSecretValue` on `tailrd-staging/app/database-url`
- Concurrency group testing (deliberately overlap two PRs)
- Branch protection update

---

## 7. Phase c — Schema drift verification (DEFERRED)

Periodic check that staging schema matches production. Important if staging has gotten out of sync from manual intervention, failed deploys, or out-of-band schema changes.

**Why deferred:**
- After Phase a + b, every production migration has been validated on staging immediately pre-merge
- Staging deploy still fires post-merge, applying the same migration to staging
- Drift is therefore bounded by the time between (production deploy completes) and (staging deploy completes), typically <5 min
- A drift-detection job adds operational overhead without clear value until we observe actual drift

**Revisit if:** staging cluster experiences unexpected state, or a manual schema operation is performed out-of-band, or operator-driven hot-fix migrations bypass the CI pipeline.

---

## 8. Risk assessment

| Risk | Mitigation |
|---|---|
| PHI exposure in staging Aurora | Zero — staging is schema-only, no PHI loaded; this design adds no PHI handling |
| Cost increment | $0 — uses existing staging Aurora cluster (live since 2026-04-28); no new infrastructure |
| CI runtime increment | +30s per PR (Phase a) + ~30s (Phase b serialized) = ~60s additional CI time per PR |
| Blocking development | Required check could block emergency hotfixes. Mitigation: branch protection allows admin override for emergency deploys; document override procedure |
| Concurrency lock contention | Concurrency group could queue PRs. Mitigation: typical migration <1 min; staging Aurora will not be a bottleneck at current PR velocity |
| Staging Aurora downtime | If staging cluster is degraded, all PRs blocked. Mitigation: monitor staging cluster availability; emergency override path documented |
| Migration applies to staging on every PR | Staging accumulates migration history; failed/abandoned PRs leave artifacts. Mitigation: Prisma's migration runner is idempotent on retry; failed migrations get cleaned up by next successful retry |

---

## 9. Implementation plan + effort

| Phase | Description | Effort | Required check name |
|---|---|---|---|
| Phase a | CI `migrate deploy` against ephemeral postgres | 1-2h, 1 PR | `Migration Validation` |
| Phase b | CI `migrate deploy` against staging Aurora | 1-2h, 1 PR | `Staging Migration Validation` |
| **Total** | | **2-4h** | |
| Phase c | Schema drift verification | Deferred | — |

**Down from the original 8-12h estimate** in the AUDIT-025 register entry, which assumed greenfield staging provisioning.

Phase b should ship after Phase a (concurrency `needs: migration-validation`) so a Phase a failure short-circuits before reaching staging.

---

## 10. Open questions

1. **Q:** Phase a CI test DB lifecycle: keep `db push --force-reset` for unit tests, or switch to `migrate deploy` everywhere?
   **Recommended A:** Keep `db push --force-reset` for unit tests (preserves clean-slate guarantee for test isolation). Add a *separate* `migrate deploy` job for validation. Two jobs, two purposes.

2. **Q:** Phase b Secrets Manager IAM: does the CI's GitHub Actions role have `secretsmanager:GetSecretValue` on `tailrd-staging/app/database-url`?
   **A:** Need to verify in implementation. If not, add an IAM policy grant — minimal scope (`Resource: arn:aws:secretsmanager:us-east-1:863518424332:secret:tailrd-staging/app/database-url-*`).

3. **Q:** Phase b concurrency group naming convention?
   **Recommended:** `staging-migration`. Simple, single-purpose. If we later add other staging-write jobs, adopt a `staging-${jobname}` pattern.

4. **Q:** Should AUDIT-024 (CONCURRENTLY pattern) get a CI test once Phase b is live?
   **A:** AUDIT-024 remediation will likely require a multi-step deploy pattern (apply CONCURRENTLY index out-of-band, then `migrate resolve --applied`). Phase b validates the migration runner's behavior; the multi-step deploy is a separate workflow. AUDIT-024 design should reference AUDIT-025 Phase b as a precondition.

5. **Q:** Branch protection on existing PRs — re-push needed.
   **A:** When the new required check (`Migration Validation` or `Staging Migration Validation`) is added to branch protection rules, any in-flight PRs (those open at the moment of configuration change) will not have run the new check and will appear blocked. Operators must either:

   (a) Close and reopen the PR — triggers re-run of all checks. Simplest, no commit history change.

   (b) Push an empty commit to trigger CI re-run:
   ```
   git commit --allow-empty -m 'rerun ci'
   git push
   ```

   This is a one-time hassle during the rollout window when the new required check is first activated, NOT an ongoing concern. Recommend documenting in the Phase a and Phase b PRs themselves so reviewers + authors of in-flight work know to re-push after the check goes live.

---

## 11. Cross-references

- **AUDIT-024**: Sister finding (CONCURRENTLY pattern). Remediation depends on AUDIT-025 Phase b being live.
- **AUDIT-022**: Next migration that would benefit (243 PHI rows JSON encryption backfill). Should not ship until at least Phase a is live; ideally Phase b too.
- **AUDIT-011**: The finding that surfaced AUDIT-025 via the PR #220 production incident.
- **PR #220**: The deploy that crashed on `CREATE INDEX CONCURRENTLY` inside a transaction. Direct evidence of Gap 1.
- **PR #221**: The hotfix. Reverted CONCURRENTLY; documented AUDIT-024 + AUDIT-025 in register.
- `docs/audit/AUDIT_011_DESIGN.md` — sibling design doc structure.
- `.github/workflows/ci.yml` — current CI workflow with Gap 1.
- `.github/workflows/deploy-staging.yml` — current staging deploy with Gap 2 timing.

---

## 12. Lessons learned (audit trail hygiene)

The original AUDIT-025 register entry, authored mid-incident on 2026-05-03, framed this as "no staging environment for Aurora schema migrations." The CLAUDE.md project notes from 2026-04-28 explicitly documented that staging was already operational ("Staging is live (as of April 28, 2026): CloudFormation stack `tailrd-staging` (Aurora Serverless v2 + ECS Fargate + ALB)"). The register entry author did not consult CLAUDE.md before writing, and the resulting framing assumed greenfield provisioning.

### 12.1 Register entries authored mid-incident

Register entries authored mid-incident should explicitly note "investigation needed to confirm scope" and tag the effort estimate as speculative. Effort estimates in the heat of an incident anchor downstream design work and should be revisited in design phase.

### 12.2 Pre-investigation inventory

Pre-investigation, run a quick AWS inventory (`aws ecs list-clusters`, `aws rds describe-db-clusters`, `aws secretsmanager list-secrets`) and a CLAUDE.md grep for the relevant infrastructure terms. Both would have caught the staging-already-exists fact in <30 seconds.

### 12.3 Reframing through investigation

The "two-distinct-gaps" reframing (CI bypass + post-merge timing) is a stronger finding than the original "no staging" framing. Both gaps are independently fixable in <2h each. The original framing would have led to provisioning new staging infrastructure, ignoring the simpler CI fix. **Procedural improvement:** when register entries surface mid-incident, the corresponding design doc's §2 (Current state) should run an inventory pass *before* committing to a remediation architecture in §4 (Decision). This pattern protects against scoping errors that the heat of an incident makes more likely.

### 12.4 Actionable template change for future audit design docs

The "inventory before architecture" lesson (12.2 + 12.3) should not stay buried in this AUDIT-025 doc. Future audit design docs (under `docs/audit/AUDIT_*`) should follow this template structure as a discipline:

**Required §2 "Current state" section before §4 "Architecture decision":**

1. **AWS inventory pass** — `list-clusters`, `list-services`, `list-secrets`, `describe-db-clusters` for the relevant resource type
2. **Codebase grep for the artifact name** — `CLAUDE.md`, `docs/`, `scripts/`, `.github/` — surfaces existing scaffolding the audit is unaware of
3. **Git log search for related commits in last 90 days** — surfaces recent changes that may already address parts of the finding
4. **Document findings in §2 BEFORE proposing architecture in §4**

**Why:** Three separate audit design docs in the 2026-05-02 → 2026-05-03 session arc revealed scope revisions during investigation:

| Design doc | Pre-investigation estimate | Post-investigation estimate | Reframing |
|---|---|---|---|
| AUDIT-011 | L (16-24h) | M (11.5-15.5h) | §11 callsite audit found 0 RED routes; design pivoted to defense-in-depth, not retrofit |
| AUDIT-011 Phase a-pre | "mechanical 1-line edits" | schema migration + operation conversion | Prisma `update.where` TypeScript constraint discovery |
| AUDIT-025 (this doc) | M (8-12h) | S (2-4h) | Staging cluster discovered already operational |

Investigation-first design consistently produces better-scoped, more correct deliverables than implementation-first guesses. Codify the discipline.

**Suggested template additions:**

- Add **"Pre-flight inventory checklist"** as §2.0 of future design docs (the four-step list above)
- Mark register entries authored mid-incident with **`scope: speculative pending §2 inventory`**
- Effort estimates from register are tagged **`pre-investigation`** until the design doc's §2 confirms them

---

## 13. Success criteria

- [ ] Phase a complete: a deliberate CONCURRENTLY-in-transaction migration in a test PR fails the `Migration Validation` check
- [ ] Phase b complete: same migration also fails the `Staging Migration Validation` check
- [ ] Branch protection updated: both checks required for merge to main
- [ ] AUDIT-022 backfill PR (243 PHI rows) ships successfully through both gates
- [ ] 30 days post-Phase-b: zero schema-migration-induced production incidents
- [ ] AUDIT-024 remediation can reference AUDIT-025 as a working precondition
