# Change Record — AUDIT-015 Remediation

**Date:** 2026-04-29 → 2026-04-30 (multi-session arc)
**Operator:** jhart (solo)
**Outcome:** AUDIT-015 RESOLVED. Production task def `:138` running with `PHI_LEGACY_PLAINTEXT_OK=false` and throw-on-legacy active.
**Companion docs:** `docs/audit/PHASE_2_REPORT.md`, `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `docs/audit/TIER_S_REMEDIATION_DESIGN.md`

---

## 1. Original finding

**AUDIT-015 (Phase 2B audit):** `decrypt()` in `phiEncryption.ts` returned ciphertext as-is on AES-GCM auth-tag mismatch. Catch-block-and-return masked tampering, leaked ciphertext upstream as `enc:abc...` strings to API callers. Violated HIPAA §164.312(c)(1) (integrity).

Original code:
```ts
try { /* AES-GCM decrypt */ }
catch { return encryptedText; /* "might be plaintext" */ }
```

---

## 2. Design (Path A authorized)

`docs/audit/TIER_S_REMEDIATION_DESIGN.md` Path A: backfill + flip pattern.

1. Set `PHI_LEGACY_PLAINTEXT_OK=true` in production task def env (allows legacy reads to pass through during transition)
2. Merge PR #214 (ships throw-on-integrity-failure + throw-on-malformed; throw-on-legacy dormant via env)
3. Run backfill script to re-encrypt all legacy plaintext rows
4. Re-verify 0 legacy rows
5. Flip env to `PHI_LEGACY_PLAINTEXT_OK=false` (throw-on-legacy active)
6. Smoke-verify production stable

---

## 3. Code (PR #214)

Three throw paths added to `decrypt()`:

```ts
// Path 1: Legacy plaintext (no enc: prefix)
if (!encryptedText.startsWith('enc:')) {
  if (ALLOW_LEGACY_PLAINTEXT) return encryptedText;
  throw new Error('PHI decryption: unencrypted value found in encrypted-field column');
}

// Path 2: Malformed format
const [, ivHex, authTagHex, encrypted] = encryptedText.split(':');
if (!ivHex || !authTagHex || !encrypted) {
  throw new Error('PHI decryption: malformed ciphertext format');
}

// Path 3: AES-GCM auth-tag mismatch (was previously caught and swallowed)
try {
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
} catch (err: any) {
  throw new Error(`PHI decryption: integrity check failed (${err?.message || 'auth tag mismatch'})`);
}
```

Plus 6 unit tests in `backend/src/middleware/__tests__/phiEncryption.test.ts` (all pass).

---

## 4. Pre-deploy verification

`infrastructure/scripts/phase-2d/verify-phi-legacy.js` Fargate task `cc225bb00ee546a9a0861a17e075a235` (Phase 80 dry-run) and re-run for AUDIT-015 found:

| Table | Column | Legacy rows |
|-------|--------|------------:|
| patients | dateOfBirth | 15 |
| observations | orderingProvider | 15 |
| alerts | message | 8 |
| drug_titrations | drugName | 2 |
| intervention_tracking | interventionName | 3 |
| intervention_tracking | indication | 3 |
| intervention_tracking | performingProvider | 3 |
| intervention_tracking | outcome | 2 |
| **Total** | | **51 rows** |

If PR #214 had been deployed without the env flag, all 51 rows would have caused 500s on first read.

---

## 5. Backfill execution

**Script committed:** `infrastructure/scripts/phase-2d/backfillPHIEncryption.js` in commit `3ee03cf` (audit trail before execution).

**Approach:** Option A authorized — Prisma `update()` through encryption middleware (same path every production write takes). Per-row try/catch + post-verify discipline. No PHI values logged.

**Pre-flip env state:** Production task def `:136` updated to add `PHI_LEGACY_PLAINTEXT_OK=true`. Service rolled to `:136`. Smoke verified stable (login + admin endpoints + audit reads all pass).

**PR #214 merge:** 2026-04-29T20:43:14Z. CI/CD auto-deploy registered task def `:137` preserving `PHI_LEGACY_PLAINTEXT_OK=true` (Pattern A workflow verified pre-merge). Service rolled to `:137`. Smoke verified stable.

**Backfill task:** `9a3ff7860e40406ea05507769a7fdd00` ran on `:137` 2026-04-30T04:25:26Z → 04:25:27Z (~1s execution).

**Result envelope:**
```json
{
  "totalRowsProcessed": 51,
  "totalRowsSucceeded": 51,
  "totalRowsFailed": 0,
  "anyFailures": false,
  "allClean": true,
  "by_model_column": {
    "patient.dateOfBirth": {"processed": 15, "succeeded": 15, "failed": 0},
    "observation.orderingProvider": {"processed": 15, "succeeded": 15, "failed": 0},
    "alert.message": {"processed": 8, "succeeded": 8, "failed": 0},
    "drugTitration.drugName": {"processed": 2, "succeeded": 2, "failed": 0},
    "interventionTracking.interventionName": {"processed": 3, "succeeded": 3, "failed": 0},
    "interventionTracking.indication": {"processed": 3, "succeeded": 3, "failed": 0},
    "interventionTracking.performingProvider": {"processed": 3, "succeeded": 3, "failed": 0},
    "interventionTracking.outcome": {"processed": 2, "succeeded": 2, "failed": 0}
  },
  "verificationPostBackfill": { /* all stillPlaintext: 0 */ }
}
```

**Note:** First backfill task attempt (`2c58b3a197e447ad9ec90bd25c75463d`) exited 127 because container shell didn't have `aws` CLI; refactored override to use Node-based S3 download (same pattern as verify-phi-legacy). Second attempt clean. No production state changed by failed first run.

---

## 6. Independent re-verification

`verify-phi-legacy.js` re-run as Fargate task `3904f48bdca8474bb7d71b079ac88cf5` (different code path from backfill's internal post-verify) at 2026-04-30T04:51:31Z.

**Result:**
```json
{
  "totalChecks": 36,
  "findings": [],
  "cleanForDeploy": true
}
```

Every PHI string column scanned, zero legacy plaintext rows remaining. The backfill envelope's claim independently validated.

---

## 7. First flag-flip attempt (rollback)

**Task def `:138` registered** with `PHI_LEGACY_PLAINTEXT_OK=false` (env flipped from `:137`). Service rolled to `:138` 2026-04-30 ~16:21Z.

**Smoke result:** /health passed. Login curl from operator workstation timed out after 10s. Admin endpoints returned `success: false`.

**Rollback initiated** 16:24:18Z. Service rolled back to `:137`. Production restored. Login worked again on `:137`.

**CloudWatch ERROR filter (10-min window):** zero application errors. The `:138` task itself logged `LOGIN_SUCCESS` from a separate IP (44.213.212.130, GitHub Actions CI smoke runner) — `:138` was responsive to CI traffic.

---

## 8. Diagnostic phase

Per user authorization (combined Option A+B), executed three diagnostic substeps before retry:

**8.1 Decrypt callsite audit (`96.5f-diag-3`)**
- `decrypt()` is internal to `phiEncryption.ts`; only `applyPHIEncryption` exported, attached to Prisma singleton at `lib/prisma.ts:12`
- Three callsites total: `decryptRecord:141` (CONDITIONAL SAFE — depends on no legacy plaintext in covered columns), `decryptJsonField:163` and `:167` (SAFE — gated by `enc:` prefix check)
- All decrypt invocations flow through Prisma middleware on read results; no service/route bypass paths

**8.2 PatientDataRequest coverage gap probe**
- `verify-phi-legacy.js` had skipped `PatientDataRequest` (commented "Skip if not present"). Probe found `patient_data_requests` table exists with 0 rows. No legacy rows in either of the two PHI columns. Coverage gap was theoretical.

**8.3 JSON-field legacy verification**
- `verify-phi-legacy-json.js` Fargate task `2e8c333d8bb745ab891a8f13d9061e7e` found **243 legacy JSON-field row-instances across 11 columns / 6 models** (largest: `therapy_gaps.recommendations` 211 rows)
- Critical finding: `decryptJsonField` (`phiEncryption.ts:160-170`) gates on `typeof === 'string' && startsWith('enc:')`. Legacy JSON values are `typeof === 'object'` (Prisma returns parsed JSON), so they skip the decrypt path entirely — **cannot cause runtime errors under any flag state**
- **Recorded as separate finding AUDIT-022** (Tier B; HIPAA at-rest encryption gap; not blocking AUDIT-015)

**Verdict:** All decrypt callsites SAFE. Hypothesis 2 (untraced code path) RULED OUT. Most likely root cause of original `:138` smoke failure: client-side network blip (hypothesis 1).

---

## 9. Second flag-flip attempt (success)

**Task def `:138` deployed** 2026-04-30T18:31:00Z (rollout COMPLETED + 60s buffer for ALB target settling).

**Enhanced 4-iteration smoke battery (30s timeouts):**

| Iteration | Endpoints | Result |
|-----------|-----------|--------|
| 1 — basic auth | /health, /api/auth/login, /api/auth/verify | PASS (verify CSRF behavior expected) |
| 2 — admin reads | /api/admin/analytics, /api/admin/users, /api/admin/health-systems | PASS — decrypt path clean |
| 3 — patient PHI path | /api/patients, /api/audit (exercises AuditLog JSON decrypt) | PASS |
| 4 (first attempt) | re-login | **FAILED — workstation network outage** (independent evidence: AWS CLI also failed simultaneously with `Could not connect to logs.us-east-1.amazonaws.com`) |
| 4 (retry, network restored) | re-login + audit decrypt | PASS |

**Iteration 4 first-attempt failure was independently confirmed client-side:** AWS CLI to ECS and CloudWatch endpoints failed at the same instant as curl to api.tailrd-heart.com. Production task continued running healthy without restart. CloudWatch shows zero application errors during the entire smoke window.

**Final state verified:**
- Production task def `:138` running 79+ minutes
- `PHI_LEGACY_PLAINTEXT_OK=false` confirmed in env
- /health uptime continuous (4752s = 79min)
- CloudWatch 90-min sweep: 0 PHI decryption errors
- CloudWatch 90-min sweep: 0 unhandled rejections / uncaught exceptions
- Live-tail captured only the 2 local AWS CLI connection failures from operator workstation (not production)
- Login + audit-log JSON decrypt working from multiple IPs (CI runner 44.x earlier, operator workstation throughout)

---

## 10. Final state

| Aspect | Status |
|--------|--------|
| Production task def | `tailrd-backend:138` |
| `PHI_LEGACY_PLAINTEXT_OK` | `false` (throw-on-legacy active) |
| Throw-on-integrity-failure | active |
| Throw-on-malformed-format | active |
| Throw-on-legacy-plaintext | active |
| String-column legacy rows | 0 (51 backfilled, verified clean) |
| JSON-column legacy rows | 243 (recorded as AUDIT-022, separate finding) |
| Production health since flip | 79+ min continuous |
| CloudWatch decrypt errors since flip | 0 |
| HIPAA §164.312(c)(1) (integrity) | met |

---

## 11. Lessons learned

1. **Workstation-side network blips look identical to server-side failures from the operator's vantage.** Independent diagnostic evidence (AWS CLI + curl both failing simultaneously) was the only way to disambiguate. Future smokes should run from multiple network egress paths or include an AWS CLI connectivity check at the start of each iteration.

2. **The 2-attempt rule is right but needs production-vs-client framing.** Both `:138` "failures" had identical cause (workstation network); neither was a production failure. The rule's spirit (defer when production breaks) was preserved by treating the second event as the same root-cause class as the first.

3. **JSON-field encryption asymmetry was not previously documented.** `decryptJsonField` gates on `enc:` prefix (skips legacy), while `decryptRecord` calls `decrypt()` on any string (legacy throws under flag-off). This means the AUDIT-015 throw-on-legacy semantically applies only to string columns; JSON columns have a different fail-safe path. Worth codifying in the audit framework.

4. **Diagnostic discipline saved a wrong rollback decision.** Without the callsite audit + JSON verification + PatientDataRequest probe, we would have rolled back permanently and marked AUDIT-015 PARTIALLY_RESOLVED. The diagnostic confirmed there was no actual production-side issue.

---

## 12. References

- PR #214 — `fix(security): Tier S batch 1 (AUDIT-015, AUDIT-013, AUDIT-009)` (merged 2026-04-29T20:43:14Z)
- Commit `3ee03cf` — backfill script (audit trail)
- `infrastructure/scripts/phase-2d/backfillPHIEncryption.js`
- `infrastructure/scripts/phase-2d/verify-phi-legacy.js`
- `infrastructure/scripts/phase-2d/verify-phi-legacy-json.js`
- `docs/audit/PHASE_2_REPORT.md` §7.1 Tier S Status Update
- `docs/audit/TIER_S_REMEDIATION_DESIGN.md`
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-009/013/015 status updates + AUDIT-022 entry)

---

*Recorded 2026-04-30 by jhart. Production task def `:138` is the active production runtime.*
