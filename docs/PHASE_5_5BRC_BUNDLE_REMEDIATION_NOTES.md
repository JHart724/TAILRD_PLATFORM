# Phase 5 5-BRC Bundle Remediation Notes (5-BRC-06 + Q-5BRC-J sister-bundle)

**PR scope:** 5-BRC-06 P1.3.4 (P1.3.3a + P1.3.3b + P1.3.3c bundle PR)
**Date:** 2026-05-20
**Authors:** JHart (operator) + agent (P1.3.3a-c implementation)
**Status:** FIXED at PR commit; RESOLVED transition pending PR merge confirmation

This note is the consolidated implementation record for the 5-BRC bundle PR shipping under 5-BRC-06 (HIGH P1 GATE) with 5 sister-bundle co-remediations locked under Q-5BRC-J. It supplements but does not replace `docs/audit/AUDIT_FINDINGS_REGISTER.md` per-finding status notes; this file carries the bundle-level architectural narrative + manual smoke test procedure + future BA-cooperation pattern observation.

---

## 1. Bundle scope

The Q-5BRC-J operator decision (locked at P1.3.2) bundled 6 Phase 5 findings into a single PR to amortize the schema migration + state-machine engineering investment + audit-trail dual-emission discipline across sibling findings that shared the same underlying CFR / code-surface anchor.

| Finding | CFR | Severity | Scope contribution |
|---|---|---|---|
| 5-BRC-06 | 45 CFR §164.410 | HIGH (P1) GATE | Primary parent: BA-to-CE notification workflow (the catalyst) |
| 5-BRC-02 | 45 CFR §164.402 | MEDIUM-DOC | 4-factor risk assessment framework (schema fields + handler) |
| 5-BRC-03 | 45 CFR §164.404 | MEDIUM (P2) | BA-cooperation determination (baActsAsAgent boolean + rationale) |
| 5-BRC-05 | 45 CFR §164.408 | MEDIUM-DOC | HHS Secretary BA-cooperation (resolved via §164.410 CE-clock-start clarity) |
| 5-BRC-07 | 45 CFR §164.412 | DOC | Law-enforcement delay procedure (schema fields + handler) |
| 5-BRC-08 | 45 CFR §164.414(a)-(b) | MEDIUM-DOC | Burden-of-proof retention + 4-factor structured fields (sister 5-BRC-02) |

Each bundled finding remediates a CFR sub-section that has a direct dependency on either the new CoveredEntity model (P1.3.3a), the new BreachIncident.* schema extensions (P1.3.3a), or the new BA-to-CE state machine (P1.3.3b service + P1.3.3c routes). Bundling reduces 6 PRs of overlapping scope into 1 cohesive shipping unit.

---

## 2. Per-finding remediation tracking

Each finding's per-section status note in `AUDIT_FINDINGS_REGISTER.md` carries the IN_PROGRESS to FIXED transition record with deliverable cross-reference. This section is a flatter quick-reference table:

| Finding | Schema (P1.3.3a) | Service (P1.3.3b) | Route handler (P1.3.3c) | Test (P1.3.3c) |
|---|---|---|---|---|
| 5-BRC-06 | CoveredEntity model + 7 BreachStatus + 13 new BreachIncident fields + 7 HIPAA_GRADE_ACTIONS | coveredEntityService + breachCeNotificationService + auditLogger promotion + breach-ce-notification template | coveredEntity.ts (7 CRUD) + breachNotification.ts (7 CE workflow) | coveredEntity.test.ts (48) + breachCeNotification.test.ts (48) |
| 5-BRC-02 | fourFactorRiskAssessment + fourFactorRiskCompletedAt + fourFactorRiskCompletedBy | projectBreachToTemplateInput projects 4-factor onto template | POST /:id/four-factor-risk-assessment | sister-bundle suite |
| 5-BRC-03 | baActsAsAgent + baActsAsAgentRationale | template `agentLine` renders per-determination | POST /:id/ba-acts-as-agent | sister-bundle suite |
| 5-BRC-05 | CE-clock-start clarity at template §164.410 Agency Determination | (sister to 5-BRC-06 BA-cooperation path) | (sister to /ce-notification/send) | (sister to BA-to-CE suite) |
| 5-BRC-07 | lawEnforcementDelayActive + lawEnforcementDelayUntil + lawEnforcementDelayRationale | (no service; route directly updates) | POST /:id/law-enforcement-delay | sister-bundle suite |
| 5-BRC-08 | burdenOfProofRetentionUntil (auto-computed 6yr from discoveredAt on ack) | recordCeAcknowledgment computes burden-of-proof window | (covered by /ce-acknowledgment) | recordCeAcknowledgment suite |

---

## 3. Q-5BRC architectural decisions reference

The P1.3.2 operator decision lock fixed 10 architectural questions (Q-5BRC-A through Q-5BRC-J) that govern the bundle's implementation shape. Quick reference:

- **Q-5BRC-A A1** - CoveredEntity model is 1-to-N to Hospital (single CE per tenant pattern; multi-hospital health system arrangement via Hospital.coveredEntityId FK)
- **Q-5BRC-B B1** - 4-channel NotificationChannel framework (email v1.0 concrete via AWS SES; signedPdf + securePortal + sms v3.0 deferred to NotImplementedError)
- **Q-5BRC-C C1** - 7-state BA-to-CE state machine with VALID_STATE_TRANSITIONS map (CE_NOTIFICATION_QUEUED through CE_CLOSED; CE_FOLLOWUP cycle supported; terminal CE_CLOSED rejects all transitions)
- **Q-5BRC-D D1** - Async out-of-band acknowledgment recording (recordCeAcknowledgment captures source + timestamp + recordedBy; no in-app reply-portal v1.0)
- **Q-5BRC-E E1** - Template-with-variable-substitution (template source code carries no PHI; projectBreachToTemplateInput projects record fields at render time)
- **Q-5BRC-F F1** - Dual-emission audit trail (service-layer Winston-only via auditLogger + route-layer DB-persistent via writeAuditLog)
- **Q-5BRC-G G1** - Tenant-isolation at service layer via explicit assertTenantScope check + Layer-3 prismaTenantGuard pending generalization to non-hospitalId tenant FK column names (§17.1 architectural-precedent candidate flagged for P1.3.4 self-review)
- **Q-5BRC-H H1** - 60-day deadline calculation anchors to BreachIncident.discoveredAt + 60 days (template sixtyDayDeadline pre-computed projection; recordCeAcknowledgment auto-computes burden-of-proof window at 6 years from discoveredAt per §164.414(b))
- **Q-5BRC-I CONFIRMED** - RBAC pattern preserves SUPER_ADMIN (cross-tenant; required for breach platform-incident scope where breach.hospitalId can be null) + HOSPITAL_ADMIN (tenant-scoped management) + QUALITY_DIRECTOR (read-only for CE registry)
- **Q-5BRC-J YES bundle** - 5-BRC-06 + 5-BRC-02 + 5-BRC-03 + 5-BRC-05 + 5-BRC-07 + 5-BRC-08 bundled into single PR per shared schema migration + state-machine engineering investment

---

## 4. State machine verification

The VALID_STATE_TRANSITIONS map at `backend/src/services/breachCeNotificationService.ts:59-77` encodes the full BA-to-CE workflow. Verification matrix:

| From | Valid next states |
|---|---|
| DISCOVERED | CE_NOTIFICATION_QUEUED |
| INVESTIGATING | CE_NOTIFICATION_QUEUED |
| CONTAINED | CE_NOTIFICATION_QUEUED |
| RISK_ASSESSED | CE_NOTIFICATION_QUEUED |
| CE_NOTIFICATION_QUEUED | CE_NOTIFICATION_SENT |
| CE_NOTIFICATION_SENT | CE_NOTIFICATION_DELIVERED |
| CE_NOTIFICATION_DELIVERED | CE_ACKNOWLEDGED |
| CE_ACKNOWLEDGED | CE_FOLLOWUP_REQUESTED, CE_CLOSED |
| CE_FOLLOWUP_REQUESTED | CE_FOLLOWUP_RESPONDED |
| CE_FOLLOWUP_RESPONDED | CE_FOLLOWUP_REQUESTED, CE_CLOSED |
| CE_CLOSED | (terminal; rejects all) |

Test coverage at `backend/src/__tests__/breachCeNotification.test.ts` "VALID_STATE_TRANSITIONS map completeness" suite verifies:
- 4 entry-state acceptance (DISCOVERED + INVESTIGATING + CONTAINED + RISK_ASSESSED to CE_NOTIFICATION_QUEUED)
- Mid-flow rejection (CE_NOTIFICATION_SENT cannot re-queue)
- Terminal CE_CLOSED rejects all subsequent transitions
- CE_ACKNOWLEDGED dual-path (CE_FOLLOWUP_REQUESTED OR CE_CLOSED both valid)
- InvalidStateTransitionError payload (currentStatus + attemptedStatus + allowed-nexts in message)

CE_FOLLOWUP cycle test at "CE_FOLLOWUP cycle" suite verifies the full 4-step lifecycle: ACK to FOLLOWUP_REQUESTED to FOLLOWUP_RESPONDED to FOLLOWUP_REQUESTED to CLOSED, including the constraint that CE_FOLLOWUP_REQUESTED cannot directly close (must respond first; OCR investigator request-response pattern preservation).

---

## 5. §164.404(c)(1) content coverage (incorporated by reference at §164.410(c)(1))

The breach-ce-notification template renders all 6 required content sections per `backend/src/templates/breach-ce-notification.ts:149-193` (bodyText) + `:195-228` (bodyHtml). Coverage verified at `breachCeNotification.test.ts` "breach-ce-notification template" suite:

| §164.404(c)(1) sub | Section header in template | Source field on BreachIncident |
|---|---|---|
| (A) Identification of affected individuals | "164.404(c)(1)(A): Affected Individuals" | affectedRecords (count) + affectedPatientIds (description projection) |
| (B) Brief description of breach | "164.404(c)(1)(B): Description of the Breach" | incidentType + discoveredAt + description + (optional) breachOccurredAt |
| (C) Types of PHI involved | "164.404(c)(1)(C): Types of PHI Involved" | affectedFields (bulleted list) |
| (D) Steps individuals should take | "164.404(c)(1)(D): Steps Individuals Should Take" | DEFAULT_PHI_MITIGATION_STEPS constant (overridable v2.0) |
| (E) BA investigation + mitigation | "164.404(c)(1)(E): BA Investigation and Mitigation" | containmentActions || remediationPlan || default fallback |
| (F) Contact procedures | "164.404(c)(1)(F): Contact Procedures" | baContactName + baContactEmail + baContactPhone + (optional) baContactAddress |

Additional §164.410-specific elements rendered:
- 60-day deadline anchor ("164.410: Agency Determination" header with per-baActsAsAgent variant text per §164.402)
- §164.414(b) burden-of-proof acknowledgment request (Acknowledgment Request section)
- Subject line includes "45 CFR 164.410" + Breach ID for inbox-level audit-trail discipline

---

## 6. Tenant-isolation enforcement enumeration

Tenant-isolation is enforced at 3 architectural layers per Q-5BRC-G + AUDIT-011 + CLAUDE.md §14 NEVER DO rules 6-8:

**Layer 1: Route layer (req.user.hospitalId re-derivation)**
- `coveredEntity.ts` extractActor at lines 72-82
- `breachNotification.ts` extractCeActor at lines 419-428
- Sister-bundle handlers (four-factor + ba-acts-as-agent + law-enforcement-delay) at lines 620, 647, 673
- All re-derive tenantId from `req.user.hospitalId` (JWT-anchored); client-supplied tenantId in body/params NEVER trusted (rule 8)

**Layer 2: Service layer (assertTenantScope)**
- `coveredEntityService.assertTenantScope` at lines 163-169 (SUPER_ADMIN bypass; HOSPITAL_ADMIN tenant-scoped check)
- `breachCeNotificationService.loadBreachContext` at lines 195-197 (cross-tenant breach access throws TenantScopeViolationError)
- Service-layer queries use `where: { tenantId }` (coveredEntity) + `where: { hospitalId }` (breachIncident) explicit filters

**Layer 3: Prisma middleware (prismaTenantGuard)**
- `backend/src/lib/prismaTenantGuard.ts` HIPAA_GRADE_TENANT_MODELS list-based mandatory-filter enforcement
- CoveredEntity NOT in HIPAA_GRADE_TENANT_MODELS as of P1.3.3c (Layer 3 currently inspects `where.hospitalId` only; CoveredEntity uses `tenantId` column name)
- Layer 3 generalization to support any tenant-FK column name flagged as §17.1 architectural-precedent candidate at P1.3.4 self-review

Test coverage verifies tenant-isolation at all 3 layers:
- `coveredEntity.test.ts` cross-tenant tests for each of 7 service functions
- `breachCeNotification.test.ts` "tenant-isolation enforcement" suite (3 tests: cross-tenant rejected, SUPER_ADMIN bypass, breach-without-CE)
- Sister-bundle route tests verify `findFirst` calls use `req.user.hospitalId` for the tenant filter

---

## 7. Manual smoke test procedure

End-to-end manual smoke test for the 5-BRC bundle (post-merge in staging environment per `tailrd-staging` CFN stack):

**Prerequisites:**
- staging-api.tailrd-heart.com reachable (ALB DNS verified)
- SUPER_ADMIN JWT obtained via /api/auth/login
- USE_SES_EMAIL=false (SES sandbox; EMAIL_DISABLED log expected)

**Steps:**
1. **Register a Covered Entity (5-BRC-06 P1.3.3c D5):**
   ```
   POST /api/covered-entities
   { "name": "Test CE", "primaryContactEmail": "test-ce@example.invalid", "ceType": "HOSPITAL" }
   ```
   Expect 201 + body.success=true + body.data.id (capture as CE_ID).

2. **Create a test breach incident:**
   ```
   POST /api/breach-notifications
   { "discoveredAt": "2026-05-20T00:00:00Z", "incidentType": "UNAUTHORIZED_ACCESS",
     "severity": "HIGH", "description": "Smoke test", "affectedRecords": 5,
     "affectedFields": ["name", "dob"] }
   ```
   Expect 201 + body.data.id (capture as BREACH_ID).

3. **Queue BA-to-CE notification (5-BRC-06):**
   ```
   POST /api/breach-notifications/{BREACH_ID}/ce-notification/queue
   { "coveredEntityId": "{CE_ID}" }
   ```
   Expect 200 + data.status === "CE_NOTIFICATION_QUEUED".

4. **Send notification via email channel:**
   ```
   POST /api/breach-notifications/{BREACH_ID}/ce-notification/send
   { "channel": "email" }
   ```
   Expect 200 + data.status === "CE_NOTIFICATION_SENT" + data.ceNotifiedAt populated.
   CloudWatch should show "EMAIL_DISABLED" event (USE_SES_EMAIL=false sandbox).

5. **Record out-of-band delivery confirmation:**
   ```
   POST /api/breach-notifications/{BREACH_ID}/ce-notification/delivery
   { "channel": "email", "deliveredAt": "2026-05-20T00:10:00Z",
     "recipientConfirmation": "SES MessageId xyz" }
   ```
   Expect 200 + data.status === "CE_NOTIFICATION_DELIVERED" + statusHistory appended.

6. **Record async acknowledgment (5-BRC-08 burden-of-proof window):**
   ```
   POST /api/breach-notifications/{BREACH_ID}/ce-acknowledgment
   { "acknowledgedAt": "2026-05-20T01:00:00Z", "acknowledgmentSource": "email",
     "recordedBy": "compliance-officer" }
   ```
   Expect 200 + data.status === "CE_ACKNOWLEDGED" + data.ceAcknowledgedAt populated + data.burdenOfProofRetentionUntil === 2032-05-18 (6 years from discoveredAt).

7. **Record 4-factor risk assessment (5-BRC-02 + 5-BRC-08):**
   ```
   POST /api/breach-notifications/{BREACH_ID}/four-factor-risk-assessment
   { "fourFactorRiskAssessment": { "natureExtent": "moderate" },
     "fourFactorRiskCompletedAt": "2026-05-20T02:00:00Z",
     "fourFactorRiskCompletedBy": "risk-officer" }
   ```
   Expect 200 + data.fourFactorRiskCompletedBy populated.

8. **Record BA-acts-as-agent determination (5-BRC-03):**
   ```
   POST /api/breach-notifications/{BREACH_ID}/ba-acts-as-agent
   { "baActsAsAgent": false, "baActsAsAgentRationale": "TAILRD is non-agent BA; CE 60-day clock starts upon receipt" }
   ```
   Expect 200 + data.baActsAsAgent === false.

9. **Record law-enforcement delay (5-BRC-07):**
   ```
   POST /api/breach-notifications/{BREACH_ID}/law-enforcement-delay
   { "lawEnforcementDelayActive": false, "lawEnforcementDelayRationale": "No LE involvement in smoke test scenario" }
   ```
   Expect 200 + data.lawEnforcementDelayActive === false.

10. **Close the CE workflow:**
    ```
    POST /api/breach-notifications/{BREACH_ID}/ce-close
    ```
    Expect 200 + data.status === "CE_CLOSED".

11. **Verify audit trail (CloudWatch Logs Insights or DB query):**
    ```
    SELECT action, "resourceType", "resourceId" FROM "AuditLog"
    WHERE "resourceId" = '{BREACH_ID}' ORDER BY "createdAt";
    ```
    Expect 10+ audit events: BREACH_DATA_MODIFIED (queue) + BREACH_CE_NOTIFIED (send) + BREACH_DATA_MODIFIED (delivery) + BREACH_CE_ACKNOWLEDGED + 3 sister-bundle modifications + BREACH_DATA_MODIFIED (close) + 7 Winston-only audit_event entries from service layer (file + console).

12. **Tear down:**
    ```
    DELETE /api/covered-entities/{CE_ID}
    ```
    (BreachIncident left as audit trail per HIPAA retention; manual SQL cleanup in non-production only.)

---

## 8. 4 NEW AUDIT entries cross-reference

The bundle work surfaced 4 NEW findings tracked in `docs/audit/AUDIT_FINDINGS_REGISTER.md`:

- **AUDIT-088** (MEDIUM P2; v3.0 schema-hygiene): BreachIncident.hospitalId lacks `@relation` FK declaration at schema.prisma:2113-2115 (sister patient-data models declare it; orphan-row hygiene risk if hospital ever hard-deleted; tenant-isolation at app layer currently provides defense)
- **AUDIT-089** (LOW P3; XS fix): breachNotification.ts:693-694 dual-export `module.exports = router; export default router;` makes `.default` undefined under TS compilation; D10 test required workaround codified inline with AUDIT-089 reference comment
- **AUDIT-090** (MEDIUM P2 §164.410(c); v3.0 channel-expansion): PDF-signing infrastructure absence; signedPdf channel throws NotImplementedError per Q-5BRC-B v1.0 deferral; v3.0 candidate for §17.1 architectural-precedent codification
- **AUDIT-091** (MEDIUM P2; v2.0 CI/CD discipline): P1.3.3b prisma generate Docker discipline; WSL stale-client risk surfaces if maintainer skips Windows-side Prisma client regen post-schema-change; CI/CD docker-build pre-merge gate recommended

---

## 9. §17.1 architectural-precedent candidate observation: BA-cooperation pattern

The 5-BRC-06 bundle demonstrates a **BA-cooperation pattern** that may merit §17.1 architectural-precedent codification at P1.3.4 self-review. The pattern characteristics:

1. **Multi-CFR cooperation surfaces** - A single CFR primary obligation (§164.410 BA-to-CE notification) carries explicit cooperation responsibilities with sister CFR sections (§164.404 individual + §164.406 media + §164.408 HHS + §164.412 LE delay + §164.414 burden-of-proof). The BA-side workflow implementation is the cooperation anchor for the CE-side workflow.

2. **State machine as cooperation contract** - The 7-state BA-to-CE state machine functions as a formal cooperation contract: each state transition is a documented BA-to-CE communication boundary (queue, send, deliver, acknowledge, followup-cycle, close). The state machine durably records WHEN the BA fulfilled its primary obligation and WHEN the CE confirmed receipt (anchoring the CE's downstream 60-day clock).

3. **Dual-emission audit per cooperation event** - Each state transition emits BOTH a Winston-only audit (operational visibility) AND a writeAuditLog DB entry (HIPAA-graded burden-of-proof record). This is the cooperation contract's evidentiary anchor per §164.414(b).

4. **Template-with-variable-substitution per cooperation message** - The template carries no PHI; record fields project in at render time (Q-5BRC-E). Cooperation messages are reproducible from the durable BreachIncident record.

5. **Channel framework with deferral discipline** - 4-channel notification framework (email + signedPdf + securePortal + sms) with v1.0/v3.0 scope tiering + explicit NotImplementedError for deferred channels. Cooperation messages can ship via the highest-trust available channel; deferred channels surface explicit errors rather than silent fallbacks.

If codified, this would be the **22nd §17.1 architectural-precedent** entry, sister to AUDIT-022 phased-rollout precedent + AUDIT-076 HIPAA_GRADE_ACTIONS narrow-set precedent. Codification target: standalone methodology PR per AUDIT-064 + AUDIT-087 precedent (NOT bundled in this 5-BRC PR per §17.3 scope discipline).

---

**End of bundle remediation notes.**
