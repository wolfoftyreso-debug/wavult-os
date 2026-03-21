output "api_url" {
  description = "API endpoint URL"
  value       = "https://${var.api_subdomain}.${var.domain}"
}

output "alb_dns_name" {
  description = "ALB DNS name (for debugging)"
  value       = aws_lb.api.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.api.name
}

output "frontend_urls" {
  description = "CloudFront URLs for all frontend apps"
  value = {
    for app, subdomain in local.app_subdomains : app => "https://${subdomain}"
  }
}

output "cloudfront_distribution_ids" {
  description = "CloudFront distribution IDs (for cache invalidation)"
  value = {
    for app, dist in aws_cloudfront_distribution.frontend : app => dist.id
  }
}

output "s3_bucket_names" {
  description = "S3 bucket names for frontend apps"
  value = {
    for app, bucket in aws_s3_bucket.frontend : app => bucket.id
  }
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (for ECS tasks)"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (for ALB)"
  value       = aws_subnet.public[*].id
}
