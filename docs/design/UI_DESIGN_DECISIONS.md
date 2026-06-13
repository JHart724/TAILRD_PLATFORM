# TAILRD UI Design Decisions (UI_DESIGN_DECISIONS)

**Status:** Canonical companion to `docs/design/UI_CANON.md`. The canon states the RULES (what must be true; how conformance is judged). This document locks the VALUES (the specific numbers, hexes, and decisions the v2.0 UI rebuild builds against). Where UI_CANON named a standard without a number ("3 radii", "the CTA token", "the canonical durations"), this document resolves it to an exact value.

**Authored:** 2026-06-12 (Phase 0C-4), operator-delegated (the operator delegated these calls; the values below are the decided defaults). Specification only - authoring it changes no source code and files no findings.

**Relationship to the corpus:** UI_CANON (rules) + this doc (values) are the paired authority the v2.0 UI rebuild cites, alongside the AUDIT-149..162 findings (the enumerated current-state deltas the rebuild closes). Iconography/logo (section 9) is a RECOMMENDED DIRECTION to render-and-approve in a later design loop, not a final artwork spec.

## 0. How to read this document

Each section cites the UI_CANON section it resolves, then states the locked value(s). Values are build-toward TARGETS (section 10): they remove ambiguity for the rebuild; they do NOT certify the rendered result. The final premium-aesthetic verdict is the operator's eye on the rebuilt running screens, not this spec.

Formatting follows DRIFT-44: ASCII-only, hyphen-only (no em-dashes / en-dashes / arrows; use `->`), `§` is the only permitted non-ASCII glyph (used for cross-references). Color values are hex; "fill" = background, "text" = foreground/ink.

---

## 1. Palette lock (resolves UI_CANON §4.1 ratified-as-is + the specifics)

The liquid-metal chrome/navy set is RATIFIED AS-IS by §4.1 (frozen; no new blues). This section locks the specific role assignments.

| Role | Hex | Use |
|---|---|---|
| Primary navy | `#2C4A60` | structure (headers, primary text/ink) AND primary data (bar fills, headline numbers) |
| Rail (left nav) | `#16263A` | the left navigation rail background (darker than primary navy for depth separation) |
| Cloud canvas | `#EAF1F8` | the app background / page canvas behind cards |
| Card hover fill | `#F0F5FA` | card hover state + the inner sub-card fill (see §5 density) |
| Link / interactive | `#1A3B5C` | links, interactive text, active affordances (a chrome-scale step distinct from primary navy) |
| Chrome scale (endpoints) | `#0D2640` (darkest) .. `#F0F5FA` (lightest) | the full liquid-metal ramp; secondary/tertiary data steps live here |

**Data-series rule (locked):** the PRIMARY data series (the bar/number a reader reads first) is navy `#2C4A60`. SECONDARY and TERTIARY series step DOWN the chrome scale: secondary `#5A8AB0`, tertiary `#A8C5DD`. Navy is therefore BOTH structure and primary data; multi-series charts read as one navy primary against progressively lighter chrome - never as a rainbow. No categorical color is introduced for data series (categorical distinction comes from labels + the chrome ramp, not hue).

---

## 2. Red / semantic token values (resolves UI_CANON §4.2 token split)

§4.2 reserves carmine for clinical-critical ONLY and reassigns red's other 7 meanings to distinct tokens. This locks the exact hex per token, as fill+text pairs.

| Token | Fill | Text/ink | Meaning |
|---|---|---|---|
| `--sem-critical` | `#9B2438` (or `#FBEAED` tint bg + `#9B2438` text) | `#FFFFFF` on solid; `#9B2438` on tint | CLINICAL ALARM ONLY - safety alert, critical patient state. The only retained red meaning. |
| `--sem-cta` | **navy `#2C4A60`** | `#FFFFFF` | Primary actions / CTA buttons. **DECISION: primary actions use NAVY, not a distinct CTA red** - so red is NEVER a button. (This is the recommended navy-primary resolution: it keeps the alarm color pre-attentively reserved per the §4.2 clinical-safety rule.) Secondary buttons = outline navy; ghost = transparent navy text. |
| `--sem-warning` | `#FAEEDA` (bg) | `#854F0B` (amber ink) | Warnings, cautions, sub-critical flags. |
| `--sem-success` | `#E1F5EE` (bg) | `#0F6E56` (teal ink) | On-target, success, healthy state. |
| `--sem-data-negative` | `#FAEEDA` (bg) | `#854F0B` (amber) | Negative deltas / declines in DATA contexts (a non-alarm amber, NOT red) - so a falling number never borrows the alarm color. (Where a stronger negative signal is needed, a muted brick distinct from `#9B2438` may be defined later; default is amber.) |
| `--sem-selection` | `#E6EEF5` (bg) | `#2C4A60` (navy) | Active nav / selected tab / selection state (navy-based, not red). |
| `--sem-provenance` (demo/estimate) | `#E6F1FB` (bg) | `#185FA5` (blue ink) | "CMS Estimate" / "Demo Data" / provenance badges. |
| `--sem-neutral-estimate` | titanium-100 (bg) | titanium-600 (ink) | Neutral/unverified estimate framing where a colored provenance badge is too strong. |

**Rule (locked):** carmine `#9B2438` appears ONLY where the meaning is clinical-critical/safety. Buttons are navy; selection is navy-tinted; negative data is amber; provenance is blue. A red button, a red active-tab, or a red negative-number in the rebuild is a §4.2 violation.

---

## 3. Elevation (resolves UI_CANON §5.1 - restate as the locked set)

The 4 canonical levels from §5.1, restated as the locked build-toward set with element assignments:

| Level | Shadow value | Used by |
|---|---|---|
| `flat` | none | inputs, table rows, nested fills, the inner sub-cards |
| `raised` | `0 1px 3px rgba(44,74,96,0.08), 0 1px 2px rgba(44,74,96,0.04)` | the default card / panel (every glass card at rest) |
| `floating` | `0 4px 12px rgba(44,74,96,0.12), 0 2px 4px rgba(44,74,96,0.06)` | card hover/active, popovers, dropdowns |
| `modal` | `0 12px 32px rgba(44,74,96,0.14), 0 4px 8px rgba(44,74,96,0.06)` | modals, overlays, the command palette |

Only these four. No raw `shadow-sm/md/lg/xl/2xl`, no inline `boxShadow`.

---

## 4. Radius (resolves UI_CANON §5.2 - lock the card value)

| Token | Value | Used by |
|---|---|---|
| `control` | 8px (`rounded-lg`) | buttons, inputs, pills-as-tags, small chips |
| `card` | **12px** | cards, panels, sub-cards. **DECISION: 12px** (the rendered-mockup value; tighter/more-instrument than 16px - resolves the §5.2 "12-16px decide one"). |
| `modal` | 24px (`rounded-2xl`) | modals, overlays |
| `full` | 9999px | circular ONLY - avatars, status dots, icon-circles. Not a card/tag radius. |

Three radii + full. No `rounded-md`/`rounded-sm`/`rounded-3xl` as card radii.

---

## 5. Density + spacing (clinical-instrument target)

**Target density:** clinical-instrument (the rendered-mockup level) - information-dense but breathable, the density a clinician/CMO scanning many metrics expects. NOT a marketing-site airiness.

| Property | Value |
|---|---|
| Card padding | 14-18px (default 16px; tight metric cards 14px) |
| Section gap (between cards/sections) | 16px |
| Inner element gap (within a card) | 8-12px (on the 4/8 scale per §4.1) |
| Metric-card inner treatment | a white glass card (`raised`, 12px radius) containing cloud-fill sub-cards (`#F0F5FA`, `flat`, 12px radius) for each metric - the "card-in-card" instrument look; the sub-card cloud fill is what gives the dense-but-layered read |

**Rule:** all spacing on the §4.1 4/8 scale; 0 arbitrary `p-[Npx]`. The card-in-card pattern (white glass outer + cloud `#F0F5FA` inner sub-cards) is the canonical metric-cluster treatment.

---

## 6. Typography lock (resolves UI_CANON §4.1)

| Axis | Lock |
|---|---|
| Families | Playfair Display (serif) = wordmark ONLY; DM Sans = all body/UI; IBM Plex Mono = data/numbers/codes |
| Weights | **400 (regular) and 500 (medium) ONLY** - the rendered set. No 600/700/black in the rebuild (emphasis comes from size + color + the mono data face, not heavy weight). Exception: the Playfair wordmark retains its display weight (it is brand, not UI). |
| Size scale | the bounded scale from §4.1 (text-xs .. text-4xl, ~9 steps); no new arbitrary `text-[Npx]` beyond the existing 9/10/11px micro-set |
| Heading hierarchy | size + navy ink, not weight: section title (lg/xl, navy 500), card title (sm/base, navy 500), label (xs, titanium-500 400), data (mono, navy 500) |

---

## 7. Motion values (resolves UI_CANON §5.4)

| Property | Value |
|---|---|
| Durations | `fast` 150ms (hover/press), `base` 300ms (enter/transition), `slow` 500ms (orchestrated sequences) |
| Easing | enter/move = `cubic-bezier(0.4, 0, 0.2, 1)`; exit = `cubic-bezier(0.0, 0, 0.2, 1)` (decel) |
| Library | framer-motion (or equivalent declarative motion lib, through the standard library review per AUDIT-158) for route-transition + card-entrance orchestration |
| Count-up | on EVERY KPI value (formalize the existing 4-site count-up into the motion system), `base` duration |
| Hover | card lift to `floating` elevation + fill shift to `#F0F5FA`, at `fast` 150ms - one shared hover treatment (resolves AUDIT-160's 1411 ad-hoc hovers) |

Route changes and first-paint card entrances are orchestrated (staggered card entrance at `base`/`slow`), not instant.

---

## 8. Chart standard (resolves UI_CANON §6 - the ChartTheme concrete values)

The single `ChartTheme` every chart consumes, locked:

| Property | Value |
|---|---|
| Primary series | navy `#2C4A60` |
| Secondary / tertiary series | chrome scale: `#5A8AB0`, `#A8C5DD` (per §1 data-series rule) |
| Threshold/semantic fills | the §2 tokens (critical `#9B2438`, success teal `#0F6E56`, warning amber `#854F0B`) - a color means ONE thing across all charts |
| Axes | always labeled, with units; tick text titanium-500, `text-[11px]` |
| Zero baseline | every magnitude axis `domain` starts at 0 (fixes the AUDIT-159 RevenuePipelineCard auto-scale) |
| Gridline | 0.5px dashed, border-tertiary (`#D4E4F0`); horizontal only unless the chart needs vertical |
| Tooltip | one branded style - white glass `raised`, 12px radius, titanium-200 border, `text-[12px]`, navy ink |
| Chart-type correctness | real cumulative funnels/waterfalls (not CSS-width divs), distinct heatmap bands, grouped-not-overlaid comparison bars (fixes AUDIT-159's instances) |

---

## 9. Iconography / logo direction (resolves UI_CANON §8 - RECOMMENDED DIRECTION, render-and-approve)

**Status: RECOMMENDED DIRECTION, not a final SVG spec.** The operator delegated the call; this is the chosen DEFAULT direction to render-and-approve against options in a later design loop (the actual glyph artwork is a designer/rendered-options task). It may be overridden when the rendered options are reviewed.

**Direction: a unified geometric mark system** replacing the current lucide-glyph-in-grey-rounded-square (the AUDIT-146/0C-1b-flagged generic treatment):
- **Single consistent stroke weight** across all marks (one line weight, geometric construction).
- **Each of the 6 modules a distinct simple anatomical glyph** (the clinical subject, abstracted to a clean geometric form):
  - Heart Failure -> a ventricle form
  - Electrophysiology -> a rhythm trace (ECG line)
  - Structural Heart -> a valve form
  - Coronary -> a vessel branch
  - Valvular -> valve leaflets
  - Peripheral Vascular -> a limb-vessel form
- **Color treatment:** navy-on-cloud (`#2C4A60` mark on `#EAF1F8`/`#F0F5FA` ground) - no grey rounded square; the mark sits in the cloud field per §5 density.
- **Platform wordmark:** the Playfair Display "TAILRD HEART" wordmark treatment (the existing dual-gradient serif mark is retained as the brand anchor; its exact treatment is part of the same rendered-options loop).

This direction is bound to the §1 palette and the §5 aesthetic system; the rendered options must conform to those, but the specific glyph artwork is decided visually in the loop, not asserted here.

---

## 10. Final-check note (the build-toward contract)

The values in this document are **build-toward TARGETS for the v2.0 rebuild** - they remove ambiguity so the rebuild has one number per decision. They do **NOT certify the rendered result.**

The final premium-aesthetic verdict happens against the **rebuilt running screens**, with the **operator as the final eye** - not from this spec. This document's job is to make the rebuild unambiguous and conformant to UI_CANON; whether the rebuilt screens actually feel premium is a judgment made on the live result, and may send specific values (especially the §9 iconography direction and the §5 density feel) back for revision against rendered options.

Revisions to these locked values follow the same dated-note discipline as UI_CANON: a dated amendment appended here with the rationale, so the values' evolution stays legible.

---

*Authored 2026-06-12 (Phase 0C-4) as the value-lock companion to `docs/design/UI_CANON.md`. The canon states the rules; this locks the specific operator-delegated values the v2.0 UI rebuild builds against, alongside the AUDIT-149..162 findings (the enumerated current-state deltas). Specification only: no source code change, no findings filed. The iconography/logo direction (§9) is a recommended default to render-and-approve in a later design loop. Per §10, these are build-toward targets; the final premium verdict is the operator's eye on the rebuilt running screens, not this spec.*
