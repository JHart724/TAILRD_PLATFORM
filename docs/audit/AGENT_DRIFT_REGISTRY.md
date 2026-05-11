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
