# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Cardiovascular AI Platform
# Input Variables
# ──────────────────────────────────────────────────────────────────────────────

# ─── General ──────────────────────────────────────────────────────────────────

variable "environment" {
  description = "Deployment environment (production, staging, dev)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "dev"], var.environment)
    error_message = "Environment must be one of: production, staging, dev."
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID (used for IAM ARN construction)"
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be a 12-digit AWS account number."
  }
}

variable "project_name" {
  description = "Project identifier used in resource naming"
  type        = string
  default     = "tailrd"
}

# ─── Networking (from existing CloudFormation stack) ─────────────────────────

variable "vpc_id" {
  description = "VPC ID from the existing CloudFormation network stack"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs from the existing CloudFormation stack"
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets are required for high availability."
  }
}

variable "public_subnet_ids" {
  description = "Public subnet IDs from the existing CloudFormation stack"
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "At least two public subnets are required for ALB."
  }
}

variable "database_subnet_ids" {
  description = "Database subnet IDs from the existing CloudFormation stack"
  type        = list(string)

  validation {
    condition     = length(var.database_subnet_ids) >= 2
    error_message = "At least two database subnets are required for RDS Multi-AZ."
  }
}

# ─── Security Groups (from existing CloudFormation stack) ─────────────────────

variable "app_security_group_id" {
  description = "Security group ID for application tier (ECS tasks)"
  type        = string
}

variable "db_security_group_id" {
  description = "Security group ID for database tier (RDS)"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID for the Application Load Balancer"
  type        = string
}

# ─── DNS ──────────────────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Primary domain name for the platform"
  type        = string
  default     = "tailrd-heart.com"
}

# ─── RDS Configuration ───────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "db_allocated_storage must be between 20 and 65536 GB."
  }
}

# ─── ECS Configuration ──────────────────────────────────────────────────────

variable "ecs_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "ecs_memory" {
  description = "Memory (MiB) for ECS task"
  type        = number
  default     = 2048
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "container_port" {
  description = "Port the application container listens on"
  type        = number
  default     = 3001
}

# ─── Encryption (from existing CloudFormation KMS keys) ──────────────────────

variable "phi_kms_key_arn" {
  description = "KMS key ARN for PHI encryption (RDS, Secrets Manager)"
  type        = string

  validation {
    condition     = can(regex("^arn:aws:kms:", var.phi_kms_key_arn))
    error_message = "phi_kms_key_arn must be a valid KMS key ARN."
  }
}

variable "s3_kms_key_arn" {
  description = "KMS key ARN for S3 object encryption"
  type        = string

  validation {
    condition     = can(regex("^arn:aws:kms:", var.s3_kms_key_arn))
    error_message = "s3_kms_key_arn must be a valid KMS key ARN."
  }
}

# ─── S3 ──────────────────────────────────────────────────────────────────────

variable "synthea_bucket" {
  description = "S3 bucket containing Synthea cardiovascular datasets"
  type        = string
  default     = "tailrd-cardiovascular-datasets-863518424332"
}

# ─── Tags ────────────────────────────────────────────────────────────────────

variable "tags" {
  description = "Default tags applied to all resources"
  type        = map(string)
  default = {
    Project   = "TAILRD"
    ManagedBy = "Terraform"
    HIPAA     = "true"
  }
}
