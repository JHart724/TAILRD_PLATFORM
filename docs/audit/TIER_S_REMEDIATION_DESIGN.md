# Tier S Remediation Design Doc

**Branch:** `fix/tier-s-remediation`
**Author:** jhart
**Date:** 2026-04-29
**Companion:** `docs/audit/PHASE_2_REPORT.md` §6 (Tiered remediation roadmap)
**Spec source:** `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` for PHI route surface decisions

---

## Purpose

Sequenced remediation of the 4 Phase 2 audit Tier S findings. Each finding is implemented as a discrete code change with smoke-test verification before moving to the next. Sequencing is by blast radius: lowest first.

| Order | Finding | Risk | Estimated effort |
|-------|---------|------|------------------|
| 1 | AUDIT-015 (`decrypt()` fail-loud) | Lowest — only affects failure path; success path unchanged | S (2-4h) |
| 2 | AUDIT-013 (audit log durability) | Low — transport swap; writes still happen, just durable | M (4-8h) |
| 3 | AUDIT-009 (MFA enforcement gate) | Medium — flag-controlled rollout; default false in production | M (8-16h) |
| 4 | AUDIT-011 (tenant isolation) | Highest — every PHI request flows through this; failure = data exposure | L (16-24h) |

**Bundling:** Findings 1-3 ship in batch 1 (this PR). Finding 4 ships post-Day-11 in batch 2 to isolate its blast radius from the decommission window.

**Day 11 fence:** Tier S work is paused at the end of batch 1 to wait for the 24h decom window to clear (~01:05Z 2026-04-30), then Day 11 RDS decommission happens (Phase 95), then batch 2 (AUDIT-011) runs.

---

## Spec data informing the design (CK v4.0)

CK v4.0 §6.1-§6.7 tags every gap with PHI/Non-PHI. The PV section §6.6 is uniformly tagged "Non-PHI" — the gap detection logic operates on de-identified data per BSW Safe Harbor framing. **However:**

- The application running this platform serves PHI to logged-in clinicians (patient charts, encounters, observations, medications). 
- Routes returning patient-identifying data ARE PHI-bearing regardless of how the spec frames the gap data extraction.
- For MFA enforcement, the relevant axis is "does this route return identifiable patient data?" — answer: yes for `/api/patients/*`, `/api/encounters/*`, `/api/observations/*`, `/api/orders/*`, `/api/medications/*`, `/api/conditions/*`, `/api/alerts/*`, `/api/care-plans/*`, etc.
- Aggregate dashboards (`/api/modules/*/dashboard`) return cohort metrics — also PHI-derived even if aggregated.

**Conclusion:** all authenticated routes serving any patient-derived data require MFA. CK v4.0's PHI tagging informs scoping decisions for downstream Tier B work (`AuditLog.description` PHI risk, FailedFhirBundle PHI fragments) but does not change today's Tier S scope.

---

## Finding 1 — AUDIT-015: `decrypt()` fail-loud on integrity failure

### Current behavior

`backend/src/middleware/phiEncryption.ts:88-101`:
```ts
try {
  const [, ivHex, authTagHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !authTagHex || !encrypted) return encryptedText;
  // ... AES-GCM decrypt ...
  return decrypted;
} catch {
  return encryptedText; // Return as-is if decryption fails (might be plaintext)
}
```

A malformed format or AES-GCM auth-tag mismatch silently returns ciphertext upstream. Operators can't distinguish "tampering" from "legitimate plaintext leftover from pre-encryption migration" — both fall through.

### Target behavior

Throw on any AES-GCM auth-tag failure (real integrity signal). Add an explicit env flag for the legacy-data path so dev/migration scenarios remain workable.

```ts
const ALLOW_LEGACY_PLAINTEXT = process.env.PHI_LEGACY_PLAINTEXT_OK === 'true';

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    if (!isDemoMode) {
      throw new Error('FATAL: PHI_ENCRYPTION_KEY required outside demo mode');
    }
    return encryptedText;
  }

  // No prefix → legacy plaintext (pre-encryption-rollout data)
  if (!encryptedText.startsWith('enc:')) {
    if (ALLOW_LEGACY_PLAINTEXT || isDemoMode) {
      return encryptedText;
    }
    throw new Error('PHI decryption: unencrypted value found in encrypted-field column');
  }

  const [, ivHex, authTagHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('PHI decryption: malformed ciphertext format');
  }

  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8'); // throws on auth-tag mismatch
  return decrypted;
}
```

### Backward compat / migration considerations

- `PHI_LEGACY_PLAINTEXT_OK` env defaults `false` in production
- Any pre-encryption legacy plaintext rows would now throw on read in production. Risk: if such rows exist in production Aurora, they'd cause 500s.
- **Mitigation:** before deploying, run a one-off Fargate query to confirm no plaintext-shaped values exist in PHI-encrypted columns. If found, flip `PHI_LEGACY_PLAINTEXT_OK=true` in the deploy ENV temporarily, run a backfill to encrypt them, then flip back.
- **For this PR:** verify-only via Fargate query; if any rows found, document and defer the throw-on-legacy default to a follow-up PR with the backfill.

### Test plan

Unit tests in `backend/src/middleware/__tests__/phiEncryption.test.ts`:
1. **Valid ciphertext decrypts correctly** — encrypt('hello') → decrypt → 'hello'
2. **Tampered ciphertext throws** — flip a bit in the auth tag, expect throw with message containing 'integrity'
3. **Tampered ciphertext throws** — flip a bit in the IV, expect throw
4. **Malformed format throws** — `enc:foo` (missing parts), expect throw with 'malformed'
5. **Plaintext (no prefix) with `PHI_LEGACY_PLAINTEXT_OK=true` passes through** — return value matches input
6. **Plaintext (no prefix) without flag throws** — expect throw with 'unencrypted'
7. **Empty/null** — handle gracefully (no throw, return as-is for null/undefined)

### Rollback plan

Revert the catch-block change. The `try/catch` returning `encryptedText` was the original behavior; reverting restores it.

### Risk assessment

- **Low risk** for the success path: encrypted-then-decrypted round-trip is unchanged
- **Medium risk** for legacy data: if pre-encryption rows exist, they'd throw. Pre-deploy Fargate query mitigates.
- **Low risk** for tampering scenarios: tamper would have failed silently before; now fails loud. That's the desired behavior.

### CK v4.0 cross-reference

Does not change. Encryption is field-level; the spec's PHI/Non-PHI tagging is at the gap-data-extraction level. Both are layers below the application.

---

## Finding 2 — AUDIT-013: Audit log durability via CloudWatch

### Current behavior

`backend/src/middleware/auditLogger.ts:8, 24-38`:

Winston writes to local file system (DailyRotateFile or fallback File transport). ECS Fargate ephemeral storage means audit log records can disappear when a task is replaced.

### Target behavior

Two changes:

1. **Add stdout-JSON transport** (in addition to file). ECS `awslogs` log driver captures stdout to CloudWatch Logs automatically. CloudWatch is durable, queryable, and HIPAA-eligible. No new dependency needed.
2. **Make DB write throw on failure** for HIPAA-grade events (LOGIN_FAILED, LOGIN_SUCCESS, LOGOUT, anything tagged `phi: true`). Caller can catch and degrade safely (return 500 with explicit "audit unavailable" rather than silently succeed).

```ts
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'tailrd-audit' },
  transports: [
    auditTransport,                          // existing file transport (dev convenience)
    new winston.transports.Console({         // new — captured by CloudWatch in ECS
      format: winston.format.json(),
      level: 'info',
    }),
  ],
  exitOnError: false,
});
```

For the DB-write-throws-on-HIPAA-grade change:

```ts
// Existing: best-effort, doesn't throw
try {
  await prisma.auditLog.create({...});
} catch (dbError) {
  auditLogger.error('audit_db_write_failed', {...});
}

// New: throw for HIPAA-grade events
const HIPAA_GRADE_ACTIONS = new Set([
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PHI_VIEW', 'PHI_EXPORT',
  'PATIENT_CREATED', 'PATIENT_UPDATED', 'PATIENT_DELETED',
  'BREACH_DATA_ACCESSED', 'BREACH_DATA_MODIFIED',
]);

try {
  await prisma.auditLog.create({...});
} catch (dbError) {
  auditLogger.error('audit_db_write_failed', {...});
  if (HIPAA_GRADE_ACTIONS.has(action)) {
    throw new Error(`Audit DB write failed for HIPAA-grade event: ${action}`);
  }
}
```

### Backward compat

- File transport retained — local dev still gets `logs/audit-YYYY-MM-DD.log` for ergonomics.
- Console transport added — production CloudWatch capture.
- DB write throws only for HIPAA-grade events. Non-HIPAA events (e.g., HOSPITAL_UPDATED metadata changes) remain best-effort.
- Caller routes need to handle the throw. Login route already returns 500 on outer try/catch; behavior unchanged for it. Other callers verified.

### Test plan

1. Unit test: writeAuditLog with HIPAA-grade action + simulated DB failure → throws
2. Unit test: writeAuditLog with non-HIPAA action + simulated DB failure → does NOT throw, logs error to file
3. Integration: stdout-JSON transport captures audit events as JSON-parseable lines (manual verification post-deploy via CloudWatch Logs Insights)

### Rollback plan

Remove the Console transport (revert to file-only) and remove the HIPAA_GRADE_ACTIONS throw block.

### Risk assessment

- **Low risk** on success path: dual writes (file + stdout) only add capacity, don't change semantics
- **Medium risk** on HIPAA-grade DB-failure path: previously silent, now throws. If Aurora has a transient blip during a login, login returns 500. Acceptable per HIPAA §164.312(b) (better fail-loud than silent).
- **No PHI exposure risk** introduced.

### CK v4.0 cross-reference

CK v4.0 doesn't directly affect this. The HIPAA_GRADE_ACTIONS set is a mapping from application action → HIPAA classification, derived from §164.312(b). Future work to expand this set could reference CK v4.0's PHI tagging at the route level once we have route-to-gap mapping.

---

## Finding 3 — AUDIT-009: MFA enforcement gate (flag-controlled)

### Current behavior

`backend/src/middleware/auth.ts:221-250`:

`requireMFA` only enforces if user has MFA enabled. Default-off — a user can have only password auth and access PHI routes. Wired globally at `server.ts:249`.

### Target behavior

Add an `MFA_ENFORCED` env flag. When enabled, the middleware:

1. If user role is `DEMO`: no enforcement (existing behavior)
2. If user is SUPER_ADMIN or HOSPITAL_ADMIN and has no MFA enrollment: 403 with redirect hint to `/mfa/setup`
3. If user has MFA enabled but JWT lacks `mfaVerified=true`: 403 with redirect hint to `/mfa/verify` (existing)
4. Otherwise: pass through (existing)

```ts
const MFA_ENFORCED = process.env.MFA_ENFORCED === 'true';
const MFA_ENFORCED_ROLES = new Set(['SUPER_ADMIN', 'HOSPITAL_ADMIN']);

const requireMFA = async (req, res, next) => {
  if (isDemoMode) return next();

  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    return res.status(401).json({...});
  }

  const mfaRecord = await prisma.userMFA.findUnique({
    where: { userId: user.userId },
    select: { enabled: true },
  });

  // New: when MFA_ENFORCED=true, force enrollment for HIPAA-relevant roles
  if (MFA_ENFORCED && MFA_ENFORCED_ROLES.has(user.role) && !mfaRecord?.enabled) {
    return res.status(403).json({
      success: false,
      error: 'MFA enrollment required for your role. Please complete setup at /mfa/setup.',
      requiresMfaEnrollment: true,
      timestamp: new Date().toISOString(),
    });
  }

  // Existing: if MFA is enabled but token lacks verification
  if (mfaRecord?.enabled && !user.mfaVerified) {
    return res.status(403).json({
      success: false,
      error: 'MFA verification required. Please complete /mfa/verify.',
      requiresMfaVerification: true,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};
```

### Pre-existing infrastructure (verified)

- `routes/mfa.ts:13` — POST /mfa/setup ✓
- `routes/mfa.ts:40` — POST /mfa/verify-setup ✓
- `routes/mfa.ts:74` — POST /mfa/verify ✓
- `routes/mfa.ts:137` — POST /mfa/verify-backup ✓
- `routes/mfa.ts:200` — GET /mfa/status ✓
- `routes/mfa.ts:213` — DELETE /mfa/disable ✓

The /mfa flow exists. AUDIT-009 doesn't need to build it; it just enforces use of it.

### Rollout discipline

- Production deploy ships with `MFA_ENFORCED=false` default (no enforcement change)
- Staging deploy can flip to `true` immediately to exercise the enforcement path
- Production flag-flip happens in a future controlled rollout requiring:
  1. All existing SUPER_ADMIN + HOSPITAL_ADMIN users notified of MFA enrollment requirement
  2. All those users enrolled (out-of-band ops work)
  3. Migration runbook documenting the rollout
  4. Smoke test post-flip confirming enforcement works as designed

This PR ships the code; a separate PR/runbook ships the rollout.

### Test plan

1. Unit test (in `auth.test.ts`): `requireMFA` with `MFA_ENFORCED=true` + SUPER_ADMIN user without MFA enrollment → 403 with `requiresMfaEnrollment: true`
2. Unit test: same with PHYSICIAN role → passes (not in MFA_ENFORCED_ROLES)
3. Unit test: same with MFA enrolled but mfaVerified=false → 403 with `requiresMfaVerification: true`
4. Unit test: same with MFA enrolled + mfaVerified=true → passes
5. Unit test: `MFA_ENFORCED=false` → all enrollment scenarios pass (legacy behavior)
6. Smoke test in dev: set `MFA_ENFORCED=true`, log in as SUPER_ADMIN with no MFA → 403; enroll via /mfa/setup; verify; access patient list

### Rollback plan

Set `MFA_ENFORCED=false` in production env. The code change is no-op when flag is off.

### Risk assessment

- **Low risk** with `MFA_ENFORCED=false` default — code is dormant in production
- **Higher risk** when staging flips to true: validates the flow but staging has only operator account; need to ensure operator's MFA is enrolled in staging before enabling
- **Production rollout** is the high-risk moment, controlled by separate runbook

### CK v4.0 cross-reference

CK v4.0 informs which user roles require MFA. SUPER_ADMIN sees all PHI cross-tenant. HOSPITAL_ADMIN sees all hospital-scoped PHI. Both must be MFA-enrolled. Lower roles (PHYSICIAN, NURSE_MANAGER, etc.) also serve PHI routes; should they also be in MFA_ENFORCED_ROLES?

**Decision:** start with SUPER_ADMIN + HOSPITAL_ADMIN. Lower roles get added in a follow-up after the initial rollout proves clean. HIPAA expects MFA for any account with PHI access (§164.312(d)) but a phased rollout is operationally pragmatic.

---

## Finding 4 — AUDIT-011: Tenant isolation (post-Day-11, batch 2)

**Deferred to batch 2 post-Day-11.** Design specifics:

### Current behavior

`backend/src/middleware/auth.ts:121-126`:
```ts
if (!hospitalId) {
  return next();  // Silent no-op
}
```

Plus: no `authorizeHospital` applied to `routes/patients.ts` at all.

### Target behavior

1. **Make middleware fail-loud** when applied without hospitalId in URL:
   ```ts
   if (!hospitalId) {
     // Per-route discipline: routes that legitimately don't expose hospitalId in URL
     // must opt-in via req.requireHospitalIdSkip = true (e.g., /api/auth/login)
     if ((req as any).requireHospitalIdSkip) return next();
     return res.status(500).json({
       success: false,
       error: 'authorizeHospital invoked on route without hospitalId param. Bug or misconfiguration.',
     });
   }
   ```

2. **New middleware `enforceHospitalScope()`** for PHI routes:
   ```ts
   const enforceHospitalScope = (req, res, next) => {
     if (isDemoMode) return next();
     if (!req.user?.hospitalId) {
       return res.status(403).json({
         success: false,
         error: 'Authentication missing hospital scope.',
       });
     }
     // Attach a discoverable scope filter for handlers
     (req as any).hospitalScopeFilter = { hospitalId: req.user.hospitalId };
     next();
   };
   ```

3. **Apply to PHI routes:**
   - `routes/patients.ts` (all routes)
   - `routes/encounters.ts` (if exists)
   - `routes/observations.ts` (if exists)
   - All routes in `routes/modules.ts` returning patient data

4. **Integration tests:**
   - Cross-tenant access attempt with forged JWT (hospitalId mismatch) → 403
   - Same-hospital access → 200
   - Missing hospitalId in JWT → 403

### Why batch 2

- Highest blast radius of the 4 findings
- Bug here = production-data-access broken, requiring rollback
- Smoke test after each change is critical
- Sequencing post-Day-11 means we have a stable platform to test against (no concurrent decom timing pressure)

---

## Cross-finding considerations

### Sequencing dependencies

- AUDIT-015 → AUDIT-013: independent
- AUDIT-013 → AUDIT-009: independent
- AUDIT-009 → AUDIT-011: somewhat related (both auth middleware) but independent code paths

### Smoke-test gate after each finding

Per the user's authorized sequence: smoke test passes → continue to next finding. Smoke test = `npm test` clean + manual login flow + patient list access.

### Production deploy strategy

- Batch 1 (AUDIT-015, 013, 009) deploys via normal CI/CD pipeline (PR merge → ECR push → ECS rolling deploy)
- AUDIT-009's `MFA_ENFORCED=false` ensures no production behavior change today
- Batch 2 (AUDIT-011) deploys post-Day-11 with same pipeline + integration test gate

### Findings register update

After each batch lands:
- Update `docs/audit/AUDIT_FINDINGS_REGISTER.md` to mark resolved findings
- Update `docs/audit/PHASE_2_REPORT.md` verdict section to note Tier S progress

---

## Risk assessment summary

| Finding | Production risk on merge | Rollback ease |
|---------|-------------------------|---------------|
| AUDIT-015 | Low (legacy plaintext mitigated by pre-deploy query) | Easy (revert single function) |
| AUDIT-013 | Low (additive transport + selective throw) | Easy (revert) |
| AUDIT-009 | Zero with `MFA_ENFORCED=false` default | Trivial (env flip) |
| AUDIT-011 | Medium-high (every PHI request) | Moderate (revert middleware applications) |

**Net assessment:** batch 1 (AUDIT-015 + 013 + 009) is safely deployable in a single PR with smoke-test discipline. Batch 2 (AUDIT-011) deserves its own PR with integration tests + isolated deploy.

---

## Cross-references

- `docs/audit/PHASE_2_REPORT.md` §6 — Tier S remediation roadmap
- `docs/audit/PHASE_2_PHI_FIELD_MAP.md` — PHI field inventory informs encryption-layer changes
- `docs/clinical/CLINICAL_KNOWLEDGE_BASE_v4.0.md` — PHI/Non-PHI tagging informs MFA scope
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` — will be updated with RESOLVED status post-implementation
- `backend/src/middleware/auth.ts` — primary target for AUDIT-009, AUDIT-011
- `backend/src/middleware/phiEncryption.ts` — primary target for AUDIT-015
- `backend/src/middleware/auditLogger.ts` — primary target for AUDIT-013
- `backend/src/routes/patients.ts` — primary target for AUDIT-011 application

---

*Reviewed and authorized 2026-04-29. Implementation begins with AUDIT-015 (lowest risk).*
