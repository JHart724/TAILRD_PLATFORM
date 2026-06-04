# AUDIT-109 - Production error-logging observability: design note

- **Finding:** AUDIT-109 (HIGH P1, OPEN) - Production 500 error handler emits no exception/stack to CloudWatch; production failures are undiagnosable from logs.
- **Folded-in cleanup:** 4-OBS-02 (LOW P3, OPEN) - logger configuration hygiene: (a) CloudWatch silent-swallow branch, (b) `logAPI` / `logRedox` / `logAudit` dead helpers (zero adoption).
- **Phase:** authored as the Phase 2 design note; APPROVED at PAUSE 2 on 2026-06-04 with three refinements (header cleanup, test 8 stack-legibility, unconditional transport with a tunable level) folded in below.
- **Status:** APPROVED 2026-06-04; implemented on branch `audit-109-prod-error-logging` (Phase 3).
- **Author scope:** operational logger only (`backend/src/utils/logger.ts`) plus the single `auth.ts` login-catch stack addition. Operator-gated `backend/**` footprint per CLAUDE.md §19.4.

---

## 0. Root-cause restatement (canonical re-verification, 2026-06-04)

Re-verified on `main` before authoring. The register's location text ("the 500 handler ... does not write the caught exception/stack to the logger before responding") is imprecise; the precise root cause is a **missing production transport**, not a silent handler:

- `backend/src/server.ts:304-311` - the global Express error handler **already** logs `error.message` + `error.stack` + `path` + `method` + `ip` via `logger.error('Global error handler:', {...})`.
- `backend/src/routes/auth.ts:130-137` - the login catch logs **message only** (`logger.error('Login error:', { error: <message> })`), **no stack**.
- `backend/src/utils/logger.ts:53-110` - the operational `logger` has three **file** transports (`logs/error.log`, `logs/combined.log`, `logs/audit.log`) and adds a `Console` transport **only when `NODE_ENV !== 'production'`** (`:103`). In production there is **no stdout transport**, so every `logger.*` call - including the global handler's stack - writes to an ephemeral container file and **never reaches CloudWatch**.
- `backend/src/utils/logger.ts:112-127` - a CloudWatch branch gated on `process.env.AWS_CLOUDWATCH_GROUP` AND `require('winston-cloudwatch')`. `winston-cloudwatch` is **not in `backend/package.json`** (only `"winston": "^3.11.0"`) and `AWS_CLOUDWATCH_GROUP` is set nowhere operationally (appears only in `logger.ts` itself and `backend/DEPLOYMENT.md`). The branch is dead; its `catch` emits a single `console.warn` and degrades to file-only with no operator signal.

**Consequence proven by AUDIT-108:** the login 500 produced no CloudWatch error line; root-causing required a live operator probe + source reading. The 401 `LOGIN_FAILED` *was* visible because `auditLogger` (`backend/src/middleware/auditLogger.ts:64-70`) ships an **unconditional** `Console` JSON transport (AUDIT-013). The operational logger lacks that mirror. This note adds it.

---

## 1. Approach

Add a **production stdout `Console` JSON transport** to the operational `logger`, mirroring the AUDIT-013 `auditLogger` pattern:

- **No new dependency:** uses `winston.transports.Console` (already available via `winston@^3.11.0`). Does not add `winston-cloudwatch`.
- **Unconditional presence, no gating env var:** the transport is constructed every time the logger module loads - not gated on `NODE_ENV` and not on `AWS_CLOUDWATCH_GROUP`. Only its verbosity is tunable, via `LOG_STDOUT_LEVEL` (default `'warn'`). See §2.1 for the gate-vs-tune rationale. This is the structural guarantee that the silent-absence failure mode cannot recur.
- **Sink path:** the ECS task definition's `awslogs` log driver captures container stdout into CloudWatch Logs group `/ecs/tailrd-production-backend` (confirmed in `docs/MIGRATION_VALIDATION_RUNBOOK.md:59`, `docs/DAY_10_WEDNESDAY_RUNBOOK.md`, `docs/RDS_BASELINE_POST_REBOOT_2026_04_21.md:122`). Flow: `logger.error(...)` -> stdout JSON line -> awslogs driver -> `/ecs/tailrd-production-backend`. No infrastructure change required; the awslogs driver is already wired on the running task definition (`tailrd-backend:252`).
- **Existing file transports unchanged:** the new stdout transport is **additive**. `error.log` / `combined.log` / `audit.log` retain their current behavior and dev ergonomics. The dev-only Console transport at `:103` is unchanged (dev keeps colorized `simple()` output; production gets JSON stdout).

**Folded 4-OBS-02 cleanup (Q2):**
- Remove the dead `winston-cloudwatch` branch (`logger.ts:112-127`) entirely. Rationale: it cannot fire (package absent, env-var unset), its `console.warn` swallow is the silent-degradation hazard the finding names, and the new env-var-free stdout transport supersedes its intent.
- Remove the dead `logAPI` / `logRedox` / `logAudit` helper exports (`logger.ts:129-218`). Verified zero adoption: a repo-wide search for `\b(logAPI|logRedox|logAudit)\b` across `backend/src` returns **only** `logger.ts` (the definitions). They are dead code; raw `logger.info` / `logger.error` predominate (476 call sites per the Phase 4 finding). Removing them reduces the redaction surface (no second redaction code path to keep correct) and is a precondition for a clean single-format redaction design (§3).
- After the cleanup, flip 4-OBS-02 to RESOLVED with a status note in the register, recording that part (b) is closed by removal (not adoption) and part (a) is closed by the env-var-free transport.

---

## 2. Stdout transport: unconditional presence, tunable level

### 2.1 Gate vs tune (PAUSE-2 refinement 3)

The transport is constructed **unconditionally** - it is **not** gated on any environment variable or on `NODE_ENV`. Presence is invariant: whenever the service process runs, the operational logger has a stdout `Console` JSON transport. This is the structural fix for the AUDIT-109 / 4-OBS-02(a) failure mode - a transport whose *presence* depends on config (`AWS_CLOUDWATCH_GROUP`) can silently be absent, and was. Removing the gate makes that recurrence impossible.

Only the **verbosity** is configurable, via a new env var **`LOG_STDOUT_LEVEL`** read at logger construction, **defaulting in code to `'warn'`** when unset or empty. The gate-vs-tune distinction is deliberate:
- The transport always exists -> the silent-absence class of bug cannot recur.
- An incident-time widen-to-`info` (e.g. to capture request/response context during a live investigation) is a **task-definition env change** (`LOG_STDOUT_LEVEL=info`), not a code PR + build + deploy cycle. Verbosity is operationally tunable; presence is not.

In non-production, the existing dev-only colorized Console transport (`logger.ts:103`) is retained as-is for developer ergonomics; the new JSON stdout transport is additive and also present in dev (harmless - dev stdout is the terminal). The two coexist; only the format differs (colorized `simple()` for the human-facing dev transport, `json()` for the machine/CloudWatch-facing transport).

### 2.2 Default level rationale (`'warn'`)

CloudWatch ingestion-volume tradeoff:
- The operational logger carries 476 `logger.*` calls; the high-volume class is `info`-level API request/response logging and ad-hoc info logs. Shipping `info` to stdout by default would route every request/response into CloudWatch, driving ingestion volume and cost with content that 4-OBS-01 (requestId correlation, deferred) is the right vehicle for, not this finding.
- AUDIT-109 is strictly about **diagnosing failures**: 500s and their stacks. Default `'warn'` captures `error` (the global handler, the auth catch, `unhandledRejection` / `uncaughtException`) **and** `warn` (operational anomalies worth surfacing) while **excluding** the `info`-level request/response firehose by default.
- The existing **file** transports keep `info` (and the dedicated `audit.log` keeps its HIPAA stream) for local/offline review, so no information is lost on the container - only the default CloudWatch-bound stdout copy is volume-trimmed.

Documented tuning points (via `LOG_STDOUT_LEVEL`, no code change):
- `error` - stricter, minimal volume; drops `warn`-level anomaly signal. Acceptable if `warn` volume proves noisy.
- `info` - incident-time widen to capture request/response context; revert after. Long-term structured request tracing belongs to 4-OBS-01.

The level is set explicitly on the transport (not inherited from the logger's top-level `level`), so the file transports and the stdout transport diverge independently.

---

## 3. Redaction design

A new winston **format** runs `redactPHIFragments` over free-form string values, applied to the operational logger so the stdout (CloudWatch-bound) copy is PHI-safe. This complements - does not replace - the existing `excludeSensitiveData` format.

### 3.1 Why a second redaction layer is needed

`logger.ts:12-50 excludeSensitiveData` redacts by **field NAME** (20 sensitive key names: `ssn`, `dob`, `mrn`, `firstName`, `lastName`, `name`, etc.). It does **not** match the keys `error`, `stack`, or `message`, so a PHI fragment embedded **inside a stack or message string** (e.g. a FHIR-bundle parse error `"... patient John Smith ..."`) passes through unredacted. `redactPHIFragments` redacts by **content PATTERN** on arbitrary strings (SSN / MRN / EMAIL / PHONE, plus NAME in AGGRESSIVE). The two are orthogonal and layered (defense in depth), exactly as `phiRedaction.ts:25-29` already documents the sister-discipline relationship.

### 3.2 What the format walks

- Top-level `message` (string).
- The string values most likely to carry a leaked fragment: `message`, `stack`, `error` (when `error` is a string).
- Non-string `meta` values: recursively walk objects/arrays applying redaction to **string leaves only**, with a **depth limit** (proposed: 4 levels) to bound cost and avoid pathological deep/cyclic structures. Beyond the depth limit, a string leaf is replaced with a fixed placeholder (`[REDACTION-DEPTH-LIMIT]`) rather than emitted raw. Non-string non-walkable leaves (numbers, booleans) pass through unchanged.
- Internal UUID fields (`userId`, `hospitalId`) are explicitly **allowed** (CLAUDE.md §14) and are not name-matched as PHI; the content patterns do not match bare UUIDs, so they survive intact.

### 3.3 FAIL-CLOSED semantics

Per the AUDIT-016 / AUDIT-075 fail-loud-at-config but fail-closed-at-runtime posture, and because this format runs **on the error path / request path** where a thrown format would break logging itself:

- Each `redactPHIFragments` call is wrapped in `try/catch`.
- On **any** redaction error, the offending value is replaced with a fixed placeholder (`[REDACTION-ERROR]`) - **never** the raw value, **never** a partial, and the format **never re-throws**. A redaction failure must not turn a loggable error into an unhandled exception reaching the request/response cycle.
- This is the inverse of `redactPHIFragments`'s own `PhiRedactionError` throw-on-non-string contract: the format catches that throw and degrades closed. (The format only ever passes strings to `redactPHIFragments`, so the throw is a belt-and-suspenders guard, not an expected path.)

### 3.4 CONSERVATIVE vs AGGRESSIVE - explicit per-layer choice

The patient-name-in-error-path risk (the AUDIT-109 motivating case: a clinical/FHIR error string carrying a patient name) is the reason the NAME pattern matters. Decision, stated per application layer:

| Layer (field class) | Mode | Rationale |
|---|---|---|
| Error-context strings: `message`, `stack`, `error` | **AGGRESSIVE** | These are where clinical/FHIR parse errors surface `"patient <First> <Last>"`. NAME pattern (`phiRedaction.ts:136-147`) is required to catch it. AGGRESSIVE's only documented FP is dev-fixture placeholder names ("patient John Doe"), which is acceptable. |
| Other `meta` string leaves | **CONSERVATIVE** | General operational debug content; CONSERVATIVE's 4 patterns (SSN/MRN/EMAIL/PHONE) are the LOW-FP-risk set per `phiRedaction.ts:90-94`. Applying NAME broadly would raise FP on ordinary `"Word Word"` operational text without a `patient` anchor. (The NAME pattern is `patient`-anchored, so the marginal risk is low either way, but the explicit split keeps the broad surface on the documented low-FP set.) |

The DOB pattern remains **out** of both sets (removed 2026-05-07 per `phiRedaction.ts:17-23` / `:125-135` near-100% FP on ISO timestamps); structured DOB is covered by field-level encryption. No change here.

This split is testable directly: a PHI-bearing throw whose stack contains a name must redact (AGGRESSIVE on `stack`); the same name appearing only in a non-anchored generic meta string is governed by CONSERVATIVE (NAME not applied) - both asserted in the test plan (§6).

---

## 4. Structured record shape and the never-appears list

### 4.1 Emitted JSON shape (stdout / CloudWatch)

Inherited from the logger's existing format chain (`timestamp()`, `errors({ stack: true })`, then the two redaction formats, then `json()`), plus `defaultMeta`. A representative redacted error record:

```json
{
  "level": "error",
  "message": "Global error handler:",
  "timestamp": "2026-06-04T15:22:01.244Z",
  "service": "tailrd-backend",
  "version": "1.0.0",
  "environment": "production",
  "error": "PHI decryption: unencrypted value found in encrypted-field column User.firstName",
  "stack": "Error: PHI decryption: unencrypted value found ...\n    at decrypt (.../phiEncryption.ts:185) ...",
  "path": "/api/auth/login",
  "method": "POST",
  "ip": "<client-ip>"
}
```

- `service` distinguishes operational (`tailrd-backend`) from audit (`tailrd-audit`) records sharing the same stdout sink (§5).
- `requestId` is intentionally **absent** (deferred to 4-OBS-01; §4.3).

### 4.2 Never-appears-in-a-log list (PHI per CLAUDE.md §14)

The following must never appear in any operational log line; the layered redaction (field-name `excludeSensitiveData` + content-pattern format) enforces this:

- Patient name (first / last / full)
- MRN / medical record number
- DOB / date of birth
- Address (street / city / state / ZIP)
- Email, phone number
- SSN
- Any direct patient identifier other than the internal patient UUID

**Allowed** (explicitly, per CLAUDE.md §14): internal `userId` and `hospitalId` UUIDs, internal patient UUID, role, action, resourceType, HTTP method/path/status, IP address, timestamps. These are operational identifiers, not PHI.

### 4.3 requestId correlation - deferred

Per Q3 PAUSE-1 decision, requestId/trace correlation is **out of scope** for AUDIT-109 and cross-referenced to **4-OBS-01** (correlation/trace-ID propagation gap, MEDIUM P2, OPEN). The record shape leaves room for a future `requestId` field; no AsyncLocalStorage plumbing is added here. The AUDIT-109 register status note will record this deferral with the 4-OBS-01 cross-ref.

---

## 5. Operational-vs-audit separation

The operational `logger` and the `auditLogger` remain **separate logger instances** with **separate responsibilities**:

- The operational path does **not** route through `writeAuditLog` and does **not** call `auditLogger`. An operational error never becomes an audit event, and an audit event is never duplicated into the operational error stream.
- The two are distinguished logically by `defaultMeta.service` (`tailrd-backend` vs `tailrd-audit`) and by being produced by different `winston.createLogger` instances with different format chains and retention semantics (audit = 6-year HIPAA retention via DailyRotateFile; operational = 10MB rotating files + the new stdout copy).
- **Physical sink overlap is expected and acceptable:** both the operational stdout transport (new) and the `auditLogger` Console transport (existing, AUDIT-013) write to the **same ECS task stdout**, hence the **same** `/ecs/tailrd-production-backend` awslogs group. This is not a coupling - it is two independent producers sharing the container's stdout, disambiguated by `service`. No audit-specific log group or `writeAuditLog` invocation is introduced by this change.

---

## 6. Rollback path and test plan

### 6.1 Rollback

Low blast radius, single-revert:
- All operational-logger changes (new prod stdout transport + redaction format + dead-branch/dead-helper removal) live in **`backend/src/utils/logger.ts`**.
- The only other touched file is **`backend/src/routes/auth.ts`** (one-line: login catch gains `stack` in its `logger.error` payload, for parity with the global handler).
- Rollback = `git revert` of the PR (restores prior `logger.ts` + `auth.ts`). The new stdout transport is additive (no change to existing file transports), so reverting cannot regress existing logging; it only removes the CloudWatch-bound copy and the redaction format and restores the dead branch/helpers.
- No infrastructure / task-definition change to roll back (awslogs driver already present).

### 6.2 Test plan

New unit tests (proposed `backend/src/utils/__tests__/logger.test.ts`), each asserting on captured transport output:

1. **Prod-env transport presence** - with `NODE_ENV='production'`, the operational logger exposes a `Console` (stdout) transport at `level: 'warn'`; with `NODE_ENV !== 'production'`, it does not add the prod stdout transport (the dev colorized Console path is unaffected). Guards the core regression: prod currently has no stdout transport.
2. **Happy path** - a clean `logger.error` with non-PHI content emits well-formed JSON with `message` + `stack` + meta intact and **no** redaction placeholders (proves redaction does not corrupt clean content).
3. **Generic error** - `logger.error('x', { error: err.message, stack: err.stack })` with a plain `Error` emits a JSON line carrying both `error` and `stack`.
4. **PHI-bearing throw (message AND stack)** - an `Error` whose **message and stack** contain a patient name (and, in a CONSERVATIVE-class variant, an SSN/MRN/email) is logged; assert the name is `[REDACTED-NAME]` in **both** `message` and `stack` (AGGRESSIVE on error-context fields), and the SSN/MRN/email are redacted by the CONSERVATIVE set. This is the central AUDIT-109 proof.
5. **Non-Error throw** - logging a thrown string and a thrown plain object does not crash the format, produces a valid line, and redacts any PHI fragment in the stringified value.
6. **Redaction-failure fail-closed** - mock `redactPHIFragments` to throw; assert the affected value is replaced with `[REDACTION-ERROR]`, the raw value is **absent** from output, and **no error propagates** out of the log call (the format does not throw).
7. **auth.ts login-catch stack assertion** - after the one-line change, the login catch payload includes a `stack` field (currently message-only); assert it is present and that a PHI fragment seeded into the stack is redacted end-to-end. Co-locate with an `auth.ts` route test or assert via the logger spy.
8. **Stack legibility under AGGRESSIVE redaction** - a representative multi-frame stack trace containing class/method identifiers such as `PatientService.findByName`, `getPatientByMrn`, and file paths (e.g. `.../services/patientService.ts:142`) passes through error-context (AGGRESSIVE) redaction with **frames still resolvable**: assert the method/class identifiers and file:line frames survive intact and are NOT collapsed into `[REDACTED-NAME]` or any placeholder. This proves the NAME pattern (`patient`-anchored `patient[:\s]+First Last`) does not shred camelCase/dotted code identifiers - a stack that is redacted into illegibility would defeat the entire finding. Pair with a positive control in the same test: an actual `"patient Jane Roe"` fragment in the same stack string IS redacted, confirming redaction is active, not disabled.

Manual/CI confirmation (operator-side, post-merge, per the register status note): a synthetic 500 on production produces a redacted stack line in `/ecs/tailrd-production-backend` (the AUDIT-109 RESOLVED gate).

---

## 7. Cross-references

- Finding: `docs/audit/AUDIT_FINDINGS_REGISTER.md` AUDIT-109 (HIGH P1) and 4-OBS-02 / 4-OBS-01 in `docs/audit/PHASE_4_REPORT.md` §3.1.
- Motivating outage: AUDIT-108 (the 500 whose stack was unavailable in CloudWatch).
- Redaction utility: `backend/src/utils/phiRedaction.ts` (AUDIT-075) and `docs/architecture/AUDIT_075_PHI_ENCRYPTION_COVERAGE_NOTES.md`.
- Structural reference: `backend/src/middleware/auditLogger.ts:48-74` (AUDIT-013 dual-transport: file + unconditional Console JSON).
- Policy: CLAUDE.md §14 (never leave PHI in logs; internal UUIDs allowed) and §16 (production incident history).
- Deferred correlation work: 4-OBS-01 (requestId/trace propagation).
