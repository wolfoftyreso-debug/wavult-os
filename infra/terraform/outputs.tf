output "api_url" {
  description = "API endpoint"
  value       = "https://api.${var.product_prefix}.${var.domain}"
}

output "app_url" {
  description = "Operatörsstation URL"
  value       = "https://app.${var.product_prefix}.${var.domain}"
}

output "admin_url" {
  description = "Ledningsportal URL"
  value       = "https://admin.${var.product_prefix}.${var.domain}"
}

output "crm_url" {
  description = "CRM URL"
  value       = "https://crm.${var.product_prefix}.${var.domain}"
}

output "sales_url" {
  description = "Försäljning URL"
  value       = "https://sales.${var.product_prefix}.${var.domain}"
}

output "ecr_repository_url" {
  description = "ECR repository URL för Docker images"
  value       = aws_ecr_repository.api.repository_url
}

output "cloudfront_distribution_ids" {
  description = "CloudFront distribution IDs per app"
  value       = { for app, dist in aws_cloudfront_distribution.frontends : app => dist.id }
}

output "alb_dns" {
  description = "ALB DNS-namn"
  value       = aws_lb.api.dns_name
}

output "cloudflare_zone_id" {
  description = "Cloudflare Zone ID för pixdrift.com"
  value       = data.cloudflare_zone.main.zone_id
}
