# EP Clinical Gap Audit - Wall-Clock Log (AUDIT-028)

**SUPERSEDED 2026-06-08:** the canonical, CI-parsable wall-clock data now lives in the
append-only `docs/audit/canonical/audit_runs.jsonl` (one JSON record per audit run/phase),
per PATH_TO_ROBUST §90 + AUDIT_METHODOLOGY.md §7.4. This markdown is retained only as a
pointer. Each EP audit session appends a structured line to the JSONL (operator-conversation-
timeline ground-truth start/stop + work-mix per §7.1), NOT to this file.
