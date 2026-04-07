#!/bin/bash
# TAILRD — Baseline Snapshot Script
# Run once before the first remediation fix
# Usage: chmod +x scripts/snapshot-baseline.sh && ./scripts/snapshot-baseline.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DOCS_DIR="docs"
BACKUPS_DIR="backups"

mkdir -p "$DOCS_DIR" "$BACKUPS_DIR"

echo "═══════════════════════════════════════════════"
echo "TAILRD REMEDIATION BASELINE SNAPSHOT"
echo "Timestamp: $TIMESTAMP"
echo "═══════════════════════════════════════════════"

# ── 1. Git tag ──────────────────────────────────────
echo ""
echo "[ 1/6 ] Creating git tag..."
git tag "pre-remediation-baseline-$TIMESTAMP" 2>/dev/null || \
  echo "  ⚠ Tag already exists — skipping"
git push origin "pre-remediation-baseline-$TIMESTAMP" 2>/dev/null || \
  echo "  ⚠ Push failed — tag created locally only"
echo "  ✅ Git tag: pre-remediation-baseline-$TIMESTAMP"

# ── 2. Database schema ──────────────────────────────
echo ""
echo "[ 2/6 ] Exporting database schema..."
if [ -z "$DATABASE_URL" ]; then
  echo "  ⚠ DATABASE_URL not set — skipping schema export"
else
  pg_dump "$DATABASE_URL" --schema-only \
    > "$DOCS_DIR/schema_baseline_$TIMESTAMP.sql"
  echo "  ✅ Schema saved: $DOCS_DIR/schema_baseline_$TIMESTAMP.sql"
fi

# ── 3. Demo seed data ───────────────────────────────
echo ""
echo "[ 3/6 ] Exporting demo seed data (no PHI)..."
if [ -z "$DATABASE_URL" ]; then
  echo "  ⚠ DATABASE_URL not set — skipping seed export"
else
  pg_dump "$DATABASE_URL" \
    --data-only \
    --table='"Hospital"' \
    --table='"User"' \
    --table='"HospitalModule"' \
    > "$DOCS_DIR/seed_baseline_$TIMESTAMP.sql" 2>/dev/null || \
    echo "  ⚠ Some tables not found — partial export"
  echo "  ✅ Seed data saved: $DOCS_DIR/seed_baseline_$TIMESTAMP.sql"
fi

# ── 4. API health ───────────────────────────────────
echo ""
echo "[ 4/6 ] Capturing API health baseline..."
API_URL="${API_URL:-http://localhost:3001}"
if curl -sf "$API_URL/api/health" > "$DOCS_DIR/health_baseline_$TIMESTAMP.json" 2>/dev/null; then
  echo "  ✅ API health saved: $DOCS_DIR/health_baseline_$TIMESTAMP.json"
else
  echo "  ⚠ API not reachable at $API_URL — skipping health check"
  echo '{"status":"not-captured","timestamp":"'"$TIMESTAMP"'"}' \
    > "$DOCS_DIR/health_baseline_$TIMESTAMP.json"
fi

# ── 5. Current gap rule counts ──────────────────────
echo ""
echo "[ 5/6 ] Capturing gap rule counts..."
if [ -f "backend/gapDetectionRunner.ts" ]; then
  RULE_COUNT=$(grep -c "gapId:" backend/gapDetectionRunner.ts 2>/dev/null || echo "unknown")
  echo "  Gap rules in gapDetectionRunner.ts: $RULE_COUNT"
  echo "gap_rule_count: $RULE_COUNT" > "$DOCS_DIR/gap_counts_baseline_$TIMESTAMP.txt"
  echo "timestamp: $TIMESTAMP" >> "$DOCS_DIR/gap_counts_baseline_$TIMESTAMP.txt"
  echo "  ✅ Gap counts saved: $DOCS_DIR/gap_counts_baseline_$TIMESTAMP.txt"
else
  echo "  ⚠ gapDetectionRunner.ts not found from current directory"
fi

# ── 6. Smoke tests ──────────────────────────────────
echo ""
echo "[ 6/6 ] Running smoke tests to capture baseline results..."
if [ -f "tests/smoke/regression.test.ts" ]; then
  npm test -- --testPathPattern=smoke --ci --forceExit \
    > "$DOCS_DIR/smoke_baseline_$TIMESTAMP.txt" 2>&1 || \
    echo "  ⚠ Some smoke tests failed at baseline — review before fixing"
  echo "  ✅ Smoke results saved: $DOCS_DIR/smoke_baseline_$TIMESTAMP.txt"
else
  echo "  ⚠ Smoke test file not found — create tests/smoke/regression.test.ts first"
fi

# ── Summary ─────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "BASELINE SNAPSHOT COMPLETE"
echo ""
echo "Files created:"
ls -lh "$DOCS_DIR"/*"$TIMESTAMP"* 2>/dev/null || echo "  (none in docs/)"
echo ""
echo "Git tag: pre-remediation-baseline-$TIMESTAMP"
echo ""
echo "To restore to this baseline at any point:"
echo "  git checkout pre-remediation-baseline-$TIMESTAMP"
if [ -f "$DOCS_DIR/schema_baseline_$TIMESTAMP.sql" ]; then
  echo "  psql \$DATABASE_URL < $DOCS_DIR/schema_baseline_$TIMESTAMP.sql"
fi
echo "═══════════════════════════════════════════════"
