# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- ElastiCache Redis (HIPAA-compliant)
# ──────────────────────────────────────────────────────────────────────────────

# ─── Redis Subnet Group ──────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-redis-subnet-group"
  description = "Private subnets for ${local.name_prefix} Redis"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name = "${local.name_prefix}-redis-subnet-group"
  }
}

# ─── Redis Security Group ───────────────────────────────────────────────────

resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-redis-"
  description = "Security group for ${local.name_prefix} Redis cluster"
  vpc_id      = var.vpc_id

  # Allow inbound Redis from application security group only
  ingress {
    description     = "Redis from application tier"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  # No egress needed for Redis
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-redis-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ─── Redis Parameter Group ──────────────────────────────────────────────────

resource "aws_elasticache_parameter_group" "redis7" {
  name        = "${local.name_prefix}-redis7-params"
  family      = "redis7"
  description = "Redis 7 parameters for ${local.name_prefix}"

  # Eviction policy suitable for caching + session store
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  tags = {
    Name = "${local.name_prefix}-redis7-params"
  }
}

# ─── Redis Replication Group ────────────────────────────────────────────────

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Redis cluster for ${local.name_prefix} (sessions, cache, BullMQ)"

  # Engine
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.medium"
  parameter_group_name = aws_elasticache_parameter_group.redis7.name

  # Topology -- single node; set num_cache_clusters > 1 to scale
  num_cache_clusters = 1
  port               = 6379

  # Networking -- private only
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Encryption (HIPAA)
  at_rest_encryption_enabled = true
  kms_key_id                 = var.phi_kms_key_arn
  transit_encryption_enabled = true
  # auth_token can be added for password authentication if needed

  # Maintenance
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_retention_limit = local.is_production ? 7 : 1
  snapshot_window          = "02:00-03:00"
  auto_minor_version_upgrade = true

  # Notifications
  apply_immediately = !local.is_production

  tags = {
    Name      = "${local.name_prefix}-redis"
    DataClass = "PHI"
  }
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}
