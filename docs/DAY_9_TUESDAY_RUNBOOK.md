# Day 9 - Tuesday execution runbook

**Created:** 2026-04-27
**Operator:** Jonathan Hart
**Companion plan:** `docs/DAY_9_PLAN.md`
**Companion DNS handoff:** `docs/DAY_9_WIX_DNS_HANDOFF.md`
**Companion seed runbook:** `docs/DAY_9_SYNTHEA_SEED_RUNBOOK.md`

---

## Why this doc exists

`docs/DAY_9_PLAN.md` is the strategic plan - decisions, scope, sequencing. This runbook is the executable Tuesday-morning checklist. Every command here is pre-verified against today's actual AWS state (2026-04-27). Copy-paste, run, verify, advance.

**Total estimated runtime:** 60–90 min for stack create + verification + smoke. Synthea seed kicks off in parallel afternoon (separate runbook).

---

## Pre-flight (run Monday night before bed)

| Check | Command | Pass condition |
|---|---|---|
| ACM cert ISSUED | `aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:863518424332:certificate/a13fe1f5-5999-410d-bc08-92d063579e7a --query 'Certificate.Status' --output text` | `ISSUED` ✅ confirmed 2026-04-27 14:36 PDT |
| Wix Record 1 propagated | `nslookup -type=CNAME _5fec0c6f2c1892b9d4f8408f0db70019.staging-api.tailrd-heart.com` | resolves to `_cd1905d4202daf7ae44c53fe56e1116e.jkddzztszm.acm-validations.aws.` ✅ confirmed |
| AWS auth OK | `aws sts get-caller-identity` | returns the tailrd account |
| On correct branch | `git branch --show-current` | `feat/day9-staging-environment` |

If any pre-flight fails: **STOP**. Do not proceed.

---

## Verified parameter values (captured 2026-04-27)

These are the exact values for the `aws cloudformation create-stack` invocation in Task 4. They were sourced from `aws cloudformation describe-stacks --stack-name tailrd-production-vpc` and `aws rds describe-db-clusters --db-cluster-identifier tailrd-production-aurora` on 2026-04-27.

| Parameter | Value | Source |
|---|---|---|
| `VpcId` | `vpc-0fc14ae0c2511b94d` | `tailrd-production-vpc` Output `VpcId` |
| `PrivateSubnetIds` | `subnet-0071588b7174f200a,subnet-0e606d5eea0f4c89b` | `tailrd-production-vpc` Output `PrivateSubnet1Id`, `PrivateSubnet2Id` (AZ-a, AZ-b) |
| `PublicSubnetIds` | `subnet-05005c1062487e51d,subnet-0794c54e42aaa900c` | `tailrd-production-vpc` Output `PublicSubnet1Id`, `PublicSubnet2Id` (AZ-a, AZ-b) |
| `ECRImageUri` | `863518424332.dkr.ecr.us-east-1.amazonaws.com/tailrd-backend:2f7768fe570627875e9d7f7a7ba6ffb9a549c4e3` | Current production SHA (PR #184 merge commit) |
| `CertificateArn` | `arn:aws:acm:us-east-1:863518424332:certificate/a13fe1f5-5999-410d-bc08-92d063579e7a` | ACM cert for `staging-api.tailrd-heart.com`, status `ISSUED` |
| `AuroraEngineVersion` | `15.14` | `tailrd-production-aurora` exact version (parity) |
| `DBMasterUsername` | `tailrd_admin` | Production convention |
| `PhiEncryptionKeyValue` | (operator-supplied 64-char hex) | Generate with `openssl rand -hex 32`. AllowedPattern `^[a-f0-9]{64}$` enforces hex-only at stack-create time. Distinct from production. |

### PhiEncryptionKeyValue note

Earlier versions of this template auto-generated the PHI key via Secrets Manager `GenerateSecretString`. The 2026-04-28 staging seed run revealed that AWS-generated strings included non-hex characters, which broke `Buffer.from(key, 'hex')` in the backend's PHI encryption middleware (AES-256-GCM rejected the under-32-byte key). All 25K Synthea bundles errored.

Fix: the parameter is now operator-supplied. Generate it once before stack create:

```bash
PHI_KEY=$(openssl rand -hex 32)
echo "$PHI_KEY" | grep -E '^[a-f0-9]{64}$' && echo "OK ($(echo -n "$PHI_KEY" | wc -c) chars)"
```

Pass `$PHI_KEY` as the `PhiEncryptionKeyValue` parameter in Task 2.

### Subnet design note

Production Aurora sits in **database subnets** (`subnet-0168950e9541ff9f6`, `subnet-02c70b0a102cf8d3c`), distinct from the **private subnets** above. The CF template uses one parameter (`PrivateSubnetIds`) for both Aurora subnet group and ECS task placement.

For staging Tuesday, **pass private subnets** for both. Aurora staging will end up in a different subnet group than production, but functionally equivalent - both are private subnets with no internet route. ECS tasks need NAT-routed private subnets for ECR pulls; database subnets may not have NAT routes. Subnet-group parity with production is a P3 cleanup, not a blocker.

If the CF deploy errors with NAT-related `ResourceInitializationError` or ECR pull failure, the underlying cause is private subnet routing - surface and decide whether to add NAT routes or move to a different subnet config.

---

## Task 1 - Final pre-flight (5 min)

```bash
# Confirm we're on the right branch
git checkout feat/day9-staging-environment
git pull origin feat/day9-staging-environment

# Validate CF template one more time
aws cloudformation validate-template \
  --template-body file://infrastructure/cloudformation/tailrd-staging.yml
```

Expected: Returns `Description`, `Parameters`, `Capabilities` (CAPABILITY_NAMED_IAM). No errors.

---

## Task 2 - Create staging stack (15–25 min)

```bash
# Pre-step: generate the PHI key (do NOT echo to history)
PHI_KEY=$(openssl rand -hex 32)
echo "$PHI_KEY" | grep -E '^[a-f0-9]{64}$' >/dev/null || { echo "PHI key invalid"; exit 1; }

aws cloudformation create-stack \
  --stack-name tailrd-staging \
  --template-body file://infrastructure/cloudformation/tailrd-staging.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=VpcId,ParameterValue=vpc-0fc14ae0c2511b94d \
    ParameterKey=PrivateSubnetIds,ParameterValue='"subnet-0071588b7174f200a,subnet-0e606d5eea0f4c89b"' \
    ParameterKey=PublicSubnetIds,ParameterValue='"subnet-05005c1062487e51d,subnet-0794c54e42aaa900c"' \
    ParameterKey=ECRImageUri,ParameterValue=863518424332.dkr.ecr.us-east-1.amazonaws.com/tailrd-backend:2f7768fe570627875e9d7f7a7ba6ffb9a549c4e3 \
    ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:863518424332:certificate/a13fe1f5-5999-410d-bc08-92d063579e7a \
    ParameterKey=AuroraEngineVersion,ParameterValue=15.14 \
    ParameterKey=DBMasterUsername,ParameterValue=tailrd_admin \
    ParameterKey=PhiEncryptionKeyValue,ParameterValue="$PHI_KEY" \
  --tags Key=Project,Value=tailrd Key=Environment,Value=staging
```

**Watch the stack roll forward:**

```bash
aws cloudformation describe-stack-events --stack-name tailrd-staging \
  --query 'StackEvents[?ResourceStatus!=`null`].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
  --output table | head -30
```

**Expected progression:**
- `CREATE_IN_PROGRESS` for ~16 resources, ~15-25 min
- Aurora cluster + writer + reader take longest (~10-15 min combined)
- ALB + listeners are last

**Pass gate (Task 2 complete):**
```bash
aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].StackStatus' --output text
```
Returns `CREATE_COMPLETE`. **STOP if `CREATE_FAILED`** - pull the failure event reason and diagnose.

---

## Task 3 - Capture stack outputs (1 min)

```bash
aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs' --output table
```

**Save these for the next steps** (paste into your terminal as env vars):

```bash
export ALB_DNS=$(aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`AlbDnsName`].OutputValue' --output text)
export AURORA_WRITER=$(aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`AuroraWriterEndpoint`].OutputValue' --output text)
export AURORA_SECRET_ARN=$(aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`AuroraSecretArn`].OutputValue' --output text)
export ECS_CLUSTER=$(aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`EcsClusterName`].OutputValue' --output text)
export ECS_SERVICE=$(aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`EcsServiceName`].OutputValue' --output text)

echo "ALB:    $ALB_DNS"
echo "Aurora: $AURORA_WRITER"
echo "Cluster: $ECS_CLUSTER / Service: $ECS_SERVICE"
```

---

## Task 4 - Add Wix Record 2 (manual UI step, 5 min + 5-15 min DNS)

Open Wix DNS UI (per `docs/DAY_9_WIX_DNS_HANDOFF.md` Record 2):

| Field | Value |
|---|---|
| Type | `CNAME` |
| Host name | `staging-api` |
| Points to | `${ALB_DNS}` (paste from Task 3) |
| TTL | 300 |

**Wait for propagation:**

```bash
until nslookup staging-api.tailrd-heart.com 2>/dev/null | grep -q "$ALB_DNS"; do
  echo "$(date) - DNS not propagated yet, retrying in 30s..."
  sleep 30
done
echo "DNS propagated ✓"
```

---

## Task 5 - Finalize DATABASE_URL secret (5 min)

The CF template created `tailrd-staging-aurora/app/database-url` with placeholder values. Replace with the real connection string built from Aurora master password + writer endpoint.

```bash
# Pull the auto-generated master password
AURORA_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "$AURORA_SECRET_ARN" \
  --query 'SecretString' --output text | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")

# Construct the real DATABASE_URL - note: URL-encode the password if it contains special chars
ENCODED_PW=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$AURORA_PASSWORD")

# Update the secret value (overwrites the placeholder)
aws secretsmanager update-secret \
  --secret-id tailrd-staging-aurora/app/database-url \
  --secret-string "postgresql://tailrd_admin:${ENCODED_PW}@${AURORA_WRITER}:5432/tailrd?sslmode=require"

# Verify
aws secretsmanager get-secret-value \
  --secret-id tailrd-staging-aurora/app/database-url \
  --query 'SecretString' --output text | sed 's/:[^:@]*@/:***@/'
# Expected: postgresql://tailrd_admin:***@tailrd-staging-aurora.cluster-XXX.us-east-1.rds.amazonaws.com:5432/tailrd?sslmode=require
```

**SAFETY:** Never echo the real password to logs. The `sed` masks it for the verify step.

---

## Task 6 - Run prisma migrate against staging Aurora (10–15 min via Fargate one-off)

The ECS service is already running but the Aurora database is empty (no schema yet). Run `prisma migrate deploy` as a one-off Fargate task using the same task definition.

```bash
# Get the task def ARN
TASK_DEF_ARN=$(aws cloudformation describe-stacks --stack-name tailrd-staging \
  --query 'Stacks[0].Outputs[?OutputKey==`EcsTaskDefinitionArn`].OutputValue' --output text)

# Get the security group + subnet for ECS (same as service uses)
ECS_SG=$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE" \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' --output text)

# Run prisma migrate deploy as a one-off
TASK_ARN=$(aws ecs run-task \
  --cluster "$ECS_CLUSTER" \
  --task-definition "$TASK_DEF_ARN" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0071588b7174f200a,subnet-0e606d5eea0f4c89b],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "tailrd-backend",
      "command": ["sh", "-c", "cd /app && npx prisma migrate deploy && echo MIGRATION_DONE"]
    }]
  }' \
  --query 'tasks[0].taskArn' --output text)

echo "Migration task: $TASK_ARN"

# Wait for it to finish
aws ecs wait tasks-stopped --cluster "$ECS_CLUSTER" --tasks "$TASK_ARN"

# Pull the logs
TASK_ID=$(echo "$TASK_ARN" | rev | cut -d'/' -f1 | rev)
MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-staging-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" \
  --since 30m
```

**Expected output:** `MIGRATION_DONE` on the last line. All migrations applied (40+ tables created).

**STOP if migration fails** - pull the error from CloudWatch logs and diagnose. Common failures:
- DATABASE_URL malformed (Task 5 escaping issue)
- Aurora SG not allowing port 5432 from ECS SG (CF template bug)
- Missing migrations file (branch state issue)

---

## Task 7 - Force ECS service to restart with finalized DATABASE_URL (3 min)

The ECS service started before DATABASE_URL was finalized. Force a new deployment so tasks pull the now-correct secret value at startup.

```bash
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment

# Wait for steady state
aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE"
```

**Pass gate:** Service `runningCount == desiredCount == 1`. Health check passes (next task).

---

## Task 8 - Smoke test staging (5 min)

```bash
# Direct ALB health check (bypasses DNS - confirms backend is up)
curl -s -k "https://${ALB_DNS}/health" | python3 -m json.tool

# Expected: {"data":{"status":"healthy", ...}, "success": true}

# DNS-routed health check
curl -s "https://staging-api.tailrd-heart.com/health" | python3 -m json.tool

# Auth smoke test (will fail with no users yet - but should return a structured 401, not 500)
curl -s -X POST "https://staging-api.tailrd-heart.com/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoketest@nonexistent.com","password":"wrong"}' | python3 -m json.tool

# Expected: {"success":false,"error":...} 401 (NOT 500)
```

**Pass gate:** Health returns `healthy`, login returns structured 401 error. ECS task running with the right SHA.

---

## Task 9 - Kick off Synthea seed (afternoon, separate runbook)

See `docs/DAY_9_SYNTHEA_SEED_RUNBOOK.md` for the seed pipeline. Tuesday afternoon kickoff, expected ~2-4 hours runtime, verification Wednesday morning.

---

## Acceptance checklist

- [ ] `tailrd-staging` stack `CREATE_COMPLETE`
- [ ] Wix Record 2 (`staging-api → ALB`) propagated
- [ ] DATABASE_URL secret finalized with real Aurora password + writer endpoint
- [ ] `prisma migrate deploy` succeeded (all 40+ tables created)
- [ ] ECS service stable (1 task running on the deployed task def)
- [ ] `https://staging-api.tailrd-heart.com/health` returns `healthy`
- [ ] Login endpoint returns structured 401 (not 500)
- [ ] CloudWatch log group `/ecs/tailrd-staging-backend` receiving logs
- [ ] Synthea seed kicked off (Task 9)

---

## Rollback procedure

If smoke fails or Aurora is misconfigured:

```bash
# Delete the entire staging stack - Aurora has no real data yet, so this is non-destructive
aws cloudformation delete-stack --stack-name tailrd-staging

# Wait
aws cloudformation wait stack-delete-complete --stack-name tailrd-staging

# Remove the lingering secret namespace (CF DeletionPolicy doesn't always clean these)
for s in aurora-db-password database-url jwt-secret phi-encryption-key; do
  aws secretsmanager delete-secret \
    --secret-id "tailrd-staging-aurora/app/$s" \
    --force-delete-without-recovery 2>&1 | tail -1
done
```

After rollback, fix the root cause, recommit to PR #187, redeploy.

---

## SAFETY STOPS

- **Stack rollback during create:** `CREATE_FAILED` event → DO NOT retry blindly. Pull the failure reason. Common: ACM cert region mismatch, subnet route table missing NAT.
- **Migration fails with auth error:** DATABASE_URL secret has wrong password. Re-run Task 5 carefully.
- **Smoke returns 500 (not structured error):** Backend code path errored - pull CloudWatch logs, surface, do not seed Synthea.
- **DNS Record 2 didn't propagate after 30 min:** Wix UI may have rejected the value - re-check format (no trailing dot, raw ALB DNS).
