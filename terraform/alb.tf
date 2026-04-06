# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Application Load Balancer (HIPAA-compliant)
# ──────────────────────────────────────────────────────────────────────────────

# ─── ACM Certificate (request new) ─────────────────────────────────────────

resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  tags = {
    Name = "${local.name_prefix}-api-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ─── S3 Bucket for ALB Access Logs ─────────────────────────────────────────

resource "aws_s3_bucket" "alb_logs" {
  bucket = "${local.name_prefix}-alb-access-logs"

  tags = {
    Name      = "${local.name_prefix}-alb-access-logs"
    DataClass = "Audit"
    HIPAA     = "true"
  }
}

resource "aws_s3_bucket_versioning" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256" # ALB access logs only support SSE-S3, not KMS
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    filter {}

    expiration {
      days = 365
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

data "aws_elb_service_account" "main" {}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowALBLogDelivery"
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.main.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      },
      {
        Sid    = "AllowLogDeliveryService"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid    = "AllowLogDeliveryACLCheck"
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

# ─── Application Load Balancer ──────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = local.is_production
  drop_invalid_header_fields = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
  }

  tags = {
    Name = "${local.name_prefix}-alb"
    HIPAA = "true"
  }
}

# ─── Target Group ──────────────────────────────────────────────────────────

resource "aws_lb_target_group" "backend" {
  name        = "${local.name_prefix}-backend-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${local.name_prefix}-backend-tg"
    HIPAA = "true"
  }
}

# ─── HTTPS Listener (443) ──────────────────────────────────────────────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.api.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = {
    Name = "${local.name_prefix}-https-listener"
    HIPAA = "true"
  }
}

# ─── HTTP Listener (80) -- Redirect to HTTPS ───────────────────────────────

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = {
    Name = "${local.name_prefix}-http-redirect"
    HIPAA = "true"
  }
}
