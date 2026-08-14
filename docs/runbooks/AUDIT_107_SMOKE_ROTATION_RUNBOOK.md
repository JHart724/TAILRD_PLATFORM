# AUDIT-107 / AUDIT-213 Smoke Credential Rotation - Operator Runbook

**Findings:** AUDIT-107 (post-deploy smoke detection gap) and **AUDIT-213 item (ii)** (the smoke principal's password passed through an AI conversation twice, so the operator-custody assertion is not true for it until it rotates).

**Rotation script:** `backend/scripts/migrations/audit-107-rotate-smoke-credential.ts` (rotates an EXISTING account).
**Provisioning script:** `backend/scripts/migrations/audit-213-provision-smoke-principal.ts` (creates the account if it does not exist).
**Smoke workflow:** `.github/workflows/smoke-test.yml` (Login step self-diagnosing; failure is alert-only, does NOT gate the deploy).

---

## 0. WHICH ACCOUNT THIS ROTATES - read this first

This runbook rotates the **non-privileged VIEWER smoke principal**:

- **Email:** `smoke-viewer@tailrd-heart.com`
- **Id:** `cmsnrnv3a00017tskrr29c1xp`
- **Role:** `VIEWER`, on tenant `demo-medical-city-dallas`
- It is the account the post-deploy smoke authenticates as (`SMOKE_TEST_EMAIL` / `SMOKE_TEST_PASSWORD` point to it, per the AUDIT-213 comment in `smoke-test.yml`).

**This is NOT the SUPER_ADMIN.** It is not `JHart@tailrd-heart.com` and it is not any HOSPITAL_ADMIN. A prior version of this runbook named the super-admin (`JHart@tailrd-heart.com` / `Demo2026!`) - that is wrong and is corrected here. The smoke was deliberately moved off the super-admin because an MFA-enforced principal's password-only token is 403 on protected reads (AUDIT-213); the VIEWER is `tracked-not-forced` and can authenticate password-only. **Do NOT repoint `SMOKE_TEST_*` back to a SUPER_ADMIN or HOSPITAL_ADMIN.** Rotating the super-admin's own burned credential (AUDIT-237 surviving half / AUDIT-108) is a SEPARATE, higher-risk procedure and is out of scope here.

---

## 1. MANDATORY custody path - Secrets Manager reference, never a plaintext env override

The new password reaches the container **only** via a task-definition `secrets` reference (`valueFrom` a Secrets Manager ARN). ECS resolves it inside the container at start; it never appears in the run-task request, the CLI invocation, the shell, or the audit log.

**Why this is mandatory, not a preference** - a plaintext `--overrides '{"containerOverrides":[{"environment":[{"name":"SMOKE_NEW_PASSWORD","value":"<secret>"}]}]}'` puts the password:
- on the **command line** (visible to `ps`, to any shell wrapper, to an agent that builds the command),
- in **shell history**,
- in **CloudTrail** - the `RunTask` API call records `overrides.containerOverrides.environment` verbatim, so a plaintext env override writes the password into the AWS audit trail permanently.

That override channel is exactly what put the credential in reach of an AI conversation and is the substance of **AUDIT-213 item (ii)**. The ECS `run-task` API does **not** accept `secrets` in `overrides` - secrets can only be declared in the task **definition** - so the agent-blind path REQUIRES a task-def revision whose container `secrets` block maps the password env var (see the script table below) to the Secrets Manager ARN. This is the mechanism the AUDIT-213 provisioning used (task-def `tailrd-audit213-provision:2`, which mapped `SMOKE_PRINCIPAL_PASSWORD`).

**Durable recoverable copy (the AUDIT-211 coupling).** The Secrets Manager secret is the DURABLE, RECOVERABLE copy of the credential. Because it lives there (readable by the operator via the Secrets Manager console/API), this rotation does **not** mint a new write-only single-copy secret - it does not reproduce the AUDIT-211 single-point-custody defect. The GitHub `SMOKE_TEST_PASSWORD` secret is write-only, but it is a COPY of the Secrets-Manager value, not the only copy. Keep the Secrets Manager value in sync with the GitHub secret; treat Secrets Manager as the source of truth.

---

## 2. Scripts and the env var each reads

| Situation | Script | Password env var the task-def `secrets` block must map |
| --- | --- | --- |
| Account EXISTS (the normal case - rotate) | `audit-107-rotate-smoke-credential.ts` | **`SMOKE_NEW_PASSWORD`** |
| Account MISSING (provision, rare) | `audit-213-provision-smoke-principal.ts` | **`SMOKE_PRINCIPAL_PASSWORD`** |

Both scripts bcrypt-hash (cost 12) and raw-UPDATE / INSERT `users.passwordHash`; neither logs the password. Both read the password from `process.env`, so the task-def `secrets` reference MUST be keyed to the exact variable name for the script being run. The account is located by `SMOKE_TEST_EMAIL` (a non-secret env; supply as a plain override).

---

## 3. Green-smoke baseline BEFORE rotating (mandatory)

Do not rotate into an unknown state. First confirm the smoke is green with the CURRENT credential, so a post-rotation red is unambiguously the rotation:

```
gh workflow run "Post-Deploy Smoke Test"     # workflow_dispatch, current credential
gh run list --workflow smoke-test.yml --limit 1
gh run watch <run-id>
```

Expect the Login step to print `Login: PASS (HTTP 200, success=True)`. If it is RED now, STOP and fix that first (AUDIT-213 open items, e.g. the viewer's write-denial / tenant-confinement checks) - a rotation on top of an already-red smoke conflates two failure sources. Note the smoke failure ALERT itself is currently broken (AUDIT-114: `gh issue create` fails), so a red smoke may be silent - read the run, do not rely on the notification.

---

## 4. Rotation steps

**Step (a) - write the fresh value to Secrets Manager (operator-only).** Put a fresh strong value (>= 16 chars) into the Secrets Manager secret that the rotation task-def references. The operator sets this directly in the Secrets Manager console/API; it is never typed into a run-task override, chat, or a log. This value is the durable copy.

**Step (b) - register/confirm the rotation task-def (secrets reference, not plaintext).** Ensure a task-def revision exists whose container `secrets` block maps `SMOKE_NEW_PASSWORD` -> the Secrets Manager ARN from Step (a). (Model it on `tailrd-audit213-provision:2`, changing the mapped var from `SMOKE_PRINCIPAL_PASSWORD` to `SMOKE_NEW_PASSWORD` because the rotation script reads that var.) Do NOT put the password in `environment`.

**Step (c) - dry-run (locate the account, no write).**
- run-task override: `npx tsx scripts/migrations/audit-107-rotate-smoke-credential.ts --dry-run`
- plain env overrides: `SMOKE_TEST_EMAIL=smoke-viewer@tailrd-heart.com`
- `SMOKE_NEW_PASSWORD` arrives from the task-def `secrets` reference, NOT an override.
- Expect: `Account located by SMOKE_TEST_EMAIL: yes` + `DRY-RUN: would rotate ...`. If `no`, use the provisioning script (`audit-213-provision-smoke-principal.ts`, env var `SMOKE_PRINCIPAL_PASSWORD`) instead, then return here.

**Step (d) - execute (rotate the DB hash).**
- run-task override: `npx tsx scripts/migrations/audit-107-rotate-smoke-credential.ts --execute`
- plain env overrides: `SMOKE_TEST_EMAIL=smoke-viewer@tailrd-heart.com`, `AUDIT_107_ROTATE_CONFIRMED=yes`
- `SMOKE_NEW_PASSWORD` from the task-def `secrets` reference.
- Expect: `rowsUpdated: 1`. The password and hash are never logged.

**Step (e) - update the GitHub secret to the same value (operator-only).** So the smoke authenticates with the rotated value. The value never appears in repo/logs/chat:
```
gh secret set SMOKE_TEST_PASSWORD --body '<the value written to Secrets Manager in step (a)>'
# SMOKE_TEST_EMAIL is unchanged (smoke-viewer@tailrd-heart.com); set it only if it drifted.
```

**Step (f) - confirm the smoke is green post-rotation.** Re-run the smoke (Section 3 commands). Expect `Login: PASS (HTTP 200, success=True)`. A green post-deploy run after rotation is what flips AUDIT-107's remaining credential scope and satisfies AUDIT-213 item (ii)'s custody assertion.

---

## 5. Recovery / rollback

- There is no "old password" to restore; a bcrypt hash is one-way. If a run is botched, write a NEW fresh value to Secrets Manager (Step a) and re-run Steps (c)-(f). Because Secrets Manager holds the durable copy, the operator can always read the current intended value to re-set the GitHub secret - the AUDIT-211 unrecoverable-single-copy trap does not apply here.
- If the DB hash and the GitHub secret fall out of step, the symptom is Login `401` -> smoke RED. This is alert-only today (option A); it does NOT block the deploy unless deploy-gating (option B) is later adopted. Fix by re-running Steps (d)-(e) from the same Secrets-Manager value so both carry it.
- Do NOT set `PHI_LEGACY_PLAINTEXT_OK` or any global flag; this rotation touches only `users.passwordHash` (a bcrypt hash, not a PHI-encrypted field), via raw SQL.

---

## 6. NEVER

- **Never** pass the password as a plaintext run-task `environment` override / on the CLI - it lands in the command line, shell history, and CloudTrail (AUDIT-213 item ii). Use the task-def `secrets` reference only.
- **Never** paste the password (or the `SMOKE_TEST_*` / Secrets Manager value) into chat, a commit, a PR, or a log.
- **Never** repoint `SMOKE_TEST_*` to a SUPER_ADMIN or HOSPITAL_ADMIN (MFA-enforced -> password-only token is 403 on protected reads).
- **Never** rotate without the green-smoke baseline (Section 3) first.

## 7. Open gaps (not closed by this runbook)

- No recurring rotation CADENCE is defined (AUDIT-213 point 6); rotation is on-demand (exposure/provisioning) only.
- Deploy-gating (option B) remains an open operator decision; the smoke is alert-only today.
- The smoke failure ALERT path is broken (AUDIT-114).
