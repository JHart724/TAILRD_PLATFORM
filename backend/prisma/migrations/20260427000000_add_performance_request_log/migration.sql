-- Add PerformanceRequestLog model for per-request performance data.
--
-- The existing PerformanceMetric model was designed for aggregate-by-period
-- metrics (hourly/daily/weekly rollups: metricType, period, periodStart,
-- periodEnd, requestCount). The middleware/analytics.ts writer was producing
-- per-request data (one row per HTTP request) and missing every required
-- aggregate field. createMany has therefore failed silently for every flush
-- since the platform's Initial commit — analytics has never been collected
-- in production.
--
-- This migration:
--   1. Adds a new table `performance_request_logs` shaped for per-request
--      logging: endpoint, method, statusCode, responseTime, memoryUsage,
--      cpuUsage, dbQueryTime, metadata (Json), timestamp.
--   2. Adds 4 indexes for the expected query patterns:
--        - (hospitalId, timestamp) — admin "performance for hospital X"
--        - (userId, timestamp)     — user activity drill-down
--        - (endpoint, timestamp)   — endpoint trend / slowest endpoints
--        - (timestamp)             — cross-tenant + retention sweeps
--   3. Adds two ON DELETE SET NULL foreign keys to preserve logs when
--      hospitals or users are soft-deleted (matches existing
--      performance_metrics_hospitalId_fkey convention).
--
-- The existing `performance_metrics` table is RETAINED unchanged. Reserved
-- for the future scheduled-aggregation job that will roll the per-request
-- rows into hourly/daily/weekly aggregates and prune old rows. No writers
-- today, so leaving the table empty in production is harmless.
--
-- Companion code changes (same PR):
--   - backend/src/middleware/analytics.ts — writer switched from
--     prisma.performanceMetric.createMany to prisma.performanceRequestLog
--     .createMany; buffer reset moved to a `finally` block to fix the
--     unbounded-growth bug on persistent flush failures.
--   - backend/src/routes/analytics.ts — readers switched to query the new
--     table; aggregate _avg semantics still work because each row is one
--     request (sample-by-sample average is meaningful).
--   - backend/scripts/validateMigration.ts — table list includes the new
--     name.
--
-- Followups tracked as tech debt:
--   #29 — retention policy (aggregate >90d into PerformanceMetric, prune raw)
--   #30 — metadata field PII review (hash IPs, sanitize pageUrl pre-PHI)

CREATE TABLE "performance_request_logs" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "memoryUsage" DOUBLE PRECISION,
    "cpuUsage" DOUBLE PRECISION,
    "dbQueryTime" DOUBLE PRECISION,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "performance_request_logs_hospitalId_timestamp_idx"
    ON "performance_request_logs" ("hospitalId", "timestamp");

CREATE INDEX "performance_request_logs_userId_timestamp_idx"
    ON "performance_request_logs" ("userId", "timestamp");

CREATE INDEX "performance_request_logs_endpoint_timestamp_idx"
    ON "performance_request_logs" ("endpoint", "timestamp");

CREATE INDEX "performance_request_logs_timestamp_idx"
    ON "performance_request_logs" ("timestamp");

ALTER TABLE "performance_request_logs"
    ADD CONSTRAINT "performance_request_logs_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id")
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "performance_request_logs"
    ADD CONSTRAINT "performance_request_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON UPDATE CASCADE ON DELETE SET NULL;
