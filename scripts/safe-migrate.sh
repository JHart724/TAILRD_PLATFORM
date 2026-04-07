#!/bin/bash
# TAILRD — Safe Database Migration Script
# Always test migrations on a clone before running against real database
# Usage: ./scripts/safe-migrate.sh <migration-name>
# Example: ./scripts/safe-migrate.sh fix_webhook_event_unique_index

set -e

MIGRATION_NAME="$1"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CLONE_DB="tailrd_test_$TIMESTAMP"

if [ -z "$MIGRATION_NAME" ]; then
  echo "Usage: ./scripts/safe-migrate.sh <migration-name>"
  echo "Example: ./scripts/safe-migrate.sh fix_webhook_unique_index"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable not set"
  exit 1
fi

echo "═══════════════════════════════════════════════"
echo "TAILRD SAFE MIGRATION PROTOCOL"
echo "Migration: $MIGRATION_NAME"
echo "Clone DB:  $CLONE_DB"
echo "═══════════════════════════════════════════════"

# ── 1. Backup production first ──────────────────────
echo ""
echo "[ 1/6 ] Backing up current database..."
mkdir -p backups
BACKUP_FILE="backups/pre_migration_${MIGRATION_NAME}_$TIMESTAMP.sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
echo "  ✅ Backup saved: $BACKUP_FILE"

# ── 2. Create clone database ────────────────────────
echo ""
echo "[ 2/6 ] Creating clone database: $CLONE_DB..."
# Extract host/user from DATABASE_URL for createdb
DB_HOST=$(echo "$DATABASE_URL" | sed 's/.*@\([^:\/]*\).*/\1/')
DB_USER=$(echo "$DATABASE_URL" | sed 's/.*:\/\/\([^:@]*\).*/\1/')
createdb -h "$DB_HOST" -U "$DB_USER" "$CLONE_DB" 2>/dev/null || {
  echo "  ⚠ createdb failed — trying psql method"
  psql "$DATABASE_URL" -c "CREATE DATABASE $CLONE_DB"
}
echo "  ✅ Clone created: $CLONE_DB"

# ── 3. Restore backup to clone ──────────────────────
echo ""
echo "[ 3/6 ] Restoring backup to clone..."
CLONE_URL=$(echo "$DATABASE_URL" | sed "s/\/[^\/]*$//")/$CLONE_DB
psql "$CLONE_URL" < "$BACKUP_FILE" > /dev/null 2>&1
echo "  ✅ Backup restored to clone"

# ── 4. Run migration on clone ───────────────────────
echo ""
echo "[ 4/6 ] Running migration on CLONE (not production)..."
DATABASE_URL="$CLONE_URL" \
  npx prisma migrate dev --name "$MIGRATION_NAME" --skip-seed
echo "  ✅ Migration applied to clone"

# ── 5. Run smoke tests against clone ────────────────
echo ""
echo "[ 5/6 ] Running smoke tests against clone..."
DATABASE_URL="$CLONE_URL" \
  npm test -- --testPathPattern=smoke --ci --forceExit

SMOKE_EXIT=$?
if [ $SMOKE_EXIT -ne 0 ]; then
  echo ""
  echo "  ❌ SMOKE TESTS FAILED ON CLONE"
  echo "  Migration NOT applied to production."
  echo "  Fix the migration and try again."
  echo ""
  echo "  Dropping clone: $CLONE_DB"
  psql "$DATABASE_URL" -c "DROP DATABASE $CLONE_DB" 2>/dev/null || true
  exit 1
fi
echo "  ✅ All smoke tests passing on clone"

# ── 6. Prompt before production ─────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "SMOKE TESTS PASSED ON CLONE"
echo ""
echo "Ready to apply migration to PRODUCTION database."
echo "This will affect all demo tenants and live data."
echo ""
echo "Production DATABASE_URL:"
echo "  ${DATABASE_URL:0:30}...[truncated]"
echo ""
read -p "Apply migration to production? [yes/no]: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Migration NOT applied to production."
  echo "Clone $CLONE_DB still exists for inspection."
  exit 0
fi

# ── Apply to production ─────────────────────────────
echo ""
echo "Applying migration to production..."
npx prisma migrate deploy
echo "  ✅ Migration applied to production"

# ── Cleanup ─────────────────────────────────────────
echo ""
echo "Dropping test clone: $CLONE_DB"
psql "$DATABASE_URL" -c "DROP DATABASE $CLONE_DB" 2>/dev/null || \
  echo "  ⚠ Could not drop clone — drop manually: DROP DATABASE $CLONE_DB"

echo ""
echo "═══════════════════════════════════════════════"
echo "MIGRATION COMPLETE: $MIGRATION_NAME"
echo "Backup retained at: $BACKUP_FILE"
echo "═══════════════════════════════════════════════"
