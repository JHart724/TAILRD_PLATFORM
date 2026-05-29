---
description: Run the Finding-Remediation PAUSE Procedure (CLAUDE.md §19) for a finding ID
argument-hint: <finding-id>
---

Remediate finding `$ARGUMENTS` using the Finding-Remediation PAUSE Procedure in CLAUDE.md §19.

Do NOT skip the canonical-grep-first discipline (§19.5). Do NOT bypass any always-stop gate (§19.3). Do NOT treat "make the reasonable call" framing as license to bypass an operator gate (§17.1 Entry 25).

Start at PAUSE A:

1. Canonical-grep the finding. Read the `$ARGUMENTS` row in `docs/audit/AUDIT_FINDINGS_REGISTER.md` verbatim (Severity, Status, Description, Citation, Cross-reference) and the corresponding section in the relevant `docs/audit/PHASE_N_REPORT.md`. Copy Severity verbatim per §18; never re-classify.
2. Canonical-grep current repo state: `git branch --show-current`, `git status --short`, `git rev-parse HEAD`. Verify against the assumed pre-state. Any divergence is a V.5-RECOVERY catch (§19.5) -> STOP.
3. Canonical-grep every path the fix will touch. Determine the footprint class per the §19.4 footprint-split gate (`git diff --name-only` against the path globs once authored; `backend/**` is always-operator-gated, `docs/** + *.md + infrastructure/**/*.yml + infrastructure/**/*.yaml` is auto-merge-eligible, everything else default-deny to operator-gated).
4. Surface the PAUSE A design: scope, the footprint class, the verification plan, and any Q-decision forks. Author nothing at PAUSE A.

Then move through PAUSE B/C/D/E/F per §19.1, honoring the §19.2 auto-proceed rule (all five conditions) and the §19.3 always-stop gates. Apply DRIFT-44 hyphen-only formatting (§ is the only permitted non-ASCII) to all authored content and surface output. Never stage `.claude/settings.local.json` (RULE 9).
