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

## DRIFT-13 — Runbook section references executable procedure artifact that does not exist on filesystem

- **Date:** 2026-05-09
- **Drift indicator:** AUDIT-078 runbook §6.3 references backend/scripts/audit-078/sample-row-decrypt.sh; filesystem check returned "No such file or directory"
- **Trigger:** Sub-step 2 PHI-row-state inventory verified script absent during evidence-source read for D3 (d) verification framing decision
- **Mechanism update:** Runbook authoring at PAUSE 3 verification battery + Lever 4 self-check must include filesystem-existence check on every script reference + cross-file artifact reference. Add to AUDIT-METHODOLOGY.md verification battery checklist.
- **Sister cross-reference:** DRIFT-12 (multi-step "Step N complete" without prior-step verification — surface-vs-reality verification gap pattern); DRIFT-11 (deferred-filing candidate bullet-buried — surface-vs-content-scope pattern). DRIFT-13 = surface-vs-filesystem verification gap pattern.

---

## DRIFT-14 — Multi-terminal paste-target drift (operator-side caught)

- **Date:** 2026-05-09
- **Drift indicator:** Operator pasted natural-language Sub-step 2 prompt content into PowerShell instead of Claude Code agent terminal; PowerShell threw multiple cmdlet-not-found errors; zero AWS state change but caught at next surface
- **Trigger:** Operator caught at PowerShell error output in Sub-step 2 retry sequence
- **Mechanism update:** When operator-side prompt-author narrates multi-step instructions involving 2+ terminals (operator-side PowerShell + Claude Code agent terminal), label EVERY paste-block with explicit terminal target at top of code block (e.g., "PASTE TO POWERSHELL:" or "PASTE TO CLAUDE CODE AGENT TERMINAL:"). Sister to AUDIT-016 PR 3 confirmation-gate label discipline.
- **Sister cross-reference:** DRIFT-08 (cross-session prompt-paste mismatch caught at agent-side via context-verification — vigilance success); DRIFT-14 is sister-failure-mode (paste-target drift caught at terminal-error-output instead of pre-paste verification).

---

## DRIFT-15 — Operator-side wall-clock estimate anchoring to raw-scope rather than empirical AI-assisted multiplier

- **Date:** 2026-05-09
- **Drift indicator:** Operator-side prompt-author systematically over-estimated agent wall-clock across multiple turns this arc (Block B 4m26s vs ~1-1.5h estimate; Block C ~5min vs ~10-20min recalibrated band; both well under estimate). Pattern repeated even after Block B evidence.
- **Trigger:** Self-catch on Block C surface; recalibration logged at PAUSE 3.1
- **Mechanism update:** Recalibrate estimates against empirical multiplier from same session, not raw-scope assumptions. After 2+ data points within session, anchor to observed multiplier band.
- **Sister cross-reference:** DRIFT-09 (defensive hedging when context establishes answer; DRIFT-15 is sister content-ignored-context drift pattern); capacity-calibration discipline at strategic_continuity Step 4.

---

## DRIFT-16 — Rationalizing path-of-least-resistance as scope discipline when robust posture demands extending timeline rather than reducing scope

- **Date:** 2026-05-09
- **Drift indicator:** Decision 1 (α V0-only D3 (d) framing vs β V2-verified-via-AUDIT-016-PR-3-pre-execute) initially recommended α via §17.3 scope discipline framing; operator-side caught when explicitly asking "no tech debt" question twice. α was path-of-least-resistance (~3-4h closure today vs multi-hour AUDIT-016 PR 3 production-execute today); §17.3 scope-discipline framing was rationalization not robust posture. β IS the structurally-correct call per <strategic_context> 2026-05-03 ("extend timeline, do not reduce scope") + <decision_frameworks> ("robust over consistent-with-existing").
- **Trigger:** Operator caught at "no tech debt" reframe question (asked twice); Decision 1 reframed α → β1 single-arc
- **Mechanism update:** When enumerated options reduce scope of a multi-select pass-criteria locked at prior PAUSE (e.g., D3 (a)+(b)+(d) reduced to (a)+(b)+(d-V0-only)), surface explicitly as scope-reduction not scope-discipline. Sister to §17.3 scope discipline rule itself: scope-discipline = "ship separate work blocks separately" NOT "reduce locked scope." Tech-debt named via explicit AUDIT entry, not propagated via deferred-filing-pattern.
- **Sister cross-reference:** DRIFT-09 (defensive hedging when context establishes answer; DRIFT-16 is sister context-rationalized-away drift pattern); §17.3 scope discipline rule clarification needed.

---

## DRIFT-17 — PR-merged ≠ deployed-to-production verification gap

- **Date:** 2026-05-09
- **Drift indicator:** AUDIT-016 PR 2 shipped envelope-emission infrastructure 2026-05-07 with task-def env wiring assumed; production task def lacked PHI_ENVELOPE_VERSION + AWS_KMS_PHI_KEY_ALIAS env vars for ~2 days; surfaced by Observation 3-EXTENDED ECS describe-task-definition probe at Pre-Phase-1 substance check
- **Trigger:** Agent-surfaced at PAUSE 2.20.0a Observation 3-EXTENDED probe
- **Mechanism update:** Add "production task def env-var diff verification" as standard step in clinical-code PR §17 acceptance criteria for any PR that introduces or relies on backend env-var contract changes; sister to §17.5 self-review filesystem-existence check codified at DRIFT-13.
- **Sister cross-reference:** DRIFT-13 (surface-vs-filesystem verification gap; same shape but at deployment layer); DRIFT-12 (multi-step "Step N complete" without prior-step verification).

---

## DRIFT-18 — Defensive hedging on operator-vs-agent execution split when <operator_profile> establishes the answer

- **Date:** 2026-05-09
- **Drift indicator:** Agent's PAUSE 2.20.0b pre-recommendation pulled P3 (register-task-definition mutating) + P5 (update-service mutating) to agent-side execution citing "reversibility" rationale. <operator_profile> establishes operator-execution discipline for mutating actions regardless of reversibility classification. Sister-discipline integrity to AUDIT-016 PR 3 / AUDIT-022 PR #253 / AUDIT-078 Step C operator-side production-execute pattern.
- **Trigger:** Operator-side prompt-author caught at PAUSE 2.20.0b substance-check; reframed Decision A from (i) to (ii) + Decision B with operator-side split for mutating actions
- **Mechanism update:** Mutating-action classification (creates/modifies/deletes external state) takes precedence over reversibility classification when determining agent-vs-operator execution split. Add to AUDIT-METHODOLOGY.md §17 acceptance criteria: "any tool invocation that creates/modifies/deletes external state (AWS / database production write / external API state-change) is operator-side regardless of reversibility classification."
- **Sister cross-reference:** DRIFT-09 (defensive hedging when project context establishes answer); DRIFT-16 (path-of-least-resistance rationalized as scope discipline). DRIFT-18 = operator-vs-agent execution-split drift pattern.

---

## DRIFT-19 — Pre-flight inventory operating on referenced-snapshot rather than empirical-current-state

- **Date:** 2026-05-09
- **Drift indicator:** Step P1 task-def inventory ran `aws ecs describe-task-definition --task-definition tailrd-backend:123` based on prior-session-arc reference (Observation 3-EXTENDED probe earlier today). Agent assumed :123 was current production state. Latest active revision at execute-time was actually :182 (59 revisions ahead). DRAFT against :123 base would have created revision based on 11+ day old container config; deploy would have regressed 59 revisions of config evolution.
- **Trigger:** Operator-side pre-flight verification at PAUSE 2.20.0b.1 (V2 collision check against revision 124) → diagnostic R1-R6 → DRIFT-19 caught at substance-check
- **Mechanism update:** Pre-flight inventory of mutating-state must include BOTH (1) identity-by-reference check (what does this specific identifier look like?) AND (2) identity-as-current check (what is the latest / what is running / what is deployed?). Single-identifier reference checks are insufficient when underlying state evolves continuously (CI-driven deploys / external mutation cadence). Sister-discipline to AUDIT-078 PAUSE 2.5-α facts-dump verify-before-execute.
- **Sister cross-reference:** DRIFT-13 (surface-vs-filesystem verification gap); DRIFT-17 (PR-merged ≠ deployed-to-production); DRIFT-19 = referenced-snapshot-vs-current-state verification gap pattern.

---

## DRIFT-20 — Operator-side prompt-author drafted bash one-liner without testing syntax against operator's shell environment

- **Date:** 2026-05-09
- **Drift indicator:** S1 revision-cadence diagnostic used xargs -I{} pattern that failed in Git Bash on Windows (xargs interpreted JSON array brackets as invalid identifiers; AWS CLI rejected). Operator-side caught at S1 error output.
- **Trigger:** S1 paste produced multiple "Family contains invalid characters" + "Invalid revision number" errors
- **Mechanism update:** Bash one-liners involving JSON parsing / piping / xargs must use simpler patterns (for loops over xargs; jq over awk one-liners) AND verify against operator's known shell environment (Git Bash on Windows specifically) before paste. Sister to DRIFT-13 surface-vs-execution-validity verification gap pattern.
- **Sister cross-reference:** DRIFT-13 (surface-vs-filesystem verification gap; DRIFT-20 = surface-vs-execution-validity verification gap pattern at one-liner-drafting layer).

---

## DRIFT-21 — Verification-script bug producing false-clean state masked underlying empirical reality

- **Date:** 2026-05-09
- **Drift indicator:** Agent's initial draft script at PAUSE 2.20.0b-revised mutated dict before writing base-copy, producing zero-diff false-clean state for what should have been a +2-env-var addition. Agent self-caught + fixed via copy.deepcopy isolation before producing misleading output.
- **Trigger:** Agent self-catch at PAUSE 2.20.0b-revised draft output (zero-diff for an intended +2-env-var addition is structurally implausible)
- **Mechanism update:** Any verification-output that's "expected to show changes but shows nothing" should trigger investigation rather than acceptance. The empty diff for a +2-env-var add is structurally implausible; should be a pause signal. Sister to §17.5 self-review codification (DRIFT-13 mechanism precedent). Codify "implausible-clean-state pause signal" as verification-script discipline.
- **Sister cross-reference:** DRIFT-13 (surface-vs-filesystem verification gap); DRIFT-21 = verification-script-output-implausibly-clean pattern.

---

## DRIFT-22 — Operator-side step-skip when sister-discipline pre-flight gate is mid-sequence

- **Date:** 2026-05-10
- **Drift indicator:** After REBASE cleanup, operator pasted Step P3 register-task-definition directly without running T1 race-recheck immediately prior. T1 was the gating pre-flight step for P3 register; step-skip risk was implicit in multi-step narration without explicit gating bundling.
- **Trigger:** P3 register paste arrived in next operator turn without T1 paste in between
- **Mechanism update:** When narrating multi-step instructions where later steps gate on earlier verifications, bundle gate-and-execute into single paste-block with inline gate logic. Do not rely on operator to remember + sequence + paste gating verifications separately. Sister to DRIFT-23 combined-paste-block discipline + cygpath / bash-script-file pattern for multi-step scripts.
- **Sister cross-reference:** DRIFT-12 (multi-step "Step N complete" without prior-step verification gate); DRIFT-22 = operator-side gate-skip vs DRIFT-12 agent-side prior-step-verify-skip.

---

## DRIFT-23 — Combined-paste-block with set -e + exit 1 pasted directly into interactive Git Bash terminates parent shell window

- **Date:** 2026-05-10
- **Drift indicator:** Operator-side prompt-author drafted combined STAGE 1-8 bash block with `set -e` + `exit 1` for fail-fast gating; operator pasted directly into interactive Git Bash; first `exit 1` (or fail-fast trigger) terminated parent shell window since interactive shell has no subshell isolation.
- **Trigger:** Operator-side caught when Git Bash window closed during STAGE 1-8 paste
- **Mechanism update:** Combined multi-stage bash scripts that use `set -e` + `exit` for fail-fast MUST ship as files + run via `bash <script>` invocation (creates subshell; exit terminates script not parent shell), NOT paste-as-interactive-block. Add to operator-side prompt-author discipline: any bash block >5 lines or using set -e + exit gating ships as script-file, not paste-block.
- **Sister cross-reference:** DRIFT-20 (drafted bash one-liner without testing operator's shell environment; same surface-vs-execution-validity gap at one-liner layer); DRIFT-23 = surface-vs-execution-validity gap at multi-step-script-paste layer.

---

## DRIFT-24 — Prompt-author meta-drift: bracketed-placeholder references to "prior bootstrap" content across fresh-context session boundaries

- **Date:** 2026-05-10
- **Drift indicator:** Operator-side prompt-author drafted refined bootstrap with placeholder-references ("[full text per prior bootstrap]" / "[unchanged from above]") that did not carry into fresh-context Claude Code session; agent caught at STAGE 3 PAUSE 3-pre via bracket-placeholder + missing-content vigilance discipline
- **Trigger:** Fresh-context Claude Code session start; agent halted at STAGE 4 file editing because referenced content was not in agent's session memory; recovery path 1 selected (paste full inline content)
- **Mechanism update:** Multi-content bootstrap MUST ship as single paste-block with all referenced content inline; placeholder-references across fresh-context session boundaries are explicit anti-pattern. Add to operator-side prompt-author discipline: any bootstrap intended to author multiple files must inline every referenced content block; "see prior turn" / "per prior bootstrap" / "[unchanged]" is fabrication-by-extrapolation risk if not present in agent context.
- **Sister cross-reference:** DRIFT-08 (cross-session prompt-paste mismatch caught at agent-side via robust palantir context-verification — vigilance success); DRIFT-22 (operator-side step-skip with sister-discipline gate mid-sequence; DRIFT-24 = prompt-author meta-drift sister-pattern at fresh-context boundary).

---

## DRIFT-25 — Fresh-context bootstrap stale-anchor pattern: bootstrap-author state at authorship time differs from agent-execute time when CI/CD pipeline operates between

- **Date:** 2026-05-11
- **Drift indicator:** β1 Phase 1 fresh-context bootstrap authored anchor-by-reference to production task def revision :183 (state at Pre-Phase-1 sub-arc close 2026-05-10T05:52:54Z). PR #268 squash-merge to main triggered CI/CD pipeline (per CLAUDE.md §15 RULE 5: register new task def with commit SHA); :184 registered + deployed automatically with merge commit a11f3df at 2026-05-10T22:54:24 -0700 (~11h after Pre-Phase-1 close). All 3 PHI env vars carried forward verbatim from :183 → :184 (PHI_ENVELOPE_VERSION=v2 + AWS_KMS_PHI_KEY_ALIAS=alias/tailrd-production-phi + PHI_LEGACY_PLAINTEXT_OK=false). Benign carry-forward; not a regression.
- **Trigger:** Agent caught at STAGE 2 Verification 1 of Phase 1 bootstrap; PAUSE 3-pre fired correctly per DRIFT-19 sister-signal. Operator approved GO + amend recovery path.
- **Mechanism update:** Multi-day fresh-context bootstraps that reference deploy-time-mutating-state (ECS task def revision; running container SHA; AWS resource versions) must include explicit "verify-current-state" framing instead of "anchor-by-reference-from-prior-session" framing. Add to operator-side prompt-author discipline: bootstrap-authoring across CI/CD-pipeline-cadence must use latest-current-state probes (e.g., "verify production task def revision matches PHI env-var spec; revision number unknown at bootstrap-author time") rather than literal-SHA references.
- **Sister-cross-reference:** DRIFT-19 (referenced-snapshot-vs-current-state at agent pre-flight inventory layer; DRIFT-25 = sister-pattern at operator-prompt-author layer across CI/CD-cadence boundary); DRIFT-24 (prompt-author meta-drift across fresh-context session boundaries; DRIFT-25 = sister at CI/CD-deploy-cadence boundary specifically); CLAUDE.md §15 RULE 5 (CI/CD auto-deploy on main merge as documented + expected behavior, not the drift).

---

## DRIFT-26 — Runbook assumes execution environment that operator does not possess (sister to DRIFT-13 at infrastructure layer)

- **Date:** 2026-05-11
- **Drift indicator:** AUDIT-016 PR 3 + AUDIT-022 PR #253 production runbooks both prescribe `npx tsx <script> --execute` with no execution-environment provision. Sister to DRIFT-13 (runbook references nonexistent script — surface-vs-filesystem verification gap) but at infrastructure-environment layer instead of filesystem layer. Operator's local Windows + PowerShell host lacks VPC route to production Aurora; runbooks assumed connectivity that doesn't exist for that operator-host.
- **Trigger:** β1 Phase 1 STEP 1.3 dry-run PrismaClientInitializationError; Aurora endpoint unreachable from operator-local; investigated 3 runbooks + register + CLAUDE.md §9 + §15; gap fundamental + not previously recognized.
- **Mechanism update:** Runbook authoring discipline must include "execution environment" §0 prerequisites surfacing: which host runs the command; what VPC connectivity that host has; what IAM credentials it presents; what env-var inheritance path it uses. Add to AUDIT-METHODOLOGY.md §17 acceptance criteria for any runbook that prescribes operator-executed commands against VPC-private infrastructure: must specify execution host + connectivity provision + verification step.
- **Sister-cross-reference:** DRIFT-13 (surface-vs-filesystem verification gap at script-reference layer); DRIFT-17 (PR-merged ≠ deployed-to-production verification gap at deployment layer); DRIFT-26 = surface-vs-environment verification gap at runtime-host + connectivity layer. AUDIT-085 codifies the architectural resolution.

---

## DRIFT-27 - Inspect-only-vs-strip middleware test coverage gap at Prisma operation-surface differential

- **Date:** 2026-05-11
- **Drift indicator:** AUDIT-011 Phase b/c middleware (`prismaTenantGuard.ts`) wraps Prisma `$extends.query.$allOperations` to INSPECT args for `TENANT_GUARD_BYPASS_KEY` but never STRIP the key before passing args to underlying `query()`. Inspection-only design + test coverage that only exercises where-style args (findUnique B1 test) → false-clean signal across all unit tests. Production discovery surface: AUDIT-016 PR 3 STEP 1.5 mid-flight execute. The call `prisma.auditLog.create({ data, __tenantGuardBypass: true })` triggered Prisma 5.22 create() strict args schema rejection ("Unknown argument `__tenantGuardBypass`"). Test design missed the create()-vs-where-clause operation surface differential entirely.
- **Trigger:** β1 Phase 1 STEP 1.5 PAUSE 1.5.1 fired at 2026-05-11T18:52:11Z when first per-target PHI_MIGRATION_BATCH_COMPLETED audit write failed (~9 min into execute; patients.firstName target boundary). AUDIT-086 filed HIGH P1. Sister-evidence: same pattern at `auditLogger.ts:214` means every production `writeAuditLog()` DB write had been failing-silent for ~24h since :183 deploy on 2026-05-10; HIPAA_GRADE_ACTIONS would have 500'd authenticated traffic; low-traffic β1 window masked exposure.
- **Mechanism update:** AUDIT_METHODOLOGY.md §17 acceptance criteria addition: middleware-pattern tests for any `$extends`-based args-modifying middleware MUST cover ALL Prisma operation surface types: create + createMany + findFirst + findMany + update + updateMany + delete + deleteMany + upsert + count + aggregate + groupBy + findUniqueOrThrow + findFirstOrThrow. Prisma 5.22 schema validation differs across operation types; where-clause ops tolerate extra top-level keys (false-clean signal at unit-test layer); create / createMany ops are strict and reject. Test design must enumerate operation surfaces, not assume "one happy-path test covers all ops". Additionally: when middleware adds metadata keys to args via wrap pattern (bypass markers, scope tags, audit context, etc.), the middleware MUST strip the key before invoking underlying `query()`; the inspect-only pattern is the explicit anti-pattern this DRIFT names.
- **Sister-cross-reference:** DRIFT-21 (verification-script false-clean state at output-layer → DRIFT-27 sister at test-design layer; both share the shape: real defect masked because checker scope < actual surface scope); DRIFT-19 (verify-before-execute at agent pre-flight layer → DRIFT-27 sister at code-design + test-coverage layer; both: empirical verification scope must match actual execution scope); AUDIT-011 Phase b/c (the producing artifact: defined the marker contract without strip semantics); AUDIT-086 (the consuming finding + remediation PR: closes the strip gap + closes the test coverage gap with new GROUP G unit tests).

---

## DRIFT-32 - Sister-pattern adoption gap at candidate-set-advance layer when SQL discriminator does not shrink

- **Date:** 2026-05-14
- **Drift indicator:** sister-pattern adoption gap (SQL discriminator vs post-fetch in-memory discriminator at candidate-set-advance layer). `backend/scripts/migrations/audit-016-pr3-v2-rekey-purpose.ts` was forked from `backend/scripts/migrations/audit-016-pr3-v0v1-to-v2.ts` and adopted the fetch-loop shape verbatim. The sister script relies on a shrinking SQL candidate set (filter `LIKE 'enc:v0:%' OR LIKE 'enc:v1:%'` shrinks as rows are rekeyed to v2 and excluded by subsequent fetches) as its progress-advance invariant. The V2-to-V2 rekey case cannot rely on this discriminator because pre-rekey and post-rekey envelopes both match `LIKE 'enc:v2:%'` (rekey swaps only `EncryptionContext.purpose`, not envelope-format prefix). On a 100 percent already-canonical target the candidate set never shrinks; the offset never advances past N; the loop produces N skipped rows per iteration indefinitely.
- **Trigger:** production halt at 2h45min on target 1 of 82 (`audit_logs.description`) with skip count 274x expected row count and zero rekeyed rows. Operator-side detection via wall-clock + log inspection; no automated halt.
- **Mechanism update:** `docs/audit/AUDIT_METHODOLOGY.md §17 PR acceptance criteria` to be amended in a follow-up methodology PR (declaration to be added then; this entry creates the forcing function). Requirement: when a new migration script is forked from a sister, the PR description must enumerate the invariants the sister relies on, and declare which the new script preserves vs which require an adapted implementation. For audit-016-pr3-v2-rekey-purpose.ts the missed adaptation was the candidate-set-advance invariant: the sister relies on SQL filter contraction, the V2-to-V2 case requires a keyset cursor over row id because the SQL discriminator does not shrink. The forcing function: a forward sister-invariant declaration would have surfaced the gap at PR review rather than at 2h45min wall-clock in production.
- **Sister-cross-reference:** DRIFT-19 (pre-flight inventory operating on referenced-snapshot rather than empirical-current-state; sister at agent pre-flight layer to DRIFT-32 sister-script invariant-snapshot at PR-review layer); DRIFT-21 (verification-script false-clean state masked underlying empirical reality; sister at output-layer vs DRIFT-32 sister-script-pattern-layer; both share the shape: assumed invariant carries but actually does not). Forward link to AUDIT_METHODOLOGY.md §17 amendment PR (sister-script invariant-preservation declaration).

---

## DRIFT-33 - Priority-check drift via path-of-least-resistance rationalization

- **Date:** 2026-05-15
- **Drift indicator:** Chat-side Claude proposed methodology PR (verification debt; §17.X sister-script invariant-preservation declaration) over OPEN production-readiness gate items (AUDIT-016 PR 3 STEP 1.7 production-execute HIGH P1; AUDIT-001 Tier A CRITICAL P0; AUDIT-080 Zod MEDIUM P2). Rationale offered: "small scope" framing and "freshness of forward-link" framing. Mechanism 2 indicators that fired: "mechanical/easier work proposed when architectural/harder is higher-priority OPEN" and "path-of-least-resistance framing on architectural choice."
- **Trigger:** Operator instruction to re-read project instructions and provide corrected next prompt; operator caught drift via direct re-read instruction rather than explicit "drift" callout.
- **Mechanism update:** Layer A/B surface of "OPEN production-readiness gate items" alone is insufficient. The 5-step protocol Step 1 priority check must explicitly survive a path-of-least-resistance check before recommending a non-gate-item work block. New Mechanism 2 indicator entry: "rationale invoking 'small scope' / 'while fresh' / 'satisfies forward-links' as override for OPEN gate items" maps to correction "re-rank; recommend the gate item; treat verification-debt and forward-link satisfaction as fillable in any subsequent capacity window." Sister-discipline addition: when an OPEN gate item is HIGH P1 or CRITICAL P0 per register-literal severity, no methodology / verification-debt / forward-link-satisfaction PR may be proposed ahead of it absent explicit operator override.
- **Sister-cross-reference:** DRIFT-02 (ordering drift: Batch 4 over patient-safety-active ABI; sister at clinical-audit prioritization layer to DRIFT-33 sister at production-readiness gate-item prioritization layer; same shape: ease-of-execution weighting over severity-impact weighting); DRIFT-09 (defensive hedging when context establishes the answer; sister at recommendation-discipline layer); §18 status-surface register-literal severity discipline (sister: register-literal severity must drive priority recommendation, not chat-side re-classification or scope framing).

---

## DRIFT-34 - Scope-recital drift treating deferred module as pending

- **Date:** 2026-05-15
- **Drift indicator:** Chat-side Claude and Claude Code agent both classified CX module as "PENDING" in priority surfaces and Phase 0 readiness framing. Per strategic_context in project instructions: "Scope is 6 modules: HF, EP, SH, CAD, VHD, PV. CX module is deferred from current scope per operator decision 2026-05-03, revisit in v2.0 PATH_TO_ROBUST. Operative gap count is 603 (708 minus 105 CX)." Treating a deferred module as pending introduces a false v2.0 input dependency and inflates Phase 0 readiness gap framing.
- **Trigger:** Operator catch via direct question "we are not doing the CX module right now, does that change the prompt." Chat-side surfaced "CX module PENDING" in Layer A; agent inventory Section C classified CX PENDING and Section E.3 listed CX as a v2.0 input dependency. Both would have propagated into the next priority decision absent the catch.
- **Mechanism update:** Scope reads must check strategic_context deferral decisions before classifying any item as PENDING. "Absent from filesystem" does NOT equal "pending"; deferred items are absent by design. New Mechanism 2 indicator: "module / finding / work item classified PENDING based on filesystem absence without checking strategic_context for deferral" maps to correction "re-read strategic_context; restate scope; re-classify deferred items as DEFERRED not PENDING." Sub-mechanism: when reading project instructions, parse strategic_context first; deferral and out-of-scope decisions are load-bearing for any priority surface or gap analysis.
- **Sister-cross-reference:** DRIFT-33 (priority-check drift via path-of-least-resistance rationalization; sister at priority-recommendation layer; both share shape: surface read missed a canonical-doc constraint that should have over-ridden the heuristic). §18 status-surface register-literal severity discipline extends to scope-literal sourcing; surface readings must trace to canonical doc, not inferred filesystem state.

---

## DRIFT-35 - Sister verification tooling not coordinated-migrated when canonical encryption primitive was introduced or rotated

- **Date:** 2026-05-16
- **Catalyst PR / surface:** AUDIT-016 PR3 STEP 1.7 attempt-4 §10.7 GO/NO-GO verdict construction (chat-side).
- **Drift indicator:** PR #258 (AUDIT-016 Implementation PR 2, 2026-05-07) introduced canonical 'phi-encryption' purpose in production middleware (phiEncryption.ts L72-79 BASE_ENCRYPT_CONTEXT + contextFor). The spotcheck-decrypt.ts verification script authored later in PR #272 + PR #273 was bound to the legacy 'phi-migration-v0v1-to-v2' purpose. No PR between #272 and the rekey-arc PRs (#274, #275, #276, #277) classified the spotcheck as a persistent reader of post-rotation envelopes that would require flipping at the rotation-arc landing. The gap surfaced at the §10.7 invocation attempt post-rekey when the verdict-construction step traced an override-file-missing blocker into a deeper reader-purpose mismatch.
- **Trigger:** Chat-side caught at §10.7 GO/NO-GO verdict construction (2026-05-16). The runbook references override file runtask-override-step-1-7-spotcheck-execute.json that does not exist on filesystem (sister to DRIFT-13 surface-vs-filesystem gap) AND the spotcheck script source-of-truth purpose constant does not match the rekey script's NEW_PURPOSE = 'phi-encryption'. Invocation halted before ECS RunTask launch. Verification would have produced 25-of-25 KMS InvalidCiphertextException not because rekey failed but because verification reader bound to pre-rekey primitive; misdiagnosis would have triggered §10.9 unnecessary rollback destroying 495,362 correctly-rekeyed rows.
- **Mechanism update:** New §17.1 architectural-precedent catalog entry (14th overall): When a canonical encryption primitive is introduced or rotated, ALL readers of envelopes under the prior primitive must be classified at the introducing or rotating PR (one-shot legacy OK / persistent reader MUST flip in PR-N or in sister PR landing before rotation runs in production). Test fixtures follow the production reader they pin. Discovery + fix + codification ship together per §17.3.
- **Sister-cross-reference:** DRIFT-13 (surface-vs-filesystem verification gap at script-reference layer; DRIFT-35 stacks identical-layer drift atop reader-primitive mismatch at the same surface, runbook §10.7 instance manifests both gaps); §17.1 14th architectural-precedent (coordinated migration of sister verification tooling); §17.3 scope discipline (every persistent reader classified at PR-N); §17.5 pre-PR self-review (no silent deferrals); §18.3 status-surface discipline (deferred readers carry register OPEN entries, not bullet-buried followup flags).

---

## DRIFT-36 - Chat-side path-of-least-resistance recommendation rationalized as pattern-consistency framing

- **Date:** 2026-05-18
- **Catalyst PR / surface:** AUDIT-016 PR3 STEP 1.7 PR #278 PAUSE 4 step 4.5; choice of whether to bundle AUDIT_FINDINGS_REGISTER.md AUDIT-016 sub-note into the single squashed commit (Path A: force-push amend) or land separately post-merge (Path B: separate follow-on PR).
- **Drift indicator:** Chat-side recommended Path B (defer the AUDIT_FINDINGS_REGISTER.md sub-note to a follow-on PR), rationalizing with two framings: (a) "pattern-consistency with PR #276 to PR #277" (the prior anchor-bump cadence landed in two separate PRs), and (b) "force-push noise outweighs bundling value" (single force-push to add one register line treated as friction-heavy). Both framings privilege ease-of-execution over robustness. The robust posture for an arc closing a HIPAA-relevant production-readiness gate item is ONE atomic PR carrying all related artifacts (DRIFT register entry + methodology codification + register cross-reference + status-surface ledger update).
- **Trigger:** Operator corrected with "most robust next step, lets go" selecting Path A (force-push amend). Single force-push to feat branch with --force-with-lease landed without incident.
- **Mechanism update:** Existing coverage at <decision_frameworks> "robust over consistent-with-existing" + Mechanism 2 indicator "Path-of-least-resistance framing on architectural choice" (per DRIFT-33). This DRIFT entry pairs the dated 2026-05-18 catch with the existing mechanism rather than adding a new indicator; the lesson is that the existing rule applies to "should we bundle artifacts into a force-push amend" decisions, not only to "which work block should we recommend next."
- **Sister-cross-reference:** DRIFT-33 (path-of-least-resistance rationalization at priority-recommendation layer; DRIFT-36 is sister at PR-artifact-bundling layer; same shape: ease-of-execution weighting over robustness). <decision_frameworks> "robust over consistent-with-existing" entry (canonical mechanism). §17.3 scope discipline (sister at the PR-shipping discipline layer; both treat half-fix or split-fix framing as a drift signal).

---

## DRIFT-37 - Chat-side day-counting / wall-clock urgency framing on status response instead of work-completion framing against canonical doc deliverables

- **Date:** 2026-05-18
- **Catalyst PR / surface:** Post-PR-#278-merge Phase 0 status response. Chat-side returned a status report led by "Day 19 of Phase 0; v2.0 due TOMORROW (2026-05-19)" framing.
- **Drift indicator:** Chat-side organized the Phase 0 status read around wall-clock urgency (days elapsed, days-until-v2.0-due) rather than work-completion framed against the canonical PATH_TO_ROBUST.md deliverable list (PHASE_0_REPORT verdicts + Phase 4 / Phase 5 / Phase 7 status + Phase 0C status + AUDIT-016 PR3 STEP 1.7 close + AUDIT-001 Tier A status + 708-row implementation matrix + v2.0 doc draft). Day-counting framing inappropriately weights wall-clock proximity to the v2.0 due date and obscures the actual to-do list state.
- **Trigger:** Operator corrected: "i told you i dont care about days, i care about progress against our to do list. we need to complete phase 0." Operator-side caught at chat-side framing layer.
- **Mechanism update:** New Mechanism 2 indicator: "Day-counting / wall-clock urgency framing on status response" maps to correction "replace with work-completion framing against canonical doc deliverables." Status responses must enumerate the canonical to-do list (per PATH_TO_ROBUST.md §5 Phase 0 deliverables + per-Phase upgrade-to-PASS conditions) with done / in-flight / not-started states, NOT a calendar countdown. Wall-clock dates remain in BUILD_STATE.md tracking-ledger surface where they belong as data; they do not belong as the organizing axis of a status response.
- **Sister-cross-reference:** DRIFT-15 (operator-side wall-clock estimate anchoring to raw-scope rather than empirical AI-assisted multiplier; sister at capacity-calibration layer; DRIFT-37 is sister-failure at chat-side status-framing layer). Anti-pattern "Don't conflate raw work-scope with AI-assisted wall-clock in timeline math" extends to status framing: wall-clock proximity to a due date is not the work to-do list. §18 status-surface register-literal discipline (sister: status surfaces must source from canonical doc deliverables, not chat-side reorganization).

---

## DRIFT-38 - Chat-side asserting canonical-source content (commit SHA / line ref / config value / anchor) in a prompt from memory without verification

- **Date:** 2026-05-18
- **Catalyst PR / surface:** AUDIT-016 PR3 STEP 1.7 PR #279 (this PR) PAUSE 1 spec authoring.
- **Drift indicator:** Chat-side authored the PR #279 PAUSE 1 spec asserting that the runbook §10.3.1 prior HEAD anchor was `551e00d` (PR #277). Agent's PAUSE 1 pre-flight grep against the current runbook surfaced the actual value `48930aa` (PR #276). The §10.3.1 anchor points at PR #276 and NOT at PR #277 because PR #277 was itself a docs-only runbook-anchor-bump PR that did not self-reference its own commit SHA; the pattern is "§10.3.1 points at the most-recent CODE PR." Chat-side asserted `551e00d` from inference based on recency rather than grep-verification of current canonical source.
- **Trigger:** Agent surfaced the mismatch at PAUSE 1 Section B + Section E ("CLARIFICATION on operator NOTE"). Operator confirmed at PAUSE 2 entry: "Anchor at §10.3.1 is 48930aa (PR #276 = most-recent CODE PR), not 551e00d. ... agent's verified anchor wins."
- **Mechanism update:** New Mechanism 2 indicator: "Asserting canonical-source content (commit SHA, line ref, config value, anchor) in a prompt from memory" maps to correction "require agent to verify by grep / view first before prompt is locked." Operator-side prompt construction must source canonical values from grep / view / file read at authoring time, not from recall. Sister rule: when an agent surfaces a verified value that contradicts the prompt's asserted value at PAUSE 1, the verified value wins and the prompt is updated, not the inverse.
- **Sister-cross-reference:** DRIFT-19 (referenced-snapshot-vs-current-state at agent pre-flight inventory layer; DRIFT-38 is sister at chat-side prompt-author layer; same shape: stale memory of prior state vs current canonical state). DRIFT-25 (fresh-context bootstrap stale-anchor pattern; DRIFT-38 is sister within-context memory-anchor pattern; same shape: anchor assumed valid by recency rather than current verification). <thinking_guidance> "Pre-flight inventory before architecture" principle (canonical agent-side discipline; DRIFT-38 codifies the same principle's chat-side analog). DRIFT-13 (surface-vs-filesystem verification gap; DRIFT-38 is sister at surface-vs-canonical-doc verification gap; both fall under the broader pre-action-verification mechanism).

---

## DRIFT-39 - Chat-side missed-attached-document parsing: responding to operator message without scanning attached documents

- **Date:** 2026-05-18
- **Catalyst PR / surface:** AUDIT-016 PR3 STEP 1.7 Phase G.4 PAUSE G4.2 confirmation turn; operator pasted PAUSE G4.2 approval output as a document attachment with empty-string message body.
- **Drift indicator:** Chat-side responded "Empty message received" instead of processing the document attachment content. The PAUSE G4.2 approval + NOTES A through D were in the attached document; treating the message as content-empty silently dropped the approval signal AND the operator-provided NOTES that scoped the next PAUSE.
- **Trigger:** Operator corrected with "not empty." Single-turn catch; no propagation.
- **Mechanism update:** New Mechanism 2 indicator: "Responding to an operator message without scanning attached documents" maps to correction "scan attached documents before declaring content empty or missing." Sister rule: when an operator message body appears empty or terse, the FIRST check is whether documents are attached and the SECOND check is whether the documents contain the actual content. The body-empty short-circuit is a chat-side framing failure, not an actual signal absence.
- **Sister-cross-reference:** DRIFT-38 (asserting canonical-source content from memory without verification; DRIFT-39 is sister at input-parsing surface; same shape - chat-side bypassed a verification step that would have surfaced the truth). DRIFT-19 (referenced-snapshot-vs-current-state at agent pre-flight inventory layer; DRIFT-39 is sister at message-content-inventory layer; same shape - operating on inferred state vs verified state). Mechanism 2 broad pattern: "verify before declaring."

---

## DRIFT-40 - Chat-side test-count assertion from memory without verification (recurrence of DRIFT-38 pattern at test-count surface)

- **Date:** 2026-05-18
- **Catalyst PR / surface:** AUDIT-016 PR3 STEP 1.7 Phase G.4 PAUSE G4.2 spec authoring; chat-side wrote "Expected: 56 spotcheck + 8 probe = 64/64 PASS" in the jest verification step instructions.
- **Drift indicator:** Chat-side asserted spotcheck test count from memory. Actual spotcheck.test.ts has had 26 tests since PR #273 (kind-aware SQL jsonb-fix sub-arc; codified at L431-475 of the test file). The "56" was a memory-anchor conflation with keyRotation.test.ts (which has 56 tests since prior key-rotation work). Agent verified at PAUSE G4.2 Section G and surfaced reconciliation: actual was 26 spotcheck + 32 probe = 58/58 PASS. The agent-side verify-and-surface step worked; this DRIFT entry documents the chat-side memory-anchor that motivated the verification.
- **Trigger:** Agent surfaced the discrepancy at PAUSE G4.2 Section G with explicit reconciliation. Operator approved at PAUSE G4.3 entry. Single-turn catch via agent-side verify-and-surface.
- **Mechanism update:** Existing Mechanism 2 indicator from DRIFT-38 ("Asserting canonical-source content - commit SHA, line ref, config value, anchor - in a prompt from memory") ALREADY covers test counts. This DRIFT entry does NOT add a new indicator; it pairs the dated 2026-05-18 catch with the existing mechanism as evidence of recurrence and mechanism-firing-correctly. The lesson: the existing rule's "anchor" category is broader than commit SHAs - it includes ANY canonical-source numeric or text value that can be grepped or counted (test counts, LOC counts, file paths, env var names, etc.).
- **Sister-cross-reference:** DRIFT-38 (parent indicator; DRIFT-40 is literal recurrence at test-count surface; same shape - chat-side memory anchor without verification, agent-side verify-and-surface catches it). DRIFT-19 (referenced-snapshot-vs-current-state at agent pre-flight inventory layer; DRIFT-40 is sister at chat-side test-count-recall layer). DRIFT-38 mechanism reads: "Asserting canonical-source content ... maps to correction 'require agent to verify by grep / view first before prompt is locked.'" DRIFT-40 extends the indicator's surface to test counts, file LOC counts, and similar numeric grep-targets.

---

## DRIFT-41 - Chat-side deferred sister-verification override file authoring post-PR-merge (recurrence of DRIFT-36 pattern at sister-tooling-bundling surface)

- **Date:** 2026-05-18
- **Catalyst PR / surface:** AUDIT-016 PR3 STEP 1.7 PR #283 PAUSE G4.4 approval prompt; chat-side wrote "probe override file authoring deferred to post-PR-merge work block."
- **Drift indicator:** Sister-verification tooling (the ECS RunTask override file required to invoke the probe script) deferred to post-merge follow-on work rather than bundled into the same PR as the probe script + tests. PR #278 got this right (spotcheck override file landed in initial commit alongside spotcheck script + tests). PR #283 missed the sister-pattern lesson. Self-caught at PAUSE G4.4 post-PR-open review before CI terminal state; force-push amend dispatched.
- **Trigger:** Chat-side self-catch reviewing the post-merge sequence section of PAUSE G4.4 output; surfaced the same path-of-least-resistance pattern as the register-sub-note deferral caught at PAUSE G4.3 entry. Third instance in the PR #283 arc (PAUSE G4.3 entry caught register-sub-note deferral; PAUSE G4.4 post-open caught override-file deferral; both same shape).
- **Mechanism update:** Existing Mechanism 2 indicator "Path-of-least-resistance framing on architectural choice / artifact-bundling decision" (per DRIFT-33, DRIFT-36) ALREADY covers. This DRIFT entry pairs the dated 2026-05-18 catch with the existing mechanism as third evidence of recurrence within the same multi-PR arc. The lesson: sister-tooling-bundling (probe + override + tests in one PR) is the §17.1 14th-entry directive's specific operational form; deferring any single artifact splits the coordinated migration. The chat-side keeps proposing deferral; the robust correction is the consistent answer.
- **Sister-cross-reference:** DRIFT-36 (parent indicator at PR-artifact-bundling layer; DRIFT-41 is sister at sister-tooling-bundling surface within the same arc). DRIFT-33 (path-of-least-resistance rationalization at priority-recommendation layer). §17.1 14th entry (coordinated migration of sister verification tooling; DRIFT-41 codifies one operational violation form). §17.1 15th entry (canonical-purpose single-source-of-truth; sister discipline at the same coordinated-migration surface).

---

## DRIFT-42 - Chat-side missed-attached-document parsing on R2 output (recurrence of DRIFT-39 at attached-evidence-dismissal surface)

- **Date:** 2026-05-18
- **Catalyst PR / surface:** AUDIT-016 PR3 STEP 1.7 Phase G.5 R2 writer-hunt prompt dispatch; chat-side received partial R2 evidence document attached to operator follow-up turn and dismissed it as a re-paste of prior content ("Re-paste; same state as prior turn"). Self-correction triggered by operator follow-up turn asking "isn't this the output?"
- **Mechanism update:** Existing Mechanism 2 indicator from DRIFT-39 already covers; this entry pairs the dated catch with the existing mechanism as recurrence evidence. Pattern: attached document with new content parsed as identical to prior turn's document because the visible diff was small and surface-level (same probe verdict header, partial new evidence below the fold).
- **Sister-cross-reference:** DRIFT-39 parent (missed-attached-document); DRIFT-40 + DRIFT-41 family of chat-side recurrence entries from PR #283 / R2 arc.

---

## DRIFT-43 - Chat-side memory-anchor prompt authoring on AUDIT-016 canonical PR-number assertion (recurrence of DRIFT-38 at canonical-PR-identifier surface)

- **Date:** 2026-05-18
- **Catalyst PR / surface:** Phase A PAUSE A.2 DESIGN release prompt; chat-side asserted "PRs #255 + #258 + #259" for the AUDIT-016 implementation arc in the proposed BUILD_STATE.md row 242 fix text. Agent grep-verified via `git log --oneline --all | grep -E "#255|#258|#259|#260|#261"`; canonical truth is `#255 + #260 + #261` (verified via merge commit SHAs `20534e3` + `fbd6f18` + `dfc8519`).
- **Mechanism update:** Existing Mechanism 2 indicator from DRIFT-38 already covers; this entry pairs the dated catch with the existing mechanism as recurrence evidence. Pattern: canonical-identifier anchors (PR numbers, commit SHAs, test counts) authored from chat-side memory without pre-flight git log verification; canonical truth diverges. Bonus drift surfaced and named (out-of-scope per §17.3; scheduled for separate ledger-reconciliation PR): `docs/audit/AUDIT_FINDINGS_REGISTER.md` L54 contains the same stale "#258 (PR 2)" reference.
- **Sister-cross-reference:** DRIFT-38 parent (memory-anchor prompt authoring); DRIFT-40 + DRIFT-42 family of chat-side recurrence entries from PR #283 / Phase A arc.

---

## DRIFT-44 - Em-dash discipline drift at pr-body authoring surface (chat-side + agent-side recurrence within single session arc)

- **Date:** 2026-05-19
- **Catalyst PR / surface:** Phase 0A Phase 4 audit closure arc; PR #284 pr-body chat-side em-dash slip (2-round Select-String catch: 4 initial em-dashes + 7 secondary catch on second pass = 11 total caught and fixed in-flight); PR #285 pr-body agent-side em-dash slip (9 em-dashes caught at B.4.10 pre-flight Select-String scan; fixed to 0 via 3 Edit replacements). Same drift mechanism manifested at both chat-side and agent-side surfaces within the same session arc.
- **Drift indicator:** ASCII-only output discipline violation at pr-body authoring surface. The gap is missing pre-flight scan being part of the standard authoring step rather than ad-hoc operator-side catch. Em-dashes flow through text-generation step without forcing pre-flight check; the constraint is operator persistent memory (`feedback_no_em_dashes`; ASCII-only output discipline; AWS SG descriptions reject non-ASCII outright) but the enforcement mechanism was previously implicit per-PR rather than codified.
- **Trigger:** PR #284 catch: chat-side operator-author of pr-body emitted em-dashes; Select-String scan run after author returned 11 hits across 2 passes. PR #285 catch: agent-author of pr-body via `Write` tool emitted 9 em-dashes; pre-flight Select-String scan at B.4.10 step caught the slip before commit; 3 Edit replacements fixed to 0. DRIFT-44 codification anchors the mechanism as part of the standard PR-authoring + methodology-doc-authoring steps.
- **Mechanism update:** Every PR body authoring step + every methodology-doc authoring step + every BUILD_STATE.md / AUDIT_FINDINGS_REGISTER.md narrative-or-row authoring step MUST include pre-flight em-dash scan on touched files before commit. The target character is U+2014 (em-dash). Scan-pattern variants: (a) full-file scan for newly-authored files via PowerShell `Select-String` against a regex pattern matching the U+2014 character (must return count 0); (b) DELTA scan via `git diff -- <file>` piped into the same `Select-String` against a regex anchored to added-line prefix and the U+2014 character (must return count 0 in new additions per B.4.6 precedent). Two-pass scan if first scan finds matches (per PR #284 chat-side 4 initial + 7 secondary catch pattern). To keep this entry ASCII-clean per the discipline this DRIFT codifies, the literal scan-pattern syntax is omitted here; the operational pattern is canonical in the B.4.6 PowerShell command surface and in any future em-dash-discipline preflight invocation. Sister rule: every operator-instructed text containing the U+2014 character (e.g., a date-prefix followed by U+2014 separator in operator-prompt narrative-entry text) is implicitly opt-in to em-dash-to-hyphen conversion at agent authoring time per persistent feedback memory; agent does not echo U+2014 characters from operator prompts verbatim into authored files.
- **Sister-cross-reference:** `feedback_no_em_dashes` user-memory discipline (canonical ASCII-only output constraint); §17.5 PR self-review (DRIFT-44 codification makes em-dash scan part of the §17.5 checklist for any PR body or methodology-doc authoring); §17.1 16th entry (gitignore pattern pre-flight verification; sister pre-flight discipline at gitignore-pattern-anchoring surface); DRIFT-19 (referenced-snapshot-vs-current-state at agent pre-flight inventory layer; DRIFT-44 is sister at pre-flight verification at output-stage); Mechanism 2 broad pattern: "verify before declaring."

---

## DRIFT-45 - Chat-side canonical-doc grep pre-flight drift at scope-bearing prompt authoring surface

- **Date:** 2026-05-19
- **Catalyst PR / surface:** Phase 0A Phase 4 audit closure arc + methodology PR sister-arc. Two trigger events at scope-bearing prompt authoring within the same session: (1) PAUSE B.1 (Phase 4 kickoff, 2026-05-19; Source C scope sourcing); (2) PAUSE M.1 (methodology PR kickoff, 2026-05-19; gitignore pattern duplicate).
- **Drift indicator:** Scope-bearing chat-side prompt authoring asserts canonical content (canonical doc scope, gitignore patterns, config values, file structure, commit history) from session memory without pre-flight grep / view of canonical source. Event 1: PAUSE B.1 Source C scope (three-plane separation + per-tenant configurability + LLM-call inventory + plugin surface + OpenMed Pattern 2) derived from chat-side `userMemories` session memory, NOT canonical-grep-verified against the live `PATH_TO_ROBUST.md` v1.2 L60 (which scopes Phase 4 narrowly at ~10h budget). Canonical doc would have surfaced L60 narrow scope as AUTHORITATIVE, forcing the scope-expansion decision to be explicit and dated rather than implicit in the union'd prompt. Event 2: PAUSE M.1 scope item 5 included `/pr-body-*.md` as a new gitignore addition; M.1.6 finding (3) caught the duplicate (already present at `.gitignore` L82 per PR #284).
- **Trigger:** Both events caught at agent-side READ-ONLY pre-flight inventory step (B.1 pre-flight + M.1 pre-flight respectively). Both surfaced operator scope decision: B.1 union-scope vs L60 narrow with v1.2 L60 update deferred to v2.0 PATH_TO_ROBUST authorship; M.1 omit `/pr-body-*.md` from scope (revised to 2 gitignore patterns from 3). The codification of DRIFT-45 within the same work block whose pre-flight inventory caught its own trigger event 2 demonstrates the mechanism update fires consistently across two consecutive work-block kickoffs.
- **Mechanism update:** Sister to DRIFT-38 / DRIFT-40 / DRIFT-43 family (Mechanism 2 indicator "asserting canonical-source content from memory without verification"). DRIFT-45 EXTENDS the indicator surface from commit SHAs / line refs / config values / anchors (DRIFT-38 family) to scope sourcing for work-block kickoff prompts: before authoring a work-block scope, chat-side MUST grep / view canonical doc (`PATH_TO_ROBUST.md` / `PHASE_N_REPORT.md` / `BUILD_STATE.md` / `.gitignore` / etc.) to confirm scope sourcing, not infer from session memory. Sister rule: when an agent surfaces a canonical-source discrepancy at READ-ONLY pre-flight inventory step (chat-side scope claim vs canonical-doc verified content), the canonical-doc-verified content wins and the prompt is updated, not the inverse.
- **Sister-cross-reference:** DRIFT-38 parent (memory-anchor prompt authoring; commit SHA / config value / anchor surface); DRIFT-40 (test-count recurrence); DRIFT-43 (canonical PR-number assertion recurrence); Mechanism 2 indicator family ("verify before declaring"); §17.1 16th entry (gitignore pattern pre-flight verification; sister at gitignore-pattern surface; DRIFT-45 codifies the chat-side analog at scope-sourcing surface); DRIFT-19 (pre-flight inventory referenced-snapshot-vs-current-state; DRIFT-45 is sister at chat-side scope-sourcing layer).

---

## DRIFT-46 - Chat-side prompt pre-state diverged from disk at frontend-wiring-status surface (recurrence of DRIFT-45 at module-wiring-state surface)

- **Date:** 2026-05-31
- **Catalyst PR / surface:** Option 2 clinical-gap-surface verification (non-HF Executive + service-line KPI wiring). Prompt pre-state asserted "5 modules render mock, wire first" (EP / Coronary / Structural / Valvular / Peripheral need per-module wiring before the clinical surface works). PAUSE A canonical-grep + code trace diverged from that pre-state on three counts: (1) the clinical-gap surface is already wired + code-identical across all 6 modules (no per-module wiring prerequisite on that surface); (2) the non-HF Executive + service-line KPI wiring is not "unwired" but DEAD on an `apiFetch` double-unwrap (`dashboard?.data?.summary` against an already-`.data`-unwrapped envelope, `src/services/api.ts:254`), a consumer-side correctness defect not a missing-wire gap; (3) the bug footprint is 6 files (5 non-HF Executive views + the shared `ServiceLineKPIBanner`), not the assumed 5 modules.
- **Drift indicator:** Chat-side prompt pre-state asserts module-wiring state ("N modules render mock, wire first") from session / narrative memory without pre-flight canonical-grep of the live consumer code. The assumed state ("unwired, needs per-module wiring") and the disk state ("wired + code-identical; one uniform consumer-side unwrap defect") differ in both kind (wiring-gap vs correctness-defect) and footprint (5 modules vs 6 files). Misreading the kind would have mis-routed the fix to per-module rewiring (PATH 3) instead of a uniform 6-file collapse.
- **Trigger:** Self-caught at agent-side READ-ONLY PAUSE A canonical-grep (`grep dashboard?.data?.summary src/` returned exactly 6 files; HF `ExecutiveView.tsx` single-unwrap; `apiFetch` unwrap at `api.ts:254`). Canonical-grep-first surfaced the divergence; the chat pre-state was the assumed state the DRIFT-45 discipline checks against canonical source. Filed as AUDIT-098 (HIGH P1) register entry; this DRIFT pairs the dated catch with the DRIFT-45 mechanism as recurrence evidence.
- **Mechanism update:** Sister to DRIFT-45 (chat-side canonical-doc grep pre-flight at scope-bearing prompt authoring surface). DRIFT-46 EXTENDS the indicator surface from canonical-doc scope sourcing (DRIFT-45) to module / feature WIRING state: before authoring a work-block prompt that asserts "module X is wired / unwired / renders mock," chat-side MUST canonical-grep the live consumer code (the API-call site + the unwrap pattern + the render branch), not infer wiring state from session memory or CLAUDE.md section 10 narrative. Sister rule (per DRIFT-45): when agent-side READ-ONLY pre-flight surfaces a wiring-state divergence (chat claim vs canonical-grep), the canonical-grep-verified state wins and the prompt / fix-routing is updated, not the inverse.
- **Sister-cross-reference:** DRIFT-45 parent (chat-side canonical-doc grep pre-flight; scope-sourcing surface; DRIFT-46 is sister at module-wiring-state surface); DRIFT-38 / DRIFT-40 / DRIFT-43 family (Mechanism 2 indicator "asserting canonical-source content from memory without verification"); section 19.5 canonical-grep-first discipline (PAUSE A inventory grep is the catch surface); AUDIT-098 (catalyst register entry; the silent-mock-when-live defect this catch surfaced).

---

## DRIFT-47 - Next-step ordering drift elevating a presentation-layer P1 (AUDIT-099) over a clinical-detection P1 (AUDIT-101)

- **Date:** 2026-06-03
- **Catalyst PR / surface:** 2026-06-03 security-verification block; next-step framing during the register-reconciliation work. AUDIT-099 (non-HF Executive fabricated-KPI presentation defect) and AUDIT-101 (gap-cad-statin dose-blind FALSE-NEGATIVE / missed-gap) are both OPEN HIGH (P1). Next-step framing elevated AUDIT-099 (UI / presentation) ahead of AUDIT-101 (clinical-detection) without a severity-class basis.
- **Drift indicator:** Ordering drift at next-step / top-3 prioritization. Two equal-severity (HIGH P1) OPEN findings were ranked by presentation-surface salience rather than clinical-harm class: a UI silent-mock defect (AUDIT-099) was framed as the next step ahead of a missed guideline-directed-therapy gap (AUDIT-101). A missed-gap clinical-detection defect is patient-safety-adjacent and outranks a presentation-layer fabricated-KPI defect at equal register-literal severity.
- **Trigger:** Operator correction ("is it really the next step"). Surfaced that AUDIT-101 (clinical-detection false-negative) should rank ahead of AUDIT-099 (presentation-layer) within the same HIGH P1 tier.
- **Mechanism update:** The standing top-3 is re-ranked with AUDIT-101 at the patient-safety rank. Tie-break rule WITHIN a severity tier: clinical-detection defects (missed-gap / wrong-drug / dose-blind on the gap-engine correctness surface) OUTRANK presentation-layer P1s (silent-mock / fabricated-KPI / UI) when both carry equal register-literal severity. Next-step / top-3 framing must apply this clinical-harm-class tie-break, not presentation-surface salience or recency. This is a within-tier ORDERING rule only; it never re-classifies register-literal severity (per §18).
- **Sister-cross-reference:** AUDIT-101 (clinical-detection false-negative; patient-safety-class HIGH P1); AUDIT-099 (presentation-layer fabricated-KPI HIGH P1); CLAUDE.md §8 (clinical accuracy non-negotiable); DRIFT-33 (priority-check drift via path-of-least-resistance rationalization; sister at prioritization surface); §18 register-literal severity discipline (the tie-break operates within a tier, never re-classifies severity).

---

## DRIFT-48 - --delete-branch on the base of an open stacked PR auto-closed the dependent

- **Date:** 2026-06-03
- **Catalyst PR / surface:** AUDIT-108 work-block merge sequencing. The operator authorized merging the docs-PR stack #338 / #339 / #340, where #340 was stacked (base = #339 head branch `feat/register-reconciliation-june03`). Merging #339 with `gh pr merge 339 --squash --delete-branch` deleted #339 head branch, which was #340 BASE - GitHub auto-CLOSED #340 (state CLOSED, CONFLICTING) rather than retargeting it, so #340 content (AUDIT-108/109 + AUDIT-107 update) did not land on the first attempt.
- **Drift indicator:** Merging a stacked PR set base-first with `--delete-branch` on the base. Deleting the base branch of an OPEN dependent PR closes the dependent. The dependency direction (leaf depends on base) was not consulted before choosing the merge order + the branch-delete flag.
- **Trigger:** Self-caught immediately post-merge during the verification read (`gh pr view 340` returned state=CLOSED). No data lost - the head branch and its commit survived (only the base branch was deleted).
- **Mechanism update:** When merging a stacked PR set, either (a) merge LEAF-first (dependents before their base), or (b) retarget dependents to the base-of-base BEFORE deleting any base branch (`gh pr edit <dependent> --base main`), or (c) omit `--delete-branch` on any branch that is the base of an open PR. Before any `--delete-branch`, check whether the branch is the base of an open PR (`gh pr list --base <branch>`).
- **Recovery:** cherry-picked the dependent single commit (`6fee852`) onto updated main as a fresh PR #341 (clean - main already equalled the squashed base content), which landed the AUDIT-108/109 content. Logged so the merge-order check becomes standard for future stacked-PR landings.
- **Sister-cross-reference:** DRIFT-12 (multi-step work block surfaced completion without a prior-step verification gate; sister at sequencing-gate surface); section 19.5 canonical-grep-first discipline (the post-merge `gh pr view` read is the catch surface); CLAUDE.md §5 + RULE 7 (PR-based workflow; stacked-PR landing discipline).

---

## DRIFT-49 - Register content asserted in a chat-layer instruction without register-literal verification (DRIFT-47 mis-cited as silent-red-gate class)

- **Date:** 2026-06-04
- **Catalyst PR / surface:** AUDIT-111 filing (PR #352; the staging-undeployable silent-red-gate finding). The chat-layer instruction directed cross-referencing the new finding to "the same silent-red-gate class as AUDIT-107 / DRIFT-47." AUDIT-107 IS silent-red-gate class; DRIFT-47 is next-step-ordering drift (AUDIT-099 vs AUDIT-101 prioritization). The DRIFT-47 attribution appears to have been carried from an adjacent cross-ref (AUDIT-107's status surface name-drops DRIFT-47), not from a register-literal read of the DRIFT-47 entry itself.
- **Drift indicator:** Register content asserted in an instruction without register-literal verification. A classification attached to a named cross-ref inside an operator or chat-layer prompt ("DRIFT-47 = silent-red-gate class") was a claim about a canonical entry that the entry does not bear - the kind of assertion that, if copied through, writes an inaccurate cross-ref into a canonical register.
- **Trigger:** Agent canonical-grep catch-and-hold. Before writing the cross-ref, the agent Read-File'd the DRIFT-47 entry, found it is next-step-ordering drift (not a gate-class drift), and HELD the cross-ref rather than copying it through - surfacing the divergence to the operator per §19.5 V.5-RECOVERY + the always-stop genuine-fork gate. Operator resolved option (c): AUDIT-107 sole anchor, DRIFT-47 dropped, this entry logged.
- **Mechanism update:** Cross-refs (and the classifications attached to them) named in operator or chat-layer prompts are PREDICATES TO VERIFY - canonical-grep + Read-File the cited entry against its register-literal content BEFORE writing the cross-ref into any register - NEVER copied through on the strength of the instruction alone. An instruction-asserted classification is a claim about a canonical entry, not the entry itself; the §18 "register is source of truth" + §19.5 canonical-grep-first disciplines extend from severity (already covered) to cross-ref classification. If the cited entry does not bear the asserted classification, hold and surface as an always-stop fork; do not write the inaccurate cross-ref.
- **Sister-cross-reference:** AUDIT-107 (the correct silent-red-gate class anchor); AUDIT-111 (the finding whose cross-ref triggered this catch); DRIFT-47 (the mis-cited entry; next-step-ordering drift); DRIFT-45 (chat-side canonical-doc grep pre-flight; the true pre-state-verification discipline) + DRIFT-46 (its recurrence) + the DRIFT-38 / DRIFT-40 / DRIFT-43 "verify before declaring" (Mechanism 2) family, of which DRIFT-49 is the cited-cross-ref-classification analog; section 19.5 canonical-grep-first discipline + §17.1 rendered-coherence / canonical-verification surface (Read-File-before-assert); §18 register-literal source-of-truth discipline (extended here from severity to cross-ref classification).
- **Self-applied disambiguation (register-literal verification of this entry's own number, 2026-06-04):** applying this very mechanism to the DRIFT-49 assignment: the number was chosen from a registry-only grep ("highest existing = DRIFT-48"), then re-verified repo-wide before merge - the ONLY `DRIFT-49` occurrences anywhere are this entry and its AUDIT-111 cross-ref (zero on `origin/main`), so the assignment is collision-free. DRIFT-49 covers verification of CITED CROSS-REFS specifically; it is NOT the pre-state-verification / canonical-grep discipline (that is DRIFT-45, recurrence DRIFT-46) and NOT the operator-reserved-merge gate (CLAUDE.md §19.3 always-stop gates / §19.4 footprint-split commit gate). DRIFT-49 did not exist in any doc before the AUDIT-111 branch (2026-06-04); any earlier conversational "DRIFT-49" reference to a pre-state-verification or operator-reserved-merge discipline pointed at a then-nonexistent number whose true home is DRIFT-45 / §19.3-§19.4 - recorded here so the history is honest.

---
