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
# Windows / git-bash quirk: AWS CLI on Windows is the Windows aws.exe (not an
# MSYS-built CLI). It can NOT open Unix-style /tmp/... paths from --overrides
# or --policy-document arguments — it interprets the path literally as
# Windows, fails to find /tmp/tmp.xxxxx, and run-task returns empty silently.
# Fix: convert each tempfile path with cygpath -w before building the file://
# URI. The wrapper toNativePath() below handles this and falls back to the
# literal path on non-Windows hosts.
# Reference: this bug ate the original soak-monitor launch on 2026-04-29 —
# 11 silent run-task failures over 30 min before the missing fix was caught.
#
# Bash trap quirk: trap handlers fire BETWEEN commands, not during builtins.
# A SIGTERM delivered while the script is in `sleep 300` will queue but the
# trap doesn't run until sleep returns. To stop early reliably, send SIGTERM
# and wait up to ~5 min for the trap to fire (cleanup_iam logs to stderr when
# it does). If you need an immediate kill, use SIGKILL and then manually
# detach the IAM policy: aws iam delete-role-policy --role-name
# tailrd-production-ecs-task --policy-name Phase2D-PostCutoverValidation.
#
# IAM lifecycle: this script attaches Phase2D-PostCutoverValidation once at
# start (the production task role needs it for each Fargate validation task to
# read DMS / RDS / CloudWatch / Secrets metrics) and ALWAYS detaches on exit
# via a trap, even on crash, kill, or interrupt. Non-negotiable detach
# discipline preserved across the 24h window.

set -uo pipefail

# toNativePath: on git-bash for Windows, convert /tmp/... or /c/Users/...
# paths to native C:/Users/... form so the Windows aws.exe can open them.
# Falls back to literal path if cygpath isn't on PATH (Linux / macOS).
toNativePath() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1" 2>/dev/null | tr '\\' '/'
  else
    echo "$1"
  fi
}

ROLE_NAME="tailrd-production-ecs-task"
POLICY_NAME="Phase2D-PostCutoverValidation"
POLICY_FILE="$(dirname "$0")/phase2d-post-cutover-validation-policy.json"
POLICY_FILE_NATIVE="$(toNativePath "$POLICY_FILE")"

cleanup_iam() {
  echo "[$(date -u +%H:%M:%SZ)] cleanup_iam: detaching $POLICY_NAME from $ROLE_NAME" >&2
  aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" 2>&1 || true
  aws iam list-role-policies --role-name "$ROLE_NAME" --query 'PolicyNames' --output json >&2 || true
}
trap cleanup_iam EXIT INT TERM HUP

echo "[$(date -u +%H:%M:%SZ)] attaching $POLICY_NAME to $ROLE_NAME" >&2
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_FILE_NATIVE" || {
  echo "FATAL: could not attach IAM policy" >&2
  exit 3
}

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
OVERRIDES_FILE_NATIVE="$(toNativePath "$OVERRIDES_FILE")"

run_validation() {
  local task_arn task_id verdict_status
  # Use the native (Windows-converted) overrides path. On git-bash, mktemp
  # returns /tmp/tmp.xxxxx which the Windows aws.exe can't open; cygpath -w
  # translation in toNativePath() resolves to C:/Users/.../Temp/tmp.xxxxx.
  # Stderr is intentionally NOT swallowed so future failures surface visibly.
  task_arn=$(aws ecs run-task \
    --cluster "$CLUSTER" \
    --task-definition "$TASK_DEF" \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=DISABLED}" \
    --overrides "file://$OVERRIDES_FILE_NATIVE" \
    --query 'tasks[0].taskArn' --output text)

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
