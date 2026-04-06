#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Backend Deployment Script
# Build Docker image, push to ECR, deploy to ECS Fargate
# Usage: ./scripts/deploy-backend.sh [environment]
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────

ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-tailrd}"
CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
SERVICE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-backend"
ECR_REPO="${PROJECT_NAME}-backend"
IMAGE_TAG="sha-$(git rev-parse --short HEAD)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ─── Colors ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ─── Preflight Checks ──────────────────────────────────────────────────────

log "Starting backend deployment to ${ENVIRONMENT}"
log "Image tag: ${IMAGE_TAG}"

if ! command -v aws &>/dev/null; then
    err "AWS CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v docker &>/dev/null; then
    err "Docker is not installed. Please install it first."
    exit 1
fi

# ─── Step 1: Get AWS Account ID and ECR URL ────────────────────────────────

log "Fetching AWS account information..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

log "ECR URL: ${ECR_URL}"

# ─── Step 2: Authenticate Docker with ECR ──────────────────────────────────

log "Authenticating Docker with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
    | docker login --username AWS --password-stdin \
      "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# ─── Step 3: Build Docker Image ────────────────────────────────────────────

log "Building Docker image..."
docker build \
    -t "${ECR_REPO}:${IMAGE_TAG}" \
    -t "${ECR_REPO}:latest" \
    -f "${PROJECT_ROOT}/backend/Dockerfile" \
    "${PROJECT_ROOT}/backend/"

# ─── Step 4: Tag and Push to ECR ───────────────────────────────────────────

log "Tagging images for ECR..."
docker tag "${ECR_REPO}:${IMAGE_TAG}" "${ECR_URL}:${IMAGE_TAG}"
docker tag "${ECR_REPO}:latest" "${ECR_URL}:latest"

log "Pushing ${IMAGE_TAG} to ECR..."
docker push "${ECR_URL}:${IMAGE_TAG}"

log "Pushing latest to ECR..."
docker push "${ECR_URL}:latest"

# ─── Step 5: Update ECS Service ────────────────────────────────────────────

log "Forcing new ECS deployment..."
aws ecs update-service \
    --cluster "${CLUSTER_NAME}" \
    --service "${SERVICE_NAME}" \
    --force-new-deployment \
    --region "${AWS_REGION}" \
    --output text > /dev/null

# ─── Step 6: Wait for Deployment to Stabilize ──────────────────────────────

log "Waiting for ECS service to stabilize (this may take a few minutes)..."
aws ecs wait services-stable \
    --cluster "${CLUSTER_NAME}" \
    --services "${SERVICE_NAME}" \
    --region "${AWS_REGION}"

# ─── Done ───────────────────────────────────────────────────────────────────

log "Backend deployment complete!"
log "  Cluster:  ${CLUSTER_NAME}"
log "  Service:  ${SERVICE_NAME}"
log "  Image:    ${ECR_URL}:${IMAGE_TAG}"
