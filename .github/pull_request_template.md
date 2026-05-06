## Finding ID
<!-- e.g. SEC-C3, CLIN-C1, HIPAA-C1 -->

## What was wrong
<!-- One sentence: the exact bug or vulnerability -->

## What was changed
<!-- Files modified, approach taken -->

## Why this approach
<!-- Brief rationale — prevents future "why did we do it this way" -->

## Smoke test results
<!-- Paste output of: npm test -- --testPathPattern=smoke -->

- [ ] All smoke tests passing BEFORE this fix
- [ ] All smoke tests passing AFTER this fix
- [ ] No previously-passing tests are now failing

## Type safety
- [ ] No new `any` types introduced
- [ ] No new `@ts-nocheck` added
- [ ] `npm run tsc --noEmit` passes with zero errors

## Clinical safety
*(complete if touching gap detection, drug codes, or clinical thresholds)*
- [ ] Drug codes verified against RxNorm reference
- [ ] Guideline threshold sourced from: *(cite guideline + year)*
- [ ] Gap rule tested for: (a) positive case, (b) negative case, (c) missing data case

## §17 Clinical-Code PR Acceptance Criteria
*(MANDATORY for any PR touching `cardiovascularValuesets.ts`, `gapRuleEngine.ts` clinical-code constants, or any RxNorm/LOINC/ICD-10 reference. See `docs/audit/AUDIT_METHODOLOGY.md` §17 for full rationale. ALL must be checked before merge.)*

### Correctness (zero half-fixes)
- [ ] Every affected rule verified to fire correctly post-fix (not "strictly better than broken")
- [ ] Consumer code audited where canonical changes affect lookup semantics, side discrimination, or threshold comparison
- [ ] Behavior changes documented per-array with clinical guideline citation

### Verification (per §16 fully exhausted)
- [ ] Every changed code verified against authoritative external source (RxNav, loinc.org, NLM Clinical Tables, CMS ICD-10-CM)
- [ ] Verification path documented per code (which source, which date, which descriptor)
- [ ] Fallback source attempted on primary failure (no first-failure punt)
- [ ] Prior codebase "fix-from" comments treated as suspect; re-verified — they may themselves be regressions (per AUDIT-069 LVEF catch)

### Scope discipline (zero silent deferrals)
- [ ] No half-fixes shipped with "follow-up flag" framing
- [ ] Deferred items have `AUDIT_FINDINGS_REGISTER.md` OPEN entries + KNOWN BROKEN inline comments + pinning tests
- [ ] Methodology improvements surfaced during work codified in same PR (per §1, §16, §9.1, §9.2 precedents)

### Process discipline
- [ ] §9.2 full canonical pipeline regen executed (`extractCode → extractSpec → reconcile → refreshCites → applyOverrides → renderAddendum → renderSynthesis → validateCanonical`)
- [ ] §16 verification standard applied to all changed codes
- [ ] Tests cover positive (real concept fires) + negative (wrong concept removed) + behavior preservation + KNOWN BROKEN pinning
- [ ] PR description surfaces clinical impact, deferred items, verification paths, behavior changes

### Pre-PR self-review
- [ ] §17 self-review section included in PR body with explicit ✓ + evidence per criterion (not summarized away)

## Security
*(complete if touching auth, encryption, or access control)*
- [ ] No PHI in logs introduced
- [ ] No new hardcoded secrets
- [ ] Role checks enforced server-side not just frontend
- [ ] New endpoints added to route security matrix in docs/PLATFORM_AUDIT.md

## HIPAA
*(complete if touching PHI fields, encryption, or audit logging)*
- [ ] PHI fields encrypted at rest
- [ ] Audit log entry added where required
- [ ] DSAR cascade updated if new PHI model added

## Database
*(complete if touching prisma/schema.prisma)*
- [ ] Migration file created: `npx prisma migrate dev --name fix_description`
- [ ] Migration tested on database clone first
- [ ] Seed scripts verified still work after migration
- [ ] No breaking changes to existing stored data

## Infrastructure
*(complete if touching any .tf file)*
- [ ] `terraform plan` run — output reviewed line by line
- [ ] Zero unintended resource deletions in plan
- [ ] No secrets committed to any tracked file

## Reviewer checklist
- [ ] Read every line of the diff, not just the summary
- [ ] Ran smoke tests locally — all green
- [ ] Checked the danger zones table in REGRESSION_PROTECTION.md
- [ ] Understand what this change does and why

## BUILD_STATE.md update
- [ ] BUILD_STATE.md updated to reflect this PR's state changes
- [ ] N/A (this PR doesn't change build state — explain why in PR description)
