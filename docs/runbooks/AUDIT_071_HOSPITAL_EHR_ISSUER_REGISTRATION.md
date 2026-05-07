# AUDIT-071 — Hospital EHR Issuer Registration Runbook

**Status:** Operator-ready
**Owner:** Security / Integration lead
**Last reviewed:** 2026-05-07
**Cross-references:** `docs/audit/AUDIT_FINDINGS_REGISTER.md` (AUDIT-071), `docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md`, HIPAA Security Rule §164.312(a)(1) access control

---

## 1. Purpose + scope

The `HospitalEhrIssuer` table maps EHR JWT `iss` (issuer URL) claims to TAILRD `Hospital.id` for CDS Hooks tenant resolution. Without a registered mapping, CDS Hooks invocations from that EHR resolve to "unmapped issuer" and return `200 { cards: [] }` with an `CDS_HOOKS_UNMAPPED_ISSUER` audit log entry.

**1:N relationship:** A single hospital may register multiple issuer URLs (Epic Production + Epic Sandbox + DR instance + multi-org Epic instances). Each issuer URL is globally unique — one URL maps to exactly one hospital.

**Soft disable:** `isActive=false` deactivates a mapping without losing historical record (preserved for audit log forensics).

---

## 2. Pre-flight checklist

Before registering a new EHR issuer:

1. **Confirm the issuer URL** — obtained from the EHR vendor (Epic App Orchard registration packet, Cerner SMART app config, etc.). Format: full URL including scheme (`https://fhir.epic.com/interconnect-fhir-oauth`).
2. **Confirm the target Hospital row exists** — `SELECT id, name FROM hospitals WHERE id = '<hospitalId>';`
3. **Verify uniqueness** — `SELECT * FROM hospital_ehr_issuers WHERE "issuerUrl" = '<url>';` must return zero rows. If a row exists for a different hospital, that's a registration conflict requiring escalation.
4. **JWKS reachability** — `curl -sf <issuerUrl>/.well-known/jwks.json | jq .` must return a valid JWKS document. If the EHR's JWKS endpoint is unreachable from the production VPC, registration succeeds but JWT validation will fail at first invocation.
5. **Audit log readiness** — verify `auditLogger` dual-transport is healthy (check CloudWatch Logs `tailrd-production-backend` log group for recent `audit_event` entries).

---

## 3. Registration

### 3.1 Insert the row

For v1.0, raw SQL via Aurora cluster query (production-side, operator-only). Future enhancement: admin endpoint with role-gate.

```sql
INSERT INTO "hospital_ehr_issuers" ("id", "hospitalId", "issuerUrl", "label", "isActive", "createdAt", "updatedAt")
VALUES (
  encode(gen_random_bytes(12), 'hex'),  -- or use cuid via app layer
  '<hospitalId>',
  '<issuerUrl>',
  '<operator-readable-label>',           -- e.g., "Epic Production — BSW"
  true,
  NOW(),
  NOW()
);
```

**Recommended label format:** `<EHR vendor> <environment> — <hospital short name>` (e.g., `Epic Production — BSW`, `Epic Sandbox — BSW`).

### 3.2 Audit log the registration

Per HIPAA §164.308(a)(1)(ii)(D) Information System Activity Review, every EHR issuer registration event must be auditable. The `audit_logs` row is operator-authored; future admin-endpoint implementation will auto-write this.

```sql
INSERT INTO "audit_logs" ("id", "hospitalId", "userId", "userEmail", "userRole", "ipAddress", "action", "resourceType", "resourceId", "description", "newValues", "createdAt")
VALUES (
  encode(gen_random_bytes(12), 'hex'),
  '<hospitalId>',
  '<operator userId>',
  '<operator email>',
  'SUPER_ADMIN',
  'cli',
  'CDS_HOOKS_ISSUER_REGISTERED',
  'HospitalEhrIssuer',
  '<the new ehrIssuerId>',
  'EHR issuer registered for tenant',
  '{"issuerUrl": "<url>", "label": "<label>"}'::jsonb,
  NOW()
);
```

---

## 4. Verification

### 4.1 Test signature against JWKS

After registration, confirm the EHR can produce a JWT that validates against the registered issuer:

1. Have the EHR vendor send a test CDS Hooks request to `https://api.tailrd-heart.com/cds-services/tailrd-cardiovascular-gaps`
2. Expected response: 200 + cards (if a matching `fhirPatientId` patient exists for the resolved hospital) OR 200 + empty cards (if no matching patient — both expected outcomes are normal)
3. Audit log query — should show the `CDS_HOOKS_INVOCATION` event:

```sql
SELECT "createdAt", action, description, "newValues"
FROM "audit_logs"
WHERE action LIKE 'CDS_HOOKS_%'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 20;
```

### 4.2 Negative test — verify cross-tenant block

To confirm tenant isolation works:
1. Register issuer URL for hospital A
2. Have hospital A's EHR send a CDS Hooks request with a `fhirPatientId` belonging to hospital B (synthetic test patient)
3. Expected: 200 + empty cards + audit log entry (no card returned because patient belongs to hospital B; mandatory tenant filter excluded the row)

### 4.3 CloudWatch Logs filter

Real-time monitoring during onboarding:

```
filter @message like /audit_event/
| filter description like /CDS_HOOKS_/
| sort @timestamp desc
| limit 50
```

---

## 5. Offboarding

### 5.1 Soft disable

Preferred — preserves audit history:

```sql
UPDATE "hospital_ehr_issuers"
SET "isActive" = false, "updatedAt" = NOW()
WHERE id = '<ehrIssuerId>';
```

After this, the issuer's CDS Hooks invocations will return `200 { cards: [] }` with `CDS_HOOKS_UNMAPPED_ISSUER` audit log entries (because the lookup filters `isActive: true`).

### 5.2 Hard delete

Only when removing all historical record (rare; HIPAA retention typically requires 6+ year preservation):

```sql
DELETE FROM "hospital_ehr_issuers" WHERE id = '<ehrIssuerId>';
```

### 5.3 Audit log entry

```sql
INSERT INTO "audit_logs" (...) VALUES (..., 'CDS_HOOKS_ISSUER_DEACTIVATED', ...);
```

---

## 6. Audit query — historical registration trail

For compliance review or incident response:

```sql
SELECT
  hei.id,
  hei."hospitalId",
  hei."issuerUrl",
  hei.label,
  hei."isActive",
  hei."createdAt",
  hei."updatedAt",
  h.name AS hospital_name
FROM "hospital_ehr_issuers" hei
JOIN "hospitals" h ON h.id = hei."hospitalId"
ORDER BY hei."createdAt" DESC;
```

Cross-reference with audit_logs by `resourceId = hei.id` for full lifecycle (registration → activation → deactivation events).

---

## 7. Cross-references

- AUDIT-071 register entry: `docs/audit/AUDIT_FINDINGS_REGISTER.md`
- AUDIT-071 design doc: `docs/architecture/AUDIT_071_CDS_HOOKS_TENANT_ISOLATION_DESIGN.md`
- AUDIT-013 (audit log dual-transport): `backend/src/middleware/auditLogger.ts`
- AUDIT-076 (HIPAA_GRADE_ACTIONS boundary): partial closure here via 4 promotions
- HIPAA §164.312(a)(1) access control standard
- HIPAA §164.308(a)(1)(ii)(D) Information System Activity Review
- CDS Hooks 2.0 spec: https://cds-hooks.org/specification/current/
- Epic App Orchard CDS Hooks documentation
