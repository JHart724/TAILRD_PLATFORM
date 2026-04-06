# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- PostgreSQL RDS (HIPAA-compliant)
# ──────────────────────────────────────────────────────────────────────────────

# ─── DB Subnet Group ─────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db-subnet-group"
  description = "Database subnets for ${local.name_prefix} RDS"
  subnet_ids  = var.database_subnet_ids

  tags = {
    Name = "${local.name_prefix}-db-subnet-group"
  }
}

# ─── RDS Parameter Group ────────────────────────────────────────────────────

resource "aws_db_parameter_group" "postgres15" {
  name        = "${local.name_prefix}-postgres15-params"
  family      = "postgres15"
  description = "PostgreSQL 15 parameters for ${local.name_prefix}"

  # Force SSL connections (HIPAA requirement)
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Audit logging for HIPAA compliance
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pgaudit"
    apply_method = "pending-reboot"
  }

  tags = {
    Name = "${local.name_prefix}-postgres15-params"
  }
}

# ─── RDS Instance ───────────────────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-postgres"

  # Engine
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type         = "gp3"

  # Database
  db_name  = "tailrd"
  username = "tailrd_admin"
  password = random_password.rds_master.result
  port     = 5432

  # Networking -- private only, no public access
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_security_group_id]
  publicly_accessible    = false
  multi_az               = local.is_production

  # Encryption (HIPAA)
  storage_encrypted = true
  kms_key_id        = var.phi_kms_key_arn

  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgres15.name

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:30-sun:05:30"
  copy_tags_to_snapshot   = true
  final_snapshot_identifier = "${local.name_prefix}-postgres-final-snapshot"
  deletion_protection       = local.is_production

  # Monitoring
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = var.phi_kms_key_arn
  performance_insights_retention_period = 7
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn

  # Logging
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Lifecycle
  apply_immediately = !local.is_production

  tags = {
    Name        = "${local.name_prefix}-postgres"
    DataClass   = "PHI"
    BackupClass = "Critical"
  }
}

# ─── Enhanced Monitoring IAM Role ────────────────────────────────────────────

resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ─── Store Master Password in Secrets Manager ───────────────────────────────

resource "aws_secretsmanager_secret" "rds_master_password" {
  name        = "${local.name_prefix}/rds/master-password"
  description = "RDS master password for ${local.name_prefix}"
  kms_key_id  = var.phi_kms_key_arn

  tags = {
    Name      = "${local.name_prefix}-rds-master-password"
    DataClass = "PHI"
  }
}

resource "aws_secretsmanager_secret_version" "rds_master_password" {
  secret_id = aws_secretsmanager_secret.rds_master_password.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.rds_master.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "rds_endpoint" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS instance hostname"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}
