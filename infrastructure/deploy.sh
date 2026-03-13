#!/bin/bash

# TAILRD Platform - AWS Infrastructure Deployment Script
# Provisions all CloudFormation stacks in the correct order.
#
# Usage:
#   ./infrastructure/deploy.sh [environment] [aws-account-id]
#
# Example:
#   ./infrastructure/deploy.sh production 123456789012
#   ./infrastructure/deploy.sh staging 123456789012

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

ENV="${1:-staging}"
ACCOUNT_ID="${2:-}"
REGION="${AWS_REGION:-us-east-1}"
STACK_PREFIX="tailrd-${ENV}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Validation ───────────────────────────────────────────────────────────────

if [[ -z "$ACCOUNT_ID" ]]; then
    echo -e "${RED}Usage: $0 <environment> <aws-account-id>${NC}"
    echo "  environment: production | staging | development"
    echo "  aws-account-id: 12-digit AWS account number"
    exit 1
fi

if [[ ! "$ENV" =~ ^(production|staging|development)$ ]]; then
    echo -e "${RED}Invalid environment: $ENV${NC}"
    echo "Must be: production, staging, or development"
    exit 1
fi

if [[ ! "$ACCOUNT_ID" =~ ^[0-9]{12}$ ]]; then
    echo -e "${RED}Invalid AWS account ID: $ACCOUNT_ID${NC}"
    echo "Must be a 12-digit number"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Install: https://aws.amazon.com/cli/${NC}"
    exit 1
fi

# Verify AWS credentials
echo -e "${YELLOW}Verifying AWS credentials...${NC}"
CALLER_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [[ "$CALLER_ACCOUNT" != "$ACCOUNT_ID" ]]; then
    echo -e "${RED}AWS credentials don't match account $ACCOUNT_ID (got: $CALLER_ACCOUNT)${NC}"
    echo "Configure credentials: aws configure"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated as account $ACCOUNT_ID${NC}"

# ── Helper Functions ─────────────────────────────────────────────────────────

deploy_stack() {
    local stack_name="$1"
    local template="$2"
    shift 2
    local params=("$@")

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Deploying: $stack_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Check if stack exists
    local stack_status=""
    stack_status=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "DOES_NOT_EXIST")

    local action="create-stack"
    if [[ "$stack_status" != "DOES_NOT_EXIST" ]]; then
        action="update-stack"
        echo -e "${YELLOW}  Stack exists (status: $stack_status). Updating...${NC}"
    else
        echo -e "${YELLOW}  Creating new stack...${NC}"
    fi

    # Build parameter overrides
    local param_args=""
    if [[ ${#params[@]} -gt 0 ]]; then
        param_args="--parameters"
        for p in "${params[@]}"; do
            param_args="$param_args $p"
        done
    fi

    # Deploy
    set +e
    local output
    output=$(aws cloudformation "$action" \
        --stack-name "$stack_name" \
        --template-body "file://$template" \
        --capabilities CAPABILITY_NAMED_IAM CAPABILITY_IAM \
        --region "$REGION" \
        $param_args \
        --tags Key=Environment,Value="$ENV" Key=Project,Value=tailrd Key=HIPAA,Value=true \
        2>&1)
    local exit_code=$?
    set -e

    # Handle "no updates" gracefully
    if echo "$output" | grep -q "No updates are to be performed"; then
        echo -e "${GREEN}  ✅ No changes needed — stack is up to date${NC}"
        return 0
    fi

    if [[ $exit_code -ne 0 ]]; then
        echo -e "${RED}  ❌ Deployment failed: $output${NC}"
        return 1
    fi

    # Wait for completion
    echo -e "${YELLOW}  Waiting for stack operation to complete...${NC}"
    local wait_action="stack-create-complete"
    if [[ "$action" == "update-stack" ]]; then
        wait_action="stack-update-complete"
    fi

    aws cloudformation wait "$wait_action" \
        --stack-name "$stack_name" \
        --region "$REGION"

    echo -e "${GREEN}  ✅ $stack_name deployed successfully${NC}"
}

# ── Deploy Stacks ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CF_DIR="$SCRIPT_DIR/cloudformation"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TAILRD Platform — AWS Infrastructure Deployment        ║${NC}"
echo -e "${BLUE}║  Environment: ${ENV}                                    ║${NC}"
echo -e "${BLUE}║  Region: ${REGION}                                      ║${NC}"
echo -e "${BLUE}║  Account: ${ACCOUNT_ID}                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"

# Stack 1: VPC & Network
deploy_stack "${STACK_PREFIX}-vpc" \
    "$CF_DIR/vpc-network.yaml" \
    "ParameterKey=EnvironmentName,ParameterValue=$ENV"

# Stack 2: S3 & KMS
deploy_stack "${STACK_PREFIX}-s3-kms" \
    "$CF_DIR/s3-kms.yaml" \
    "ParameterKey=EnvironmentName,ParameterValue=$ENV" \
    "ParameterKey=AccountId,ParameterValue=$ACCOUNT_ID"

# Stack 3: WAF & CloudTrail
deploy_stack "${STACK_PREFIX}-waf-cloudtrail" \
    "$CF_DIR/waf-cloudtrail.yaml" \
    "ParameterKey=EnvironmentName,ParameterValue=$ENV" \
    "ParameterKey=AccountId,ParameterValue=$ACCOUNT_ID"

# ── Print Outputs ────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ All stacks deployed successfully!                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}Stack Outputs:${NC}"
echo ""

for stack in "${STACK_PREFIX}-vpc" "${STACK_PREFIX}-s3-kms" "${STACK_PREFIX}-waf-cloudtrail"; do
    echo -e "${YELLOW}── $stack ──${NC}"
    aws cloudformation describe-stacks \
        --stack-name "$stack" \
        --query 'Stacks[0].Outputs[*].[OutputKey, OutputValue]' \
        --output table \
        --region "$REGION" 2>/dev/null || echo "  (stack may still be creating)"
    echo ""
done

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Copy the KMS Key IDs and S3 bucket names to your backend .env"
echo "2. Create the IAM app role:"
echo "   aws iam create-role --role-name tailrd-${ENV}-app-role --assume-role-policy-document file://infrastructure/iam-policies/trust-policy.json"
echo "   aws iam put-role-policy --role-name tailrd-${ENV}-app-role --policy-name tailrd-app-policy --policy-document file://infrastructure/iam-policies/app-role-policy.json"
echo "3. Update backend .env with AWS_KMS_PHI_KEY_ALIAS and S3 bucket names"
echo "4. Deploy your application to the private subnets"
