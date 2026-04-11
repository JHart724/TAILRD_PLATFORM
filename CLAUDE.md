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

```
TAILRD_PLATFORM-main/
├── src/                              # Frontend React app
│   ├── App.tsx                       # Root component + routing
│   ├��─ components/                   # Feature components
│   │   ├── shared/                   # Reusable UI (KPICard, GapCard, ModuleLayout, etc.)
│   │   ├── heartFailure/             # HF-specific components
│   │   ├── electrophysiology/        # EP components
│   │   ��── therapyGap/               # Gap analysis panels
│   │   ├── phenotypeDetection/       # Phenotype screening
│   │   ├── riskCalculators/          # Clinical risk tools
│   │   ├── visualizations/           # Charts, tables, maps
��   │   └── notifications/            # Alert system
│   ├── ui/                           # Page-level views (by module)
│   │   ├── heartFailure/             # HF executive/service/care views + config
│   │   ├── electrophysiology/        # EP views
│   │   ├── coronaryIntervention/     # PCI views
│   ���   ├── structuralHeart/          # Structural views
│   │   ├── valvularDisease/          # Valvular views
│   │   ├── peripheralVascular/       # PVD views
│   │   ├── admin/                    # Admin dashboard + GodView
│   │   └── auth/                     # Login, MFA, invite accept
│   ├── design-system/                # AppShell, Sidebar, TopBar, tokens
│   ├── theme/                        # Semantic tokens, color palettes
│   ├── apiClient/                    # API communication layer
│   ├── services/                     # Frontend business logic (api.ts, apiService.ts)
│   ├── hooks/                        # Custom React hooks
│   ├── auth/                         # AuthContext + auth logic
│   ���── types/                        # TypeScript type definitions
│   ├── config/                       # Feature flags, data source config
│   ├── data/                         # Static data, platform totals
│   ├── adapters/                     # Data transformation adapters
│   ├── styles/                       # Global CSS, premium colors
│   └── utils/                        # Utility functions
├── backend/
│   ├── src/
│   │   ├── server.ts                 # Express app entry point
│   │   ├── routes/                   # 25 Express route files
│   │   ├── services/                 # 21 business logic services
│   │   ├── middleware/               # auth, audit, rate-limit, PHI encryption, CSRF
│   │   ├── cql/                      # Clinical Quality Language engine + gap rules
│   │   │   └── gapRules/             # Individual gap rule definitions
│   │   ├── redox/                    # EHR integration (FHIR handlers, batch gap detection)
│   │   ├── ingestion/                # CSV parser, patient writer, gap detection runner
│   │   ├── ai/                       # ECG inference pipeline
│   │   ├── config/                   # Role permissions
│   │   ├── lib/                      # Prisma client singleton (ALWAYS import from here)
│   │   ├── types/                    # Backend TypeScript interfaces
���   │   ├── utils/                    # Logger, helpers
│   │   └── validation/               # Zod schemas
│   ├── prisma/
│   │   ├─��� schema.prisma             # Database schema (40+ models)
│   │   ├── migrations/               # Migration history
│   │   └── seed.ts                   # Database seeder
│   ├── scripts/                      # CLI tools (processSynthea, createSuperAdmin, etc.)
│   └── package.json                  # Backend dependencies
├── infrastructure/
│   ├── cloudformation/               # VPC, S3/KMS, WAF/CloudTrail templates
│   ├── iam-policies/                 # AWS IAM role definitions
│   └── deploy.sh                     # Deployment script
├── docs/                             # Audit docs, module structure docs
├── docker-compose.yml                # Local dev stack (postgres, redis, nginx)
├── Dockerfile                        # Multi-stage production build
├── .github/workflows/ci.yml          # GitHub Actions CI
├── package.json                      # Frontend dependencies
├── tsconfig.json                     # Frontend TypeScript config
├── tailwind.config.js                # Tailwind theme config
└── CLAUDE.md                         # This file
```

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

- **Current working branch:** `feat/gap-navigation-polish`
- **Main branch:** `main`
- All work should be committed and pushed at the end of every session.
- Commit messages: use conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- Always run `/review` before creating a PR.

## 6. Living Audit Document

The platform audit lives at `docs/PLATFORM_AUDIT_2026_04.md`.

**At the start of every work session:**
1. Read `docs/PLATFORM_AUDIT_2026_04.md`
2. Check off any items completed in the prior session
3. Identify the highest priority unchecked P0 or P1 item
4. Confirm the plan with Jonathan before starting work

**At the end of every work session:**
1. Review git diff of all changed files
2. Check off completed action items in `docs/PLATFORM_AUDIT_2026_04.md`
3. Add any new issues discovered to the audit doc under the relevant section with appropriate priority
4. Update readiness scores if they changed materially
5. Add a session log entry at the top of the audit doc:
   `Date | Files changed | Items completed | New issues found`
6. Commit and push all changes including the updated audit doc

## 7. Gstack Skills

Available skills for specialized workflows:

| Skill | When to use |
|-------|-------------|
| `/review` | After any significant change, before PRs |
| `/ship` | Deploy, push, create PR |
| `/plan-eng-review` | Before starting any major feature |
| `/plan-ceo-review` | Product strategy and scope decisions |
| `/qa` | Test the site, find bugs |
| `/investigate` | Debug errors, root cause analysis |
| `/browse` | Visual QA, site dogfooding |
| `/retro` | Weekly engineering retrospective |
| `/design-review` | Visual audit, design polish |
| `/health` | Code quality dashboard |
| `/checkpoint` | Save and resume working state |

If gstack skills are not working, run:
```bash
cd .claude/skills/gstack && ./setup
```

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

**Current gap rule status (as of April 2026):**
- Heart Failure: 47 rules (100% coverage)
- Electrophysiology: 44 rules (100% coverage)
- Coronary Intervention: 76 rules (100% coverage)
- Structural Heart: 25 rules (100% coverage)
- Valvular Disease: 32 rules (100% coverage)
- Peripheral Vascular: 33 rules (100% coverage)

257 rules execute in the runtime (full coverage of all 256 frontend gap definitions) via `ingestion/gapDetectionRunner.ts`. Each rule has guideline provenance in `RUNTIME_GAP_REGISTRY` with class of recommendation and level of evidence. The CQL engine (`cqlEngine.ts`) is scaffolding -- gap rules run directly via deterministic TypeScript, not CQL.

**Cardiovascular terminology:** `backend/src/terminology/cardiovascularValuesets.ts` contains curated LOINC, ICD-10, RxNorm, and SNOMED code sets for gap detection. When adding new gap rules, add required codes there.

**Redis:** `backend/src/lib/redis.ts` provides a shared client singleton. Connects when `REDIS_URL` is set, falls back gracefully. Used for future rate limiter store, caching, and session management.

## 9. Deployment & Production Readiness

**Current state:** The platform runs locally only. There is no production deployment.

**What exists:**
- Dockerfile (multi-stage build, needs `npm ci` fix for devDeps in build stage)
- docker-compose.yml (postgres, redis, nginx)
- CloudFormation templates for VPC, S3/KMS, WAF/CloudTrail
- GitHub Actions CI (lint, typecheck, test, security scan -- deploy step is a no-op)
- Synthea pipeline reads from S3 and persists to database
- seedFromSynthea.ts creates 3 demo health system tenants

**Production is live (as of April 7, 2026):**
- [x] ECS Fargate (backend) -- api.tailrd-heart.com
- [x] RDS PostgreSQL Multi-AZ
- [x] CloudFront + ALB
- [x] ElastiCache Redis
- [x] Secrets Manager (JWT_SECRET, PHI_ENCRYPTION_KEY, DATABASE_URL)
- [x] CI/CD: GitHub Actions → ECR → ECS (new task def per commit)
- [ ] Frontend deployment (Netlify/Vercel with REACT_APP_USE_REAL_API=true)
- [ ] DNS for app.tailrd-heart.com (frontend)

**Last known working task definition:** `tailrd-backend:28` (deployed April 10, 2026 — Sprint B-1 PR-A: Heart Failure module wired to real Prisma data)

## 10. Frontend-Backend Wiring Status

**The clinical UI currently runs on hardcoded mock data in demo mode.** When `REACT_APP_USE_REAL_API=true`, the frontend calls the real backend. But most module dashboards have inline mock data that renders regardless of the API flag.

**Wired to real backend:**
- Login/logout/refresh (AuthContext.tsx)
- Health check (TopBar.tsx)
- Platform totals (platformTotals.ts)
- Gap actions (useGapActions.ts)
- File upload (DataManagementPortal.tsx)
- MFA setup/verify
- Invite accept
- Admin analytics
- GodView

**NOT wired (hardcoded mock data):**
- All 6 module executive/service-line/care-team views
- Notification panel
- All admin tabs (users, audit, config, data, health systems, customer success)
- Patient worklists
- Gap detection dashboards (show frontend gap data, not TherapyGap table)
- Phenotype screening panel
- Risk calculators

**To wire a module to real data:**
1. Replace the hardcoded gap data array with an API call to `GET /api/gaps?hospitalId=X&module=Y`
2. Replace the hardcoded patient list with `GET /api/patients?hospitalId=X`
3. Replace KPI calculations with `GET /api/analytics/dashboard?module=Y`

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

### April 7, 2026 — ~4 hour outage during Phase 1 remediation sprint
**Root causes:** `var newToken` in auth.ts, schema migration before matching image, `tsc || true` suppressing 28 errors, CI using force-new-deployment without new task def.
**Resolution:** Fixed var to let, removed tsc||true, added prisma migrate to CMD, updated CI, fixed all TS errors.
**Prevention:** Local container test before every push.

### April 8, 2026 — All endpoints returning 500 after Phase 1 deploy
**Root cause:** CORS origin callback in `server.ts:79` blocked requests without an `Origin` header in production (`!origin && NODE_ENV !== 'production'`). Every non-browser request (curl, ALB health checks) hit `new Error('Not allowed by CORS')` → global error handler → 500.
**Resolution:** PR #59 removed the production-only restriction. CORS is a browser mechanism; requests without Origin headers should always pass.
**Compounding factor:** Deploy workflow used `force-new-deployment` without registering a new task def, so the fix image wasn't picked up until task def 10 was manually registered.
**Prevention:** Deploy workflow now registers a new task def per commit (PR #XX).

## 17. ECS Deployment Runbook
- **Container won't start, no logs:** Module import error or Prisma mismatch. Pull and run locally.
- **Roll back first:** `aws ecs update-service --cluster tailrd-production-cluster --service tailrd-production-backend --task-definition tailrd-backend:LAST_WORKING`. Never leave production down while debugging.
- **Last known working task def:** `tailrd-backend:28`

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
  -d '{\"email\":\"admin@stmarys.org\",\"password\":\"demo123\"}' | python3 -c "
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

### Rollback protocol
If deploy verification fails:
1. Immediately update service to last known working task def
2. Do NOT debug on production -- pull the image and run locally
3. Fix, push, and redeploy through normal PR flow
