# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Cardiovascular AI Platform
# Provider Configuration & Data Sources
# ──────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Remote state backend (S3 + DynamoDB locking)
  # Prerequisites: run scripts/bootstrap-terraform.sh first to create the bucket + table
  backend "s3" {
    bucket         = "tailrd-terraform-state-863518424332"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tailrd-terraform-locks"
    encrypt        = true
  }
}

# ─── AWS Provider ────────────────────────────────────────────────────────────

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      Environment = var.environment
    })
  }
}

# ─── Locals ──────────────────────────────────────────────────────────────────

locals {
  name_prefix   = "${var.project_name}-${var.environment}"
  is_production = var.environment == "production"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    HIPAA       = "true"
  }
}

# ─── Data Sources: Existing CloudFormation Resources ─────────────────────────

data "aws_vpc" "main" {
  id = var.vpc_id
}

data "aws_subnet" "private" {
  for_each = toset(var.private_subnet_ids)
  id       = each.value
}

data "aws_subnet" "public" {
  for_each = toset(var.public_subnet_ids)
  id       = each.value
}

data "aws_subnet" "database" {
  for_each = toset(var.database_subnet_ids)
  id       = each.value
}

data "aws_security_group" "app" {
  id = var.app_security_group_id
}

data "aws_security_group" "db" {
  id = var.db_security_group_id
}

data "aws_security_group" "alb" {
  id = var.alb_security_group_id
}

data "aws_caller_identity" "current" {}

data "aws_kms_key" "phi" {
  key_id = var.phi_kms_key_arn
}

data "aws_kms_key" "s3" {
  key_id = var.s3_kms_key_arn
}

# ─── Random Resources ───────────────────────────────────────────────────────

resource "random_password" "rds_master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_id" "phi_encryption_key" {
  byte_length = 32 # 256-bit key, output as hex
}
