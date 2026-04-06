#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Production Database Seeding Script
# Run Prisma migrations and seed from Synthea cardiovascular data
# Usage: ./scripts/seed-production.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────

ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-tailrd}"
SECRET_NAME="${PROJECT_NAME}-${ENVIRONMENT}/app/database-url"
SEED_LIMIT="${SEED_LIMIT:-500}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ─── Colors ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[seed]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ─── Preflight Checks ──────────────────────────────────────────────────────

log "Starting production database seeding"
log "Environment: ${ENVIRONMENT}"

if ! command -v aws &>/dev/null; then
    err "AWS CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v npx &>/dev/null; then
    err "npx is not installed. Please install Node.js first."
    exit 1
fi

# ─── Safety Gate ────────────────────────────────────────────────────────────

if [ "$ENVIRONMENT" = "production" ]; then
    warn "You are about to seed the PRODUCTION database."
    read -r -p "Are you sure? Type 'yes' to continue: " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log "Aborted."
        exit 0
    fi
fi

# ─── Step 1: Retrieve DATABASE_URL from Secrets Manager ────────────────────

log "Fetching DATABASE_URL from Secrets Manager..."
DATABASE_URL=$(aws secretsmanager get-secret-value \
    --secret-id "${SECRET_NAME}" \
    --region "${AWS_REGION}" \
    --query "SecretString" \
    --output text)

if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "null" ]; then
    err "Failed to retrieve DATABASE_URL from Secrets Manager."
    err "Secret name: ${SECRET_NAME}"
    exit 1
fi

export DATABASE_URL
log "DATABASE_URL retrieved successfully."

# ─── Step 2: Run Prisma Migrations ─────────────────────────────────────────

log "Running Prisma migrations..."
cd "$PROJECT_ROOT"
npx prisma migrate deploy

log "Migrations applied successfully."

# ─── Step 3: Seed from Synthea Data ────────────────────────────────────────

log "Seeding database from Synthea cardiovascular data (limit: ${SEED_LIMIT})..."
npx tsx backend/scripts/seedFromSynthea.ts --s3 --limit "${SEED_LIMIT}"

# ─── Done ───────────────────────────────────────────────────────────────────

log "Production database seeding complete!"
log "  Records seeded: up to ${SEED_LIMIT} patients"
log "  Environment:    ${ENVIRONMENT}"
