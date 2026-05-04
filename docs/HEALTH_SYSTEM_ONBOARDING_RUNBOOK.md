# Health System Onboarding Runbook

**Owner:** Platform Engineering + Customer Success
**Last updated:** 2026-04-19
**Scope:** Signed contract to production go-live
**Target duration:** 6 to 12 weeks, depending on EHR and data volume
**Primary on-call runbook:** pair with `SCALE_REQUIREMENTS.md`, `DISASTER_RECOVERY.md`, `BAA_REQUIREMENTS.md`, `SECRET_ROTATION_RUNBOOK.md`

---

## Table of contents

1. [Pre-contract requirements gathering](#1-pre-contract-requirements-gathering)
2. [Technical discovery](#2-technical-discovery)
3. [Legal (BAA, DPA, vendor security review)](#3-legal-baa-dpa-vendor-security-review)
4. [AWS account setup (shared multi-tenant model)](#4-aws-account-setup-shared-multi-tenant-model)
5. [Hospital record creation in TAILRD DB](#5-hospital-record-creation-in-tailrd-db)
6. [Module enablement](#6-module-enablement)
7. [User account provisioning (SSO vs local)](#7-user-account-provisioning-sso-vs-local)
8. [Initial patient data ingestion](#8-initial-patient-data-ingestion)
9. [Gap detection run](#9-gap-detection-run)
10. [Dashboard validation by customer CMO](#10-dashboard-validation-by-customer-cmo)
11. [Clinician training](#11-clinician-training)
12. [Go-live](#12-go-live)
13. [Ongoing operations](#13-ongoing-operations)

Appendices: [CLI cheatsheet](#appendix-a-cli-cheatsheet), [Rollback procedures](#appendix-b-rollback-procedures), [SLAs](#appendix-c-slas), [Onboarding checklist template](#appendix-d-onboarding-checklist-template)

---

## Phase map

| Phase | Section | Elapsed time (typical) | Gate |
|---|---|---|---|
| Pre-contract | §1 | Week -6 to -2 | Signed MSA + BAA term sheet |
| Kickoff | §2, §3 | Week 0 to 2 | Executed BAA + DPA |
| Tenant provisioning | §4, §5, §6 | Week 2 to 3 | Hospital row exists, modules set |
| Identity | §7 | Week 3 to 4 | Admin account + SSO configured |
| Data load | §8 | Week 4 to 6 | First ingestion complete |
| Analytics | §9, §10 | Week 6 to 7 | CMO sign-off on dashboards |
| Training | §11 | Week 7 to 9 | >=80% staff trained |
| Go-live | §12 | Week 9 to 10 | First clinical user logs in |
| Steady state | §13 | Week 10+ | Monitoring + support SLAs |

---

## 1. Pre-contract requirements gathering

**Owner:** Sales + Customer Success
**Output:** Executed MSA, BAA term sheet, technical discovery document

### 1.1 Requirements intake form

Collect before any technical work begins:

| Field | Example | Required? |
|---|---|---|
| Legal entity name | Medical City Dallas Hospital, LLC | Yes |
| Parent health system | HCA Healthcare | Yes |
| NPI (primary) | 1234567890 | Yes |
| Hospital type | COMMUNITY, ACADEMIC, SPECIALTY, CRITICAL_ACCESS, FEDERAL | Yes |
| Bed count | 875 | Yes |
| Est. cardiovascular patient population | 25,000 active | Yes |
| Primary EHR | Epic, Cerner, Athenahealth, MEDITECH, Allscripts | Yes |
| EHR version | Epic 2024, Cerner Millennium 2018.01 | Yes |
| Service desk contact | it-service@customer.org | Yes |
| Clinical sponsor | CMO name + email | Yes |
| Compliance contact | Privacy Officer name + email | Yes |
| Requested modules | HF, EP, Structural, Coronary, Valvular, PVD | Yes |
| Subscription tier | BASIC, PROFESSIONAL, ENTERPRISE | Yes |
| Max user count | 50 | Yes |
| Target go-live date | 2026-Q3 | Yes |
| HIPAA Privacy Officer signer | Name + title | Yes |

### 1.2 Legal prerequisites (start in parallel)

- MSA (Master Services Agreement) countersigned
- BAA term sheet shared, route to customer Privacy Officer for redline
- Customer security questionnaire received (expect SIG Lite, CAIQ, or custom)

### 1.3 Deliverables from TAILRD

- TAILRD security one-pager (SOC 2 Type 1 report, HIPAA stack, subprocessor list)
- Architecture diagram (current state, multi-tenant isolation model)
- Reference list (Medical City Dallas, Mount Sinai as available)
- FAQ on CDS exemption under 21st Century Cures Act (§520(o)(1)(E))

### 1.4 Exit criteria

- [ ] MSA executed
- [ ] BAA term sheet agreed
- [ ] Requirements intake form complete
- [ ] Technical discovery call scheduled

**SLA:** 10 business days from MSA execution to technical discovery kickoff.

---

## 2. Technical discovery

**Owner:** Platform Engineering + customer IT
**Output:** Technical discovery document (TDD) + data volume estimate + ingestion plan

### 2.1 EHR integration decision matrix

| EHR | Recommended path | Alternative | Notes |
|---|---|---|---|
| Epic | Redox (subscription-based) | Epic on FHIR (direct) | Redox preferred unless customer already has direct FHIR build-out. Epic SMART on FHIR supports R4 since 2021. |
| Cerner | Redox | Cerner Ignite APIs | Cerner FHIR R4 is live since 2021. Direct API negotiates per-endpoint rate limits. |
| Athenahealth | Redox | Athenahealth API v1 | Redox only path for most mid-market customers. |
| MEDITECH | Redox (MaaS) | None practical | MEDITECH Expanse has FHIR; MAGIC/C/S 6.x does not. |
| Allscripts/Veradigm | Redox | Unity API | Deprecated paths in flux. Redox recommended. |

**Decision rule:** default to Redox. Direct EHR API only when (a) customer already has an IT-led FHIR build-out for another vendor, or (b) Redox monthly pricing exceeds direct path TCO by >30% over 3 years.

### 2.2 Data volume estimation

From `docs/SCALE_REQUIREMENTS.md`:

- Assume ~16 encounters and ~500 observations per patient per year
- Cardiology-heavy patients run 3-5x this

Estimated one-time historical ingestion (initial load) by population size:

| Population | FHIR bundles (est.) | Phase 1 rate (2-5 p/s) | Phase 2 rate (10-20 p/s) | Phase 3 rate (50-100 p/s) |
|---|---|---|---|---|
| 25,000 (pilot/MCD-sized) | 25,000 | 1.4 to 3.5 hours | 20 to 40 min | 4 to 8 min |
| 150,000 | 150,000 | 8 to 21 hours | 2 to 4 hours | 25 to 50 min |
| 500,000 (MCD full) | 500,000 | 28 to 69 hours (overnight x2) | 7 to 14 hours | 1.4 to 2.8 hours |
| 1,500,000 (Mount Sinai) | 1,500,000 | 3.5 to 8.6 days | 21 to 42 hours | 4 to 8 hours |
| 2,000,000 (CommonSpirit) | 2,000,000 | 4.6 to 11.5 days | 28 to 56 hours | 5.5 to 11 hours |

**Decision rule:** if initial load exceeds 72 hours at current production ingestion rate, schedule a Phase 2 infrastructure upgrade (RDS Proxy + t4g.large) before kickoff. See `SCALE_REQUIREMENTS.md` §4.

### 2.3 Technical discovery call agenda (90 min)

1. Network topology (15 min): customer VPN needs, static IPs for webhook allowlist
2. EHR inventory (15 min): primary + ancillary systems, FHIR endpoints available
3. Identity (15 min): SSO (SAML/OIDC/Azure AD/Okta/Ping) or local, MFA posture
4. Data scope (15 min): cardiovascular subset, full hospital, or single service line
5. Historical data (10 min): how many years of back-data, where it lives, who can extract
6. Compliance constraints (10 min): data residency (state-level), break-glass policy
7. Timeline + go-live target (10 min)

### 2.4 Deliverable: TDD

Checked into `~TAILRD/customer-tdds/{customer-slug}/TDD.md` (private customer repo).

Must include: EHR + Redox source/destination IDs, SSO IdP metadata URL, data scope, volume estimate, target ingestion window, rollback contact, DR class (see DISASTER_RECOVERY.md).

### 2.5 Exit criteria

- [ ] TDD signed off by customer IT Director + TAILRD CTO
- [ ] Redox or direct EHR path chosen and scoped
- [ ] SSO vs local decision recorded
- [ ] Initial load window booked on customer calendar
- [ ] Phase 2 infra upgrade scheduled if volume >1 M

**SLA:** 15 business days from kickoff to signed TDD.

---

## 3. Legal (BAA, DPA, vendor security review)

**Owner:** TAILRD Legal + customer Privacy Officer
**Output:** Executed BAA, DPA (if state law requires), security review pass

### 3.1 BAA execution

See `docs/BAA_REQUIREMENTS.md` for the full upstream BAA inventory. Customer-facing BAA:

1. TAILRD provides template BAA (covers 45 CFR 164.504(e))
2. Customer redlines, TAILRD Legal reviews within 5 business days
3. Both parties countersign. Store signed PDF in DocuSign + `~TAILRD/customer-tdds/{slug}/BAA-signed.pdf`
4. Record effective date in hospital record (step §5)

### 3.2 Data Processing Addendum (DPA)

Required for customers in CA, CO, CT, TX, VA, UT (state privacy laws) and any customer asking. Covers:

- Purpose limitation
- Data minimization
- Subprocessor list + notification rights
- Retention + deletion on contract termination (30-day hard delete)
- Audit rights

### 3.3 Vendor security review

Customer typically sends one of: SIG Lite (AUP Shared Assessments), CAIQ v4 (CSA), or a custom questionnaire.

Response pack (maintained in `~TAILRD/compliance/vendor-review-pack/`):
- SOC 2 Type 1 report (NDA required)
- HIPAA technical safeguards mapping
- Penetration test summary (annual, last performed: 2026-01-15)
- Encryption at rest + in transit proof (AES-256 via KMS, TLS 1.2+)
- PHI encryption middleware documentation (`backend/src/middleware/phiEncryption.ts`)
- Incident response plan
- Subprocessor list (AWS, Redox, Auth0 if applicable)
- Business continuity + DR plan (`docs/DISASTER_RECOVERY.md`)

**SLA:** Respond to vendor security review within 10 business days of receipt.

### 3.4 Upstream BAAs (TAILRD's obligations)

Confirmed before customer go-live, not per-customer:
- AWS BAA via AWS Artifact (one-time, covers all customers)
- Redox BAA via compliance@redoxengine.com (one-time)
- Any added subprocessor (Datadog, SendGrid, etc.): BAA before routing PHI

### 3.5 Exit criteria

- [ ] Customer BAA executed + filed
- [ ] DPA executed if required
- [ ] Vendor security review passed
- [ ] TAILRD upstream BAAs confirmed active

**SLA:** 20 business days from TDD signoff to all-legal-signed.

---

## 4. AWS account setup (shared multi-tenant model)

**Owner:** Platform Engineering
**Model decision:** **Shared multi-tenant** (not per-tenant AWS accounts)

### 4.1 Why shared multi-tenant

Per-tenant AWS accounts would cost ~$300/month baseline per customer (VPC NAT, KMS, CloudTrail, Config) and multiply operational overhead by N customers. Tenant isolation is enforced at the application layer via `hospitalId` scoping on every patient query plus row-level security via `WHERE hospitalId = $req.user.hospitalId`. KMS keys are per-tenant for defense-in-depth on PHI columns.

**When per-tenant AWS is required:**
- Customer contract mandates a dedicated VPC (rare; Mount Sinai asked, accepted shared)
- Customer is a federal agency requiring FedRAMP boundary separation (not applicable yet)
- Customer data residency requires a non-us-east-1 region

If per-tenant is required, follow `infrastructure/cloudformation/per-tenant-stack.yml` (TODO, not yet built). Flag to CTO.

### 4.2 Shared tenant provisioning (what happens per customer)

Per-customer AWS resources inside the shared `tailrd-production` account:

| Resource | Naming | Purpose |
|---|---|---|
| KMS key | `alias/tailrd-phi-{hospital-id}` | Per-tenant PHI column encryption key |
| S3 prefix | `s3://tailrd-cardiovascular-datasets-863518424332/customer-data/{hospital-id}/` | Inbound FHIR bundles + ingestion cursors |
| CloudWatch log group | `/tailrd/customer/{hospital-id}` | Tenant-scoped app log stream |
| Secrets Manager secret | `tailrd/customer/{hospital-id}/redox-webhook-secret` | Webhook HMAC secret |
| IAM policy | `tailrd-customer-{hospital-id}-read` | Scoped read policy for customer exports |

### 4.3 Provisioning commands

Replace `HOSPITAL_ID` and `HOSPITAL_NAME` with actual values (e.g. `mcd-001`, `Medical City Dallas`).

```bash
export HOSPITAL_ID="mcd-001"
export HOSPITAL_NAME="Medical City Dallas"
export AWS_REGION="us-east-1"
```

**Step 4.3.1: Create per-tenant KMS key**

```bash
aws kms create-key \
  --description "PHI column encryption key for ${HOSPITAL_NAME}" \
  --tags TagKey=Tenant,TagValue=${HOSPITAL_ID} \
  --region ${AWS_REGION}
```

Expected output (capture `KeyId`):

```json
{
  "KeyMetadata": {
    "AWSAccountId": "863518424332",
    "KeyId": "12ab34cd-56ef-78gh-90ij-1234567890kl",
    ...
  }
}
```

```bash
aws kms create-alias \
  --alias-name alias/tailrd-phi-${HOSPITAL_ID} \
  --target-key-id <KeyId-from-above> \
  --region ${AWS_REGION}
```

**Step 4.3.2: Create S3 prefix + lifecycle**

```bash
aws s3api put-object \
  --bucket tailrd-cardiovascular-datasets-863518424332 \
  --key customer-data/${HOSPITAL_ID}/.keep \
  --region ${AWS_REGION}
```

Expected output: `{"ETag": "\"d41d8cd98f00b204e9800998ecf8427e\""}`.

**Step 4.3.3: Store Redox webhook secret**

```bash
WEBHOOK_SECRET=$(openssl rand -hex 32)
aws secretsmanager create-secret \
  --name tailrd/customer/${HOSPITAL_ID}/redox-webhook-secret \
  --secret-string "${WEBHOOK_SECRET}" \
  --region ${AWS_REGION}
```

Capture the webhook secret. Customer IT will configure Redox to sign outbound webhooks with this HMAC secret.

**Step 4.3.4: Verify**

```bash
aws kms list-aliases --region ${AWS_REGION} \
  | grep "tailrd-phi-${HOSPITAL_ID}"
aws secretsmanager describe-secret \
  --secret-id tailrd/customer/${HOSPITAL_ID}/redox-webhook-secret \
  --region ${AWS_REGION}
```

### 4.4 Exit criteria

- [ ] Per-tenant KMS key created + alias set
- [ ] S3 prefix created
- [ ] Webhook secret stored in Secrets Manager
- [ ] ECS task IAM role updated to allow Decrypt on new KMS key

**SLA:** 2 business days from BAA execution.

---

## 5. Hospital record creation in TAILRD DB

**Owner:** Platform Engineering
**Output:** Hospital row in production Postgres + admin user

### 5.1 Two provisioning paths

| Path | When | Who runs it |
|---|---|---|
| API onboarding (preferred) | All new customers | Super-admin via `POST /api/onboarding/hospitals` |
| Direct DB seed | Demo / internal tenants only | Platform eng via `seedFromSynthea.ts` |

The API path runs inside a Prisma transaction so hospital + admin user land atomically. See `backend/src/routes/onboarding.ts:11`.

### 5.2 API onboarding

**Step 5.2.1: Authenticate as super-admin**

```bash
SUPER_ADMIN_TOKEN=$(curl -s -X POST https://api.tailrd-heart.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"JHart@tailrd-heart.com","password":"<redacted>"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "Token length: ${#SUPER_ADMIN_TOKEN}"
```

Expected: `Token length: ~250` (JWT).

**Step 5.2.2: Create hospital + admin**

```bash
curl -s -X POST https://api.tailrd-heart.com/api/onboarding/hospitals \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "hospitalInfo": {
      "name": "Medical City Dallas",
      "system": "HCA Healthcare",
      "npi": "1234567890",
      "patientCount": 25000,
      "bedCount": 875,
      "hospitalType": "COMMUNITY",
      "address": {
        "street": "7777 Forest Lane",
        "city": "Dallas",
        "state": "TX",
        "zipCode": "75230"
      }
    },
    "adminUser": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jsmith@medicalcitydallas.com",
      "title": "CMO",
      "password": "<generated-12+char-complex>"
    },
    "subscription": {
      "tier": "ENTERPRISE",
      "maxUsers": 50
    },
    "modules": {
      "heartFailure": true,
      "electrophysiology": true,
      "coronaryIntervention": true,
      "structuralHeart": true,
      "valvularDisease": true,
      "peripheralVascular": true
    },
    "redoxConfig": {
      "sourceId": "medical-city-dallas-src",
      "destinationId": "tailrd-mcd-001"
    }
  }'
```

Expected response (201):

```json
{
  "success": true,
  "data": {
    "hospital": {
      "id": "hosp-042",
      "name": "Medical City Dallas",
      "redoxWebhookUrl": "https://api.tailrd.com/webhooks/redox/hosp-042",
      "redoxIsActive": false,
      ...
    },
    "adminUser": {
      "id": "user-...",
      "email": "jsmith@medicalcitydallas.com",
      "role": "HOSPITAL_ADMIN"
    },
    "onboardingTasks": [ ... 8 tasks ... ]
  }
}
```

Capture `hospital.id`: this is `HOSPITAL_ID` for the rest of the runbook.

**Step 5.2.3: Verify in DB**

```bash
# Via direct psql on the RDS instance (bastion required)
psql ${DATABASE_URL} -c "SELECT id, name, \"subscriptionTier\", \"redoxIsActive\" FROM \"Hospital\" WHERE id = 'hosp-042';"
```

Expected:

```
   id    |         name         | subscriptionTier | redoxIsActive
---------+----------------------+------------------+---------------
 hosp-042| Medical City Dallas  | ENTERPRISE       | f
(1 row)
```

### 5.3 Onboarding status polling

Once the hospital exists, track progress via:

```bash
curl -s https://api.tailrd-heart.com/api/onboarding/hospitals/hosp-042/status \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" | python3 -m json.tool
```

Returns the 8-step checklist (`hospital-setup`, `admin-user`, `redox-setup`, `user-setup`, `module-config`, `data-sync`, `training`, `go-live`) plus completion percentage.

### 5.4 Exit criteria

- [ ] Hospital row present in production DB
- [ ] Admin user created, `isActive = true`
- [ ] Redox webhook URL surfaced to customer IT
- [ ] Onboarding status API returns `progressPercentage >= 25`

**SLA:** same-day once BAA signed.

---

## 6. Module enablement

**Owner:** Customer Success + customer CMO
**Default state:** all 6 modules enabled for ENTERPRISE, HF+Coronary only for BASIC

### 6.1 Module decision matrix

Customers rarely need all 6 modules on day one. Start narrow, expand after go-live.

| Customer profile | Default modules | Add later |
|---|---|---|
| Community hospital (MCD profile) | HF, Coronary | EP (once device clinic onboarded), PVD (vascular surgery buy-in) |
| Academic medical center (Mount Sinai profile) | All 6 | n/a |
| Specialty cardiology hospital | All 6 except PVD | PVD if they ref to vascular |
| Critical access | HF, Coronary | None typically |

### 6.2 Enable/disable after creation

```bash
# Via direct DB (hospital admin can also toggle via admin UI, see §7)
psql ${DATABASE_URL} -c "UPDATE \"Hospital\" SET \
  \"moduleHeartFailure\" = true, \
  \"moduleCoronaryIntervention\" = true, \
  \"moduleElectrophysiology\" = false \
  WHERE id = 'hosp-042';"
```

Expected: `UPDATE 1`.

### 6.3 Cascading permission effect

When a module is disabled on the hospital, existing users retain their `perm*` flags in the DB but the frontend hides the module (checked in `AppShell.tsx` against `hospital.module*`). Disabling a module does not delete user perms. Re-enabling is instant.

### 6.4 Exit criteria

- [ ] Confirmed modules match contract
- [ ] Customer CMO has signed off on enabled modules
- [ ] Admin user's module perms match enabled modules

**SLA:** 1 business day to configure after CMO sign-off.

---

## 7. User account provisioning (SSO vs local)

**Owner:** Customer IT + TAILRD Customer Success

### 7.1 SSO vs local decision

| Customer has | Recommendation | Why |
|---|---|---|
| Azure AD + SAML/OIDC | SSO (strongly recommended) | Lifecycle managed, MFA via customer IdP |
| Okta / Ping | SSO | Same |
| Only Active Directory, no federation | Local accounts + MFA | Limited engagement value to build ADFS just for TAILRD |
| No central identity | Local accounts + MFA | <10 users |

TAILRD local auth: `backend/src/middleware/auth.ts` (JWT), MFA via TOTP (`backend/src/routes/mfa.ts`).

SSO: SAML 2.0 or OIDC. Currently NOT YET SHIPPED for multi-tenant (planned Phase B). Until then, SSO customers land in local auth and migrate later.

### 7.2 Role model

From `backend/src/config/rolePermissions.ts`:

| Role | Scope | Use case |
|---|---|---|
| SUPER_ADMIN | Cross-tenant (platform ops only) | TAILRD internal |
| HOSPITAL_ADMIN | Single hospital, all modules | Customer admin (usually CIO or CMIO) |
| CARDIOLOGY_DIRECTOR | Single hospital, service-line views | Director, chief of cardiology |
| PHYSICIAN | Single hospital, care-team views | Cardiologist, APP, CV nurse practitioner |
| CARE_COORDINATOR | Single hospital, limited PHI | RN care coordinator, clinical pharmacist |
| QUALITY_ANALYST | Single hospital, service-line views, no PHI access | QI / reporting |
| READ_ONLY | Single hospital, executive dashboards only | CMO, VP of CV services |

### 7.3 Bulk invite flow (local auth)

**Step 7.3.1: Hospital admin invites users**

```bash
curl -s -X POST https://api.tailrd-heart.com/api/invite \
  -H "Authorization: Bearer ${HOSPITAL_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "drjones@medicalcitydallas.com",
    "firstName": "Alex",
    "lastName": "Jones",
    "role": "PHYSICIAN",
    "title": "Cardiologist",
    "modulePerms": {
      "permHeartFailure": true,
      "permCoronaryIntervention": true,
      "permCareTeamView": true
    }
  }'
```

Response:

```json
{ "success": true, "data": { "inviteToken": "...", "expiresAt": "..." } }
```

Email with invite link sent via SES to `drjones@medicalcitydallas.com`.

**Step 7.3.2: User accepts invite**

User clicks link, lands at `app.tailrd-heart.com/auth/accept-invite?token=...`, sets password + MFA, logs in.

**Step 7.3.3: Verify in DB**

```bash
psql ${DATABASE_URL} -c "SELECT COUNT(*) FROM \"User\" WHERE \"hospitalId\" = 'hosp-042';"
```

### 7.4 SSO flow (once available)

1. Customer IT provides IdP metadata XML (SAML) or issuer/client ID (OIDC)
2. TAILRD stores in `HospitalSSO` record, status = `CONFIGURED`
3. Test with one user via `/auth/sso/test`
4. Flip `HospitalSSO.enabled = true` via admin API
5. Local auth is disabled for that hospital; JIT provisioning on first login based on IdP group claim mapping

### 7.5 Exit criteria

- [ ] At least 3 users invited (admin + 2 clinicians) and accepted
- [ ] MFA configured for all admin users
- [ ] SSO live if contracted

**SLA:** 5 business days from hospital creation.

---

## 8. Initial patient data ingestion

**Owner:** Platform Engineering + customer IT
**Output:** Patients + encounters + observations + conditions + medications in DB

### 8.1 Three ingestion paths

| Path | When | Volume supported today |
|---|---|---|
| A. Synthea (demo only) | Pilot / demo / proof tenants | 50k tested, 500k in-flight |
| B. Epic/Cerner flat-file export + S3 upload | Most customers, one-time historical load | 2 M tested (Mount Sinai plan) |
| C. Redox webhook (continuous) | Post-go-live, real-time | Unlimited, gated by EHR rate limit |

Path A and B land the initial batch. Path C takes over for ongoing changes after go-live.

### 8.2 Path A: Synthea ingestion (demo tenants)

Not for production customers. Use only for demo accounts (Medical City Dallas demo, CommonSpirit demo, Mount Sinai demo seeded by `backend/scripts/seedFromSynthea.ts`).

```bash
cd backend
export SYNTHEA_HOSPITAL_ID=hosp-042
npx tsx scripts/processSynthea.ts --s3 --limit 5000 --concurrency 8
```

Expected progress log every 100 bundles:

```
Progress: 5000/5000 bundles | 4876p 78123e 1650043o 124err | heap 1240MB rss 1612MB | 1842.3s elapsed
```

Cursor is persisted to `s3://tailrd-cardiovascular-datasets-863518424332/ingest-cursors/hosp-042.txt`; interrupted runs resume from last batch.

### 8.3 Path B: Customer EHR export (production path)

**Step 8.3.1: Request export from customer**

Give customer IT this request:

- Format: FHIR R4 bundles, one per patient, one JSON file per bundle
- Scope: all patients with at least one cardiovascular ICD-10 (I00-I99) encounter in the last 5 years
- Resources: Patient, Encounter, Observation, Condition, MedicationRequest, Procedure, Device, AllergyIntolerance
- Compression: gzip each bundle; upload via SFTP or pre-signed S3 URLs

**Step 8.3.2: Issue pre-signed upload URLs (preferred)**

```bash
# Platform eng generates per-bundle presigned URLs (customer uploads directly)
aws s3 presign s3://tailrd-cardiovascular-datasets-863518424332/customer-data/hosp-042/fhir/ \
  --expires-in 86400
```

Or use STS AssumeRole with a scoped IAM role.

**Step 8.3.3: Customer uploads bundles**

Customer IT script uploads to `s3://tailrd-cardiovascular-datasets-863518424332/customer-data/hosp-042/fhir/{patient-uuid}.json.gz`.

**Step 8.3.4: Verify upload**

```bash
aws s3 ls s3://tailrd-cardiovascular-datasets-863518424332/customer-data/hosp-042/fhir/ \
  --recursive --summarize | tail -5
```

Expected:

```
Total Objects: 25000
Total Size: 14.3 GB
```

Cross-check object count against customer's stated patient count (+/- 1%).

**Step 8.3.5: Run ingestion**

```bash
aws ecs run-task \
  --cluster tailrd-production-cluster \
  --task-definition tailrd-ingest:12 \
  --overrides '{
    "containerOverrides": [{
      "name": "ingest",
      "environment": [
        {"name": "SYNTHEA_HOSPITAL_ID", "value": "hosp-042"},
        {"name": "S3_PREFIX", "value": "customer-data/hosp-042/fhir/"},
        {"name": "CONCURRENCY", "value": "8"}
      ]
    }]
  }' \
  --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}'
```

Expected: task starts, ECS returns `taskArn`. Watch CloudWatch `/tailrd/ingest` log group.

**Step 8.3.6: Monitor ingestion**

Expected throughput (post-Phase 1): ~2-5 patients/sec. For 25k patients: 1.4 to 3.5 hours. For 500k: one overnight run. See `SCALE_REQUIREMENTS.md` §3.

Watch for:
- `heap` climbing toward the 6144 MB NODE_OPTIONS cap: if so, reduce concurrency
- `err` count >1% of processed: investigate FHIR validation failures in log

```bash
# Tail progress
aws logs tail /tailrd/ingest --follow --since 30m
```

### 8.4 Path C: Redox ongoing webhook (post go-live)

Configured once per hospital after initial load. Customer IT configures their Redox org to route FHIR updates to `https://api.tailrd.com/webhooks/redox/{hospital-id}` with HMAC signing using the webhook secret from §4.3.3.

Handler: `backend/src/redox/fhirResourceHandlers.ts`. Flip `redoxIsActive = true` on hospital record once first webhook arrives:

```bash
curl -s -X PATCH https://api.tailrd-heart.com/api/onboarding/hospitals/hosp-042/onboarding/redox-setup \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### 8.5 Data quality checks (must pass before §9)

```bash
psql ${DATABASE_URL} <<SQL
SELECT
  (SELECT COUNT(*) FROM "Patient" WHERE "hospitalId" = 'hosp-042') AS patients,
  (SELECT COUNT(*) FROM "Encounter" WHERE "hospitalId" = 'hosp-042') AS encounters,
  (SELECT COUNT(*) FROM "Observation" WHERE "hospitalId" = 'hosp-042') AS observations,
  (SELECT COUNT(*) FROM "Condition" WHERE "hospitalId" = 'hosp-042') AS conditions,
  (SELECT COUNT(*) FROM "Medication" WHERE "hospitalId" = 'hosp-042') AS medications;
SQL
```

Sanity ranges for 25,000 patients (typical cardiovascular-weighted sample):

| Table | Expected | Fail if |
|---|---|---|
| Patient | 23,000 to 25,500 | <20,000 or >26,000 |
| Encounter | 350,000 to 500,000 | <200,000 |
| Observation | 10 M to 15 M | <5 M |
| Condition | 150,000 to 300,000 | <100,000 |
| Medication | 200,000 to 400,000 | <75,000 |

Values outside these ranges mean the export was partial or resource types were dropped. Escalate to customer IT before proceeding.

### 8.6 Exit criteria

- [ ] Ingestion task exited with `stats.errors / stats.patients < 1%`
- [ ] Data quality ranges all pass
- [ ] `redoxIsActive = true` if using Path C

**SLA:** 1 to 5 days depending on volume. See §2.2.

---

## 9. Gap detection run

**Owner:** Platform Engineering
**Output:** `TherapyGap` rows populated for all ingested patients

### 9.1 Run gap detection

```bash
# Platform eng, via bastion or local with prod DATABASE_URL
cd backend
HOSPITAL_ID=hosp-042 npx tsx -e "
  const { runGapDetection } = require('./src/ingestion/gapDetectionRunner');
  runGapDetection(process.env.HOSPITAL_ID).then(r => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }).catch(e => { console.error(e); process.exit(1); });
"
```

Expected output:

```json
{
  "hospitalId": "hosp-042",
  "patientsEvaluated": 24876,
  "rulesExecuted": 257,
  "gapFlagsCreated": 41223,
  "gapFlagsUpdated": 0,
  "durationMs": 324500
}
```

Sanity: ~1.5 to 2 gaps per patient average across all modules is typical. If <0.5 or >5, rules may be firing incorrectly (escalate).

### 9.2 Module-level gap counts

```bash
psql ${DATABASE_URL} <<SQL
SELECT module, COUNT(*) AS gap_count
FROM "TherapyGap"
WHERE "hospitalId" = 'hosp-042'
GROUP BY module
ORDER BY gap_count DESC;
SQL
```

Expected (25k patient cardiovascular-heavy sample):

```
     module     | gap_count
----------------+-----------
 HEART_FAILURE  |     12500
 CORONARY       |      9800
 EP             |      7200
 VALVULAR       |      5100
 STRUCTURAL     |      3600
 PVD            |      3000
```

### 9.3 Evidence spot-check

Pick 10 random gaps, confirm `evidence` object is populated:

```bash
psql ${DATABASE_URL} -c "SELECT id, \"ruleId\", evidence->>'guidelineSource' AS source, \
  evidence->>'classOfRecommendation' AS class \
  FROM \"TherapyGap\" WHERE \"hospitalId\" = 'hosp-042' \
  ORDER BY random() LIMIT 10;"
```

All rows must have non-null source and class. Nulls = gap rule bug; do not proceed.

### 9.4 Exit criteria

- [ ] Gap detection completed without exception
- [ ] Module gap counts in expected ranges
- [ ] 10/10 spot-check gaps have evidence populated

**SLA:** runtime is ~3 minutes per 10k patients on current ECS class. 25k = ~8 minutes. 500k = ~2.5 hours.

---

## 10. Dashboard validation by customer CMO

**Owner:** Customer Success
**Output:** Customer CMO sign-off on dashboard accuracy

### 10.1 Validation session (90 min)

Schedule with customer CMO once gap detection is complete.

Agenda:
1. Executive view walk-through (15 min): total patient count, active gaps, high-risk count
2. Per-module service-line views (45 min): CMO reviews their known populations, flags anomalies
3. Patient-level drill-down on 5 known patients (20 min): CMO picks 5 patients they know well, verifies data matches EHR
4. Sign-off or punch-list (10 min)

### 10.2 Common punch-list items

| Issue | Cause | Fix |
|---|---|---|
| Total patient count off by >5% | Customer export filtered incorrectly | Customer IT re-exports with corrected query |
| "My NYHA IV HF patients don't show up" | Observation LOINC code mapping gap | Add code to `backend/src/terminology/cardiovascularValuesets.ts`, re-run gap detection for that module |
| Gap rule firing on patient with documented contraindication | Contraindication code not in exclusion set | Update rule's exclusion code set, re-run |
| Patient shows wrong service line assignment | Cross-module attribution logic | Check `backend/src/services/crossReferralService.ts` rules |

### 10.3 Sign-off artifact

CMO emails Customer Success or e-signs an acceptance memo. Store in `~TAILRD/customer-tdds/{slug}/cmo-signoff.pdf`. Record date in hospital record:

```bash
psql ${DATABASE_URL} -c "UPDATE \"Hospital\" SET \"cmoSignoffAt\" = NOW() WHERE id = 'hosp-042';"
```

### 10.4 Exit criteria

- [ ] CMO validation session completed
- [ ] Punch-list fully resolved or escalated
- [ ] Signed acceptance memo on file

**SLA:** validation session within 5 business days of gap detection completion.

---

## 11. Clinician training

**Owner:** Customer Success + customer clinical champion
**Output:** >=80% of licensed clinicians trained

### 11.1 Training curriculum (by role)

| Role | Duration | Format |
|---|---|---|
| HOSPITAL_ADMIN | 120 min | 1:1 web session + admin playbook |
| CARDIOLOGY_DIRECTOR | 60 min | Group web session |
| PHYSICIAN | 45 min | Recorded + live Q&A |
| CARE_COORDINATOR | 60 min | Workflow-focused live session |
| QUALITY_ANALYST | 90 min | Reports + export focused |
| READ_ONLY (CMO/VP) | 30 min | Executive view focus |

### 11.2 Training tracker

Track completion in customer-facing dashboard (not the clinical app):

```bash
# Record a training session completion
curl -s -X POST https://api.tailrd-heart.com/api/admin/training-sessions \
  -H "Authorization: Bearer ${CS_TOKEN}" \
  -d '{
    "hospitalId": "hosp-042",
    "date": "2026-05-10",
    "role": "PHYSICIAN",
    "attendeeCount": 12,
    "trainerId": "user-cs-liz"
  }'
```

### 11.3 Training materials

- Admin playbook: `~TAILRD/training/admin-playbook.pdf`
- Clinician quick-start (2 pages per module): `~TAILRD/training/clinician-quickstart-{module}.pdf`
- Video library: `training.tailrd-heart.com` (password-gated per tenant)

### 11.4 Exit criteria

- [ ] All HOSPITAL_ADMIN users trained 1:1
- [ ] >=80% of invited clinicians have completed at least one session
- [ ] Customer clinical champion confirms team readiness

**SLA:** 2 to 3 weeks depending on customer scheduling.

---

## 12. Go-live

**Owner:** Customer Success + Platform Engineering
**Output:** Customer in production use

### 12.1 Go-live criteria

All must be true:

- [ ] BAA executed and on file
- [ ] All 8 onboarding checklist steps at 100%
- [ ] CMO sign-off on dashboards
- [ ] >=80% training completion
- [ ] Redox webhook receiving (if Path C)
- [ ] Customer IT has acknowledged support escalation paths

### 12.2 Go-live day

**Step 12.2.1: Final smoke test (platform eng)**

```bash
# Health check
curl -s https://api.tailrd-heart.com/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('Health:', d['data']['status'])"

# Customer admin can log in
curl -s -X POST https://api.tailrd-heart.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jsmith@medicalcitydallas.com","password":"<admin-pass>"}' \
  | python3 -c "import sys,json; print('Login:', json.load(sys.stdin).get('success'))"

# Patient count is non-zero via API
curl -s "https://api.tailrd-heart.com/api/patients?limit=1" \
  -H "Authorization: Bearer ${HOSPITAL_ADMIN_TOKEN}" \
  | python3 -c "import sys,json; print('Patients visible:', len(json.load(sys.stdin).get('data', [])) > 0)"
```

All three must return `True` / `healthy`.

**Step 12.2.2: Flip go-live flag**

```bash
curl -s -X PATCH https://api.tailrd-heart.com/api/onboarding/hospitals/hosp-042/onboarding/go-live \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"completed": true, "notes": "Go-live 2026-05-20"}'
```

**Step 12.2.3: Enable customer notifications**

Customer notification engine (daily gap digest email) is gated by `hospital.notificationsEnabled`. Flip on go-live day:

```bash
psql ${DATABASE_URL} -c "UPDATE \"Hospital\" SET \"notificationsEnabled\" = true, \"goLiveAt\" = NOW() WHERE id = 'hosp-042';"
```

**Step 12.2.4: Announce to customer**

Send go-live email to customer admin + CMO with login URL, support contact, status page URL.

### 12.3 First-week hypercare

Platform engineering + customer success staff a shared Slack channel (`#customer-{slug}`) for 7 days. Daily stand-up with customer IT 10 min each morning.

### 12.4 Exit criteria

- [ ] Go-live day smoke test passed
- [ ] First clinical user login recorded
- [ ] Hypercare channel active

**SLA:** Same-day decision on go-live go/no-go.

---

## 13. Ongoing operations

**Owner:** Platform Engineering + Customer Success

### 13.1 Monitoring

CloudWatch dashboards per `SCALE_REQUIREMENTS.md` §6:

- Ingestion throughput, RDS CPU/IOPS/connections, Node heap, queue depth
- Alarms: RDS CPU >80% 10m, RDS FreeableMemory <400 MB, ingest worker `heap limit|OOM|FATAL`
- Customer-visible status: `status.tailrd-heart.com` (TODO, not yet live)

### 13.2 Data refresh cadence

| Ingestion path | Cadence | Owner |
|---|---|---|
| Path C (Redox webhook) | Real-time | Automatic |
| Path B (batch re-export) | Monthly or on-demand | Customer IT + Platform eng |
| Gap detection re-run | Nightly cron 02:00 ET | Platform eng (cron via `node-cron`) |
| Gap detection on webhook | Per webhook, <=60s p95 | Automatic |

### 13.3 Support SLAs

| Severity | Definition | Response | Resolution |
|---|---|---|---|
| P0 | Platform down for customer | 15 min | 4 hours |
| P1 | Feature down, workaround exists | 1 hour | 1 business day |
| P2 | Degraded experience | 4 hours | 3 business days |
| P3 | Question, feature request | 1 business day | Next release |

Support channel: `support@tailrd-heart.com`, PagerDuty for P0/P1 during 7am-10pm ET customer hours.

### 13.4 Monthly customer review

Customer Success hosts a 30-min monthly review with customer admin:
- Gaps closed (this month vs last)
- Revenue opportunity recovered
- Outstanding support tickets
- Upcoming product releases

### 13.5 Quarterly business review (QBR)

60-min review with customer executive sponsor:
- Clinical outcomes (gap closure rate, readmission proxy)
- Financial impact (est. revenue captured)
- Roadmap alignment (what's coming, what's being retired)
- Renewal or expansion signal

### 13.6 Off-boarding (contract termination)

Per DPA:
1. Customer gives 30-day notice
2. Platform eng disables `subscriptionActive = false` on hospital record (day 0)
3. Export customer data to S3 bucket they designate, or bundle + ship to customer
4. Hard delete all patient data within 30 days of termination effective date
5. Confirm deletion in writing to customer Privacy Officer

```bash
# Hard delete (run only after export + written confirmation)
psql ${DATABASE_URL} <<SQL
BEGIN;
DELETE FROM "TherapyGap" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Observation" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Encounter" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Condition" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Medication" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Patient" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "User" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Hospital" WHERE id = 'hosp-042';
-- Review before COMMIT
COMMIT;
SQL
```

Off-boarding SLA: 30 days from termination effective date to hard delete complete.

---

## Appendix A: CLI cheatsheet

Environment setup:

```bash
export HOSPITAL_ID="hosp-042"
export AWS_REGION="us-east-1"
export SUPER_ADMIN_TOKEN=$(curl -s -X POST https://api.tailrd-heart.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"JHart@tailrd-heart.com","password":"<redacted>"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
```

Common operations:

```bash
# Create hospital (see §5.2.2 for full payload)
curl -X POST https://api.tailrd-heart.com/api/onboarding/hospitals -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" -H "Content-Type: application/json" -d @hospital-payload.json

# Check onboarding status
curl -s https://api.tailrd-heart.com/api/onboarding/hospitals/${HOSPITAL_ID}/status -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" | python3 -m json.tool

# Generate API keys
curl -s -X POST https://api.tailrd-heart.com/api/onboarding/hospitals/${HOSPITAL_ID}/api-keys -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}"

# Update onboarding step
curl -s -X PATCH https://api.tailrd-heart.com/api/onboarding/hospitals/${HOSPITAL_ID}/onboarding/{step} -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" -H "Content-Type: application/json" -d '{"completed": true}'

# Run ingestion task
aws ecs run-task --cluster tailrd-production-cluster --task-definition tailrd-ingest:12 --overrides '{"containerOverrides":[{"name":"ingest","environment":[{"name":"SYNTHEA_HOSPITAL_ID","value":"'${HOSPITAL_ID}'"}]}]}' --launch-type FARGATE --network-configuration 'awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}'

# Tail ingestion logs
aws logs tail /tailrd/ingest --follow --since 30m

# Tail backend logs
aws logs tail /tailrd/backend --follow --since 10m

# Verify production image SHA
TASK=$(aws ecs list-tasks --cluster tailrd-production-cluster --service-name tailrd-production-backend --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster tailrd-production-cluster --tasks "$TASK" --query 'tasks[0].containers[0].image' --output text

# Rollback to last known working task definition
aws ecs update-service --cluster tailrd-production-cluster --service tailrd-production-backend --task-definition tailrd-backend:28

# Deploy verification (from CLAUDE.md §18)
curl -s https://api.tailrd-heart.com/health | python3 -c "import sys,json; print('Health:', json.load(sys.stdin)['data']['status'])"
```

---

## Appendix B: Rollback procedures

### B.1 Hospital creation rollback

If hospital creation transaction fails or was misconfigured:

```bash
# API does not yet expose delete; run directly
psql ${DATABASE_URL} <<SQL
BEGIN;
DELETE FROM "User" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Hospital" WHERE id = 'hosp-042';
COMMIT;
SQL
```

Note: this will cascade and delete all dependent data. Only use if no patient data has landed yet (check `patients` count first).

### B.2 Ingestion rollback

Ingestion is idempotent thanks to `skipDuplicates: true` in `createMany` calls. If a run is bad (e.g. wrong hospital ID set):

```bash
# Delete all patient-scoped data for the hospital, keep the hospital row
psql ${DATABASE_URL} <<SQL
BEGIN;
DELETE FROM "TherapyGap" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Observation" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Encounter" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Condition" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Medication" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Procedure" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "DeviceImplant" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "AllergyIntolerance" WHERE "hospitalId" = 'hosp-042';
DELETE FROM "Patient" WHERE "hospitalId" = 'hosp-042';
COMMIT;
SQL

# Also clear the ingestion cursor so re-run processes from start
aws s3 rm s3://tailrd-cardiovascular-datasets-863518424332/ingest-cursors/hosp-042.txt
```

### B.3 Gap detection rollback

Gap detection is idempotent per `(hospitalId, patientId, ruleId)`. Re-running just upserts. To wipe gaps only (keep clinical data):

```bash
psql ${DATABASE_URL} -c "DELETE FROM \"TherapyGap\" WHERE \"hospitalId\" = 'hosp-042';"
```

Then re-run §9.1.

### B.4 Task definition rollback (platform level)

From CLAUDE.md §17:

```bash
aws ecs update-service \
  --cluster tailrd-production-cluster \
  --service tailrd-production-backend \
  --task-definition tailrd-backend:28
```

28 is the last known working task def as of 2026-04-10. Platform eng updates that number in `CLAUDE.md` §9 after every successful deploy.

### B.5 Go-live rollback

If go-live uncovers a blocker, return the hospital to pre-go-live state:

```bash
psql ${DATABASE_URL} -c "UPDATE \"Hospital\" SET \"notificationsEnabled\" = false, \"goLiveAt\" = NULL WHERE id = 'hosp-042';"

# Revert go-live checklist step
curl -s -X PATCH https://api.tailrd-heart.com/api/onboarding/hospitals/hosp-042/onboarding/go-live \
  -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"completed": false, "notes": "Reverted due to: <reason>"}'
```

---

## Appendix C: SLAs

Consolidated from each section.

### C.1 Onboarding milestone SLAs (TAILRD commitments)

| Milestone | SLA | Owner |
|---|---|---|
| Technical discovery kickoff | 10 business days from MSA | Sales + Eng |
| Signed TDD | 15 business days from kickoff | Eng + customer IT |
| Legal complete (all signed) | 20 business days from TDD | Legal |
| Vendor security review response | 10 business days from receipt | CSO |
| AWS tenant provisioning | 2 business days from BAA | Platform eng |
| Hospital record + admin | Same-day from BAA signed | Platform eng |
| Module enablement | 1 business day from CMO signoff | CS |
| User invites (bulk) | 5 business days from hospital created | CS + customer admin |
| Initial data ingestion | Per §2.2 (volume dependent) | Platform eng |
| Gap detection | <3 min per 10k patients | Automatic |
| CMO validation session | 5 business days from gap detection | CS |
| Training complete (>=80%) | 2 to 3 weeks | CS |
| Go-live decision | Same-day | CS + Eng + customer |

**Total expected duration:** 6 to 12 weeks from MSA signing to go-live, volume dependent.

### C.2 Production SLAs (per SCALE_REQUIREMENTS.md §5)

| SLO | Target | Measurement |
|---|---|---|
| Availability (backend API) | 99.9% monthly | `(1 - downtime/43200) * 100` |
| API p99 module dashboard | <=500 ms | CloudWatch `x-amzn-apigw-latency` p99 5m |
| API p99 patient worklist | <=1000 ms | Same |
| Gap detection lag (webhook -> gap) | <=60s p95 | `WebhookEvent.receivedAt` to `TherapyGap.createdAt` |
| RTO (Recovery Time Objective) | 30 min | ALB + multi-AZ RDS |
| RPO (Recovery Point Objective) | 5 min | RDS backups + 5-min tx log ship |

### C.3 Support SLAs (per §13.3)

| Severity | Response | Resolution |
|---|---|---|
| P0 | 15 min | 4 hours |
| P1 | 1 hour | 1 business day |
| P2 | 4 hours | 3 business days |
| P3 | 1 business day | Next release |

---

## Appendix D: Onboarding checklist template

Copy to `~TAILRD/customer-tdds/{slug}/ONBOARDING-CHECKLIST.md` and track per-customer.

```markdown
# Onboarding Checklist: {Customer Name}
Hospital ID: {hosp-042}
Kickoff: {date}
Target go-live: {date}

## Pre-contract (§1)
- [ ] MSA executed
- [ ] BAA term sheet agreed
- [ ] Requirements intake form complete

## Technical discovery (§2)
- [ ] TDD signed
- [ ] EHR path chosen: {Redox | Direct | Synthea}
- [ ] Data volume estimated: {N patients}
- [ ] SSO decision: {SSO | Local}

## Legal (§3)
- [ ] BAA executed
- [ ] DPA executed (if required)
- [ ] Vendor security review passed
- [ ] Upstream BAAs confirmed

## AWS tenant provisioning (§4)
- [ ] KMS key + alias
- [ ] S3 prefix
- [ ] Webhook secret

## Hospital record (§5)
- [ ] Hospital created
- [ ] Admin user created
- [ ] Redox webhook URL delivered to customer

## Module enablement (§6)
- [ ] Enabled modules match contract
- [ ] CMO sign-off on modules

## User provisioning (§7)
- [ ] Admin trained 1:1
- [ ] Bulk invites sent
- [ ] >=3 users accepted

## Data ingestion (§8)
- [ ] Export received / webhook live
- [ ] Ingestion completed with <1% error rate
- [ ] Data quality ranges passed

## Gap detection (§9)
- [ ] Run completed
- [ ] Module gap counts in expected ranges
- [ ] Evidence spot-check passed

## CMO validation (§10)
- [ ] Validation session held
- [ ] Punch-list resolved
- [ ] Signed acceptance memo

## Training (§11)
- [ ] Admin training complete
- [ ] >=80% clinician completion
- [ ] Clinical champion confirms readiness

## Go-live (§12)
- [ ] Smoke test passed
- [ ] notificationsEnabled = true
- [ ] First clinical login recorded
- [ ] Hypercare active

## Ongoing (§13)
- [ ] Monthly review scheduled
- [ ] QBR scheduled
```

---

## Notes + known gaps

Items not yet shipped but referenced in this runbook. Flag to CTO before promising to a customer.

- SSO (SAML/OIDC) multi-tenant support. Planned Phase B; until shipped, all users are local auth + MFA.
- `tailrd-ingest:12` task definition with batched writes. Shipped as part of `SCALE_REQUIREMENTS.md` Phase 1.
- `status.tailrd-heart.com` customer-facing status page. Not yet live.
- `cmoSignoffAt`, `goLiveAt`, `notificationsEnabled` fields on Hospital. Add to `schema.prisma` if missing (known stale-client pattern; verify before the next release).
- Per-tenant CloudWatch dashboards (§13.1). Currently a single shared dashboard; per-tenant filtering is a manual CloudWatch Insights query.
- Hospital delete API. §B.1 uses direct SQL; formal deletion endpoint is a roadmap item.
