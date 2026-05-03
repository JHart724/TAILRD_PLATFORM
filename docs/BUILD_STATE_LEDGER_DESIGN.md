# BUILD_STATE.md Ledger — Design Doc

**Branch (when implemented):** `docs/build-state-ledger-tier-1` (Tier 1)
**Author:** jhart
**Date:** 2026-05-03
**Status:** DESIGN
**Companion:** `docs/audit/AUDIT_025_DESIGN.md` §12.4 (Pre-flight inventory discipline)
**Closes:** Operator's "where are we?" question across artifact sprawl

---

## 1. Purpose

Single-source-of-truth aggregate-state checklist at the repo root. Indexes existing canonical docs (PATH_TO_ROBUST, CLAUDE.md, AUDIT_FINDINGS_REGISTER, per-module audits, design docs, change records) into one scannable view.

**Problem solved:** an operator returning to the repo after a short or long absence currently has to read 6+ docs to reconstruct "where are we?" State is split across:
- `docs/PATH_TO_ROBUST.md` (strategic plan, 266 lines)
- `CLAUDE.md` (operational state, 553 lines)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` (security findings, 470 lines)
- `docs/audit/PHASE_0B_PV_AUDIT_REPORT*.md` (per-module clinical audits, 600+ lines per module)
- `docs/audit/AUDIT_*_DESIGN.md` (per-finding designs)
- `docs/CHANGE_RECORD_*.md` (historical events)
- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` (1,307 lines)
- `docs/DAY_*_PLAN.md` (frozen migration plans)

Total: ~3,200 lines of canonical docs. A pure read-through is a half-day task. **`BUILD_STATE.md` makes "where are we?" a 2-minute scan.**

**Backed by `AUDIT_025_DESIGN.md` §12.4 lesson:** investigation-first, inventory-before-architecture. The same discipline applied to operator state recovery.

---

## 2. Scope: what `BUILD_STATE.md` owns vs what it indexes

`BUILD_STATE.md` is an **index and checklist**, not a content owner. It does NOT replace any existing doc. It links into them.

### What `BUILD_STATE.md` owns

- Aggregate header (last-updated, commit SHA, Phase 0 day count, hours budget remaining)
- Phase 0 deliverable checklist with checkbox states
- Build dimension status table (10 workstreams)
- Audit surface status — active scope (20 surfaces: 6 modules × 3 views + research/registry + superuser)
- Deferred / Out-of-scope modules section (CX with audit-trail one-liner; preserves visibility per Module Parity Principle without inflating active scope)
- Per-module status table (6 active modules: HF, EP, SH, CAD, VHD, PV)
- Tier S findings status table (4 findings)
- Open critical work top-3 priority list
- Date-driven commitments (committed dates only, not operator-side)
- Cross-reference index pointing to source docs

### What `BUILD_STATE.md` does NOT own

| Doc | Owns |
|---|---|
| `PATH_TO_ROBUST.md` | Strategic plan, phase budgets, success criteria, risks, cash strategy |
| `CLAUDE.md` | Operational/architectural state, deployment configuration, rules-of-engagement |
| `AUDIT_FINDINGS_REGISTER.md` | Security findings by tier and status with full evidence |
| `PHASE_0B_*_AUDIT*.md` | Per-module clinical audit findings + spec↔code mapping |
| `AUDIT_*_DESIGN.md` | Per-finding design + remediation approach |
| `CLINICAL_KNOWLEDGE_BASE_v4.0.md` | Clinical knowledge, gap inventory, evidence base |
| `DAY_*_PLAN.md` | Historical tactical migration plans (frozen artifacts) |
| `CHANGE_RECORD_*.md` | Historical incident + change records |

When `BUILD_STATE.md` and a source doc disagree, the source doc wins. `BUILD_STATE.md` is the index; it can go stale. Detecting and preventing staleness is what Tier 2 + Tier 3 are for.

---

## 3. Section structure of `BUILD_STATE.md` (Tier 1 manual)

| § | Section | Scannable in | Source |
|---|---|---|---|
| Header | last-updated, commit SHA, Phase 0 day count | 10s | manual |
| 1 | Phase 0 deliverable checklist | 30s | PATH_TO_ROBUST §5 + audit docs |
| 2 | Build dimension status (10 workstreams) | 60s | CLAUDE.md, register, change records |
| 3 | Audit surface status — active scope (20 surfaces) | 60s | per-module audits, register |
| 3b | Deferred / Out-of-scope modules (CX) | 10s | operator decision 2026-05-03 |
| 4 | Per-module status (6 active modules) | 60s | per-module audits, schema, code grep |
| 5 | Tier S findings status (4 findings) | 30s | register |
| 6 | Open critical work (top 3 priority) | 30s | derived from 1-5 |
| 7 | Date-driven commitments (committed only) | 15s | PATH_TO_ROBUST + register |
| 8 | Cross-reference index | 15s | static |
| **Total** | scannable in **~5 min full read** | | |

**Length target: 250-350 lines** — fits in one editor view, no scrolling for the priority sections. **The whole point is "scannable in 5 minutes." If the doc exceeds 350 lines, it's failing its purpose — restructure rather than expand.**

### §3b Deferred Modules — format

CX is the only deferred module today. Format:

> **CX (Cross-module/Disparities/Safety):** 105 spec gaps in CK v4.0 §6.7. Deferred from current build scope per operator decision 2026-05-03. Revisit in v2.0 PATH_TO_ROBUST. NOT IN `ModuleType` enum, 0 frontend files, 0 backend rules.

This preserves the audit trail of the deferral without inflating active surface count. Module Parity Principle is satisfied through visibility, not through forced inclusion in active scope.

---

## 4. Update protocol

### Tier 1 (this PR — manual)

Hand-edited on every PR that changes state. PR template enforces a checklist:

```markdown
## BUILD_STATE.md update
- [ ] BUILD_STATE.md updated to reflect this PR's state changes
- [ ] N/A (this PR doesn't change build state — explain why)
```

Reviewer enforces checklist at PR review. Soft enforcement only.

### Tier 2 (next PR — script automation, ~2-3h)

`scripts/build-state-snapshot.sh`:
- Reads `PATH_TO_ROBUST.md` for plan version + checkpoint dates
- Reads `AUDIT_FINDINGS_REGISTER.md` parsing `### AUDIT-NNN` headers + status fields
- Reads per-module audit docs for coverage rates (regex-extract from §-headers)
- Reads `backend/prisma/schema.prisma` for `ModuleType` enum values
- Greps `backend/src/ingestion/gaps/gapRuleEngine.ts` for per-module rule counts
- Counts frontend `.tsx` files per module and view tier
- Generates a JSON snapshot consumed by a `BUILD_STATE.md` template
- Manual Markdown sections (e.g., "Open critical work top 3") preserved verbatim — script doesn't overwrite human prose

Output: `BUILD_STATE.md` updated in place; the data-driven sections refresh, the prose sections preserve.

### Tier 3 (after Tier 2 — CI staleness check, ~1-2h)

`.github/workflows/ci.yml` adds a `build-state-staleness-check` job:
- Runs `scripts/build-state-snapshot.sh`
- Diffs generated state vs committed `BUILD_STATE.md`
- Fails CI if delta exists (data-driven sections stale)
- Required check before merge

Hard enforcement. Cannot land code without ledger reflecting reality.

---

## 5. Tier 2 + Tier 3 effort

| Tier | Description | Effort | Status |
|---|---|---|---|
| **1** | Manual ledger + design doc + PR template addition | 2-3h | this PR |
| 2 | Script automation for data-driven sections | 2-3h | next PR |
| 3 | CI staleness check + branch protection | 1-2h | after Tier 2 |
| **Total** | | **5-8h** | |

Original estimate was 7-11h; refined here to 5-8h after seeing existing PR template structure (don't need to create — just add a section).

---

## 6. PR template addition (Tier 1 ships this)

Added to `.github/pull_request_template.md` after existing checklists:

```markdown
## BUILD_STATE.md update
- [ ] BUILD_STATE.md updated to reflect this PR's state changes
- [ ] N/A (this PR doesn't change build state — explain why)
```

Located at the END of the template so it's the last thing PR authors see. Soft enforcement until Tier 3 adds CI check.

---

## 7. Self-update pattern

Each PR description (using updated template) includes the `BUILD_STATE.md update` checkbox. PR authors update `BUILD_STATE.md` as part of their commit. Reviewers verify before approving merge.

When this PR (the Tier 1 ledger creation) ships, the discipline begins. Every subsequent PR that changes state must update `BUILD_STATE.md`.

**Not enforced retroactively.** Old PRs (#216 through #223) are not blocked.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Ledger goes stale silently | Tier 3 CI staleness check catches drift |
| Operator forgets to update | PR template checkbox; reviewer enforces |
| Ledger and source doc disagree | Source doc wins; ledger flagged stale on next read |
| Ledger length grows beyond 450 lines | Restructure into sub-sections; archive historical state to a separate doc |
| Script misparses a doc | Tier 2 script has unit tests against committed canonical docs |

---

## 9. Success criteria

- [ ] Tier 1 `BUILD_STATE.md` ships at **250-350 lines** (scannable in 5 minutes; restructure if exceeded)
- [ ] PR template requires ledger update; reviewers enforce
- [ ] Tier 2 ships within 7 days of Tier 1
- [ ] Tier 3 ships within 7 days of Tier 2
- [ ] After 30 days: operator returning to repo can answer "where are we?" in <2 minutes by reading `BUILD_STATE.md` alone
- [ ] After 60 days: zero PRs land with stale ledger (Tier 3 check enforces)

---

## 10. Cross-references

- `docs/PATH_TO_ROBUST.md` v1.2 — strategic plan (unchanged by this work)
- `docs/audit/AUDIT_025_DESIGN.md` §12.4 — Pre-flight inventory discipline (which inspired this)
- `CLAUDE.md` — operational state (unchanged)
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — security findings ledger (unchanged)
- `.github/pull_request_template.md` — gets one section added by this PR
