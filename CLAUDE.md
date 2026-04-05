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
- Gap rules must handle contraindications, intolerances, and clinical trial enrollment as exclusion criteria
- Clinical accuracy is non-negotiable. This platform will be used by cardiologists and health system CMOs.

**Current gap rule status (as of April 2026):**
- Heart Failure: 7 rules (ATTR-CM, Iron Deficiency, Finerenone/CKD+T2DM, SGLT2i, Beta-Blocker, MRA, Digoxin Toxicity)
- Electrophysiology: 2 rules (QTc Safety, AFib OAC)
- Coronary: 2 rules (DAPT/P2Y12, High-Intensity Statin)
- Structural Heart: 1 rule (Aortic Stenosis echo surveillance)
- Valvular: 1 rule (Mechanical valve anticoagulation)
- Peripheral Vascular: 2 rules (PAD statin therapy, ABI screening)

15 rules execute in the runtime (`ingestion/gapDetectionRunner.ts`). Each rule has guideline provenance in `RUNTIME_GAP_REGISTRY`. The CQL engine (`cqlEngine.ts`) is scaffolding -- gap rules run directly via TypeScript, not CQL. 256 gaps are defined in the frontend UI across all 6 modules.

**Cardiovascular terminology:** `backend/src/terminology/cardiovascularValuesets.ts` contains curated LOINC, ICD-10, RxNorm, and SNOMED code sets for gap detection. When adding new gap rules, add required codes there.

**Redis:** `backend/src/lib/redis.ts` provides a shared client singleton. Connects when `REDIS_URL` is set, falls back gracefully. Used for future rate limiter store, caching, and session management.

## 9. Key Contacts & Business Context

- **CMO:** Dr. Tony Das (Baylor Scott & White)
- **CTO:** Bozidar Benko
- **Mount Sinai:** Co-development partner, subawardee on ARPA-H grant
- **Key prospects:** HCA (Medical City Dallas), CommonSpirit, CRF
- Demo capability is critical. Hospital executives need to log in from tailrd-heart.com and see realistic mock data for their health system.

## 10. Demo Accounts

When provisioning demo accounts or seeding demo data, create health-system-specific tenants for at minimum:
- **Medical City Dallas** (HCA) -- large community hospital, high PCI volume
- **CommonSpirit** -- multi-state system, diverse patient population
- **Mount Sinai** -- academic medical center, research-heavy, complex cases

Each tenant should have realistic cardiovascular patient population data and gap distribution for their geography and size. Demo data should feel real enough that a CMO looking at it believes it represents their institution.

## 11. NEVER DO

These rules are non-negotiable. Violating any of them creates clinical, security, or compliance risk:

- **Never commit secrets, API keys, or credentials to git.** Use environment variables and `.gitignore`.
- **Never use `Math.random()` for any clinical scoring or gap detection logic.** Clinical scores must be deterministic and grounded in patient data.
- **Never hardcode "Live" or real-time labels on static data.** If data is not actually live-updating, do not label it as such.
- **Never use `DEMO_MODE=true` in any environment with real patient data.** DEMO_MODE disables all authentication, authorization, tenant isolation, and CSRF protection.
- **Never create `new PrismaClient()` instances.** Always import the shared singleton from `backend/src/lib/prisma.ts`. The singleton applies PHI encryption middleware. Independent instances bypass encryption.
- **Never add `@ts-nocheck` to any file.** Fix the type errors instead.
- **Never leave PHI (patient names, MRN, DOB, addresses) in logs, error messages, or console output.** Log patient IDs (internal UUIDs) only, never identifiers.
- **Never query patient data without `hospitalId` in the WHERE clause.** Every patient-scoped query must enforce tenant isolation.
- **Never accept `hospitalId` from request body for authorization decisions.** Always use `req.user.hospitalId` from the verified JWT.
