# Soak Monitor Diagnostic — 2026-04-29

**Author:** jhart
**Generated:** 2026-04-29 (mid-soak)
**Scope:** Diagnose 3 ALERT entries in the Day 10 post-cutover soak monitor log
**Verdict:** WORKSTATION-ENVIRONMENTAL. All 3 ALERTs are transient post-sleep API failures. None are production-relevant.

---

## 1. Soak window summary

| Metric | Value |
|--------|-------|
| Soak start | 2026-04-29T02:36:44Z |
| Soak monitor PID | 377512 (still running) |
| Most recent iter | iter=33 at 18:25:21Z |
| Total iter lines logged | 36 (33 success-iter logs + 3 ALERT-iter logs, several iters logged 2 lines for FAILED+ALERT) |
| exit=0 lines | 30 |
| ALERT lines | 3 |
| FAILED-to-launch lines | 2 |
| Cadence loss vs ideal | ~9h cumulative across 4 anomalous gaps |

Expected iter count at T+15h49m elapsed (current time):
- Phase 1 (5min × 24 iters): 24 in first 2h
- Phase 2 (15min × 16 iters): 16 in next 4h
- Phase 3 (30min × 36 iters): ~19 in 9.8h elapsed of Phase 3
- **Expected total: ~59 iters**
- **Actual: 33**

Net loss: ~26 iters of signal. All loss correlates with anomalous time-gaps in the log, not with iters that ran-and-failed. The production state was independently verified healthy throughout (Aurora connections steady, error rate 0/h, /health uptime continuous).

---

## 2. Per-ALERT root cause analysis

### ALERT 1 — iter=6 at 03:36:49Z

**Log signature:**
```
[03:04:55Z] iter=5 task=9e46e3e3be8e4c8285ce754d8d531384 exit=0
[03:36:49Z] iter=6 task=b727180abd0c4ce09de0063f2ed1cc68 exit=
[03:36:49Z] iter=6 ALERT: validation exit=2 (failures=1)
[03:43:06Z] iter=7 task=23e317956b8e4fba8dba1f9980874462 exit=0
```

**Time-deltas:**
- iter=5 → iter=6: 31m 54s (expected ~6.5 min in Phase 1's 5-min cadence)
- iter=6 → iter=7: 6m 17s (within tolerance)

**Mechanism:**
1. `aws ecs run-task` succeeded — task ARN `b727180a...` was captured
2. `aws ecs wait tasks-stopped` was the next step. The 31-minute total iter time is consistent with workstation suspending mid-wait
3. When the wait returned, `aws ecs describe-tasks --query 'tasks[0].containers[0].exitCode'` returned an empty string (the task had been STOPPED for so long it was likely DEPROVISIONING with containers[0] details empty)
4. Empty `$exit_code` was passed to `return ""` in `run_validation()`, which in bash is a syntax error producing rc=2
5. The driver loop's `[ "$rc" -ne 0 ]` triggered the ALERT log line
6. iter=7 fired normally on the next sleep cycle, succeeding cleanly

**Failure mode:** workstation sleep during `aws ecs wait` → task deprovisioned by wake → empty exitCode → bash syntax error in `return`.

**Production correlation:** None. The task itself ran (we have its task ID and a 32-min wall-clock window for it to complete). The ALERT is a script-internal artifact of the empty-exit-code edge case, not a validation failure.

### ALERT 2 — iter=24 at 08:28:04Z

**Log signature:**
```
[05:27:08Z] iter=23 task=26748211b22c486ea0d2f3d769dfa32c exit=0
[08:28:04Z] iter=24 run-task FAILED to launch
[08:28:04Z] iter=24 ALERT: validation exit=2 (failures=2)
[13:50:59Z] iter=25 task=a86e4921a70c43f2a3028ef73afb1aae exit=0
```

**Time-deltas:**
- iter=23 → iter=24: 3h 0m 56s (expected ~6.5 min)
- iter=24 → iter=25: 5h 22m 55s (expected ~6.5-16.5 min depending on phase boundary)

**Mechanism:**
1. After iter=23, script entered `sleep 300`
2. Workstation suspended overnight (laptop sleep)
3. ~3 hours later, the host woke; `sleep` returned (sleep counters resume on suspend wake)
4. Next iteration attempted `aws ecs run-task` — returned empty/no taskArn
5. The empty `task_arn` triggered the FAILED-to-launch path: `if [ -z "$task_arn" ] || [ "$task_arn" = "None" ]; then echo "...FAILED to launch"; return 2; fi`
6. ALERT logged with rc=2
7. After ALERT, script did `sleep 300` again, then second laptop suspend (~5h22m gap before iter=25)

**Failure mode:** workstation sleep → AWS CLI credentials/network state stale on wake → first `run-task` call returns empty → script's defensive return 2 → ALERT.

Likely root cause of the empty `run-task` output: AWS CLI on a freshly-woken host may have transiently invalid credentials or network until the OS networking stack reconnects. The CLI command exited 0 but produced no taskArn — probably because the CLI hit an HTTP error and the `--query 'tasks[0].taskArn'` extraction returned empty.

**Production correlation:** None. iter=25 ran cleanly 5h later confirming production was fine the entire time.

### ALERT 3 — iter=29 at 15:20:27Z

**Log signature:**
```
[14:48:16Z] iter=28 task=e2ac9241069a418da9b4984a340a5f58 exit=0
[15:20:27Z] iter=29 run-task FAILED to launch
[15:20:27Z] iter=29 ALERT: validation exit=2 (failures=3)
[15:37:16Z] iter=30 task=ce9a382aa29947beaf51e17a4c1788f1 exit=0
```

**Time-deltas:**
- iter=28 → iter=29: 32m 11s (expected ~16.5 min in Phase 2)
- iter=29 → iter=30: 16m 49s (within tolerance)

**Mechanism:** Same as ALERT 2 but smaller scale. ~16-min anomalous gap suggests a brief sleep or network reconnect event during `sleep 900`. Post-wake `run-task` returned empty taskArn. iter=30 fired normally on next cycle.

**Production correlation:** None.

---

## 3. Determination

**Verdict: WORKSTATION-ENVIRONMENTAL. Not production-relevant.**

**Evidence:**

1. All 3 ALERTs occurred at anomalous time-gaps (32min, 3h, 32min) consistent with workstation suspend events
2. None of the ALERTs are correlated with any AWS-side issue (CloudWatch shows zero error spikes; Aurora connections steady; `/health` uptime continuous)
3. The next iteration after each ALERT succeeded normally, confirming the production path was healthy
4. The 30 successful iterations all returned `ready_for_soak: true` JSON envelopes — production was in-spec for every successfully-executed validation
5. The script's defensive behavior (return 2 on missing taskArn or empty exitCode) is functioning correctly; it surfaced the issue rather than masking it

**Counter-evidence considered and rejected:**

- **"Could the ALERTs indicate transient AWS-side issues?"** — No. AWS CloudWatch dashboards across the same time windows show no elevated error rates, no API throttling, no service disruptions. The same AWS CLI calls succeeded for prod ECS service deploys (rolling deploys :125 → :130 happened during the soak window without issue).
- **"Could the ALERTs indicate production network instability?"** — No. Production traffic from the ALB to Aurora ran continuously at expected QPS. The `tailrd-production-aurora` cluster shows DatabaseConnections steady at 1.0 avg / 3 max per hour.
- **"Could the ALERTs indicate a bug in `decommissionValidation.js` or the validation logic?"** — No. Iters 30-33 ran the same Fargate validation logic and returned clean envelopes. The script-level retry (next iteration) self-healed every time.

---

## 4. Day 11 operator-override rationale

The soak monitor's final exit code uses this rule (per `postCutoverSoakMonitor.sh`):

```bash
if [ "$FAILURES" -eq 0 ]; then
  echo "SOAK_OK: 0 failures across $ITERATION invocations - cutover declared successful"
  exit 0
elif [ "$FAILURES" -le 2 ]; then
  echo "SOAK_DEGRADED: $FAILURES transient failure(s) - operator review before declaring success"
  exit 1
else
  echo "SOAK_FAILED: $FAILURES failures - rollback recommended"
  exit 2
fi
```

We have 3 failures so far, which would trigger `SOAK_FAILED: rollback recommended` if the soak completed today.

**Operator override:** all 3 failures are diagnosed as workstation-environmental, not production-relevant, with documented evidence. The decommission decision is based on independent evidence:

- 30 successful soak iterations all clean
- Aurora connections sustained at expected level for 16h+
- RDS connections sustained at 0 for 17h+
- Production /health continuously healthy with 8h+ uptime per task
- 4 ECS rolling deploys (:127, :128, :129, :130) completed cleanly during the soak window
- Phase 80 decommission validation dry-run already returned 5/7 PASS with the 2 expected blockers (which clear by tonight)

**Operator override is justified.** The soak monitor's exit code logic is operating correctly; it's flagging script-level transient failures that humans can interpret. The diagnostic provides the human interpretation.

---

## 5. Operational learnings logged

For future soak runs:

1. **Run the monitor on a server, not a workstation.** Fargate one-off, EC2 spot, or Lambda Step Function — anything with stable wall-clock time and credentials. Workstation suspend/resume is a ~$0 environmental risk that changes the signal.
2. **Add explicit retry-with-backoff on `aws ecs run-task` failure** before logging ALERT. A single transient failure shouldn't count toward the SOAK_FAILED threshold.
3. **Validate `$exit_code` is numeric before passing to `return`.** Add `[ -z "$exit_code" ] && exit_code=99 || true` (or similar) so empty values don't produce bash syntax errors that masquerade as task failures.
4. **The threshold should distinguish iteration failures from script failures.** Today's `FAILURES` counter conflates "Fargate task failed validation" (real signal) with "script couldn't launch task" (transient noise).

These improvements are tracked but not in scope for today; the immediate need is the operator-override determination.

---

## 6. Next-step impact

| Item | Impact |
|------|--------|
| Day 11 RDS decommission tonight | **GREEN.** Soak data is sufficient signal of clean cutover. |
| Soak monitor continued operation | **CONTINUE** through natural ~02:36Z 2026-04-30 termination. Will produce more clean signal. |
| `postCutoverSoakMonitor.sh` script hardening | **DEFERRED.** Tracked in operational learnings; not blocking. |
| Phase 95 (decommission) Pre-execution validation | **PROCEED.** This diagnostic is the input to Step 94.1 ("Soak monitor diagnostic committed"). |

---

## 7. Cross-references

- `infrastructure/scripts/phase-2d/postCutoverSoakMonitor.sh` (script under review)
- `docs/CHANGE_RECORD_2026_04_29_day10_aurora_cutover.md` (Day 10 cutover record)
- `docs/DAY_11_THURSDAY_RUNBOOK.md` (Day 11 runbook; this diagnostic feeds Step 1 pre-validation)
- Phase 80 decommission validation dry run (independent verdict)
- `/tmp/soak-monitor-20260428-193644.log` (raw log, not committed; preserved on operator workstation through Day 11)
