variable "aws_region" {
  description = "AWS region for primary resources"
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "domain" {
  description = "Root domain name"
  type        = string
  default     = "pixdrift.com"
}

variable "product_prefix" {
  description = "Product prefix under root domain"
  type        = string
  default     = "bc"
}

variable "ecs_task_cpu" {
  description = "ECS task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "ECS task memory in MB"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "api_port" {
  description = "Port the API container listens on"
  type        = number
  default     = 3001
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to use"
  type        = number
  default     = 2
}

variable "ecr_image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_service_role_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_anon_key" {
  description = "Supabase anon key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token med DNS-rättigheter för pixdrift.com"
  type        = string
  sensitive   = true
  default     = ""
}
