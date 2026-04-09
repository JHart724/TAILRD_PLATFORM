# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Secrets Manager (HIPAA-compliant)
# ──────────────────────────────────────────────────────────────────────────────

# ─── DATABASE_URL ────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "database_url" {
  name        = "${local.name_prefix}/app/database-url"
  description = "PostgreSQL connection string for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-database-url"
    DataClass = "PHI"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${aws_db_instance.main.username}:${urlencode(random_password.rds_master.result)}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}?sslmode=require"
}

# ─── JWT_SECRET ──────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${local.name_prefix}/app/jwt-secret"
  description = "JWT signing secret for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-jwt-secret"
    DataClass = "Sensitive"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# ─── PHI_ENCRYPTION_KEY ─────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "phi_encryption_key" {
  name        = "${local.name_prefix}/app/phi-encryption-key"
  description = "256-bit application-level PHI encryption key for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-phi-encryption-key"
    DataClass = "PHI"
  }
}

resource "aws_secretsmanager_secret_version" "phi_encryption_key" {
  secret_id     = aws_secretsmanager_secret.phi_encryption_key.id
  secret_string = random_id.phi_encryption_key.hex
}

# ─── REDOX Integration Credentials (placeholders) ───────────────────────────

# ─── REDIS_URL ──────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "redis_url" {
  name        = "${local.name_prefix}/app/redis-url"
  description = "Redis connection URL for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-redis-url"
    DataClass = "Secret"
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = "rediss://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
}

# ─── REDOX_WEBHOOK_SECRET ───────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "redox_webhook_secret" {
  name        = "${local.name_prefix}/app/redox-webhook-secret"
  description = "Redox webhook verification secret for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-redox-webhook-secret"
    DataClass = "Sensitive"
  }
}

resource "aws_secretsmanager_secret_version" "redox_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.redox_webhook_secret.id
  secret_string = "PLACEHOLDER_REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─── SMART_CLIENT_SECRET ────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "smart_client_secret" {
  name        = "${local.name_prefix}/app/smart-client-secret"
  description = "SMART on FHIR client secret for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-smart-client-secret"
    DataClass = "Sensitive"
  }
}

resource "aws_secretsmanager_secret_version" "smart_client_secret" {
  secret_id     = aws_secretsmanager_secret.smart_client_secret.id
  secret_string = "PLACEHOLDER_REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─── REDOX Integration Credentials (placeholders) ───────────────────────────

resource "aws_secretsmanager_secret" "redox_client_id" {
  name        = "${local.name_prefix}/app/redox-client-id"
  description = "Redox EHR integration client ID for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-redox-client-id"
    DataClass = "Sensitive"
  }
}

resource "aws_secretsmanager_secret_version" "redox_client_id" {
  secret_id     = aws_secretsmanager_secret.redox_client_id.id
  secret_string = "PLACEHOLDER_REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "redox_client_secret" {
  name        = "${local.name_prefix}/app/redox-client-secret"
  description = "Redox EHR integration client secret for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-redox-client-secret"
    DataClass = "Sensitive"
  }
}

resource "aws_secretsmanager_secret_version" "redox_client_secret" {
  secret_id     = aws_secretsmanager_secret.redox_client_secret.id
  secret_string = "PLACEHOLDER_REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─── IAM Policy: ECS Task Secrets Access ────────────────────────────────────

resource "aws_iam_policy" "ecs_secrets_access" {
  name        = "${local.name_prefix}-ecs-secrets-access"
  description = "Allow ECS tasks to read application secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database_url.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.phi_encryption_key.arn,
          aws_secretsmanager_secret.redis_url.arn,
          aws_secretsmanager_secret.redox_webhook_secret.arn,
          aws_secretsmanager_secret.smart_client_secret.arn,
          aws_secretsmanager_secret.redox_client_id.arn,
          aws_secretsmanager_secret.redox_client_secret.arn,
          aws_secretsmanager_secret.rds_master_password.arn
        ]
      },
      {
        Sid    = "DecryptSecrets"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = [
          var.phi_kms_key_arn
        ]
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-ecs-secrets-access"
  }
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "secrets_arns" {
  description = "Map of secret name to ARN for ECS task definition references"
  value = {
    database_url         = aws_secretsmanager_secret.database_url.arn
    jwt_secret           = aws_secretsmanager_secret.jwt_secret.arn
    phi_encryption_key   = aws_secretsmanager_secret.phi_encryption_key.arn
    redis_url            = aws_secretsmanager_secret.redis_url.arn
    redox_webhook_secret = aws_secretsmanager_secret.redox_webhook_secret.arn
    smart_client_secret  = aws_secretsmanager_secret.smart_client_secret.arn
    redox_client_id      = aws_secretsmanager_secret.redox_client_id.arn
    redox_client_secret  = aws_secretsmanager_secret.redox_client_secret.arn
  }
}

output "ecs_secrets_policy_arn" {
  description = "IAM policy ARN to attach to ECS task execution role"
  value       = aws_iam_policy.ecs_secrets_access.arn
}
