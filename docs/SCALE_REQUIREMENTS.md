# TAILRD Heart — Scale Requirements

**Owner:** Platform Engineering
**Last updated:** 2026-04-17
**Status:** Phase 1 in flight (this PR)

---

## 1. Target reference customers

Ingestion and query scale we must support, derived from real customer populations.

| Customer | Patient pop. | Annual encounters (est.) | Annual observations (est.) | Stage |
|---|---:|---:|---:|---|
| Medical City Dallas (HCA pilot) | 500,000 | ~8 M | ~250 M | Demo in progress |
| Mount Sinai (co-development) | 1,500,000 | ~25 M | ~750 M | Active pilot |
| CommonSpirit | 2,000,000 | ~33 M | ~1 B | Prospect |
| HCA (full system) | 35,000,000 | ~580 M | ~17 B | Strategic |

Encounter / observation estimates assume ~16 encounters + ~500 observations per patient per year (cardiovascular-weighted sample; cardiology-heavy patients run 3–5× this).

---

## 2. Current measured throughput (baseline)

Single ingestion run 2026-04-16, task def `tailrd-backend:76` (1 vCPU / 2 GB) before batching:

| Metric | Value |
|---|---|
| Bundles processed before OOM | ~6,131 |
| Runtime | 4 h 46 m |
| Sustained rate (peak, 0–2 k bundles) | 0.48 patient/s |
| Sustained rate (tail, 5–6 k bundles) | 0.27 patient/s |
| Overall rate | **0.36 patient/s (≈1,290 patients/hour)** |
| Exit reason | V8 heap OOM at ~1,918 MB / 2,081 MB cap |
| Per patient | 1 upsert + ~16 encounter upserts + ~340 observation upserts + 5× `createMany` |

**Root cause:** `processObservationData` upserts one row at a time (`observationService.ts:319`) and `processEncounterData` same (`encounterService.ts:349`). 500 round-trips to RDS per patient at ~5–10 ms each dominate runtime. Heap leak from per-row winston logger calls compounds it.

At 0.36 p/s:
- 50,000 patients → 38 hours (not acceptable)
- 500,000 (MCD) → 16 days
- 1,500,000 (Mount Sinai) → 48 days

---

## 3. Target throughput per phase

| Phase | Rate | 1 M patients | Customers unlocked |
|---|---|---|---|
| Baseline (pre-PR) | 0.36 p/s | 32 days | — |
| **Phase 1 (this week)** | **2–5 p/s** | **2.3–5.8 days** | **MCD demo (500 k)** |
| Phase 2 (2 weeks) | 10–20 p/s | 14–28 hours | Mount Sinai (1.5 M) |
| Phase 3 (4–6 weeks) | 50–100 p/s | 3–6 hours | CommonSpirit (2 M), HCA pilots |
| Phase 4 (quarter) | 500+ p/s | <1 hour | HCA full (35 M, incremental only) |

---

## 4. Architecture roadmap

### Phase 1 — Batched writes + 8 GB container (this PR)

**Goal:** eliminate per-row DB chatter, fix OOM, clear path to 50 k MCD demo.

Changes:
- `processObservationsBatch` replaces per-row upserts with one `createMany({ skipDuplicates: true })` per bundle
- `processEncountersBatch` same pattern; returns `fhirId → internalId` map for observation FK linkage
- Cursor persistence moves from ephemeral container disk to `s3://...datasets/ingest-cursors/{hospital}.txt`
- Heap + RSS logged every 100 bundles
- New `tailrd-ingest:12` task def: 2 vCPU, 8192 MB memory, `NODE_OPTIONS=--max-old-space-size=6144`
- Concurrency raised to 8

Expected: 5–10× throughput improvement on the write path. 50 k MCD ingestion feasible in one overnight run.

### Phase 2 — RDS Proxy + t4g.large (2 weeks)

**Goal:** eliminate RDS connection overhead; break out of t3 burst-CPU throttling.

Changes:
- Upgrade `tailrd-production-postgres` from **db.t3.medium → db.t4g.large** (Graviton, 2 vCPU / 8 GB, no burst credits)
- Deploy **RDS Proxy** in front; backend + ingest tasks connect via proxy for connection pooling
- Bump `max_connections` to 200; tune `work_mem` 16 MB, `maintenance_work_mem` 1 GB
- Provisioned IOPS to 6,000 on gp3

Unlocks sustained writes without CPU credit depletion. Removes the "throughput degrades over time" curve.

### Phase 3 — Horizontal workers + Aurora + SQS (4–6 weeks)

**Goal:** decouple ingestion from a single container; scale linearly to 100+ patients/sec.

Changes:
- Migrate from **RDS Postgres → Aurora Serverless v2** (2–32 ACU auto-scaling, ~5× write throughput on same class, instant failover)
- **SQS work queue**: ingestion driver enqueues per-bundle S3 keys; worker pool dequeues
- **Horizontal workers on ECS Fargate** — N workers, each with scoped IAM, scaling 1 → 20 on queue depth
- **Partitioned tables**: `Observation`, `Encounter`, `Condition` partitioned by `hospitalId` (list) then by `observedDateTime` (range, monthly)
- **Read replicas** for analytics queries: backend reads from replica, writes to primary
- **Copy-mode bulk insert** via `COPY ... FROM STDIN` where applicable (5–10× faster than `INSERT`)

Unlocks multi-tenant sustained ingest + analytics at Mount Sinai / CommonSpirit scale.

### Phase 4 — Streaming + warehouse separation (quarter+)

**Goal:** real-time ingestion for HCA, analytics/BI workloads on a separate columnar store.

Changes:
- Live EHR events (Redox webhook + FHIR bulk) land in **Kinesis Data Streams**; Lambda processors apply gap rules
- **Snowflake or Redshift** for long-horizon analytics + reporting; Postgres is for operational reads only
- **Materialized views** refreshed nightly for the module dashboards (gap counts, revenue opportunity, etc.)
- Row-level security via `hospitalId` at the DB layer as a defense-in-depth on top of app-layer tenant checks

---

## 5. SLOs

| SLO | Target | Measurement |
|---|---|---|
| Ingestion time, 1 M patients | ≤ 24 h by end Phase 2; ≤ 6 h Phase 3 | Wall-clock of processSynthea job |
| API p99 query latency (module dashboard) | ≤ 500 ms | CloudWatch `x-amzn-apigw-latency` p99 over 5 min |
| API p99 gap drill-down (patient worklist) | ≤ 1,000 ms | Same |
| Availability (backend API) | 99.9% monthly | `(1 - (downtime_minutes / 43,200)) × 100` |
| RTO (Recovery Time Objective) | 30 min | ALB + multi-AZ RDS; task def rollback via `aws ecs update-service` |
| RPO (Recovery Point Objective) | 5 min | RDS automated backups + 5-min transaction log ship to S3 |
| Gap detection lag (webhook → gap flag) | ≤ 60 s p95 | Time from `WebhookEvent.receivedAt` to `TherapyGap.createdAt` |

---

## 6. Observability requirements

Before Phase 2 ships:
- CloudWatch dashboard: ingestion throughput, RDS CPU, RDS IOPS, connection count, Node heap, queue depth
- Alarm on RDS CPU > 80% for 10 min → page on-call
- Alarm on RDS FreeableMemory < 400 MB → page on-call
- Alarm on ingestion worker CloudWatch log pattern `heap limit|OOM|FATAL` → page
- Structured JSON logs (winston → CloudWatch JSON) so we can query: `fields @timestamp, patientId | filter module = "heart-failure" | stats count()`

---

## 7. Open questions

- Should we batch the **patient upsert** too? Currently `processPatientData` is one upsert per bundle (=1 per patient). Batching would require an intermediate buffer + createMany + lookup, same pattern as encounters. Marginal win relative to batching encounters + observations but worth doing once we're past 100 p/s.
- PHI encryption middleware on Prisma — does it interact with `createMany`? The singleton at `backend/src/lib/prisma.ts` applies field-level encryption on write. If it operates at the `$use` middleware layer, `createMany` data should flow through the same hook. Verify before Phase 1 production run by inspecting one observation row's `valueText` column in the DB after a test ingestion (should read ciphertext, not plaintext).
- S3 bundle inventory: enable S3 Inventory for `synthea/nyc-population-2026/fhir/` so we have a daily-refreshed manifest instead of paginated `list-objects-v2` (current approach drops on 4 M+ object buckets).
