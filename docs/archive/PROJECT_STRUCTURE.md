# Project Structure (archived reference)

Moved out of `CLAUDE.md` on 2026-06-01 to keep the always-loaded project-instruction file under the 40k TUI performance threshold. This is reference material the agent can also re-derive from the repo directly; it is not gate-bearing. ASCII-only tree (the prior `CLAUDE.md` copy used box-drawing characters that had become mojibake-corrupted).

```
TAILRD_PLATFORM-main/
  src/                            Frontend React app
    App.tsx                       Root component + routing
    components/                   Feature components
      shared/                     Reusable UI (KPICard, GapCard, ModuleLayout, etc.)
      heartFailure/               HF-specific components
      electrophysiology/          EP components
      therapyGap/                 Gap analysis panels
      phenotypeDetection/         Phenotype screening
      riskCalculators/            Clinical risk tools
      visualizations/             Charts, tables, maps
      notifications/              Alert system
    ui/                           Page-level views (by module)
      heartFailure/               HF executive/service/care views + config
      electrophysiology/          EP views
      coronaryIntervention/       PCI views
      structuralHeart/            Structural views
      valvularDisease/            Valvular views
      peripheralVascular/         PVD views
      admin/                      Admin dashboard + GodView
      auth/                       Login, MFA, invite accept
    design-system/                AppShell, Sidebar, TopBar, tokens
    theme/                        Semantic tokens, color palettes
    apiClient/                    API communication layer
    services/                     Frontend business logic (api.ts, apiService.ts)
    hooks/                        Custom React hooks
    auth/                         AuthContext + auth logic
    types/                        TypeScript type definitions
    config/                       Feature flags, data source config
    data/                         Static data, platform totals
    adapters/                     Data transformation adapters
    styles/                       Global CSS, premium colors
    utils/                        Utility functions
  backend/
    src/
      server.ts                   Express app entry point
      routes/                     25 Express route files
      services/                   21 business logic services
      middleware/                 auth, audit, rate-limit, PHI encryption, CSRF
      cql/                        Clinical Quality Language engine + gap rules
        gapRules/                 Individual gap rule definitions
      redox/                      EHR integration (FHIR handlers, batch gap detection)
      ingestion/                  CSV parser, patient writer, gap detection runner
      ai/                         ECG inference pipeline
      config/                     Role permissions
      lib/                        Prisma client singleton (ALWAYS import from here)
      types/                      Backend TypeScript interfaces
      utils/                      Logger, helpers
      validation/                 Zod schemas
    prisma/
      schema.prisma               Database schema (40+ models)
      migrations/                 Migration history
      seed.ts                     Database seeder
    scripts/                      CLI tools (processSynthea, createSuperAdmin, etc.)
    package.json                  Backend dependencies
  infrastructure/
    cloudformation/               VPC, S3/KMS, WAF/CloudTrail templates
    iam-policies/                 AWS IAM role definitions
    deploy.sh                     Deployment script
  docs/                           Audit docs, module structure docs
  docker-compose.yml              Local dev stack (postgres, redis, nginx)
  Dockerfile                      Multi-stage production build
  .github/workflows/ci.yml        GitHub Actions CI
  package.json                    Frontend dependencies
  tsconfig.json                   Frontend TypeScript config
  tailwind.config.js              Tailwind theme config
  CLAUDE.md                       Project instructions (lives at repo root)
```
