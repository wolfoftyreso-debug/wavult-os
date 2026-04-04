# VPC — Data sources for existing infrastructure
# The primary VPC (hypbit-vpc) and its subnets already exist.
# We reference them via data sources to avoid recreating.

data "aws_vpc" "main" {
  id = var.vpc_id
}

data "aws_subnet" "private_a" {
  id = var.private_subnet_a
}

data "aws_subnet" "private_b" {
  id = var.private_subnet_b
}

data "aws_subnet" "public_a" {
  id = var.public_subnet_a
}

data "aws_subnet" "public_b" {
  id = var.public_subnet_b
}

# Security Groups — data sources for existing SGs
data "aws_security_group" "alb" {
  id = var.alb_sg_id
}

data "aws_security_group" "ecs" {
  id = var.ecs_sg_id
}

data "aws_security_group" "supabase_alb" {
  id = var.supabase_alb_sg_id
}

data "aws_security_group" "identity_core" {
  id = var.identity_core_sg_id
}

# Security Group for Gitea EFS
resource "aws_security_group" "gitea_efs" {
  name        = "gitea-efs-sg"
  description = "Security group for Gitea EFS"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [data.aws_security_group.ecs.id]
    description     = "NFS from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "gitea-efs-sg"
    Environment = var.environment
    Project     = "wavult"
  }

  lifecycle {
    ignore_changes = [ingress, egress]
  }
}

# Security Group for n8n EFS
resource "aws_security_group" "n8n_efs" {
  name        = "n8n-efs-sg"
  description = "EFS mount target security group for n8n"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [data.aws_security_group.ecs.id]
    description     = "NFS from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "n8n-efs-sg"
    Environment = var.environment
    Project     = "wavult"
  }

  lifecycle {
    ignore_changes = [ingress, egress]
  }
}
