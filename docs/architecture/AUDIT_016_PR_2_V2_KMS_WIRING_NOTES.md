# AUDIT-016 PR 2 — V2 Envelope Emission + kmsService Wiring (Design Refinement)

**Status:** DESIGN — pending operator approval at PAUSE 2; implementation begins on PAUSE 2 confirmation
**Authored:** 2026-05-07
**Parent:** `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` (PR #252) + AUDIT-016 PR 1 (PR #255)
**Stacked on:** PR #257 (AUDIT-071 mitigation; rebases onto main when #257 merges)
**Methodology:** §17 (clinical-code PR acceptance), §17.3 (scope discipline), §17.5 (self-review), §18 (status-surface discipline)

This note refines the parent design doc per Phase A pre-flight inventory findings. Operator decisions D1-D7 captured + applied. Production-readiness gate item per BUILD_STATE.md §6 re-rank (#1 priority post-AUDIT-071).

---

## 1. V2 envelope emission path

`keyRotation.encryptWithCurrent` flag-flips to V2 emission when **both** conditions hold:
1. `process.env.PHI_ENVELOPE_VERSION === 'v2'` (explicit operator opt-in per D3)
2. `process.env.AWS_KMS_PHI_KEY_ALIAS` is set (KMS key resolvable per D1)

V2 emission flow:
```
plaintext + EncryptionContext{service, purpose, model, field}
     ↓
kmsService.envelopeEncrypt(plaintext, encryptionContext)  ← parameterized per D6
     ↓ returns { ciphertext, encryptedDataKey, iv, authTag } (all base64)
     ↓
envelopeFormat.buildV2(wrappedDEK=encryptedDataKey, iv, authTag, ciphertext)
     ↓
'enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>'
```

Bridge concern: kmsService returns object-shape; envelopeFormat consumes/produces colon-delimited string. The bridge happens entirely in `keyRotation.encryptWithCurrent` — kmsService and envelopeFormat both stay focused on their own concerns.

V1 emission path (default, when V2 gating not satisfied) is unchanged from PR #255.

---

## 2. V2 decryption path

`keyRotation.decryptAny` V2 case (currently `throw new DesignPhaseStubError(...)` per PR #255 line 217):

```
'enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>'
     ↓
parseEnvelope(envelope)  ← already shipped PR #255
     ↓ returns EnvelopeV2 { version, wrappedDEK, iv, authTag, ciphertext }
     ↓
kmsService.envelopeDecrypt({ ciphertext, encryptedDataKey: wrappedDEK, iv, authTag }, encryptionContext)
     ↓
plaintext
```

**Critical: V2 decryption works regardless of `PHI_ENVELOPE_VERSION` flag.** Once V2 ciphertext exists in production, decryption must always succeed even if V2 emission has been disabled. The flag controls EMIT; DECRYPT is unconditional. This is the structural property that makes feature-flag rollback safe (per §8 below).

AUDIT-015 fail-loud invariants preserved on V2 path:
- Malformed envelope → `EnvelopeFormatError` (from `parseEnvelope`)
- KMS Decrypt failure (key not found / access denied / network) → throw with cause; no silent fallback
- AES-GCM auth-tag failure (after DEK unwrap) → throw

---

## 3. `encryptWithCurrent` gating logic + module-init validation

```ts
function shouldEmitV2(): boolean {
  return process.env.PHI_ENVELOPE_VERSION === 'v2'
    && Boolean(process.env.AWS_KMS_PHI_KEY_ALIAS);
}
```

Module-init validation (sister to AUDIT-017 `validateKeyOrThrow`):

```ts
export function validateEnvelopeConfigOrThrow(env: NodeJS.ProcessEnv = process.env): void {
  const version = env.PHI_ENVELOPE_VERSION;
  if (version === undefined || version === 'v1') return;  // Default V1 — no validation needed
  if (version === 'v2') {
    if (!env.AWS_KMS_PHI_KEY_ALIAS) {
      throw new EnvelopeConfigError(
        'PHI_ENVELOPE_VERSION=v2 requires AWS_KMS_PHI_KEY_ALIAS to be set. ' +
        'Either set AWS_KMS_PHI_KEY_ALIAS (alias or ARN) or unset PHI_ENVELOPE_VERSION to fall back to V1.',
      );
    }
    return;
  }
  throw new EnvelopeConfigError(
    `PHI_ENVELOPE_VERSION must be 'v1' (default) or 'v2'; got: ${version}`,
  );
}
```

Called from `phiEncryption.ts` module init alongside existing `validateKeyOrThrow(ENCRYPTION_KEY)`.

D1 alias-OR-ARN handling: `AWS_KMS_PHI_KEY_ALIAS` accepts either format. AWS SDK's `KeyId` parameter accepts both natively — no detection logic needed in our code. Naming is alias-biased for backwards-compat with kmsService:40 default.

---

## 4. EncryptionContext design (D2)

Per-record EncryptionContext:

```ts
{
  service: 'tailrd-backend',           // hardcoded; identifies the application
  purpose: 'phi-encryption',           // hardcoded; identifies the data class
  model: '<Prisma model name>',        // per-record; e.g., 'Patient', 'Encounter', 'Alert'
  field: '<field name>',               // per-record; e.g., 'mrn', 'firstName', 'triggerData'
}
```

**HIPAA audit-trail value:** EncryptionContext is logged in CloudTrail's `kms:Decrypt` events. Per HIPAA §164.312(b) audit controls + §164.308(a)(1)(ii)(D) Information System Activity Review, this provides:
- Tamper-evidence: ciphertext + EncryptionContext is verified together; mismatched context fails decrypt
- Forensic granularity: which field/model was decrypted, by whom, when (CloudTrail correlation)
- Defense-in-depth: an attacker who exfiltrates a `Patient.mrn` ciphertext cannot decrypt it as if it were `Alert.message` (KMS rejects the context mismatch)

Plumbing chain:
```
phiEncryption middleware  ←  knows model + field at write time (PHI_FIELD_MAP / PHI_JSON_FIELDS)
     ↓ passes context per-call
keyRotation.encryptWithCurrent(plaintext, { service, purpose, model, field })
     ↓ passes through to kmsService for V2 emission only
kmsService.envelopeEncrypt(plaintext, { service, purpose, model, field })
     ↓ AWS KMS GenerateDataKey EncryptionContext
[KMS key + DEK wrapping with this context]
```

**phiEncryption.ts modification scope:** small. The middleware iterates `PHI_FIELD_MAP[model]` already; just needs to pass `{ model, field }` along with each `encryptWithCurrent` call.

**Future-work deferral (out of PR 2 scope):** `hospitalId` could be added to EncryptionContext for tenant-level forensic trail. Deferred because (a) the middleware doesn't always have hospitalId at write time (some PHI writes happen via FHIR ingestion paths where hospitalId is resolved earlier in the call stack and not threaded through to the encryption call); (b) requires a write-path audit confirming hospitalId availability across all PHI emit sites — non-trivial cross-cutting work. Captured here as future enhancement; does NOT block PR 2.

---

## 5. Configuration (D1 + D3)

| Env var | Default | Purpose |
|---|---|---|
| `PHI_ENVELOPE_VERSION` | unset (= v1) | `'v2'` to enable V2 emission; anything else (or unset) keeps V1 emission |
| `AWS_KMS_PHI_KEY_ALIAS` | `alias/tailrd-production-phi` (kmsService.ts:40) | Alias name or full ARN. Required if PHI_ENVELOPE_VERSION=v2. |
| `AWS_REGION` | `us-east-1` (kmsService.ts:30) | KMS region. Standard AWS SDK fallback. |
| `PHI_ENCRYPTION_KEY` | unset | Required for V0 + V1 paths (AUDIT-017). Still required during V0/V1 → V2 transition window per design doc §8 migration plan. |

**Local development behavior (NODE_ENV !== 'production'):**
- `kmsService.envelopeEncrypt` short-circuits to `localEncrypt` (kmsService.ts:75)
- localEncrypt uses `LOCAL_KEY = PHI_ENCRYPTION_KEY` for the "DEK" + AES-256-GCM
- V2 envelope shape is preserved (still `enc:v2:<wrappedDEK>:<iv>:<authTag>:<ciphertext>`)
- **Important:** dev V2 ciphertext is NOT portable to production. The `wrappedDEK` segment is the localEncrypt key directly (not real KMS-wrapped). Production cannot decrypt dev V2 ciphertext (KMS won't recognize the wrappedDEK as a valid KMS-encrypted blob). **Intentional separation** — dev/staging/prod each have their own ciphertext lineage.

This is acceptable because:
- Dev DBs are seeded fresh (Synthea ingestion)
- Staging is deployed from clean migrations
- Production is never restored from dev/staging snapshots

---

## 6. Test plan (D5)

### Unit tests (primary)

**`kmsService.test.ts` (NEW, ~10 tests):**
- envelopeEncrypt happy path (production-mode mocked AWS SDK)
- envelopeEncrypt local-fallback (dev mode → localEncrypt)
- envelopeDecrypt happy path
- envelopeDecrypt with EncryptionContext mismatch → KMS rejects (mocked)
- envelopeDecrypt with KMS Decrypt failure (NetworkError, KeyNotFoundException, AccessDeniedException) → throw
- envelopeEncrypt accepts per-record context override (D6 parameterization)
- localEncrypt + localDecrypt round-trip
- getKeyInfo returns expected shape

**`keyRotation.test.ts` (additions, ~6 tests):**
- V2 round-trip via mocked kmsService (V2 emit → decryptAny V2 path → plaintext)
- V0+V1+V2 mixed-state batch decrypt (all three formats decrypt cleanly)
- encryptWithCurrent flag-flip: PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS set → V2 emit
- encryptWithCurrent flag-flip: PHI_ENVELOPE_VERSION unset → V1 emit (default)
- validateEnvelopeConfigOrThrow: PHI_ENVELOPE_VERSION=v2 without AWS_KMS_PHI_KEY_ALIAS throws at startup
- decryptAny V2 path always works regardless of PHI_ENVELOPE_VERSION flag (decrypt-not-gated principle)

**`envelopeFormat.test.ts`:** no changes needed; V2 build + parse already covered by existing 23 tests.

### Integration tests (gated, secondary per D5)

**`backend/tests/integration/audit016-pr2-kms-roundtrip.test.ts` (NEW, gated by `RUN_INTEGRATION_TESTS=1` AND AWS credentials):**
- Real KMS GenerateDataKey + Decrypt against sandbox key alias
- Round-trip plaintext → V2 envelope → plaintext via real AWS API
- EncryptionContext mismatch test against real KMS (verify CloudTrail-grade rejection)

Only runs when both env vars are set; default skip in CI.

### AUDIT-022 SQL filter compatibility

- Test in `envelopeFormat.test.ts` already verifies V2 envelope starts with `enc:` prefix (matches `enc:%` SQL filter from AUDIT-022 backfill script + verify-phi-legacy-json.js). No regression risk.

### Net jest count expectation

- Current baseline (post-PR #257): 483 tests
- New: ~10 kmsService + ~6 keyRotation + ~4 integration (gated)
- Expected post-PR 2: **~499 tests** (16 new running + 4 integration-gated)

---

## 7. Audit log entries

Per design doc §10 + AUDIT-076 boundary refinement pattern:

| Action | HIPAA-graded? | Trigger |
|---|---|---|
| `KMS_DEK_GENERATED` | best-effort | Successful kmsService.envelopeEncrypt call (V2 emit) |
| `KMS_DEK_UNWRAPPED` | best-effort | Successful kmsService.envelopeDecrypt call (V2 decrypt) |
| `KMS_KEY_VALIDATION_FAILURE` | **HIPAA-graded** | validateEnvelopeConfigOrThrow throws at module init OR runtime KMS call returns InvalidKey-class error |
| `KMS_ENVELOPE_DECRYPT_FAILURE` | **HIPAA-graded** | envelopeDecrypt throws (KMS rejection / EncryptionContext mismatch / network failure on decrypt path) |

**Promotion list** (extends `HIPAA_GRADE_ACTIONS` Set in `auditLogger.ts:77-95`): adds `KMS_KEY_VALIDATION_FAILURE` + `KMS_ENVELOPE_DECRYPT_FAILURE`. Sister to AUDIT-071's 4 promotions; AUDIT-076 partial closure continues.

**Best-effort actions are NOT thrown on DB write failure** — they're informational; the dual-transport file + Console JSON capture them regardless. This is the AUDIT-013 boundary policy.

---

## 8. Rollback path (D4 strict mode)

**Strict failure mode chosen:** KMS unreachable during V2 emission → `encryptWithCurrent` throws (no V1 fallback). The throw propagates to phiEncryption middleware → propagates to Prisma `$use` callback → propagates to the calling route → returns 500.

This is the AUDIT-013 fail-closed pattern. The alternative (graceful-degrade to V1) would create unobservable correctness drift: operators would not know V2 emission failed unless they actively monitor V2 vs V1 ciphertext counts.

**Rollback procedure:**
1. **Set `PHI_ENVELOPE_VERSION=v1`** (or unset entirely). On next deploy / Fargate task restart, V2 emission stops.
2. **Existing V2 ciphertext continues to decrypt** via `decryptAny` V2 case (decrypt-is-not-gated principle from §2). Production stays functional.
3. **V2 ciphertext is NOT auto-downgraded.** Operator decides via PR 3 migration job whether to back-migrate V2 → V1 (rare; usually V2 is forward direction).
4. **`git revert` clean** for emergency revert: PR 2 changes are additive (no schema migration; no irreversible state change). Reverting the commit + redeploying restores prior V1-only state.

**Risk if rollback executed mid-write:** an in-flight V2 emit request fails with 500 (per strict mode). Caller retries → V1 path executes. Brief latency blip; no data loss.

---

## 9. Effort breakdown (running estimate)

| Sub-task | Estimate |
|---|---|
| envelopeFormat.ts changes | 0h (already complete from PR 1) |
| keyRotation.ts: encryptWithCurrent V2 emission + decryptAny V2 case + validateEnvelopeConfigOrThrow + EnvelopeConfigError | ~1.5-2h |
| kmsService.ts: parameterize envelopeEncrypt + envelopeDecrypt to accept context arg (D6) | ~0.75-1h |
| phiEncryption.ts: plumb model + field through middleware | ~0.5-1h |
| auditLogger.ts: extend HIPAA_GRADE_ACTIONS Set per §7 | ~0.1h |
| Test authoring: kmsService.test.ts (NEW, ~10 tests) | ~1.5-2h |
| Test authoring: keyRotation.test.ts additions (~6 tests) | ~0.75-1h |
| Test authoring: integration test (gated) | ~0.5-0.75h |
| Documentation: this design note + AUDIT_016_KEY_ROTATION_DESIGN.md §10 update + register entry update | ~0.75-1h |
| BUILD_STATE.md ledger update (§1 Phase 2 row + §6 priority list re-rank + §9 closing prose) | ~0.25-0.5h |
| jest sanity + diff surface + commit/push/PR create | ~0.5h |
| Buffer for inventory expansion or unexpected friction | ~0.5-1h |
| **Total** | **~7-10h** |

Within design-doc revised band (5-8h was original; 7-10h reflects D7 in-scope expansion + bonus kmsService.test.ts closing pre-existing test gap).

If actual work exceeds 1.5x estimate (~15h) at any sub-task, surface re-scoping ask at next pause.

---

## 10. Cross-references

- `docs/architecture/AUDIT_016_KEY_ROTATION_DESIGN.md` (parent design doc; PR #252)
- AUDIT-016 PR 1 (PR #255): V0/V1/V2 schema + V1 emission + AUDIT-017 bundled
- AUDIT-013 (RESOLVED 2026-04-30): dual-transport audit logger; fail-closed pattern preserved
- AUDIT-022 PR #253: enc:% SQL filter compatibility (V2 still matches; verified in envelopeFormat tests)
- AUDIT-071 PR #257 (stacked-on): cdsHooks tenant isolation; this PR rebases onto main when #257 merges
- AUDIT-076 (partial closure): HIPAA_GRADE_ACTIONS boundary; this PR adds 2 more promotions (KMS_KEY_VALIDATION_FAILURE + KMS_ENVELOPE_DECRYPT_FAILURE)
- HIPAA Security Rule §164.312(a)(2)(iv) — addressable encryption/decryption implementation specification
- HIPAA §164.312(b) — audit controls (CloudTrail kms:Decrypt logging anchored by EncryptionContext)
- HIPAA §164.308(a)(1)(ii)(D) — Information System Activity Review
- NIST SP 800-57 Part 1 Rev 5 — Cryptoperiod guidance (180-day DEK basis preserved from parent design)
- NIST FIPS 197 — AES algorithm

---

## Operator decisions captured (D1-D7, all confirmed at PAUSE 1 — no further D-decisions for PAUSE 2)

| Decision | Operator confirmation |
|---|---|
| D1 | Both alias OR ARN (AWS SDK accepts both natively) |
| D2 | Per-record EncryptionContext: `{ service, purpose, model, field }` |
| D3 | Explicit env-var gating: `PHI_ENVELOPE_VERSION=v2` + `AWS_KMS_PHI_KEY_ALIAS` set |
| D4 | Strict fail-loud (no V1 fallback) — sister to AUDIT-013 |
| D5 | Unit tests primary (mocked AWS SDK) + integration tests gated |
| D6 | Parameterize `kmsService.envelopeEncrypt(plaintext, encryptionContext?)` with backwards-compat default |
| D7 | Per-record context propagation in scope for PR 2 (no defer) |

---

*Authored 2026-05-07 in branch `feat/audit-016-pr-2-v2-envelope-kms-wiring` (stacked on PR #257). PAUSE 2 ready: surface this note for final go-ahead before Phase C implementation.*
