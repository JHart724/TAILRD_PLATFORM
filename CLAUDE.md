# TAILRD Heart Platform

## 1. Project Overview

TAILRD Heart is a cardiovascular clinical analytics SaaS platform that identifies therapy gaps in cardiovascular patients for health systems. It ingests patient data via FHIR R4 (through Redox EHR integration or bulk Synthea ingestion), runs clinical gap detection rules grounded in ACC/AHA/ESC guidelines, and surfaces actionable insights across 6 clinical modules:

1. **Heart Failure** (HF) -- GDMT optimization, ATTR-CM screening, iron deficiency detection
2. **Electrophysiology** (EP) -- QTc safety, device utilization, arrhythmia management
3. **Structural Heart** -- valve intervention timing, imaging follow-up
4. **Coronary Intervention** -- DAPT duration, statin optimization, cardiac rehab referral
5. **Valvular Disease** -- surveillance imaging, surgical timing, anticoagulation management
6. **Peripheral Vascular** (PVD) -- ABI screening, claudication therapy, wound care pathways

Each module has 3 view tiers: Executive (CMO/VP level), Service Line (director level), and Care Team (physician/coordinator level).

**Target customer:** Health systems (hospitals, academic medical centers, integrated delivery networks).
**Core value proposition:** Automatically identify which cardiovascular patients are missing guideline-recommended therapies, and give clinical teams the tools to close those gaps.

## 2. Tech Stack

**Frontend:**
- React 18.2 + TypeScript 4.9
- Tailwind CSS 3.4 with custom "Frosted Glass" design system
- React Router 6, Recharts 3.4, Leaflet (maps), Framer Motion
- Lucide React icons
- CRA (Create React App) -- migration to Vite is planned

**Backend:**
- Node.js 18+ with Express 4.18
- TypeScript 5.2, compiled via tsx for dev
- Prisma 5.22 ORM with PostgreSQL
- Zod for request validation
- jsonwebtoken + bcryptjs for auth
- Helmet, CORS, CSRF, express-rate-limit for security
- Winston for logging
- node-cron for scheduled tasks

**Database:**
- PostgreSQL 15 (via Prisma migrations)
- Redis 7 (client module at lib/redis.ts, connects when REDIS_URL set)

**Infrastructure:**
- Docker (multi-stage build) + docker-compose (postgres, redis, nginx)
- AWS: S3, KMS, CloudFormation (VPC, WAF, CloudTrail)
- Redox for EHR integration
- GitHub Actions CI

**Key Backend Services:**
- patientService, observationService, encounterService -- FHIR R4 transform + persist
- gdmtEngine -- guideline-directed medical therapy recommendations
- therapyGapService, gapDetectionRunner -- gap rule evaluation
- crossReferralService -- cross-module patient referrals
- ecgAIService -- ECG inference pipeline
- phenotypeService -- phenotype detection and enrollment

## 3. Project Structure

The full repo directory tree is archived at `docs/archive/PROJECT_STRUCTURE.md` (moved out 2026-06-01 to keep this file under the 40k TUI threshold). High level: frontend React app in `src/` (components, `ui/` page-views by module, design-system, services, hooks, auth); backend Express app in `backend/src/` (routes, services, middleware, `cql/` gap engine, redox, ingestion, `lib/` Prisma singleton); `infrastructure/` (CloudFormation, IAM, deploy); `docs/` (audit + state docs); Docker + CI at repo root.

## 4. Development Setup

**Prerequisites:**
- Node.js >= 18
- PostgreSQL 15 (or use docker-compose)
- npm

**Quick start with Docker:**
```bash
docker-compose up -d postgres redis
```

**Backend:**
```bash
cd backend
cp .env.example .env            # Edit with your local values
npm install
npx prisma migrate deploy       # Run migrations
npx prisma db seed              # Seed demo data
npm run dev                     # Starts on port 3001
```

**Frontend:**
```bash
npm install                     # From project root
npm start                       # Starts on port 3000
```

**Required environment variables (backend/.env):**
- `DATABASE_URL` -- PostgreSQL connection string
- `JWT_SECRET` -- Strong random secret for JWT signing
- `PHI_ENCRYPTION_KEY` -- 256-bit hex key for AES-256-GCM PHI encryption
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` -- For S3 access
- `FRONTEND_URL`, `CORS_ORIGINS` -- Frontend origin for CORS
- `DEMO_MODE` -- Set to `true` for local dev only, NEVER with real data

## 5. Branch & Git Conventions

- **Workflow:** all work on short-lived feature branches off `main`; never push to `main` directly (branch protection enforced, see section 15 RULE 7).
- **Main branch:** `main`
- All work should be committed and pushed at the end of every session.
- Commit messages: use conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- Always run `/review` before creating a PR.

## 6. Living Audit Document

The living audit workflow is the findings register at `docs/audit/AUDIT_FINDINGS_REGISTER.md` plus the section 19 Finding-Remediation PAUSE Procedure (invoked via `/finding <id>`). Canonical state-of-the-build lives in `BUILD_STATE.md` (root). The former start/end-of-session ritual against `docs/PLATFORM_AUDIT_2026_04.md` is superseded; that April doc is retained for history only.

## 7. Gstack Skills

**Browser rule:** Use the `/browse` skill from gstack for ALL web browsing. Never use `mcp__claude-in-chrome__*` tools.

The full gstack skills table is archived at `docs/archive/GSTACK_SKILLS_REFERENCE.md`; the live skill list is injected by the harness each session. If gstack skills are not working: `cd .claude/skills/gstack && ./setup`. Routing rules are below.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming -> invoke office-hours
- Bugs, errors, "why is this broken", 500 errors -> invoke investigate
- Ship, deploy, push, create PR -> invoke ship
- QA, test the site, find bugs -> invoke qa
- Code review, check my diff -> invoke review
- Update docs after shipping -> invoke document-release
- Weekly retro -> invoke retro
- Design system, brand -> invoke design-consultation
- Visual audit, design polish -> invoke design-review
- Architecture review -> invoke plan-eng-review
- Save progress, checkpoint, resume -> invoke checkpoint
- Code quality, health check -> invoke health
- Security audit, secrets, supply chain -> invoke cso
- Post-deploy monitoring -> invoke canary
- Performance benchmarks -> invoke benchmark
- Web browsing (any) -> invoke browse (NEVER mcp__claude-in-chrome__*)

## 8. Clinical Context

The platform detects therapy gaps across 6 cardiovascular modules. Target: approximately 300 therapy gaps total across all modules.

**Gap rule requirements:**
- Every gap rule MUST be grounded in current ACC/AHA/ESC guidelines (2022-2024)
- Every gap rule MUST cite its guideline source inline in the code comments (e.g., "2022 AHA/ACC/HFSA HF Guideline, Class 2a, LOE B-R")
- Every gap rule MUST specify the LOINC, ICD-10, RxNorm, or CPT codes it evaluates
- Every gap rule MUST include an `evidence` object with triggerCriteria (what patient data triggered it), guidelineSource, classOfRecommendation, levelOfEvidence, and exclusions
- Gap rules must handle contraindications, intolerances, and clinical trial enrollment as exclusion criteria
- Gap rules must check `hasContraindication()` against relevant exclusion code sets before firing
- Clinical accuracy is non-negotiable. This platform will be used by cardiologists and health system CMOs.

**FDA CDS Exemption Compliance (21st Century Cures Act):**
- The platform provides clinical decision SUPPORT, not clinical decisions
- Every gap must be transparent: the clinician sees the patient data, the guideline, and the logic
- Use language like "recommended for review", "consider", "guideline suggests" -- NOT "order", "prescribe", "must"
- Never auto-order or auto-prescribe based on gap detection
- The clinician always makes the final decision and can dismiss any gap with a documented reason
- Do NOT use ML/AI for gap detection -- use deterministic, rule-based logic only
- The ECG AI pipeline (backend/src/ai/) is NOT covered by the CDS exemption and should not be activated without FDA clearance

**Gap rule status & counts:** per-module registry/evaluator counts, the 263 runtime `gaps.push` reconciliation, the closed Tier S patient-safety queue, and the Phase 0B clinical-code verification arc are tracked canonically in `docs/audit/AUDIT_FINDINGS_REGISTER.md` + `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` (point-in-time snapshots removed from this file 2026-06-01). The CQL engine (`cqlEngine.ts`) is scaffolding; gap rules run as deterministic TypeScript, not CQL.

**Cardiovascular terminology:** `backend/src/terminology/cardiovascularValuesets.ts` contains curated LOINC, ICD-10, RxNorm, and SNOMED code sets for gap detection. When adding new gap rules, add required codes there.

**Clinical-code methodology stack (mandatory; see `docs/audit/AUDIT_METHODOLOGY.md`):**
- **§1 rule-body verification standard** — audit conclusions must cite running code, not addendum text (output discipline)
- **§9.1 applyOverrides canonical-default** — pipeline ergonomics; `applyOverrides.ts` writes canonical by default, `--candidate` opt-in for legacy verifyDraft baseline
- **§9.2 full-pipeline-regen** — every source-changing PR must run extractCode → extractSpec → reconcile → refreshCites → applyOverrides → renderAddendum → renderSynthesis → validateCanonical (no partial pipeline runs)
- **§16 clinical-code verification standard** — every new RxNorm / LOINC / ICD-10 constant must be verified against an authoritative external source. RxNorms via RxNav `properties.json`. LOINC via loinc.org / NLM Clinical Tables. ICD-10 via CMS ICD-10-CM 2024. Codebase trust is INSUFFICIENT — including codebase fix-from comments (per AUDIT-069 LVEF regression catch). Cat A 15.5% wrong-drug rate; Cat D 33% inline-array rate; Batch 5 17.2% LOINC rate.
- **§17 clinical-code PR acceptance criteria** — drift-prevention discipline. Mandatory PR self-review: correctness + verification + scope discipline + process. PR template (`.github/pull_request_template.md`) enforces §17 checklist. §17.1 architectural-precedent reference: consumer audit corrects over-scoped framing mid-flight (PR #249).

**AUDIT-052 (canonical valuesets):** prefer importing from canonical valuesets over inline arrays; ~43 inline arrays remain as an opportunistic refactor. Tracked in the findings register.

**AUDIT-070 (FHIR ingestion expansion):** `observationService.ts CARDIOVASCULAR_LAB_CODES` lacks LOINC mappings for ABI / LVEF / QTc / QRS, so FHIR-ingested patients with those observations do not reach gap rules; the CSV path is unaffected. Planned dedicated PR. Tracked in the findings register.

**Redis:** `backend/src/lib/redis.ts` provides a shared client singleton. Connects when `REDIS_URL` is set, falls back gracefully. Used for future rate limiter store, caching, and session management.

## 9. Deployment & Production Readiness

Production is LIVE (since April 7, 2026): backend on ECS Fargate at api.tailrd-heart.com, Aurora Serverless v2 PostgreSQL (RDS-to-Aurora cutover 2026-04-29), CloudFront + ALB, ElastiCache Redis, Secrets Manager, CI/CD GitHub Actions -> ECR -> ECS (new task def per commit). Staging is live (CloudFormation stack `tailrd-staging`). Not yet done: frontend deploy + app.tailrd-heart.com DNS; staging CI/CD job.

**Last known working task definition:** `tailrd-backend:346` (2026-07-07, main HEAD `6e713ad`, AUDIT-148 Slice 1 trials backend (8th-module honest matcher) + the ClinicalTrial/TrialMatch MIGRATION, PR #446: Build & Deploy to ECS run 28957096331 success, ECS rollout COMPLETED + /health healthy; **MIGRATION APPLIED verified via DB** (clinical_trials + trial_matches tables exist, in-VPC count exit 0). Prior: `:345` (2026-07-03, the #445 docs task-def pointer-bump auto-deploy whose pointer bump was missed at merge; recorded in arrears), `:344` (2026-07-03, `1acbdc3`, AUDIT-194-B3 Threading Tranche 2 echo_months derivation restores VD-ECHO-INTERVAL, PR #444: Build & Deploy to ECS run 28886246220 success, ECS rollout COMPLETED + /health healthy), `:341`-`:343` (2026-07-03, the intervening merge-deploys #442 HF-Executive / #443 coverage-docs and a docs auto-deploy whose pointer bumps were missed at merge; recorded here in arrears), `:340` (2026-07-03, `f062f14`, AUDIT-195 lipid-intensification consolidation + AUDIT-196 ezetimibe COR 1->2a, PR #439: Build & Deploy to ECS run 28827621655 success, ECS rollout COMPLETED + /health healthy), `:338` (2026-07-01, `23b1952`, AUDIT-194-B1 Threading Tranche 1, PR #437 - was the live revision but its pointer bump was missed at merge; recorded here in arrears), `:332` (2026-06-30, Post-Deploy Smoke Test PASS at main HEAD `974828e`, running image SHA = merge SHA verified, AUDIT-192 batched ingestion-write path + AUDIT-193 follow-up filing, PR #431), `:324` (2026-06-23, /health healthy + login + 6/6-module dashboard source=database smoke PASS on Aurora at main HEAD `f16c6c0`, AUDIT-188 real gap-engine query for /heart-failure/gdmt-gaps (substantive backend, defuses latent-HIGH), PR #420), `:323` (`3b567d3`, AUDIT-188 docs filing #419, docs-only auto-deploy), `:322` (`bae8630`, AUDIT-187(b) drop fabricated revenue constants #418), `:319` (`6469796`, AUDIT-186 LVESD batch #414), `:317` (`5f42e05`, AUDIT-184 hollow-DET_OK repair, 12 slugs + 8 over-fires, #412), `:316` (`577a20c`, docs task-def bump #411), `:315` (`dab6afe`, PV module close #410, 6/6 smoke), `:314` (`9c67bde`, AUDIT-300 UI clinical-content-leak), `:313` (`0ae6144`, CAD chunk-1 close), `:312` (`4e0ae70`, CAD chunk-0). Update after every deploy.

The full deployment-state record (Aurora endpoints, Day 10 cutover summary, staging endpoints, RDS decommission status, env flags) is the authoritative section at the top of `PRODUCTION_READINESS.md` (root); update it there after every cutover or deploy milestone.

## 10. Frontend-Backend Wiring Status

The Heart Failure module is API-first with a mock-data fallback (real backend when `REACT_APP_USE_REAL_API=true`; mock renders only on loading/error/empty). The other five modules, the notification panel, all admin tabs, phenotype screening, and risk calculators still render hardcoded mock data pending wire-up. Full per-view wiring detail is at `docs/WIRING_STATUS.md`; the silent-mock / fabricated-KPI surface on the non-HF Executive views is tracked as AUDIT-099 in the findings register.

## 11. Testing

**Current state:** Near-zero test coverage.

- Backend: 1 Jest config file, no test files running
- Frontend: 1 test file (useGapActions.test.ts)
- No integration tests
- No E2E tests

**What's needed:**
- [ ] Backend unit tests for gap detection rules (verify each rule fires correctly)
- [ ] Backend integration tests for webhook pipeline (FHIR → DB)
- [ ] Backend integration tests for auth flow (login, logout, refresh, MFA)
- [ ] Frontend component tests for shared components (KPICard, GapCard, ModuleLayout)
- [ ] E2E tests for critical paths (login → module → gap detail)

## 12. Key Contacts & Business Context

- **CMO:** Dr. Tony Das (Baylor Scott & White)
- **CTO:** Bozidar Benko
- **Mount Sinai:** Co-development partner, subawardee on ARPA-H grant
- **Key prospects:** HCA (Medical City Dallas), CommonSpirit, CRF
- Production deployment is the priority. Hospital executives need to log in from tailrd-heart.com and see real gap analytics from their patient population.
- Demo capability with Synthea data serves initial pilots until Redox EHR integration is live.

## 13. Demo Accounts

When provisioning demo accounts or seeding demo data, create health-system-specific tenants for at minimum:
- **Medical City Dallas** (HCA) -- large community hospital, high PCI volume
- **CommonSpirit** -- multi-state system, diverse patient population
- **Mount Sinai** -- academic medical center, research-heavy, complex cases

Each tenant should have realistic cardiovascular patient population data and gap distribution for their geography and size. Demo data should feel real enough that a CMO looking at it believes it represents their institution.

## 14. NEVER DO

These rules are non-negotiable. Violating any of them creates clinical, security, or compliance risk:

- **Never commit secrets, API keys, or credentials to git.** Use environment variables and `.gitignore`.
- **Never use `Math.random()` for any clinical scoring or gap detection logic.** Clinical scores must be deterministic and grounded in patient data.
- **Never hardcode "Live" or real-time labels on static data.** If data is not actually live-updating, do not label it as such.
- **Never use `DEMO_MODE=true` in any environment with real patient data.** DEMO_MODE disables all authentication, authorization, tenant isolation, and CSRF protection.
- **Never create `new PrismaClient()` instances.** Always import the shared singleton from `backend/src/lib/prisma.ts`. The singleton applies PHI encryption middleware. Independent instances bypass encryption.
- **Never add `@ts-nocheck` to any file.** Fix the type errors instead. *Known exceptions (stale Prisma client errors under WSL — see §18): `backend/src/ingestion/gaps/gapRuleEngine.ts`, `backend/src/ingestion/runGapDetectionForPatient.ts`. Do not add any more. Sprint C-9 tracks removal of these two.*
- **Never leave PHI (patient names, MRN, DOB, addresses) in logs, error messages, or console output.** Log patient IDs (internal UUIDs) only, never identifiers.
- **Never query patient data without `hospitalId` in the WHERE clause.** Every patient-scoped query must enforce tenant isolation.
- **Never accept `hospitalId` from request body for authorization decisions.** Always use `req.user.hospitalId` from the verified JWT.
- **Never use directive language in gap recommendations.** Say "consider" or "recommended for review", not "order" or "prescribe". Directive language may trigger FDA SaMD classification.
- **Never use ML/AI for gap detection.** All gap rules must be deterministic, rule-based, and transparent. The clinician must be able to trace exactly why a gap fired.
- **Never create a gap rule without an `evidence` object.** Every gap must carry its trigger criteria, guideline source, class, and level of evidence for FDA CDS exemption compliance.

## Destructive-Command Discipline

Catalyst: a near-miss this session - a repo-deletion `gh api -X DELETE repos/:owner/:repo` was written as a careless task-list "noop placeholder". The auto-mode classifier blocked it and nothing was deleted, but a typed destructive command is one classifier-miss from execution. This is a standing forcing function, read at session start alongside the other disciplines.

1. **Destructive commands are NEVER placeholders, noops, or stand-ins for a benign action.** This includes: `gh api -X DELETE` (repo / branch / release deletion), `git push --force` to `main` or any shared branch, `rm -rf`, `DROP` / `TRUNCATE` on any database, `prisma migrate reset`, AWS resource deletion (`ecs` / `rds` / `kms` delete), and ANY command that removes rather than adds.

2. **"Do nothing" means do nothing.** If a task calls for a no-op or clearing a placeholder, the answer is to do nothing, or to use the appropriate benign tool (the task tool, a code comment) - NEVER to write a destructive command one does not intend to run. A destructive command typed as a placeholder is a latent catastrophe.

3. **Any genuinely-needed destructive command is explicitly operator-gated.** It must be authorized in the prompt with the specific target named, and the actual target verified against the intended target before execution. The production-data-mutation protocol (verified snapshot -> dry-run -> explicit execute-GO, per section 18 / `docs/runbooks`) applies.

4. **Defense in depth - credential scope is the mechanism backstop.** The agent's gh / aws / db credentials should be scoped to add/modify rights, not destroy rights (operator-side hardening). This instruction is the behavioral layer; the credential scope is the mechanism layer; both apply.

5. **Destructive != benign, ever, regardless of context.** No framing - "cleanup", "noop", "placeholder", "autonomous mode", "just a stand-in" - converts a destructive command into a benign one. When a destructive action is not explicitly authorized for a named target, the correct move is to STOP and ask, never to type the command "as a placeholder".

## 15. Deployment Rules (Learned from April 7, 2026 Production Incident)

### RULE 1: NEVER use `tsc || true` in the Dockerfile
If TypeScript fails, the build fails. If the build fails, the image is not pushed. Nothing breaks.

### RULE 2: Schema changes and code changes deploy together via Dockerfile CMD
The CMD runs `npx prisma migrate deploy` before `node dist/server.js`. Never manually run migrations separately.

### RULE 3: Test the container locally before every push that touches server startup
If you change server.ts, auth.ts, middleware/auth.ts, or phiEncryption.ts — build and run the container locally first. If exit code 1 locally, do not push.

### RULE 4: NEVER use `var` in TypeScript files
Always use `const` or `let`. `var` in if/else branches causes runtime crashes in strict mode compiled TypeScript.

### RULE 5: The deploy workflow must register a new task definition with the commit SHA
`--force-new-deployment` without a task def update just restarts with the old image. Register a new task def per commit.

### RULE 6: WSL cannot run `prisma generate` locally against Windows filesystem
Local `tsc` will show errors for new schema fields. These resolve in Docker build. Check if the field exists in schema.prisma — if yes, stale-client error. Do not add `as any` casts.

### RULE 7: Branch protection is enforced — always use a PR
Direct pushes to `main` are blocked. Use feature branches and `gh pr create`.

### RULE 8: Pre-push verification sequence
Zero TypeScript errors (excluding stale Prisma types), zero rogue PrismaClient, zero var declarations, zero @ts-nocheck.

### RULE 9: Never commit .claude/settings.local.json
This file stores Claude Code session context and can contain tokens that trigger GitHub secret scanning push protection, blocking ALL pushes. Add to .gitignore. Never include real or realistic-looking secret strings in docs — use `<placeholder-name>` format.

## 16. Production Incident History

Narrative post-mortems for the April 7 2026 outage (var-in-auth, migration-before-image, `tsc || true`, force-new-deployment) and the April 8 2026 CORS-no-Origin 500s are archived at `docs/archive/PRODUCTION_INCIDENT_HISTORY.md`. The load-bearing lessons are distilled inline as the RULE 1-9 set in section 15.

## 17. ECS Deployment Runbook
- **Container won't start, no logs:** Module import error or Prisma mismatch. Pull and run locally.
- **Roll back first:** `aws ecs update-service --cluster tailrd-production-cluster --service tailrd-production-backend --task-definition tailrd-backend:LAST_WORKING`. Never leave production down while debugging.
- **Last known working task def:** `tailrd-backend:346` (kept in sync with section 9 / `PRODUCTION_READINESS.md`).

## 18. Phase 2 Operating Rules

### Audit and fix cycle
1. Run Phase 2 audit agents for pending sections
2. Append output to `docs/MASTER_AUDIT_2026_04.md` -- never overwrite Phase 1 findings
3. Update the finding status tracker table (OPEN → IN_PROGRESS → FIXED → VERIFIED)
4. Fix in groups by section, smallest blast radius first
5. One branch and PR per fix group
6. Run 3-check rule before every push
7. Smoke tests must pass before merge
8. Health + login check after every deploy
9. Update "last known working task definition" in this file after every successful deploy

### 3-check pre-push gate
Before every `git push`, verify:
1. `grep -r "@ts-nocheck" backend/src/ | grep -v node_modules` → must return nothing
2. `grep -rn "new PrismaClient" backend/src/ | grep -v lib/prisma.ts | grep -v node_modules` → must return nothing
3. `grep -rn "\bvar " backend/src/ --include="*.ts" | grep -v node_modules | grep -v "process.env"` → must return nothing

### Stale Prisma type detection
When `tsc` shows errors for fields that exist in `schema.prisma`, these are stale-client errors from WSL. Do NOT add `as any` casts. Verify the field exists in schema.prisma, note it as a stale-client error, and move on. These resolve in Docker build where `prisma generate` runs correctly.

### Deploy verification (run after every deploy)
```bash
curl -s https://api.tailrd-heart.com/health | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('Health:', d['data']['status'])
" && \
curl -s -X POST https://api.tailrd-heart.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"\$SMOKE_TEST_EMAIL\",\"password\":\"\$SMOKE_TEST_PASSWORD\"}" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('Login:', d.get('success'))
" && \
TASK=\$(aws ecs list-tasks --cluster tailrd-production-cluster \
  --service-name tailrd-production-backend \
  --query 'taskArns[0]' --output text 2>/dev/null) && \
aws ecs describe-tasks --cluster tailrd-production-cluster \
  --tasks "\$TASK" \
  --query 'tasks[0].containers[0].image' \
  --output text 2>/dev/null | grep -o '[a-f0-9]\{8\}' | head -1 | \
  xargs -I{} echo "Running SHA: {}"
```

All three must pass: Health: healthy, Login: True (or valid error), Running SHA matches pushed commit.

**Credential handling (AUDIT-108 scrub, 2026-06-03):** the login probe now reads `$SMOKE_TEST_EMAIL` / `$SMOKE_TEST_PASSWORD` from the environment (the same GitHub secrets the post-deploy smoke uses), NOT a hardcoded plaintext credential. The prior hardcoded `JHart@tailrd-heart.com` / `Demo2026!` was used in diagnostic probes and is BURNED - that password MUST be rotated in production and the `SMOKE_TEST_*` secrets updated to the rotated value (see `docs/runbooks/AUDIT_108_BACKFILL_RUNBOOK.md` §7). Note the pass-criteria difference vs the post-deploy smoke (AUDIT-107): this §18 check uses `curl -s` and tolerates "a valid error" (e.g. a 401), whereas `.github/workflows/smoke-test.yml` uses `curl -sf` which hard-fails on any HTTP >= 400 - so a "valid error" that passes here still fails the smoke gate.

### Rollback protocol
If deploy verification fails:
1. Immediately update service to last known working task def
2. Do NOT debug on production -- pull the image and run locally
3. Fix, push, and redeploy through normal PR flow

## 19. Finding-Remediation PAUSE Procedure

This section encodes the finding-remediation workflow as a self-run procedure. The agent constructs its own PAUSE stages, halts at the real gates, and the operator approves inline. This does NOT remove any gate; it removes the mechanical chat-relay of pre-state while preserving every verification, clinical/PHI, and commit gate. Invoke via the `/finding <id>` slash command, or follow this procedure directly. Because this block is always loaded, forgetting the command never bypasses the gates.

This procedure preserves operator authority over the always-stop classes per `AUDIT_METHODOLOGY.md` §17.1 Entry 25 (agent-side gate-bypass under autonomous-mode framing is itself a logged failure mode). "Make the reasonable call" framing is NEVER license to bypass an always-stop gate.

### 19.1 Six-stage PAUSE decomposition

Every stage OPENS with canonical-grep (see §19.5). Never infer disk, remote, or methodology state from prior session memory or prior chat history.

- **PAUSE A (inventory + design surface):** canonical-grep repo state, the finding from `AUDIT_FINDINGS_REGISTER.md` (+ relevant `PHASE_N_REPORT.md`), and all paths the fix will touch. Surface the design, scope, and any Q-decision forks. Author NOTHING at A.
- **PAUSE B (authoring):** create the branch, author the changeset per the A-locked design.
- **PAUSE C (verification):** §17.5 self-review, DRIFT-44 scan, scope check, and (as applicable) cfn-lint / aws-validate / tsc / eslint / tests / §18 status-surface checks. Re-confirm any mirror-invariant. **Rendered-coherence read-back (mandatory for PARSED-CANONICAL-DOC edits per §19.4 AND for gate-defining edits to CLAUDE.md §19.x or `AUDIT_METHODOLOGY.md` disciplines):** after authoring, verbatim Read-File the edited section(s) from disk and confirm rendered coherence - no content splice or truncation, surrounding entries/bullets/headings intact, schema fields present and correctly ordered - because DRIFT-44, footprint, and §17.5 check non-ASCII, paths, and logic, NOT whether the rendered prose is coherent. Catalyst: the #317 near-miss showed all three mechanical scans PASS on a suspected content splice (it proved coherent, but the scans would not have caught a real splice or truncation). The mechanical scans are necessary but jointly INSUFFICIENT for parse-coupled or gate-defining text.
- **PAUSE D (reconciliation):** ledger/register/BUILD_STATE edits IF in scope; verify source-wins ordering per §18.
- **PAUSE E (commit / PR):** apply the footprint-split commit gate (§19.4). Stage the scoped files (NEVER `.claude/settings.local.json`, RULE 9), commit, push, open PR.
- **PAUSE F (merge + post-merge verify):** monitor CI; on merge run the on-main verification (git fetch + canonical-grep the landed change on origin/main).

### 19.2 Auto-proceed rule (A to B to C to D without an operator STOP)

The agent may move between stages WITHOUT an operator STOP only when ALL five hold:
1. Every Q-decision path resolves to the agent recommendation (no genuine fork).
2. Scope is unchanged from the PAUSE-A-locked scope.
3. The changeset touches NO clinical-logic, PHI, auth, or encryption path (see §19.4 backend superset).
4. No new V.5-RECOVERY catch surfaced.
5. All applicable verification passes (cfn-lint / aws-validate / tsc / eslint / tests / §18).

If any condition fails, STOP and surface.

### 19.3 Always-stop gates (operator-gated regardless of auto-proceed)

STOP for operator approval at any of:
- (a) PAUSE E commit/PR when the footprint is operator-gated per §19.4.
- (b) ANY clinical-logic, guideline-ambiguity, or PHI-handling design decision.
- (c) ANY new V.5-RECOVERY catch.
- (d) ANY scope expansion OR robust-vs-existing-pattern fork.
- (e) ANY verification FAIL.
- (f) ANY genuine Q-decision fork.

### 19.4 Footprint-split commit gate (mechanical, default-deny)

Classification is mechanical via `git diff --name-only` against explicit path globs. It is NEVER a per-PR judgment call.

- **AUTO-MERGE-ELIGIBLE** (PAUSE E may auto-proceed to merge): the changeset matches ONLY `docs/**` OR repo-root `*.md` OR `infrastructure/**/*.yml` OR `infrastructure/**/*.yaml`, EXCLUDING any path in the PARSED-CANONICAL-DOC class below, AND the deterministic CI backstops are green (cfn-lint + aws-validate for CFN; CI for docs).
- **ALWAYS-OPERATOR-GATED at PAUSE E:** the changeset touches ANY path matching `backend/**`. This superset covers every clinical-rule, auth, encryption, PHI, and `backend/prisma/schema.prisma` path.
- **DEFAULT-DENY:** any path class not explicitly in the auto-eligible set routes to operator-gated. This includes `infrastructure/**/*.js`, `infrastructure/**/*.json`, `infrastructure/**/*.sh`, `.claude/**` (including `.claude/**/*.md`), frontend `src/**`, and root config. The auto-eligible infra glob is STRICTLY `*.yml` + `*.yaml`, NEVER `infrastructure/**`: lambdas, IAM policies, and deploy scripts are executable or security-bearing without a deterministic cfn-lint-class backstop.
- **PARSED-CANONICAL-DOC (operator-gated despite the `docs/**` / repo-root `*.md` glob):** a `docs/**` or repo-root `*.md` path that is machine-parsed by ANY CI gate, test, or build script is NOT auto-merge-eligible; it routes to ALWAYS-OPERATOR-GATED, the same tier as `backend/**`, because parsed docs carry code-equivalent blast radius. Catch #89: a 6-line annotation to `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` shifted the hardcoded line ranges in `extractSpec.ts`, failing Gate 3 (spec.json staleness) + `extractSpec.test.ts`, yet the `docs/**` glob had classified it auto-eligible.
  - **Fast-path snapshot** (known parsed-canonical set at this commit; non-exhaustive, may rot): `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` (extractSpec line-range parse; Gate 3 + Gate 4 + Gate 6 + `extractSpec.test.ts`); `docs/audit/canonical/**` (crosswalk / spec / code / reconciliation JSON + `audit_runs.jsonl`; Gates 2/3/4/5 + reconcile/validate/render tests); `docs/audit/PHASE_0B_*_AUDIT_ADDENDUM.md` + `docs/audit/PHASE_0B_CROSS_MODULE_SYNTHESIS.md` (generated and line-parsed by `parseExistingAddendum.ts`; Gates 1/4).
  - **Authoritative re-derivation** (the snapshot can go stale silently, which is exactly the catch-#89 failure mode, so re-derive every run at PAUSE A): treat a changed `docs/**` or repo-root `*.md` path as PARSED-CANONICAL-DOC if it matches ANY path trigger in `.github/workflows/auditCanonical.yml` (the `Detect changed paths` regex plus the per-category `touched_*` flags) OR is read via `readFileSync` / `readLines` by any file under `backend/tests/**` or `backend/scripts/**`. The enumerated snapshot is only the fast path; the re-derivation is authoritative and wins on any divergence.
  - **Verified NON-parsed** (remain auto-eligible by footprint): `CLAUDE.md` and `docs/audit/AUDIT_METHODOLOGY.md` are referenced only in comments and generated string-literals - no gate, test, or script reads them - so they are NOT PARSED-CANONICAL-DOC. Recursion limit: an edit to this very section is still operator-gated by judgment (a classifier cannot self-certify the correctness of its own classification rule), even though its footprint is mechanically auto-eligible.
- **PRECEDENCE (default-deny wins):** auto-eligible requires that EVERY changed path match an auto-eligible glob AND that NO changed path match `backend/**`, any default-deny class, or the PARSED-CANONICAL-DOC class. A gated class always wins over the `*.md` glob: the `*.md` glob is scoped to `docs/**` and repo-root markdown only, NEVER `.claude/**` or any other gated directory. A `.md` file under a gated path (e.g. `.claude/commands/finding.md`) is operator-gated, not auto-eligible.

**Documented defense-in-depth signals** (legibility aids that explain WHY `backend/**` is gated; NOT the mechanical gate):
- Clinical rules: `backend/src/ingestion/gaps/gapRuleEngine.ts` (the 263 runtime `gaps.push`) plus content-grep `classOfRecommendation|levelOfEvidence|guidelineSource|gaps.push|RUNTIME_GAP_REGISTRY`.
- Schema: `backend/prisma/schema.prisma`.
- Auth / encryption / PHI: `backend/src/middleware/{auth,phiEncryption,csrfProtection,cognitoAuth}.ts` + `backend/src/lib/{prisma,prismaBaaGuard}.ts` + `backend/src/services/{kmsService,keyRotation,envelopeFormat}.ts` + `backend/src/utils/phiRedaction.ts`.

### 19.5 Canonical-grep-first discipline + catch logging

- Per `AUDIT_METHODOLOGY.md` §17.1 Entry 23 (V.5-RECOVERY) and DRIFT-45 (`docs/audit/AGENT_DRIFT_REGISTRY.md`): canonical-grep + Read-File + `git diff` at EVERY state-bearing assertion, in kickoff authoring AND in post-event recovery. Never infer disk state from memory; never infer remote state from prior gh output.
- **Rendered-coherence read-back is a canonical-verification act (per §17.1 Entry 32):** the PAUSE-C read-back (verbatim Read-File of the rendered result for PARSED-CANONICAL-DOC edits per §19.4 AND for gate-defining edits to CLAUDE.md §19.x or `AUDIT_METHODOLOGY.md` disciplines) extends the canonical-grep + Read-File discipline from disk-STATE verification to authored-OUTPUT verification. Mechanical scans (DRIFT-44 non-ASCII, footprint paths, §17.5 logic) do not certify that the rendered prose is coherent; only reading it back from disk does. A read-back divergence (content splice, truncation, schema-field omission, or disturbance of surrounding entries/bullets/headings) is a verification FAIL per always-stop gate (e).
- When disk/remote/methodology state diverges from the assumed pre-state, that is a V.5-RECOVERY catch: STOP (always-stop gate (c)), surface it verbatim, and let the operator decide. Increment the sustained catch count.
- Formatting follows DRIFT-44 (hyphen-only; no em-dashes or en-dashes; `§` is the only permitted non-ASCII). Severity at any status surface is copied verbatim from `AUDIT_FINDINGS_REGISTER.md` per §18; never re-classified.
- PR self-review follows §17.5 (explicit checklist with evidence) and scope discipline follows §17.3 (no half-fixes with follow-up-flag framing; expand scope or pull the item with KNOWN BROKEN markers + register entries).

### 19.6 Pilot posture

The first auto-merged CFN/docs PR under this procedure is a watched pilot. One-revert rollback is ready: revert this §19 block. The PR that establishes this machinery is itself the auto-merge-eligible footprint class (docs + `.claude/commands/` config); the pilot's first real test is a SUBSEQUENT finding-PR.

## 20. Pattern-Class Sweep Discipline

Catalyst (AUDIT-194, 2026-06-30): AUDIT-184-CAD-EXT fixed the CAD "hollow over-fire" cluster - rules whose discriminating gate negates a signal NO ingestion path threads, so the negation is always true and the rule fires for ~100% of its dx-eligible cohort (zero discriminating signal, false positives shipped to clinicians). It fixed CAD because the proof distribution flagged CAD at 92%. But the defect is a CODING PATTERN, not a module property. The cross-module sweep (AUDIT-194) found the SAME cluster live in HF and VHD - and `HF-38` (influenza) was the byte-for-byte-identical rule to `CAD-INFLUENZA`, which had ALREADY been RETIRED to SPEC_ONLY under AUDIT-184-CAD-EXT yet was left LIVE in HF. Fixing one instance of a defect class is not fixing the class.

**The discipline:** when a defect is diagnosed as a repeatable coding pattern (not a one-off), before closing it, sweep every peer site the pattern could occur - the other modules, the sibling rules, the parallel code paths. File the class as its own finding; enumerate every instance; remediate them together (or explicitly stage them with register entries). The hollow-read signature is the canonical example (static test: does the discriminating gate negate a signal that no ingestion path threads? -> tautology -> ~100% fire rate), but the discipline generalizes to any pattern-class defect.

**The counter-discipline (do NOT over-correct):** a class sweep is not license to suppress every rule that superficially matches. Distinguish per-instance, exactly as the CAD pass preserved post-MI REHAB (a dx-gated genuine care gap) and CAC/CCTA (real threaded signal, a data-threading limitation not a defect): (i) hollow-unthreaded -> suppress; (ii) dose/data-unknown -> suppress or flag; (iii) sparse-real -> per-rule clinical judgment, and where the negated signal is clinically real and THREADABLE, prefer threading the signal (restores correct firing) over suppression (hides it), tagging the interim suppression as pending-threading not permanent retire; (iv) legitimate -> leave alone. Suppressing a legitimate overdue-monitoring or genuine-care-gap rule is as wrong as shipping the over-fire.
