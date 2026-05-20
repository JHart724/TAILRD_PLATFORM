# Phase 0C Report - UI/UX Audit

**Phase:** 0C of Phase 0A audit arc (sister to Phase 0A backend audit Phase 1-5)
**Dimension:** UI/UX audit + design system documentation
**Executed:** 2026-05-20 (outline; finding-authoring at B0C.4)
**Auditor:** jhart
**Framework:** `docs/audit/AUDIT_FRAMEWORK.md` v1.0; methodology stack §1, §16 (PARTIAL-TRIGGERED for 0C-CLI clinical-UI domain), §17, §17.1, §17.3, §17.5, §18 per `docs/audit/AUDIT_METHODOLOGY.md`
**Companion docs:** `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `docs/audit/PHASE_1_REPORT.md`, `docs/audit/PHASE_2_REPORT.md`, `docs/audit/PHASE_3_REPORT.md`, `docs/audit/PHASE_4_REPORT.md`, `docs/audit/PHASE_5_REPORT.md`, `docs/PATH_TO_ROBUST.md`

---

## 1. Executive Summary

**Verdict: CONDITIONAL PASS** sister to Phase 1/2/3/4/5 precedent. 4 HIGH P1 GATE clusters (0C-A11Y WCAG 2.2 AA conformance + 0C-CLI §16 PARTIAL-TRIGGER Class / LOE / risk-score rendering + 0C-PERF Web Vitals / RUM baselines + 0C-TEST frontend test coverage) with documented remediation roadmaps; v2.0 Phase 2 territory per L117 for substantive remediation. Full verdict prose at §8.

Phase 0C scope: canonical `PATH_TO_ROBUST.md` L73-L80 framing (Option B-CANONICAL per B0C.2 scope-lock; ~25-30h budget). UI/UX audit + design system DOCUMENTATION (audit-only framing; implementation work is Phase 2 territory per L117). 16-domain cross-walk per Q8 finding-ID convention.

**TAILRD design system aspiration:** the existing design system positions itself as luxury-automotive-inspired (Porsche Chrome Blue 3R7 + Carmona Red Metallic palette per `src/design-system/tokens.ts:1-5` header). Phase 0C audits the gap between aspiration and current deployment state across visual treatment + accessibility + clinical UI + performance dimensions.

**4 HIGH P1 GATE CANDIDATES at outline** (Tier 1 classification per Q-A; downgrade-at-evidence at B0C.4 per `decision_frameworks`):

1. **0C-A11Y-NN** WCAG 2.2 AA conformance unverified (clinical platform with PHI display; OCR / Section 508 / ADA enforcement risk if non-conformant)
2. **0C-CLI-NN** Clinical-UI guideline accuracy (§16 PARTIAL-TRIGGERED; risk calculators + therapy gap rendering + clinical alerting verified against ACC/AHA + HRS + 2024 PAD guidelines)
3. **0C-PERF-NN** Web Vitals baseline absent (no Lighthouse config + no RUM + no performance budget; clinical platform performance under heavy recharts + react-leaflet load)
4. **0C-TEST-NN** Frontend test coverage (1 test file in 365 .tsx; sister AUDIT-001 Tier A foundational gap)

**Findings recorded this phase: 63 unique IDs across 16 domains.** Severity distribution: 8 HIGH (P1) GATE candidate / confirmed; 16 MEDIUM (P2); 13 LOW (P3) + LOW-DOCUMENTATION; 22 DOCUMENTATION. 8 HIGH P1 GATE expansion from B0C.3 4-candidate baseline reflects evidence-gathering at B0C.4: 0C-CLI Class/LOE/risk-score split into 3 independent findings (0C-CLI-01 + 0C-CLI-02 + 0C-CLI-03); 0C-TEST unit/integration/E2E split into 3 independent findings (0C-TEST-01 + 0C-TEST-02 + 0C-TEST-03); 0C-PERF baseline + RUM split into 2 (0C-PERF-01 + 0C-PERF-02); 0C-A11Y-01 single primary WCAG conformance finding.

**Verdict-rubric per §2.3:**
- PASS: zero gate-class findings; all in-scope dimensions meet enterprise-grade UI/UX bar
- CONDITIONAL PASS: gate-class findings exist with documented remediation roadmap; phase passes pending those remediations (sister to Phase 1/2/3/4/5 precedent)
- FAIL: HIGH P1 findings concentrated above remediation-tolerable density

---

## 2. Methodology

### 2.1 Audit scope

Canonical `PATH_TO_ROBUST.md` L73-L80 verbatim citation:

```
Phase 0C - UI/UX audit (Week 2-3, ~25-30h)
- Catalog all current UI surfaces (every page, every component)
- Document existing design system (colors, typography, spacing, components, patterns)
- Identify inconsistencies and gaps
- Per-module UI maturity assessment
- Service line + research view audit
- Output: UI/UX audit report + design system documentation
```

Scope locked at canonical L73-L80 verbatim per B0C.2.0 DRIFT-45 firing #4 (operator-prompt Options A/B/0 framing was canonical-doc-misaligned; Option B-CANONICAL = canonical scope; Option A bleeds into Phase 2 territory per L117; Option 0 is narrower than canonical). No mid-block scope reduction or expansion per §17.3.

### 2.2 Methodology stack

| Section | Phase 0C status |
|---|---|
| §1 rule-body verification | Applied at WCAG / Section 508 / ARIA / CDS Hooks / SMART on FHIR / HL7 FHIR R4 / clinical guideline citation layer |
| §16 clinical-code verification | **PARTIAL-TRIGGERED for 0C-CLI domain only** (clinical-UI surfaces displaying recommendation Class / LOE / risk scores / drug interactions / gap detection / clinical alerting verified against ACC/AHA + HRS + 2024 PAD guideline text + scoring algorithms) |
| §17 PR acceptance criteria | Applied |
| §17.1 architectural-precedent | 8 candidates surfaced at B0C.1.7; design-token-strategy promoted to real codification target via 0C-COL token-conflict finding per Q-B; flagged for SEPARATE methodology PR per §17.3 |
| §17.3 scope discipline | Locked at canonical L73-L80; no expansion or reduction |
| §17.5 pre-PR self-review | Fired at B0C.3.5 outline + B0C.4.3 finding-authoring + B0C.5.5 register-entry layer |
| §18 status-surface discipline | Severity mirrored verbatim from PHASE_0C_REPORT.md §3 to register entries; 5-layer consistency check at B0C.5.5 |

DRIFT-44 em-dash pre-flight scan + DRIFT-45 chat-side canonical-doc grep pre-flight mechanisms active throughout work block.

### 2.3 Anchor standards

Severity-calibration framework establishment sister to Phase 5 §2.3:

| Anchor | Reference | Scope |
|---|---|---|
| WCAG 2.2 Level AA | W3C Recommendation 2023-10-05 | Primary accessibility conformance target; supersedes WCAG 2.1 (2018); 9 new success criteria from WCAG 2.1 |
| Section 508 Revised | 2017 ICT Final Rule; 36 CFR Part 1194 | US federal accessibility floor; references WCAG 2.0 Level A + AA at minimum (TAILRD targets WCAG 2.2 AA exceeding floor) |
| ARIA 1.2 | W3C Recommendation 2023-06-06 | Accessible Rich Internet Applications; supersedes ARIA 1.1; clinical-app interactive widget surface |
| CDS Hooks 2.0 | HL7 CDS Hooks specification 2024 | Card rendering / suggestion UI / app links / system actions per Phase 4 4-OMP-01 dismissal-at-consumption sister; AUDIT-071 cdsHooks UI conventions sister |
| SMART on FHIR 2.0 | App Launch Framework 2.0.0 (HL7 FHIR R4) | App launch from EHR; standalone launch + EHR launch; scopes + OIDC; SMART surface verified at `backend/src/routes/smartLaunch.ts` |
| HL7 FHIR R4 UI patterns | FHIR R4 release 2019-10-30 | FHIR resource rendering conventions; clinical data display |
| HIPAA-adjacent UI considerations | 45 CFR §164.312(a)-(d) | PHI display + redaction + session-timeout warning + access-control surfaces; sister to Phase 5 5-TEC findings |

### 2.4 In-scope dimensions (16 domains)

Surface ordering: 4 gate-class candidates first (per Q-A Tier 1 classification); MEDIUM P2 candidates next; LOW P3 + DOCUMENTATION-tier last.

**Gate-class candidates:**
- 0C-A11Y Accessibility (WCAG 2.2 AA + keyboard + screen reader + ARIA + focus + touch + reduce-motion)
- 0C-CLI Clinical UI (§16 PARTIAL-TRIGGERED; recommendation Class + LOE + risk scores + drug interactions + gap detection + clinical alerting)
- 0C-PERF Performance + Web Vitals (LCP / FID / CLS + bundle + RUM + heavy-component perf)
- 0C-TEST Frontend test coverage (unit + integration + E2E + visual regression)

**MEDIUM (P2) candidates:**
- 0C-CMP Component library (current 7 components + gaps + Storybook absence)
- 0C-NAV Navigation + IA (Sidebar + TopBar + module nav + search + breadcrumbs + user flows)
- 0C-MOD Per-module UI maturity (6-module parity)
- 0C-SLR Service-line + research view audit (per L78 canonical scope)
- 0C-OBS Observability + error tracking (Sentry / Datadog RUM / sister Phase 4 §17.1 entry 21)

**LOW (P3) + DOCUMENTATION-tier:**
- 0C-CAT Catalog of UI surfaces (per L75 baseline)
- 0C-COL Color system (palette + semantic + WCAG 1.4.3 contrast + dark mode + colorblind; token-conflict primary finding)
- 0C-TYP Typography (3-family stack + hierarchy + clinical-density readability)
- 0C-SPC Spacing + layout grid (8-tier scale)
- 0C-PAT Visual patterns + effects (glassmorphism + motion + iconography + shadows)
- 0C-I18N Internationalization readiness (current N/A; v2.0 documentation)
- 0C-CNT Content + microcopy + UX writing

### 2.5 Out-of-scope (locked)

| Item | Rationale |
|---|---|
| Design system codification SHIPPING | Phase 2 territory per `PATH_TO_ROBUST.md` L117 |
| Reports module implementation gaps remediation | Phase 2 territory; current-state audit ONLY per L75 |
| Backend code re-audit | Phase 1-5 closed; cross-reference at status verification layer only |
| AUDIT-001 backend test coverage remediation | Progresses through own remediation arc; 0C-TEST audits frontend sister-gap |
| Browser-version-specific bug audits | browserslist baseline at `package.json` |
| Internationalization implementation | v2.0 carry-forward; 0C-I18N documents readiness only |
| CRA-to-Vite migration execution | Tech-debt item per `CLAUDE.md` §2; cross-reference only |

---

## 3. Findings by Domain

Finding skeletons per B0C.2.2 cross-walk extension. Each finding: ID, CFR / standard citation, scope statement (TBD prose at B0C.4), existing AUDIT-NN coverage, DRAFT severity (per Q-A calibration), code-surface anchor (file-level at outline; TBD-grep markers for line-level resolution at B0C.4), cross-reference, remediation path (TBD prose at B0C.4).

### 3.1 Domain 0C-A11Y (Accessibility) - gate-class candidate

| ID | Standard | Scope | DRAFT severity | §16 | Anchor |
|---|---|---|---|---|---|
| 0C-A11Y-01 | WCAG 2.2 AA conformance | Repository-wide WCAG 2.2 AA conformance unverified; no audit tool config (axe / lighthouse-ci / pa11y) in repo | HIGH (P1) GATE candidate | NO | `src/` 365 .tsx files; 69 aria patterns across 15 files (modest baseline) |
| 0C-A11Y-02 | WCAG 1.4.3 contrast minimum | Color contrast ratios unverified against tokens.ts palette stops; semantic colors + chartColors palette WCAG 1.4.3 ratios not documented | MEDIUM (P2) | NO | `src/design-system/tokens.ts:9-37`, `:67-94`, `:140-149`; `src/design-system/semanticColors.ts:2-25` |
| 0C-A11Y-03 | Keyboard navigation | Keyboard navigation patterns ad-hoc; no documented tab-order or skip-link convention; Sidebar / TopBar / modal focus-management TBD-verify | MEDIUM (P2) | NO | `src/design-system/Sidebar.tsx`, `TopBar.tsx`, `AppShell.tsx`, `LockedOverlay.tsx` |
| 0C-A11Y-04 | ARIA 1.2 widget patterns | 69 aria patterns across 15 files; ARIA 1.2 widget pattern conformance unverified (combobox / dialog / tab / tooltip / menu / treegrid) | MEDIUM (P2) | NO | file:line resolution via grep at v2.0 Phase 2 polish arc per widget type |
| 0C-A11Y-05 | Focus management | Focus management on route transitions + modal open/close + form submission unverified; potential WCAG 2.4.3 violation | MEDIUM (P2) | NO | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-A11Y-06 | Touch target sizes | WCAG 2.2 SC 2.5.8 Target Size Minimum (24 by 24 CSS pixels) conformance unverified across button + link + icon-button surfaces | LOW (P3) | NO | Tailwind utility audit at B0C.4 |
| 0C-A11Y-07 | Reduce-motion respect | Reduce-motion respected per `src/index.css:1130` + `src/hooks/usePerformanceOptimization.ts:73`; framer-motion sparse use (0C-PAT cross-ref) means motion-impact is limited | DOCUMENTATION (already conformant) | NO | `src/index.css:1130`; `src/hooks/usePerformanceOptimization.ts:73` |

#### Finding 0C-A11Y-01 (HIGH P1 GATE per Tier 1 classification)

**Standard:** WCAG 2.2 Level AA (W3C Recommendation 2023-10-05); Section 508 Revised (36 CFR Part 1194; 2017 ICT Final Rule).

**Gap statement:** Repository-wide WCAG 2.2 Level AA conformance unverified. No automated accessibility audit tool config in repo: no `.axe-ci.json`, no `lighthouserc.js`/`.json` with a11y category, no `pa11yci.json`, no `playwright-axe` integration. The 69 ARIA attribute occurrences across 15 files at B0C.1.6 represent a partial baseline that has not been measured against WCAG 2.2 Level AA conformance criteria. TAILRD is a clinical platform displaying PHI; accessibility non-conformance creates Section 508 enforcement risk for federal-procurement scenarios and ADA enforcement risk for civil litigation (sister to HHS / OCR Section 504 + 508 enforcement framework).

**Evidence:** B0C.1.6 inventory found 69 ARIA attribute occurrences across 15 files (top concentrations: `BaseServiceLineView.tsx` 12, `UserMenu.tsx` 8, `ExportButton.tsx` 23). 365 total .tsx files. Coverage ratio 15/365 = 4.1% file-level ARIA density. No conformance audit tool in `package.json` devDependencies. No accessibility CI gate in `.github/workflows/`.

**Severity rationale:** HIGH P1 GATE per Tier 1 classification (`decision_frameworks` "classify Tier 1; downgrade with evidence"). Downgrade-at-evidence requires measured conformance against WCAG 2.2 Level AA criteria; current state has no measurement. Per Phase 5 5-TEC-06 sister downgrade pattern: if measurement reveals strong baseline (e.g., axe-core scan returns <20 violations), severity may downgrade to MEDIUM P2 at B0C.4 evidence (deferred until operator-side axe-core run).

**Cross-references:** see AUDIT-001 (Tier A backend test coverage 0.87%; sister foundational gap; 0C-TEST-01 sister); see Section 508 Revised §1194.22 + §1194.24; see WCAG 2.2 success criteria (1.1.1 Non-text Content, 1.3.1 Info and Relationships, 1.4.3 Contrast Minimum, 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible, 3.2.2 On Input, 4.1.2 Name Role Value, 4.1.3 Status Messages).

**Remediation:** (1) Integrate `@axe-core/react` for dev-time scanning; (2) Add `lighthouse-ci` to `.github/workflows/` with a11y category threshold; (3) Run baseline axe-core scan + categorize violations by WCAG SC; (4) Author remediation arc per SC violation cluster; (5) v2.0 Phase 2 territory for substantive remediation work per L117. Estimated baseline scan + categorization ~4-6h; remediation arc ~40-80h depending on violation density.

#### Finding 0C-A11Y-02 (MEDIUM P2)

**Standard:** WCAG 2.2 SC 1.4.3 Contrast (Minimum) Level AA; SC 1.4.11 Non-text Contrast Level AA.

**Gap statement:** Color contrast ratios unverified against documented design system palette stops. `tokens.ts:9-37` defines 11-stop Chrome Blue + 11-stop Arterial / Carmona Red + 11-stop Titanium Neutrals palettes; `semanticColors.ts:2-10` defines 7-bucket semantic colors (critical / warning / good / info / muted / device / financial) with text + bg + border + light variants. None of these palette pairs have documented contrast ratio measurements against WCAG 1.4.3 (4.5:1 for normal text + 3:1 for large text) or SC 1.4.11 (3:1 for UI components + graphical objects).

**Evidence:** Manual contrast verification examples (chrome and arterial against surface.base `#F4F6F8`):
- `chrome.700` (#2A5578) on `surface.base` (#F4F6F8) = est. 7.2:1 ratio (likely AAA conformant)
- `chrome.400` (#7BA3C4) on `surface.base` = est. 2.8:1 (likely BELOW WCAG 1.4.3 4.5:1 minimum for normal text)
- `arterial.500` (#9B2438) on `surface.base` = est. 6.1:1 (likely AA conformant)
- `arterial.300` (#D4707F) on `surface.base` = est. 2.4:1 (likely BELOW minimum)

Lower palette stops (50-400) likely below WCAG 1.4.3 minimum for normal text use; restricted to large-text + decorative contexts at minimum.

**Cross-references:** see 0C-A11Y-01 (parent WCAG conformance); see 0C-COL-01 (design token strategy sister finding); see `tokens.ts:9-53`, `semanticColors.ts:2-10`.

**Remediation:** (1) Author contrast-ratio matrix per palette stop against surface tokens; (2) Annotate `tokens.ts` with WCAG conformance tier per color combination (AAA / AA / large-text-only / decorative-only); (3) Lint rule via stylelint or eslint-plugin-jsx-a11y for hardcoded color usage. Estimated ~3-5h.

#### Finding 0C-A11Y-03 (MEDIUM P2)

**Standard:** WCAG 2.2 SC 2.1.1 Keyboard Level A; SC 2.1.2 No Keyboard Trap Level A; SC 2.4.3 Focus Order Level A.

**Gap statement:** Keyboard navigation patterns ad-hoc; no documented tab-order convention or skip-link implementation. 28 keyboard event handler occurrences across 14 files (B0C.4.0 grep). Sidebar / TopBar / AppShell focus-management TBD-verify; modal focus-trap implementation in `LockedOverlay.tsx` and similar surfaces unverified.

**Evidence:** Keyboard handler concentrations at `ExportButton.tsx` 4, `BaseServiceLineView.tsx` 6, `UserMenu.tsx` 3, `ModuleLayout.tsx` 2, `MFAVerify.tsx` 2, `AcceptInvite.tsx` 2, design-system components 1 each. No `tabIndex` discipline documented (avoid positive values per ARIA best practice).

**Cross-references:** see 0C-A11Y-01 (parent); see 0C-NAV-01 / 0C-NAV-02 (Sidebar + TopBar sister findings).

**Remediation:** (1) Audit tab-order on primary user-flows (login + module-entry + patient-detail + gap-action); (2) Implement skip-to-content link in `AppShell.tsx`; (3) Verify modal focus-trap + return-focus pattern; (4) Document keyboard-shortcuts in `docs/HIPAA_ACCESS_MANAGEMENT.md` (sister 5-ADM-04). Estimated ~4-6h.

#### Finding 0C-A11Y-04 (MEDIUM P2)

**Standard:** ARIA 1.2 (W3C Recommendation 2023-06-06); WAI-ARIA Authoring Practices Guide patterns: combobox, dialog (modal + non-modal), tab, tooltip, menu (menubutton + menubar + menuitem), treegrid, listbox, radiogroup, switch.

**Gap statement:** 69 ARIA attribute occurrences across 15 files (B0C.1.6 inventory) provide partial ARIA coverage but pattern-level conformance is unverified. ARIA 1.2 widget patterns each have required + optional attributes + keyboard interactions + state management contracts. Ad-hoc ARIA attribute usage without pattern-level verification risks assistive-technology breakage (screen readers interpret partial-pattern widgets unpredictably).

**Evidence:** Top concentrations at `ExportButton.tsx` (23 ARIA references), `BaseServiceLineView.tsx` (12), `UserMenu.tsx` (8). 27 Tooltip/tooltip occurrences across 10 files (sister 0C-CNT-04 grep). 14 keyboard event handler files (B0C.4.0 grep). Per-widget pattern conformance audit deferred to v2.0 Phase 2 polish arc per L117.

**Cross-references:** see 0C-A11Y-01 (parent WCAG conformance); see 0C-A11Y-03 (keyboard navigation sister); see ARIA 1.2 §3 Roles + §4 Widget Patterns + §5 Live Region patterns.

**Remediation:** (1) Inventory ARIA roles deployed across 15 files + classify per widget pattern; (2) Author per-pattern conformance checklist (combobox required attrs / dialog focus-trap + return-focus / tooltip dismiss + describes-by relationship / etc.); (3) Add `eslint-plugin-jsx-a11y` to lint config; (4) Per-pattern remediation arc. Estimated ~6-10h inventory + ~20-40h pattern-level remediation. v2.0 Phase 2 territory.

#### Finding 0C-A11Y-05 (MEDIUM P2)

**Standard:** WCAG 2.2 SC 2.4.3 Focus Order Level A; SC 2.4.7 Focus Visible Level AA; SC 3.2.1 On Focus Level A; SC 3.2.2 On Input Level A.

**Gap statement:** Focus management on route transitions + modal open/close + form submission unverified across 365 .tsx surfaces. React Router 6.20.0 (per `package.json`) does NOT auto-manage focus on route transitions; manual focus-management or `<Outlet />` focus-shift pattern required. Modal open/close (per `LockedOverlay.tsx` + sister modal surfaces) requires focus-trap + return-focus pattern; current implementation TBD-verify.

**Evidence:** No `focus()` call audit at scale; no `useEffect(() => mainRef.current?.focus(), ...)` route-transition pattern audit. 14 files with keyboard event handlers per B0C.4.0 sister grep. Modal surfaces: `LockedOverlay.tsx` + 27 Tooltip occurrences + various dialog patterns across module views.

**Cross-references:** see 0C-A11Y-01 (parent); see 0C-A11Y-04 (ARIA 1.2 dialog pattern sister); see 0C-NAV-05 (user-flow audit sister).

**Remediation:** (1) Add route-transition focus-shift pattern at `App.tsx` Router level; (2) Audit modal focus-trap implementations; (3) Add focus-visible polyfill if browser support requires; (4) Form-submission focus-shift to error region (sister to SC 3.3.1 + SC 3.3.3). Estimated ~8-12h. v2.0 Phase 2 territory.

#### Finding 0C-A11Y-06 (LOW P3)

**Standard:** WCAG 2.2 SC 2.5.8 Target Size (Minimum) Level AA (24x24 CSS pixels for pointer inputs; exceptions: inline text targets, user-agent-controlled, essential).

**Gap statement:** WCAG 2.2 SC 2.5.8 conformance unverified across button + link + icon-button surfaces. Tailwind utility class `h-6 w-6` = 24x24 CSS pixels (minimum); `h-4 w-4` = 16x16 (below minimum). lucide-react default icon size 24px (sister conformant) but `size={16}` overrides reduce target. WCAG 2.2 SC 2.5.8 is NEW in WCAG 2.2 (not in WCAG 2.1); auditor compliance against newest WCAG version is the conformance target.

**Evidence:** 254 lucide-react import references across 250 files (B0C.4-EXT.0 grep; canonical iconography deployment). Per-component icon-size audit deferred to v2.0 Phase 2 polish arc per L117.

**Cross-references:** see 0C-A11Y-01 (parent); see 0C-PAT-05 iconography sister (lucide-react canonical).

**Remediation:** (1) Tailwind config min-target-size utility class convention; (2) Audit icon-button surfaces for size compliance; (3) Per-component remediation. Estimated ~4-6h audit + ~6-10h remediation. v2.0 Phase 2 territory.

#### Finding 0C-A11Y-07 (DOCUMENTATION; already conformant)

**Standard:** WCAG 2.2 SC 2.3.3 Animation from Interactions Level AAA (deprecated guidance per WCAG 2.2; replaced by SC 2.3.3 alone); CSS `@media (prefers-reduced-motion: reduce)` + JS `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

**Gap statement:** Reduce-motion CONFORMANT per evidence at `src/index.css:1130` (`@media (prefers-reduced-motion: reduce) { ... }` block) and `src/hooks/usePerformanceOptimization.ts:73` (`prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches`). Sister to 0C-PAT-04 motion-sparse-deployment (limited motion-impact reduces remediation surface; framer-motion installed but 1-file used per B0C.2.0).

**Cross-references:** see 0C-A11Y-01 (parent); see 0C-PAT-04 motion-sparse-deployment.

**Remediation:** No action required; already conformant. Document conformance evidence in `docs/architecture/DESIGN_SYSTEM_SPEC.md` at v2.0 design system codification arc.

### 3.2 Domain 0C-CLI (Clinical UI) - gate-class candidate (§16 PARTIAL-TRIGGERED)

| ID | Standard | Scope | DRAFT severity | §16 | Anchor |
|---|---|---|---|---|---|
| 0C-CLI-01 | ACC/AHA recommendation Class display | Recommendation Class (I / IIa / IIb / III) display conventions unverified across modules; per CLAUDE.md §8 clinical regulatory standards, Class display must be explicit + non-directive | HIGH (P1) GATE candidate | **YES** | `src/components/therapyGap/`; module ui surfaces |
| 0C-CLI-02 | Level of Evidence display | LOE (A / B-R / B-NR / C-LD / C-EO) display conventions unverified; per ACC/AHA framework | HIGH (P1) GATE candidate | **YES** | `src/components/therapyGap/`; module ui surfaces |
| 0C-CLI-03 | Risk score rendering accuracy | Risk calculator UI components verified against published scoring algorithms (CHA2DS2-VASc / HAS-BLED / MAGGIC / GRACE / TIMI / etc.) | HIGH (P1) GATE candidate | **YES** | `src/components/riskCalculators/` |
| 0C-CLI-04 | Drug interaction surfacing | DDI / drug-drug interaction UI surfaces unverified; clinical accuracy against current pharmacy references | MEDIUM (P2) | **YES** | `backend/src/services/ddiService.ts` (sister surface; frontend rendering file:line resolution via grep at v2.0 Phase 2 polish arc) |
| 0C-CLI-05 | Gap detection UI rendering | Gap detection UI displays recommendation + evidence + Class + LOE per CLAUDE.md §8 dismissal-at-consumption framing (sister to Phase 4 4-OMP-01 + §17.1 entry 20) | MEDIUM (P2) | **YES** | `src/components/therapyGap/`; cross-ref Phase 4 4-OMP-01 |
| 0C-CLI-06 | Clinical alert banner | `ClinicalAlertBanner.tsx` 4 aria patterns at B0C.1.6 grep; clinical alerting severity rendering + non-directive language per CLAUDE.md §8 | MEDIUM (P2) | **YES** | `src/components/shared/ClinicalAlertBanner.tsx` |
| 0C-CLI-07 | Phenotype detection rendering | Phenotype detection UI accuracy against clinical phenotype definitions; cross-ref `backend/src/services/phenotypeService.ts` | MEDIUM (P2) | **YES** | `src/components/phenotypeDetection/` |
| 0C-CLI-08 | Clinical visualizations | recharts + react-leaflet rendering of clinical data accuracy + accessibility | MEDIUM (P2) | conditional | `src/components/visualizations/` |

#### Finding 0C-CLI-01 (HIGH P1 GATE candidate; §16 TRIGGERED)

**Standard:** ACC/AHA Class of Recommendation framework (COR I / IIa / IIb / III); per CLAUDE.md §8 clinical regulatory standards, recommendation tier display must be explicit + non-directive (FDA CDS exemption compliance per 21st Century Cures Act).

**Gap statement:** Recommendation Class (I / IIa / IIb / III) display conventions across clinical-UI surfaces unverified for consistency. Per evidence at B0C.4.0 grep on `src/components/therapyGap/`: `DeviceUnderutilizationPanel.tsx` has 10 Class/COR/LOE-keyword occurrences (substantive); `GDMTOptimizationTracker.tsx` + `TherapyGapDashboard.tsx` show 0 occurrences (Class display absence or alternative encoding). Asymmetric Class-display deployment risks inconsistent clinician interpretation across modules.

**§16 trigger criteria met:** UI displays recommendation Class. Per §16 clinical-code verification: Class display must cite specific guideline recommendation where surfaced. Example guideline cite per 2022 AHA/ACC/HFSA HF Guideline: SGLT2 inhibitor for HFrEF carries COR I LOE A; ARNI carries COR I LOE B-R; ivabradine carries COR IIa LOE B-R. UI must render Class + LOE values that match the source guideline verbatim.

**Evidence:** `src/components/therapyGap/DeviceUnderutilizationPanel.tsx:10` Class/COR references. Sister to backend AUDIT-METHODOLOGY §1 rule-body verification standard for clinical content; frontend rendering layer is the §16 trigger surface for Phase 0C.

**Cross-references:** see CLAUDE.md §8 FDA CDS exemption framework; see Phase 4 4-OMP-01 dismissal-at-consumption (§17.1 entry 20); see Phase 5 5-PRV-02 minimum-necessary treatment-exception; see backend AUDIT-METHODOLOGY §1.

**Remediation:** (1) Audit Class-display consistency across all therapyGap + clinicalAlertBanner + riskCalculator surfaces; (2) Codify Class-display component (e.g., `<RecommendationBadge class="I" loe="A" />`) for design system; (3) Verify each Class value against source guideline citation per §16; (4) Per CLAUDE.md §8: ensure non-directive language ("recommended for review", "consider", "guideline suggests"); (5) Document in `docs/HIPAA_POLICIES.md` clinical-UI policy section. Estimated ~6-10h audit + ~4-6h component codification.

#### Finding 0C-CLI-02 (HIGH P1 GATE candidate; §16 TRIGGERED)

**Standard:** ACC/AHA Level of Evidence framework (LOE A / B-R / B-NR / C-LD / C-EO; A = high-quality RCT evidence; B-R = moderate-quality RCT; B-NR = non-RCT; C-LD = limited data; C-EO = expert opinion).

**Gap statement:** LOE display conventions sister to 0C-CLI-01. Per ACC/AHA framework, every recommendation carries both Class (importance) and LOE (evidence quality). Frontend rendering must show both. Current state shows substantive Class/COR/LOE references at `DeviceUnderutilizationPanel.tsx:10` but other therapy-gap surfaces lack LOE rendering.

**§16 trigger criteria met:** UI displays Level of Evidence. Example guideline cite per 2023 ACC/AHA Chronic Coronary Disease Guideline: high-intensity statin for secondary prevention carries COR I LOE A. Frontend must render LOE letter + qualifier verbatim.

**Cross-references:** see 0C-CLI-01 (sister Class-display pattern); see ACC/AHA Methodology document for LOE definitions.

**Remediation:** Bundled with 0C-CLI-01 RecommendationBadge component codification. Estimated bundled.

#### Finding 0C-CLI-03 (HIGH P1 GATE candidate; §16 TRIGGERED)

**Standard:** Published risk scoring algorithm specifications: CHA2DS2-VASc per 2023 ACC/AHA/ACCP/HRS AF Guideline; HAS-BLED per ESC AF Guideline; MAGGIC per Pocock et al. 2013; GRACE 2.0 per Fox et al. 2014; TIMI Risk per Antman et al. 2000; SYNTAX per Sianos et al. 2005; STS per STS National Database; WIfI per SVS classification; Framingham HF risk per Kannel et al.; INTERMACS profiles per Stevenson et al. 2009; Wells PE per Wells et al. 2000.

**Gap statement:** Risk calculator UI component accuracy verification against published scoring algorithms. 12 risk calculator components identified at B0C.4.0 evidence-gathering at `src/components/riskCalculators/`: CHA2DS2VAScCalculator, CRTICDEligibilityCalculator, FRAMINGHAMHFCalculator, GRACEScoreCalculator, HASBLEDCalculator, INTERMACSCalculator, MAGGICCalculator, ORBITBleedingCalculator, STSRiskCalculator, SYNTAXScoreCalculator, WIFIClassificationCalculator, WellsPECalculator. Each must implement scoring algorithm verbatim per published source.

**§16 trigger criteria met:** UI renders risk scores. Per §16 clinical-code verification: each scoring algorithm must be verified against authoritative published source (original publication + AHA/ESC guideline citation). MDCalc.com is a useful secondary verification source but not a §16 primary authoritative source.

**Verification path per calculator:** (1) Primary publication PMID; (2) Current guideline endorsement (e.g., AF Guideline 2023 for CHA2DS2-VASc; ACS-NSTE Guideline 2014 for GRACE); (3) UI implementation cross-check (variable definitions + thresholds + score formula + risk strata + recommended action thresholds).

**Cross-references:** see Phase 0B clinical addendum per module (HF / EP / SH / CAD / VHD / PV calculators); see AUDIT-METHODOLOGY §16 clinical-code verification standard.

**Remediation:** (1) Per-calculator §16 verification arc; (2) UI component test coverage (input boundaries + score formula + risk strata thresholds); (3) Annotation comment in each calculator file citing primary publication PMID + current guideline endorsement; (4) Cross-reference Phase 0B per-module clinical addendum verification artifacts. Estimated ~12-18h (~1-1.5h per calculator x 12).

#### Finding 0C-CLI-04 (MEDIUM P2; §16 TRIGGERED)

**Standard:** Authoritative pharmacy references: Lexicomp Drug Interactions Database (Wolters Kluwer); Micromedex Drug Interaction (Merative); AHFS Drug Information (ASHP); current ACC/AHA + ESC drug-drug interaction guidance per disease-state guideline.

**Gap statement:** DDI UI rendering against `backend/src/services/ddiService.ts` data unverified for current-pharmacy-reference accuracy. Drug-pair severity classifications (contraindicated / major / moderate / minor) must match authoritative source at time of UI rendering; stale severity classifications risk clinical decision impact.

**Evidence:** Backend `ddiService.ts` exists per B0C.1.6 inventory; frontend DDI rendering surface TBD-grep at v2.0 Phase 2 polish arc per §17.3 (no current frontend DDI grep performed during B0C.4-EXT). Per §16 PARTIAL-TRIGGER: clinical-code verification standard applies to DDI rendering as it does to risk score rendering.

**Cross-references:** see 0C-CLI-03 (sister risk-score verification pattern); see backend `ddiService.ts` (sister surface).

**Remediation:** (1) Grep frontend for DDI rendering components + UI surfaces; (2) Per-drug-pair §16 verification against current authoritative source; (3) Annotate each DDI surface with source citation + last-verified date; (4) Cadence for re-verification per guideline update cycle. Estimated ~4-6h frontend grep + verification + ~2-4h annotation. v2.0 Phase 2 territory.

#### Finding 0C-CLI-05 (MEDIUM P2; §16 TRIGGERED)

**Standard:** CLAUDE.md §8 FDA CDS exemption framework (21st Century Cures Act); ACC/AHA Class + LOE rendering convention per gap-detection finding; Phase 4 §17.1 entry 20 dismissal-at-consumption codification.

**Gap statement:** Gap detection UI rendering at `src/components/therapyGap/` surfaces must display recommendation per CLAUDE.md §8 dismissal-at-consumption framing. Per Phase 4 §17.1 entry 20 codification: every gap card surfaces Class + LOE + evidence object + dismissal mechanism with documented-reason workflow. Sister to AUDIT-071 cdsHooks UI conventions (RESOLVED 2026-05-07).

**Evidence:** `src/components/therapyGap/` has 3 components: DeviceUnderutilizationPanel (10 Class/COR/LOE hits per B0C.4.0 grep) + GDMTOptimizationTracker (0 hits) + TherapyGapDashboard (0 hits). Asymmetric Class/LOE display deployment risks inconsistent clinician interpretation across surfaces; per Phase 4 §17.1 entry 20, dismissal-at-consumption requires full evidence rendering at every consumption surface.

**Cross-references:** see Phase 4 4-OMP-01 dismissal-at-consumption framing; see §17.1 entry 20 codification; see AUDIT-071 cdsHooks UI conventions (RESOLVED); see 0C-CLI-01 + 0C-CLI-02 Class/LOE sister findings.

**Remediation:** (1) Audit GDMTOptimizationTracker + TherapyGapDashboard for Class/LOE rendering parity with DeviceUnderutilizationPanel; (2) Codify `<RecommendationBadge>` component (per 0C-CLI-01 remediation); (3) Audit dismissal-with-documented-reason workflow per gap-card surface; (4) Cross-reference to CDS Hooks 2.0 Card spec compliance. Estimated ~6-10h. v2.0 Phase 2 territory.

#### Finding 0C-CLI-06 (MEDIUM P2; §16 TRIGGERED)

**Standard:** CDS Hooks 2.0 Card severity specification (info / warning / critical); CLAUDE.md §8 non-directive language requirement; ARIA 1.2 `role="alert"` + `aria-live="polite"` for live-region alerting.

**Gap statement:** `ClinicalAlertBanner.tsx` with 4 ARIA patterns per B0C.1.6 inventory. Severity rendering + non-directive language + alert-class consistency per CDS Hooks 2.0 Card severity spec unverified. Clinical alerts must use non-directive language ("recommended for review", "consider", "guideline suggests") per CLAUDE.md §8 + 21st Century Cures Act CDS exemption requirements.

**Evidence:** `src/components/shared/ClinicalAlertBanner.tsx` 4 aria patterns; per-alert content audit deferred to v2.0 Phase 2 polish arc per §17.3 (no per-alert content grep performed during B0C.4-EXT).

**Cross-references:** see AUDIT-071 cdsHooks UI conventions (sister); see CDS Hooks 2.0 spec §Cards; see CLAUDE.md §8 + §14 NEVER DO list (directive language is FDA SaMD trigger).

**Remediation:** (1) Audit ClinicalAlertBanner severity rendering against CDS Hooks 2.0 Card spec; (2) Per-alert content audit for non-directive language compliance; (3) ARIA live-region pattern verification per ARIA 1.2 §5.2.1 alert pattern. Estimated ~4-6h. v2.0 Phase 2 territory.

#### Finding 0C-CLI-07 (MEDIUM P2; §16 TRIGGERED)

**Standard:** Backend `phenotypeService.ts` phenotype detection logic (canonical source per CLAUDE.md §2 Tech Stack architecture); ACC/AHA + HRS clinical phenotype definitions (per 2022 AHA/ACC/HFSA HF Guideline phenotype framework; 2023 ACC/AHA/ACCP/HRS AF Guideline subtypes; per-module phenotype taxonomy).

**Gap statement:** Phenotype detection UI at `src/components/phenotypeDetection/` must match phenotype-detection logic per backend `phenotypeService.ts`. Frontend rendering accuracy verification is the §16 trigger surface (sister to risk-score rendering pattern at 0C-CLI-03).

**Evidence:** `src/components/phenotypeDetection/` exists per B0C.1.6 inventory; backend `phenotypeService.ts` exists. Per-phenotype UI-vs-backend accuracy verification deferred to v2.0 Phase 2 polish arc per §17.3.

**Cross-references:** see backend `phenotypeService.ts`; see Phase 0B per-module addendum phenotype definitions; see 0C-CLI-03 risk-score verification sister pattern.

**Remediation:** (1) Per-phenotype-component UI rendering audit against backend detection logic; (2) Annotate each phenotype-UI component with backend service cross-reference; (3) Test coverage for phenotype-rendering accuracy. Estimated ~6-10h. v2.0 Phase 2 territory.

#### Finding 0C-CLI-08 (MEDIUM P2; conditional §16)

**Standard:** recharts + react-leaflet rendering accuracy; WCAG 2.2 SC 1.1.1 Non-text Content (chart alternatives for screen readers); SC 1.4.1 Use of Color (data encoding); SC 1.4.11 Non-text Contrast (UI components 3:1 ratio).

**Gap statement:** Clinical visualizations via recharts + react-leaflet render patient-population data + geographic distribution + risk-stratification heatmaps. Accessibility dimensions: chart-to-table alternative + axes labels + legends + colorblind palette + tooltip accessibility. Accuracy dimensions: data binding correctness + axis scale appropriateness + outlier handling. Conditional §16 trigger applies if visualizations render clinical outcomes (mortality / readmission / event rates) at patient-population aggregate.

**Evidence:** `src/components/visualizations/` directory; charting library: recharts ^3.4.1; mapping: react-leaflet ^4.2.1. Per-visualization audit deferred to v2.0 Phase 2 polish arc per §17.3.

**Cross-references:** see 0C-A11Y-04 (ARIA widget patterns); see 0C-COL-05 (colorblind considerations); see 0C-PERF-04 (heavy component performance).

**Remediation:** (1) Per-visualization accessibility audit (chart alternatives + labels + legends + colorblind verification); (2) Data binding accuracy spot-check per chart type; (3) Tooltip accessibility per ARIA 1.2 tooltip pattern. Estimated ~6-10h. v2.0 Phase 2 territory.

### 3.3 Domain 0C-PERF (Performance + Web Vitals) - gate-class candidate

| ID | Standard | Scope | DRAFT severity | §16 | Anchor |
|---|---|---|---|---|---|
| 0C-PERF-01 | Web Vitals baseline absence | No Lighthouse config + no Web Vitals API instrumentation + no performance budget definitions in repo; Core Web Vitals (LCP / INP / CLS) baseline unknown | HIGH (P1) GATE candidate | NO | `package.json` (no lighthouse / web-vitals dependency); no `lighthouserc.js` / `lighthouserc.json` |
| 0C-PERF-02 | RUM instrumentation | No frontend RUM (Sentry / Datadog RUM / Google Analytics RUM) in repo; production user experience invisible | HIGH (P1) GATE candidate | NO | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-PERF-03 | Bundle size visibility | No bundle analyzer config (webpack-bundle-analyzer / source-map-explorer) in repo; bundle size growth invisible | MEDIUM (P2) | NO | `package.json`; CRA default builds |
| 0C-PERF-04 | Heavy component performance | recharts + react-leaflet + framer-motion + jspdf + xlsx bundle weight; clinical-density rendering performance under N-patient load | MEDIUM (P2) | NO | `package.json:11-29` dependencies |
| 0C-PERF-05 | Performance budget definitions | No performance budget per route / per module / per bundle size category | MEDIUM (P2) | NO | none (gap) |

#### Finding 0C-PERF-01 (HIGH P1 GATE candidate)

**Standard:** Core Web Vitals (Google web.dev): LCP (Largest Contentful Paint) target <=2.5s; INP (Interaction to Next Paint; replaced FID 2024-03) target <=200ms; CLS (Cumulative Layout Shift) target <=0.1. WCAG 2.2 SC 2.2.6 Timeouts; SC 3.2.1 On Focus (no-context-shift performance).

**Gap statement per Q-D operator decision:** Web Vitals baseline absent. Document baseline-absence as the gap; running Lighthouse + measuring is Phase 2 territory per L117. No `lighthouserc.js` or `lighthouserc.json` in repo. No `web-vitals` npm package in `package.json` dependencies. No performance budget JSON. No bundle analyzer config.

**Evidence:** `package.json` review (B0C.2.0 inventory): no `lighthouse`, `web-vitals`, `webpack-bundle-analyzer`, `source-map-explorer`, `bundlewatch` dependencies. Heavy production dependencies surfaced: `recharts ^3.4.1`, `react-leaflet ^4.2.1`, `framer-motion ^12.23.24`, `jspdf ^3.0.3`, `xlsx ^0.18.5` (xlsx 950KB+ uncompressed). Clinical-density rendering under N-patient load + multi-chart dashboard surfaces face heavy compute + bundle weight without measurement infrastructure.

**Severity rationale:** HIGH P1 GATE candidate per Tier 1 classification. Frontend performance under clinical-density load (50+ patients in worklist; multi-chart executive dashboards; map-heavy population health views) is unverified. Per Phase 4 §17.1 entry 21 logs-only-observability stance sister-pattern: baseline absence is the gap (sister rationale: at current pilot scale, the gap is measurement infrastructure not measured violations; v2.0 Phase 2 territory for substantive remediation).

**Cross-references:** see Phase 4 §17.1 entry 21 logs-only-observability stance rationale (sister at frontend Web Vitals surface); see 0C-PERF-02 RUM instrumentation sister.

**Remediation:** (1) Add `lighthouse-ci` to `.github/workflows/` with Core Web Vitals thresholds; (2) Add `web-vitals` npm package + instrument LCP / INP / CLS reporting; (3) Author performance budget JSON per route + per bundle category; (4) Add `webpack-bundle-analyzer` or `source-map-explorer` for bundle visibility; (5) Run baseline Lighthouse audit + categorize findings. Estimated ~6-10h infrastructure + ~4-6h baseline measurement. v2.0 Phase 2 substantive remediation per L117.

#### Finding 0C-PERF-02 (HIGH P1 GATE candidate)

**Standard:** Real-User Monitoring (RUM) tooling: Sentry Performance / Datadog RUM / Google Analytics 4 RUM events / Cloudflare Analytics RUM / SpeedCurve.

**Gap statement:** No frontend RUM in repo. Production user experience invisible. Sister to Phase 4 4-ALR-01 + 4-ALR-02 (operational observability gap at backend) at frontend layer; per §17.1 entry 21 codification, logs-only-observability is the operator-decision posture at pilot scale, but the alerting + APM gap is the gate-class concern.

**Evidence:** `package.json` review: no Sentry, Datadog, Bugsnag, LogRocket, FullStory, or sister RUM dependencies.

**Cross-references:** see Phase 4 4-ALR-01 + 4-ALR-02 (operational alerting + APM gate items; backend sister); see §17.1 entry 21 logs-only-observability stance; see 0C-OBS-01 / 0C-OBS-02 sister findings.

**Remediation:** (1) Select RUM tool (Sentry recommended for unified error + performance; cross-references CSO security audit at backend stack); (2) Instrument with Web Vitals reporting per 0C-PERF-01; (3) Configure user-flow tracking on critical paths (login + module-entry + gap-action). Estimated ~6-10h. v2.0 Phase 2 territory.

#### Finding 0C-PERF-03 (MEDIUM P2)

**Standard:** Webpack bundle analyzer / source-map-explorer / bundlesize / webpack-stats-plugin; production bundle size visibility per CI run.

**Gap statement:** No bundle analyzer config in repo. Bundle size growth invisible per PR; large-dependency additions ship without visibility. Heavy production dependencies per `package.json` review: `xlsx ^0.18.5` (~950KB uncompressed), `recharts ^3.4.1` (~600KB), `react-leaflet ^4.2.1` (~400KB + leaflet ~150KB), `framer-motion ^12.23.24` (~200KB), `jspdf ^3.0.3` + `jspdf-autotable ^5.0.2` (~600KB). Aggregate of heavy libraries ~2.9MB uncompressed before app code.

**Cross-references:** see 0C-PERF-04 heavy component perf; see CRA `react-scripts 5.0.1` default Webpack config.

**Remediation:** (1) Add `webpack-bundle-analyzer` for dev-time visualization; (2) Add `source-map-explorer` for production-build per-route analysis; (3) Add `bundlesize` per-bundle threshold check to CI; (4) Per-PR bundle delta comment via bundlesize-action. Estimated ~2-3h infrastructure. v2.0 Phase 2 territory.

#### Finding 0C-PERF-04 (MEDIUM P2)

**Standard:** React 18 code-splitting via `React.lazy()` + `Suspense` + dynamic `import()` (per react.dev recommendation); CRA `react-scripts 5.0.1` route-level lazy-loading support.

**Gap statement:** Heavy dependencies (recharts + react-leaflet + framer-motion + jspdf + xlsx) deployed across module surfaces without measured lazy-loading discipline. Per `package.json` heavy-deps total ~2.9MB uncompressed; per-route code-splitting opportunity: admin / research / revenueCycle / dataManagement surfaces are persona-specific (not all clinicians need them on initial bundle).

**Evidence:** `src/App.tsx` routing layer; route-level `React.lazy` adoption TBD-grep at v2.0 Phase 2 polish arc per §17.3.

**Cross-references:** see 0C-PERF-01 Web Vitals baseline (LCP target <=2.5s requires bundle weight discipline); see 0C-PERF-03 bundle visibility sister.

**Remediation:** (1) Audit route-level lazy-loading opportunities; (2) Per-module dynamic import for clinical-UI components; (3) xlsx + jspdf lazy-load (only loaded on export action); (4) react-leaflet lazy-load (only loaded on map view). Estimated ~6-10h. v2.0 Phase 2 territory.

#### Finding 0C-PERF-05 (MEDIUM P2)

**Standard:** Lighthouse-CI performance budget JSON (`lighthouserc.json` budgets array); per-route + per-bundle-category thresholds.

**Gap statement:** No performance budget JSON in repo. No per-route + per-module + per-bundle-category thresholds. Performance regressions ship without measured gate.

**Cross-references:** see 0C-PERF-01 Lighthouse-CI infrastructure (parent); see 0C-PERF-03 bundle visibility sister.

**Remediation:** Bundled with 0C-PERF-01 + 0C-PERF-03 infrastructure work. Per-route budget JSON authoring estimated ~2-3h after Lighthouse-CI + bundlesize tooling in place. v2.0 Phase 2 territory.

### 3.4 Domain 0C-TEST (Frontend test coverage) - gate-class confirmed

| ID | Standard | Scope | DRAFT severity | §16 | Anchor |
|---|---|---|---|---|---|
| 0C-TEST-01 | Unit test coverage | 1 test file in 365 .tsx files; sister AUDIT-001 Tier A backend gap (0.87%); frontend coverage worse | HIGH (P1) GATE confirmed | NO | `src/` 1 .test.* file detected at B0C.1.6 inventory |
| 0C-TEST-02 | Integration / component test coverage | No React Testing Library / @testing-library/react integration test patterns in repo at scale | HIGH (P1) GATE confirmed | NO | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-TEST-03 | E2E test coverage | No Playwright / Cypress E2E config in repo; user-flow regression invisible | HIGH (P1) GATE confirmed | NO | `package.json`; no `playwright.config.*` / `cypress.config.*` |
| 0C-TEST-04 | Visual regression test coverage | No visual regression tooling (Chromatic / Percy / Loki / Playwright snapshots) in repo; visual regressions invisible | MEDIUM (P2) | NO | none (gap) |

#### Finding 0C-TEST-01 (HIGH P1 GATE CONFIRMED; sister AUDIT-001 Tier A precedent)

**Standard:** Industry-standard frontend test coverage targets: >80% line coverage for production-grade applications; >60% for early-stage clinical software per FDA SaMD considerations (TAILRD's CDS framing under 21st Century Cures Act exemption does not lower the test-coverage bar).

**Gap statement:** 1 test file in 365 .tsx files = 0.27% file-level test coverage at frontend. Sister to AUDIT-001 backend test coverage 0.87% (Tier A foundational gap; OPEN with active remediation arc). Frontend test gap is WORSE than backend per absolute coverage ratio. Phase 5 §164.312(b) audit controls + 5-ADM-08 periodic evaluation framework sister: TAILRD compliance posture requires testable + evaluable software per HIPAA Security Rule.

**Evidence:** B0C.1.6 inventory: 1 `.test.*` file in `src/` (manually verified; matches the operator's prior `useGapActions.test.ts` cite in CLAUDE.md §11 Testing section). 0 `.spec.*` files. 365 .tsx files. 56 .ts files. No `playwright.config.*` / `cypress.config.*` / `vitest.config.*`.

**Severity rationale:** HIGH P1 GATE CONFIRMED. Per `decision_frameworks` "classify Tier 1 + downgrade with evidence": evidence at B0C.1.6 + B0C.4.0 confirms severity floor; not downgradeable. Foundational gap with sister-finding AUDIT-001 already at Tier A (highest severity backend). Frontend reliability claims cannot be substantiated without test infrastructure.

**Cross-references:** see AUDIT-001 (Tier A test coverage 0.87% backend; OPEN); see CLAUDE.md §11 Testing section ("Current state: Near-zero test coverage"); see Phase 5 §164.312(b) audit controls (sister); see 5-ADM-08 periodic evaluation (sister).

**Remediation:** (1) Establish Jest + React Testing Library baseline for `src/components/shared/` first (KPICard, GapCard, ModuleLayout primitives); (2) Per-module test coverage arc for clinical-UI components (risk calculators FIRST per §16 PARTIAL-TRIGGER on 0C-CLI-03); (3) Integration test surface for critical user flows (login + MFA + module-entry + gap-action); (4) Coverage threshold gate in CI (`.github/workflows/`); (5) Sister to AUDIT-001 backend arc remediation. Estimated ~60-100h substantial coverage establishment. v2.0 Phase 2 territory per L117.

#### Finding 0C-TEST-02 (HIGH P1 GATE CONFIRMED)

**Standard:** Integration / component test patterns per React Testing Library best practices.

**Gap statement:** No @testing-library/react integration test patterns in repo at scale. `useGapActions.test.ts` is single hook unit test per CLAUDE.md §11. No component-rendering tests verifying user-interaction flows + state transitions + accessibility patterns.

**Remediation:** Bundled with 0C-TEST-01 establishment arc. Component test patterns first; integration tests on critical flows after primitives covered.

#### Finding 0C-TEST-03 (HIGH P1 GATE CONFIRMED)

**Standard:** E2E test framework: Playwright (recommended for clinical apps; supports multi-browser + visual regression) or Cypress.

**Gap statement:** No `playwright.config.*` / `cypress.config.*` in repo. End-to-end user-flow regression invisible. Sister to backend AUDIT-001 Tier A test coverage gap.

**Remediation:** (1) Add Playwright config + baseline tests for critical flows: login + MFA + module-entry + patient-detail + gap-action + breach-incident-workflow; (2) CI integration with `.github/workflows/`; (3) Per-module smoke tests. Estimated ~15-25h baseline. v2.0 Phase 2 territory.

#### Finding 0C-TEST-04 (MEDIUM P2)

**Standard:** Visual regression tooling: Chromatic (Storybook-integrated) / Percy / Loki / Playwright snapshots.

**Gap statement:** No visual regression tooling. Visual regressions invisible. Sister to 0C-CMP-03 Storybook absence (Chromatic requires Storybook).

**Remediation:** Bundled with 0C-CMP-03 Storybook deployment + 0C-TEST-03 Playwright snapshots option. Estimated ~6-10h.

### 3.5 Domain 0C-CMP (Component library)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-CMP-01 | Current component library inventory: 7 design-system components (AppShell + Badge + DotScale + LockedOverlay + SectionCard + Sidebar + TopBar) + 2 token files | DOCUMENTATION (catalog) | `src/design-system/` |
| 0C-CMP-02 | Component coverage gaps for v2.0 design system codification (Button + Card + Modal + Form + Input + Select + Tabs + Toast + Tooltip + DataTable + Dialog) | MEDIUM (P2) DOCUMENTATION | none (gap) |
| 0C-CMP-03 | Storybook absence | MEDIUM (P2) DOCUMENTATION | none (gap; 0 .stories.* files) |
| 0C-CMP-04 | Form handling pattern (no React Hook Form / Formik observed at B0C.1.6) | LOW-DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-CMP-05 | Library-vs-deployment pattern (framer-motion installed + 1-file used; sister 0C-PAT cross-ref) | LOW-DOCUMENTATION | `src/components/free-tier/sections/PremiumUnlock.tsx` (sole usage) |

#### Finding 0C-CMP-01 (DOCUMENTATION; catalog)

**Standard:** Design system component library inventory + per-component documentation.

**Gap statement:** Current component library at `src/design-system/`: 7 components (AppShell + Badge + DotScale + LockedOverlay + SectionCard + Sidebar + TopBar) + 2 token files (tokens.ts 234 LOC + semanticColors.ts 27 LOC). Catalog deliverable per L75; baseline established at this finding.

**Cross-references:** see 0C-CMP-02 component coverage gaps; see §5.1 design system token-conflict.

**Remediation:** Document component inventory in `docs/architecture/DESIGN_SYSTEM_SPEC.md` at v2.0 design system codification arc. Estimated ~1-2h bundled.

#### Finding 0C-CMP-02 (MEDIUM P2 DOCUMENTATION)

**Standard:** Industry-standard React component library primitives: Button + Card + Modal + Form + Input + Select + Tabs + Toast + Tooltip + DataTable + Dialog + Combobox + Switch + Radio + Checkbox + Accordion + Breadcrumb + Skeleton + Spinner + Progress + Avatar + Divider.

**Gap statement:** Current 7-component library lacks primitives required for clinical-density UI. Missing: Button (using bare `<button>` + Tailwind utilities); Card (using SectionCard variant); Modal (using LockedOverlay variant + ad-hoc dialog patterns); Form (using bare `<form>` + manual state); DataTable (using recharts BaseTable + ad-hoc per-module tables); Toast (using sister Toast.tsx at `src/components/shared/Toast.tsx`); Tooltip (27 occurrences across 10 files per B0C.4-EXT.0 grep; ad-hoc); etc.

**Cross-references:** see 0C-CMP-01 catalog; see §17.1 candidate 1 (component library selection rationale).

**Remediation:** v2.0 design system codification arc per L117 Phase 2 territory. Estimated ~80-120h for primitives.

#### Finding 0C-CMP-03 (MEDIUM P2 DOCUMENTATION)

**Standard:** Storybook 7 (or Ladle alternative) component-documentation surface per industry-standard React design system practice.

**Gap statement:** No Storybook config in repo (0 `.stories.*` files per B0C.1.6 inventory). Component documentation surface absent; designers + developers verify component behavior by reading source code rather than visual playground. Sister 0C-TEST-04 visual regression test coverage (Chromatic integrates with Storybook).

**Cross-references:** see 0C-CMP-01 catalog; see 0C-TEST-04 visual regression sister.

**Remediation:** v2.0 design system codification arc per L117. Estimated ~40-60h Storybook deployment + per-component story authoring.

#### Finding 0C-CMP-04 (LOW-DOCUMENTATION)

**Standard:** Form handling library convention: React Hook Form (recommended for performance) or Formik (mature alternative) or native HTML form patterns + manual state.

**Gap statement:** No React Hook Form / Formik observed. 7 `handleSubmit` occurrences across 4 files per B0C.4-EXT.0 grep (AuthContext + AcceptInvite + SuperAdminLogin + Login). Native form patterns + manual state dominate. Form handling pattern not codified; per-form ad-hoc implementations.

**Cross-references:** see §17.1 candidate 6 (form handling pattern); see 0C-A11Y-05 focus management (form submission focus-shift sister).

**Remediation:** v2.0 design system codification arc; select React Hook Form (recommended for clinical-density forms with real-time validation) or document native-pattern rationale. Estimated ~6-10h selection + ~20-30h migration.

#### Finding 0C-CMP-05 (LOW-DOCUMENTATION)

**Standard:** Library deployment-density audit: libraries installed via `package.json` should be deployed at scale or removed (dependency hygiene).

**Gap statement:** framer-motion installed but 1-file deployment per B0C.2.0 grep (`src/components/free-tier/sections/PremiumUnlock.tsx:1` sole usage). Library-vs-deployment mismatch pattern. Sister 0C-PAT-04 motion-sparse-deployment.

**Cross-references:** see 0C-PAT-04 motion-sparse-deployment; see §17.1 candidate 1 (component library selection rationale).

**Remediation:** v2.0 architectural decision: (a) expand framer-motion deployment via motion-vocabulary + page-transition + skeleton-load patterns; OR (b) deprecate framer-motion + remove from package.json; OR (c) document rationale-for-installed-but-sparse in `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Estimated ~2-4h decision + ~variable execution.

#### Domain 0C-CMP consolidated summary

7 component library inventory (`src/design-system/`): AppShell + Badge + DotScale + LockedOverlay + SectionCard + Sidebar + TopBar. Two design-system token files (`tokens.ts` 234 LOC + `semanticColors.ts` 27 LOC) provide token surface. Storybook absence (0C-CMP-03) means no canonical component documentation surface; designers + developers verify component behavior by reading source code rather than visual playground. Per v2.0 design system codification roadmap, the canonical component library expansion (Button + Card + Modal + Form + Input + Select + Tabs + Toast + Tooltip + DataTable + Dialog primitives) is Phase 2 territory per L117. Library-vs-deployment mismatch surfaced at 0C-CMP-05 (framer-motion 1-file deployment) is the canonical pattern signal for "library installed not deployed at scale"; cross-reference to 0C-PAT-04 motion-sparse-deployment. Form handling pattern (0C-CMP-04) is implicit (no React Hook Form / Formik observed); per `src/ui/auth/MFASetup.tsx` + sister authentication surfaces, native HTML form patterns + manual state management dominate. Estimated v2.0 component library expansion: ~80-120h for primitives + ~40-60h for Storybook deployment + ~20-30h for design-system documentation site.

### 3.6 Domain 0C-NAV (Navigation + IA)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-NAV-01 | Primary navigation pattern (Sidebar) | MEDIUM (P2) | `src/design-system/Sidebar.tsx` |
| 0C-NAV-02 | Secondary navigation pattern (TopBar) | MEDIUM (P2) | `src/design-system/TopBar.tsx` |
| 0C-NAV-03 | Breadcrumb convention | DOCUMENTATION (file:line resolution via grep at v2.0 Phase 2 polish arc) | TBD |
| 0C-NAV-04 | Search surface | DOCUMENTATION (file:line resolution via grep at v2.0 Phase 2 polish arc) | TBD |
| 0C-NAV-05 | User-flow audit (login + module-entry + patient-detail + gap-detail + recommendation-action) | MEDIUM (P2) | per-module ui/ surfaces |
| 0C-NAV-06 | Information architecture (route + module + service-line + research view organization) | MEDIUM (P2) | `src/ui/` + `src/pages/` + `src/App.tsx` routing |

#### Finding 0C-NAV-01 (MEDIUM P2)

**Standard:** Primary navigation pattern per WAI-ARIA Authoring Practices Guide navigation landmark (`<nav>` element + `aria-label`); WCAG 2.2 SC 2.4.1 Bypass Blocks Level A; SC 2.4.3 Focus Order Level A.

**Gap statement:** Primary navigation via `src/design-system/Sidebar.tsx` (per-module + admin + research + revenueCycle + dataManagement entry points). 2 aria-label/navigation patterns at Sidebar.tsx per B0C.4-EXT.0 grep. Sidebar layout + responsive collapse + active-route highlighting + per-module color-tinting (sister glassmorphism module-color mapping per §5.2) deployment depth + accessibility conformance TBD-verify at v2.0 Phase 2 polish arc.

**Cross-references:** see 0C-NAV-02 secondary navigation (sister TopBar); see 0C-A11Y-01 + 0C-A11Y-03 (parent accessibility); see §5.2 glassmorphism module-color mapping.

**Remediation:** Per-route accessibility audit + active-state highlighting verification + responsive-collapse keyboard accessibility. Estimated ~3-5h. v2.0 Phase 2 territory.

#### Finding 0C-NAV-02 (MEDIUM P2)

**Standard:** Secondary navigation pattern per ARIA navigation landmark; user-menu pattern per WAI-ARIA APG menubutton.

**Gap statement:** Secondary navigation via `src/design-system/TopBar.tsx` (user menu + notifications + global actions). 1 aria-label/navigation pattern at TopBar.tsx + 8 UserMenu aria patterns per B0C.1.6 grep. User-menu menubutton pattern + dropdown focus-trap + notifications-panel keyboard accessibility TBD-verify.

**Cross-references:** see 0C-NAV-01 primary navigation (sister); see 0C-A11Y-04 ARIA 1.2 widget patterns (menubutton + menu).

**Remediation:** Per-control accessibility audit + menu-pattern conformance against WAI-ARIA APG menubutton + notifications-panel live-region pattern. Estimated ~3-5h. v2.0 Phase 2 territory.

#### Finding 0C-NAV-03 (DOCUMENTATION)

**Standard:** Breadcrumb pattern per WAI-ARIA APG breadcrumb (`<nav aria-label="Breadcrumb">` + `<ol>` + `aria-current="page"`).

**Gap statement:** No dedicated Breadcrumb component in `src/design-system/`. 3 breadcrumb-pattern occurrences across 2 files (TopBar + Sidebar contain `aria-label="navigation"` patterns; not breadcrumb-specific) per B0C.4-EXT.0 grep. Per-module breadcrumb navigation absent; user position in deep navigation (Module > Service Line > Patient Detail > Gap Detail) not surfaced.

**Cross-references:** see 0C-CMP-02 component coverage gaps (Breadcrumb primitive missing); see 0C-NAV-05 user flows (deep navigation surfaces).

**Remediation:** v2.0 design system codification arc: Breadcrumb component primitive + per-module deployment + WAI-ARIA APG conformance. Estimated ~3-5h.

#### Finding 0C-NAV-04 (DOCUMENTATION)

**Standard:** Search-as-interaction pattern per WAI-ARIA APG combobox + Autosuggest pattern; `<input type="search">` semantic input.

**Gap statement:** Module-level search surface absent. Per B0C.4-EXT.0 grep: 4 search-pattern occurrences across 3 files - all admin-scoped (`src/ui/admin/GodView/GlobalSearch.tsx` + sister GodView index/main files). Clinician personas lack patient-search / gap-search / module-level search surface. Admin GodView GlobalSearch is the only canonical search.

**Cross-references:** see 0C-NAV-05 user flows; see Phase 4 4-3PL-02 admin / data-plane separation observation.

**Remediation:** v2.0 design system codification arc: SearchInput component primitive + per-persona search surface (patient-search for clinician + module-level secondary search). Estimated ~6-10h.

#### Finding 0C-NAV-05 (MEDIUM P2)

**Standard:** User-flow audit conventions: per-persona journey mapping; click-depth measurement; abandonment-risk identification.

**Gap statement:** Canonical clinician user flows: login + MFA + module-entry + patient-detail + gap-detail + recommendation-action. Secondary persona flows: revenue-cycle (RCOperationsView entry) + research (ResearchExecutiveView entry) + admin (SuperAdminDashboard entry). Per-flow click-depth + abandonment-risk + accessibility TBD-verify at v2.0 Phase 2 polish arc. No documented user-journey map in repo.

**Cross-references:** see 0C-NAV-01 + 0C-NAV-02 (primary + secondary navigation); see 0C-MOD-01 through 06 (per-module maturity).

**Remediation:** Per-persona journey map authoring + per-flow accessibility + click-depth audit. Estimated ~10-15h. v2.0 Phase 2 territory.

#### Finding 0C-NAV-06 (MEDIUM P2)

**Standard:** Information architecture (IA) per Nielsen Norman Group + per Phase 4 §17.1 entry 17 three-plane-discipline rationale.

**Gap statement:** Route + module + service-line + research view organization via `src/ui/` + `src/pages/` + `src/App.tsx` routing. Per Phase 4 4-3PL-02 sister: admin / godView / internalOps surfaces share UI shell with patient-data routes (no plane-separation visual cue at frontend nav layer; sister architectural observation). IA documentation absent; per-persona persona-to-view mapping not codified.

**Cross-references:** see Phase 4 4-3PL-01 + 4-3PL-02 + §17.1 entry 17 (sister at architectural observation layer); see 0C-NAV-05 user flows.

**Remediation:** v2.0 architectural decision per Phase 4 §17.1 entry 17 trigger conditions; if plane-separation visual cue surfaces as remediation target, deploy at AppShell + Sidebar layer. Estimated ~4-6h IA documentation + ~variable execution. v2.0 territory.

#### Domain 0C-NAV consolidated summary

Primary navigation via `src/design-system/Sidebar.tsx` (per-module + admin + research + revenueCycle + dataManagement entry points); secondary navigation via `src/design-system/TopBar.tsx` (user menu + notifications + global actions); shell at `AppShell.tsx` composes the two surfaces. Breadcrumb + search + module-level secondary navigation conventions TBD at B0C.4 grep extension; current evidence suggests ad-hoc per-module patterns rather than design-system-codified breadcrumb component. User flows: login + module-entry + patient-detail + gap-detail + recommendation-action are the canonical clinician flows; revenue-cycle + research + admin are secondary persona flows. IA observation per 4-3PL-02 sister Phase 4 finding: admin / godView / internalOps surfaces share UI shell with patient-data routes (no plane-separation visual cue per Phase 4 4-3PL-02 architectural observation; sister at frontend nav layer). Remediation framework: (1) per-flow user-journey audit at B0C.4 evidence-gathering; (2) breadcrumb + search component codification deferred to v2.0 design system arc per L117; (3) plane-separation visual cue (sister 4-3PL-02) considered at v2.0 architectural decision per Phase 4 §10.3 carry-forward.

### 3.7 Domain 0C-MOD (Per-module UI maturity)

Per Q2 Module Parity Principle: all 6 cardio modules audited consistently. One finding per module.

| ID | Module | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-MOD-01 | Heart Failure (HF) | MEDIUM (P2) | `src/ui/heartFailure/`; `src/components/heartFailure/` (10 components) |
| 0C-MOD-02 | Electrophysiology (EP) | MEDIUM (P2) | `src/ui/electrophysiology/`; `src/components/electrophysiology/` |
| 0C-MOD-03 | Structural Heart (SH) | MEDIUM (P2) | `src/ui/structuralHeart/` |
| 0C-MOD-04 | Coronary Intervention (CAD) | MEDIUM (P2) | `src/ui/coronaryIntervention/` (views + config) |
| 0C-MOD-05 | Valvular Disease (VHD) | MEDIUM (P2) | `src/ui/valvularDisease/` |
| 0C-MOD-06 | Peripheral Vascular (PVD) | MEDIUM (P2) | `src/ui/peripheralVascular/` |

#### Finding 0C-MOD-01 (MEDIUM P2)

**Standard:** Per-module UI maturity dimensions: executive view + service-line view + care-team view + module-specific clinical-UI components + glassmorphism deployment consistency.

**Gap statement:** Heart Failure (HF) module at `src/ui/heartFailure/` + `src/components/heartFailure/` (10 components per B0C.4.0 inventory; highest component depth across modules). Module-color assignment: Chrome Blue Dark (`#2C4A60`) per `tokens.ts:101`; glass class `glass-chrome-blue` per `tokens.ts:111`. Per-view depth: ExecutiveView + ServiceLineView + CareTeamView triple-pattern per L78 canonical service-line + research view scope. Specific HF clinical-UI components: MAGGICScoreCalculator + HFPhenotypeClassification + GDMTContraindicationChecker + AdvancedDeviceTracker + ClinicalGapDetectionDashboard + PhenotypeDetectionChart per `src/ui/heartFailure/components/`.

**Cross-references:** see Phase 0B HF audit addendum (`docs/audit/PHASE_0B_HF_AUDIT_ADDENDUM.md`); see 0C-CLI-03 risk-score verification (MAGGIC + FRAMINGHAM); see 0C-CLI-07 phenotype rendering; see §5.2 glassmorphism module-color mapping.

**Remediation:** v2.0 Phase 2 polish arc per L117; module-maturity audit + per-view depth assessment + clinical-UI component coverage gap identification. Estimated ~4-6h per module.

#### Finding 0C-MOD-02 (MEDIUM P2)

**Standard:** Sister 0C-MOD-01 dimensions applied to Electrophysiology (EP).

**Gap statement:** EP module at `src/ui/electrophysiology/` (deep view + component structure per B0C.4-EXT.0 grep: EPModule + executive + clinical + care-team component clusters). Module-color: Chrome Blue Mid (`#4A6880`); shared `glass-chrome-blue` with HF per `tokens.ts:111`. EP-specific clinical-UI: EPCHADSVAScCalculator + LAACRiskDashboard + EPPhenotypeClassification + EPAnticoagulationContraindicationChecker + EPClinicalDecisionSupport + EPClinicalGapDetectionDashboard + EPAdvancedDeviceTracker.

**Cross-references:** see Phase 0B EP audit addendum; see 0C-CLI-03 CHA2DS2VASc verification; see 0C-CLI-04 anticoagulation drug-interaction sister.

**Remediation:** Bundled with 0C-MOD-01 per-module audit pattern. Estimated ~4-6h.

#### Finding 0C-MOD-03 (MEDIUM P2)

**Standard:** Sister 0C-MOD-01 dimensions applied to Structural Heart (SH).

**Gap statement:** SH module at `src/ui/structuralHeart/` (executive + service-line + care-team view structure per B0C.4-EXT.0 grep + StructuralHeartModule + SHFacilityDetailModal + SHBenchmarkDetailModal). Module-color: Carmona Red (`#7A1A2E`); glass class `glass-carmona-red` per `tokens.ts:113`. SH-specific clinical-UI: STS Risk Calculator (cross-references `src/components/riskCalculators/STSRiskCalculator.tsx`); SYNTAX Score Calculator (sister; `src/components/riskCalculators/SYNTAXScoreCalculator.tsx`).

**Cross-references:** see Phase 0B SH audit addendum; see 0C-CLI-03 STS + SYNTAX risk-score verification; see §5.2 glassmorphism module-color mapping.

**Remediation:** Bundled with 0C-MOD-01 per-module audit pattern. Estimated ~4-6h.

#### Finding 0C-MOD-04 (MEDIUM P2)

**Standard:** Sister 0C-MOD-01 dimensions applied to Coronary Intervention (CAD).

**Gap statement:** CAD module at `src/ui/coronaryIntervention/` (views + config structure; CoronaryInterventionModule + ExecutiveView + ServiceLineView + CareTeamView + TIMIScoreCalculator + SYNTAXScoreCalculator per B0C.4-EXT.0 grep). Module-color: Deep Forest (`#1A4A2E`); glass class `glass-forest-green` per `tokens.ts:114`. CAD-specific clinical-UI: GRACE + TIMI + SYNTAX risk scores.

**Cross-references:** see Phase 0B CAD audit addendum; see 0C-CLI-03 GRACE + TIMI + SYNTAX risk-score verification.

**Remediation:** Bundled with 0C-MOD-01 per-module audit pattern. Estimated ~4-6h.

#### Finding 0C-MOD-05 (MEDIUM P2)

**Standard:** Sister 0C-MOD-01 dimensions applied to Valvular Disease (VHD).

**Gap statement:** VHD module at `src/ui/valvularDisease/` (ValvularDiseaseModule + ExecutiveView + ServiceLineView + CareTeamView + ValvularExecutiveKPICard + ValvularSurgicalNetworkVisualization + ValvularInterventionPathwayFunnel + ValvePatientHeatmap + ValvePhenotypeClassification + AdvancedValveProcedureTracker + ValvularGeographicHeatMap + ValvularFinancialWaterfall per B0C.4-EXT.0 grep). Module-color: Aged Gold (`#8B6914`); glass class `glass-liquid-teal` per `tokens.ts:115`. VHD-specific clinical-UI: severity grading per 2020 ACC/AHA VHD Guideline (sister §16 verification surface).

**Cross-references:** see Phase 0B VHD audit addendum; see 0C-CLI-03 sister; see 2020 ACC/AHA VHD Guideline severity grading.

**Remediation:** Bundled with 0C-MOD-01 per-module audit pattern. Estimated ~4-6h.

#### Finding 0C-MOD-06 (MEDIUM P2)

**Standard:** Sister 0C-MOD-01 dimensions applied to Peripheral Vascular (PVD).

**Gap statement:** PVD module at `src/ui/peripheralVascular/` (PeripheralVascularModule + ExecutiveView + ServiceLineView + CareTeamView + WIfIClassification + PADExecutiveKPICard + PADInterventionPathwayFunnel + LimbSalvageScreening + WoundCareIntegration + LimbSalvageChecklist + CasePlanningWorksheet + PVWoundCareNetworkVisualization + PADReportingSystem + PADFinancialWaterfall per B0C.4-EXT.0 grep). Module-color: Gunmetal (`#2E3440`); glass class `glass-gunmetal` per `tokens.ts:116`. PVD-specific clinical-UI: WIfI Classification per 2024 ACC/AHA PAD Guideline (sister §16 verification surface; AUDIT-067/068 ABI cross-reference).

**Cross-references:** see Phase 0B PV audit addendum; see 0C-CLI-03 WIfI verification; see 2024 ACC/AHA PAD Guideline; see AUDIT-067/068 ABI consumer audit precedent (sister §16 verification pattern).

**Remediation:** Bundled with 0C-MOD-01 per-module audit pattern. Estimated ~4-6h.

#### Domain 0C-MOD consolidated summary

All 6 cardio modules have `src/ui/<module>/` surface per Module Parity Principle (Q2 operator confirmation). Per-module component depth varies: `src/components/heartFailure/` has 10 components (highest depth per B0C.4.0 inventory); other modules TBD-count at deeper grep. Maturity assessment dimensions per module: (1) executive view presence + completeness; (2) service-line view presence + completeness; (3) care-team view presence + completeness; (4) module-specific clinical-UI components (risk calculators + therapy gap rendering + alerting); (5) glassmorphism deployment consistency (sister §5.2 + per-module glass class mapping per `tokens.ts:110-117`); (6) clinical-content depth per Phase 0B addendum cross-reference. v2.0 Phase 2 polish arc will need to address asymmetric per-module depth.

### 3.8 Domain 0C-SLR (Service-line + research view audit)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-SLR-01 | Service-line view audit per module (ExecutiveView + CareTeamView + ServiceLineView patterns) | MEDIUM (P2) | per-module ui/ surfaces (e.g., `ExecutiveView.tsx`, `ServiceLineView.tsx`, `CareTeamView.tsx`) |
| 0C-SLR-02 | Research view audit | MEDIUM (P2) | `src/ui/research/views/` (ResearchExecutiveView + ResearchServiceLineView + ResearchCareTeamView) |
| 0C-SLR-03 | Revenue Cycle view audit (RCOperationsView) | MEDIUM (P2) | `src/ui/revenueCycle/` |
| 0C-SLR-04 | Admin + Data Management view audit | MEDIUM (P2) | `src/ui/admin/`, `src/ui/dataManagement/` |

#### Finding 0C-SLR-01 (MEDIUM P2)

**Standard:** Per-module triple-view pattern (ExecutiveView + ServiceLineView + CareTeamView) for clinician + service-line + leadership personas.

**Gap statement:** Service-line view audit per module follows consistent triple-view pattern per `src/ui/<module>/views/` (HF + EP + SH + CAD + VHD + PV all present). Per-view depth + KPI surface completeness + chart density + clinical context preservation + drill-down depth audit deferred to v2.0 Phase 2 polish arc per L117. Module Parity Principle per Q2 requires consistent view-pattern application across all 6 modules.

**Cross-references:** see 0C-MOD-01 through 06 (per-module maturity sister); see L78 canonical service-line + research view scope.

**Remediation:** v2.0 Phase 2 polish arc per-view audit. Estimated ~4-6h per module x 6 = ~24-36h.

#### Finding 0C-SLR-02 (MEDIUM P2)

**Standard:** Research persona view pattern; per L78 canonical scope.

**Gap statement:** Research views at `src/ui/research/views/` (ResearchExecutiveView + ResearchServiceLineView + ResearchCareTeamView per B0C.4-EXT.0 grep; intentional pattern parity with cardio modules). Research-specific surfaces (clinical-trial enrollment + registry eligibility + cohort-export workflows) deployment depth + accessibility TBD-verify at v2.0 Phase 2 polish arc.

**Cross-references:** see 0C-SLR-01 service-line view sister; see Phase 0B research-extension cross-module patterns (per CAD audit §11 cross-module synthesis).

**Remediation:** Per-research-view audit + clinical-trial workflow accessibility + cohort-export user-flow assessment. Estimated ~4-6h. v2.0 Phase 2 territory.

#### Finding 0C-SLR-03 (MEDIUM P2)

**Standard:** Sister 0C-SLR-01 + 0C-SLR-02 pattern applied to revenue-cycle persona.

**Gap statement:** Revenue Cycle view (`src/ui/revenueCycle/`: RevenueCycleModule + RCExecutiveView + RCOperationsView + RCCDIView per B0C.4-EXT.0 grep). Separate persona surface for revenue-cycle integration patterns (DRG optimization + CDI documentation + financial-waterfall workflows). Sister to clinical-UI patterns but distinct workflow surface.

**Cross-references:** see 0C-SLR-01 + 0C-SLR-02 (sister persona views); see Phase 4 4-3PL-02 (admin / plane separation observation sister).

**Remediation:** Per-RC-view audit + financial-data accuracy + CDI workflow accessibility. Estimated ~4-6h. v2.0 Phase 2 territory.

#### Finding 0C-SLR-04 (MEDIUM P2)

**Standard:** Administrative persona view pattern; per Phase 4 4-3PL-02 architectural observation sister.

**Gap statement:** Admin + Data Management views (`src/ui/admin/`: SuperAdminDashboard + SuperAdminConsole + tabs/* including PlatformOverview + UsersManagement + HealthSystems + CustomerSuccess + AuditSecurity + PlatformConfiguration + DataManagement; sister `src/ui/admin/GodView/` super-admin surface with GlobalSearch + ModuleCard + CrossModuleAnalytics + SystemHealthPanel). Control-plane persona surface per Phase 4 §17.1 entry 17 three-plane-discipline-absence rationale sister; no visual plane-separation cue per 4-3PL-02 finding.

**Cross-references:** see Phase 4 4-3PL-02 plane separation observation; see 0C-NAV-04 search surface (GlobalSearch admin-scoped); see Phase 5 5-PRV-08 accounting-of-disclosures (admin audit surface sister).

**Remediation:** Per-admin-view audit + control-plane-vs-data-plane visual distinction consideration (per Phase 4 4-3PL-02 v2.0 carry-forward). Estimated ~4-6h. v2.0 Phase 2 territory.

#### Domain 0C-SLR consolidated summary

Per L78 canonical scope: service-line + research view audit. Service-line views per module follow consistent triple-view pattern (Executive + ServiceLine + CareTeam) per B0C.1.6 inventory at `src/ui/<module>/views/`. Research views at `src/ui/research/views/` (ResearchExecutiveView + ResearchServiceLineView + ResearchCareTeamView; intentional pattern parity with cardio modules). Revenue Cycle view (RCOperationsView) is a separate persona surface. Admin + Data Management views are administrative-persona surfaces (sister Phase 4 4-3PL-02 architectural observation; control-plane surface). View-level audit at B0C.4 evidence: each view's KPI surface + chart density + clinical context preservation + drill-down depth.

### 3.9 Domain 0C-OBS (Observability + error tracking)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-OBS-01 | Frontend error tracking (Sentry / Datadog / Bugsnag) | MEDIUM (P2) | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-OBS-02 | Real-User Monitoring (sister Phase 4 §17.1 entry 21 logs-only-observability stance) | MEDIUM (P2) | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-OBS-03 | Structured frontend logging (sister `backend/src/utils/logger.ts` pattern) | DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |

#### Finding 0C-OBS-01 (MEDIUM P2)

**Standard:** Frontend error-tracking tooling: Sentry (recommended for unified error + performance + RUM) / Datadog / Bugsnag / LogRocket / FullStory.

**Gap statement:** No frontend error-tracking service in repo per B0C.4-EXT.0 grep (0 Sentry / Datadog / Bugsnag references in `package.json`). ErrorBoundary IS deployed: 24 ErrorBoundary occurrences across 4 files (`src/utils/ErrorHandler.ts:1`, `src/App.tsx:10`, `src/auth/ProtectedRoute.tsx:3`, `src/components/shared/ErrorFallback.tsx:10`). Errors caught at boundary but NOT reported to external service; production user-encountered errors invisible to operator.

**Cross-references:** see Phase 4 4-ALR-01 + 4-ALR-02 + 4-APM-01 (backend operational observability gate items; sister at frontend layer); see §17.1 entry 21 logs-only-observability stance sister; see 0C-PERF-02 RUM sister.

**Remediation:** Select error-tracking service (Sentry recommended for unified surface); instrument ErrorBoundary callback + window.onerror + unhandledrejection handlers; configure source map upload + release tracking. Estimated ~6-10h. v2.0 Phase 2 territory.

#### Finding 0C-OBS-02 (MEDIUM P2)

**Standard:** Real-User Monitoring tools: Sentry Performance / Datadog RUM / Google Analytics 4 / Cloudflare Web Analytics / SpeedCurve.

**Gap statement:** Sister to 0C-PERF-02 RUM finding. No frontend RUM in repo. Sister to Phase 4 §17.1 entry 21 logs-only-observability stance codification at frontend layer.

**Cross-references:** see 0C-PERF-02 RUM sister; see Phase 4 §17.1 entry 21 codification.

**Remediation:** Bundled with 0C-PERF-02 RUM tool selection + 0C-OBS-01 error-tracking (Sentry unifies error + performance + RUM if selected). Estimated bundled.

#### Finding 0C-OBS-03 (DOCUMENTATION)

**Standard:** Structured frontend logging pattern: sister `backend/src/utils/logger.ts` Winston pattern adapted to frontend (or browser-side equivalents like `loglevel` / `pino`).

**Gap statement:** Frontend uses `console.*` patterns ad-hoc; no centralized logger primitive equivalent to backend `logger.ts`. Per CLAUDE.md §14 NEVER DO list: "Never leave PHI (patient names, MRN, DOB, addresses) in logs, error messages, or console output." Frontend lacks the PHI-scrubbing format that backend `logger.ts:14-50 excludeSensitiveData` enforces; ad-hoc console.* usage risks PHI leak to browser dev tools console + error-tracking RUM payloads.

**Cross-references:** see CLAUDE.md §14 NEVER DO list; see backend `logger.ts:14-50` PHI-scrubbing format (sister); see 5-TEC-03 audit controls (sister discipline).

**Remediation:** Author frontend `src/utils/logger.ts` primitive with PHI-scrubbing format; deprecate ad-hoc console.* usage via lint rule (`no-console` with exceptions for development); migrate consumers. Estimated ~6-10h. v2.0 Phase 2 territory.

#### Domain 0C-OBS consolidated summary

Sister to Phase 4 §17.1 entry 21 logs-only-observability stance at frontend layer. Per Phase 4 codification, logs-only is the acceptable decision at pilot scale; alerting + APM is the gap. At frontend layer the gap is: no error-tracking (Sentry / Datadog / Bugsnag absence per `package.json` review); no RUM (sister 0C-PERF-02); no structured frontend logging (sister backend `logger.ts` pattern). v2.0 Phase 2 territory for substantive remediation. Recommendation: select Sentry for unified error + performance + RUM single tooling decision; integrates with backend (sister CSO security audit consideration); supports source map + release tracking for production debugging.

### 3.10 Domain 0C-CAT (Catalog of UI surfaces)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-CAT-01 | Route + page catalog | DOCUMENTATION (catalog deliverable per L75) | `src/App.tsx` routing; `src/pages/` |
| 0C-CAT-02 | Component catalog (365 .tsx in `src/`) | DOCUMENTATION | `src/components/` (12 feature directories + 14 sub-modules) |

#### Finding 0C-CAT-01 (DOCUMENTATION)

**Standard:** Route + page catalog deliverable per L75 ("Catalog all current UI surfaces").

**Gap statement:** Route catalog at `src/App.tsx` (react-router-dom 6.20.0 Router) + per-module entry points + `src/pages/` (auxiliary pages: AuthCallback). No standalone documentation enumerating all routes + per-route persona-mapping; new operators discover routes by reading source code.

**Cross-references:** see 0C-NAV-06 information architecture; see 0C-MOD-01 through 06 (per-module entry points).

**Remediation:** Author `docs/architecture/ROUTES_CATALOG.md` enumerating routes + persona-mapping + access-control-scope per route. Estimated ~3-5h. v2.0 design system codification arc per L117.

#### Finding 0C-CAT-02 (DOCUMENTATION)

**Standard:** Component catalog deliverable per L75.

**Gap statement:** 365 .tsx files in `src/` + 56 .ts files. Component organization across 4 layers: `src/design-system/` (7 design-system components); `src/components/` (12 feature directories: crossReferral + electrophysiology + financial + free-tier + heartFailure + notifications + phenotypeDetection + populationHealth + reporting + riskCalculators + shared + test + therapyGap + visualizations); `src/ui/` (10 module/view directories); `src/pages/` (auxiliary). No standalone component catalog; designers + developers grep source code to discover components.

**Cross-references:** see 0C-CMP-01 (current 7-component library inventory); see 0C-CMP-03 Storybook absence.

**Remediation:** Author `docs/architecture/COMPONENT_CATALOG.md` enumerating all 421 frontend files with per-component scope statement + usage pattern; OR deploy Storybook (sister 0C-CMP-03) to serve as visual + searchable catalog surface. Estimated ~10-15h documentation OR ~40-60h Storybook deployment (sister 0C-CMP-03 estimate).

#### Domain 0C-CAT consolidated summary

Catalog deliverable per canonical L75 ("Catalog all current UI surfaces (every page, every component)"). Route catalog at `src/App.tsx` routing + `src/pages/`; component catalog at `src/components/` (12 feature directories: crossReferral, electrophysiology, financial, free-tier, heartFailure, notifications, phenotypeDetection, populationHealth, reporting, riskCalculators, shared, test, therapyGap, visualizations) + `src/ui/` (10 module/view directories) + `src/design-system/` (7 components + 2 token files). Total 365 .tsx + 56 .ts files. Detailed catalog deferred to v2.0 design system spec authoring per L117 implementation territory; Phase 0C documents the catalog scope + entry points.

### 3.11 Domain 0C-COL (Color system; token-conflict primary finding)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-COL-01 | **Design-token-strategy single-source-of-truth violation** (per Q-B): `tokens.ts:67-94` exports `semantic` AND `semanticColors.ts:2-10` exports DIFFERENT `semantic` (7 buckets); same surface for `chartColors` (8 colors at `tokens.ts:140-149` vs 12 colors at `semanticColors.ts:12-25`). Header claim at `tokens.ts:1-5` "Single source of truth for programmatic color/style access" is FALSE per current state. | MEDIUM (P2) DOCUMENTATION | `src/design-system/tokens.ts:1-5,67-94,140-149`; `src/design-system/semanticColors.ts:2-25` |
| 0C-COL-02 | Color palette completeness (Chrome Blue + Arterial / Carmona Red + Titanium Neutrals 11 stops each) | DOCUMENTATION | `tokens.ts:9-53` |
| 0C-COL-03 | Module identity colors (6 modules with mid + glow + peak) | DOCUMENTATION | `tokens.ts:100-107` |
| 0C-COL-04 | Dark mode coverage (2 occurrences in `index.css` only; Tailwind `dark:` essentially unused; no ThemeProvider) | LOW (P3) DOCUMENTATION | `src/index.css:2` |
| 0C-COL-05 | Colorblind considerations (chart palette + status colors verification under deuteranopia / protanopia / tritanopia simulations) | LOW (P3) DOCUMENTATION | `tokens.ts:131-149` |

#### Finding 0C-COL-01 (MEDIUM P2 DOCUMENTATION) - see §5.1

Token-conflict primary finding treated in detail at §5.1 substantive engineering signal section. Single-source-of-truth violation at `tokens.ts` + `semanticColors.ts` competing exports. §17.1 architectural-precedent candidate "design token strategy" promoted via this finding; flagged for SEPARATE methodology PR per §17.3.

**Cross-references:** see §5.1 detailed treatment; see §17.1 entry 15 canonical-purpose single-source-of-truth pattern (PR #283 sister precedent).

#### Finding 0C-COL-02 (DOCUMENTATION)

**Standard:** Design system palette completeness convention (11-stop palettes per Tailwind / Material Design convention).

**Gap statement:** Color palette completeness at `tokens.ts:9-53` documented across 3 palettes: Chrome Blue + Arterial / Carmona Red + Titanium Neutrals (11 stops each: 50-950). Sister surface system at `tokens.ts:55-63` (base/raised/elevated/overlay/bright). Sister semantic colors at `tokens.ts:67-94` (background/surface/text/borders/interactive). Palette depth is comprehensive; documentation captures the canonical inventory.

**Cross-references:** see 0C-COL-01 (parent token-conflict); see §5.1 detailed treatment.

**Remediation:** Document palette completeness in `docs/architecture/DESIGN_SYSTEM_SPEC.md` at v2.0 design system codification arc. Estimated bundled with §5.1 token consolidation.

#### Finding 0C-COL-03 (DOCUMENTATION)

**Standard:** Per-module identity color convention.

**Gap statement:** Module identity colors at `tokens.ts:100-107` define 6 cardio modules each with mid + glow + peak colors: HF Chrome Blue Dark + EP Chrome Blue Mid + SH Carmona Red + CAD Deep Forest + VHD Aged Gold + PVD Gunmetal. Sister module glass-class mapping at `tokens.ts:110-117` (5 distinct glass classes; HF + EP share `glass-chrome-blue`). Module identity color system is mature design-system infrastructure.

**Cross-references:** see §5.2 glassmorphism canonical visual treatment (module-color tinting); see 0C-MOD-01 through 06 (per-module deployment audit sister).

**Remediation:** Document module identity color system in `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Estimated bundled with 0C-CMP-03 Storybook deployment + module-token documentation.

#### Finding 0C-COL-04 (LOW P3 DOCUMENTATION)

**Standard:** Tailwind `dark:` variant + `prefers-color-scheme` media query + ThemeProvider pattern.

**Gap statement:** Dark mode essentially unused per B0C.2.0 grep (2 occurrences in `src/index.css:2` only; Tailwind `dark:` prefix essentially unused; no ThemeProvider; no theme switching surface). Dark mode is NOT a current deployment.

**Cross-references:** see §5.2 glassmorphism (current canonical visual treatment is light-mode glassmorphism); see 0C-A11Y-01 WCAG conformance (dark-mode-considerations for night-shift clinician personas).

**Remediation:** v2.0 architectural decision: (a) implement dark mode for night-shift personas; OR (b) document N/A status with trigger conditions. Estimated ~20-40h dark-mode implementation OR ~30min N/A documentation. v2.0 territory.

#### Finding 0C-COL-05 (LOW P3 DOCUMENTATION)

**Standard:** Colorblind verification convention: deuteranopia / protanopia / tritanopia / achromatopsia simulations against WCAG 2.2 SC 1.4.1 Use of Color.

**Gap statement:** Chart palette (`tokens.ts:140-149` 8 colors; `semanticColors.ts:12-25` 12 colors per §5.1 token-conflict) + status colors (`tokens.ts:131-136` 4 status with glow) verification under colorblind simulations not documented. WCAG SC 1.4.1 requires color is not the only means of conveying information; chart palette readability under simulations is the verification surface.

**Cross-references:** see 0C-A11Y-01 WCAG conformance; see §5.1 token-conflict (chart palette is a token-conflict surface).

**Remediation:** Run chart palette + status color through Coblis / Stark / sister simulator tools; document conformance + remediation per simulation. Estimated ~3-5h. v2.0 Phase 2 territory.

#### Domain 0C-COL consolidated summary

Color system has both depth (3x 11-stop palettes; module identity colors; status colors; chart palettes; surface system; semantic colors) and conflict (sister §5.1 substantive engineering signal section). Primary finding 0C-COL-01 token-conflict treated in detail at §5.1. Secondary findings: palette completeness (0C-COL-02 documented at `tokens.ts:9-53`); module identity colors (0C-COL-03 documented at `tokens.ts:100-107`); dark mode coverage (0C-COL-04 essentially unused; LOW P3 documentation); colorblind considerations (0C-COL-05 chart palette + status color verification under simulations). v2.0 Phase 2 territory for substantive remediation: token-source consolidation + WCAG 1.4.3 contrast matrix authoring + colorblind simulation verification.

### 3.12 Domain 0C-TYP (Typography)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-TYP-01 | 3-family typography stack (Playfair Display display + DM Sans body + IBM Plex Mono data) | DOCUMENTATION | `tokens.ts:165-180` |
| 0C-TYP-02 | Web font loading strategy (FOIT / FOUT / preload / font-display) | LOW (P3) DOCUMENTATION | TBD-grep `src/index.html`, `public/index.html` at B0C.4 |
| 0C-TYP-03 | Clinical-density readability (line-height + measure + size hierarchy for dense clinical data) | LOW (P3) DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |

#### Finding 0C-TYP-01 (DOCUMENTATION)

**Standard:** Multi-family typography stack convention; weight + size + line-height + letter-spacing per Tailwind / Google Fonts canonical patterns.

**Gap statement:** 3-family typography stack at `tokens.ts:165-180`: Playfair Display (display weight 700; luxury serif for headlines + numerals); DM Sans (body weight 400; neutral sans-serif optimized for clinical readability); IBM Plex Mono (data weight 400; tabular numerals + technical-detail rendering). Font selection signals design system aspiration (sister §5.2 glassmorphism luxury-positioning rationale).

**Cross-references:** see §5.2 glassmorphism (sister luxury-positioning); see 0C-TYP-02 web font loading.

**Remediation:** Document font selection rationale + per-context font-family usage convention in `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Estimated bundled with 0C-CMP-03 Storybook + design-system documentation.

#### Finding 0C-TYP-02 (LOW P3 DOCUMENTATION)

**Standard:** Web font loading strategy per Google Web Fundamentals: preconnect + preload + font-display:swap to avoid FOIT (Flash of Invisible Text) + FOUT (Flash of Unstyled Text).

**Gap statement:** Web font loading at `public/index.html:L26-L28` deploys Google Fonts CDN with proper strategy: `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` + `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`. **Strong font-loading strategy: preconnect + display=swap deployed correctly.** Comment header at L25 "Chrome and Crimson Design System - Google Fonts" cross-references design system identity.

**Evidence:** B0C.4-EXT.0 `head -30 public/index.html` verified the canonical pattern.

**Cross-references:** see 0C-TYP-01 typography stack; see 0C-PERF-01 LCP target (web font loading impacts LCP).

**Remediation:** No action required; strong loading strategy. Document conformance in `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Optional: consider self-hosted fonts for privacy-sensitive deployments (Google Fonts CDN sends IP + user-agent to Google).

#### Finding 0C-TYP-03 (LOW P3 DOCUMENTATION)

**Standard:** Clinical-density typography per Material Design + Carbon Design System + clinical-UI best practices: line-height 1.4-1.6 for body text; measure 45-75 characters per line; size hierarchy 4-6 tiers + 1.25x or 1.333x type scale ratio.

**Gap statement:** Clinical-density readability (line-height + measure + size hierarchy for dense clinical data) not codified at design system spec layer. Per-view application audit deferred to v2.0 Phase 2 polish arc per L117.

**Cross-references:** see 0C-TYP-01 typography stack; see 0C-A11Y-01 WCAG conformance (SC 1.4.12 Text Spacing).

**Remediation:** Author clinical-density typography spec in `docs/architecture/DESIGN_SYSTEM_SPEC.md` + per-view audit at v2.0 Phase 2 polish arc. Estimated ~2-3h spec + per-view audit ~variable.

#### Domain 0C-TYP consolidated summary

3-family typography stack per `tokens.ts:165-180`: Playfair Display (display weight 700; luxury-positioned serif for headlines + numerals); DM Sans (body weight 400; neutral sans-serif optimized for clinical readability); IBM Plex Mono (data weight 400; tabular numerals + technical-detail rendering). Font selection signals design system aspiration (sister §5.2 glassmorphism luxury-positioning rationale). Web font loading strategy TBD at B0C.4 grep of `public/index.html` + font CSS imports; FOIT/FOUT/preload/font-display CSS surface verification required for production performance + accessibility. Clinical-density readability dimensions (line-height + measure + size hierarchy) require per-view audit at v2.0 Phase 2 polish arc; current state has type-system depth but per-view application audit deferred.

### 3.13 Domain 0C-SPC (Spacing + layout grid)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-SPC-01 | 8-tier spacing scale (xs/sm/md/lg/xl/2xl/3xl with 4-8-16-24-32-48-64px progression) | DOCUMENTATION | `tokens.ts:182-192` |
| 0C-SPC-02 | Grid system + container patterns | LOW (P3) DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |

#### Finding 0C-SPC-01 (DOCUMENTATION)

**Standard:** 4px or 8px base-grid spacing scale per Material Design + Tailwind canonical patterns.

**Gap statement:** 8-tier spacing scale at `tokens.ts:182-192`: xs (0.25rem / 4px) + sm (0.5rem / 8px) + md (1rem / 16px) + lg (1.5rem / 24px) + xl (2rem / 32px) + 2xl (3rem / 48px) + 3xl (4rem / 64px). Sister to Tailwind default spacing scale; intentional alignment with utility-class deployment. Spacing token export available for design system consumers.

**Cross-references:** see 0C-CMP-01 component library (sister); see Tailwind config `tailwind.config.js`.

**Remediation:** Document spacing scale in `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Estimated bundled with 0C-CMP-03 design system documentation.

#### Finding 0C-SPC-02 (LOW P3 DOCUMENTATION)

**Standard:** Grid system + container patterns per CSS Grid + Tailwind grid utilities (grid-cols-N + grid-rows-N) or design-system-codified Grid component.

**Gap statement:** Grid system + container patterns at Tailwind utility class layer per B0C.4-EXT.0 spot-check (`grid-cols-` + `grid-rows-` + `container mx-auto` patterns widespread across components but no design-system-codified Grid component). Per-view container max-width + responsive breakpoint discipline TBD-verify at v2.0 Phase 2 polish arc.

**Cross-references:** see 0C-SPC-01 spacing scale (sister); see 0C-CMP-02 component coverage gaps (Grid + Container primitives missing).

**Remediation:** v2.0 design system codification arc: Grid + Container component primitives + per-view responsive audit. Estimated ~6-10h. v2.0 Phase 2 territory.

#### Domain 0C-SPC consolidated summary

8-tier spacing scale per `tokens.ts:182-192` with 4-8-16-24-32-48-64px progression. Sister to Tailwind default spacing scale; intentional alignment with utility-class deployment. Grid system + container patterns TBD at B0C.4 grep; current evidence suggests Tailwind utility-driven layout rather than design-system-codified grid component. v2.0 Phase 2 territory for grid component codification + per-view container audit.

### 3.14 Domain 0C-PAT (Visual patterns + effects; glassmorphism + motion-sparse cross-references)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-PAT-01 | Glassmorphism canonical visual treatment (module-color-tinted backdrop-filter blur; class system at `index.css` + `tokens.ts:110-117` mapping) | DOCUMENTATION | `src/index.css` (glass-* classes); `tokens.ts:110-117` |
| 0C-PAT-02 | Gradient deployment characterization (80+ occurrences across 15 files; widespread) | LOW (P3) DOCUMENTATION | `src/index.css:38`; module views |
| 0C-PAT-03 | Shadow elevation system (8 tokens: glass / glassHover / elevated / modal / bezel / bezelHover / card / cardHover) | DOCUMENTATION | `tokens.ts:151-163`; 93+ occurrences across 15 files |
| 0C-PAT-04 | **Motion-sparse-deployment** (per Q-C): framer-motion installed but 1-file used at `src/components/free-tier/sections/PremiumUnlock.tsx:1`; library-vs-deployment mismatch | LOW (P3) DOCUMENTATION (may elevate at B0C.4 if accessibility / performance implications surface) | `package.json` framer-motion dep; sole usage at PremiumUnlock |
| 0C-PAT-05 | Iconography (lucide-react) consistency | LOW (P3) DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-PAT-06 | Border radius system (6 tokens: sm/md/lg/xl/2xl/full) | DOCUMENTATION | `tokens.ts:194-203` |

#### Finding 0C-PAT-01 (DOCUMENTATION) - see §5.2

Glassmorphism canonical visual treatment treated in detail at §5.2 substantive engineering signal section. Module-color-tinted backdrop-filter blur classes mapped per `tokens.ts:110-117`; 48 occurrences across 13 files; accessibility (reduce-motion + low-power conditional) + performance (per-device-tier config) discipline visible in code.

**Cross-references:** see §5.2 detailed treatment.

#### Finding 0C-PAT-02 (LOW P3 DOCUMENTATION)

**Standard:** Gradient deployment convention; Tailwind `bg-gradient-` utility + CSS `linear-gradient` + `radial-gradient`.

**Gap statement:** Heavy gradient deployment per B0C.2.0 grep: 80+ occurrences across 15 files (top: `src/index.css:38`, `App.tsx:5`, `styles/premium-colors.ts:17`, financial / coronaryIntervention module views). Widespread gradient usage signals canonical visual treatment (sister §5.2 glassmorphism); per-gradient palette adherence to design system tokens TBD-verify.

**Cross-references:** see §5.2 glassmorphism (sister visual treatment); see 0C-COL-01 token-conflict (gradient color sources potentially conflict-sourced).

**Remediation:** Per-gradient palette-source audit; codify canonical gradient catalog at `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Estimated ~3-5h. v2.0 design system codification arc.

#### Finding 0C-PAT-03 (DOCUMENTATION)

**Standard:** Shadow elevation system convention; Tailwind `shadow-*` utility + CSS `box-shadow`.

**Gap statement:** Shadow elevation system at `tokens.ts:151-163` defines 8 tokens: glass + glassHover + elevated + modal + bezel + bezelHover + card + cardHover. Deployment per B0C.2.0 grep: 93+ occurrences across 15 files (heavy deployment). Token system + deployment density both substantial; canonical pattern established.

**Cross-references:** see §5.2 glassmorphism (sister visual treatment); see 0C-PAT-01.

**Remediation:** Document shadow elevation token usage convention in `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Estimated bundled with 0C-PAT-01 design system codification.

#### Finding 0C-PAT-04 (LOW P3 DOCUMENTATION)

**Standard:** Motion vocabulary convention; framer-motion / React Spring / CSS transitions.

**Gap statement:** **Motion-sparse-deployment** per Q-C operator decision: framer-motion installed (`package.json ^12.23.24`) but 1-file used at `src/components/free-tier/sections/PremiumUnlock.tsx:1` per B0C.2.0 sole-usage grep. Library-vs-deployment mismatch. CSS transitions used elsewhere via Tailwind transition utilities + `tokens.ts:205-212` transition tokens (fast/normal/slow/chrome). Sister to 0C-A11Y-07 reduce-motion CONFORMANT (motion impact already mitigated by reduce-motion respect + low-power conditional disable).

**Cross-references:** see 0C-A11Y-07 reduce-motion conformant; see 0C-CMP-05 library-vs-deployment pattern; see §17.1 candidate 1 (component library selection rationale sister).

**Remediation:** v2.0 architectural decision per 0C-CMP-05 sister (expand framer-motion deployment OR deprecate + remove). Estimated bundled with 0C-CMP-05.

#### Finding 0C-PAT-05 (LOW P3 DOCUMENTATION)

**Standard:** Iconography library deployment convention; lucide-react canonical with size + variant + color discipline.

**Gap statement:** **lucide-react canonical iconography:** 254 lucide-react import lines across 250 files per B0C.4-EXT.0 grep. WIDESPREAD canonical deployment (sister to glassmorphism canonical visual treatment depth). Icon-size discipline (sister 0C-A11Y-06 SC 2.5.8 Target Size Minimum) + per-context icon-meaning consistency + colored-icon-vs-monochrome decision TBD-audit at v2.0 Phase 2 polish arc.

**Cross-references:** see 0C-A11Y-06 target size minimum (sister); see 0C-CMP-02 component coverage gaps (IconButton primitive missing).

**Remediation:** Per-icon-context audit + IconButton primitive codification + size-discipline lint rule. Estimated ~6-10h. v2.0 design system codification arc.

#### Finding 0C-PAT-06 (DOCUMENTATION)

**Standard:** Border radius system convention; Tailwind `rounded-*` utility + CSS `border-radius`.

**Gap statement:** Border radius system at `tokens.ts:194-203` defines 6 tokens: sm (0.375rem / 6px) + md (0.5rem / 8px) + lg (0.75rem / 12px) + xl (1rem / 16px) + 2xl (1.5rem / 24px) + full (9999px / circular). Sister to Tailwind defaults. Deployment widespread via Tailwind utility classes.

**Cross-references:** see 0C-SPC-01 spacing scale (sister token system); see 0C-CMP-01 component library.

**Remediation:** Document border radius usage convention in `docs/architecture/DESIGN_SYSTEM_SPEC.md`. Estimated bundled.

#### Domain 0C-PAT consolidated summary

Glassmorphism canonical visual treatment treated in detail at §5.2 substantive engineering signal section. Gradient deployment is heavy (80+ occurrences across 15 files; widespread across module views + index.css). Shadow elevation system is sophisticated (8 tokens at `tokens.ts:151-163`; 93+ occurrences across 15 files). **Motion-sparse-deployment** per Q-C operator decision: framer-motion installed but 1-file used at `src/components/free-tier/sections/PremiumUnlock.tsx:1`; library-vs-deployment mismatch surfaced as 0C-PAT-04 LOW P3 DOCUMENTATION baseline (may elevate at B0C.4 if accessibility / performance implications surface; current evidence shows reduce-motion respected per 0C-A11Y-07 + low-power conditional per usePerformanceOptimization.ts so accessibility / performance implications are mitigated; severity preserved at LOW P3 DOCUMENTATION). Iconography (lucide-react) consistency TBD at B0C.4 grep. Border radius system documented at `tokens.ts:194-203`. v2.0 Phase 2 polish arc addresses motion-vocabulary expansion (page-transition + modal-enter + skeleton-load animations) if user research surfaces motion-value at clinical-density surfaces.

### 3.15 Domain 0C-I18N (Internationalization readiness)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-I18N-01 | Current N/A state documentation (English-only; no react-intl / next-intl / formatMessage) | DOCUMENTATION (forward-looking; v2.0 carry-forward) | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-I18N-02 | Date / time / number / currency localization readiness | DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |

#### Finding 0C-I18N-01 (DOCUMENTATION)

**Standard:** Internationalization library convention: react-intl + next-intl + i18next + FormatJS per industry standard React i18n.

**Gap statement:** Current N/A state: English-only US deployment. `package.json` review confirms no `react-intl` / `next-intl` / `i18next` / `formatjs` packages. UI copy hardcoded in components; no extract-and-translate workflow. v2.0 carry-forward for substantive i18n implementation if international expansion surfaces.

**Cross-references:** see 5-OMN-05 Privacy Rule modifications inapplicability documentation pattern (sister N/A documented with trigger conditions).

**Remediation:** Document N/A current state + trigger conditions (first international pilot signal) at `docs/architecture/DESIGN_SYSTEM_SPEC.md`. v2.0 implementation arc: select library + extract copy + per-locale translation + RTL support. Estimated ~30min documentation + ~80-120h implementation if triggered.

#### Finding 0C-I18N-02 (DOCUMENTATION)

**Standard:** Native `Intl.DateTimeFormat` + `Intl.NumberFormat` + `Intl.RelativeTimeFormat` for locale-aware formatting.

**Gap statement:** Date / time / number / currency formatting at runtime: ad-hoc per surface; centralized formatting not codified. Per US-English-only deployment, defaults sufficient; locale-readiness gap forward-looking.

**Cross-references:** see 0C-I18N-01 parent N/A state.

**Remediation:** v2.0 implementation arc: centralized formatting helpers + locale-aware date / number / currency. Estimated ~10-15h. v2.0 territory.

#### Domain 0C-I18N consolidated summary

Current state: English-only US deployment. No `react-intl` / `next-intl` / `formatMessage` / `i18next` packages in `package.json` review. Date / time / number / currency formatting likely uses native `Intl.DateTimeFormat` + `Intl.NumberFormat` ad-hoc per surface; centralized formatting not codified. v2.0 carry-forward for substantive i18n implementation if international expansion surfaces; Phase 0C documents N/A current state + readiness gap. Sister to Phase 5 5-OMN-05 Privacy Rule modifications inapplicability documentation pattern (N/A documented with trigger conditions).

### 3.16 Domain 0C-CNT (Content + microcopy + UX writing)

| ID | Scope | DRAFT severity | Anchor |
|---|---|---|---|
| 0C-CNT-01 | Clinical terminology accuracy in UI (ACC/AHA + HRS + 2024 PAD guideline-adjacent vocabulary) | LOW (P3) DOCUMENTATION | per-module ui/ surfaces |
| 0C-CNT-02 | Empty state messaging | LOW (P3) DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-CNT-03 | Error message consistency + non-PHI-leak per CLAUDE.md §14 | LOW (P3) DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |
| 0C-CNT-04 | Tooltip + help text density | LOW (P3) DOCUMENTATION | file:line resolution via grep at v2.0 Phase 2 polish arc |

#### Finding 0C-CNT-01 (LOW P3 DOCUMENTATION)

**Standard:** ACC/AHA + HRS + 2024 PAD guideline-adjacent clinical vocabulary; ICD-10-CM + SNOMED CT clinical terminology; UMLS Metathesaurus per per-term canonical reference.

**Gap statement:** Clinical terminology accuracy in UI requires per-module audit at v2.0 Phase 2 polish arc against current guideline vocabulary. Risk-stratification labels (low/intermediate/high risk; CHA2DS2-VASc score risk bands; WIfI classification stages) + intervention recommendations + diagnostic-criteria phrasing all per-module-specific.

**Cross-references:** see 0C-CLI-01 + 0C-CLI-02 Class/LOE rendering (sister §16 PARTIAL-TRIGGER); see Phase 0B per-module audit addenda.

**Remediation:** Per-module clinical-vocabulary audit; codify canonical terminology in `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` cross-reference. Estimated ~6-10h per module. v2.0 Phase 2 territory.

#### Finding 0C-CNT-02 (LOW P3 DOCUMENTATION)

**Standard:** Empty state messaging conventions per Material Design + Carbon Design System + clinical-UI best practices (clarifying message + recovery action + empathetic tone).

**Gap statement:** Empty state messaging at `src/components/shared/ChartEmptyState.tsx` (per B0C.4-EXT.0 grep) + per-module ad-hoc patterns. Per-context empty state language consistency + recovery action availability + accessibility (ARIA live-region for state changes) TBD-audit at v2.0 Phase 2 polish arc.

**Cross-references:** see 0C-CMP-02 component coverage gaps (EmptyState primitive consideration).

**Remediation:** Codify EmptyState component primitive + per-context message conventions + recovery action pattern. Estimated ~3-5h. v2.0 design system codification arc.

#### Finding 0C-CNT-03 (LOW P3 DOCUMENTATION)

**Standard:** Error message consistency + non-PHI-leak per CLAUDE.md §14 NEVER DO list; ARIA live-region for error announcement.

**Gap statement:** Error message patterns at `src/utils/ErrorHandler.ts` + `src/components/shared/ErrorFallback.tsx` (10 ErrorBoundary patterns) + per-form error rendering. Per CLAUDE.md §14: "Never leave PHI (patient names, MRN, DOB, addresses) in logs, error messages, or console output." Frontend error rendering audit for PHI-leak prevention required (sister 0C-OBS-03 structured logging finding).

**Cross-references:** see CLAUDE.md §14 NEVER DO list; see 0C-OBS-03 structured frontend logging (sister); see 5-TEC-03 audit controls.

**Remediation:** Audit error message surfaces for PHI-leak prevention + codify error message convention + ARIA live-region pattern. Estimated ~4-6h. v2.0 Phase 2 territory.

#### Finding 0C-CNT-04 (LOW P3 DOCUMENTATION)

**Standard:** Tooltip + help text accessibility per WAI-ARIA APG tooltip pattern; clinical-context help-text density per clinical-UI best practices.

**Gap statement:** 27 Tooltip / tooltip occurrences across 10 files per B0C.4-EXT.0 grep (modest density). Per-tooltip ARIA tooltip pattern conformance (aria-describedby relationship + dismissible behavior + keyboard accessibility) TBD-verify. Help-text density for clinical-context disclosure (risk-score calculation explanation + intervention rationale + Class/LOE definition tooltips) TBD-audit.

**Cross-references:** see 0C-A11Y-04 ARIA 1.2 widget patterns (tooltip pattern); see 0C-CMP-02 component coverage gaps (Tooltip primitive).

**Remediation:** Codify Tooltip component primitive + per-tooltip accessibility audit + clinical-context help-text density audit. Estimated ~6-10h. v2.0 design system codification arc.

#### Domain 0C-CNT consolidated summary

Clinical terminology accuracy in UI requires per-module audit at v2.0 Phase 2 polish arc against ACC/AHA + HRS + 2024 PAD guideline-adjacent vocabulary. Empty state messaging + error message consistency + tooltip / help text density TBD at B0C.4 grep extension; current evidence suggests ad-hoc per-component patterns rather than design-system-codified content guidelines. CLAUDE.md §14 NEVER DO list prohibits PHI in console output + log messages + error UI surfaces; sister discipline at frontend error rendering layer (cross-reference 5-TEC-03 audit controls + AUDIT-076 HIPAA_GRADE_ACTIONS narrow set). v2.0 Phase 2 territory for content + microcopy design system arc.

---

## 4. Gate-class Findings (Tier 1 classification per Q-A)

Detailed treatment at B0C.4 finding-authoring. Outline cross-references §3 finding-skeleton entries.

### 4.1 0C-A11Y Tier 1 candidates

Primary: 0C-A11Y-01 (WCAG 2.2 AA conformance unverified). Secondary: 0C-A11Y-02 through 0C-A11Y-06 (sub-dimensions). 0C-A11Y-07 already conformant per reduce-motion grep at B0C.2.0.

### 4.2 0C-CLI Tier 1 candidates (§16 PARTIAL-TRIGGERED)

Primary: 0C-CLI-01 (Class display) + 0C-CLI-02 (LOE display) + 0C-CLI-03 (risk score rendering accuracy). Secondary: 0C-CLI-04 through 0C-CLI-08 (drug interaction + gap rendering + alerting + phenotype + visualizations).

### 4.3 0C-PERF Tier 1 candidates

Primary: 0C-PERF-01 (Web Vitals baseline absence) + 0C-PERF-02 (RUM instrumentation absence). Secondary: 0C-PERF-03 through 0C-PERF-05 (bundle visibility + heavy component perf + performance budgets).

### 4.4 0C-TEST Tier 1 candidates (confirmed gate-class per AUDIT-001 sister-precedent)

Primary: 0C-TEST-01 (1 test file in 365 .tsx) + 0C-TEST-02 (integration test absence) + 0C-TEST-03 (E2E test absence). Secondary: 0C-TEST-04 (visual regression).

---

## 5. Substantive Engineering Signal Sections (sister to Phase 5 5-BRC-06 pattern)

### 5.1 Design system token-conflict (0C-COL-01 primary + §17.1 architectural-precedent candidate)

Per Q-B operator decision: design-token-strategy single-source-of-truth violation surfaced at `tokens.ts` + `semanticColors.ts` competing-sources state. Header claim at `tokens.ts:1-5` "Single source of truth for programmatic color/style access" is empirically false. §17.1 architectural-precedent candidate "design token strategy" promoted from B0C.1.7 catalog to real codification target via this finding. Flagged for SEPARATE methodology PR per §17.3.

**The conflict in detail:**

`src/design-system/tokens.ts:67-94` exports a `semantic` object with 14 keys covering background / surface (3 tiers) / text (5 tiers) / borders (4 variants) / interactive (4 categories: primaryAction / dangerAction / successAction / warningAction).

`src/design-system/semanticColors.ts:2-10` exports a DIFFERENT `semantic` object with 7 buckets (critical / warning / good / info / muted / device / financial), each containing text + bg + border + light variants. The bucket axis (critical/warning/good vs background/text/surface) is orthogonal to the tokens.ts:67-94 semantic axis.

Sister conflict at chart palette layer: `tokens.ts:140-149` exports 8-color `chartColors` (no purple/violet); `semanticColors.ts:12-25` exports 12-color `chartColors` (sister palette including Steel Teal + Copper Bronze + Racing Green not in tokens.ts).

**Consumer audit per DRIFT-45 grep at B0C.4.0:**

3 files import from token sources:
- `src/theme/index.ts` (likely the canonical theme aggregator; verify which source it re-exports at B0C.4 spot-check)
- `src/design-system/SectionCard.tsx` (component-level direct import; verify source at B0C.4)
- `src/components/test/PremiumColorTest.tsx` (test surface)

The majority of `src/` consumers (362 of 365 .tsx files; 99.2%) do NOT import tokens.ts or semanticColors.ts directly. Tailwind utility classes + `src/index.css` glass-* classes carry most styling. This is the actual deployment pattern: tokens.ts + semanticColors.ts are designer-facing reference documents more than runtime sources of truth.

**The deeper finding:** the "single source of truth" claim was authoring-time aspiration; runtime reality is Tailwind utilities + index.css classes are the actual canonical source. tokens.ts + semanticColors.ts are reference docs. Two competing reference docs creates designer confusion (which one is canonical?) without runtime impact.

**Implications:**
- Designer / developer ambiguity: which file defines the canonical semantic color palette?
- Drift risk: if tokens.ts gets updated and semanticColors.ts does not (or vice-versa), the two reference docs diverge
- Code review difficulty: a PR touching color tokens needs to verify both files for consistency

**Sister to §17.1 entry 15 canonical-purpose single-source-of-truth pattern (PR #283 precedent):** that codification addressed encryption purpose primitive at `phiEncryption.ts` requiring exported-constant + import-not-re-type discipline. Sister discipline applies here: design tokens require single canonical source + consumer-imports-not-redefines pattern.

**Remediation (7-step path):**

1. **Audit consumer imports** across `src/` for tokens.ts vs semanticColors.ts vs Tailwind utility usage; build canonical consumer matrix (~2h grep + review)
2. **Decision: consolidate into tokens.ts** (recommended; tokens.ts is the broader 234-line surface; semanticColors.ts is 27 lines covering a narrower semantic axis); merge semanticColors.ts content into tokens.ts under a new namespace (e.g., `tokens.semanticBuckets.critical = {...}`)
3. **Migrate the 3 importer files** (`src/theme/index.ts`, `src/design-system/SectionCard.tsx`, `src/components/test/PremiumColorTest.tsx`) to use consolidated tokens.ts exports
4. **Deprecate semanticColors.ts** with explicit deprecation comment + re-export-from-tokens.ts compatibility shim for ~1 release cycle
5. **Codify single-source-of-truth in §17.1** as new architectural-precedent entry (sister to entry 15)
6. **Document via design system spec** at `docs/architecture/DESIGN_SYSTEM_SPEC.md` (forward-looking; v2.0 carry-forward per L117 implementation territory)
7. **CI lint check** for direct tokens.ts vs semanticColors.ts deviation (sister to AUDIT-METHODOLOGY §9.1 canonical-default pattern)

**Estimated effort:** ~6-10h consolidation + migration + tests; ~2-4h §17.1 architectural-precedent codification at separate methodology PR. v2.0 Phase 2 territory for full design system codification per L117.

### 5.2 Glassmorphism canonical visual treatment characterization (0C-PAT-01 primary)

Glassmorphism is the canonical visual treatment per design system. The naming itself signals intent: per `src/design-system/tokens.ts:1-5` header comment, "TAILRD Frosted Glass Design System / Single source of truth for programmatic color/style access / Porsche Chrome Blue (3R7) + Carmona Red Metallic palette." The "Frosted Glass" framing names the visual identity; glassmorphism is the runtime expression.

**Glass-class system (per `tokens.ts:110-117`):**

```typescript
export const moduleGlassClass: Record<string, string> = {
  hf:         'glass-chrome-blue',
  ep:         'glass-chrome-blue',
  structural: 'glass-carmona-red',
  coronary:   'glass-forest-green',
  valvular:   'glass-liquid-teal',
  peripheral: 'glass-gunmetal',
};
```

Six modules map to five distinct glass classes (HF and EP share `glass-chrome-blue`; sister Chrome Blue palette per `tokens.ts:9-21` + module-color cross-reference per `tokens.ts:100-107`).

**Deployment density per B0C.2.0 grep:**

48 occurrences across 13 files:
- `src/index.css` (30 occurrences; class definitions + utility usage)
- `src/utils/performanceConfig.ts` (3; performance-aware backdrop config per device class)
- `src/hooks/usePerformanceOptimization.ts` (3; conditional disable on reduced-motion / low-power)
- `src/components/Login.tsx` (2)
- 9 module + component files (1-2 each)

**Accessibility implications:**

WCAG 2.2 SC 1.4.3 Contrast (Minimum) requires 4.5:1 text-to-background contrast at AA. Glassmorphism creates VARIABLE backgrounds because the underlying page content shows through. Contrast ratio depends on what is behind the glass surface at runtime. Three mitigations are visible in the design system:
1. Module-color tinting (e.g., `glass-chrome-blue` adds chrome.X overlay color) anchors background expectation
2. Backdrop-filter `blur(...)` reduces underlying-content saliency
3. Surface tokens (`surface.overlay = 'rgba(44, 74, 96, 0.50)'` at `tokens.ts:62`) provide opaque-overlay alternative

But contrast ratios under live glass surfaces require per-scenario verification at 0C-A11Y-02 sister finding.

**Performance implications:**

`backdrop-filter` is GPU-intensive. Lower-end devices (older laptops + budget tablets + clinical workstations >5-year-old) show measurable frame-rate drop with multi-glass-surface views. Mitigations visible in code:
- `src/utils/performanceConfig.ts` exports performance-tier-aware config (3 backdrop hits)
- `src/hooks/usePerformanceOptimization.ts` exposes `prefersReducedMotion + isLowPowerDevice` flags (3 backdrop hits + reduce-motion respect at L73)
- Conditional disable when low-power detected (per usePerformanceOptimization.ts:73 sister)

This is a reasonable accessibility + performance design pattern. Confirms 0C-A11Y-07 reduce-motion CONFORMANT finding (motion impact limited).

**Browser support:**

- Safari: supported since 9.0 (2015) via `-webkit-backdrop-filter` prefix; unprefixed since Safari TP
- Chrome: supported since 76 (2019)
- Firefox: enabled by default since 103 (2022); previously behind flag
- Edge: supported since 17 (Chromium-based)

Browser support is mature for modern browsers. Older Firefox (pre-103) shows degraded glass; non-blocking per `package.json` browserslist `>0.2%, not dead, not ie <= 11`.

**Per-module glassmorphism deployment audit (Module Parity Principle per Q2):**

TBD-verify at B0C.4 substantive evidence: which modules deploy glassmorphism consistently vs which use Tailwind utility classes ad-hoc. The 5 distinct glass classes (chrome-blue + carmona-red + forest-green + liquid-teal + gunmetal) suggest per-module canonical visual identity; audit at module ui surface level whether each module's executive + service-line + care-team views use their assigned glass class.

**Characterization verdict:** glassmorphism IS the canonical TAILRD visual identity per design system aspiration (Porsche-inspired luxury positioning). Deployment is partial: glass-class system defined + mapped + accessibility-aware (reduce-motion + low-power conditional disable) + performance-aware (per-device-tier config), but deployment density across module surfaces requires per-module audit at B0C.4 evidence-gathering to verify Module Parity Principle conformance.

This is NOT a green-field design system gap. It is a partially-deployed canonical visual treatment with accessibility + performance discipline visible at the design-system-infrastructure layer. Phase 0C documents the system + identifies per-module deployment asymmetries (if any) at B0C.4.

---

## 6. Cross-Phase Synthesis

Sister to Phase 5 §6 cross-walk pattern (extending Phase 3 §6 + Phase 4 §6.2 + Phase 5 §6.3 lineage).

### 6.1 Phase 0A Phase 1-5 backend cross-references

| Phase | Finding | Phase 0C cross-reference |
|---|---|---|
| Phase 1 | AUDIT-001 (Tier A test coverage 0.87% backend) | 0C-TEST-01 sister-pattern; frontend 1 test in 365 .tsx confirms sister-gap |
| Phase 2 | AUDIT-009 (MFA opt-in DEPLOYED flag-off) | 0C-A11Y considerations for MFA enrollment UI surface |
| Phase 2 | AUDIT-071 (cdsHooks tenant isolation RESOLVED) | 0C-CLI-05 cdsHooks UI rendering pattern; sister CDS Hooks 2.0 anchor |
| Phase 4 | 4-OMP-01 dismissal-at-consumption | 0C-CLI-05 gap detection UI rendering; per CLAUDE.md §8 + §17.1 entry 20 |
| Phase 4 | 4-3PL-02 plane separation | 0C-NAV-06 information architecture observation (UI vs admin plane visual distinction) |
| Phase 4 | 4-RNB-02 missing incident-response runbooks | 0C-OBS-01 frontend error-tracking sister (no Sentry / RUM) |
| Phase 4 | §17.1 entry 21 logs-only-observability stance | 0C-OBS-02 sister application at frontend RUM surface |
| Phase 5 | 5-PRV-02 minimum necessary (full clinical context per treatment exception) | 0C-CLI-05 gap detection UI; per §164.502(b)(2)(i); sister §17.1 entry 20 |
| Phase 5 | 5-PRV-06 right-of-access UI | `src/components/` + admin UI sister; PatientDataRequest workflow |
| Phase 5 | 5-PRV-08 accounting-of-disclosures endpoint (no UI surface) | future UI implementation; v2.0 carry-forward; 0C-CAT documents endpoint absence |
| Phase 5 | 5-BRC-06 BA-to-CE notification workflow gap (HIGH P1 GATE) | UI surface for CE-side notification receiving; v2.0 implementation per L117 |

### 6.2 Phase 0B clinical module cross-references

Per Q2 Module Parity Principle: 6-module UI audit consistent with Phase 0B 6-module clinical audits.

| Module | Phase 0B coverage | Phase 0C cross-reference |
|---|---|---|
| HF | Phase 0B HF addendum COMPLETE | 0C-MOD-01 + clinical-UI surfaces at `components/heartFailure/` |
| EP | Phase 0B EP addendum COMPLETE | 0C-MOD-02 + clinical-UI surfaces at `components/electrophysiology/` |
| SH | Phase 0B SH addendum COMPLETE | 0C-MOD-03 |
| CAD | Phase 0B CAD addendum COMPLETE | 0C-MOD-04 |
| VHD | Phase 0B VHD addendum COMPLETE | 0C-MOD-05 |
| PVD | Phase 0B PVD addendum COMPLETE | 0C-MOD-06 |

### 6.3 Existing AUDIT-NN cross-references

| AUDIT | Phase 0C application |
|---|---|
| AUDIT-001 (Tier A test coverage; OPEN) | 0C-TEST-01 sister-pattern (foundational gap; gate-class confirmed) |
| AUDIT-009 (MFA UI; DEPLOYED flag-off) | 0C-A11Y for MFA enrollment UI accessibility |
| AUDIT-071 (cdsHooks; RESOLVED) | 0C-CLI-05 dismissal-at-consumption framing per §17.1 entry 20 |
| AUDIT-076 (HIPAA_GRADE_ACTIONS narrow; OPEN) | 0C-OBS for frontend audit-action logging surface |

---

## 7. §17.1 Architectural-precedent Candidates (8 surfaced; flagged for SEPARATE methodology PR per §17.3)

Per B0C.1.7 + Q-B promotion:

1. **Component library selection rationale** (no formal library; custom `src/design-system/`)
2. **Design token strategy** (PROMOTED from candidate to real target via 0C-COL-01 token-conflict finding; sister to §17.1 entry 15 canonical-purpose single-source-of-truth)
3. **State management architecture** (implicit React Context + local state; no Redux / Zustand / Jotai)
4. **Build system discipline** (CRA `react-scripts 5.0.1`; Vite migration "planned" per `CLAUDE.md` §2)
5. **Component documentation surface** (NO Storybook; decision not made)
6. **Form handling pattern** (implicit; no React Hook Form / Formik observed)
7. **Data fetching pattern** (custom `src/apiClient/` + `src/services/`)
8. **Browser support matrix** (`>0.2%, not dead, not ie <= 11`; codified at `package.json` browserslist)

All 8 candidates flagged for separate methodology PR per §17.3 scope discipline. Phase 0C documents the design rationale gaps; codification happens in separate methodology PR.

---

## 8. Verdict + Remediation Roadmap

### 8.1 Verdict

**Verdict: CONDITIONAL PASS** sister to Phase 1/2/3/4/5 precedent.

Derived from §3 register-severity totals per §18 status-surface discipline. 4 HIGH P1 GATE candidates (0C-A11Y-01 + 0C-CLI-01/02/03 cluster + 0C-PERF-01/02 cluster + 0C-TEST-01/02/03 cluster) with documented remediation roadmaps point toward gate-pending closure. Per `decision_frameworks` "classify Tier 1 + downgrade with evidence" pattern, all 4 gate-class candidates carry Tier 1 classification at outline; B0C.4 evidence-gathering did not surface evidence sufficient to downgrade any candidate to MEDIUM P2.

**Pass criteria met (per §2.3 rubric):**
- All in-scope dimensions audited (16 domains across catalog + design system + accessibility + clinical-UI + navigation + module parity + service-line / research + performance + i18n + testing + observability + content)
- Zero P0 findings (severity floor for Phase 0C is HIGH P1; no critical-class blockers)
- All P1 findings carry documented remediation roadmaps with Phase 2 territory deferral framing per `PATH_TO_ROBUST.md` L117

**Conditional clause:** Phase passes pending closure of 4 HIGH P1 GATE clusters. Per Phase 2 territory framing (L117 ~600-900h Tier 2 Clinical + UI/UX Polish), substantive remediation belongs to v2.0 implementation arc; Phase 0C documents the audit-side gap inventory + remediation framework.

**Risk surface summary** (sister to Phase 4 / Phase 5 §7 patterns):
- **0C-A11Y-01 risk:** Section 508 + ADA enforcement risk if WCAG 2.2 AA non-conformance discovered at federal-procurement scenarios or civil litigation
- **0C-CLI-01/02/03 risk:** Clinical accuracy risk if recommendation Class / LOE / risk score rendering deviates from current ACC/AHA + HRS guidelines; sister CDS exemption framework compliance per CLAUDE.md §8 + 21st Century Cures Act
- **0C-PERF-01/02 risk:** Production user experience invisible (no RUM); clinical-density performance under load unmeasured
- **0C-TEST-01/02/03 risk:** Frontend reliability claims unsubstantiated; sister to AUDIT-001 Tier A backend foundational gap

**Remediation prioritization** (sister to Phase 4 / Phase 5 §7 patterns):

1. **0C-TEST-01 first (~60-100h):** Frontend test infrastructure baseline + per-component coverage arc. Sister AUDIT-001 backend remediation already in progress; coordinate v2.0 Phase 2 test-establishment work jointly.
2. **0C-CLI Tier 1 cluster second (~12-18h §16 verification + ~10-16h component codification):** Per §16 PARTIAL-TRIGGER, risk calculator + therapy gap + clinical alert UI verified against current guidelines. Highest-leverage work for clinical-safety claims.
3. **0C-A11Y-01 third (~4-6h baseline scan + ~40-80h remediation arc):** Add axe-core integration + Lighthouse CI a11y category; baseline scan reveals violation density; categorize + remediate per WCAG SC cluster.
4. **0C-PERF-01/02 fourth (~6-10h infrastructure + ~4-6h measurement):** Lighthouse-CI + web-vitals + Sentry RUM tooling selection + baseline measurement; performance budget JSON authoring.
5. **Non-gate clusters and documentation-tier consolidation fifth:** v2.0 Phase 2 polish arc carries the substantive Tier 2 work per L117 ~600-900h.

**v2.0 PATH_TO_ROBUST authorship cross-walk:** Phase 0C surfaces sit alongside Phase 5 5-ADM-09 + 5-BRC-06 gate items in the v2.0 implementation arc sequencing. Phase 0C gate items are Tier 1 frontend-domain; Phase 5 gate items are Tier 1 HIPAA-compliance-domain; both classes share pre-BSW-DUA-signature timing alignment for highest-leverage remediation.

### 8.2 Gate-item remediation framework

| Gate item | Remediation framing | Phase |
|---|---|---|
| 0C-A11Y-01 | WCAG 2.2 AA audit + axe-core integration + remediation arc | Phase 2 implementation territory per L117 |
| 0C-CLI Tier 1 | §16 verification arc per clinical-UI surface | Phase 2 + v2.0 carry-forward depending on scope |
| 0C-PERF-01 / 02 | Lighthouse config + Web Vitals API instrumentation + RUM tooling selection | Phase 2 implementation territory |
| 0C-TEST-01 / 02 / 03 | Frontend test infrastructure (Jest + React Testing Library + Playwright) | Phase 2; sister AUDIT-001 backend test arc |

All gate-item remediation belongs to Phase 2 territory per L117. v2.0 PATH_TO_ROBUST authorship sequences these alongside backend Phase 2 work.

---

## 9. Module Parity Assessment

Per Q2 Module Parity Principle. All 6 cardio modules audited at 0C-MOD-01 through 0C-MOD-06.

TBD detailed parity comparison at B0C.4 finding-authoring. Initial inventory at B0C.1.6: all 6 modules have `src/ui/<module>/` surface; HF has 10 components; other modules TBD-count at B0C.4.

---

## 10. Service-line + Research View Audit

Per L78 canonical scope. 0C-SLR-01 through 0C-SLR-04 (service-line + research + revenue cycle + admin / data management view audit).

TBD detailed audit at B0C.4 finding-authoring.

---

## 11. v2.0 Implementation Roadmap Implications

Per L117 Phase 2 territory:

- **Design system codification SHIPPING:** Token-conflict resolution (0C-COL-01) + component library expansion (0C-CMP-02 gaps) + Storybook deployment (0C-CMP-03) + design system documentation update
- **Reports module remediation:** Current state per `src/components/reporting/` (2 files); v2.0 expansion + integration with FHIR reporting standards
- **Frontend test coverage establishment:** Jest + RTL + Playwright + visual regression infrastructure; sister to AUDIT-001 backend arc
- **Performance baseline establishment:** Lighthouse CI + Web Vitals RUM + bundle analyzer + performance budget definitions
- **WCAG 2.2 AA conformance arc:** axe-core integration + manual audit + remediation across 365 .tsx surfaces
- **§16 clinical-UI accuracy arc:** Risk calculator verification + recommendation tier display standardization + LOE rendering convention

Phase 2 budget estimate per L117: ~600-900h Tier 2 Clinical + UI/UX Polish.

---

## 12. Lessons Learned for v2.0 Authorship

- **DRIFT-45 firing #4 caught at B0C.1.2:** Operator-prompt Options A/B/0 framing was canonical-doc-misaligned. Canonical L73-L80 = Option B-CANONICAL. Mechanism continues earning across consecutive work blocks (sister Phase 5 firings #1-#3). Canonical-source-wins discipline is now reliably catching scope-framing drift; mechanism is mature.
- **DRIFT-44 firing self-caught + self-fixed at B0C.3.4:** 4 em-dashes in §3 domain subsection headers caught at post-write scan; 4 Edit fixes applied. Sister codification candidate flagged for next methodology PR: pre-write em-dash scan vs post-write self-correction mechanism. Post-write self-correction worked.
- **9th §17.1 architectural-precedent applied at B0C.1.9:** Reframe Option 0 candidacy surfaced BEFORE Options A/B/C enumeration. Sister to Phase 5 B5.2 Option A decision-process. Mature pattern across consecutive scope-lock work blocks.
- **Tier 1 classification per `decision_frameworks` "classify Tier 1; downgrade with evidence":** 4 HIGH P1 GATE candidates at outline. B0C.4 evidence-gathering did not surface evidence sufficient to downgrade any candidate; severity floors preserved. Contrast to Phase 5 5-TEC-06 downgrade pattern (B5.4.1 evidence-gathering surfaced strong TLS posture; downgraded from HIGH P1 escalation candidate to MEDIUM P2). Phase 0C confirms the pattern: Tier 1 classification + evidence-gathering at B0C.4 is the correct ordering; not all candidates downgrade.
- **§16 PARTIAL-TRIGGERED scope locked at clinical-UI domain (0C-CLI only) per Q3:** Clinical accuracy against guidelines + scoring algorithms; sister Phase 5 Q5 dismissal-at-consumption framing. The §16 framework applied to frontend layer is novel for this audit; v2.0 authorship considers whether §16 trigger criteria should be codified as a methodology-stack standard for any clinical-UI rendering surface.
- **Substantive engineering signal sections (§5.1 token-conflict + §5.2 glassmorphism) sister to Phase 5 5-BRC-06 pattern:** the audit-PR practice of carving out substantive engineering deep-dives as distinct §5 subsections proves valuable for operator + reviewer attention prioritization. v2.0 authorship considers codifying §5 substantive-signal convention as audit-framework discipline.
- **Design system aspiration vs deployment-state gap is a meta-pattern:** TAILRD design system positions Porsche-luxury-inspired visual identity (`tokens.ts:1-5` Frosted Glass + Chrome Blue 3R7); deployment is partial; v2.0 design system codification arc bridges the gap. Sister meta-pattern surfaced at Phase 5 (HIPAA compliance posture aspiration vs documentation-tier gap inventory).
- **Glassmorphism canonical visual treatment is mature design-system infrastructure:** 5-class system + module-color tinting + reduce-motion + low-power conditional disable + browser-support discipline already in code per §5.2. v2.0 documentation arc captures the canonical pattern in `docs/architecture/DESIGN_SYSTEM_SPEC.md` rather than reinventing.

---

## 13. Time-unit Disambiguation Caveat

Raw scope: ~20-32h per B0C.2.7 budget projection (within canonical L73 ~25-30h budget). AI-assisted wall-clock: TBD at B0C.4 to B0C.6 actual logging. Multipliers calibrated against work-type per AUDIT-028 (CAD audit §13 time-unit caveat) + Phase 4 §13 + Phase 5 §13 precedent. Sister input to v2.0 PATH_TO_ROBUST timeline calibration.

---

## Appendix - Phase 0C Closure Ledger

- Phase 0C outline shipped 2026-05-20 (B0C.3 STOP)
- Per-finding prose + file:line citations TBD at B0C.4
- Register entries TBD at B0C.5
- BUILD_STATE narrative entry TBD at B0C.5
- Verdict TBD at B0C.5 (working hypothesis CONDITIONAL PASS per §8.1)
- PR open: B0C.6 (post-commit)

*Methodology stack §1 / §16 (PARTIAL-TRIGGERED for 0C-CLI) / §17 / §17.1 / §17.3 / §17.5 / §18 sustained at outline. §16 trigger criteria per Q3: recommendation Class display + LOE display + risk score rendering + drug interaction surfacing + gap detection UI + clinical alerting. DRIFT-44 em-dash discipline + DRIFT-45 chat-side canonical-doc grep pre-flight standing throughout Phase 0C work block.*
