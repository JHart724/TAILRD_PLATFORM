# TAILRD Heart Platform -- Master Audit Report
## Phase 1: April 7, 2026
## 6 Specialist Agents + Codex Adversarial Review

---

## Severity Distribution

| Domain | CRITICAL | HIGH | MEDIUM | LOW | Total |
|--------|----------|------|--------|-----|-------|
| Security Pentest | 4 | 8 | 5 | 2 | 19 |
| Clinical Codes | 1 | 6 | 4 | 1 | 12 |
| HIPAA Compliance | 3 | 12 | 8 | 3 | 26 |
| Infrastructure | 3 | 9 | 10 | 3 | 25 |
| UI/UX Design | 1 | 12 | 9 | 2 | 24 |
| Data Pipeline | 2 | 5 | 5 | 3 | 15 |
| **TOTAL** | **14** | **52** | **41** | **14** | **121** |

---

## CRITICAL FINDINGS (14)

### Security (4)
1. **SEC-C1:** terraform.tfvars + .terraform/ committed to git with AWS account/VPC/KMS IDs
2. **SEC-C2:** Session token hash mismatch in accountSecurity.ts -- password change, session list/delete all broken
3. **SEC-C3:** Mass assignment PUT /admin/users/:userId -- req.body to prisma.user.update() allows role escalation
4. **SEC-C4:** GOD View globalSearch queries patients across ALL hospitals, returns PHI, no MFA

### Clinical (1)
5. **CLIN-C1:** Hydralazine-ISDN rule checks `gender === 'BLACK'` -- race param silently dropped (function accepts 5 params, caller passes 6). A-HeFT Class 1 LOE A is 100% non-functional.

### HIPAA (3)
6. **HIPAA-C1:** WebhookEvent.rawPayload stores full FHIR bundles unencrypted (all 18 Safe Harbor identifiers)
7. **HIPAA-C2:** ingestSynthea.ts creates standalone PrismaClient bypassing encryption middleware
8. **HIPAA-C3:** WebhookEvent records never purged -- persist indefinitely with full PHI

### Infrastructure (3)
9. **INFRA-C1:** .terraform/ providers committed to git
10. **INFRA-C2:** terraform.tfvars committed with live AWS infrastructure IDs
11. **INFRA-C3:** local.common_tags referenced but never defined -- breaks terraform plan

### UI/UX (1)
12. **UIUX-C1:** No "data as of" timestamp on ANY clinical data view

### Data Pipeline (2)
13. **DATA-C1:** processSynthea.ts ensureHospital() has 12 schema field mismatches
14. **DATA-C2:** MedicationStatus 'STOPPED' not in enum -- medications silently dropped

---

## TOP 20 PRE-DEMO FIX LIST

| # | Finding | Effort | Why |
|---|---------|--------|-----|
| 1 | Fix `gender === 'BLACK'` -- add race param | 10min | Patient safety, Class 1 guideline broken |
| 2 | Whitelist fields in PUT /admin/users/:userId | 15min | Privilege escalation |
| 3 | `git rm --cached terraform/terraform.tfvars .terraform/` | 15min | AWS secrets in git |
| 4 | Add `local.common_tags` to terraform/main.tf | 5min | Unblocks terraform plan |
| 5 | Fix 4 gender enum mismatches ('male'/'F' -> 'MALE'/'FEMALE') | 10min | 4 gap rules silently broken |
| 6 | Change "Initiate warfarin" to "Consider warfarin" | 5min | FDA CDS exemption |
| 7 | Map FHIR 'stopped' -> 'DISCONTINUED' in processSynthea | 5min | Medications silently dropped |
| 8 | Fix session token hash in accountSecurity.ts | 1h | Session management broken |
| 9 | Create LoginSession after MFA verify | 1h | Post-MFA tokens fail in prod |
| 10 | Apply requireMFA to all PHI routes | 2h | MFA bypassed on 80% of routes |
| 11 | Add evidence objects to 19 gap rules | 3h | FDA CDS exemption |
| 12 | Add hospice/pregnancy checks to 12 early rules | 2h | Recommending drugs to hospice patients |
| 13 | Add "data as of" timestamp to clinical views | 2h | Clinician trust/safety |
| 14 | Whitelist fields in POST /hospitals/:hospitalId/users | 15min | Permission override |
| 15 | Add VIEWER to PHI_REDACTED_ROLES | 5min | VIEWER sees full PHI |
| 16 | Set Redis auth_token in elasticache.tf | 1h | Redis accessible without credentials |
| 17 | Set Cognito mfa_configuration = "ON" | 5min | HIPAA mandatory MFA |
| 18 | Add Order/Recommendation/WebhookEvent to DSAR deletion | 2h | DSAR misses PHI tables |
| 19 | Remove @ts-nocheck from gapDetectionRunner.ts | 4h | Type safety on critical clinical file |
| 20 | Add CloudWatch alarms + SNS topic | 3h | No monitoring in production |

---

## Full agent reports preserved in task output files.
## Phase 2 pending: Multi-tenancy, EHR/CDS Hooks, God View, Demo Walkthrough.
