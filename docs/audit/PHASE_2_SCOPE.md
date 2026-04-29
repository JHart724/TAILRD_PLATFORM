# Phase 2 — Security Posture: Scope

**Phase:** 2 of 7
**Dimension:** Security posture (auth, PHI, audit logs, secrets, threat surface)
**Started:** 2026-04-29
**Auditor:** jhart
**Framework:** `docs/audit/AUDIT_FRAMEWORK.md`
**Companion:** `docs/audit/PHASE_1_REPORT.md` (auth concentration triple-confirmed)

---

## Why this phase, why now

Phase 1 reconciliation surfaced a triple-confirmed auth concentration:

- 3 of 4 HIGH tech debt items live in auth (#3 MFA, #4 refresh token, #5 `authorizeHospital`)
- Every auth-critical middleware file at 0% coverage (AUDIT-001)
- `: any` clusters in PHI-handling code that auth gates (AUDIT-002)

Phase 2 scrutinizes that cluster end-to-end: every auth flow path gets an explicit verdict, every PHI field gets a documented encryption state, the threat surface is enumerated. This is the phase whose findings most directly affect Mount Sinai due-diligence and HIPAA defensibility.

---

## Sub-phases

| Sub-phase | Topic | Estimated effort | Today's target |
|-----------|-------|------------------|---------------|
| **2A** | Authentication flow audit (login, JWT, refresh, MFA, rate-limit) | ~6h | YES |
| **2B** | PHI encryption coverage (every PHI field, every code path) | ~6h | YES |
| **2C** | Secret lifecycle (rotation, retrieval, scoping, cross-env isolation) | ~4h | Conditional on 2A/2B finding density |
| **2D** | Threat modeling (SUPER_ADMIN bypass, tenant isolation, attack surface) | ~4h | Conditional on 2A/2B finding density |

If 2A or 2B surface 5+ HIGH/P0 findings, the phase pauses for remediation before continuing 2C/2D.

---

## In scope

**Middleware:**
- `backend/src/middleware/auth.ts` (258 LOC, 0% coverage)
- `backend/src/middleware/auditLogger.ts` (164 LOC, 0% coverage)
- `backend/src/middleware/phiEncryption.ts` (211 LOC, 0% coverage)
- `backend/src/middleware/csrfProtection.ts` (110 LOC, 0% coverage)
- `backend/src/middleware/tierEnforcement.ts` (269 LOC, 0% coverage)
- `backend/src/middleware/cognitoAuth.ts` (169 LOC, 0% coverage)
- `backend/src/middleware/authRateLimit.ts` (165 LOC, 0% coverage)

**Routes:**
- `backend/src/routes/auth.ts` (login, logout, refresh)
- `backend/src/routes/mfa.ts` (MFA setup + verify)
- `backend/src/routes/accountSecurity.ts` (password change, session revoke)
- `backend/src/routes/sso.ts` (SSO flow)
- `backend/src/routes/invite.ts` (user invite acceptance)

**Services:**
- `backend/src/services/auditService.ts`
- `backend/src/services/mfaService.ts`
- `backend/src/services/kmsService.ts`

**Schema:**
- `backend/prisma/schema.prisma` — every PHI-bearing model + every encrypted field

**Configuration:**
- ECS task definition env vars (`PHI_ENCRYPTION_KEY`, `JWT_SECRET`, related)
- Secrets Manager secret structure (`tailrd-production/app/*`)
- IAM role policies that touch the above

---

## Explicitly out of scope

Reserved for other phases per `docs/audit/AUDIT_FRAMEWORK.md`:

- Frontend auth handling (`src/auth/AuthContext.tsx`) — separate frontend audit
- Infrastructure scripts (`infrastructure/scripts/`) — Phase 7
- AI / ECG model routes — Phase 6 (CDS-exempt scope per CLAUDE.md §8)
- Data layer integrity (Prisma indexes, query patterns) — Phase 3
- Operational alerting on auth events — Phase 4

---

## Methodology

Per `docs/audit/AUDIT_FRAMEWORK.md` §Methodology:

1. **Define scope** — this document
2. **Run automated tooling first** — grep on auth/PHI patterns, AWS describe-* on relevant resources
3. **Manual review of automated findings** — every hit reviewed; not all are findings
4. **Architecture / cross-cutting analysis** — flow tracing end-to-end
5. **Findings document** — `docs/audit/PHASE_2_REPORT.md` (this PR's deliverable)

Each finding receives:

- File:line evidence (or AWS resource ARN)
- Reproducible verification command
- Severity rationale per `AUDIT_FRAMEWORK.md` (P0/P1/P2/P3/INFO)
- Specific remediation
- Effort estimate
- Cross-references to Phase 1 findings + tech debt entries

---

## Acceptance criteria

The phase is complete when:

- [ ] **2A:** every authenticated route path has an explicit verdict (PASS / CONDITIONAL / FAIL)
- [ ] **2A:** every login/refresh/logout/MFA flow stage is traced and documented
- [ ] **2A:** tech debt #5 (`authorizeHospital` silent no-op) is reproduced with evidence
- [ ] **2B:** every Prisma model containing PHI has each PHI field marked encrypted/plaintext/N-A
- [ ] **2B:** every code path that bypasses `phiEncryption` middleware is enumerated
- [ ] **2B:** PHI_ENCRYPTION_KEY rotation pattern documented (or absence noted)
- [ ] **2C / 2D (if executed today):** scoping criteria documented; findings recorded
- [ ] All Phase 2 findings registered in `docs/audit/AUDIT_FINDINGS_REGISTER.md` as `AUDIT-NNN`
- [ ] Phase 2 verdict (PASS / CONDITIONAL / FAIL) with rationale at end of report

---

## Anti-patterns to avoid (per framework)

- Vibes-based findings without code references
- Severity inflation
- Best-practice scolding (list real gaps, not generic improvement opportunities)
- Conflating "could be improved" with "is broken"

---

## Out-of-band escalation

If during this phase a P0 finding is discovered with active exploit potential:

1. STOP the phase
2. Surface immediately
3. Open remediation PR within the same session if scope allows
4. Resume phase only after P0 is remediated or mitigated

This applies particularly to Phase 2A finding the `authorizeHospital` silent no-op (tech debt #5) — if reproduced as actively exploitable in production paths, it triggers the out-of-band escalation.
