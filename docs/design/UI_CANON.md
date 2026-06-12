# TAILRD UI Canonical Specification (UI_CANON)

**Status:** Canonical. This document is the permanent cited authority for all UI/UX work in the TAILRD Heart platform, enforced the way `docs/audit/AUDIT_METHODOLOGY.md` is enforced for the clinical-audit corpus: deviation from this canon is DRIFT, named via a finding, paid down, and never propagated. New UI MUST conform. The Phase 0C-3 findings stream enumerates every current-state deviation against this document; the Phase 0C-4 rendered-reference track produces the visual options against the palette this canon ratifies.

**Authored:** 2026-06-11 (Phase 0C-2b), against the measured inventory of Phase 0C-1 / 0C-1b / 0C-2a. This document does NOT re-inventory; it cites the established facts. It is a SPECIFICATION ONLY - authoring it changes no source code and files no findings.

## 0. How to read this document

Each section states three things:
- **CANONICAL STANDARD** - what must be true.
- **RULE** - how conformance is judged (mechanical where possible).
- **CURRENT-STATE DELTA** - what exists now that deviates, cited to file:line / measured count, so the 0C-3 findings stream enumerates against it.

A "delta" is not a finding; it is the gap the findings stream files. Counts and file:line references trace to the Phase 0C inventory passes (0C-1 structural, 0C-1b aesthetic, 0C-2a resolution) and are the load-bearing evidence.

Formatting discipline mirrors the audit corpus (DRIFT-44): ASCII-only, hyphen-only (no em-dashes / en-dashes / arrows; use `->`), `§` is the only permitted non-ASCII glyph and is used for in-document cross-references.

---

## 1. Structural canon (per-tab skeletons)

**CANONICAL STANDARD.** Each of the three audience tabs (Executive, Service Line, Care Team) has exactly ONE canonical skeleton: a UNIVERSAL section set in a fixed canonical render order, plus a closed list of DEFINED module-specific allowances. The three audience tabs themselves are PRESERVED (they are intentional persona views, not a defect); only their internal structure is canonized.

### 1.1 Executive tab canonical skeleton

Canonical render order (headline-first per §7 flow rule):

1. **Headline clinical/gap metric** - `GapIntelligenceCard` (shared). This leads the view.
2. **Module PRO block** (allowance, see below) - renders here when present.
3. **Forward cluster** (shared, fixed order): `GapResponseRateCard`, `RevenuePipelineCard`, `RevenueAtRiskCard`, `TrajectoryTrendsCard`, `PredictiveMetricsBanner`.
4. **Revenue waterfall** (shared parameterized; see §1.4 consolidation).
5. **Projected-vs-Realized + Benchmarks** (shared, side-by-side).
6. **Geographic distribution** - `ZipHeatMap` (shared, the real Leaflet map; NOT a CSS-grid surrogate, see §6).
7. **DRG + CMI** (shared).
8. **Export** - DEMOTED to a header-right utility affordance, NOT a first-class first section.

**Defined module-specific allowances (the ONLY sanctioned Executive deviations):**
- **HF-KCCQ** patient-reported-outcomes block (Kansas City) - allowed, renders at position 2.
- **CAD-SAQ** patient-reported-outcomes block (Seattle Angina) - allowed, renders at position 2.

**Canonical decisions on the currently-divergent Executive sections:**
- **Revenue-by-Facility** and **Revenue-Opportunities-Pipeline** (currently HF/EP/SH only): **PROMOTED to universal** - they belong in every module's Executive view at the canonical positions after DRG, or are removed from all; partial presence (3 of 6) is drift. Disposition: PROMOTE-TO-UNIVERSAL.
- **CAD-only Financial ROI Waterfall**: **REMOVED** - it duplicates the universal Revenue Waterfall (position 4); CAD uses the universal waterfall like every other module. Disposition: REMOVE (collapse into universal).
- **KPI Summary Cards** (currently 4 of 6, absent EP/SH): **PROMOTED to universal** or removed; partial presence is drift. Disposition: PROMOTE-TO-UNIVERSAL.

**RULE.** An Executive view conforms iff it renders the universal set in canonical order, the Export affordance is NOT the first section, and it contains zero module-specific sections outside the closed allowance list (HF-KCCQ, CAD-SAQ). Any other module-specific Executive section is drift.

**CURRENT-STATE DELTA.** Per 0C-1b: Export renders first in all 6 (e.g. HF `ExecutiveView.tsx:292` above the headline at `:360`); the views are pairwise-cloned into 3 structures (HF; EP=SH; VD=PV) plus CAD; Revenue-by-Facility / Opportunities-Pipeline present in only HF/EP/SH; CAD carries a redundant Financial ROI Waterfall; KPI Summary Cards absent in EP/SH.

### 1.2 Service Line tab canonical skeleton

**CANONICAL STANDARD.** The Service Line tab is a grouped tab-set. The canonical GROUP HEADERS are fixed and identical across all modules: `Clinical Analytics`, `Gap & Opportunity`, `Risk & Quality`, `Care Coordination`, `Outcomes & Reporting`. The canonical UNIVERSAL tab set (present in every module) is: an analytics dashboard, `gap-detection` (one per module), `heatmap` (shared `PatientRiskHeatmap`), `providers`, `safety`, `quality`, a care-team `network`, `reporting` (shared `AutomatedReportingSystem`). Module-specific procedure/pathway tabs are an ALLOWANCE (the genuinely distinct per-domain content, e.g. SH TAVR/TEER, CAD GRACE/TIMI/SYNTAX, PV WIfI/CLI).

**RULE.** Conformance: every module uses the five canonical group headers verbatim; the universal tab set is present in all six; module-specific tabs sit only under `Clinical Analytics` or a `Procedure Pathways` allowance group and are genuinely domain-distinct (not a relabel of a universal tab).

**CURRENT-STATE DELTA.** Per 0C-1b/0C-2a: group headers differ across modules (HF/EP/CAD "Clinical Analytics" vs SH/VD "Procedure Pathways"; CAD "Risk Assessment"; SH "Risk & Quality"; VD "Quality & Analytics"; HF "Device & Advanced Therapy"; EP "Clinical Tools"); tab counts span 11-17; redundancy resolved in §2.

### 1.3 Care Team tab canonical skeleton

**CANONICAL STANDARD.** Care Team has SEVEN universal sub-tabs in canonical order: `dashboard`, `patients` (worklist), `clinical-gaps`, `workflow`, `safety`, `team`, `documentation`, plus the `clinicaltools` "Clinical Intelligence" panel (a per-module tool set, allowed). Module-specific operational sub-tabs are an ALLOWANCE (VD `surgical-planning`/`surveillance`, CAD `planning`/`checklist`, PV `limbsalvage`/`woundcare`, SH STS `calculator`). `hospital-alerts` is PROMOTED to universal (currently HF/EP/SH only) or folded into `dashboard`; partial presence is drift.

**RULE.** Conformance: the seven universal sub-tabs present in all six with canonical ids and labels; `workflow` labeled "Workflow" (not a per-module relabel); module-specific sub-tabs are genuinely operational, not relabels.

**CURRENT-STATE DELTA.** Per 0C-1b: VD relabels `workflow` as "Valve Optimization" (`careTeamConfig.tsx:822`); `hospital-alerts` only in HF/EP/SH; the worklist is six distinct files (EP alone has four variants); `BaseCareTeamView.tsx` exists but is used by none of the six.

### 1.4 CONSOLIDATION MANDATE (canonical architecture)

**CANONICAL STANDARD.** The 18 bespoke view files (3 cloned Executive structures + EP=SH + VD=PV pairs + CAD; same for Service Line and Care Team) collapse to **ONE parameterized shared view component per tab** - `ExecutiveView`, `ServiceLineView`, `CareTeamView` - each driven entirely by per-module config (the existing `executiveConfig.ts` / `serviceLineConfig.tsx` / `careTeamConfig.tsx` pattern, extended to carry the full section/tab definition). The per-module clone files are DELETED. `ModuleLayout` (the shared tab shell) remains; only the 18 bodies consolidate.

**RULE.** Conformance: at most one shared view component per audience tab in `src/components/shared/` (or equivalent), zero per-module `*ExecutiveView.tsx` / `*ServiceLineView.tsx` / `*CareTeamView.tsx` body files; module difference expressed ONLY through config, never through a copied view body. A new per-module view-body copy is drift.

**CURRENT-STATE DELTA.** 18 bespoke view bodies exist under `src/ui/<module>/views/`; `BaseExecutiveView` / `BaseCareTeamView` shared scaffolds exist but are partially or not used.

---

## 2. Navigation canon

**CANONICAL STANDARD.** Built on the 0C-2a button IA. The canonical tab set is §1.2 / §1.3 with these resolved redundancy decisions:

### 2.1 Gap-detection label - STANDARDIZED
Canonical label is **"Gap Detection"** for all six modules; the per-module gap count is NOT in the tab label. The id is canonically `gap-detection` in all six (drop the `<module>-clinical-gap-detection` / VD `clinical-gap-detection` variants). The count, when shown, appears inside the dashboard, not the nav label.
**RULE.** Conformance: all six tabs read exactly "Gap Detection", id `gap-detection`. **DELTA:** currently "Gap Detection (25/20/8/71/12-Gap)" + VD "Clinical Gap Detection" (no count), ids inconsistent (per 0C-2a).

### 2.2 SH STS duplicate - REMOVE the standalone
Service-line `calculators` -> `StructuralRiskCalculators` already CONTAINS STS; the standalone `sts-calculator` -> `STSRiskCalculator` tab is REMOVED. One STS entry point in SH service-line.
**RULE.** Conformance: SH service-line has exactly one STS-reachable tab. **DELTA:** both `calculators` (`serviceLineConfig.tsx:623`) and `sts-calculator` (`:629`) exist.

### 2.3 Network / cross-referral triple - KEEP all three, CLEAR DISTINCT LABELS
Per 0C-2a the three are genuinely distinct: (a) within-specialty referral graph (`StructuralReferralNetworkVisualization` / `PCINetworkVisualization` / per-module), (b) cross-specialty routing (`CrossReferralEngine`, shared), (c) generic team graph (`CareTeamNetworkGraph`, shared). Canonical: KEEP all three, but each carries a label that makes its distinct purpose legible: respectively **"Referral Network (<specialty>)"**, **"Cross-Specialty Referral Routing"**, **"Care Team Network"**. No two of the three may share a label within one module.
**RULE.** Conformance: where two or three of the triple co-exist in a module, their labels are the three canonical distinct labels. **DELTA:** SH and CAD each render all three; labels currently overlap ("Referral Network" / "Care Team Network" used loosely; per 0C-2a).

### 2.4 Stub tabs - REMOVE or BUILD
A tab with no real destination (no render case, placeholder, "coming soon") is REMOVED from config until its destination is BUILT. A nav control must not advertise a non-existent view.
**RULE.** Conformance: every tab in config has a real render destination. **DELTA:** candidate placeholders flagged 0C-2a: CAD `on-off-pump` (`CoronaryServiceLineView.tsx:59`), CAD `analytics`/`outcomes` (switch cases without return), VD `network`, PV `network` (in tabGroups, absent from renderTabContent). Disposition per tab: REMOVE-OR-BUILD.

---

## 3. Component canon (full-migration mandate)

**CANONICAL STANDARD.** There is ONE source of truth per primitive. The observed variant sprawl collapses to one parameterized component each, with every observed variant expressed as a prop.

### 3.1 Button
ONE `Button` in `src/design-system/`. Variants as a `variant` prop: `primary` (carmine CTA), `secondary` (outline), `ghost`, `danger`, `approve` (dark approve-and-submit), `refer` (filled refer). Props: `variant`, `size` (`sm`|`md`|`lg`), `icon`, `iconPosition`, `loading` (shows the §7 spinner, disables), `disabled`, `fullWidth`, `onClick` (REQUIRED for any interactive button per §7 functional-integrity). The CSS `btn-*` classes in `index.css` back this component internally; consumers use `<Button>`, never the raw class or a hand-rolled `<button className>`.

### 3.2 Badge / pill
ONE `Badge` in `src/design-system/`. Variants grouped by PURPOSE via a `kind` prop: `provenance` (e.g. "CMS Estimate", "Demo Data", "Verified"), `status` (e.g. "On Target", "Live tracking", "Auto-detected", "Beta"), `severity` (`critical`|`high`|`medium`|`low`). Color/shape derive from `kind`+value, not from per-call className. The existing `Badge.tsx` is extended to cover status + severity (it currently covers only provenance variants).

### 3.3 KPICard
ONE parameterized `KPICard`. The seven `*ExecutiveKPICard` copies collapse into it. Props: `label`, `value`, `unit`, `trend` (`{direction, value}`), `accent` (module-identity color token), `icon`, `provenance` (badge), `onClick` (optional drill-down). Visual treatment (border/pill/icon) is a single canonical treatment, not four.

### 3.4 Chart wrapper
ONE `Chart` wrapper that consumes the §6 `ChartTheme` and enforces the §6 rules (axis labels+units, gridline, tooltip, zero-baseline, correct-type). All charts render through it; no chart re-specifies axis/tooltip/grid inline.

### 3.5 FULL-MIGRATION MANDATE (enterprise-grade)
**ALL** inline implementations migrate to the canonical components AND the inline implementations are DELETED so they cannot be re-copied. Specifically: the ~826 inline `<button>` (only 19 of 845 use `btn-*`) migrate to `Button`; the ~905 hand-rolled `rounded-full` pills (only 9 of 914 use `<Badge>`) migrate to `Badge`; the 7 `*ExecutiveKPICard` copies + the inline KPI markup migrate to `KPICard`; the 25+ raw `<table>` migrate to `BaseTable`.

**RULE.** Conformance is binary per primitive: zero hand-rolled instances remain, the canonical component is the only source. **Partial migration is NOT acceptable** - leaving some inline + some canonical creates a THIRD state (canonical, legacy-inline-A, legacy-inline-B) that is worse than the two-source status quo, because a reader cannot know which is authoritative and new code copies whichever is nearest. A migration that does not delete the legacy implementations is incomplete and is itself drift.

**CURRENT-STATE DELTA.** Buttons: 845 `<button>`, 19 `btn-*` -> ~826 inline. Pills: 914 `rounded-full`, 9 `<Badge>` -> ~905 hand-rolled. KPI cards: 7 `*ExecutiveKPICard.tsx` + 1 shared `KPICard.tsx`. Tables: 1 shared `BaseTable` + 25+ raw `<table>`.

---

## 4. Color / semantic canon

### 4.1 RATIFIED AS-IS (frozen)
These are measured-correct and are now FROZEN; introducing an alternative is drift:
- **Blue / navy:** the 14-hex liquid-metal chrome set (primary navy `#2C4A60`; the chrome scale `#0D2640` .. `#F0F5FA`; plus `#4A6880`, `#4A7FA5`, `#2E3440`). 0C-1b measured zero off-token web-safe blues. **No new blues.**
- **Spacing:** the 4/8 scale (gap `0`..`8` + customs `100/104/112/128`; padding on-scale; 0 arbitrary `p-[Npx]`). **No off-scale spacing.**
- **Type scale:** ~9 size steps (`text-xs`..`text-5xl`), 7 weights, 3 families (Playfair Display serif = wordmark only, DM Sans body, IBM Plex Mono data). **No new arbitrary `text-[Npx]`** beyond the existing 9/10/11px micro-set.

**RULE.** A new blue hex, an off-scale spacing value, or a new arbitrary font-size is drift, filed and reverted.

### 4.2 RED-OVERLOAD SPLIT (clinical-safety-legibility rule)
**CANONICAL STANDARD.** Carmine / arterial red (`#9B2438` and the arterial scale) is RESERVED for clinical-critical / safety-alert meaning ONLY. This is partly a CLINICAL-SAFETY rule: the alarm color must mean alarm - if red also means "primary button" and "active tab" and "negative dollar delta", a real safety alert loses its pre-attentive signal. The other 7 meanings red currently carries are reassigned to distinct semantic tokens:

| Current red meaning | Canonical token | Note |
|---|---|---|
| Clinical-critical / safety alert | `--sem-critical` (= arterial `#9B2438`) | the ONLY retained red meaning |
| Primary CTA button | `--sem-cta` | a distinct CTA color (not red) |
| Negative number / decline | `--sem-data-negative` | data-viz negative, distinct from alarm |
| Active nav / selected tab | `--sem-selection` | selection state |
| Structural Heart module identity | `--mod-structural` | module-identity token (may stay in the arterial family but is a SEPARATE token from `--sem-critical`, never reused as alarm) |
| Allergy / contraindication flag | `--sem-warning` or `--sem-critical` per clinical severity | severity-mapped |
| Error-state border | `--sem-error` | form/system error, distinct from clinical alarm |
| Critical patient-row accent | `--sem-critical` | legitimately critical -> retains red |

**RULE.** Carmine/arterial red appears ONLY where the meaning is clinical-critical/safety. Any red on a primary CTA, an active tab, a negative number, or an error border is drift -> reassign to its token.

**CURRENT-STATE DELTA.** 0C-1b: `#9B2438` carries 8 distinct meanings, 3 sharing the exact hex (critical-glow `index.css:706`, active-nav `index.css:281`, danger-button `index.css:671`).

### 4.3 Off-token grays - migrate to titanium
**CANONICAL STANDARD.** All neutrals use the titanium scale. The off-token Tailwind grays migrate: `#6B7280`->titanium-500, `#E5E7EB`->titanium-200, `#374151`->titanium-700, `#64748b`->titanium-500, `#1e293b`->titanium-800, `#111827`->titanium-900, etc.
**RULE.** Zero off-token gray hexes in `src/`. **DELTA:** 185 off-token gray uses measured (6B7280=105, 64748b=28, 374151=15, 1e293b=13, E5E7EB=11, 111827=8, 9CA3AF=4, F9FAFB=1), plus 66 `hover:bg-gray` utilities.

---

## 5. Aesthetic canon (depth / motion layer)

### 5.1 Elevation - 4 levels
**CANONICAL STANDARD.** Exactly FOUR elevation levels:
- `flat` - no shadow (inputs, table rows, nested fills).
- `raised` - `0 1px 3px rgba(44,74,96,0.08), 0 1px 2px rgba(44,74,96,0.04)` (the `chrome-card` token; default card).
- `floating` - `0 4px 12px rgba(44,74,96,0.12), 0 2px 4px rgba(44,74,96,0.06)` (the `chrome-card-hover` token; hover/active card, popovers).
- `modal` - `0 12px 32px rgba(44,74,96,0.14), 0 4px 8px rgba(44,74,96,0.06)` (the `chrome-elevated` token; modals, overlays).
**RULE.** Only these four shadow tokens are used; raw `shadow-sm`/`shadow-md`/`shadow-lg`/`shadow-xl`/`shadow-2xl` and inline `boxShadow` are removed. **DELTA:** 0C-1b measured 12 distinct shadow utilities in use (537 usages) + 11 inline boxShadow.

### 5.2 Radius - 3 levels
**CANONICAL STANDARD.** THREE radii: `control` = 8px (`rounded-lg`; buttons, inputs, pills-as-tags), `card` = 16px (`rounded-xl`; cards, panels), `modal` = 24px (`rounded-2xl`; modals). `rounded-full` is reserved for circular badges/avatars only.
**RULE.** Only `control`/`card`/`modal`/`full` radii appear; `rounded-md`/`rounded-sm`/`rounded-3xl` as card radii are removed. **DELTA:** 0C-1b: lg/xl/2xl/md all coexist as card radii (10 distinct rounded utilities).

### 5.3 Glass - 100% of cards
**CANONICAL STANDARD.** The frosted-glass system (`glass-panel`: layered white gradient + `backdrop-filter: blur(24px) saturate(1.5)` + layered hairline borders + the §5.1 shadow) is the STANDARD card background. ALL card surfaces use it. The plain `bg-white`-with-shadow card is non-canonical.
**RULE.** Card-class surfaces render `glass-panel` (or a `glass-panel` variant), not raw `bg-white`. **DELTA:** 0C-1b measured 607 glass vs 1578 plain `bg-white` = ~28% glass adoption; mandate is rollout to 100% of card surfaces.

### 5.4 Motion-orchestration layer
**CANONICAL STANDARD.** A motion system is canonical:
- **Route transition** and **card-entrance orchestration** via `framer-motion` (or an equivalent declarative motion lib) - currently absent (0 framer-motion).
- The existing **count-up** on metrics (4 sites) is formalized into the motion system, applied to every KPI value.
- **Canonical durations:** `fast` 150ms (hover/press), `base` 300ms (enter/transition), `slow` 500ms (orchestrated sequences). The measured 7 durations collapse to these 3.
- **Canonical easing:** ONE standard ease (`cubic-bezier(0.4, 0, 0.2, 1)`) for enter/move, ONE decel ease for exit. The measured 2 ad-hoc curves are replaced by this defined pair.
**RULE.** Route changes and first-paint card entrances are orchestrated (not instant); durations/easing come from the canonical set. **DELTA:** 0C-1b: 1101 transitions, 7 durations, 2 easings, 6 keyframes, count-up at 4 sites, framer-motion = 0 (no route/entrance orchestration).

---

## 6. Chart canon

**CANONICAL STANDARD.** ONE `ChartTheme` that every chart consumes through the §3.4 `Chart` wrapper:
- **Axis styling + REQUIRED labels with units.** Every axis has a label and a unit formatter. A bare-number axis is non-conformant.
- **Gridline treatment** - one canonical gridline (weight, color, dash) applied identically across charts.
- **Tooltip** - one canonical branded tooltip (the chart wrapper supplies it); charts do not hand-roll `contentStyle`.
- **Color-encoding - a color means ONE thing across ALL charts** (ties to §4.2): the §4 semantic tokens drive series/threshold colors, so "red" in any chart means clinical-critical/negative-threshold, never a categorical accent. A chart may not invent a local color meaning.
- **Zero-baseline rule:** any axis encoding magnitude starts its domain at 0 (`domain={[0, max]}`). This fixes auto-scale magnitude distortion.
- **Correct-chart-type-for-data rule:**
  - A **funnel** tapers cumulatively from real stage values; it is NOT hardcoded CSS-width divs.
  - A **waterfall** steps cumulatively (running total, up/down bars from a baseline); it is NOT a row of left-aligned CSS-width bars.
  - A **heatmap**'s color bands are DISTINCT per band; a color function that returns one color for multiple bands is non-conformant.
  - A **geographic** view uses the real map (`ZipHeatMap` Leaflet), not a CSS grid of cards labeled "heatmap".

**RULE.** A chart conforms iff it renders through the `Chart` wrapper, has labeled axes with units, uses the semantic color tokens, has a zero-baseline where magnitude is implied, and uses the correct type for its data. Any deviation is drift, filed per-chart.

**CURRENT-STATE DELTA (0C-2a, 9 measured issues).** Research Auto-Fill target-range = overlapping dashed `ReferenceLine` pairs, no legend (`ResearchExecutiveView.tsx:208`); `CareGapFunnels` = hardcoded CSS widths (`:13`); `GapResponseRateCard` full-height `h-48` empty (`:72`); HF `GeographicHeatMap` = CSS grid not a map; `GDMTHeatmap` + `SHValveTherapyHeatmap` broken color map (>=80/>=70/>=65 all return `bg-chrome-50`, `:27`); `RevenuePipelineCard` no zero-domain (`ForwardLookingCards.tsx:59`); `SharedROIWaterfall` + `FinancialROIWaterfall` = CSS-width bars not waterfalls; `DeviceFunnel` = independent stacked bars; `SharedProjectedVsRealized` overlaid bars obscure. No shared ChartTheme exists (every chart restyles axis/tooltip/grid inline).

---

## 7. State + flow + responsive canon

### 7.1 State
**CANONICAL STANDARD.**
- **ONE shared loading component** (`Spinner` / `LoadingState`) at one canonical size set; it replaces the ad-hoc `animate-spin` instances. Every async surface has a loading branch.
- **ONE empty-state standard** (one `EmptyState` component, consistent sizing) consolidating `ChartEmptyState` + the other empty patterns; no full-card `h-48` empty.
- **ONE hover standard** - a defined ring/elevation treatment (e.g. raise to `floating` + the canonical focus ring) applied to all interactive surfaces; the 1,411 ad-hoc hover utilities collapse to it.
**RULE.** Async surface without a loading branch = drift; bespoke spinner/empty/hover = drift. **DELTA:** 0C-2a: 48 isLoading branches, 25 ad-hoc `animate-spin` at inconsistent sizes (App `w-16` vs ModuleLayout `w-10`), 12 `ChartEmptyState` + 11 other empties (inconsistent sizing), 1,411 hover utilities with no shared treatment.

### 7.2 Functional-integrity rule (covers the dead-interaction defect class)
**CANONICAL STANDARD.** Every interactive control - button, checkbox, table row, toggle - MUST either have a real handler or NOT appear interactive. A control that looks actionable but does nothing is a defect.
**RULE (mechanical).** A no-op handler on an actionable-looking control is drift: `onClick={() => {}}`, `onChange={() => {}}`, an empty-body bound handler (`const x = () => {}` wired to a button), or a styled `<button>` with no `onClick`. Either wire it or render it as static (non-button) markup. This is the rule the functional-defect findings cite.
**CURRENT-STATE DELTA (0C-2a).** EP care-team dead buttons (`EPPriorityWorklist.tsx:230` "Open Chart" no onClick; `EPAlertDashboard.tsx:336,340,344`; `EPReferralTrackerEnhanced.tsx:756,761,766,976`; `EPTeamCollaborationPanel.tsx:743,746,777,780`; `EPFollowUpQueue.tsx:179,183`; `EPCareGapAnalyzer.tsx:830,833`); read-only-looking inputs `EPRiskStratification.tsx:277,315` (`onChange={() => {}}` on CHA2DS2-VASc / HAS-BLED); empty bulk handlers `CoronaryWorklist.tsx:278-283`; no-op export `PeripheralExecutiveView.tsx:378`; no-op modal close `electrophysiology/config/careTeamConfig.tsx:188`.

### 7.3 Flow
**CANONICAL STANDARD.**
- **Headline-first render order** - the highest-signal clinical/financial metric leads each tab; the Export utility is demoted below the headline content (per §1.1).
- **Data-driven deep-links** - an Executive gap/opportunity count links to the Service-Line detail and the Care-Team action for the same cohort; the three tabs are connected by data, not only by the role switcher.
- **Orphan-route rule** - a reachable view is either in a discoverable flow (launcher / in-module link) or intentionally admin-only; a route reachable only by typed URL is drift.
**RULE.** Conformance: Export not first; at least one data-driven cross-tab link from each Executive headline metric to its detail/action; no non-admin route absent from the launcher/flow. **DELTA (0C-2a):** Export renders first in all 6 Executive views; tabs are role-based with zero data-driven deep-links; `/data`, `/patients`, the revenueCycle module are reachable but absent from the launcher.

### 7.4 Responsive
**CANONICAL STANDARD.** Desktop-first is ACCEPTABLE (clinical desktop tool), with these mandates: (a) no fixed `grid-cols-N` without a breakpoint - every multi-column grid carries a `md:`/`lg:` reflow; (b) no hard pixel widths on layout surfaces (`w-[1600px]`, `w-[1800px]`); (c) the `ModuleLayout` 3-tab bar collapses or horizontally scrolls on narrow widths. Breakpoint standard: Tailwind `sm`/`md`/`lg`/`xl`/`2xl` with `md`/`lg` as the primary reflow points.
**RULE.** A `grid-cols-2/3/4` with no breakpoint, a `w-[Npx]` on a layout container, or a non-collapsing tab bar is drift. **DELTA (0C-2a):** ~16 fixed `grid-cols-N` with no breakpoint, 38 `w-[Npx]` incl. `w-[1600px]`/`w-[1800px]`, 52 `overflow-x-auto` scroll tables, ModuleLayout tab bar does not collapse; breakpoint usage measured sm 26 / md 322 / lg 349 / xl 46 / 2xl 9, with 193 files already using the reflow pattern (the standard exists, it is incompletely applied).

---

## 8. Iconography / logo workstream (named; executed in 0C-4)

**CANONICAL STANDARD.** Module iconography and per-module logos are a defined design-craft WORKSTREAM, not specified visually in this document. The current module-icon treatment (a lucide glyph inside a grey rounded-square container, `App.tsx:304-313`, flagged in 0C-1b as generic) and the absence of distinct per-module logos are the inputs. The workstream produces RENDERED OPTIONS in Phase 0C-4, against the palette this canon ratifies (§4.1) and the elevation/radius/glass system (§5).

**RULE.** The visual is decided in 0C-4 via rendered options, not asserted here. This section reserves the workstream and binds its output to §4/§5; it does NOT pre-judge the design.

**CURRENT-STATE DELTA.** One uniform grey-rounded-square lucide treatment across all module tiles; no per-module logo system; the serif `TailrdLogo` wordmark (`TailrdLogo.tsx`) is the only brand mark.

---

## 9. Enforcement

This document is the cited authority for all UI/UX work going forward, at the authority level of `docs/audit/AUDIT_METHODOLOGY.md`:

1. **Deviation is drift.** A UI change that violates a canonical standard is named via a finding, paid down, and NOT propagated. "It matches the neighboring code" is not a defense when the neighboring code is itself pre-canon legacy slated for migration.
2. **New UI conforms.** New components use the canonical Button/Badge/KPICard/Chart/EmptyState/Spinner; new views use the shared parameterized view components (§1.4); new color/spacing/type stays on the ratified scales (§4.1); new charts go through the ChartTheme (§6).
3. **The 0C-3 findings stream enumerates against this canon.** Every current-state delta in §1-§7 is the surface the findings stream files: structural clones (§1.4), nav redundancy/stubs (§2), component sprawl (§3), red-overload + off-token grays (§4), elevation/radius/glass/motion gaps (§5), chart-correctness issues (§6), state/functional-integrity/flow/responsive gaps (§7). Severity is register-owned per `AUDIT_METHODOLOGY.md` §18 (status surfaces copy it verbatim).
4. **Full-migration, not partial (§3.5).** A migration that leaves legacy inline implementations alongside the canonical component is incomplete and is itself drift; the legacy implementations are deleted so they cannot be re-copied.
5. **0C-4 renders against this canon.** The rendered-reference and iconography tracks (§8) produce options bound to the ratified palette and aesthetic system; they may propose visual direction but may not contradict the ratified-as-is freezes (§4.1) without a canon amendment.

Canon amendments follow the same discipline as the audit methodology: a dated note appended here, with the rationale, so the canon's evolution is itself legible.

---

*Authored 2026-06-11 (Phase 0C-2b) as the permanent UI canonical specification, against the measured Phase 0C-1 / 0C-1b / 0C-2a inventory. This is a specification document: it changes no source code and files no findings. It is the standard the Phase 0C-3 findings stream cites and the Phase 0C-4 rendered-reference + iconography tracks render against. Enforced at the authority level of `docs/audit/AUDIT_METHODOLOGY.md`: deviation is drift, named and paid down, never propagated.*
