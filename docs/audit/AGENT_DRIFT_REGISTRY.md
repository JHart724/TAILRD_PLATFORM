# AGENT_DRIFT_REGISTRY

Drift-prevention forcing function. Read at session start as a sister to AUDIT_FINDINGS_REGISTER.md content-discipline ritual. Each entry pairs a drift indicator (caught operator-side OR self-caught) with the mechanism update that prevents recurrence. Sister to AUDIT_METHODOLOGY.md §17.1 architectural-precedent catalog (which captures what was caught at design + integration time); this registry captures what was caught at process / content-discipline time.

**Source:** project instructions `<drift_prevention_mechanisms>` Mechanism 3 (drift-registry forcing function).

**Cross-references:**
- `docs/audit/AUDIT_FINDINGS_REGISTER.md` (sister-format precedent)
- `docs/audit/AUDIT_METHODOLOGY.md` §17 (clinical-code PR acceptance criteria) / §17.1 (architectural-precedent catalog) / §18 (status-surface register-literal discipline)
- Project instructions `<drift_prevention_mechanisms>` Mechanism 1 (status-surface mandatory template) / Mechanism 2 (drift-indicator self-watch list) / Mechanism 3 (this registry)

**Entry format:** newest-at-bottom (chronological forward; sister to AUDIT_FINDINGS_REGISTER.md AUDIT-NN sequence). Each entry numbered DRIFT-NN.

---

## DRIFT-01 — Status surface dropped at session refresh

- **Date:** 2026-05-05
- **Drift indicator:** Operator asked for status refresh; agent omitted Layer A/B status block + drift-relevant context; produced summary without enumerated state surface
- **Trigger:** Operator correction (status-surface request returned implicit summary instead of structured block)
- **Mechanism update:** Mechanism 1 mandatory status-surface template codified — every status request must produce explicit Layer A/B block + Mechanism 1 elements verbatim, not implicit prose
- **Sister cross-reference:** AUDIT_METHODOLOGY.md §17.1 catalog precedent #5 (sister-pattern: status-surface discipline became §18 register-literal classification)

---

## DRIFT-02 — Ordering drift (Batch 4 over patient-safety-active ABI)

- **Date:** 2026-05-06
- **Drift indicator:** Agent proposed Batch 4 ICD-10 inline pattern verification (mechanical / non-blocking) over patient-safety-active ABI LOINC correction (Tier S queue precursor); priority calibration weighted by ease-of-execution, not patient-safety impact
- **Trigger:** Operator correction (re-prioritized ABI ahead of mechanical batches)
- **Mechanism update:** Mechanism 2 drift-indicator codified — "ease-of-execution prioritization without patient-safety-impact weighting" added to self-watch list. Decision frameworks: patient-safety-active findings sequence ahead of mechanical-cleanup batches regardless of effort delta
- **Sister cross-reference:** AUDIT-067/068 LOINC reference-correctness right-sizing (PR #249); operator-side-§17.1 framing correction precursor

---

## DRIFT-03 — Half-fix framing (ABI shipping with side discrimination broken)

- **Date:** 2026-05-06
- **Drift indicator:** Agent proposed shipping ABI LOINC correction with `bodySite` left/right discrimination broken under "caveat-and-ship" framing; operator caught half-fix
- **Trigger:** Operator correction (rejected caveat-and-ship; required full implementation including side discrimination)
- **Mechanism update:** Mechanism 2 indicator codified — "caveat-and-ship as compromise on incomplete implementation" added to self-watch list. Decision frameworks: complete implementation over caveated partial-fix; if scope expands mid-arc, expand the arc (sister to §17.1 inventory-expansion-confirms-not-weakens pattern)
- **Sister cross-reference:** AUDIT-067 ABI bodySite extension handling (deferred to AUDIT-070 FHIR ingestion expansion)

---

## DRIFT-04 — Methodology codification deferred

- **Date:** 2026-05-06
- **Drift indicator:** Agent did not codify newly-discovered methodology disciplines (rule-body verification / clinical-code authoritative-source verification / clinical-code PR acceptance criteria) into AUDIT_METHODOLOGY.md as discoveries surfaced; methodology spread implicit across PR descriptions
- **Trigger:** Operator correction (asked for explicit methodology stack codification)
- **Mechanism update:** AUDIT_METHODOLOGY.md §17 + §18 codified inline at discovery time. Methodology stack §1 / §9.1 / §9.2 / §16 / §17 / §18 sustained across all subsequent PRs as load-bearing discipline; PR template enforces §17 checklist
- **Sister cross-reference:** AUDIT-064 partial-pipeline-regen pattern → §9.2 codification; AUDIT-052 architectural divergence-vector thesis → §9.1 + §16 / §17 codification

---

## DRIFT-05 — Severity reclassification at status-surface layer (AUDIT-016)

- **Date:** 2026-05-07
- **Drift indicator:** Status surfaces (summary docs / PR descriptions) drifted AUDIT-016 severity from register-literal MEDIUM (P2) → status-surface RESOLVED-adjacent → eventually HIGH (P1); cross-surface drift weakened urgency framing
- **Trigger:** Operator correction (caught register-vs-status-surface drift; re-anchored to register-literal HIGH P1)
- **Mechanism update:** AUDIT_METHODOLOGY.md §18 codified — register-literal severity copy as drift-prevention discipline. Status surfaces must reproduce register severity verbatim; on disagreement, register wins (sister to BUILD_STATE.md "source doc wins on disagreement" header)
- **Sister cross-reference:** PR #251 §18 codification commit; sister to Mechanism 1 status-surface mandatory template

---

## DRIFT-06 — Layer A/B status block dropped during AUDIT-011 multi-phase work

- **Date:** 2026-05-07
- **Drift indicator:** During AUDIT-011 Phase b/c multi-phase work block, agent intermittently dropped Layer A/B status surface in mid-phase updates; favored prose-style progress over structured block; required operator re-anchor
- **Trigger:** Operator correction (asked for Layer A/B re-surface) + agent self-recognition during Phase C internal step transitions
- **Mechanism update:** Mechanism 1 codification reinforced + AGENT_DRIFT_REGISTRY.md (this file) created as forcing function. Every multi-step work block surfaces Layer A/B/C/D at every PAUSE / mini-PAUSE / step transition; not optional regardless of step novelty
- **Sister cross-reference:** AUDIT-011 PR #262 PAUSE 1/2/3 + Phase C Step 1.0/1/2/3/4/5/7/8/9/10/11 (every step gate had Layer A/B re-surfaced)

---

## DRIFT-07 — Path-of-least-resistance default ($use over $extends)

- **Date:** 2026-05-07
- **Drift indicator:** Initial AUDIT-011 Phase b/c implementation proposal used Prisma `$use` middleware API (consistent with existing `phiEncryption.ts:applyPHIEncryption` pattern) when robust path required `$extends` API (Prisma 5+ recommended; future-compatible). Path-of-least-resistance default chose consistent-with-existing over robust-future-proof
- **Trigger:** Self-catch during PAUSE 1 inventory + operator confirmation (operator explicitly chose `$extends` per robust-over-consistent-with-existing posture)
- **Mechanism update:** Mechanism 2 indicator codified — "consistent-with-existing-pattern preference when robust diverges" added to self-watch list. Decision frameworks: "robust over consistent-with-existing" entry codified — when an existing pattern is being deprecated by upstream OR represents tech debt being repaid, parallel new work adopts the robust path AND the existing pattern migrates in same PR per §17.3 sister-bundle-during-coordinated-migration
- **Sister cross-reference:** AUDIT-011 PR #262 Step 2 phiEncryption.ts $use → $extends migration (sister-bundled per §17.3); 11th §17.1 architectural-precedent (TS inference erosion through generic $extends chain)

---

## DRIFT-08 — Cross-session prompt-paste mismatch caught at agent-side

- **Date:** 2026-05-08
- **Drift indicator:** Operator pasted Step 7.3-A audit-log-write smoke-test prompt that referenced files (`.tmp_audit_log_write.js`) and prior steps (Step 7.3-A network configuration resolution) that did not exist in this session's context. Without robust palantir context-verification discipline, agent could have fabricated the file from scratch + assumed Step 7.3-A inventory state, leading to phantom infrastructure work
- **Trigger:** Self-catch via robust palantir context-verification (filesystem `find .tmp_audit_log_write*` returned empty; conversation grep returned zero prior references). Agent halted before fabricating + surfaced 3-path clarification request (context-paste mismatch / merge-first-then-restart / author-from-scratch with full context)
- **Mechanism update:** No mechanism update needed; safeguards held as designed. Logged as discipline-success-by-mechanism rather than drift-by-failure. Sister to AUDIT-022 successful-prevention precedent (mechanism caught error before harm). Reinforces "verify-before-proceed" pattern: when a prompt references prior context (files / steps / inventory state), verify presence before assuming ability to continue
- **Sister cross-reference:** Operator confirmed context-paste mismatch on 2026-05-08; halt held cleanly; PR #263 merge-gate work resumed without drift

---

## DRIFT-09 — Defensive hedging when project context establishes the answer

- **Date:** 2026-05-08
- **Drift indicator:** Surfaced two-path option (Path 1 / Path 2) at PAUSE 2.5 deliverables prompt when project context (operator profile + Day 11 RDS decommission evidence + SESSION_JOURNAL.md + CLAUDE.md §9) already established AWS CLI access readiness. Hedged on whether operator could run aws-cli commands at all when prior session arc proved this capability multiple times.
- **Trigger:** Operator caught at "shouldnt you know if AWS is access ready based on our work" prompt during AUDIT-078 PAUSE 2.5
- **Mechanism update:** Pre-response context check — does project context (operator profile / strategic context / SESSION_JOURNAL state / register evidence / CLAUDE.md sections) already answer the framing question? If yes, do NOT surface the hedge. Apply Mechanism 1 Layer A/B output template discipline (artifact = proof protocol ran) to context-availability questions: established context = answered question = no hedge.
- **Sister cross-reference:** DRIFT-08 (cross-session prompt-paste mismatch caught at agent-side via robust palantir context-verification — vigilance success); DRIFT-09 is the inverse-failure mode (over-cautiousness when context already answers). Both are robust palantir context-verification discipline catches; DRIFT-08 = correct application; DRIFT-09 = misapplication.

---

## DRIFT-10 — Failure to surface fundamental scope-question reframe at PAUSE 1

- **Date:** 2026-05-08
- **Drift indicator:** AUDIT-078 PAUSE 1 inventory caught §17.1 13th IaC-FRAMEWORK axis reframe (parallel terraform/ tree) but failed to surface "does AUDIT-078 closure require CFN stack-import OR does load-bearing HIPAA gap close via smaller scope?" reframe; defaulted to register-entry-literal scope (γ scope ~6-9h CFN-import path) without considering α scope alternative (document-and-defer-IaC ~3-4h)
- **Trigger:** Operator caught at "is this the best robust palantir plan?" question at PAUSE 2.5 facts-collection gate
- **Mechanism update:** PAUSE 1 inventory must include explicit "does this work block need to do what register entry literally says, OR does the LOAD-BEARING HIPAA/security gap close via smaller scope?" question. Sister to §17.3 scope discipline + AUDIT-081 D4 option-C deferral pattern (User.email DEFERRED from AUDIT-075 to preserve login-flow integrity = analogous α reframe at design-decision time, not PAUSE 1). AUDIT-078 needs the equivalent catch at PAUSE 1.
- **Sister cross-reference:** AUDIT-075 D4 option-C deferral (analogous catch at design-decision time); AUDIT-078 α reframe (the catch this drift entry codifies); §17.3 scope discipline (sister-bundle vs separate-PR judgment).

---

## DRIFT-11 — Failure to surface deferred-filing candidate as load-bearing rather than bullet-buried

- **Date:** 2026-05-08
- **Drift indicator:** AUDIT-078 PAUSE 2.6 surfaced AUDIT-XXX-future-encryption-at-rest-architecture-summary candidate; bullet-buried under "documentation-clarification scope" framing rather than dedicated load-bearing section. Sister-pattern miss vs AUDIT-075 PAUSE 2.5 DOB-removal which received documented-rejection treatment with full design context preservation.
- **Trigger:** Operator caught at "if its worth filing a design note, should we somehow address this in our prompt?" during AUDIT-078 PAUSE 2.6 OUTCOME A surface
- **Mechanism update:** When PAUSE-N escape hatch surfaces a deferred-filing candidate, give it dedicated load-bearing section in operator response (sister to AUDIT-075 PAUSE 2.5 DOB-removal documented-rejection treatment), NOT buried bullet under generic "documentation" framing. Apply project rules §17.3 ("Tech debt gets named via explicit AUDIT entry and paid down, never propagated silently") to FILING DRAFTING discipline, not just remediation discipline.
- **Sister cross-reference:** DRIFT-09 (defensive hedging when context establishes the answer; sister content-vs-surface-scope drift pattern); DRIFT-10 (failure to surface fundamental scope-question reframe at PAUSE 1; sister missed-load-bearing-question pattern).

---

## DRIFT-12 — Multi-step work block surfaced "Step N complete" without enforcing pre-Step-N dependency on prior-step verification

- **Date:** 2026-05-08
- **Drift indicator:** AUDIT-078 Block A Step 2 runbook authoring proceeded without verifying Block A Step 1 production-side apply (`modify-db-cluster`) had executed; mini-PAUSE-A surface claimed Step 2 complete with placeholder bracket text in Step 1 outputs slot (`[paste modify-db-cluster JSON output here]`). Bracket-placeholder treated as resumable-state instead of halt-and-verify signal.
- **Trigger:** Operator caught at "is Step 1 actually applied?" verification command (subsequent `aws rds describe-db-clusters` confirmed BackupRetentionPeriod=7 still — apply had NOT executed at mini-PAUSE-A surface time)
- **Mechanism update:** Pre-step verification gates must surface explicit "prior step output verified" line in mini-PAUSE-N surface; missing-or-placeholder gate = drift signal. Apply Mechanism 1 Layer A/B output template discipline (artifact = proof protocol ran) to multi-step work blocks: each step's mini-PAUSE surface MUST reference prior step's verified output text, not bracket-placeholder. Bracket-placeholder = halt + verify + log drift before proceeding.
- **Sister cross-reference:** DRIFT-08 (vigilance-success at protocol-start verification; DRIFT-12 is inverse-failure at protocol-mid-step verification gate); DRIFT-11 (failure to surface deferred-filing candidate as load-bearing — same content-vs-surface-scope pattern: bullet-buried at content scope vs surface scope; DRIFT-12 = bracket-placeholder at content scope vs surface scope). Mechanism 1 artifact discipline applies at protocol-start AND at protocol-mid-step verification gates.

---
