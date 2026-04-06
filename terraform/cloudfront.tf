# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- CloudFront CDN + S3 Frontend (HIPAA-compliant)
# ──────────────────────────────────────────────────────────────────────────────

# ─── ACM Certificate for CloudFront (must be us-east-1) ─────────────────────

data "aws_acm_certificate" "frontend" {
  provider    = aws
  domain      = "app.${var.domain_name}"
  statuses    = ["ISSUED"]
  most_recent = true
}

# ─── WAF Web ACL (lookup existing from CloudFormation) ──────────────────────

data "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-waf-acl"
  scope = "CLOUDFRONT"
}

# ─── S3 Bucket for Frontend Static Files ───────────────────────────────────

resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name_prefix}-frontend"

  tags = {
    Name = "${local.name_prefix}-frontend"
    HIPAA = "true"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.s3_kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── CloudFront Origin Access Identity ──────────────────────────────────────

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "OAI for ${local.name_prefix} frontend S3 bucket"
}

# ─── S3 Bucket Policy -- Allow CloudFront OAI Only ─────────────────────────

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.frontend.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# ─── CloudFront Distribution ───────────────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} frontend distribution"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  web_acl_id          = data.aws_wafv2_web_acl.main.arn

  aliases = ["app.${var.domain_name}"]

  # ── S3 Origin ──────────────────────────────────────────────────────────────

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  # ── Default Cache Behavior ────────────────────────────────────────────────

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # ── Custom Error Responses (SPA routing) ──────────────────────────────────

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  # ── TLS Configuration ────────────────────────────────────────────────────

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.frontend.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # ── Restrictions ──────────────────────────────────────────────────────────

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # ── Logging ───────────────────────────────────────────────────────────────

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.alb_logs.bucket_domain_name
    prefix          = "cloudfront/"
  }

  tags = {
    Name = "${local.name_prefix}-frontend-cdn"
    HIPAA = "true"
  }
}
