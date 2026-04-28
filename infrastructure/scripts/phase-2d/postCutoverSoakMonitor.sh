#!/usr/bin/env bash
# Day 10 post-cutover 24-hour soak monitor.
#
# Wraps postCutoverValidation.js in a Fargate one-off and runs it on a backoff
# schedule across 24 hours after cutover. Each invocation captures the JSON
# verdict + timestamp into the log file. First failure triggers a stderr alert
# (operator should tail the log; can wire SES / Slack later).
#
# Backoff schedule (76 invocations total):
#   Hours 0-2:    every  5 min  -> 24 invocations  (densest signal, when issues most likely)
#   Hours 2-6:    every 15 min  -> 16 invocations
#   Hours 6-24:   every 30 min  -> 36 invocations
#
# Required env vars (export before running, or pass at invocation):
#   BASELINE_P95_MS         pre-cutover p95 latency in ms (from runbook)
#   BASELINE_ERROR_RATE     pre-cutover ERROR count over 30 min (from runbook)
#   SMOKE_TEST_EMAIL        smoke test account email
#   SMOKE_TEST_PASSWORD     smoke test account password
#   ECS_TASK_DEF            production task definition name (e.g. tailrd-backend:117)
#   ECS_SUBNETS             comma-sep subnets for Fargate task (e.g. subnet-a,subnet-b)
#   ECS_SG                  task security group (e.g. sg-xxx)
#
# Log location: /tmp/soak-monitor-$(date +%Y%m%d-%H%M%S).log
#
# Run via:
#   nohup bash postCutoverSoakMonitor.sh > /tmp/soak-monitor-launcher.log 2>&1 &
# or in a tmux/screen session.
#
# To stop early: kill the bash PID. The currently-running Fargate task
# completes on its own.
#
# This script does NOT manage the Phase2D-PostCutoverValidation IAM policy.
# Operator attaches before launching this script and detaches after the 24h
# window closes. The script itself only invokes ecs:RunTask via the
# operator's CLI credentials, not the production task role.

set -uo pipefail

CLUSTER="${ECS_CLUSTER:-tailrd-production-cluster}"
TASK_DEF="${ECS_TASK_DEF:-tailrd-backend:117}"
SUBNETS="${ECS_SUBNETS:-subnet-0e606d5eea0f4c89b,subnet-0071588b7174f200a}"
SG="${ECS_SG:-sg-07cf4b72927f9038f}"
S3_SCRIPT="s3://tailrd-cardiovascular-datasets-863518424332/migration-artifacts/phase-2d/postCutoverValidation.js"
LOG_GROUP="/ecs/tailrd-production-backend"

LOG_FILE="/tmp/soak-monitor-$(date +%Y%m%d-%H%M%S).log"
echo "Soak monitor starting. Log: $LOG_FILE"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$LOG_FILE"

START=$(date +%s)
ITERATION=0
FAILURES=0
LAST_VERDICT=""

# Build the Fargate task overrides JSON once. Env vars get baked in.
OVERRIDES=$(python -c "
import json, os
script = '''cd /app && npm install --no-save --silent pg @aws-sdk/client-database-migration-service @aws-sdk/client-rds @aws-sdk/client-ecs @aws-sdk/client-cloudwatch @aws-sdk/client-cloudwatch-logs @aws-sdk/client-secrets-manager >/tmp/npm.log 2>&1 && node -e \"const{S3Client,GetObjectCommand}=require('@aws-sdk/client-s3');const fs=require('fs');(async()=>{const c=new S3Client({region:'us-east-1'});const r=await c.send(new GetObjectCommand({Bucket:'tailrd-cardiovascular-datasets-863518424332',Key:'migration-artifacts/phase-2d/postCutoverValidation.js'}));fs.writeFileSync('/tmp/v.js',await r.Body.transformToString())})().catch(e=>{console.error(e.message);process.exit(1)})\" && NODE_PATH=/app/node_modules node /tmp/v.js'''
o = {
  'containerOverrides': [{
    'name': 'tailrd-backend',
    'environment': [
      {'name': 'BASELINE_P95_MS', 'value': os.environ.get('BASELINE_P95_MS', '0')},
      {'name': 'BASELINE_ERROR_RATE', 'value': os.environ.get('BASELINE_ERROR_RATE', '0')},
      {'name': 'SMOKE_TEST_EMAIL', 'value': os.environ.get('SMOKE_TEST_EMAIL', '')},
      {'name': 'SMOKE_TEST_PASSWORD', 'value': os.environ.get('SMOKE_TEST_PASSWORD', '')},
    ],
    'command': ['sh', '-c', script]
  }]
}
print(json.dumps(o))
")
OVERRIDES_FILE=$(mktemp)
echo "$OVERRIDES" > "$OVERRIDES_FILE"

run_validation() {
  local task_arn task_id verdict_status
  task_arn=$(aws ecs run-task \
    --cluster "$CLUSTER" \
    --task-definition "$TASK_DEF" \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=DISABLED}" \
    --overrides "file://$OVERRIDES_FILE" \
    --query 'tasks[0].taskArn' --output text 2>/dev/null)

  if [ -z "$task_arn" ] || [ "$task_arn" = "None" ]; then
    echo "[$(date -u +%H:%M:%SZ)] iter=$ITERATION run-task FAILED to launch" | tee -a "$LOG_FILE" >&2
    return 2
  fi

  task_id="${task_arn##*/}"
  aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$task_id" 2>/dev/null
  local exit_code
  exit_code=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$task_id" --query 'tasks[0].containers[0].exitCode' --output text 2>/dev/null)

  # Pull verdict JSON from CloudWatch logs
  MSYS_NO_PATHCONV=1 aws logs tail "$LOG_GROUP" \
    --log-stream-names "tailrd-backend/tailrd-backend/$task_id" \
    --since 10m 2>/dev/null \
    | sed -n '/---POST_CUTOVER_VALIDATION---/,/---END---/p' \
    >> "$LOG_FILE"

  echo "[$(date -u +%H:%M:%SZ)] iter=$ITERATION task=$task_id exit=$exit_code" | tee -a "$LOG_FILE"
  return "$exit_code"
}

# Phase 1: hours 0-2, every 5 min (24 iterations)
for i in $(seq 1 24); do
  ITERATION=$((ITERATION + 1))
  run_validation
  rc=$?
  if [ "$rc" -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
    echo "[$(date -u +%H:%M:%SZ)] iter=$ITERATION ALERT: validation exit=$rc (failures=$FAILURES)" | tee -a "$LOG_FILE" >&2
  fi
  sleep 300  # 5 min
done

# Phase 2: hours 2-6, every 15 min (16 iterations)
for i in $(seq 1 16); do
  ITERATION=$((ITERATION + 1))
  run_validation
  rc=$?
  if [ "$rc" -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
    echo "[$(date -u +%H:%M:%SZ)] iter=$ITERATION ALERT: validation exit=$rc (failures=$FAILURES)" | tee -a "$LOG_FILE" >&2
  fi
  sleep 900  # 15 min
done

# Phase 3: hours 6-24, every 30 min (36 iterations)
for i in $(seq 1 36); do
  ITERATION=$((ITERATION + 1))
  run_validation
  rc=$?
  if [ "$rc" -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
    echo "[$(date -u +%H:%M:%SZ)] iter=$ITERATION ALERT: validation exit=$rc (failures=$FAILURES)" | tee -a "$LOG_FILE" >&2
  fi
  sleep 1800  # 30 min
done

ELAPSED=$(( $(date +%s) - START ))
echo "Soak monitor complete after ${ELAPSED}s. Iterations=$ITERATION Failures=$FAILURES" | tee -a "$LOG_FILE"

if [ "$FAILURES" -eq 0 ]; then
  echo "SOAK_OK: 0 failures across $ITERATION invocations - cutover declared successful" | tee -a "$LOG_FILE"
  exit 0
elif [ "$FAILURES" -le 2 ]; then
  echo "SOAK_DEGRADED: $FAILURES transient failure(s) - operator review before declaring success" | tee -a "$LOG_FILE"
  exit 1
else
  echo "SOAK_FAILED: $FAILURES failures - rollback recommended" | tee -a "$LOG_FILE" >&2
  exit 2
fi
