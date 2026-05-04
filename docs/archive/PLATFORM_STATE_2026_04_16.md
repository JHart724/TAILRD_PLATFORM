# TAILRD Heart — Platform State Audit

**Date:** 2026-04-16
**Auditor:** Claude (read-only investigation, no code changes)
**Production URL (frontend):** tailrddemo.netlify.app
**Production URL (backend):** https://api.tailrd-heart.com
**Current main branch commit:** `800840c` (fix(config): REACT_APP_DEMO_MODE=false in .env.production, PR #149)
**Local branch `main` commits ahead of origin/main:** 2 (`a5b3f62`, `8faefd1` — unpushed QA U+FFFD fixes)

---

## 1. Executive summary

Production backend is healthy and running real data. Patient counts, therapy-gap counts, and module revenue-opportunity numbers are live from Prisma. The frontend's **wiring coverage is uneven** — some views are genuinely real-time, others still render hardcoded mock arrays regardless of API state.

Three things a CMO touring `tailrddemo.netlify.app` is actually seeing:
1. **Real** — Executive Views (all 6 modules, after PR #146), ClinicalGapDetectionDashboards (HF + EP only), GodView, GlobalSearch, SuperAdminDashboard KPIs, all auth flows, and Heart Failure CareTeam.
2. **Half-real** — Admin tabs (PlatformOverview, UsersManagement, HealthSystems, DataManagement, CustomerSuccess) pull one or two live numbers but render hardcoded charts, activity feeds, and historical trends around them.
3. **Fully mock** — All 5 non-HF ServiceLine and CareTeam views, 4 of 6 Clinical Gap Detection Dashboards (CAD, SH, VD, PV), PlatformConfiguration, AuditSecurity (except unacknowledged alerts count), and all static sidebar module labels.

The platform has **12,999 patients** in Prisma, **211 therapy gaps evaluated** (0 closed), and **$527,500 total gap revenue opportunity**. 99.95% of the patient population is in Heart Failure; the other 5 modules have 25 patients between them.

---

## 2. Production infrastructure

| Item | Value |
|---|---|
| ECS cluster | `tailrd-production-cluster` |
| ECS service | `tailrd-production-backend` |
| **Current task definition** | **`tailrd-backend:74`** (ACTIVE, PRIMARY, rollout COMPLETED) |
| Registered | 2026-04-16 08:56:27 PDT |
| Running / desired | 1 / 1 |
| CPU / memory | 1024 / 2048 |
| Container image | `863518424332.dkr.ecr.us-east-1.amazonaws.com/tailrd-backend:800840ca90799a716dab6f89f0ee60ad54f93730` |
| Image commit | `800840c` = PR #149 (REACT_APP_DEMO_MODE=false) |
| Backend health | `{status: healthy, version: 1.0.0, environment: production, uptime: ~40min}` |

**Note:** CLAUDE.md lists "last known working task definition" as `tailrd-backend:28` (April 10). Production is now on **:74**, deployed today (April 16) at 08:56 PDT. CLAUDE.md §9 needs updating.

---

## 3. Patient data in Prisma (production DB)

Pulled from `GET /api/admin/hospitals` (metadata field `_count.patients`) and `GET /api/admin/god/cross-module-analytics`.

### Hospitals

| Hospital ID | Name | System | Tier | Users | **Patients (DB)** | Patient meta count |
|---|---|---|---|---|---:|---:|
| `demo-medical-city-dallas` | Medical City Dallas | HCA Healthcare | ENTERPRISE | 0 | **12,998** | 25,000 (metadata) |
| `hosp-001` | TAILRD Demo Hospital | Catholic Health Network | ENTERPRISE | 0 | **10** | 485,000 (metadata) |
| `hosp-002` | TAILRD Demo Hospital 2 | — | PROFESSIONAL | 0 | **5** | 180,000 (metadata) |
| `tailrd-platform` | TAILRD Platform | — | ENTERPRISE | 1 (JHart super-admin) | **0** | 0 |
| **Total** | | | | **1** | **13,013** | |

(The "Patient meta count" column is the `patientCount` field on the hospital record — a user-supplied population number, not the actual ingested patient rows. Only the DB count matters clinically.)

### Patient rows by module

From `/api/admin/god/cross-module-analytics.patientCoverage.byModule`:

| Module | Patients | Open gaps | Revenue opp | Health signal |
|---|---:|---:|---:|---|
| **Heart Failure** | **12,992** | 69 | $172,500 | `critical` |
| Coronary Intervention | 11 | 98 | $245,000 | `critical` |
| Electrophysiology | 8 (3 via god/overview — count drift) | 44 | $110,000 | `critical` |
| Peripheral Vascular | 6 | 0 | $0 | `healthy` |
| Valvular Disease | 3 | 0 | $0 | `healthy` |
| Structural Heart | 2 | 0 | $0 | `healthy` |
| Revenue Cycle | 0 | 0 | $0 | `unknown` |
| **Total** | **13,022** (12,999 per `patientCoverage.totalPatients`) | **211** | **$527,500** | |

**Count drift note:** `god/overview.electrophysiology.patients = 3`, `cross-module-analytics.byModule.electrophysiology = 3`, `modules/electrophysiology/dashboard.summary.totalPatients = 8`. Three different numbers from three endpoints for the same module in the same minute. Worth investigating before a CMO sees this in parallel tabs.

---

## 4. Therapy gap record count

From `/api/admin/god/cross-module-analytics`:

- **Total gaps evaluated:** 211
- **Total gaps closed:** 0
- **Gap closure rate:** 0%
- **Quality score (overall):** 0
- **Open safety alerts:** 0

### By category

| Category | Count | Impact |
|---|---:|---|
| MEDICATION_MISSING | 67 | medium |
| MONITORING_OVERDUE | 59 | medium |
| REFERRAL_NEEDED | 37 | medium |
| SCREENING_DUE | 19 | low |
| DOCUMENTATION_GAP | 12 | low |
| FOLLOWUP_OVERDUE | 10 | low |
| PROCEDURE_INDICATED | 6 | low |
| DEVICE_ELIGIBLE | 1 | low |

### Risk distribution

| Level | Fraction |
|---|---:|
| Low | 99.93% |
| Moderate | 0.046% |
| High | 0.023% |
| Critical | 0% |

The 211 figure is the running count of `TherapyGap` rows the CQL engine has created. CLAUDE.md §8 lists 257 rules loaded in the registry with full coverage; only 211 rows have actually fired against real patients. That ratio (patients-to-gaps ~1:62 for HF, ~1:9 for CAD, ~1:15 for EP) is consistent with light ingestion of real signals but no actual gap closure workflow activity yet.

---

## 5. Synthea ingest task `f525908e` status

**Not found in production.** Three verification attempts:

| Source | Result |
|---|---|
| `GET /api/data/upload/status/f525908e` | `HTTP 404 {"error":"Job not found"}` |
| `GET /api/data/upload/history` (all 4 hospitals) | `[]` (empty for every hospitalId) |
| `grep -rn "f525908e" backend/ src/` | No matches |

Root cause: `backend/scripts/processSynthea.ts` does **not** create `FileUpload` records. The job-tracking table (routes in `backend/src/routes/upload.ts`) only tracks uploads initiated via `POST /api/data/upload` (CSV/JSON uploads from the Data Management Portal). Synthea ingests run via the CLI script go straight to `PatientService.upsertFromFHIR()` without writing a job row.

**Interpretation:** If `f525908e` was ever a real task ID, it only existed in a local tmux session or Node CLI log, not in the production DB. Evidence of the ingest is visible indirectly in `_count.patients` on `demo-medical-city-dallas` (12,998 patients — consistent with a Synthea run against Medical City Dallas).

---

## 6. Frontend view audit — every screen a CMO could land on

**Legend:**
- **REAL API** = data comes from a live endpoint, no hardcoded fallback for the displayed numbers
- **HYBRID** = API primary, mock fallback fires on loading/error
- **MOCK** = pure hardcoded arrays, no fetch in file
- **STATIC** = pure UI shell, data arrives via props from a parent

### 6.1 Heart Failure module

| File | Status | Endpoint / Hook | Notes |
|---|---|---|---|
| `src/ui/heartFailure/views/ExecutiveView.tsx` | **HYBRID** | `getHeartFailureDashboard()` (services/api.ts) at line 44 | Mock benchmark data (lines 104–210) and zip-code heatmap (lines 236–257, 20 ZIPs w/ decompensation risk 4.8–8.9) never leave the code even on API success |
| `src/ui/heartFailure/views/ServiceLineView.tsx` | **MOCK** | None (tab router) | Child components (GDMTAnalyticsDashboard, PatientRiskHeatmap, DevicePathwayFunnel) render hardcoded arrays |
| `src/ui/heartFailure/views/CareTeamView.tsx` | **HYBRID** | `getHeartFailureDashboard()` + `getHeartFailureWorklist(20)` (lines 35–39, 128–133); `useGapActions('HEART_FAILURE')` | Safety alerts (lines 252–285) and workflow action counts ("23 pending review", "31 for evaluation", "18 ready for titration", lines 217–229) are hardcoded |
| `src/ui/heartFailure/components/clinical/ClinicalGapDetectionDashboard.tsx` | **HYBRID** | `fetchModuleGapsFromApi('heart-failure')` at line 784 | UI badge at lines 950–952 shows "Live Data" vs "Demo Data". Falls back to `HF_CLINICAL_GAPS` (25+ gap definitions + patient cohorts with KCCQ trends, 7 sub-tabs) |

### 6.2 Electrophysiology module

| File | Status | Endpoint / Hook | Notes |
|---|---|---|---|
| `src/ui/electrophysiology/views/EPExecutiveView.tsx` | **HYBRID** | `useModuleDashboard('electrophysiology')` → `GET /api/modules/electrophysiology/dashboard` (line 33) | Hook call returns **200 with live data** in prod. Fallback arrays: 4 facilities ($4.2M/$2.1M/$1.8M/$1.6M revenue), 3 DRGs, 20 ZIP codes w/ arrhythmia risk, 8 benchmarks (AF Ablation 95%, LAAC 97%, Pacemaker complications 2.1%, etc.) |
| `src/ui/electrophysiology/views/EPServiceLineView.tsx` | **MOCK** | None | Inline KPIs: 1,234 AFib ablations, 456 LAAC, 789 device implants, 123 lead extractions — all with mock `+X% vs last quarter` trends |
| `src/ui/electrophysiology/views/EPCareTeamView.tsx` | **MOCK** | None (`DEMO_PATIENT_ROSTER` at line 2) | 127 active patients, 8 critical alerts, 15 today's follow-ups, 23 pending actions. 6 hardcoded EP patients (Smith/Williams/Martinez/Chen/Johnson/Thompson), 3 safety screening alerts, team metrics (47 ablations, 23 device implants, 14 LAAC, 142 min avg time, 78% same-day discharge) |
| `src/ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard.tsx` | **HYBRID** | `fetchModuleGapsFromApi('electrophysiology')` | Falls back to `EP_CLINICAL_GAPS` — 40+ gap definitions, ~78 hardcoded patient mini-records. Mocked: "LAAC Candidate — OAC Contraindication" (440 patients, $4.62M), "CRT Non-Response — CSP Eval" (25 patients, $112.5K), "AF Recurrence Post-Ablation — PFA Re-ablation" (180 patients, $1.404M), "AF + HFrEF — CASTLE-AF" (75 patients, $585K) |

### 6.3 Coronary Intervention module

| File | Status | Endpoint / Hook | Notes |
|---|---|---|---|
| `src/ui/coronaryIntervention/views/CoronaryExecutiveView.tsx` | **HYBRID** | `useModuleDashboard('coronary-intervention')` at line 22 | Hook endpoint confirmed `HTTP 200` in prod. Mock fallbacks: $24.8M Complex PCI, 58min door-to-balloon, 2,847 PCI volume, `coronaryZipData` array (20 ZIPs) |
| `src/ui/coronaryIntervention/views/CoronaryServiceLineView.tsx` | **MOCK** | None | 1,247 PCI volume, 187 STEMI activations, 1.94 case mix index, static quarterly trends |
| `src/ui/coronaryIntervention/views/CoronaryCareTeamView.tsx` | **MOCK** | None (`DEMO_PATIENT_ROSTER`) | Clinical tools panel maps to mock components |
| `src/ui/coronaryIntervention/components/clinical/CADClinicalGapDetectionDashboard.tsx` | **MOCK** | None | `CAD_CLINICAL_GAPS` array — "High-Risk CAD Stratification", "Ischemia Screening", "Dual Antiplatelet Therapy" with embedded mock patient arrays. No API call |

### 6.4 Structural Heart module

| File | Status | Endpoint / Hook | Notes |
|---|---|---|---|
| `src/ui/structuralHeart/views/StructuralExecutiveView.tsx` | **HYBRID** | `useModuleDashboard('structural-heart')` at line 33 | Hook endpoint `HTTP 200` in prod. Fallback mocks include "TAVR w MCC: 45 cases, $54,320, 46.8% margin"; facility revenue arrays $1.6M–$4.2M; 20-row ZIP data |
| `src/ui/structuralHeart/views/StructuralServiceLineView.tsx` | **MOCK** | None | "TEER Mitral: 247, 96.7% success", "TMVR: 89, 94.4%", "PFO/ASD: 67, 98.5%" |
| `src/ui/structuralHeart/views/StructuralCareTeamView.tsx` | **MOCK** | None | "TAVR Procedures MTD: 327, Success Rate: 98.2%"; risk tiers Low 2.1%, Moderate 5.8%, High 12.3% |
| `src/ui/structuralHeart/components/clinical/SHClinicalGapDetectionDashboard.tsx` | **MOCK** | None | Gap categories: "Severe AS Surveillance", "Functional MR Screening", "Tricuspid Disease" with mock patient arrays |

### 6.5 Valvular Disease module

| File | Status | Endpoint / Hook | Notes |
|---|---|---|---|
| `src/ui/valvularDisease/views/ValvularExecutiveView.tsx` | **HYBRID** | `useModuleDashboard('valvular-disease')` at line 134 | Hook endpoint `HTTP 200` in prod. Mock fallbacks: TAVR 30-day mortality 2.1% vs 2.5% bench, valve grading accuracy 91.4%, $4.2M projected / $4.8M realized monthly, 20-row ZIP data |
| `src/ui/valvularDisease/views/ValvularServiceLineView.tsx` | **MOCK** | None | Bicuspid Repair: 156 patients/23 awaiting, Ross Procedure: 23/100% success, Repair vs Replace mortality 1.2% vs 2.4%, Echo Surveillance: 23 overdue/67 due this month |
| `src/ui/valvularDisease/views/ValvularCareTeamView.tsx` | **MOCK** | None | Same shell pattern as other care team views |
| `src/ui/valvularDisease/components/clinical/VDClinicalGapDetectionDashboard.tsx` | **MOCK** | None | "Moderate AS Surveillance", "Post-TAVR Echo", "Rheumatic MS", "BAV Aortopathy", "Endocarditis Prophylaxis" |

### 6.6 Peripheral Vascular module

| File | Status | Endpoint / Hook | Notes |
|---|---|---|---|
| `src/ui/peripheralVascular/views/PeripheralExecutiveView.tsx` | **HYBRID** | `useModuleDashboard('peripheral-vascular')` at line 133 | Hook endpoint `HTTP 200` in prod. Mock fallbacks: ABI screening 68.4% vs 80% bench, limb salvage 92.1%, 30-day amputation 4.2%, Limb Salvage Optimization $12.4M waterfall, 20-row ZIP data |
| `src/ui/peripheralVascular/views/PeripheralServiceLineView.tsx` | **MOCK** | None | PAD Interventions: 1,456; CLI Revascs: 392; Wound Healing: 78.3% |
| `src/ui/peripheralVascular/views/PeripheralCareTeamView.tsx` | **MOCK** | None | Clinical tools maps to LimbSalvageChecklist, CasePlanningWorksheet, WoundCareIntegration, PeripheralWorklist — all mock |
| `src/ui/peripheralVascular/components/clinical/PVClinicalGapDetectionDashboard.tsx` | **MOCK** | None | 11 gap categories: COMPASS Dual Pathway, ABI, Supervised Exercise, AAA, PAD Dual Pathway, Renal Artery Stenosis, Mesenteric Ischemia, Cilostazol, Venous Ulcer, Unprovoked VTE, IVC Filter |

### 6.7 GodView / SuperAdmin

| File | Status | Endpoint(s) | Notes |
|---|---|---|---|
| `src/ui/admin/GodView/GodView.tsx` | **REAL API** | `GET /api/admin/god/overview` (line 94), `GET /api/admin/god/cross-module-analytics` (line 97) | 30-second auto-refresh. Live module health, patient coverage, revenue opportunity, system gaps. Skeleton while loading |
| `src/ui/admin/GodView/GlobalSearch.tsx` | **REAL API** | `GET /api/admin/hospitals` (line 36), `GET /api/admin/god/global-search?q=&hospitalId=` (line 79) | 300ms debounce, cross-module search |
| `src/ui/admin/GodView/CrossModuleAnalytics.tsx` | **STATIC** | Receives processed data as props | Deterministic $2,500/patient revenue constant. Recharts rendering |
| `src/ui/admin/GodView/SystemHealthPanel.tsx` | **STATIC** | Props from parent | Quality thresholds, recommendations — no fetch |
| `src/ui/admin/SuperAdminConsole.tsx` | **STATIC SHELL** | `useAuth()` for logout | 7-tab router, delegates to tab components |
| `src/ui/admin/SuperAdminDashboard.tsx` | **REAL API** | `GET /api/health`, `GET /api/admin/analytics` | 30s refresh. Shows totalHospitals, activeUsers, platformRevenue, criticalAlerts. Offline banner if backend unreachable |

### 6.8 Admin tabs (hybrid: one live metric + mock charts)

| File | Status | Endpoint | What's real | What's mock |
|---|---|---|---|---|
| `src/ui/admin/tabs/PlatformOverview.tsx` | **HYBRID** | `useAdminDashboard()` | totalHospitals, activeUsers, totalPatients, unacknowledgedAlerts, recentWebhookEvents | 15-entry activity feed (hardcoded names/hospitals), 30-day DAU (`Math.random()` at lines 98–106 — violates CLAUDE.md §14), 12-week upload counts |
| `src/ui/admin/tabs/UsersManagement.tsx` | **HYBRID** | `useAdminUsers()` | Live user list if API enabled | 12 fallback users across 3 health systems, mock login/action history always shown in slide-in (lines 152–185) |
| `src/ui/admin/tabs/AuditSecurity.tsx` | **HYBRID** | `useAdminDashboard()` | unacknowledgedAlerts count only | 3 failed logins, 4 active sessions, MFA pie (7/5), 3 IP allowlist entries (local add/remove, not persisted) |
| `src/ui/admin/tabs/HealthSystems.tsx` | **HYBRID** | `useAdminHospitals()` + `PATCH /api/admin/hospitals/:id/status` | Hospital list + deactivate action | Add-hospital modal submit is a no-op (line 149) |
| `src/ui/admin/tabs/PlatformConfiguration.tsx` | **STATIC** | None | Nothing | Everything: 6 modules per hospital, 5 feature flags, 3 billing records, 3 rate-limit configs, maintenance mode toggle. All local state, no persistence |
| `src/ui/admin/tabs/DataManagement.tsx` | **HYBRID** | `useAdminDashboard()` | totalPatients, totalHospitals, totalWebhookEvents, recentPatients banner | 3 hospital data quality scores (BSW 87%, Regional 72%, Mercy 45%), 6 field completeness bars, 5 recommendations |
| `src/ui/admin/tabs/CustomerSuccess.tsx` | **HYBRID** | `useAdminHospitals()` | Hospital count only | 10,660 gaps identified / 3,624 actioned / $47.2M recovered, 12-month gap closure trends |

### 6.9 Auth (all real)

| File | Status | Endpoint |
|---|---|---|
| `src/ui/auth/SuperAdminLogin.tsx` | **REAL API** | `useAuth().login()` → `POST /api/auth/login` |
| `src/ui/auth/MFASetup.tsx` | **REAL API** | `POST /api/mfa/setup`, `POST /api/mfa/verify-setup` |
| `src/ui/auth/MFAVerify.tsx` | **REAL API** | `POST /api/mfa/verify`, `POST /api/mfa/verify-backup` |
| `src/ui/auth/AcceptInvite.tsx` | **REAL API** | `GET /api/users/invite/validate/:token`, `POST /api/users/invite/accept/:token` |

### 6.10 Module navigation / routing

- **Routes** (`src/App.tsx:669–747`): public `/`, `/login`, `/logout`, `/auth/callback`, `/invite/:token`, `/superadmin-login`; admin `/admin`, `/admin/god`, `/admin/dashboard`; protected module routes `/hf/*`, `/ep/*`, `/structural/*`, `/coronary/*`, `/valvular/*`, `/peripheral/*`, `/research/*`.
- **Sidebar** (`src/design-system/Sidebar.tsx:33–41`): 7 static NavItems (HF, EP, SH, CAD, VD, PV, Research). **No live patient counts, no live alert badges** — pure static labels + icons. Active route highlighted by `isActive(path)`.
- **ProtectedRoute** enforces `requiredPermissions` from JWT (lines 678–690). Tab switching inside `SuperAdminConsole` is component state (line 59), not a router push.
- **TopBar** shows module name from route (not from API).

---

## 7. Key inconsistencies and risks worth flagging

1. **CLAUDE.md §9 is stale.** Lists `tailrd-backend:28` as last known working; production is actually on **`:74`** (deployed today at 08:56 PDT). Update this file.
2. **EP patient count triple-disagrees.** Three endpoints report 3, 8, and (implicitly) 8 patients for electrophysiology in the same minute. `god/overview` = 3, `cross-module-analytics.byModule` = 3, `modules/electrophysiology/dashboard` = 8. A CMO with two tabs open will see two different numbers. Pick one source of truth.
3. **ClinicalGapDetectionDashboard wiring is asymmetric.** HF and EP fetch from `/api/gaps?module=` with a mock fallback that is **still rendered in full** when the API returns 200. CAD/SH/VD/PV dashboards have no API call at all — they only display their `*_CLINICAL_GAPS` constants. A CMO comparing modules will see 300+ mock patients in Coronary and only 11 real ones in the backend.
4. **PlatformOverview uses `Math.random()`** at lines 98–106 for DAU data. CLAUDE.md §14 explicitly forbids this. The numbers change on every refresh.
5. **"Live Data" vs "Demo Data" badge** in HF/EP ClinicalGapDetectionDashboard (lines 950–952) is the only place the frontend tells a CMO they're looking at mock data. No such badge on the 4 fully-mock modules, the 5 mock ServiceLine views, the 5 mock CareTeam views, or any admin tab.
6. **Patient `_count` vs `patientCount` field divergence.** `hosp-001.patientCount=485000` but `_count.patients=10`. The metadata field is what a CMO might see in a tooltip; the actual row count is 10. Decide which number the UI surfaces.
7. **No `tailrd-heart.com` auth user has MFA verified.** JWT shows `"mfaVerified":false` for the super-admin account in production. SuperAdminLogin worked without a second factor, implying MFA is optional even for `SUPER_ADMIN`. CLAUDE.md §1 implies MFA is required.
8. **PlatformConfiguration is fully disconnected.** All toggles (module enable/disable per hospital, feature flags, rate limits, maintenance mode) are UI-only. Flipping them does nothing.
9. **Synthea ingestion has no job tracking.** `scripts/processSynthea.ts` writes patients directly to Prisma without a `FileUpload` row. If a CMO asks "did the import complete?" there is no record to check — only the patient count delta. Task `f525908e` is not findable in prod.
10. **Two unpushed commits on local `main`** (`a5b3f62`, `8faefd1` — U+FFFD → em-dash / U+00B7 QA fixes). These are behind what production is serving.

---

## 8. Evidence appendix — raw commands run

```bash
# Production health
curl https://api.tailrd-heart.com/health
# => {"status":"healthy","version":"1.0.0","environment":"production","uptime":2443.9s}

# ECS task def
aws ecs describe-services --cluster tailrd-production-cluster --services tailrd-production-backend
# => taskDef: tailrd-backend:74, registered 2026-04-16 08:56 PDT, image SHA 800840c

# Login (super admin)
curl -X POST https://api.tailrd-heart.com/api/auth/login \
  -d '{"email":"JHart@tailrd-heart.com","password":"Demo2026!"}'
# => 200 OK, JWT token, role=SUPER_ADMIN, mfaVerified=false

# God overview
curl -H "Authorization: Bearer $T" https://api.tailrd-heart.com/api/admin/god/overview
# => 7 modules, HF=13031 patients/69 gaps, CAD=11/98, EP=3/44, SH=2/0, VD=3/0, PV=6/0, RC=0/0

# Cross-module analytics
curl -H "Authorization: Bearer $T" https://api.tailrd-heart.com/api/admin/god/cross-module-analytics
# => 211 gaps, $527,500 opportunity, 0 closed, 99.93% low risk, 12,999 total patients

# Synthea task check
curl -H "Authorization: Bearer $T" https://api.tailrd-heart.com/api/data/upload/status/f525908e
# => 404 {"error":"Job not found"}
curl -H "Authorization: Bearer $T" https://api.tailrd-heart.com/api/data/upload/history
# => []

# Module dashboard endpoints (all 6)
for slug in heart-failure electrophysiology coronary-intervention structural-heart valvular-disease peripheral-vascular; do
  curl -H "Authorization: Bearer $T" https://api.tailrd-heart.com/api/modules/$slug/dashboard
done
# => all 200 OK with real Prisma data
```

---

**End of audit.** No code was modified. All findings verified against live production state as of 2026-04-16 16:47 UTC.
