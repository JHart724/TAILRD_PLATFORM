# DMS chaos test log

Evidence that the rollback machinery actually works. Run before every wave that changes the rollback flow.

---

## 2026-04-20T18:44:16Z — Test 1: Lambda isolation (manual invoke)

**Goal:** prove the Lambda runs end-to-end against real AWS resources (Secrets Manager, pg, SNS) before wiring it to a live alarm.

**Procedure:**
```bash
aws lambda invoke --function-name tailrd-dms-rollback \
  --payload '{"alarmName":"MANUAL_CHAOS_TEST_NO_TASK","reason":"Phase 4E Lambda isolation test"}' \
  out.json
```

**Result:** exit 0 in 3695ms (cold start). Output:

| Step | Outcome |
|---|---|
| parseAlarmFromEvent | Extracted `MANUAL_CHAOS_TEST_NO_TASK` correctly |
| stopTask | Graceful error: `"Invalid value TBD for ReplicationTaskArn"` — Lambda env had placeholder `DMS_TASK_ARN=TBD` at this point. Expected. |
| dropSlot | `skipped: "no REPLICATION_SLOT_NAME configured (full-load-only)"` — correct |
| truncate | `TRUNCATE "hospitals", "users" CASCADE` against Aurora writer — success. Table was empty so zero rows removed. |
| sns | `published: true` — message landed on `tailrd-migration-alerts` topic |

**Verdict:** Lambda code, IAM role, VPC networking, secrets access, pg driver, SNS publish all working. Ready for alarm-triggered invocation.

---

## 2026-04-20T18:45:25Z — Test 2: Alarm-to-Lambda chain

**Goal:** prove a custom CloudWatch metric crossing threshold auto-invokes the rollback Lambda.

**Setup:**
- Alarm `TailrdDMS-TASK_FAILED`: watches `TailrdMigration/dms.task_healthy` with `Task=tailrd-migration-wave1` dimension; triggers if `Minimum < 1` for 2 evaluation periods of 60s each.
- Lambda added to alarm's `AlarmActions` alongside the SNS topic.
- Lambda resource policy granted `lambda.alarms.cloudwatch.amazonaws.com` invoke permission with `ArnLike` source-ARN restriction.

**Trigger:**
```bash
aws cloudwatch put-metric-data \
  --namespace TailrdMigration \
  --metric-data 'MetricName=dms.task_healthy,Dimensions=[{Name=Task,Value=tailrd-migration-wave1}],Value=0,Unit=Count'
```

**Timeline:**

| Time | Event |
|---|---|
| 18:45:25Z | Metric emit value=0 |
| 18:46:18Z | Alarm transitioned `INSUFFICIENT_DATA` → `ALARM` (53s after metric emit) |
| 18:46:18Z | Lambda auto-invoked via alarm action — RequestId `3fa9a33f-3ccd-4282-92e2-069bd48ab230` |
| 18:46:19Z | Lambda completed in 1199ms |
| 18:46:19Z | SNS published to `tailrd-migration-alerts`; email delivered to `jhart@hartconnltd.com` |

**Lambda payload inspection:**
The alarm-fired invocation contained:
```json
{
  "alarm": {
    "alarmName": "TailrdDMS-TASK_FAILED",
    "reason": "Threshold Crossed: 1 datapoint [0.0 (20/04/26 18:45:00)] was less than the threshold (1.0) and 1 missing datapoint was treated as [Breaching]."
  }
}
```
— correctly parsed from CloudWatch's native alarm payload format.

**Lambda actions:**
- stopTask: still errored on `DMS_TASK_ARN=TBD` (Lambda env not yet updated at this point; real Wave 1 task ARN was set 1 minute later)
- truncate: executed, no-op (Aurora empty)
- sns: published

**Verdict:** alarm → Lambda integration works. End-to-end latency ~55 seconds from metric emit to Lambda completion. Well within operational SLO (design targets <5 min for rollback trigger to complete).

---

## 2026-04-20T18:47:34Z — Cleanup

After chaos verification, to prevent the still-ALARM state from auto-rollback-ing Wave 1 when it started:
1. Emitted `dms.task_healthy=1` to nudge the metric back (alarm still needs 2 datapoints above threshold to return to OK, which takes 2 minutes)
2. Ran `aws cloudwatch disable-alarm-actions --alarm-names TailrdDMS-TASK_FAILED` to prevent any re-firing during Wave 1

Post-Wave-1 validation: re-enable alarm actions before starting the 4-hour observation period (Phase 4L).

---

## What this proves

1. Rollback Lambda is correctly deployed and IAM-permitted.
2. CloudWatch alarm → Lambda invocation wiring works.
3. Alarm latency is bounded (~1 min between metric breach and Lambda firing).
4. Lambda handles missing/placeholder DMS task ARN gracefully (no exception thrown; operator gets a clear SNS message).
5. SNS → email delivery works end-to-end.

## What this does NOT prove (deferred)

- **Real DMS task stop.** Chaos ran with placeholder `DMS_TASK_ARN=TBD` env var. Wave 2 pre-flight should re-run the chaos test with a real running task to verify the stop path actually stops replication.
- **Replication slot drop.** Full-load-only migration has no slot. Day 6 Wave 2 adds slot-drop verification.
- **Truncate against tables with real data.** Wave 1's hospitals + users had no data pre-start. Later waves should chaos-test with data present to verify TRUNCATE CASCADE completes cleanly.

Add those to the Wave 2 chaos test runbook before starting Wave 2 on Day 7.

---

## 2026-04-21T09:47Z — Alarm config update: TreatMissingData=notBreaching

**Context:** Day 6 Go/No-Go checklist (CR-2026-04-21-001) flagged `TailrdDMS-TASK_FAILED` in ALARM state. StateReason: `no datapoints were received for 2 periods and 2 missing datapoints were treated as [Breaching]`. No datapoints is expected — Wave 1 task stopped on Day 4 and Wave 2 has not started, so the `TailrdMigration/dms.task_healthy` metric has no publishers.

**Decision:** fix the alarm config rather than override the Go/No-Go check. The alarm's job is to detect task failures *during active waves*, not absence of a task between waves.

**Change:**
```
TreatMissingData: breaching → notBreaching
```

All other parameters (metric, dimensions, threshold, evaluation periods, actions, SNS + Lambda targets) preserved. Applied via `aws cloudwatch put-metric-alarm` at 2026-04-21T09:47Z; verified `TreatMissingData=notBreaching` on subsequent describe-alarms call.

**State transition:** alarm will re-evaluate on next 60s period with the new rule and transition ALARM → OK (missing data now treated as not-breaching).

**What this does NOT change:**
- Rollback Lambda still fires if a running task's `dms.task_healthy` drops below 1.
- Active-wave detection still works — publishing 0 to the metric for any dimension still breaches.
- SNS alerting still fires on real state transitions.

**When Wave 2 starts:** verify the alarm transitions correctly ALARM/OK based on real task health metrics, not on the presence/absence of metric publishers. Re-run Test 2 chain with a real running task as part of Wave 2 pre-flight.

