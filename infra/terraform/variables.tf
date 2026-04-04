variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-north-1"
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
  default     = "155407238699"
}

variable "environment" {
  description = "Environment name (prod, staging)"
  type        = string
  default     = "prod"
}

# VPC
variable "vpc_id" {
  description = "Primary VPC ID (hypbit-vpc)"
  type        = string
  default     = "vpc-0e880ea5814b9f1be"
}

variable "private_subnet_a" {
  description = "Private subnet eu-north-1a"
  type        = string
  default     = "subnet-03988a059aa0325db"
}

variable "private_subnet_b" {
  description = "Private subnet eu-north-1b"
  type        = string
  default     = "subnet-000bd8dc692433914"
}

variable "public_subnet_a" {
  description = "Public subnet eu-north-1a"
  type        = string
  default     = "subnet-0b7ddc8cce64c0f91"
}

variable "public_subnet_b" {
  description = "Public subnet eu-north-1b"
  type        = string
  default     = "subnet-061d38a263044a64f"
}

# Security Groups
variable "ecs_sg_id" {
  description = "ECS tasks security group"
  type        = string
  default     = "sg-0ffa8db73ad957c38"
}

variable "alb_sg_id" {
  description = "ALB security group"
  type        = string
  default     = "sg-0f8e8a9781a6cbc2e"
}

variable "supabase_alb_sg_id" {
  description = "Supabase ALB security group"
  type        = string
  default     = "sg-00ebef0804ffe2ce2"
}

variable "identity_core_sg_id" {
  description = "Identity Core security group"
  type        = string
  default     = "sg-0508068d3b4301b8c"
}

# IAM
variable "ecs_task_role_arn" {
  description = "ECS Task Role ARN"
  type        = string
  default     = "arn:aws:iam::155407238699:role/hypbit-ecs-task"
}

variable "ecs_execution_role_arn" {
  description = "ECS Task Execution Role ARN"
  type        = string
  default     = "arn:aws:iam::155407238699:role/hypbit-ecs-task-execution"
}

# ALB
variable "alb_certificate_arn" {
  description = "ACM certificate ARN for HTTPS listener"
  type        = string
  default     = "arn:aws:acm:eu-north-1:155407238699:certificate/a1d70f03-57f5-41c9-bf79-3dfd44dd5481"
}

# RDS
variable "rds_master_username" {
  description = "RDS master username (from SSM /wavult/prod/RDS_USER)"
  type        = string
  sensitive   = true
}

variable "rds_master_password" {
  description = "RDS master password (from SSM /wavult/prod/RDS_PASSWORD)"
  type        = string
  sensitive   = true
}

# ECS Service image tags
variable "wavult_os_api_image" {
  description = "Docker image for wavult-os-api"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/wavult-os-api:latest"
}

variable "wavult_core_image" {
  description = "Docker image for wavult-core"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/wavult-core:latest"
}

variable "identity_core_image" {
  description = "Docker image for identity-core"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/identity-core:latest"
}

variable "quixzoom_api_image" {
  description = "Docker image for quixzoom-api"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/quixzoom-api:latest"
}

variable "landvex_api_image" {
  description = "Docker image for landvex-api"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/landvex-api:latest"
}

variable "team_pulse_image" {
  description = "Docker image for team-pulse"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/team-pulse:latest"
}

variable "bos_scheduler_image" {
  description = "Docker image for bos-scheduler"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/bos-scheduler:latest"
}

variable "gitea_image" {
  description = "Docker image for gitea"
  type        = string
  default     = "gitea/gitea:latest"
}

variable "gitea_runner_image" {
  description = "Docker image for gitea-runner"
  type        = string
  default     = "155407238699.dkr.ecr.eu-north-1.amazonaws.com/gitea-act-runner:latest"
}

variable "n8n_image" {
  description = "Docker image for n8n"
  type        = string
  default     = "n8nio/n8n:latest"
}

variable "redis_image" {
  description = "Docker image for redis"
  type        = string
  default     = "redis:7-alpine"
}

variable "kafka_image" {
  description = "Docker image for kafka"
  type        = string
  default     = "bitnami/kafka:latest"
}

variable "supabase_kong_image" {
  description = "Docker image for supabase kong"
  type        = string
  default     = "kong:2.8.1"
}
