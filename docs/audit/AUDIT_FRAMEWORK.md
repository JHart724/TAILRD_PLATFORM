# TAILRD Backend Engineering Audit — Framework

**Version:** 1.0
**Created:** 2026-04-29
**Status:** ACTIVE
**Companion:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` (parallel to `docs/TECH_DEBT_REGISTER.md`)

---

## Purpose

Enterprise-grade audit of the TAILRD cardiovascular AI platform backend. Scope: HIPAA-relevant production system serving real PHI. Comparable rigor to:

- Stripe internal pre-launch reviews
- Palantir Forward-Deployed engineering audits
- Epic certification engagements

The audit is intentionally critical. Findings are not opinions; every finding carries file:line evidence, a reproducible verification command, and a specific remediation. The output is actionable, not aspirational.

---

## Scope

**In:**

- All code under `backend/src/`
- Prisma schema and migrations under `backend/prisma/`
- Backend deployment infrastructure (`Dockerfile`, `infrastructure/cloudformation/`, `.github/workflows/`)
- IAM, Secrets Manager, RDS/Aurora, ECS production configuration
- Tech debt register (`docs/TECH_DEBT_REGISTER.md`)
- Production runbooks (`docs/DAY_*.md`, change records)

**Out:**

- Frontend code (`src/` — separate audit)
- Marketing site / Wix presence
- Pre-production scaffolding (`.context/`, `infrastructure/scripts/phase-2d/` historical scripts)

---

## Audit dimensions (7 phases)

| Phase | Dimension | Status | Owner |
|-------|-----------|--------|-------|
| 1 | Code quality + tech debt reconciliation | EXECUTING (2026-04-29) | jhart |
| 2 | Security posture (auth, PHI, audit logs, secrets, threat surface) | DEFERRED | jhart |
| 3 | Data layer (schema integrity, indexes, queries, migration history) | DEFERRED | jhart |
| 4 | Operational maturity (observability, alerting, runbooks, incident response) | DEFERRED | jhart |
| 5 | HIPAA + compliance gap analysis (Privacy Rule, Security Rule, Breach Notification, BAA coverage) | DEFERRED | jhart |
| 6 | Module-by-module clinical maturity (HF, EP, Coronary, Structural, Valvular, PV) | DEFERRED | jhart |
| 7 | Threat modeling + architecture review | DEFERRED | jhart |

Each phase produces:

- A phase report at `docs/audit/PHASE_N_REPORT.md`
- New findings appended to `docs/audit/AUDIT_FINDINGS_REGISTER.md`
- Cross-references into `docs/TECH_DEBT_REGISTER.md` where appropriate

---

## Severity rating scale

| Severity | Definition | Time-to-fix target |
|----------|-----------|--------------------|
| **CRITICAL (P0)** | Active production risk, exploitable now, potential PHI exposure, or HIPAA violation. | 24-48 hours |
| **HIGH (P1)** | Significant risk, mitigating controls present but inadequate, or compliance gap that would be findable in audit. | 1-2 weeks |
| **MEDIUM (P2)** | Notable issue, no immediate risk, but should be addressed for production-grade hygiene. | 1-2 months |
| **LOW (P3)** | Quality / hygiene issue, defer to product maturity timeline. | When convenient |
| **INFO** | Observation or recommendation, not a finding. | N/A |

Severity rationale must be explicit. "P1 because X" — not "P1 because important."

---

## Evidence requirements per finding

Every finding **must** include:

1. **Title** — one-line problem statement
2. **Severity** — P0/P1/P2/P3/INFO with rationale
3. **Location** — file paths + line numbers, or AWS resource ARN, or DB table/column
4. **Evidence** — reproducible verification command (e.g., `grep -rn "..." backend/src`, `aws rds describe-db-instance --db-instance-identifier ...`)
5. **Impact** — concrete description of what breaks or what risk exists
6. **Remediation** — specific fix with file/line targets
7. **Effort estimate** — hours (S < 4h, M 4-16h, L > 16h)
8. **Dependencies** — does this block / depend on other findings or work?
9. **Cross-references** — related tech debt entries, related findings, related PRs

---

## Anti-patterns to avoid

These produce noise, not findings. The audit explicitly excludes:

- **Vibes-based findings without code references** — every finding must point at file:line or resource ARN
- **Severity inflation** — not everything is P0/P1. Most enterprise findings are P2/P3.
- **Best-practice scolding** — list actual gaps in THIS codebase, not generic improvement opportunities
- **Recommendations without verification commands** — if it can't be re-checked, it can't be tracked
- **Conflating "could be improved" with "is broken"** — those are different things; only the second is a finding

---

## Methodology per phase

Each phase follows the same five-step pattern:

1. **Define scope** — what files/systems are in/out for this phase
2. **Run automated tooling first** — grep, scanners, linters, AWS describe-* commands
3. **Manual review of automated findings** — every automated hit is reviewed; not all are findings
4. **Architecture / cross-cutting analysis** — what does the codebase look like as a whole through this lens
5. **Findings document** — phase report with raw tool output + interpreted findings + register updates

---

## Cross-phase tracking

Findings often span dimensions. Examples:

- A weak refresh-token policy is both a security finding (Phase 2) and an operational finding if there's no revocation runbook (Phase 4)
- A missing index is both a data-layer finding (Phase 3) and a performance/operational concern (Phase 4)
- An unencrypted PHI field at rest is a security (Phase 2), data (Phase 3), AND HIPAA (Phase 5) finding

Each finding gets a unique ID (`AUDIT-001`, `AUDIT-002`, ...) tracked in `docs/audit/AUDIT_FINDINGS_REGISTER.md`. The register is the source of truth for status.

Tech debt entries that are also audit findings are cross-referenced both directions:

- The audit finding lists "Tech debt #N (TECH_DEBT_REGISTER.md)" in its cross-references
- The tech debt entry adds an "Audit finding: AUDIT-NNN" line in its body

---

## Phase exit criteria

Each phase is complete when:

- [ ] Phase report (`docs/audit/PHASE_N_REPORT.md`) merged to main
- [ ] All findings have an `AUDIT-NNN` ID and are in the findings register
- [ ] Severity ratings are evidence-justified
- [ ] Remediation has effort estimates
- [ ] Verdict at the bottom of the report (PASS / CONDITIONAL / FAIL) with rationale
- [ ] Cross-references to other phases and tech debt entries are wired

---

## Out-of-band escalation

If during a phase a P0 finding is discovered:

1. STOP the phase
2. Surface the finding immediately to the operator
3. Open a remediation PR within the same session if scope allows
4. Resume the phase only after the P0 is remediated or a mitigation is in place

This document is authoritative for audit conduct. Phase reports, finding entries, and remediation PRs all reference back to this framework.
