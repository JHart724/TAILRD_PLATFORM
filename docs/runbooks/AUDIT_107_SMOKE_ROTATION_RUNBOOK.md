# AUDIT-107 Smoke Credential Rotation + Provisioning - Operator Runbook

**Finding:** AUDIT-107 (post-deploy smoke detection gap). The burned `JHart@tailrd-heart.com` / `Demo2026!` credential appeared in diagnostics / chat / logs (it returned HTTP 200 in the 2026-06-04 AUDIT-108 verification probe, so it is a VALID but compromised production credential).
**Script:** `backend/scripts/migrations/audit-107-rotate-smoke-credential.ts`
**Smoke workflow:** `.github/workflows/smoke-test.yml` (Login step now self-diagnosing; alert-only failure notification).

**SECRET DISCIPLINE:** the new password and the `SMOKE_TEST_*` secret values are **operator-only** - never commit them, never paste them in chat, never echo them in logs. The rotation script reads the new password from `SMOKE_NEW_PASSWORD` env and never logs it.

This runbook is operator-side. Steps run only after PR (Block 2) merges + deploys (the rotation script must be in the running image).

---

## What changed in this PR (no operator action needed for these)

- **Smoke Login step is self-diagnosing:** dropped `curl -f`; it now captures `%{http_code}`, asserts HTTP 200 + `success == True`, and emits a classified `::error::` (401 = rotate creds; 500 = decrypt/data-state, see AUDIT-108/109; 000 = network). A failure now tells you WHY.
- **Blocking posture OPTION (A) - alert-only is implemented:** on any smoke failure the workflow opens (at most one, deduped) GitHub issue titled "Post-deploy smoke test FAILED on main". It does NOT gate the deploy.
- **OPTION (B) - deploy-gating remains an OPEN operator decision.** To adopt it later, make the smoke a required check on the deploy path (or fail the deploy workflow on smoke failure). Not done here.

---

## Step (a) - Rotate the production account password

Run via a one-off ECS run-task on the post-merge image (census/backfill precedent), command override + environment. The operator supplies `SMOKE_NEW_PASSWORD` (a fresh strong value, >= 12 chars); it is never logged.

1. **Dry-run** (locate the account, no write):
   - run-task override: `npx tsx scripts/migrations/audit-107-rotate-smoke-credential.ts --dry-run`
   - env: `SMOKE_TEST_EMAIL` (the account; from the secret or operator-known).
   - Expect: `Account located by SMOKE_TEST_EMAIL: yes` + `DRY-RUN: would rotate ...`. If `no`, provision the account first (Step a.0 below).
2. **Execute** (rotate):
   - run-task override: `npx tsx scripts/migrations/audit-107-rotate-smoke-credential.ts --execute`
   - env: `SMOKE_TEST_EMAIL`, `SMOKE_NEW_PASSWORD=<operator-supplied>`, `AUDIT_107_ROTATE_CONFIRMED=yes`.
   - Expect: `rowsUpdated: 1`. The script bcrypt-hashes (cost 12) and raw-UPDATEs `users.passwordHash`; the hash and the password are never logged.

**Step (a.0) - provision (only if dry-run reports located:no):** create the smoke account via the existing super-admin / seed path (`backend/scripts/createSuperAdmin.ts --email <SMOKE_TEST_EMAIL> --password <SMOKE_NEW_PASSWORD>`) on the production image, then return to Step (a) dry-run to confirm located:yes.

## Step (b) - Update the GitHub secrets to the rotated value

Operator-only; the values never appear in repo/logs/chat:
```
gh secret set SMOKE_TEST_EMAIL    --body '<account email>'
gh secret set SMOKE_TEST_PASSWORD --body '<the SMOKE_NEW_PASSWORD used in step a>'
```

## Step (c) - Confirm Login green end-to-end

```
gh workflow run "Post-Deploy Smoke Test"        # workflow_dispatch
# then watch:
gh run list --workflow smoke-test.yml --limit 1
gh run watch <run-id>
```
Expect the Login step to print `Login: PASS (HTTP 200, success=True)`. **The smoke going green on a post-deploy run after rotation is what flips AUDIT-107's remaining scope** (credential/secrets) to closed. The `-sf`-vs-`-s` criteria reconciliation is now resolved (the step requires HTTP 200 explicitly). The deploy-gating posture (option B) remains the only open AUDIT-107 item after a green run.

---

## Notes

- The rotation is reversible only by setting another new password (no plaintext stored anywhere); there is no "old password" to restore. If a run is botched, re-run Step (a) with a fresh `SMOKE_NEW_PASSWORD` and re-do Step (b).
- Do NOT set `PHI_LEGACY_PLAINTEXT_OK` or any global flag; this rotation touches only `users.passwordHash` (a bcrypt hash, not a PHI-encrypted field), via raw SQL.
