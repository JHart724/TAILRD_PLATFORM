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
| **Load (this doc)** | `backend/scripts/processSynthea.ts` (with `--s3` flag) | Run via Fargate one-off against staging Aurora |
| **Cursor** | Resume token for interrupted runs | `s3://...synthea/nyc-population-2026/fhir/ingest-cursors/${SYNTHEA_HOSPITAL_ID}.txt` |

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

`tailrd-staging.yml` defines `EcsTaskRole` with policies for Secrets Manager + CloudWatch only. Synthea processor needs to read from `tailrd-cardiovascular-datasets-863518424332/synthea/*`. If not present, attach a temporary policy.

```bash
# Check current task role policies
aws iam list-role-policies --role-name tailrd-staging-ecs-task

# If no S3 read policy listed, attach a temporary one:
cat > /tmp/synthea-s3-read.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket", "s3:PutObject", "s3:DeleteObject"],
    "Resource": [
      "arn:aws:s3:::tailrd-cardiovascular-datasets-863518424332",
      "arn:aws:s3:::tailrd-cardiovascular-datasets-863518424332/synthea/*",
      "arn:aws:s3:::tailrd-cardiovascular-datasets-863518424332/synthea/nyc-population-2026/fhir/ingest-cursors/*"
    ]
  }]
}
EOF

aws iam put-role-policy \
  --role-name tailrd-staging-ecs-task \
  --policy-name SyntheaSeedS3Read \
  --policy-document file:///tmp/synthea-s3-read.json
```

**Why PutObject + DeleteObject:** the cursor file is written/deleted in S3 to support resume.

**Cleanup:** after seed completes successfully (Wednesday), delete this policy:
```bash
aws iam delete-role-policy --role-name tailrd-staging-ecs-task --policy-name SyntheaSeedS3Read
```

---

## Step 2 - Pre-create the staging hospital tenant

The Synthea processor expects `SYNTHEA_HOSPITAL_ID` to exist in the `Hospital` table. Default value is `synthea-nyc-demo`. We'll use a staging-specific ID to keep tenancy clean.

```bash
# From a local shell with DATABASE_URL pointing at staging Aurora:
export STAGING_DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id tailrd-staging-aurora/app/database-url \
  --query 'SecretString' --output text)

DATABASE_URL="$STAGING_DB_URL" psql -c "
INSERT INTO \"Hospital\" (id, name, system, \"patientCount\", \"bedCount\", \"hospitalType\", street, city, state, \"zipCode\", \"createdAt\", \"updatedAt\")
VALUES ('synthea-nyc-staging', 'Staging Synthea NYC', 'TAILRD Staging', 25000, 1500, 'ACADEMIC', '0 Staging Way', 'New York', 'NY', '10001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
"
```

**Pass gate:** `INSERT 0 1` (or `INSERT 0 0` if it already exists from a prior run).

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

# Run processSynthea.ts as a one-off
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
      "command": ["sh", "-c", "cd /app && npx tsx backend/scripts/processSynthea.ts --s3 --limit 25000 --concurrency 10 2>&1 | tee /tmp/synthea-load.log; echo SYNTHEA_LOAD_DONE"]
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
      "command": ["sh", "-c", "cd /app && npx tsx -e \"const{runGapDetection}=require(\\\"./backend/src/ingestion/gapDetectionRunner\\\");(async()=>{const r=await runGapDetection({hospitalId:\\\"synthea-nyc-staging\\\"});console.log(JSON.stringify(r,null,2));console.log(\\\"GAP_DETECTION_DONE\\\")})()\""]
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
