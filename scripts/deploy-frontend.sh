#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Frontend Deployment Script
# Build React app and deploy to S3/CloudFront
# Usage: ./scripts/deploy-frontend.sh [environment]
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────

ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-tailrd}"
BUCKET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="${PROJECT_ROOT}"

# ─── Colors ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ─── Preflight Checks ──────────────────────────────────────────────────────

log "Starting frontend deployment to ${ENVIRONMENT}"

if ! command -v aws &>/dev/null; then
    err "AWS CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v npm &>/dev/null; then
    err "npm is not installed. Please install Node.js first."
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    err "Frontend directory not found at ${FRONTEND_DIR}"
    exit 1
fi

# ─── Step 1: Resolve API URL from ALB ──────────────────────────────────────

log "Resolving ALB DNS name..."
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names "${PROJECT_NAME}-${ENVIRONMENT}-alb" \
    --region "${AWS_REGION}" \
    --query "LoadBalancers[0].DNSName" \
    --output text 2>/dev/null || echo "")

if [ -z "$ALB_DNS" ] || [ "$ALB_DNS" = "None" ]; then
    warn "Could not resolve ALB DNS. Using domain-based API URL."
    API_URL="https://api.tailrd-heart.com"
else
    API_URL="https://${ALB_DNS}"
fi

log "API URL: ${API_URL}"

# ─── Step 2: Install Dependencies ──────────────────────────────────────────

log "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm ci --production=false

# ─── Step 3: Build React App ───────────────────────────────────────────────

log "Building React application..."
REACT_APP_USE_REAL_API=true \
REACT_APP_API_URL="${API_URL}" \
REACT_APP_ENVIRONMENT="${ENVIRONMENT}" \
npm run build

BUILD_DIR="${FRONTEND_DIR}/build"
if [ ! -d "$BUILD_DIR" ]; then
    err "Build directory not found. Build may have failed."
    exit 1
fi

# ─── Step 4: Sync to S3 ────────────────────────────────────────────────────

log "Syncing build to s3://${BUCKET_NAME}..."
aws s3 sync "${BUILD_DIR}/" "s3://${BUCKET_NAME}/" \
    --delete \
    --region "${AWS_REGION}" \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json"

# Upload index.html and service worker with no-cache
aws s3 cp "${BUILD_DIR}/index.html" "s3://${BUCKET_NAME}/index.html" \
    --region "${AWS_REGION}" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

if [ -f "${BUILD_DIR}/service-worker.js" ]; then
    aws s3 cp "${BUILD_DIR}/service-worker.js" "s3://${BUCKET_NAME}/service-worker.js" \
        --region "${AWS_REGION}" \
        --cache-control "no-cache, no-store, must-revalidate"
fi

if [ -f "${BUILD_DIR}/manifest.json" ]; then
    aws s3 cp "${BUILD_DIR}/manifest.json" "s3://${BUCKET_NAME}/manifest.json" \
        --region "${AWS_REGION}" \
        --cache-control "no-cache, no-store, must-revalidate"
fi

# ─── Step 5: Invalidate CloudFront Cache ───────────────────────────────────

log "Looking up CloudFront distribution..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[?Id=='S3-${BUCKET_NAME}']].Id | [0]" \
    --output text 2>/dev/null || echo "")

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
    warn "Could not find CloudFront distribution. Skipping invalidation."
else
    log "Invalidating CloudFront cache (distribution: ${DISTRIBUTION_ID})..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "${DISTRIBUTION_ID}" \
        --paths "/*" \
        --query "Invalidation.Id" \
        --output text)
    log "Invalidation created: ${INVALIDATION_ID}"
fi

# ─── Done ───────────────────────────────────────────────────────────────────

log "Frontend deployment complete!"
log "  Bucket: s3://${BUCKET_NAME}"
log "  URL:    https://app.tailrd-heart.com"
