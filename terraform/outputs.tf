# ──────────────────────────────────────────────────────────────────────────────
# TAILRD Heart -- Terraform Outputs
# ──────────────────────────────────────────────────────────────────────────────

# ─── ALB ────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "ALB DNS name for the backend API"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID (for Route53 alias records)"
  value       = aws_lb.main.zone_id
}

# ─── RDS (re-exported from rds.tf for convenience) ─────────────────────────

output "rds_endpoint_full" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

# ─── ECR (re-exported from ecr.tf for convenience) ─────────────────────────

output "ecr_repository_url_full" {
  description = "ECR repository URL for tailrd-backend images"
  value       = aws_ecr_repository.backend.repository_url
}

# ─── CloudFront ─────────────────────────────────────────────────────────────

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

# ─── ECS ────────────────────────────────────────────────────────────────────

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.backend.name
}

# ─── S3 ─────────────────────────────────────────────────────────────────────

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "S3 bucket ARN for frontend static files"
  value       = aws_s3_bucket.frontend.arn
}

# ─── Cognito ───────────────────────────────────────────────────────────────

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_app_client_id" {
  description = "Cognito App Client ID (for frontend SDK)"
  value       = aws_cognito_user_pool_client.api.id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_issuer" {
  description = "Cognito token issuer URL (for JWT validation)"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}
