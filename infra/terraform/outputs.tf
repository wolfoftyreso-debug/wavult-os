# Outputs — Key infrastructure values

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.wavult.name
}

output "ecs_cluster_arn" {
  description = "ECS Cluster ARN"
  value       = aws_ecs_cluster.wavult.arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.wavult_api.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.wavult_api.arn
}

output "alb_zone_id" {
  description = "ALB hosted zone ID (for Route53/Cloudflare CNAME)"
  value       = aws_lb.wavult_api.zone_id
}

output "rds_identity_core_endpoint" {
  description = "RDS wavult-identity-core endpoint"
  value       = aws_db_instance.identity_core.endpoint
  sensitive   = true
}

output "rds_identity_ecs_endpoint" {
  description = "RDS wavult-identity-ecs endpoint"
  value       = aws_db_instance.identity_ecs.endpoint
  sensitive   = true
}

output "ecr_registry" {
  description = "ECR registry URL"
  value       = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "ecs_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "vpc_id" {
  description = "Primary VPC ID"
  value       = data.aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = [var.private_subnet_a, var.private_subnet_b]
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = [var.public_subnet_a, var.public_subnet_b]
}

output "terraform_state_bucket" {
  description = "Terraform state S3 bucket"
  value       = "wavult-terraform-state"
}

output "terraform_lock_table" {
  description = "Terraform DynamoDB lock table"
  value       = "wavult-terraform-locks"
}

output "gitea_efs_id" {
  description = "Gitea EFS file system ID"
  value       = aws_efs_file_system.gitea.id
}

output "n8n_efs_id" {
  description = "n8n EFS file system ID"
  value       = aws_efs_file_system.n8n.id
}
