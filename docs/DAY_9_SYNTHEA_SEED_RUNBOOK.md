# Day 9 - Synthea staging seed runbook

**Created:** 2026-04-27
**Operator:** Jonathan Hart
**Companion plan:** `docs/DAY_9_PLAN.md`
**Companion runbook:** `docs/DAY_9_TUESDAY_RUNBOOK.md`

---

## Why this doc exists

After Tuesday's staging stack is up (`tailrd-staging` CF stack `CREATE_COMPLETE` + smoke passing), staging Aurora is empty - schema only, zero patient data. This runbook seeds a clinically realistic ~25K-patient cardiovascular population using the existing Synthea pipeline.

**Key principle: reuse, don't reinvent.** The Synthea generation pipeline already ran in March 2026 and produced FHIR R4 bundles in S3. We don't regenerate; we load existing bundles into staging Aurora.

---

## Pipeline architecture (reference)

| Stage | Tool | Where |
|---|---|---|
| **Generation** (already done) | Synthea CLI with `synthea.properties` | Run on ad-hoc EC2 / local; output written to S3 |
| **Storage** | Per-patient FHIR R4 JSON bundles | `s3://tailrd-cardiovascular-datasets-863518424332/synthea/nyc-population-2026/fhir/` |
| **Metadata** | Run manifest | `s3://tailrd-cardiovascular-datasets-863518424332/synthea/nyc-population-2026/metadata/` |
| **Load (this doc)** | `scripts/processSynthea.ts` (with `--s3` flag) | Run via Fargate one-off against staging Aurora |
| **Cursor** | Resume token for interrupted runs | `s3://...ingest-cursors/${SYNTHEA_HOSPITAL_ID}.txt` |

**Production image layout (verified 2026-04-28 via Fargate inspection):**
- `/app/scripts/` — TypeScript source for ad-hoc scripts (processSynthea.ts, seedFromSynthea.ts, etc.)
- `/app/src/` — TypeScript source for the backend service
- `/app/dist/` — Compiled JS for `src/` (NOT for `scripts/`)
- `/app/prisma/` — Prisma schema + migrations
- **`/app/backend/` does NOT exist.** The repo's `backend/` prefix is stripped during the Docker build's COPY.

This means Fargate one-offs that invoke ad-hoc scripts must use the in-image path `/app/scripts/<file>.ts`, NOT `/app/backend/scripts/<file>.ts`. The script is run via `npx tsx`, which resolves the local repo's relative imports (`../src/services/...`) correctly because `/app/scripts/` and `/app/src/` are siblings.

**Synthea config:** `backend/scripts/synthea/synthea.properties` documents the population shape - NYC demographics, 10K base population, cardiovascular-enriched prevalence (HF 15%, AFib 12%, CAD 18%, AS 4%, etc.).

**Implementation note:** `processSynthea.ts` reads bundles, batches inserts via `processPatientData`, `processObservationsBatch`, `processEncountersBatch`, then `gapDetectionRunner.ts` evaluates 257 gap rules.

---

## Pre-flight (run before kickoff)

| Check | Command | Pass condition |
|---|---|---|
| Tuesday runbook complete | `aws cloudformation describe-stacks --stack-name tailrd-staging --query 'Stacks[0].StackStatus' --output text` | `CREATE_COMPLETE` |
| Health endpoint up | `curl -s https://staging-api.tailrd-heart.com/health` | `"status":"healthy"` |
| Schema applied | Query staging Aurora - see Verification below | `Patient`, `Encounter`, `Observation` tables exist |
| Bundle inventory | `aws s3 ls s3://tailrd-cardiovascular-datasets-863518424332/synthea/nyc-population-2026/fhir/ --summarize --recursive --human-readable | tail -5` | Total objects ≥ ~25K |
| ECS task role can read S3 | Confirmed in `tailrd-staging.yml` (task role grants `secretsmanager` only) - needs S3 add | **MAY NEED PATCH** - see Step 1 |

### Step 1 - Verify (or grant) S3 read permission to staging ECS task role

`tailrd-staging.yml` defines `EcsTaskRole` with policies for Secrets Manager + CloudWatch only. Synthea processor needs to read FHIR bundles from `tailrd-cardiovascular-datasets-863518424332/synthea/*` and write/delete the cursor file at `ingest-cursors/`. Attach a temporary policy.

```bash
# Check current task role policies (initial state should be just StagingTaskPermissions)
aws iam list-role-policies --role-name tailrd-staging-ecs-task

# Attach the temporary policy inline (Windows-safe, no temp file needed):
aws iam put-role-policy \
  --role-name tailrd-staging-ecs-task \
  --policy-name SyntheaSeedS3Read \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:ListBucket","s3:PutObject","s3:DeleteObject"],"Resource":["arn:aws:s3:::tailrd-cardiovascular-datasets-863518424332","arn:aws:s3:::tailrd-cardiovascular-datasets-863518424332/synthea/*","arn:aws:s3:::tailrd-cardiovascular-datasets-863518424332/ingest-cursors/*"]}]}'

# Verify both policies present:
aws iam list-role-policies --role-name tailrd-staging-ecs-task
# Expected: ["StagingTaskPermissions", "SyntheaSeedS3Read"]
```

**Resource notes:**
- The bucket-level ARN allows `s3:ListBucket` (which only checks bucket-level permissions, not per-object).
- `synthea/*` covers all bundle reads.
- `ingest-cursors/*` (top-level prefix in the same bucket, NOT under `synthea/`) covers cursor read/write/delete. The `processSynthea.ts` script writes its cursor at `ingest-cursors/${SYNTHEA_HOSPITAL_ID}.txt`.

**Why PutObject + DeleteObject:** the cursor file is written/deleted in S3 to support resume after interruption.

**Cleanup (Phase 27 acceptance step):** after seed + gap detection complete and verification passes:
```bash
aws iam delete-role-policy --role-name tailrd-staging-ecs-task --policy-name SyntheaSeedS3Read
```

---

## Step 2 - Pre-create the staging hospital tenant

The Synthea processor expects `SYNTHEA_HOSPITAL_ID` to exist in the `Hospital` table. Default value is `synthea-nyc-demo`. We use a staging-specific ID `synthea-nyc-staging`.

**Why not psql from local:** Aurora staging is in private subnets with no public ingress. Local psql cannot reach the writer endpoint. Use a Fargate one-off instead, leveraging the same task definition as the running ECS service (it already has DATABASE_URL injected via Secrets Manager).

**Required fields per `prisma/schema.prisma` Hospital model (verified 2026-04-28 via 3 prisma upsert attempts):**
- `id` (provided), `name`, `patientCount`, `bedCount`, `hospitalType` enum (`ACADEMIC` | `COMMUNITY` | etc.)
- Address: `street`, `city`, `state`, `zipCode` (country defaults to `USA`)
- Subscription: `subscriptionTier` enum (`ENTERPRISE` etc.), `subscriptionStart` DateTime (REQUIRED, not auto-default), `maxUsers`
- **`patientLimit` does NOT exist on the schema**, despite appearing in some legacy seed scripts. Do not include it.

Optional but recommended for gap detection: enable all 6 module booleans so gap rules don't filter out patients.

```bash
# Build the upsert overrides JSON via Python (Windows-safe escaping).
# Replace path /c/Users/.../seed-overrides.json with your local temp path.
python -c "
import json
node_script = '''const{PrismaClient}=require(\"@prisma/client\");const p=new PrismaClient();(async()=>{const h=await p.hospital.upsert({where:{id:\"synthea-nyc-staging\"},create:{id:\"synthea-nyc-staging\",name:\"Staging Synthea NYC\",system:\"TAILRD Staging\",subscriptionTier:\"ENTERPRISE\",subscriptionStart:new Date(),patientCount:25000,bedCount:1500,hospitalType:\"ACADEMIC\",street:\"0 Staging Way\",city:\"New York\",state:\"NY\",zipCode:\"10001\",maxUsers:10,moduleHeartFailure:true,moduleElectrophysiology:true,moduleStructuralHeart:true,moduleCoronaryIntervention:true,modulePeripheralVascular:true,moduleValvularDisease:true},update:{}});console.log(\"HOSPITAL_READY id=\",h.id);await p.\$disconnect()})().catch(e=>{console.error(\"FAIL\",e.message);process.exit(1)})'''
cmd = f'cd /app && node -e \\'{node_script}\\' && echo HOSPITAL_DONE'
overrides = {'containerOverrides':[{'name':'tailrd-backend','environment':[{'name':'SYNTHEA_HOSPITAL_ID','value':'synthea-nyc-staging'}],'command':['sh','-c',cmd]}]}
with open('C:/Users/JHart/AppData/Local/Temp/seed-overrides.json','w',encoding='utf-8',newline='') as f:
    json.dump(overrides, f)
"

# Launch Fargate one-off
TASK=$(aws ecs run-task \
  --cluster tailrd-staging-cluster \
  --task-definition tailrd-staging-backend:1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0071588b7174f200a,subnet-0e606d5eea0f4c89b],securityGroups=[sg-071ad75159eb2ba74],assignPublicIp=DISABLED}" \
  --overrides "file://C:/Users/JHart/AppData/Local/Temp/seed-overrides.json" \
  --query 'tasks[0].taskArn' --output text)
TASK_ID="${TASK##*/}"
echo "TASK_ID=$TASK_ID"

# Wait for completion
aws ecs wait tasks-stopped --cluster tailrd-staging-cluster --tasks "$TASK_ID"
aws ecs describe-tasks --cluster tailrd-staging-cluster --tasks "$TASK_ID" \
  --query 'tasks[0].{exit:containers[0].exitCode,reason:stoppedReason}' --output json
# Pull logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-staging-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" --since 5m | tail -10
```

**Pass gate:** Task exits 0, logs contain `HOSPITAL_READY id= synthea-nyc-staging` followed by `HOSPITAL_DONE`. The upsert is idempotent — re-running is safe and produces the same row.

**Note on staging SG:** `sg-071ad75159eb2ba74` is the staging ECS task SG (CF stack output `EcsTaskSecurityGroup`). Always pull from the live stack output, do not hardcode if the stack is recreated.

---

## Step 3 - Kick off Synthea load via Fargate one-off

```bash
# Reuse vars from Tuesday runbook Task 3
ECS_CLUSTER=tailrd-staging-cluster
ECS_SERVICE=tailrd-staging-backend
TASK_DEF_ARN=$(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE" \
  --query 'services[0].taskDefinition' --output text)
ECS_SG=$(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE" \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' --output text)

# Run processSynthea.ts as a one-off.
# IMPORTANT: path is scripts/processSynthea.ts (NOT backend/scripts/...)
# The production image strips the backend/ prefix during Docker COPY.
TASK_ARN=$(aws ecs run-task \
  --cluster "$ECS_CLUSTER" \
  --task-definition "$TASK_DEF_ARN" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0071588b7174f200a,subnet-0e606d5eea0f4c89b],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "tailrd-backend",
      "environment": [
        {"name": "SYNTHEA_HOSPITAL_ID", "value": "synthea-nyc-staging"},
        {"name": "AWS_REGION", "value": "us-east-1"}
      ],
      "command": ["sh", "-c", "cd /app && npx tsx scripts/processSynthea.ts --s3 --limit 25000 --concurrency 10; echo SYNTHEA_LOAD_DONE_EXIT=$?"]
    }]
  }' \
  --query 'tasks[0].taskArn' --output text)

echo "Synthea load task: $TASK_ARN"

# Get the task ID for log streaming
TASK_ID=$(echo "$TASK_ARN" | rev | cut -d'/' -f1 | rev)
echo "Task ID: $TASK_ID"
```

### Step 4 - Monitor the load

The task runs ~2-4 hours for 25K patients. Stream logs and check progress periodically.

```bash
# Stream logs
MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-staging-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" \
  --follow

# Or non-follow snapshot
MSYS_NO_PATHCONV=1 aws logs tail /ecs/tailrd-staging-backend \
  --log-stream-names "tailrd-backend/tailrd-backend/$TASK_ID" \
  --since 30m | tail -50
```

**Expected log progression:**
- `Listed N S3 objects under prefix synthea/nyc-population-2026/fhir/`
- `Resuming from cursor: <last-processed-key>` (or `Starting fresh - no cursor found`)
- Periodic `Processed M / N bundles, K patients` heartbeats
- Final: `SYNTHEA_LOAD_DONE`

**STOP if:**
- Task exits non-zero before `SYNTHEA_LOAD_DONE` (check CloudWatch for the actual error)
- Memory exhaustion: bump task def to 4096 CPU / 8192 mem and re-run
- DB write errors: surface, do not retry blindly (can produce orphan rows)

**Resume after interruption:** the cursor file in S3 lets the next run pick up where the prior one left off. Re-run the same command - no `--limit` reset needed. The cursor automatically updates after each successful batch.

---

## Step 5 - Run gap detection

Synthea load persists patients/encounters/observations but does NOT run gap detection. Run that as a second Fargate one-off after load completes.

```bash
TASK_ARN=$(aws ecs run-task \
  --cluster "$ECS_CLUSTER" \
  --task-definition "$TASK_DEF_ARN" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0071588b7174f200a,subnet-0e606d5eea0f4c89b],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "tailrd-backend",
      "environment": [{"name": "SYNTHEA_HOSPITAL_ID", "value": "synthea-nyc-staging"}],
      "command": ["sh", "-c", "cd /app && npx tsx -e \"const{runGapDetection}=require(\\\"./src/ingestion/gapDetectionRunner\\\");(async()=>{const r=await runGapDetection({hospitalId:\\\"synthea-nyc-staging\\\"});console.log(JSON.stringify(r,null,2));console.log(\\\"GAP_DETECTION_DONE\\\")})()\""]
    }]
  }' \
  --query 'tasks[0].taskArn' --output text)

echo "Gap detection task: $TASK_ARN"
```

**Expected runtime:** ~30-60 min for 25K patients × 257 gap rules.

**Pass gate:** `GAP_DETECTION_DONE` in logs. Counts of gaps fired per module appear in the JSON output.

---

## Step 6 - Verification queries (Wednesday morning)

Connect to staging Aurora via psql with the writer endpoint + master password:

```bash
PGPASSWORD="$AURORA_PASSWORD" psql \
  -h "$AURORA_WRITER" -U tailrd_admin -d tailrd \
  -c '\timing on'
```

**Patient counts:**

```sql
SELECT
  (SELECT COUNT(*) FROM "Patient" WHERE "hospitalId" = 'synthea-nyc-staging') AS patients,
  (SELECT COUNT(*) FROM "Encounter" e JOIN "Patient" p ON e."patientId" = p.id WHERE p."hospitalId" = 'synthea-nyc-staging') AS encounters,
  (SELECT COUNT(*) FROM "Observation" o JOIN "Patient" p ON o."patientId" = p.id WHERE p."hospitalId" = 'synthea-nyc-staging') AS observations,
  (SELECT COUNT(*) FROM "Condition" c JOIN "Patient" p ON c."patientId" = p.id WHERE p."hospitalId" = 'synthea-nyc-staging') AS conditions,
  (SELECT COUNT(*) FROM "MedicationStatement" m JOIN "Patient" p ON m."patientId" = p.id WHERE p."hospitalId" = 'synthea-nyc-staging') AS medications;
```

**Expected ranges (cardiovascular-enriched 25K population):**

| Table | Expected | Reason |
|---|---|---|
| Patient | 22,000–25,500 | Synthea drops some during generation |
| Encounter | 150,000–200,000 | ~6-8 encounters/patient avg over lifetime |
| Observation | 1.5M–2.5M | Vitals + labs per encounter |
| Condition | 150,000–300,000 | Cardiovascular-enriched, comorbid |
| MedicationStatement | 150,000–300,000 | GDMT + comorbidity meds |

**Module gap distribution:**

```sql
SELECT module, COUNT(*) AS gap_count
FROM "TherapyGap"
WHERE "hospitalId" = 'synthea-nyc-staging' AND status = 'OPEN'
GROUP BY module
ORDER BY gap_count DESC;
```

**Expected:** All 6 modules should have gaps (HF, EP, Coronary, Structural, Valvular, Peripheral). HF should be the largest cluster (15% prevalence), Structural smallest. Zero gaps in any module = bug; surface and investigate before declaring acceptance.

**Sanity check - no PHI leaked into logs:**

```bash
MSYS_NO_PATHCONV=1 aws logs filter-log-events \
  --log-group-name /ecs/tailrd-staging-backend \
  --start-time $(date -u -d '4 hours ago' +%s)000 \
  --filter-pattern '?Aaron ?Smith ?Jones' | grep -i 'message' | head -5
```

**Expected:** zero matches. If any patient names appear in logs, **STOP** - there's a logging bug and PHI is being captured.

---

## Acceptance checklist

- [ ] Step 1: ECS task role has S3 read on `synthea/*` prefix (temporary policy attached)
- [ ] Step 2: `synthea-nyc-staging` Hospital row exists
- [ ] Step 3: `processSynthea.ts --s3` Fargate task started, logging cleanly
- [ ] Step 4: Task completes with `SYNTHEA_LOAD_DONE`
- [ ] Step 5: Gap detection task completes with `GAP_DETECTION_DONE`
- [ ] Step 6 / verification: Patient count in 22K–25.5K range
- [ ] Step 6 / verification: All 6 modules show non-zero gap counts
- [ ] No PHI in logs
- [ ] Cleanup: `SyntheaSeedS3Read` IAM policy removed from `tailrd-staging-ecs-task`

---

## SAFETY STOPS

- **Bundle count in S3 < 25K:** the `--limit 25000` flag will silently load whatever exists. Confirm count before kickoff. If <25K, decide whether to load all available + accept smaller dataset, or regenerate.
- **Task OOMs (exit code 137):** task def is 1024 CPU / 2048 mem. Bump to 4096/8192 and re-run. Cursor file lets resume work.
- **Gap detection produces zero gaps in any module:** rules engine bug or schema mismatch - do NOT proceed to demo readiness; surface to engineering.
- **Patient count > 30K:** the `--limit` flag was ignored; processSynthea may have a bug. Surface, do not let runaway insert continue.
- **Synthetic patient names in logs:** PHI logging bug. STOP, fix the logger, never demo against this Aurora until cleaned (DROP + reseed).

---

## Cleanup (post-acceptance, Wednesday afternoon)

```bash
# Drop the temporary S3 IAM policy
aws iam delete-role-policy --role-name tailrd-staging-ecs-task --policy-name SyntheaSeedS3Read

# Confirm cursor was uploaded for future resume
aws s3 ls s3://tailrd-cardiovascular-datasets-863518424332/ingest-cursors/

# Note completion in the change record
echo "Synthea staging seed complete: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> docs/CHANGE_RECORD_2026_04_28_synthea_staging_seed.md
```
