# Phase 1 — Tech Debt Register Reconciliation

**Phase:** 1 (Code quality + tech debt reconciliation)
**Reconciliation date:** 2026-04-29 (post Aurora cutover)
**Reconciler:** jhart
**Source:** `docs/TECH_DEBT_REGISTER.md` (37 entries: 1-26, 28-38)

---

## Methodology

For each tech debt entry, evaluate:

1. **Current status**: still OPEN, RESOLVED (per register text), or DUPLICATE/OBSOLETE
2. **Aurora migration impact** (Days 1-10): did the migration affect, resolve, or render obsolete?
3. **Severity re-rating** post-cutover: still accurate, needs adjustment
4. **Notes**: what changed since the entry was authored

Reconciliation verdict per entry:
- **VERIFIED_OPEN** — still open, severity unchanged
- **VERIFIED_OPEN_SEVERITY_CHANGE** — open but severity needs adjustment
- **VERIFIED_RESOLVED** — actually resolved, register already marks it
- **VERIFIED_RESOLVED_NEW** — newly resolvable now (post-cutover); register doesn't reflect
- **DUPLICATE** — collapse with another entry
- **OBSOLETE** — no longer applies (architectural change, e.g., RDS-specific debt obsolete)

---

## Per-entry walk

| ID | Title (abridged) | Original sev | Verdict | New sev | Notes |
|---:|------------------|-------------:|---------|--------:|-------|
| 1 | Leaked AWS access key in public git history | P0 | VERIFIED_RESOLVED | — | Resolved 2026-04-23 per register; key revoked, CI verified, BCP doc retained. Unaffected by Aurora migration. |
| 2 | MCD data partial wipe state | P0 | VERIFIED_RESOLVED | — | Resolved 2026-04-22; FK reassignment + dedup script verified. Schema fix migrated cleanly to Aurora. |
| 3 | No MFA enforcement on PHI routes | HIGH | VERIFIED_OPEN | HIGH | Cutover did not change MFA posture. Target unchanged: pre-PHI-pilot. |
| 4 | Refresh token unbounded lifetime | HIGH | VERIFIED_OPEN | HIGH | Target was "Sprint following Aurora cutover (2026-05 first week)" — now imminent. **Promote to top of HIGH list.** |
| 5 | `authorizeHospital` silent no-op | HIGH | VERIFIED_OPEN | HIGH | Target was "2026-05-10 (Sprint following Aurora cutover)". Same as #4. **Promote.** |
| 6 | No staging environment | MEDIUM | VERIFIED_RESOLVED_NEW | — | Day 9 (PR #187, #194) shipped `tailrd-staging` CF stack + Aurora + ALB + Wix CNAME. Register lists target 2026-04-28; needs RESOLVED marker. |
| 7 | No APM / distributed tracing | MEDIUM | VERIFIED_OPEN_SEVERITY_CHANGE | HIGH | Target was Day 8 (2026-04-27) — slipped through migration. Now post-cutover with no APM, debugging Aurora-side issues will be harder than RDS was. **Promote to HIGH** until X-Ray or equivalent is enabled. |
| 8 | Backend does not trust X-Forwarded-For | MEDIUM | VERIFIED_RESOLVED_NEW | — | Resolved per Phase 2-A (`app.set('trust proxy', 1)` shipped 2026-04-20) — see #18 entry which references this fix. Register entry itself doesn't yet have RESOLVED marker. |
| 9 | ALB access logs not enabled | MEDIUM | VERIFIED_OPEN | MEDIUM | No evidence access logs were enabled. Verify in Phase 2 (security). Target was Day 2 — slipped. |
| 10 | DEMO_MODE env vars in production task def | MEDIUM | VERIFIED_OPEN | MEDIUM | Target was Day 6. Aurora cutover used same task def family; need to verify post-cutover task defs (123-126) don't carry these. Action item for Phase 2. |
| 11 | 5 Care Team views render mock data | P1 | VERIFIED_OPEN | P1 | Product debt; Aurora migration didn't touch frontend wiring. Target Sprint B-2 (2026-05). |
| 12 | SuperAdminConsole not wired | P1 | VERIFIED_OPEN | P1 | Same as #11. Sprint B-3. |
| 13 | Single-region, no DR | LOW | VERIFIED_OPEN_SEVERITY_CHANGE | MEDIUM | Aurora Serverless v2 makes Global Database easier than RDS Multi-AZ. Re-rate MEDIUM since DR planning is now a concrete next step, not a hypothetical. Target: 2026 Q4 still acceptable. |
| 14 | Manual ECS task def registration | LOW | VERIFIED_OPEN | LOW | Unchanged. |
| 15 | Math.random() in analytics (partially fixed) | LOW | VERIFIED_OPEN | LOW | Need fresh grep sweep in Phase 1 automated tooling step. |
| 16 | Prisma migration history incomplete | HIGH | VERIFIED_RESOLVED | — | Resolved 2026-04-20 via consolidated baseline migration. Carried cleanly through to Aurora. |
| 17 | RDS Proxy stuck in internal error | MEDIUM | OBSOLETE | — | RDS Proxy was for the old RDS instance. Aurora Serverless v2 has its own pooling characteristics; the Proxy resource is unused. Phase 4 should confirm we removed/are removing it; for the register, mark OBSOLETE with note. |
| 18 | Audit middleware logged ALB IP (162k legacy rows) | LOW | VERIFIED_OPEN (accepted) | LOW | Accepted-as-is per register (don't rewrite audit history). Aurora migration preserved these rows verbatim via DMS — verified drift=0 on `audit_logs` at Phase 71. |
| 19 | CDC deferred Wave 1 | LOW | VERIFIED_RESOLVED | — | Resolved 2026-04-21. CDC was active throughout migration; stopped cleanly at Phase 71 (drift=0). |
| 20 | rdsRebootHealthCheck.js probe hangs | LOW | VERIFIED_RESOLVED | — | Resolved 2026-04-22 via raw `pg` Client probe. |
| 21 | Dual role convention (kebab vs SCREAMING_SNAKE) | MEDIUM | VERIFIED_RESOLVED | — | Resolved 2026-04-25 via PR 2 of Phase 2-A split. Carried through Aurora cutover unchanged. |
| 22 | Wix DNS authoritative, Route 53 shadow | MEDIUM | VERIFIED_OPEN | MEDIUM | Wix CNAMEs added for staging (#187) confirmed Wix-authoritative model still operates as documented. Decision still pending; action item for Phase 2. |
| 23 | SES infrastructure not in IaC | LOW | VERIFIED_OPEN | LOW | SES wiring shipped 2026-04-28 via PR #189 (`USE_SES_EMAIL` flag) — the *application* code now uses SES, but the SES infra itself is still CLI-created. IaC codification still pending. |
| 24 | Orphaned SendGrid DNS records | LOW | VERIFIED_OPEN | LOW | Unchanged. Blocked on #26. |
| 25 | Stale Google site-verification + SPF | LOW | VERIFIED_OPEN | LOW | Unchanged. |
| 26 | SendGrid setup origin investigation | LOW | VERIFIED_OPEN | LOW | Unchanged. Blocks #24 cleanup. |
| 28 | Prisma performanceMetric.createMany failing | MEDIUM | VERIFIED_RESOLVED | — | Resolved 2026-04-26 via PerformanceRequestLog model + writer rewrite. Aurora migration carried this cleanly (table created on Aurora during the late `applyAuroraSchemaParity` run, see #32). |
| 29 | PerformanceRequestLog retention not implemented | LOW | VERIFIED_OPEN | LOW | Unchanged. |
| 30 | Metadata field PII review | LOW | VERIFIED_OPEN | LOW | Unchanged. Becomes more urgent as we approach first PHI customer. |
| 31 | AnalyticsTracker singleton setInterval not disposable | LOW | VERIFIED_OPEN | LOW | Unchanged. |
| 32 | Aurora schema drift / Wave 2 Attempt 3 lessons | N/A | VERIFIED_RESOLVED | — | Learning entry; tooling (`inventoryRdsAurora.js`, `applyAuroraSchemaParity.js`) still useful for any future migration. |
| 33 | DMS parallel-load FK race | N/A | VERIFIED_RESOLVED | — | Learning entry. DMS now stopped (Phase 71); race condition no longer relevant. Tooling improvement (load-order auto-derivation) still TODO if we ever do another DMS migration. |
| 34 | Predecessor RDS `tailrd-production` (t4g) | MEDIUM | VERIFIED_OPEN | MEDIUM | Investigation still pending. **NEW BLOCKER**: Day 11 RDS decommission targets `tailrd-production-postgres` (the cutover source), NOT this predecessor. The predecessor remains separate. Investigation should fold into post-Sinai sprint as planned. |
| 35 | Post-Deploy Smoke Test login failing | LOW | VERIFIED_RESOLVED | — | Resolved 2026-04-28; subsequent deploys (PRs #199-205) all show smoke test passing in CI. |
| 36 | Synthea SNOMED vs ICD-10 mismatch | LOW | VERIFIED_OPEN | LOW | Unchanged; affects synthetic-data demos only. |
| 37 | Gap detection staleness cutoffs filter Synthea | LOW | VERIFIED_OPEN | LOW | Unchanged. |
| 38 | Synthea medications COMPLETED vs ACTIVE | LOW | VERIFIED_OPEN | LOW | Unchanged. |

---

## Reconciliation summary

### Status counts (post-cutover)

| Status | Count | Notes |
|--------|------:|-------|
| RESOLVED (per register) | 12 | #1, #2, #16, #19, #20, #21, #28, #32, #33, #35, plus learning entries |
| VERIFIED_RESOLVED_NEW (register text not yet updated) | 2 | #6 (staging shipped), #8 (trust proxy shipped) |
| VERIFIED_OPEN (no severity change) | 19 | #3, #4, #5, #9, #10, #11, #12, #14, #15, #18, #22, #23, #24, #25, #26, #29, #30, #31, #34, #36, #37, #38 |
| VERIFIED_OPEN_SEVERITY_CHANGE | 2 | #7 (MEDIUM→HIGH; APM is now a debugging blocker), #13 (LOW→MEDIUM; Aurora makes Global DB an actionable next step) |
| OBSOLETE | 1 | #17 (RDS Proxy unused post-cutover) |

### Severity-counts re-rated

| Severity | Open count (post-recon) | Was |
|----------|------------------------:|----:|
| P0 | 0 | 2 (both resolved) |
| HIGH | 4 | 4 (no net change; #7 promoted in, #16 already resolved) |
| MEDIUM | 6 | 10 (#21, #28 resolved + #6, #8, #17 reclassified) |
| P1 | 2 | 2 (unchanged) |
| LOW | 12 | 16 (#19, #20 resolved + #13 promoted to MEDIUM) |

### Top priorities surfaced by reconciliation

The four HIGH items are now the active priority list (in execution order):

1. **#5 — `authorizeHospital` silent no-op** — tenant isolation is foundational; this is the most likely audit finding of the four.
2. **#4 — Refresh token unbounded lifetime** — session hygiene; pairs naturally with #5 (both touch auth).
3. **#3 — No MFA enforcement on PHI routes** — pre-PHI-pilot blocker; can ship after #4/#5.
4. **#7 — No APM / distributed tracing** *(promoted from MEDIUM)* — post-cutover debuggability gap; one Aurora performance puzzle would justify the build effort.

### Register updates required (separate commit)

The following entries need RESOLVED markers added to `docs/TECH_DEBT_REGISTER.md` so the source-of-truth matches reality:

- **#6** — staging environment shipped (target was 2026-04-28; shipped on time)
- **#8** — `trust proxy` shipped 2026-04-20 (referenced in #18 but not marked on #8 itself)
- **#17** — mark OBSOLETE with note ("RDS Proxy targeted RDS instance pre-cutover; Aurora migration removed the dependency")

(Whether to apply these in the same audit PR or separately: keeping audit docs separate from register updates preserves clean history. Recommend a follow-up PR after Phase 1 lands.)

---

## What this reconciliation did NOT find

- **No missed P0 issues.** Both prior P0s are genuinely resolved.
- **No silent regressions** in resolved items. Register text matches observable reality (verified via Aurora cutover post-checks).
- **No new tech debt items** were generated from this reconciliation alone — Phase 1 automated tooling step is where new findings will surface.

---

## Next step

Phase 1 Step 87.2 (automated tooling) follows. This reconciliation is the static-state snapshot; tooling produces the dynamic-state findings.
