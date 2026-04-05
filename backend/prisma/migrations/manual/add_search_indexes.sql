-- Patient search performance: GIN indexes for ILIKE queries
-- Run manually after deploying to PostgreSQL:
--   psql $DATABASE_URL -f backend/prisma/migrations/manual/add_search_indexes.sql

-- Enable pg_trgm extension for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes on patient search fields (supports ILIKE '%term%' queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_firstname_trgm
  ON patients USING gin (first_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_lastname_trgm
  ON patients USING gin (last_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_mrn_trgm
  ON patients USING gin (mrn gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_email_trgm
  ON patients USING gin (email gin_trgm_ops);
