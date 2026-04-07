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
