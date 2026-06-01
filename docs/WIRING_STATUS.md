# Frontend-Backend Wiring Status

Moved out of `CLAUDE.md` on 2026-06-01 to keep the always-loaded project-instruction file under the 40k TUI performance threshold. Point-in-time wiring detail; the authoritative current behavior is the code itself.

**Framing correction (2026-06-01):** the prior `CLAUDE.md` lead sentence ("The clinical UI currently runs on hardcoded mock data in demo mode") was stale. The Heart Failure module is **API-first with a mock-data fallback**: when `REACT_APP_USE_REAL_API=true` the frontend calls the real backend and renders mock data only on loading/error/empty. Five of six modules remain hardcoded mock pending wire-up. See AUDIT-099 in `docs/audit/AUDIT_FINDINGS_REGISTER.md` for the silent-mock / fabricated-KPI surface on the non-HF Executive views.

## Wired to real backend
- Login/logout/refresh (AuthContext.tsx)
- Health check (TopBar.tsx)
- Platform totals (platformTotals.ts)
- Gap actions (useGapActions.ts)
- File upload (DataManagementPortal.tsx)
- MFA setup/verify
- Invite accept
- Admin analytics
- GodView
- Notifications (GET /api/notifications - Sprint B-1a, PR #96)
- Admin user activity (GET /api/admin/users/:id/activity - Sprint B-1a, PR #96)
- **Heart Failure module (Sprint B-1 PR-A through PR-C, PRs #98-#102):**
  - Executive View: KPI cards, Gap Intelligence card (dashboard endpoint)
  - Care Team View: GDMT pillars, safety alerts, recent activity (dashboard endpoint)
  - Patient Worklist: real patient roster with gap badges (worklist endpoint)
  - Care Gap Analyzer: gap breakdown with patient drill-down (dashboard + worklist)
  - Clinical Gap Detection Dashboard: API-first with hfGapData.ts fallback
  - GDMT Analytics Dashboard: pillar coverage with patient drill-down (dashboard + worklist)
  - Device Pathway Funnel: device candidate count + patient list (dashboard + worklist)
  - Real-Time Hospital Alerts: real gap alerts (dashboard), vitals/labs = EHR pending
  - Team Collaboration Panel: full EHR placeholder (no messaging backend)
  - Referral Tracker: referral gap count (dashboard), details = EHR pending
  - Provider Scorecard: full EHR placeholder (no provider aggregation backend)

## NOT wired (hardcoded mock data)
- EP, Coronary, Structural, Valvular, Peripheral module views (5 of 6 modules)
- Notification panel (mock data in sub-components, not wired to GET /api/notifications yet)
- All admin tabs (users, audit, config, data, health systems, customer success)
- Phenotype screening panel
- Risk calculators

## To wire a module to real data
1. Replace the hardcoded gap data array with an API call to `GET /api/gaps?hospitalId=X&module=Y`
2. Replace the hardcoded patient list with `GET /api/patients?hospitalId=X`
3. Replace KPI calculations with `GET /api/analytics/dashboard?module=Y`
