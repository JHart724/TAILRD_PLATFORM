# Phase 5 Report - HIPAA Compliance Gap Analysis

**Phase:** 5 of 7 (Phase 0A continuation)
**Dimension:** HIPAA + compliance gap analysis. 45 CFR Part 164 Subparts A + C + D + E (Security Rule, Breach Notification Rule, Privacy Rule BA-applicable subset, Classification + General Provisions), 45 CFR Part 160 Subparts A through E (Enforcement Rule), 2013 Omnibus Final Rule cross-cutting modifications.
**Executed:** 2026-05-20
**Auditor:** jhart
**Framework:** `docs/audit/AUDIT_FRAMEWORK.md` v1.0; methodology stack §1, §17, §17.1, §17.3, §17.5, §18 per `docs/audit/AUDIT_METHODOLOGY.md`. §16 NOT triggered this phase (no clinical-code surface re-audit per operator Q5).
**Companion docs:** `docs/audit/AUDIT_FINDINGS_REGISTER.md`, `docs/audit/PHASE_3_REPORT.md`, `docs/audit/PHASE_4_REPORT.md`, `docs/PATH_TO_ROBUST.md`, `docs/BAA_REGISTER.md`, `docs/BAA_REQUIREMENTS.md`

---

## 1. Executive Summary

**Verdict: CONDITIONAL PASS.** Sister to Phase 1/2/3/4 precedent. 2 HIGH P1 GATE findings (5-ADM-09 + 5-BRC-06) with documented remediation roadmaps; pre-BSW-DUA-signature timing aligns with gate-closure window. See §7 for full verdict prose.

**Phase 5 scope:** Option A robust posture per operator scope-lock at B5.2. UNION of HIPAA Security Rule + Breach Notification Rule + Privacy Rule BA-applicable subset + Enforcement Rule + Omnibus Rule modifications. Sister to Phase 4 scope expansion (~25-40h actual vs ~10h v1.2 budget). v1.2 PATH_TO_ROBUST.md L61 budget ~15-20h; Phase 5 actual ~25-40h estimated. v1.2 L61 update deferred to v2.0 PATH_TO_ROBUST authorship as Phase 0 exit deliverable.

**5W summary:**
- **Who:** TAILRD as Business Associate (BA) per B5.2.0 canonical-grep determination across 7 source surfaces (`docs/BAA_REGISTER.md`, `docs/BAA_REQUIREMENTS.md`, `docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md`, `docs/audit/AUDIT_FRAMEWORK.md`, `docs/audit/PHASE_2_PHI_FIELD_MAP.md`, `backend/src/routes/internalOps.ts`, `backend/src/validation/clinicalSchemas.ts`)
- **What:** HIPAA compliance gap analysis across applicable subparts
- **When:** Phase 0A audit arc; methodology PR #286 strengthened mechanism stack (DRIFT-44 em-dash discipline + DRIFT-45 chat-side canonical-doc grep pre-flight active for Phase 5 work block)
- **Where:** TAILRD CDS platform; AWS hosted (ECS Fargate + Aurora ServerlessV2 + S3 + KMS + CloudWatch + SES)
- **Why:** BSW pilot pre-DUA window provides regulatory audit window before live PHI traffic; data-state-independent compliance posture per Phase 3 precedent

**Findings recorded this phase: 52 new register entries** across 10 domains. Severity distribution: 2 HIGH (P1) GATE / 5 MEDIUM (P2) / 7 MEDIUM-DOCUMENTATION / 4 LOW (P3) / 6 LOW-DOCUMENTATION / 19 DOCUMENTATION / 7 CROSSREF / 2 N/A. Per §18 register-literal discipline, full register-severity table at AUDIT_FINDINGS_REGISTER.md Phase 5 section.

**Gate-class candidates (post B5.4.1 evidence gathering; 2 confirmed HIGH P1 GATE + 1 MEDIUM P2 downgraded from escalation candidate):**

1. **5-ADM-09 BAA execution gap** (Administrative Safeguards §164.308(b)): **HIGH (P1) GATE confirmed.** Two surfaces: (a) sub-vendor BAAs PENDING (AWS / Redox / ElastiCache per `docs/BAA_REGISTER.md`); (b) customer-hospital BAA tracking capability gap per `TAILRD_COMPLETE_PLATFORM_AUDIT.md:889` (no automated PHI-flow-gating against BAA-execution state). Cross-references §164.502(e) Privacy Rule (5-PRV-03). See §4.2.
2. **5-BRC-06 BA-to-CE notification workflow gap** (Breach Notification Rule §164.410): **HIGH (P1) GATE confirmed.** `backend/src/routes/breachNotification.ts:1-348` implements CE-to-HHS direct workflow; MISSING §164.410 BA-primary-obligation path (no `ceNotifiedAt` field; no `CE_NOTIFIED` status; no CE-side endpoint; no BA-as-agent determination per §164.402). Severe CMP exposure per Omnibus 2013. See §4.7.
3. **5-TEC-06 Transmission security** (Technical Safeguards §164.312(e)): **MEDIUM (P2) preserved** (downgraded from HIGH P1 escalation candidate per B5.4.1 evidence: strong TLS posture at `tailrd-staging.yml:578` (TLS13-1-2-2021-06) + strong HSTS at `server.ts:129-133` (1-year maxAge + preload)). Gap is production IaC codification (sister to AUDIT-082 + Phase 4 4-APM-02 pattern). See §4.4.

**Verdict-rubric per operator Q3:**
- **PASS:** zero gate-class findings; all in-scope dimensions meet HIPAA-grade bar; no P0; all P1 findings carry active remediation roadmap
- **CONDITIONAL PASS:** gate-class findings exist with documented remediation roadmap; phase passes pending those remediations (sister to Phase 1/2/3/4 precedent)
- **FAIL:** HIGH P1 findings concentrated above remediation-tolerable density; phase blocks downstream phases

---

## 2. Methodology

### 2.1 Scope determination process

Canonical PATH_TO_ROBUST.md L61 anchor: "Phase 5: HIPAA compliance gap analysis (~15-20h); depends on Phase 1 Tier A in flight." Broad framing of "HIPAA compliance gap analysis" interpreted per Option A robust posture (operator B5.2 scope-lock decision Q1).

**DRIFT-45 firing at B5.1.2:** Operator B5 kickoff prompt narrowed scope to "HIPAA Security Rule technical safeguards (45 CFR § 164.312)". Canonical doc L61 said "HIPAA compliance gap analysis" (broader). Mechanism (codified in PR #286 AGENT_DRIFT_REGISTRY) fired at pre-flight inventory; operator corrected to Option A union-scope per 2026-05-03 extend-timeline-not-scope posture + 2026-05-07 robust-over-consistent-with-existing posture. Sister to PR #285 PAUSE B.1 Source C scope divergence and PR #287 L.1 sister-scope catch.

**Operator B5.2 scope-lock summary:**
- Q1 Option A: full HIPAA compliance gap analysis
- Q1a: TAILRD-as-BA determination per B5.2.0 canonical-grep verification
- Q2: extend Phase 3 §6 cross-walk baseline (sister-phase continuity)
- Q3: PASS / CONDITIONAL PASS / FAIL rubric sister to Phase 4
- Q4: branch `feat/phase-0a-phase-5-hipaa-gap-audit`
- Q5: PHI encryption middleware re-audit OUT OF SCOPE per §17.3 + §17.1 entry 20 dismissal-at-consumption framing

### 2.2 Cross-walk extension from Phase 3 §6 baseline

`PHASE_3_REPORT.md` §6 L213-L219 surfaced 5 HIPAA dimensions with "addressed by" mapping to existing AUDIT-NN findings:
1. §164.308(a)(7)(ii)(B) DR plan testing -> AUDIT-078
2. §164.308(a)(1)(ii)(D) Information System Activity Review -> AUDIT-076
3. §164.312(a)(1) access control + §164.502 minimum necessary -> AUDIT-071
4. §164.312(a)(2)(iv) encryption/decryption -> AUDIT-016 + AUDIT-075
5. §164.312(b) audit controls -> AUDIT-013

Phase 5 extends this to **10 domains** covering Option A robust posture scope per B5.2.2 cross-walk extension (per-§ table). Phase 3 baseline 5 dimensions retained as starting cross-references in `§4 Per-Domain Findings`; expanded to full HIPAA framework coverage.

### 2.3 Severity calibration framework

Per operator Q-A Tier 1 classification at outline + downgrade-at-evidence pattern per `decision_frameworks`:

| Tier | Meaning |
|---|---|
| HIGH (P1) | OCR-enforcement-trigger class; PHI exposure risk; CMP exposure; production-readiness gate |
| MEDIUM (P2) | Material gap; non-gate but pre-DUA blocker class |
| LOW (P3) | Hygiene / efficiency / minor non-compliance |
| INFO | Architectural observation; not a remediation target at current scale |
| DOCUMENTATION | Policy / procedure / cadence documentation gap (HIPAA-inherent documentation requirement) |
| CROSSREF | Existing AUDIT-NN finding covers; this Phase 5 row references for completeness without re-derivation |
| N/A | Provision categorically inapplicable to TAILRD as BA |

### 2.4 Out-of-scope enumeration

Per operator B5.2.3 scope-lock + §17.3 scope discipline:

| Item | CFR citation | Rationale |
|---|---|---|
| Transactions and Code Sets | 45 CFR Part 162 | TAILRD does not process EDI billing transactions (837/835/270/271 etc.); canonical-grep at B5.2.3 returned NO EDI surface; matches were RxNorm CUIs + AI model memory params |
| Re-audit of resolved AUDIT-NN code-surface | AUDIT-013, AUDIT-015, AUDIT-016, AUDIT-022, AUDIT-071, AUDIT-075, AUDIT-084 | Existing RESOLVED arcs cover code-surface; Phase 5 cross-references at status verification layer per operator Q5 + §17.1 entry 20 dismissal-at-consumption framing |
| Privacy Rule provisions for Covered Entities only | §164.520 (Notice of Privacy Practices), §164.522, §164.530(a)/(b)/(d)/(e)/(f)/(g)/(h)/(i) full sets | TAILRD = BA; CE-only Privacy Rule provisions inapplicable beyond BA-cooperation subset (per operator Q1a locked scope) |
| Group health plan requirements | §164.314(b) | N/A; TAILRD is not a group health plan |
| Procedures for hearings | Part 160 Subpart E | Procedural-regulatory; not applicable absent enforcement action |

### 2.5 Methodology stack applied

| Section | Status this phase |
|---|---|
| §1 rule-body verification | Applied at HIPAA citation layer (CFR section anchors per finding; 45 CFR Part 164 vs Part 160 vs Part 162 distinction enforced; Omnibus modifications cited where applicable) |
| §16 clinical-code verification | NOT triggered (no clinical-code re-audit per operator Q5) |
| §17 PR acceptance criteria | Applied (correctness + verification + scope + process) |
| §17.1 architectural-precedent catalog | 0 new precedents surfaced. Phase 5 applies existing entries 20 (dismissal-at-consumption at 5-PRV-02) and 21 (logs-only observability at 5-TEC-03) as sister-references; no novel architectural-precedent codification required |
| §17.3 scope discipline | Applied (Option A scope locked at B5.2; no mid-block reduction) |
| §17.5 pre-PR self-review | Applied at B5.3.4 outline self-review STOP |
| §18 status-surface discipline | Applied (verdict table severity mirrors register entries verbatim at B5.5; no re-derivation at verdict layer) |

DRIFT-44 + DRIFT-45 mechanism updates from PR #286 active throughout Phase 5 work block. DRIFT-44 (em-dash pre-flight scan) applies to ALL writing per project instructions; chat-side surface + agent prose + table separators + in-line clauses + file content. DRIFT-45 (chat-side canonical-doc grep pre-flight) applies to scope-bearing assertions throughout.

---

## 3. TAILRD HIPAA Classification (Business Associate)

### 3.1 BA status determination

TAILRD = Business Associate. Determined via B5.2.0 canonical-grep across 7 source surfaces:

| Source | Citation | Evidence |
|---|---|---|
| `docs/BAA_REGISTER.md` | L1 to L17 | "TAILRD Business Associate Agreement Register" tracks BAAs TAILRD requires FROM AWS, Redox, ElastiCache (sub-vendors) |
| `docs/BAA_REQUIREMENTS.md` | L3 | "HIPAA requires a BAA with every third party that receives, stores, processes...PHI" |
| `docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md` | L78 | "BAA term sheet shared, route to customer Privacy Officer for redline"; TAILRD signs BAAs WITH customer hospitals (= Covered Entities) |
| `docs/audit/AUDIT_FRAMEWORK.md` | L49 | Phase 5 explicit: "HIPAA + compliance gap analysis (Privacy Rule, Security Rule, Breach Notification, BAA coverage)" |
| `docs/audit/PHASE_2_PHI_FIELD_MAP.md` | L76 | "covered entity employees" framing applied to customer hospital workforce (not TAILRD's) |
| `backend/src/routes/internalOps.ts` | L27, L31, L40 | BAA tracking endpoints (admin tracks BAAs signed with customer hospitals + sub-vendors) |
| `backend/src/validation/clinicalSchemas.ts` | L245 to L248 | `createBAASchema` + "INTERNAL OPS - BAA & ONBOARDING" section |

### 3.2 BA-specific obligation scope

Per HIPAA Omnibus Final Rule 2013, Business Associates have direct liability under:

| Rule | TAILRD-as-BA applicability |
|---|---|
| Security Rule (§164.302-318) | FULL (direct BA liability post-Omnibus 2013) |
| Breach Notification Rule (§164.400-414) | FULL (with §164.410 BA-specific notification path to CE as primary obligation) |
| Privacy Rule (§164.500-534) | BA-applicable subset only (per operator-locked Q1a scope list) |
| Enforcement Rule (45 CFR Part 160) | FULL (BA direct CMP liability per tiered structure) |
| Transactions and Code Sets (45 CFR Part 162) | NON-APPLICABLE (verified via grep; no EDI surface) |

### 3.3 Sub-BA / downstream BAA chain

TAILRD acts as contracting party requiring BAAs FROM downstream sub-vendors:

| Sub-vendor | PHI exposure | BAA status (per `docs/BAA_REGISTER.md` 2026-04-07 snapshot) |
|---|---|---|
| AWS (RDS, S3, ECS, CloudWatch, SES) | Database, files, logs, email | PENDING - accept via AWS Artifact |
| Redox | Full FHIR bundles | PENDING - contact Redox legal |
| ElastiCache (AWS) | Potential cached PHI | Covered by AWS umbrella BAA (confirm) |
| GitHub | Source code only (no PHI) | N/A |
| CloudFront (AWS) | No PHI (static frontend) | Covered by AWS BAA |

Sub-BA execution gaps anchor **5-ADM-NN BAA execution gate-class candidate** in §5.

### 3.4 CE-relationship surface

TAILRD signs BAAs WITH customer hospitals (= Covered Entities under HIPAA). Onboarding workflow per `docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md`:

| Phase | Citation | Deliverable |
|---|---|---|
| Pre-contract | §1 | Signed MSA + BAA term sheet |
| Kickoff | §2, §3 | Executed BAA + DPA |

BSW pilot pre-DUA-signature state means BAA execution timing is operator-side; production data flow gates on BAA execution.

---

## 4. Per-Domain Findings

Finding skeletons per B5.2.2 cross-walk extension. Each finding: ID, CFR citation, standard name, existing AUDIT-NN coverage, gap description (TBD prose at B5.4), DRAFT severity (per Q-A calibration), code-surface anchor (file-level at outline; TBD-grep markers for line-level), cross-reference, remediation path (TBD prose at B5.4).

### 4.1 Domain 5-CLS (Classification + General Provisions)

Subsections: §164.102 to §164.106 (Subpart A) + §164.302 to §164.306 (Security Rule general provisions).

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-CLS-01 | §164.103 | BA definition + status | None (implicit; B5.2.0 canonical-grep determined) | DOCUMENTATION | `docs/BAA_REGISTER.md:1`, `docs/BAA_REQUIREMENTS.md:1-38` |
| 5-CLS-02 | §164.306 | General Security Rule requirements (flexibility / scalability) | AUDIT-076 (partial) | DOCUMENTATION | None (policy-layer) |

#### Finding 5-CLS-01

- **CFR:** §164.103 Definitions (Business Associate; Covered Entity; PHI).
- **Gap statement:** TAILRD's BA classification is established by canonical-grep across 7 source surfaces at B5.2.0 (see §3.1) but is NOT formally documented as a HIPAA compliance attestation. `docs/BAA_REGISTER.md` and `docs/BAA_REQUIREMENTS.md` implicitly assume BA status without explicit attestation document. New operators reading the codebase have no single canonical statement of TAILRD's HIPAA classification.
- **Severity:** DOCUMENTATION (operator-discoverable policy gap; no production-risk; not a remediation gate).
- **Cross-references:** see 5-ADM-09 (BA contracts surface); see 5-OMN-01 (BA direct liability documentation).
- **Remediation:** Author `docs/HIPAA_CLASSIFICATION.md` attesting TAILRD-as-BA per Omnibus 2013 with sub-BA chain (AWS, Redox, ElastiCache) + CE-relationship (customer hospitals); cross-reference from `BAA_REGISTER.md`, `BAA_REQUIREMENTS.md`, `CLAUDE.md` §12. Estimated: 1-2h.

#### Finding 5-CLS-02

- **CFR:** §164.306 Security standards (general rules: flexibility of approach + scalability).
- **Gap statement:** §164.306(b) requires BAs to "use any security measures that allow the covered entity or business associate to reasonably and appropriately implement the standards and implementation specifications." Flexibility-of-approach decisions made across the audit arc (e.g., AUDIT-016 envelope V0/V1/V2; AUDIT-011 three-state TENANT_GUARD_MODE; AUDIT-076 narrow HIPAA_GRADE_ACTIONS) are documented inline but not consolidated into a §164.306 compliance posture statement.
- **Severity:** DOCUMENTATION (sister-pattern to 5-CLS-01; consolidated attestation).
- **Cross-references:** see AUDIT-016 / AUDIT-011 / AUDIT-076 (flexibility-of-approach exemplars); see 5-PNP-01 (formal P&P documentation surface).
- **Remediation:** Section in `docs/HIPAA_CLASSIFICATION.md` (or sister-doc) consolidating flexibility-of-approach rationale per major Security Rule decision. Estimated: 1-2h bundled with 5-CLS-01.

### 4.2 Domain 5-ADM (Administrative Safeguards §164.308)

8 standards + 22 implementation specifications.

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-ADM-01 | §164.308(a)(1)(i)-(ii) | Security management process | AUDIT-076 (sister §164.308(a)(1)(ii)(D)); AUDIT-082, AUDIT-083 (sister §164.308(a)(1)(ii)(B)) | MEDIUM-DOCUMENTATION | None (policy-layer) |
| 5-ADM-02 | §164.308(a)(2) | Assigned security responsibility | None | DOCUMENTATION | None (policy-layer) |
| 5-ADM-03 | §164.308(a)(3) | Workforce security (authorization / supervision / clearance / termination) | None | MEDIUM-DOCUMENTATION | None (policy-layer) |
| 5-ADM-04 | §164.308(a)(4) | Information access management (isolating BA function; access auth; access establish / modify) | AUDIT-011 (Layer 3 tenant guard); AUDIT-077 (defense-in-depth) | LOW-DOCUMENTATION | `backend/src/lib/prismaTenantGuard.ts` |
| 5-ADM-05 | §164.308(a)(5) | Security awareness + training | None | MEDIUM-DOCUMENTATION | None (policy-layer) |
| 5-ADM-06 | §164.308(a)(6) | Security incident procedures | Partial (`backend/docs/incident-runbooks.md`); 4-RNB-02 from Phase 4 (sister) | MEDIUM (P2) | `backend/docs/incident-runbooks.md` |
| 5-ADM-07 | §164.308(a)(7)(i)-(ii) | Contingency plan (DR, emergency mode, testing, app / data criticality) | AUDIT-078 (RESOLVED-IN-PROGRESS); Day 9-11 runbooks | MEDIUM (P2) | `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` |
| 5-ADM-08 | §164.308(a)(8) | Periodic technical / non-technical evaluation | AUDIT-001 referenced; existing audit framework partially satisfies | LOW (P3) | None (process-layer) |
| 5-ADM-09 | §164.308(b)(1)-(4) | **BA contracts and other arrangements** | `docs/BAA_REGISTER.md` PENDING items + customer-hospital tracking surface | **HIGH (P1) GATE** | `docs/BAA_REGISTER.md`; `backend/src/routes/internalOps.ts:31-48` |

#### Finding 5-ADM-01

- **CFR:** §164.308(a)(1)(i)-(ii) Security management process (risk analysis, risk management, sanction policy, information system activity review).
- **Gap statement:** Risk analysis is partially performed via this audit arc + Phase 1-4 reports + AUDIT-076 (information system activity review at HIPAA_GRADE_ACTIONS layer) + AUDIT-082 (terraform risk classification) + AUDIT-083 (CVE risk classification). However, no consolidated `docs/HIPAA_RISK_ANALYSIS.md` exists; sanction policy for workforce HIPAA violations is undocumented; periodic info system activity review cadence is undocumented.
- **Severity:** MEDIUM-DOCUMENTATION (multi-implementation-spec gap; risk analysis is a Required (not Addressable) implementation specification under §164.308(a)(1)(ii)(A); auditor flags missing risk analysis as direct §164.308 non-compliance).
- **Cross-references:** see AUDIT-076 (HIPAA_GRADE_ACTIONS narrow; activity-review sister surface); see AUDIT-082, AUDIT-083 (risk management precedents); see Phase 1-4 reports (de facto risk analysis evidence).
- **Remediation:** Author `docs/HIPAA_RISK_ANALYSIS.md` consolidating Phase 0A audit findings + threat scenarios + likelihood/impact ratings; author sanction-policy paragraph in `docs/HIPAA_POLICIES.md`; document activity-review cadence at logger.ts header. Estimated: 6-10h.

#### Finding 5-ADM-02

- **CFR:** §164.308(a)(2) Assigned security responsibility (designated security official).
- **Gap statement:** No documented designation of TAILRD security officer. Operator (jhart) appears to be de facto security responsible party but no formal designation in `CLAUDE.md`, `docs/`, or HR documentation.
- **Severity:** DOCUMENTATION (Required implementation specification under §164.308(a)(2); auditor expects single named official).
- **Cross-references:** see 5-ADM-01 (sanction policy + security management process); see 5-ADM-05 (training program).
- **Remediation:** Append §"HIPAA Security Officer Designation" to `docs/HIPAA_POLICIES.md` or `CLAUDE.md` §"Key Contacts" naming the security officer + role responsibilities + escalation path. Estimated: 30min.

#### Finding 5-ADM-03

- **CFR:** §164.308(a)(3) Workforce security (authorization / supervision, workforce clearance, termination procedures).
- **Gap statement:** No documented workforce security procedures. Onboarding/offboarding for TAILRD workforce members touching PHI not codified. `backend/src/routes/admin.ts` and IAM policies cover access provisioning at infrastructure layer (cross-reference AUDIT-011) but workforce-level procedures (background checks, signed confidentiality agreements, supervision of workforce-with-PHI-access) are not documented.
- **Severity:** MEDIUM-DOCUMENTATION (Addressable implementation specifications; auditor expects documented procedure even at single-operator scale).
- **Cross-references:** see AUDIT-011 (tenant-isolation Layer 3; infrastructure-layer access discipline); see 5-ADM-05 (training); see 5-ADM-04 (access management).
- **Remediation:** Author `docs/HIPAA_WORKFORCE_SECURITY.md` covering authorization/supervision/clearance/termination procedures. Trigger event for production scale: first additional workforce member with PHI access. Estimated: 4-6h.

#### Finding 5-ADM-04

- **CFR:** §164.308(a)(4) Information access management (isolating BA function, access authorization, access establishment/modification).
- **Gap statement:** AUDIT-011 Layer 3 Prisma `$extends` extension provides structural tenant isolation; AUDIT-077 catalogs defense-in-depth gaps. However, formal access-authorization workflow document (request -> approve -> provision -> review) and access-establishment/modification procedure not codified.
- **Severity:** LOW-DOCUMENTATION (strong technical controls at AUDIT-011; gap is documentation layer for workflow/procedure).
- **Cross-references:** see AUDIT-011 (Layer 3 tenant guard; RESOLVED); see AUDIT-077 (defense-in-depth hygiene; OPEN); see 4-3PL-02 (plane separation; MEDIUM P2 Phase 4).
- **Remediation:** Author `docs/HIPAA_ACCESS_MANAGEMENT.md` describing access-grant workflow + periodic access review cadence. Estimated: 2-3h.

#### Finding 5-ADM-05

- **CFR:** §164.308(a)(5) Security awareness and training (security reminders, malicious software protection, login monitoring, password management).
- **Gap statement:** No documented HIPAA security awareness + training program. At single-operator scale this is largely an attestation-of-self-trained-officer; at production scale with multiple workforce members it becomes a structured training program with delivery + tracking + refresh cadence.
- **Severity:** MEDIUM-DOCUMENTATION (Addressable; auditor expects documented program even at single-operator scale).
- **Cross-references:** see 5-ADM-02 (security officer designation); see 5-ADM-03 (workforce security).
- **Remediation:** Author `docs/HIPAA_TRAINING_PROGRAM.md` documenting training content + delivery method + tracking surface + annual refresh cadence. v2.0 carry-forward for workforce expansion. Estimated: 3-5h.

#### Finding 5-ADM-06

- **CFR:** §164.308(a)(6) Security incident procedures (response and reporting).
- **Gap statement:** `backend/docs/incident-runbooks.md` provides broad incident response prose. Phase 4 finding 4-RNB-02 (MEDIUM P2 OPEN) catalogs the gap: no `docs/runbooks/INCIDENT_*.md` per-incident-class actionable runbooks (no 5xx surge runbook, no auth-failure-storm runbook, no PHI breach response runbook).
- **Severity:** MEDIUM (P2) - CROSSREF to Phase 4 4-RNB-02 (sister at Phase-4-operational-maturity layer).
- **Cross-references:** see 4-RNB-02 (Phase 4 missing incident-response runbooks); see 5-BRC-06 (HIGH P1 GATE; sister BA-breach-notification surface).
- **Remediation:** Bundle with 4-RNB-02 remediation. Author `docs/runbooks/INCIDENT_PHI_BREACH.md` with §164.308(a)(6) + §164.402 (breach definition) + §164.410 BA-to-CE notification trigger criteria. Cross-references 5-BRC-06 workflow. Estimated: 4-6h.

#### Finding 5-ADM-07

- **CFR:** §164.308(a)(7)(i)-(ii) Contingency plan (data backup, disaster recovery, emergency mode operation, testing and revision, applications and data criticality analysis).
- **Gap statement:** AUDIT-078 IN-PROGRESS (Phase C SHIPPED 2026-05-08) addresses Aurora backup config + restore-test runbook + DR plan testing. Day 9-11 cutover runbooks document one-off DR exercise but no periodic-testing cadence. Application/data criticality analysis (which PHI columns + Hospital + AuditLog tables are mission-critical) not formally documented.
- **Severity:** MEDIUM (P2) - CROSSREF to AUDIT-078 IN-PROGRESS.
- **Cross-references:** see AUDIT-078 (Aurora backup IaC + restore-test; IN PROGRESS Phase C SHIPPED); see 5-PHY-04 (device/media controls; sister backup surface).
- **Remediation:** Operator-side restore-test execution per `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` §5 closes AUDIT-078. Periodic testing cadence + criticality analysis can land in `docs/HIPAA_CONTINGENCY_PLAN.md` consolidating with AUDIT-078 deliverables. Estimated: bundled with AUDIT-078 closure + 2-3h consolidation.

#### Finding 5-ADM-08

- **CFR:** §164.308(a)(8) Evaluation (periodic technical and non-technical evaluation).
- **Gap statement:** Phase 0A audit framework itself partially satisfies §164.308(a)(8): Phase 1-5 reports + AUDIT_FINDINGS_REGISTER provide technical and non-technical evaluation evidence. However, periodic-evaluation cadence (annual minimum per HHS guidance) not formally documented. AUDIT-001 Tier A (test coverage 0.87%) cites §164.312(b) / §164.308(a)(8) as severity rationale (Phase 1 report L143).
- **Severity:** LOW (P3) - audit framework satisfies; gap is cadence documentation.
- **Cross-references:** see AUDIT-001 (Tier A test coverage; OPEN; foundational evaluation gap); see Phase 1-5 reports (de facto evaluation evidence).
- **Remediation:** Append §"Periodic Evaluation Cadence" to `docs/HIPAA_POLICIES.md` declaring annual Phase-0A-style audit cycle + quarterly register review. Estimated: 1h.

#### Finding 5-ADM-09 (HIGH P1 GATE; authored at B5.4.1)

**CFR citation:** 45 CFR §164.308(b)(1) Standard: Business associate contracts and other arrangements; §164.308(b)(3) Implementation specifications: Written contract or other arrangement; §164.314(a) sister organizational requirement. Per Omnibus 2013, BAs have direct CMP liability for failure to enter into compliant BAAs with sub-BAs.

**Gap statement:** Two distinct BAA execution surfaces present gaps, both load-bearing for HIPAA §164.308(b) compliance:

*Surface A: Sub-vendor BAAs (TAILRD as contracting party requiring BAAs FROM sub-BAs):* `docs/BAA_REGISTER.md` (last updated 2026-04-07) lists 3 PENDING items: (a) AWS BAA accept via AWS Artifact console (covers RDS / S3 / KMS / ECS / CloudWatch / SES / ElastiCache umbrella); (b) Redox BAA execute before production EHR connection; (c) ElastiCache umbrella coverage verify via AWS Artifact. Production task `tailrd-backend:123` is running on Aurora with no executed AWS BAA on file per `BAA_REGISTER` snapshot.

*Surface B: Customer-hospital BAAs (TAILRD as BA receiving PHI FROM Covered Entity hospitals):* tracking surface partially exists at `backend/src/routes/internalOps.ts:31-48` via `Onboarding` model querying `stepName: 'BAA_EXECUTION'`. Per `docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md:465`, "SLA: same-day once BAA signed" confirms BAA execution is the gating step in hospital onboarding. However, `docs/TAILRD_COMPLETE_PLATFORM_AUDIT.md:889` flags the higher-capability gap: "BAA tracking | Nothing | Upload signed BAA to S3, mark hospital BAA-complete, gate PHI flow until signed." No automated PHI-flow-gating against BAA-execution state. BSW pilot is pre-DUA-signature per `CLAUDE.md` §12.

**Implication:** If TAILRD processes PHI from any customer hospital pre-BAA-execution: (a) §164.308(b) Administrative Safeguards violation; (b) §164.502(e) Privacy Rule violation for unauthorized disclosure (cross-reference 5-PRV-03); (c) OCR enforcement exposure under Omnibus 2013 BA direct liability with tiered CMP up to $1.5M per violation category per year per §160.404. Sub-vendor surface compounds risk: TAILRD passes PHI to AWS / Redox / ElastiCache without executed downstream BAAs, exposing chain-of-custody gaps that auditor or breach-investigator will trace upstream.

**Severity:** **HIGH (P1) GATE** preserved per B5.3 outline. Severity floor is direct OCR enforcement trigger; not downgradeable to MEDIUM until both surfaces close (BAA_REGISTER PENDING items resolved + customer-hospital PHI-flow-gating capability shipped).

**Cross-references (full register-style first appearance per Q-D):**

| Finding | Severity | Status | Cross-reference |
|---|---|---|---|
| AUDIT-082 | LOW (P3) | OPEN | `terraform/` decommissioned RDS reconciliation deferred; cites §164.308(a)(1)(ii)(B) Risk Management; sister at infrastructure-debt classification surface |
| AUDIT-085 | (varies) | OPEN | Production migration execution environment gap (VPC-isolated Aurora); cites §164.312(a)(2)(iv) encryption-at-rest implementation completeness; sister at sub-vendor-PHI-touch surface |

Sister cross-references (shorthand): see AUDIT-083 (CVE remediation §164.308(a)(1)(ii)(B)); see 5-ORG-01 (BA contract terms §164.314(a)); see 5-PRV-03 (Disclosures to BAs §164.502(e)); see 5-OMN-02 (BA + sub-BA accountability chain).

**Remediation path:**

1. **Surface A remediation:** Operator-side BAA execution before production PHI traffic. (a) Accept AWS BAA via `console.aws.amazon.com/artifact`; (b) Execute Redox BAA via Redox legal; (c) Verify ElastiCache umbrella coverage via AWS Artifact query. Update `docs/BAA_REGISTER.md` Action Items checkboxes. Estimated: 2 to 4h operator-side wall-clock; gating dependency: AWS account access + Redox contact. **Pre-DUA-signature timing aligns with BSW pilot data-flow gate.**
2. **Surface B remediation:** Implement automated PHI-flow-gating against `Onboarding` model `BAA_EXECUTION` state. Per `TAILRD_COMPLETE_PLATFORM_AUDIT.md:889` capability gap: upload signed BAA to S3 (encrypted; HIPAA §164.312(a)(2)(iv) per AUDIT-016 envelope); mark Hospital model BAA-complete via Onboarding step transition; gate patient-data-ingestion routes (`backend/src/routes/patients.ts`, FHIR ingestion in `backend/src/redox/`) on Hospital.baaExecuted boolean. Estimated: 8 to 16h implementation; v2.0 carry-forward candidate if BSW timing forces interim manual-process.
3. **Sister-AUDIT cross-reference:** see 5-PRV-03 (sub-BA disclosure documentation); see 5-ORG-01 (BA contract terms audit).

### 4.3 Domain 5-PHY (Physical Safeguards §164.310)

4 standards + 10 implementation specifications.

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-PHY-01 | §164.310(a)(1)-(2) | Facility access controls | None | DOCUMENTATION-CROSSREF | AWS shared-responsibility (datacenter physical = AWS BAA coverage) |
| 5-PHY-02 | §164.310(b) | Workstation use | None | DOCUMENTATION | None (policy-layer) |
| 5-PHY-03 | §164.310(c) | Workstation security | None | DOCUMENTATION | None (policy-layer) |
| 5-PHY-04 | §164.310(d)(1)-(2) | Device and media controls (disposal, media re-use, accountability, data backup / storage) | AUDIT-078 (backup posture); Aurora encryption-at-rest (AWS-managed) | DOCUMENTATION | `docs/runbooks/AUDIT_078_AURORA_BACKUP_RESTORE_RUNBOOK.md` |

#### Finding 5-PHY-01

- **CFR:** §164.310(a)(1)-(2) Facility access controls (contingency operations, facility security plan, access control and validation, maintenance records).
- **Gap statement:** TAILRD is cloud-hosted on AWS (ECS Fargate + Aurora + S3). Per AWS shared-responsibility model, datacenter physical access controls are AWS's responsibility under the AWS BAA. The gap is documenting this cross-reference in TAILRD compliance posture so auditor can trace facility-access-control attestation to AWS SOC 2 + AWS BAA + AWS Artifact compliance reports.
- **Severity:** DOCUMENTATION-CROSSREF (compliance posture cross-reference; no TAILRD-side action beyond BAA execution per 5-ADM-09).
- **Cross-references:** see 5-ADM-09 (HIGH P1 GATE; AWS BAA PENDING execution); see `docs/BAA_REGISTER.md`.
- **Remediation:** Append §"AWS Shared Responsibility Model" to `docs/HIPAA_POLICIES.md` (or sister-doc) cross-referencing AWS BAA + AWS SOC 2 reports as facility-access-control evidence. Estimated: 1h.

#### Finding 5-PHY-02

- **CFR:** §164.310(b) Workstation use (policies and procedures for proper functions/manners of performance + physical attributes of surroundings of specific workstation or class of workstation).
- **Gap statement:** No documented workstation use policy for TAILRD workforce. At single-operator scale the policy is implicit; at production scale with multiple workforce members it becomes a documented expectation (locked screens, no PHI-on-personal-devices, no public-wifi without VPN, etc.).
- **Severity:** DOCUMENTATION (Addressable implementation specification; auditor expects documented policy).
- **Cross-references:** see 5-ADM-03 (workforce security); see 5-ADM-05 (training program).
- **Remediation:** Author `docs/HIPAA_WORKSTATION_POLICY.md` or section in `HIPAA_POLICIES.md`. v2.0 carry-forward for workforce expansion. Estimated: 1-2h.

#### Finding 5-PHY-03

- **CFR:** §164.310(c) Workstation security (physical safeguards for all workstations that access electronic PHI, to restrict access to authorized users).
- **Gap statement:** Sister-pattern to 5-PHY-02 at the workstation-hardening layer (FDE, screen-lock auto-timeout, removable-media restrictions, etc.). No documented workstation hardening policy.
- **Severity:** DOCUMENTATION (sister to 5-PHY-02).
- **Cross-references:** see 5-PHY-02 (workstation use); see 5-ADM-03 (workforce security).
- **Remediation:** Bundle with 5-PHY-02 in workstation policy document. Estimated: bundled.

#### Finding 5-PHY-04

- **CFR:** §164.310(d)(1)-(2) Device and media controls (disposal, media re-use, accountability, data backup and storage).
- **Gap statement:** AUDIT-078 IN-PROGRESS Phase C SHIPPED addresses Aurora backup posture (BackupRetentionPeriod=35 + DeletionProtection=true + final pre-decom snapshot 6-year retention per `CLAUDE.md` §9). However, formal device-disposal policy + secure-deletion verification procedure not documented. AWS RDS predecessor decommissioning (per AUDIT-082) provides operational case study but not a documented policy.
- **Severity:** DOCUMENTATION (AUDIT-078 covers technical backup posture; gap is policy layer).
- **Cross-references:** see AUDIT-078 (Aurora backup + restore-test; IN PROGRESS); see AUDIT-082 (terraform / decommissioned RDS; OPEN); see 5-ADM-07 (contingency plan; sister surface).
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` (or sister-doc) documenting device/media controls policy. Cross-reference AUDIT-078 + AUDIT-082. Estimated: 1-2h.

### 4.4 Domain 5-TEC (Technical Safeguards §164.312)

5 standards + 9 implementation specifications.

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-TEC-01 | §164.312(a)(1) | Access control (unique user ID, emergency access, automatic logoff, encryption) | AUDIT-009 (MFA), AUDIT-010 (refresh token), AUDIT-011 (tenant guard), AUDIT-071 (cdsHooks RESOLVED) | LOW (P3) | `backend/src/middleware/auth.ts`, `backend/src/lib/prismaTenantGuard.ts`, `backend/src/middleware/cdsHooksAuth.ts` |
| 5-TEC-02 | §164.312(a)(2)(iv) | Encryption-at-rest (addressable) | AUDIT-016 (RESOLVED), AUDIT-022 (RESOLVED), AUDIT-075 (RESOLVED), AUDIT-084 (RESOLVED), AUDIT-085 (OPEN) | CROSSREF (OPEN-tracked AUDIT-085) | `backend/src/middleware/phiEncryption.ts`, `backend/src/services/keyRotation.ts`, `backend/src/services/kmsService.ts` (cross-ref AUDIT-016/075/084/085) |
| 5-TEC-03 | §164.312(b) | Audit controls | AUDIT-013 (RESOLVED dual-transport), AUDIT-076 (OPEN), AUDIT-086 (RESOLVED) | CROSSREF (LOW P3 OPEN-tracked AUDIT-076) | `backend/src/middleware/auditLogger.ts`, `backend/src/utils/logger.ts` (cross-ref AUDIT-013/076/086) |
| 5-TEC-04 | §164.312(c)(1)-(2) | Integrity (mechanism to authenticate PHI) | AUDIT-015 (RESOLVED); AUDIT-016 V2 envelope GCM AEAD integrity | LOW-DOCUMENTATION | `backend/src/middleware/phiEncryption.ts`, `backend/src/services/keyRotation.ts` (cross-ref AUDIT-015/016) |
| 5-TEC-05 | §164.312(d) | Person-or-entity authentication | AUDIT-009 (DEPLOYED flag-off), AUDIT-012 | LOW (P3) - CROSSREF AUDIT-009 | `backend/src/middleware/auth.ts` (cross-ref AUDIT-009) |
| 5-TEC-06 | §164.312(e)(1)-(2) | Transmission security (integrity controls, encryption-in-transit) | None explicit (existing posture verified at B5.4.1); strong TLS at staging + strong HSTS at app layer | **MEDIUM (P2)** (downgraded from HIGH P1 escalation candidate per B5.4.1 evidence) | `backend/src/server.ts:120-134`; `infrastructure/cloudformation/tailrd-staging.yml:576-579` |

#### Finding 5-TEC-01

- **CFR:** §164.312(a)(1) Standard: Access control; (2) Implementation specifications: (i) Unique user identification (Required), (ii) Emergency access procedure (Required), (iii) Automatic logoff (Addressable), (iv) Encryption and decryption (Addressable; see 5-TEC-02).
- **Gap statement:** Unique user identification: `User.id` UUID + `User.email` per `backend/prisma/schema.prisma`; satisfied. AUDIT-011 Layer 3 tenant guard provides structural access scoping. AUDIT-071 RESOLVED cdsHooks tenant isolation. AUDIT-009 MFA opt-in DEPLOYED (flag-off pending controlled rollout per CLAUDE.md). Gaps: (a) emergency access procedure (break-glass workflow for incident response) not documented; (b) automatic logoff configuration (session timeout) not codified in policy doc; (c) per `backend/src/middleware/auth.ts` session timeout exists at JWT-expiry level but not explicitly tied to §164.312(a)(2)(iii).
- **Severity:** LOW (P3) (strong technical controls via AUDIT-009/011/071; gap is documentation + emergency-access procedure).
- **Cross-references:** see AUDIT-009 (MEDIUM P2 DEPLOYED flag-off; person-or-entity authentication); see AUDIT-010 (refresh token; OPEN); see AUDIT-011 (Layer 3 tenant guard; IN-PROGRESS Phase b/c SHIPPED); see AUDIT-071 (cdsHooks; RESOLVED).
- **Remediation:** Document emergency-access procedure in `docs/runbooks/INCIDENT_*.md` (bundles with 4-RNB-02 + 5-ADM-06); document automatic-logoff configuration in `docs/HIPAA_ACCESS_MANAGEMENT.md` (bundles with 5-ADM-04). Estimated: 2-3h bundled.

#### Finding 5-TEC-02

- **CFR:** §164.312(a)(2)(iv) Encryption and decryption (Addressable implementation specification).
- **Gap statement:** Encryption-at-rest covered by AUDIT-016 full arc (PRs #255 + #260 + #261; V2 envelope + KMS wiring; RESOLVED 2026-05-07), AUDIT-022 (legacy JSON PHI backfill; RESOLVED 2026-05-07), AUDIT-075 (PHI encryption coverage; RESOLVED 2026-05-08), AUDIT-084 (PR 2 task-def deployment gap; RESOLVED 2026-05-10). AUDIT-085 (migration execution environment VPC-isolated) remains OPEN; cross-reference at status verification layer per operator Q5.
- **Severity:** CROSSREF (OPEN-tracked AUDIT-085).
- **Cross-references:** see AUDIT-016 (HIGH P1 RESOLVED; full PHI key rotation arc); see AUDIT-022 (MEDIUM P2 RESOLVED; legacy JSON PHI backfill); see AUDIT-075 (MEDIUM P2 RESOLVED; PHI encryption coverage); see AUDIT-084 (HIGH P1 RESOLVED; task-def deployment gap); see AUDIT-085 (OPEN; production migration execution environment).
- **Remediation:** AUDIT-085 progresses through its own remediation arc per operator Q5. Phase 5 cross-references at status verification layer per §17.1 entry 20 dismissal-at-consumption framing. No new Phase 5 action.

#### Finding 5-TEC-03

- **CFR:** §164.312(b) Audit controls (hardware, software, procedural mechanisms that record and examine activity in information systems that contain or use ePHI).
- **Gap statement:** AUDIT-013 (audit log dual-transport DB + CloudWatch; RESOLVED 2026-04-30) covers durable audit trail. AUDIT-086 (tenant-guard bypass-key strip; RESOLVED 2026-05-11) closed latent audit_db_write_failed regression. AUDIT-076 (HIPAA_GRADE_ACTIONS narrow set; OPEN) catalogs the ongoing-promotion-candidate surface: events like `DATA_REQUEST_FULFILLED`, `BREACH_INCIDENT_CREATED`, `MFA_ENABLED/DISABLED`, `INVITE_ACCEPTED`, `GAP_RESOLVED` not yet HIPAA-graded (best-effort DB writes; do not throw on failure).
- **Severity:** CROSSREF (LOW P3 OPEN-tracked AUDIT-076).
- **Cross-references:** see AUDIT-013 (HIGH P1 RESOLVED; dual-transport audit logging); see AUDIT-076 (LOW P3 OPEN; HIPAA_GRADE_ACTIONS narrow set); see AUDIT-086 (HIGH P1 RESOLVED; tenant-guard bypass-key strip); see 4-ALR-01, 4-ALR-02, 4-APM-01 (Phase 4 observability cluster; sister "logs-only observability" rationale per §17.1 entry 21).
- **Remediation:** AUDIT-076 progresses through its own remediation arc. Phase 5 cross-references at status verification layer. Cross-reference Phase 4 §17.1 entry 21 logs-only-observability-stance rationale: logging is the DECISION layer (acceptable at pilot scale per §17.1 codification); alerting + APM is the Phase 4 gap layer (gate items 4-ALR-01/02 + 4-APM-01).

#### Finding 5-TEC-04

- **CFR:** §164.312(c)(1) Standard: Integrity (policies and procedures to protect ePHI from improper alteration or destruction); (2) Implementation specification: Mechanism to authenticate ePHI (Addressable).
- **Gap statement:** AUDIT-015 (decrypt returns ciphertext on integrity failure; RESOLVED 2026-04-30) closed the fail-silent ciphertext-leak gap. AUDIT-016 V2 envelope uses AES-256-GCM AEAD providing integrity tag per ciphertext. Gap is documentation layer: no formal integrity-control policy + no periodic integrity-check cadence (e.g., GCM-tag-verification audit job sampling N% of PHI rows per quarter to detect silent corruption).
- **Severity:** LOW-DOCUMENTATION (strong technical controls; gap is policy + cadence).
- **Cross-references:** see AUDIT-015 (RESOLVED; integrity-fail-loud); see AUDIT-016 (RESOLVED; AES-256-GCM AEAD); see 5-TEC-02 (encryption-at-rest CROSSREF).
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` describing integrity controls (AEAD + envelope V2); optional cadence: periodic GCM-tag-verification audit job (v2.0 carry-forward). Estimated: 1-2h.

#### Finding 5-TEC-05

- **CFR:** §164.312(d) Person or entity authentication.
- **Gap statement:** AUDIT-009 (MFA opt-in per user; DEPLOYED 2026-04-30 with flag-off pending controlled rollout) covers MFA capability. AUDIT-012 RESOLVED (verify endpoint session-validity). Flag-on enforcement timeline not yet codified.
- **Severity:** LOW (P3) - CROSSREF AUDIT-009.
- **Cross-references:** see AUDIT-009 (MEDIUM P2 DEPLOYED flag-off; HIPAA §164.312(d) cited inline as severity rationale at register L288); see AUDIT-012 (verify endpoint).
- **Remediation:** Document MFA flag-on timeline at `docs/HIPAA_ACCESS_MANAGEMENT.md` (bundles with 5-ADM-04 + 5-TEC-01); operator-side decision on enforcement window vs controlled-rollout per pilot risk-tolerance. Estimated: bundled with 5-ADM-04.

#### Finding 5-TEC-06 (MEDIUM P2; authored at B5.4.1; severity preserved from B5.3 DRAFT after evidence gathering)

**CFR citation:** 45 CFR §164.312(e)(1) Standard: Transmission security; §164.312(e)(2)(i) Integrity controls; §164.312(e)(2)(ii) Encryption (addressable implementation specification).

**Gap statement:** Transmission security posture is STRONG at staging IaC + application layer, but production IaC codification gap mirrors the AUDIT-082 + Phase 4 4-APM-02 sister pattern (production resources provisioned out-of-band; staging codified but production posture lives in AWS console state).

*Evidence of strong posture at codified layers:*
- `backend/src/server.ts:120-134`: helmet middleware with HSTS configured at `maxAge: 31536000` (1 year), `includeSubDomains: true`, `preload: true`. CSP active with restrictive `defaultSrc: ["'self'"]` + `scriptSrc: ["'self'"]`. Application-layer transmission security exceeds HHS guidance baseline.
- `infrastructure/cloudformation/tailrd-staging.yml:576-579`: ALB HTTPS listener with `SslPolicy: ELBSecurityPolicy-TLS13-1-2-2021-06`. This policy enforces TLS 1.2 minimum, TLS 1.3 preferred, modern cipher suites (no RC4 / 3DES / NULL / EXPORT ciphers). Certificates configured via ACM.

*Gap surface:*
- **Production ALB SslPolicy NOT codified in `infrastructure/cloudformation/`.** Only staging cluster CFN is in repo per AUDIT-078 production-cluster-out-of-band pattern. Production ALB listener SslPolicy lives in AWS console state; configuration drift between staging (TLS13-1-2-2021-06) and production (unknown) creates audit reproducibility risk identical to AUDIT-082 terraform / Aurora ACU codification gap.
- **DMS rollback Lambda weak SSL posture:** `infrastructure/lambdas/dmsRollback/index.js:142,176` sets `ssl: { rejectUnauthorized: false }` for Postgres connections during DMS rollback automation. Acceptable for one-off DMS Lambda (not in PHI hot path; only fires during DMS replication failure), but documents weak posture surface that auditor will flag. Cross-reference: this Lambda is decommissioned-RDS-adjacent infrastructure per AUDIT-082.

**Implication:** §164.312(e) transmission security is technically met at runtime per staging IaC + app-layer HSTS + HTTPS-only browsers; the gap is IaC codification completeness (auditor demands repo-grep verification not console-spelunking) + Lambda hygiene (auditor flags `rejectUnauthorized: false` even on non-hot-path code). NOT direct OCR enforcement exposure given runtime posture is strong; thus MEDIUM P2 floor preserved (downgraded from HIGH P1 B5.3 escalation candidate per B5.4.1 evidence-gathering).

**Severity:** **MEDIUM (P2)** preserved per B5.3 DRAFT after B5.4.1 evidence gathering. Per `decision_frameworks` "classify Tier 1; downgrade with evidence" pattern: HIGH P1 escalation candidate at outline; downgraded to MEDIUM P2 after evidence surfaced strong runtime TLS posture. Sister to Phase 4 4-APM-02 LOW P3 (production codification gap; sister pattern at Aurora ACU layer).

**Cross-references (full register-style first appearance per Q-D):**

| Finding | Severity | Status | Cross-reference |
|---|---|---|---|
| AUDIT-082 | LOW (P3) | OPEN | `terraform/` decommissioned RDS reconciliation deferred; sister at production-IaC-codification-gap surface |
| 4-APM-02 | LOW (P3) | OPEN (Phase 4) | Aurora ACU calibration not codified for production; sister at staging-codified-vs-production-console-state pattern |

Sister cross-references (shorthand): see AUDIT-078 (production Aurora backup config not in IaC; sister IaC codification pattern); see 4-3PL-03 (single ECS task role; sister organizational-debt surface).

**Remediation path:**

1. **Codify production ALB SslPolicy in `infrastructure/cloudformation/`.** Author production CFN template mirroring `tailrd-staging.yml:576-579` with `SslPolicy: ELBSecurityPolicy-TLS13-1-2-2021-06` + Certificates ARN per production ACM cert. Estimated: 2 to 4h. Sister to AUDIT-XXX-future-aurora-cfn-import work block; consider bundling.
2. **DMS rollback Lambda hygiene.** Replace `ssl: { rejectUnauthorized: false }` with proper CA bundle if Lambda is retained; or decommission Lambda alongside AUDIT-082 terraform tree cleanup. Estimated: 1 to 2h or bundled with AUDIT-082 cleanup.
3. **TLS posture verification:** Run `openssl s_client -connect api.tailrd-heart.com:443 -tls1_2` to confirm production TLS posture matches staging codification. Estimated: 15min operator-side verification.

### 4.5 Domain 5-ORG (Organizational Requirements §164.314)

2 standards + 6 implementation specifications.

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-ORG-01 | §164.314(a)(1)-(2) | Business associate contracts (uses + disclosures permitted; sub-BA flowdown; reporting; safeguards; access; amendment; termination) | `docs/BAA_REGISTER.md` PENDING items | MEDIUM (P2) | `docs/BAA_REGISTER.md`, `docs/BAA_REQUIREMENTS.md` |
| 5-ORG-02 | §164.314(b) | Group health plan requirements | N/A | N/A | None (categorically inapplicable) |

#### Finding 5-ORG-01

- **CFR:** §164.314(a)(1) Standard: Business associate contracts or other arrangements; §164.314(a)(2) Implementation specifications: BA contract provisions (permitted uses/disclosures; sub-BA flowdown; reporting; safeguards; individual access; amendment; accounting; termination).
- **Gap statement:** Sister to 5-ADM-09 at the BA contract terms layer. `docs/BAA_REGISTER.md` tracks BAA execution status; `docs/BAA_REQUIREMENTS.md` outlines vendor-side BAA expectations. Gap: no audit of actual BAA contract terms against §164.314(a)(2) required provisions checklist. Per Omnibus 2013, BAAs must explicitly include sub-BA flowdown clause + reporting requirements + termination-for-noncompliance provisions.
- **Severity:** MEDIUM (P2) (contract-terms audit is direct §164.314 implementation specification; sister to 5-ADM-09 HIGH P1 GATE at execution layer).
- **Cross-references:** see 5-ADM-09 (HIGH P1 GATE; BAA execution); see 5-PRV-03 (Disclosures to BAs); see 5-PRV-04 (BA contract terms CROSSREF).
- **Remediation:** Append BAA contract-terms checklist to `docs/BAA_REQUIREMENTS.md` mapping each §164.314(a)(2) provision to vendor BAA template language; verify each PENDING BAA execution against the checklist before signature. Estimated: 3-4h.

#### Finding 5-ORG-02

- **CFR:** §164.314(b) Requirements for group health plans.
- **Gap statement:** N/A. TAILRD is a clinical decision support BA; not a group health plan. Group health plan provisions inapplicable.
- **Severity:** N/A.
- **Cross-references:** None.
- **Remediation:** None required. Inapplicability documented in §2.4 out-of-scope enumeration.

### 4.6 Domain 5-PNP (Policies and Procedures + Documentation §164.316)

2 standards.

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-PNP-01 | §164.316(a) | Implement reasonable and appropriate policies | `docs/runbooks/` (12 runbooks); CLAUDE.md | MEDIUM-DOCUMENTATION | `docs/runbooks/` |
| 5-PNP-02 | §164.316(b)(1)-(2) | Documentation: written / electronic + retention 6 years + availability + updates | None explicit | LOW-DOCUMENTATION | None (policy-layer) |

#### Finding 5-PNP-01

- **CFR:** §164.316(a) Standard: Policies and procedures (implement reasonable and appropriate policies and procedures to comply with the standards, implementation specifications, or other requirements of this subpart).
- **Gap statement:** TAILRD has substantial operational documentation: `docs/runbooks/` (12 runbooks including AUDIT_022, AUDIT_071, AUDIT_078, AUDIT_016 PR 3 migration); `CLAUDE.md` with project-wide rules including HIPAA-relevant safeguards (§14 NEVER DO list); `docs/audit/AUDIT_METHODOLOGY.md` for audit-side discipline; `BAA_REGISTER.md` + `BAA_REQUIREMENTS.md` for BA-contract tracking. Gap is the LACK of a consolidated HIPAA-specific policies-and-procedures document set per §164.316(a). Operational runbooks satisfy the substance; formal HIPAA P&P documentation set is missing.
- **Severity:** MEDIUM-DOCUMENTATION (auditor expects clear HIPAA P&P documentation surface; current substance is in operational docs but not labeled as HIPAA P&P).
- **Cross-references:** see all 5-ADM findings (sister Administrative-Safeguards P&P scope); see 5-CLS-01, 5-CLS-02 (sister classification + general-provisions documentation surface).
- **Remediation:** Author `docs/HIPAA_POLICIES.md` consolidating Phase 5 documentation deliverables (HIPAA classification + risk analysis + workforce security + access management + training program + contingency plan + breach response + integrity controls + audit controls + workstation policy + device/media controls + BA contract terms). Estimated: 8-12h consolidation (most content sourced from operational docs).

#### Finding 5-PNP-02

- **CFR:** §164.316(b)(1) Documentation: written or electronic record; (2)(i) Time limit (retention 6 years from creation or last effective date); (b)(2)(ii) Availability (available to those persons responsible for implementing the procedures); (b)(2)(iii) Updates (review periodically and update as needed).
- **Gap statement:** No documented retention policy for HIPAA P&P documentation. Aurora HIPAA-tagged final snapshot has 6-year retention per CLAUDE.md §9; sister principle should apply to HIPAA policies, audit reports, training records, and incident records.
- **Severity:** LOW-DOCUMENTATION.
- **Cross-references:** see 5-PNP-01 (sister P&P surface); see 5-PHY-04 (device/media controls retention sister).
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` documenting 6-year retention for HIPAA documents + availability + periodic review cadence. Estimated: 30min bundled with 5-PNP-01.

### 4.7 Domain 5-BRC (Breach Notification Rule §164.400-414)

8 standards. **BA primary obligation via §164.410.** Code-surface anchor: `backend/src/routes/breachNotification.ts` (8 HIPAA / 164 hits at B5.1.6 inventory).

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-BRC-01 | §164.400-401 | Applicability + Definitions | None | DOCUMENTATION | None (definitions layer) |
| 5-BRC-02 | §164.402 | Breach definition + 4-factor risk assessment | None | MEDIUM-DOCUMENTATION | None (policy-layer) |
| 5-BRC-03 | §164.404 | Notification to individuals (60-day; method; content) | `backend/src/routes/breachNotification.ts` present | MEDIUM (P2) | `backend/src/routes/breachNotification.ts` |
| 5-BRC-04 | §164.406 | Media notice (if >=500 in state / jurisdiction) | None | DOCUMENTATION | None (policy-layer) |
| 5-BRC-05 | §164.408 | Notification to HHS Secretary | None | MEDIUM-DOCUMENTATION | None (policy-layer) |
| 5-BRC-06 | §164.410 | **BA notification to CE** (TAILRD primary obligation) | `backend/src/routes/breachNotification.ts` present BUT implementation positioned as CE-to-HHS direct flow; missing BA-primary-obligation §164.410 workflow per B5.4.1 evidence | **HIGH (P1) GATE** | `backend/src/routes/breachNotification.ts:1-348` |

#### Finding 5-BRC-01

- **CFR:** §164.400 Applicability; §164.401 Definitions (Breach, Unsecured PHI).
- **Gap statement:** Breach definition + unsecured PHI definition not documented in TAILRD compliance posture. Per §164.402, "breach" means acquisition / access / use / disclosure of PHI not permitted under Privacy Rule which compromises PHI security or privacy. Per §164.402, "unsecured PHI" means PHI not rendered unusable/unreadable/indecipherable per HHS guidance (AES-256-GCM at rest per AUDIT-016 V2 envelope satisfies the safe-harbor test).
- **Severity:** DOCUMENTATION (definitions consolidation; foundation for 5-BRC-02 through 5-BRC-08 workflow).
- **Cross-references:** see AUDIT-016 (V2 envelope AES-256-GCM; satisfies §164.402 unsecured-PHI safe-harbor); see 5-BRC-02 (4-factor risk assessment).
- **Remediation:** Author definitions section in `docs/runbooks/INCIDENT_PHI_BREACH.md` (bundles with 5-ADM-06 + 5-BRC-02). Estimated: 1h bundled.

#### Finding 5-BRC-02

- **CFR:** §164.402 Definition of breach (4-factor risk assessment introduced by Omnibus 2013 replacing pre-2013 harm-threshold standard).
- **Gap statement:** 4-factor risk assessment framework not documented. Per Omnibus 2013, an impermissible use/disclosure is presumed a breach UNLESS the BA demonstrates low-probability-of-compromise per: (1) nature/extent of PHI involved including identifiers + likelihood of re-identification; (2) the unauthorized person who used PHI or to whom disclosure was made; (3) whether PHI was actually acquired or viewed; (4) the extent to which risk has been mitigated. `backend/src/routes/breachNotification.ts:25-37` createBreachSchema captures `description, affectedRecords, affectedFields, affectedPatientIds` but no 4-factor structured fields.
- **Severity:** MEDIUM-DOCUMENTATION (foundation for §164.410 / §164.404 / §164.408 notification triggers; sister to 5-BRC-06 HIGH P1 GATE workflow).
- **Cross-references:** see 5-BRC-06 (HIGH P1 GATE; BA-to-CE notification); see 5-OMN-03 (Omnibus 4-factor framework CROSSREF); see AUDIT-016 (V2 envelope; affects factor 1 PHI-rendering-unusable).
- **Remediation:** Extend `breachNotification.ts` createBreachSchema with 4-factor structured fields (or `riskAssessment` Json blob); author 4-factor assessment workflow in `docs/runbooks/INCIDENT_PHI_BREACH.md`. Bundle with 5-BRC-06 schema rework. Estimated: 2-4h bundled.

#### Finding 5-BRC-03

- **CFR:** §164.404(a)-(d) Notification to individuals (BA-cooperation when CE delegates).
- **Gap statement:** Per §164.404(a), Covered Entity notifies affected individuals within 60 days of discovery. As BA, TAILRD's primary obligation is §164.410 (notify CE); §164.404 individual-notification is the CE's responsibility unless delegated to BA via BAA. `backend/src/routes/breachNotification.ts:42` includes `INDIVIDUALS_NOTIFIED` status but does not specify whether TAILRD or CE performs the notification.
- **Severity:** MEDIUM (P2) (workflow clarity gap; BAA terms determine delegation).
- **Cross-references:** see 5-BRC-06 (HIGH P1 GATE; BA-to-CE primary obligation); see 5-ORG-01 (BA contract terms; delegation provisions).
- **Remediation:** Document BAA-delegation determination in `docs/runbooks/INCIDENT_PHI_BREACH.md`; extend `breachNotification.ts` schema with `individualNotificationOwner: 'CE' | 'BA_DELEGATED'` field. Estimated: 1-2h bundled with 5-BRC-06.

#### Finding 5-BRC-04

- **CFR:** §164.406 Notification to media (if breach affects 500+ individuals in a state or jurisdiction).
- **Gap statement:** Per §164.406, CE notifies prominent media outlets of breach affecting 500+ residents of a state or jurisdiction. As BA, TAILRD's role is notification cooperation only. `breachNotification.ts:107` `requiresMediaNotification: (data.affectedRecords ?? 0) >= 500` calculates trigger; `mediaNotifiedAt` field at L53 tracks status. Gap is the BA-CE-delegation determination + content procedure.
- **Severity:** DOCUMENTATION (BA-cooperation surface).
- **Cross-references:** see 5-BRC-03 (sister individual-notification CE-delegation surface).
- **Remediation:** Document media-notification BA-cooperation procedure in `docs/runbooks/INCIDENT_PHI_BREACH.md`. Estimated: 30min bundled.

#### Finding 5-BRC-05

- **CFR:** §164.408 Notification to HHS Secretary (immediate for 500+ breaches; annual logged for <500 breaches).
- **Gap statement:** Per §164.408, CE notifies HHS Secretary immediately for breaches affecting 500+ individuals; annually for breaches affecting <500. As BA, TAILRD's role is cooperation only. `breachNotification.ts:74-76` calculates 60-day HHS deadline; `hhsNotifiedAt` field tracks status. Sister gap to 5-BRC-06: workflow positions TAILRD as CE notifying HHS directly; actual BA flow is CE-notifies-HHS after TAILRD-notifies-CE.
- **Severity:** MEDIUM-DOCUMENTATION (workflow clarity gap; sister to 5-BRC-06).
- **Cross-references:** see 5-BRC-06 (HIGH P1 GATE; BA-primary-obligation workflow rework).
- **Remediation:** Bundle with 5-BRC-06 schema rework: reframe `hhsNotifiedAt` as CE-side notification tracked by TAILRD for cooperation; primary BA timeline tracking is `ceNotifiedAt`. Estimated: bundled with 5-BRC-06.

#### Finding 5-BRC-06 (HIGH P1 GATE; authored at B5.4.1)

**CFR citation:** 45 CFR §164.410(a)(1) Standard: Notification by a business associate; §164.410(b) Timeliness (without unreasonable delay; no later than 60 days from discovery); §164.410(c)(1) Required content (identification of each individual affected); §164.410(c)(2) Sister content per §164.404(c). Per Omnibus 2013, BAs have direct §164.410 obligation to notify Covered Entity; failure to notify within 60 days exposes BA to tiered CMP per §160.404.

**Gap statement:** `backend/src/routes/breachNotification.ts` (348 lines) implements a HHS-Secretary-direct breach reporting workflow with strong primitives (60-day clock at L74-L76, status state machine at L42-L43, overdue detection at L153-L176, cron-ready `checkBreachDeadlines` at L319-L345). HOWEVER, the workflow is positioned AS IF TAILRD were a Covered Entity notifying HHS directly per §164.408, NOT as a Business Associate notifying its Covered Entity customer per §164.410. The §164.410 BA-to-CE notification path is MISSING.

*Specific gaps:*
- **No `ceNotifiedAt` field in `createBreachSchema` or `updateBreachSchema`** (`breachNotification.ts:25-55`). Schema tracks `hhsNotifiedAt` + `individualsNotifiedAt` + `mediaNotifiedAt` but no Covered-Entity-notification timestamp.
- **No `CE_NOTIFIED` status transition** in update enum (`breachNotification.ts:40-43`). Status machine: `DISCOVERED, INVESTIGATING, CONTAINED, RISK_ASSESSED, HHS_NOTIFIED, INDIVIDUALS_NOTIFIED, REMEDIATED, CLOSED`. Missing `CE_NOTIFIED` state.
- **No BA-as-agent vs BA-as-independent-actor determination per §164.402.** This distinction governs whether the BA's notification clock starts at BA-discovery or CE-receipt-of-BA-notification. The schema does not capture the determination; auditor flags this as a documentation + workflow gap.
- **HIPAA timeline calculation positions TAILRD as CE-to-HHS** (`breachNotification.ts:74-76`): `hhsDeadline = discoveredDate + 60 days`. Per §164.410, the BA-to-CE clock starts at BA-discovery; the CE-to-HHS clock per §164.408 starts at CE-receipt-of-BA-notification (which may be up to 60 days after BA discovery). TAILRD's BA-primary 60-day clock is to the CE, NOT to HHS directly.
- **Authorization layer** (`breachNotification.ts:21`): `authorizeRole(['SUPER_ADMIN'])` only. No customer-hospital-side endpoint for CE to receive notification from TAILRD; the workflow assumes TAILRD discovers + investigates + notifies HHS directly.
- **Cron-ready `checkBreachDeadlines`** (`breachNotification.ts:319-345`) only tracks HHS-deadline overdue + approaching states; no CE-notification-deadline tracking.

**Implication:** If TAILRD discovers a breach today (during BSW pre-DUA pilot or future production): the current implementation will (a) start a 60-day clock against HHS notification deadline; (b) provide no workflow to notify BSW per §164.410 BA-primary obligation; (c) produce no auditable record of BA-to-CE notification timing or content; (d) potentially trigger CMP for failure to notify CE per §164.410 even if HHS notification is timely. **Critical regulatory exposure under Omnibus 2013 BA direct liability.** Severe CMP exposure: §160.404 willful neglect tier is $50,000 minimum per violation, capped at $1.5M per category per year.

**Severity:** **HIGH (P1) GATE** preserved per B5.3 DRAFT. Evidence-gathering at B5.4.1 confirms severity floor: BA-primary obligation MISSING in implementation; not downgradeable without §164.410 workflow shipping.

**Cross-references (full register-style first appearance per Q-D):**

| Finding | Severity | Status | Cross-reference |
|---|---|---|---|
| AUDIT-076 | LOW (P3) | OPEN | `HIPAA_GRADE_ACTIONS` set narrow; partial coverage at BREACH_DATA_ACCESSED + BREACH_DATA_MODIFIED; sister at audit-promotion surface (would benefit from `BREACH_CE_NOTIFIED` HIPAA-grade event when §164.410 workflow ships) |
| 4-RNB-02 | MEDIUM (P2) | OPEN (Phase 4) | Missing incident-response runbooks; sister at incident-response-procedure-documentation surface |

Sister cross-references (shorthand): see AUDIT-013 (HIPAA §164.312(b) audit controls; required for breach event tracking); see 5-BRC-02 (§164.402 4-factor risk assessment; pre-condition for §164.410 notification trigger); see 5-OMN-03 (Omnibus 4-factor framework; sister mechanism); see 5-ADM-06 (§164.308(a)(6) security incident procedures; sister incident-response layer).

**Remediation path:**

1. **Schema extension at `breachNotification.ts:39-55`:** Add `ceNotifiedAt: z.string().datetime().optional()` to `updateBreachSchema`; add `CE_NOTIFIED` status to enum at L40-L43; add `ceNotifiedBy: z.string().optional()` for BA-side notifier tracking.
2. **Timeline calculation rework at `breachNotification.ts:74-76`:** Separate BA-to-CE deadline (BA-discovery + 60 days per §164.410(b)) from CE-to-HHS deadline (CE-receipt + 60 days per §164.408). Return both deadlines in `hipaaTimeline` response object.
3. **BA-as-agent determination:** Add `baActsAsAgent: z.boolean().optional()` to `createBreachSchema`. Per §164.402, BA-as-agent means BA-discovery = CE-discovery (no notification delay tolerated). BA-as-independent-actor means BA must notify CE within 60 days. Schema captures determination at incident-create time per BAA terms (cross-reference 5-ORG-01).
4. **CE-notification cron extension:** Extend `checkBreachDeadlines` at L319-L345 to track CE-notification deadlines in parallel with HHS deadlines; surface both at `/overdue-check` endpoint.
5. **Customer-hospital-side endpoint:** Author CE-receive-notification endpoint (likely under `routes/hospitals.ts` or new `routes/breachNotificationCE.ts`); authentication via existing JWT + hospitalId scope per AUDIT-011 Layer 3.
6. **§164.410(c) content audit:** Verify all required content fields per §164.410(c)(1) (individual identification) + §164.404(c) sister content (description; types of PHI; steps to protect; description of BA actions; contact procedures). Map to existing schema fields; close gaps.
7. **`HIPAA_GRADE_ACTIONS` promotion (sister to AUDIT-076):** Add `BREACH_CE_NOTIFIED` to throws-on-DB-failure set per AUDIT-013 dual-transport contract.

Estimated total: 12 to 20h implementation + 4 to 8h customer-hospital-side workflow design. Coordination with customer hospitals (BSW + Mount Sinai) required to align CE-side notification receiving workflow. **Pre-DUA-signature timing aligns with BSW pilot data-flow gate (sister to 5-ADM-09 timing).**

| 5-BRC-07 | §164.412 | Law enforcement delay | None | DOCUMENTATION | None (policy-layer) |
| 5-BRC-08 | §164.414 | Administrative requirements + burden of proof | None | MEDIUM-DOCUMENTATION | None (policy-layer) |

#### Finding 5-BRC-07

- **CFR:** §164.412 Law enforcement delay (delay notification if law enforcement official states notification would impede criminal investigation or cause damage to national security).
- **Gap statement:** No documented law-enforcement-delay procedure. Per §164.412, BA may delay notification if law-enforcement official provides written statement (30-day delay) or oral statement (30-day delay with documentation).
- **Severity:** DOCUMENTATION (low-probability scenario but auditor expects documented procedure).
- **Cross-references:** see 5-BRC-06 (HIGH P1 GATE; primary workflow); see 5-ADM-06 (incident response procedures).
- **Remediation:** Document law-enforcement-delay procedure in `docs/runbooks/INCIDENT_PHI_BREACH.md`. Estimated: 30min bundled.

#### Finding 5-BRC-08

- **CFR:** §164.414(a) Administrative requirements (sister §164.530 administrative requirements); §164.414(b) Burden of proof (BA bears burden of demonstrating: (1) notifications made as required; OR (2) low-probability-of-compromise determination per §164.402(2)).
- **Gap statement:** Burden-of-proof documentation not codified. Per §164.414(b), if TAILRD does NOT notify (asserting low-probability of compromise), TAILRD must retain documented 4-factor risk assessment + reasoning. `breachNotification.ts:39-55` updateBreachSchema captures `rootCause, containmentActions, remediationPlan, internalNotes` but not structured 4-factor risk assessment.
- **Severity:** MEDIUM-DOCUMENTATION (audit trail discipline; sister to 5-BRC-02 4-factor framework).
- **Cross-references:** see 5-BRC-02 (4-factor risk assessment; sister documentation); see 5-BRC-06 (HIGH P1 GATE; sister workflow); see AUDIT-013 (audit log durability; §164.312(b) sister).
- **Remediation:** Extend `breachNotification.ts` schema with structured 4-factor risk assessment fields (sister to 5-BRC-02); document 6-year retention of breach risk assessments per §164.316(b)(2)(i) (sister to 5-PNP-02). Estimated: bundled with 5-BRC-02 + 5-BRC-06 schema rework.

### 4.8 Domain 5-PRV (Privacy Rule BA-applicable subset)

Per Q1a TAILRD-as-BA determination. BA-applicable subset per Omnibus 2013.

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-PRV-01 | §164.502(a)(3)-(5) | BA permitted uses + disclosures | None | DOCUMENTATION | None (BAA terms) |
| 5-PRV-02 | §164.502(b) | Minimum necessary | None (gap-detection returns full clinical context to clinician; acceptable per CDS exemption) | LOW-DOCUMENTATION | `backend/src/ingestion/gaps/gapRuleEngine.ts` (cross-ref dismissal-at-consumption §17.1 entry 20) |
| 5-PRV-03 | §164.502(e) | Disclosures to BAs (sub-BAs) | `docs/BAA_REGISTER.md` (sub-BA tracking) | DOCUMENTATION | `docs/BAA_REGISTER.md` |
| 5-PRV-04 | §164.504(e) | BA contract terms | `docs/BAA_REQUIREMENTS.md` | CROSSREF to 5-ORG-01 | `docs/BAA_REQUIREMENTS.md` (cross-ref 5-ORG-01) |
| 5-PRV-05 | §164.514 | De-identification + limited data sets | AUDIT-020 sister (`fhir*Id` plaintext) | LOW-DOCUMENTATION | `backend/src/redox/fhirResourceHandlers.ts` (cross-ref AUDIT-020) |
| 5-PRV-06 | §164.524 | Right of access (BA cooperation per BAA) | `backend/src/routes/dataRequests.ts` (PatientDataRequest model) | LOW-DOCUMENTATION | `backend/src/routes/dataRequests.ts` |
| 5-PRV-07 | §164.526 | Right of amendment (BA cooperation per BAA) | None code-surface explicit | DOCUMENTATION | None (policy-layer) |
| 5-PRV-08 | §164.528 | Accounting of disclosures (BA cooperation per BAA) | AuditLog model exists; PHI_VIEW + PHI_EXPORT actions tracked | LOW (P3) | `backend/src/middleware/auditLogger.ts`, `backend/prisma/schema.prisma` AuditLog model |
| 5-PRV-09 | §164.530(c)(1) | Safeguards (BA-applicable per Omnibus) | All Security Rule findings sister | CROSSREF to 5-TEC + 5-PHY + 5-ADM | (cross-ref domains) |

#### Finding 5-PRV-01

- **CFR:** §164.502(a)(3)-(5) BA permitted uses and disclosures (use/disclose PHI only as permitted by BAA; report use/disclosure not permitted to CE; mitigate harmful effects; ensure subcontractors comply).
- **Gap statement:** BA-permitted-use scope not formally documented. BAA terms govern; without BAA execution (per 5-ADM-09 HIGH P1 GATE), permitted-use scope is undefined.
- **Severity:** DOCUMENTATION (BAA terms layer; conditional on 5-ADM-09 closure).
- **Cross-references:** see 5-ADM-09 (HIGH P1 GATE; BAA execution); see 5-PRV-03 (sub-BA disclosures); see 5-PRV-04 (BA contract terms).
- **Remediation:** Document permitted-use scope as section in `docs/HIPAA_POLICIES.md` referencing BAA template language per `BAA_REQUIREMENTS.md`. Estimated: 1h bundled.

#### Finding 5-PRV-02

- **CFR:** §164.502(b) Minimum necessary (use, disclose, request only minimum necessary PHI to accomplish purpose).
- **Gap statement:** Gap detection workflow returns full clinical context to clinician at consumption layer (CDS Hooks emit chain via `gapRuleEngine.ts` 263 push sites → `cdsHooks.ts:185,257,271`). Per §164.502(b), minimum-necessary does NOT apply to disclosures to or requests by a healthcare provider for treatment purposes (§164.502(b)(2)(i)); since gap recommendations are for clinical treatment use, the full clinical context is permissible. Sister to §17.1 entry 20 dismissal-at-consumption framing.
- **Severity:** LOW-DOCUMENTATION (technical operations comply with treatment-exception; gap is documentation of exception application).
- **Cross-references:** see §17.1 entry 20 (dismissal-at-consumption framing; CDS Hooks recommendation flow); see 4-OMP-01 (Phase 4 dismissal-at-consumption finding); see 5-PRV-01 (sister BA-permitted-use surface).
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` documenting minimum-necessary treatment-exception application + CDS Hooks recommendation chain rationale. Estimated: 1h.

#### Finding 5-PRV-03

- **CFR:** §164.502(e)(1) Disclosures to business associates (CE/BA may disclose PHI to BA if satisfactory assurances obtained per §164.504(e)); §164.502(e)(1)(ii) Sub-BA documentation.
- **Gap statement:** TAILRD discloses PHI to sub-BAs (AWS for RDS / S3 / KMS / CloudWatch storage; Redox for EHR FHIR bundles; ElastiCache for cached PHI). Per §164.502(e), TAILRD must obtain satisfactory assurances from each sub-BA via executed BAA. Per `docs/BAA_REGISTER.md`, all 3 sub-BAAs are PENDING execution (cross-reference 5-ADM-09 HIGH P1 GATE). Sub-BA disclosure documentation gap.
- **Severity:** DOCUMENTATION (CROSSREF to 5-ADM-09 HIGH P1 GATE; documentation layer of the same execution gap).
- **Cross-references:** see 5-ADM-09 (HIGH P1 GATE; sub-vendor BAA execution); see 5-PRV-04 (BA contract terms); see `docs/BAA_REGISTER.md`.
- **Remediation:** Document sub-BA disclosure chain in `docs/HIPAA_POLICIES.md`; verify each sub-BAA execution before disclosure (sister to 5-ADM-09 PHI-flow-gating). Estimated: bundled with 5-ADM-09.

#### Finding 5-PRV-04

- **CFR:** §164.504(e) Business associate contract terms (specific provisions: permitted uses; required reporting; safeguards; subcontractor flowdown; CE access; CE amendment; CE accounting; termination provisions; return/destroy PHI on termination).
- **Gap statement:** CROSSREF to 5-ORG-01 at BA contract terms surface. Same provisions checklist applies.
- **Severity:** CROSSREF to 5-ORG-01 (MEDIUM P2 BA contract terms audit).
- **Cross-references:** see 5-ORG-01 (BA contract terms; MEDIUM P2); see 5-ADM-09 (HIGH P1 GATE; BAA execution).
- **Remediation:** Bundled with 5-ORG-01 BAA contract-terms checklist.

#### Finding 5-PRV-05

- **CFR:** §164.514(a)-(c) De-identification of PHI; (d)-(e) Limited data sets.
- **Gap statement:** AUDIT-020 catalogs `fhir*Id` plaintext as PHI per §164.514(b)(2)(i)(R) "externally-assigned unique identifiers." Sister surface: TAILRD does not currently produce de-identified data sets or limited data sets; gap detection produces patient-tied recommendations for treatment use (not de-identified research use). De-identification methodology documentation absent because de-identification is not a current workflow.
- **Severity:** LOW-DOCUMENTATION (current workflow does not require de-identification; documentation gap is forward-looking).
- **Cross-references:** see AUDIT-020 (`fhir*Id` plaintext PHI; sister identifier-treatment); see 5-PRV-01 (sister BA permitted use scope).
- **Remediation:** Document de-identification N/A status in `docs/HIPAA_POLICIES.md` with trigger conditions for future limited-data-set workflow (e.g., research collaboration with Mount Sinai). Estimated: 30min.

#### Finding 5-PRV-06

- **CFR:** §164.524 Right of access (CE must provide individual access to PHI; BA provides cooperation per BAA terms).
- **Gap statement:** `backend/src/routes/dataRequests.ts` implements `PatientDataRequest` model + workflow. Per §164.524 sister cooperation discipline, BA must provide PHI to CE for individual-access requests within 30 days (extendable 30 more days with notice). Current implementation positions TAILRD as the access-provider; actual flow per BA-cooperation is BA-provides-PHI-to-CE-which-provides-to-individual.
- **Severity:** LOW-DOCUMENTATION (sister-pattern to 5-BRC-06 CE-vs-BA workflow framing; not gate-class but documentation clarity needed).
- **Cross-references:** see 5-BRC-06 (HIGH P1 GATE; sister CE-vs-BA workflow positioning); see 5-ORG-01 (BA contract terms; access provision clauses).
- **Remediation:** Document BA-cooperation framing for `PatientDataRequest` workflow in `docs/HIPAA_POLICIES.md` and `backend/src/routes/dataRequests.ts` header docstring. Estimated: 1h.

#### Finding 5-PRV-07

- **CFR:** §164.526 Right of amendment (CE must consider individual's request to amend PHI; BA provides cooperation per BAA terms).
- **Gap statement:** No PHI-amendment workflow surface in `backend/src/routes/`. Sister BA-cooperation discipline to 5-PRV-06 right-of-access. At current pilot scale BSW pre-DUA, amendment requests would route through manual operator handling.
- **Severity:** DOCUMENTATION (forward-looking; production workflow gap).
- **Cross-references:** see 5-PRV-06 (sister right-of-access; sister BA-cooperation pattern); see 5-ORG-01 (BA contract terms).
- **Remediation:** Document amendment workflow gap in `docs/HIPAA_POLICIES.md`; v2.0 carry-forward for implementation when first amendment request surfaces. Estimated: 30min documentation now; implementation deferred to v2.0.

#### Finding 5-PRV-08

- **CFR:** §164.528 Accounting of disclosures (CE must provide individual with accounting of disclosures of PHI; BA provides cooperation per BAA terms; 6-year lookback).
- **Gap statement:** `backend/prisma/schema.prisma` AuditLog model + `auditLogger.ts` HIPAA_GRADE_ACTIONS Set track PHI_VIEW + PHI_EXPORT events. Per §164.528, accounting must cover disclosures of PHI (uses for treatment / payment / healthcare-operations exempted per §164.528(a)(1)(i)). Current audit trail captures access events comprehensively; accounting-report generation workflow not implemented.
- **Severity:** LOW (P3) (audit trail data exists; gap is report-generation workflow for individual requests).
- **Cross-references:** see AUDIT-013 (HIGH P1 RESOLVED; audit log dual-transport); see AUDIT-076 (LOW P3 OPEN; HIPAA_GRADE_ACTIONS narrow); see 5-TEC-03 (audit controls CROSSREF).
- **Remediation:** Implement `/api/dataRequests/:id/accounting` endpoint generating §164.528-compliant report from AuditLog query filtered to disclosure-class events with 6-year lookback. Estimated: 4-6h.

#### Finding 5-PRV-09

- **CFR:** §164.530(c)(1) Safeguards (administrative / physical / technical safeguards; BA-applicable per Omnibus 2013).
- **Gap statement:** Sister cross-reference to entire Security Rule (5-ADM + 5-PHY + 5-TEC). No separate Phase 5 action.
- **Severity:** CROSSREF to 5-TEC + 5-PHY + 5-ADM domains.
- **Cross-references:** see all 5-ADM findings; see all 5-PHY findings; see all 5-TEC findings.
- **Remediation:** No separate action; closure of 5-ADM / 5-PHY / 5-TEC domains closes 5-PRV-09.

### 4.9 Domain 5-ENF (Enforcement Rule 45 CFR Part 160 Subparts A through E)

| ID | CFR | Standard | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|---|
| 5-ENF-01 | Part 160 Subpart A | General provisions | None | DOCUMENTATION | None (policy-layer) |
| 5-ENF-02 | Part 160 Subpart B | Preemption (state law interaction) | None | DOCUMENTATION | None (policy-layer; legal review flag) |
| 5-ENF-03 | Part 160 Subpart C | Compliance + investigations | None | DOCUMENTATION | None (policy-layer) |
| 5-ENF-04 | Part 160 Subpart D | Civil money penalties (post-Omnibus 4-tier structure) | None | DOCUMENTATION | None (policy-layer) |
| 5-ENF-05 | Part 160 Subpart E | Procedures for hearings | N/A | N/A | None (categorically inapplicable absent enforcement action) |

#### Finding 5-ENF-01

- **CFR:** 45 CFR Part 160 Subpart A General provisions (applicability; definitions; preemption framework).
- **Gap statement:** Enforcement Rule general-provision documentation absent. TAILRD compliance posture does not document Part 160 applicability.
- **Severity:** DOCUMENTATION.
- **Cross-references:** see 5-CLS-01 (sister classification documentation); see 5-OMN-04 (tiered CMP awareness).
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` documenting Part 160 Subpart A applicability. Estimated: 30min bundled.

#### Finding 5-ENF-02

- **CFR:** 45 CFR Part 160 Subpart B Preemption (state law interaction; preemption analysis required when state law more stringent than HIPAA).
- **Gap statement:** No state-law preemption analysis. TAILRD pilots in Texas (BSW), New York (Mount Sinai); both states have PHI / data-breach laws that may impose stricter requirements than HIPAA (e.g., Texas Medical Records Privacy Act; New York SHIELD Act). Preemption analysis required to identify state-law obligations beyond HIPAA floor.
- **Severity:** DOCUMENTATION (legal-review flag; not engineering gap).
- **Cross-references:** see 5-BRC-06 (HIGH P1 GATE; state notification laws may apply alongside §164.410); see 5-CLS-01 (sister legal-posture documentation).
- **Remediation:** Engage legal counsel for state-law preemption analysis covering pilot states; document outcomes in `docs/HIPAA_STATE_LAW_PREEMPTION.md`. v2.0 carry-forward as legal-review work. Estimated: 4-8h legal + 1h documentation.

#### Finding 5-ENF-03

- **CFR:** 45 CFR Part 160 Subpart C Compliance and investigations (HHS OCR investigation procedures; CE/BA cooperation duties).
- **Gap statement:** No documented OCR-investigation-cooperation procedure. In event of investigation, BA must produce requested documentation within OCR-specified timeframes.
- **Severity:** DOCUMENTATION (low-probability scenario; auditor expects documented procedure).
- **Cross-references:** see 5-ADM-06 (incident-response procedures); see 5-PNP-02 (documentation retention).
- **Remediation:** Document OCR-investigation-cooperation procedure in `docs/HIPAA_POLICIES.md`. Estimated: 1h bundled.

#### Finding 5-ENF-04

- **CFR:** 45 CFR Part 160 Subpart D Civil money penalties (CMP tiered structure post-Omnibus 2013: did-not-know / reasonable-cause / willful-neglect-corrected / willful-neglect-uncorrected; per-violation caps $50K to $1.5M per category per year per §160.404).
- **Gap statement:** CMP awareness + tier documentation absent. Workforce members touching PHI should be aware of CMP tiers as part of training program (sister 5-ADM-05).
- **Severity:** DOCUMENTATION.
- **Cross-references:** see 5-ADM-05 (training program); see 5-OMN-04 (Omnibus tiered CMP CROSSREF).
- **Remediation:** Section in `docs/HIPAA_TRAINING_PROGRAM.md` documenting CMP tiers + scenarios. Estimated: 1h bundled with 5-ADM-05.

#### Finding 5-ENF-05

- **CFR:** 45 CFR Part 160 Subpart E Procedures for hearings.
- **Gap statement:** N/A. Procedural-regulatory provisions applicable only after enforcement action; not applicable at current pre-incident posture.
- **Severity:** N/A.
- **Cross-references:** None.
- **Remediation:** None required. Inapplicability documented in §2.4 out-of-scope enumeration.

### 4.10 Domain 5-OMN (Omnibus Rule 2013 Cross-Cutting Modifications)

| ID | Modification | Existing AUDIT coverage | DRAFT severity | Code-surface anchor |
|---|---|---|---|---|
| 5-OMN-01 | BA direct liability (Security + Breach + select Privacy provisions) | All Security findings sister | DOCUMENTATION | (cross-ref §164.302-318, §164.400-414) |
| 5-OMN-02 | BA + sub-BA accountability chain | `docs/BAA_REGISTER.md`, `docs/BAA_REQUIREMENTS.md` | CROSSREF to 5-ADM-09 | (cross-ref 5-ADM-09) |
| 5-OMN-03 | 4-factor risk assessment framework (replaces harm-threshold) | None | CROSSREF to 5-BRC-02 | (cross-ref 5-BRC-02) |
| 5-OMN-04 | Tiered civil money penalty structure | None | CROSSREF to 5-ENF-04 | (cross-ref 5-ENF-04) |
| 5-OMN-05 | Privacy Rule modifications (marketing, fundraising, research, decedent rights) | None | DOCUMENTATION | Mostly N/A for CDS BA; document inapplicable scopes verbatim at B5.4 |

#### Finding 5-OMN-01

- **Modification:** Omnibus 2013 BA direct liability (Security Rule + Breach Notification Rule + select Privacy Rule provisions).
- **Gap statement:** Pre-Omnibus 2013, BAs were liable only through BAA contract terms (indirect via CE). Post-Omnibus, BAs have direct HHS enforcement liability under Security + Breach + select Privacy provisions. TAILRD compliance posture does not document this direct liability framework.
- **Severity:** DOCUMENTATION.
- **Cross-references:** see 5-CLS-01 (BA classification); see entire Security Rule + 5-BRC findings (sister direct-liability surfaces); see 5-PRV (BA-applicable Privacy subset).
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` documenting Omnibus 2013 BA direct-liability framework. Estimated: 1h bundled with 5-CLS-01.

#### Finding 5-OMN-02

- **Modification:** BA + sub-BA accountability chain (Omnibus extended BAA requirements to sub-BAs).
- **Gap statement:** CROSSREF to 5-ADM-09 + 5-PRV-03 at sub-BA accountability chain surface. TAILRD passes PHI to AWS / Redox / ElastiCache (sub-BAs); each sub-BA must have executed BAA with TAILRD per Omnibus.
- **Severity:** CROSSREF to 5-ADM-09 HIGH P1 GATE.
- **Cross-references:** see 5-ADM-09 (HIGH P1 GATE; sub-vendor BAA execution); see 5-PRV-03 (sub-BA disclosures); see `docs/BAA_REGISTER.md` PENDING items.
- **Remediation:** Bundled with 5-ADM-09 closure.

#### Finding 5-OMN-03

- **Modification:** 4-factor risk assessment replacing pre-Omnibus harm-threshold standard (§164.402).
- **Gap statement:** CROSSREF to 5-BRC-02 at framework codification surface.
- **Severity:** CROSSREF to 5-BRC-02 MEDIUM-DOCUMENTATION.
- **Cross-references:** see 5-BRC-02 (4-factor framework documentation); see 5-BRC-06 (HIGH P1 GATE workflow; 4-factor framework feeds notification trigger); see 5-BRC-08 (burden of proof; sister 4-factor application).
- **Remediation:** Bundled with 5-BRC-02 + 5-BRC-06 + 5-BRC-08 schema rework + workflow documentation.

#### Finding 5-OMN-04

- **Modification:** Tiered civil money penalty structure (4-tier: did-not-know / reasonable-cause / willful-neglect-corrected / willful-neglect-uncorrected per §160.404).
- **Gap statement:** CROSSREF to 5-ENF-04 at CMP awareness layer.
- **Severity:** CROSSREF to 5-ENF-04 DOCUMENTATION.
- **Cross-references:** see 5-ENF-04 (CMP tier awareness); see 5-ADM-05 (training program; CMP scenarios).
- **Remediation:** Bundled with 5-ENF-04 + 5-ADM-05 training program.

#### Finding 5-OMN-05

- **Modification:** Privacy Rule modifications (marketing § 164.508(a)(3) / fundraising § 164.514(f) / research § 164.512(i) / decedent rights § 164.502(f) post-50-years).
- **Gap statement:** Mostly N/A for TAILRD as CDS BA. Marketing N/A (no marketing PHI use). Fundraising N/A (no fundraising activities). Research N/A at current pilot scale (no IRB-approved research workflows in TAILRD; future Mount Sinai research collaboration may activate). Decedent rights N/A at current pilot scale (no post-mortem PHI handling workflows).
- **Severity:** DOCUMENTATION (inapplicability documentation; sister to §2.4 out-of-scope).
- **Cross-references:** see 5-PRV-01 (BA permitted uses); see 5-CLS-01 (BA classification).
- **Remediation:** Section in `docs/HIPAA_POLICIES.md` documenting current-state inapplicability + trigger conditions for future activation (e.g., research workflow + IRB integration). Estimated: 1h bundled.

---

## 5. Tier 1 Priority Findings Consolidated

Sister to PHASE_4_REPORT §5 precedent. HIGH P1 GATE findings across all domains (post B5.4.1 evidence gathering; 5-TEC-06 downgraded from escalation candidate to MEDIUM P2):

| Finding ID | Domain | CFR | Severity | One-line | Remediation path |
|---|---|---|---|---|---|
| 5-ADM-09 | Administrative Safeguards | §164.308(b)(1)-(4) | **HIGH (P1) GATE** | Two surfaces: sub-vendor BAAs PENDING (AWS / Redox / ElastiCache per `BAA_REGISTER.md`) + customer-hospital BAA tracking capability gap (`TAILRD_COMPLETE_PLATFORM_AUDIT.md:889`) | Operator-side BAA execution (~2-4h) + customer-hospital PHI-flow-gating capability (~8-16h or v2.0); pre-BSW-DUA timing |
| 5-BRC-06 | Breach Notification | §164.410 | **HIGH (P1) GATE** | `breachNotification.ts:1-348` implements CE-to-HHS direct workflow; missing §164.410 BA-primary-obligation path (no `ceNotifiedAt` / no `CE_NOTIFIED` status / no CE-side endpoint / no BA-as-agent determination) | Schema extension + timeline rework + CE-receive endpoint + content audit + audit-promotion (~12-20h + 4-8h CE-side design); pre-BSW-DUA timing |

5-TEC-06 (Transmission security §164.312(e)) downgraded from B5.3 HIGH P1 escalation candidate to MEDIUM (P2) per B5.4.1 evidence (strong TLS at staging IaC + HSTS at app layer; production-codification gap sister to AUDIT-082 + 4-APM-02 LOW P3 pattern). Surfaced in §4.4; not a Tier 1 GATE candidate.

Verdict-rubric per §2.3 calibration: 2 gate-class HIGH P1 findings with documented remediation roadmap point toward **CONDITIONAL PASS** sister to Phase 1/2/3/4 precedent. Final verdict at B5.5 after all 49 non-gate findings authored at B5.4.2.

---

## 6. Cross-Module + Cross-Phase Synthesis

### 6.1 Phase 3 §6 cross-walk extension preserved

Phase 3 §6 baseline 5 dimensions extended to 10 domains per §2.2. Sister-phase continuity. Phase 3 cross-references retained as starting AUDIT-NN coverage citations in §4.X tables.

**Phase 3 baseline 5 dimensions, Phase 5 disposition:**

| Phase 3 dimension | Phase 5 domain | Disposition |
|---|---|---|
| §164.308(a)(7)(ii)(B) DR plan testing -> AUDIT-078 | 5-ADM-07 contingency plan | Extended cleanly; AUDIT-078 progresses; documentation gap added (periodic testing cadence + criticality analysis) |
| §164.308(a)(1)(ii)(D) Information System Activity Review -> AUDIT-076 | 5-TEC-03 audit controls + 5-ADM-01 security management process | Extended cleanly; AUDIT-076 progresses through its own remediation; documentation gap (risk-analysis consolidation + sanction policy + activity-review cadence) added |
| §164.312(a)(1) access control + §164.502 minimum necessary -> AUDIT-071 | 5-TEC-01 access control + 5-PRV-02 minimum necessary | Extended cleanly; AUDIT-071 RESOLVED; 5-PRV-02 cross-references §17.1 entry 20 dismissal-at-consumption framing |
| §164.312(a)(2)(iv) encryption/decryption -> AUDIT-016 arc + AUDIT-075 | 5-TEC-02 encryption-at-rest | Extended cleanly; AUDIT-016/022/075/084 RESOLVED; AUDIT-085 OPEN-tracked CROSSREF |
| §164.312(b) audit controls -> AUDIT-013 dual-transport | 5-TEC-03 audit controls | Extended cleanly; AUDIT-013 RESOLVED; AUDIT-076 + AUDIT-086 sister-cross-referenced |

**Phase 5 new dimensions beyond Phase 3 baseline:** 5-ADM (administrative breadth) + 5-PHY (physical safeguards) + 5-ORG (organizational requirements) + 5-PNP (policies and procedures) + 5-BRC (breach notification full coverage with §164.410 HIGH P1 GATE) + 5-PRV (privacy rule BA-subset) + 5-ENF (enforcement rule) + 5-OMN (Omnibus cross-cutting) + 5-CLS (classification + general provisions). All extended via canonical-grep per DRIFT-45 discipline.

### 6.2 Phase 4 cross-references

Phase 4 operational maturity sister-arc surfaced cross-references relevant to Phase 5:

| Phase 4 finding | Phase 5 cross-reference |
|---|---|
| 4-OMP-01 dismissal-at-consumption framing | 5-PRV-02 minimum necessary (gap-detection returns full clinical context; acceptable per CDS exemption + §17.1 entry 20 codification) |
| 4-ALR-01 ZERO operational CloudWatch alarms | 5-TEC-03 audit controls (sister observability gap; CROSSREF AUDIT-076) |
| 4-ALR-02 ZERO SNS / PagerDuty routing | 5-ADM-06 security incident procedures (sister incident-response gap; CROSSREF) |
| 4-APM-01 ZERO APM tooling | 5-TEC-03 audit controls (sister observability gap; CROSSREF) |
| 4-RNB-02 missing incident-response runbooks | 5-ADM-06 security incident procedures (sister incident-response gap; same root cause) |
| 4-3PL-02 admin / godView / internalOps share ALB | 5-ADM-04 information access management (sister architectural pattern) |

### 6.3 Phase 1 / Phase 2 cross-references

| Phase | Finding | Phase 5 cross-reference |
|---|---|---|
| Phase 1 | AUDIT-001 test coverage 0.87% | 5-TEC-03 audit controls + 5-ADM-08 evaluation (sister; PATH_TO_ROBUST L61 "depends on Phase 1 Tier A in flight") |
| Phase 2 | AUDIT-009 MFA opt-in | 5-TEC-05 person-or-entity authentication (CROSSREF; DEPLOYED flag-off) |
| Phase 2 | AUDIT-011 tenant guard | 5-ADM-04 information access management + 5-TEC-01 access control (CROSSREF Layer 3 Prisma extends) |
| Phase 2 | AUDIT-013 audit log dual-transport | 5-TEC-03 audit controls (CROSSREF RESOLVED 2026-04-30) |

---

## 7. Verdict

**Verdict: CONDITIONAL PASS.**

Sister to Phase 1/2/3/4 CONDITIONAL PASS precedent. Derived from §10.1-style register-severity mirror per §18 status-surface discipline: 2 HIGH P1 GATE findings (5-ADM-09 BAA execution + 5-BRC-06 BA-to-CE notification §164.410 workflow) with documented remediation roadmaps; pre-BSW-DUA-signature timing aligns with gate-closure window; no novel architectural blockers surfaced; methodology stack §1 / §17 / §17.3 / §17.5 / §18 sustained throughout.

**Pass criteria met (per §2.3 rubric):**
- All in-scope dimensions audited (10 domains across Subparts A + C + D + E of 45 CFR Part 164 + 45 CFR Part 160 + Omnibus 2013 cross-cutting modifications)
- Zero P0 findings (severity floor for Phase 5 is HIGH P1; no critical-class blockers)
- All P1 findings carry documented remediation roadmaps (5-ADM-09 + 5-BRC-06 both have explicit remediation paths per §4.2 + §4.7)

**Conditional clause:** Phase passes pending closure of 2 HIGH P1 GATE items. Production-readiness gate item disposition: 5-ADM-09 BAA execution + 5-BRC-06 BA-to-CE notification workflow MUST close before BSW pilot DUA signature triggers live PHI traffic. If BSW DUA signature precedes closure, severity floor escalates per §164.502(e) Privacy Rule violation overlay + Omnibus 2013 BA direct liability per §160.404 willful-neglect-uncorrected tier.

**Risk surface summary** (sister to Phase 4 §7): Direct OCR enforcement exposure under Omnibus 2013 BA direct liability concentrated in 2 gate items. CMP exposure per §160.404 tiered structure: did-not-know floor $100/violation; willful-neglect-uncorrected ceiling $50,000/violation up to $1.5M per category per year. BSW pre-DUA-signature window is the audit-friendly remediation window (no live PHI exposure to pair with BAA execution gap; no breach to test §164.410 workflow gap).

**Remediation prioritization** (sister to Phase 4 §7):

1. **5-ADM-09 first (~2-4h + ~8-16h or v2.0):** Surface A sub-vendor BAA execution unblocks BSW pilot data-flow gate (operator-side AWS + Redox + ElastiCache BAA signing). Surface B customer-hospital PHI-flow-gating capability v2.0 carry-forward acceptable per pre-DUA-signature interim-manual-process tolerance. **Highest leverage: ~4h of operator-side BAA execution closes the BSW data-flow gate.**
2. **5-BRC-06 second (~12-20h + 4-8h CE-side design):** Schema extension + timeline rework + CE-receive endpoint + content audit + audit-promotion. Coordination with BSW + Mount Sinai required to align CE-side notification receiving workflow. **Pre-BSW-DUA timing aligns: no breach during pre-DUA pilot window allows §164.410 workflow to ship before first live breach scenario.**
3. **Documentation-tier consolidation third (~30-50h):** Author `docs/HIPAA_POLICIES.md` consolidating Phase 5 documentation deliverables (HIPAA classification + risk analysis + workforce security + access management + training program + contingency plan + breach response + integrity controls + audit controls + workstation policy + device/media controls + BA contract terms + state-law preemption + CMP awareness). Most content sourced from operational docs (`docs/runbooks/` + `CLAUDE.md` + `BAA_REQUIREMENTS.md`); consolidation effort estimated 30-50h.
4. **Sister-AUDIT closures track separately:** AUDIT-076 (HIPAA_GRADE_ACTIONS narrow); AUDIT-077 (defense-in-depth hygiene); AUDIT-078 (Aurora restore-test operator-side); AUDIT-085 (production migration execution environment); AUDIT-082 + 4-APM-02 (production IaC codification sister cluster).

**v2.0 PATH_TO_ROBUST carry-forward:** v1.2 L61 budget update (15-20h to 25-40h actual; sister to Phase 4 L60 deferral pattern) + Privacy Rule full coverage if BA-applicable-subset audit reveals gaps requiring deeper CE-scope analysis + workforce training delivery items (5-ADM-05) + customer-hospital PHI-flow-gating capability (5-ADM-09 Surface B) + accounting-of-disclosures endpoint implementation (5-PRV-08) + state-law preemption analysis (5-ENF-02).

---

## 8. v2.0 Budget Implications

- **v1.2 L61 update deferred to v2.0 PATH_TO_ROBUST authorship** (per operator scope decision; sister to Phase 4 §10.3 precedent)
- Privacy Rule full coverage carry-forward to v2.0 if BA-applicable-subset audit reveals gaps requiring deeper CE-scope analysis
- Workforce training delivery items (deferred per Q1 LOCKED scope; documentation captured at 5-ADM-05 for v2.0 implementation)
- Phase 5 actual ~25-40h budget delta vs L61 ~15-20h named per Phase 4 §8 precedent (transparent budget delta)

---

## 9. Module-Specific Findings

N/A; HIPAA dimensions cross-cutting; see §4 per-domain findings. Sister to Phase 4 §9 + Phase 3 §9 precedents.

---

## 10. Cross-References

- **Existing AUDIT-NN findings cross-referenced** at first appearance per Q-D operator decision:
  - AUDIT-001 (test coverage Tier A; PATH_TO_ROBUST L61 dependency)
  - AUDIT-009 (MFA opt-in)
  - AUDIT-010 (refresh token)
  - AUDIT-011 (tenant guard Layer 3)
  - AUDIT-012 (verify endpoint)
  - AUDIT-013 (audit log dual-transport)
  - AUDIT-015 (decrypt integrity)
  - AUDIT-016 (PHI key rotation full arc PR #255 + #260 + #261)
  - AUDIT-018, AUDIT-019, AUDIT-020 (PHI encryption coverage)
  - AUDIT-022 (legacy JSON PHI)
  - AUDIT-071 (cdsHooks cross-tenant)
  - AUDIT-075 (PHI encryption hardening)
  - AUDIT-076 (HIPAA_GRADE_ACTIONS narrow)
  - AUDIT-077 (tenant-isolation defense-in-depth)
  - AUDIT-078 (Aurora backup + DR plan)
  - AUDIT-081 (User.email blind-index deferred)
  - AUDIT-082 (terraform decommissioned RDS)
  - AUDIT-083 (fast-xml-builder CVE)
  - AUDIT-084 (PR 2 task-def deployment gap)
  - AUDIT-085 (migration execution environment)
  - AUDIT-086 (tenant-guard bypass-key strip)
- **Phase 3 §6 baseline** (extended at §2.2 + §6.1)
- **Phase 4 §9.1 Pattern A + B clusters** (cross-referenced at §6.2)
- **PATH_TO_ROBUST.md L61** (Phase 5 scope; v1.2 L61 update deferred to v2.0)
- **`docs/BAA_REGISTER.md`** (2026-04-07 snapshot; 3 PENDING items)
- **`docs/BAA_REQUIREMENTS.md`** (sub-vendor BAA requirements)
- **`docs/HEALTH_SYSTEM_ONBOARDING_RUNBOOK.md`** (CE onboarding workflow)
- **AGENT_DRIFT_REGISTRY.md DRIFT-44 + DRIFT-45** (PR #286 codifications; standing throughout Phase 5)
- **AUDIT_METHODOLOGY.md §17.1 entry 20** (dismissal-at-consumption framing; cross-ref 5-PRV-02 minimum necessary)
- **BUILD_STATE.md** (sister-arc narrative entry to author at B5.5)

---

## 11. Cross-Module Synthesis

HIPAA dimensions apply uniformly across all 6 modules (HF, EP, SH, CAD, VHD, PV); no module-specific HIPAA variance surfaced at audit. Sister to Phase 4 §11 precedent.

---

## 11.5 Sequencing-choice deferral

v2.0 author decides Phase 5 + downstream Phase 0C UI/UX + implementation matrix verification sequencing per operator extend-timeline posture. Sister to Phase 3 §11.5 + Phase 4 §11.5 precedents.

---

## 12. Lessons Learned for Next Phase Audit

- **DRIFT-45 mechanism continues earning.** B5.1.2 firing (canonical-doc-vs-prompt-narrow scope) and B5.2.0 application (TAILRD-as-BA canonical-grep determination) both prevented inference errors. Replicate at Phase 0C UI/UX audit kickoff.
- **Cross-walk extension pattern proven.** Phase 3 §6 baseline 5 dimensions extended to Phase 5 10 domains via canonical-grep on `AUDIT_FINDINGS_REGISTER.md` + per-§ HIPAA framework expansion. Replicate at Phase 0C UI/UX audit cross-walk.
- **DOCUMENTATION-tier findings legitimate.** Per Phase 4 INFO-architectural-observation precedent + Option A robust posture, including DOCUMENTATION-tier findings avoids false-PASS picture for HIPAA's inherently documentation-heavy framework.
- **Tier 1 classification at outline + downgrade-at-evidence pattern.** Per operator Q-A + `decision_frameworks`; classify HIGH P1 at B5.3 outline; downgrade at B5.4 evidence-gathering only if specific evidence supports lower severity.
- **DRIFT-44 universal scope clarification.** Operator B5.2 feedback: em-dash discipline applies to ALL writing (chat-side + agent prose + file content). Standing reaffirmed for Phase 5 + future work blocks.

---

## 13. Time-Unit Disambiguation Caveat

Raw scope: ~25-40h estimated (sister to Phase 4 actual). AI-assisted wall-clock: TBD at B5.4 to B5.6 actual logging. Multipliers calibrated against work-type per AUDIT-028 (CAD audit §13 time-unit caveat) and Phase 4 §13 precedent. Sister to v2.0 PATH_TO_ROBUST timeline calibration input.

---

## Appendix - Phase 5 closure ledger

- Phase 5 outline shipped 2026-05-20 (B5.3 STOP)
- Per-finding prose + file:line citations shipped 2026-05-20 (B5.4 STOP; 52 finding subsections; 78 file-path citations)
- Register entries shipped 2026-05-20 (B5.5; 52 entries in AUDIT_FINDINGS_REGISTER.md Phase 5 section)
- BUILD_STATE narrative entry shipped 2026-05-20 (B5.5)
- Verdict shipped 2026-05-20: CONDITIONAL PASS per §7
- PR open: B5.6 (post-commit)

*Methodology stack §1 / §17 / §17.1 / §17.3 / §17.5 / §18 sustained at outline. §16 NOT triggered per operator Q5 (no clinical-code re-audit). DRIFT-44 em-dash discipline + DRIFT-45 chat-side canonical-doc grep pre-flight standing throughout Phase 5 work block.*
