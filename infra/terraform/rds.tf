# RDS — PostgreSQL Instances
# Two RDS instances: wavult-identity-core and wavult-identity-ecs

# DB Subnet Groups
resource "aws_db_subnet_group" "identity_core" {
  name       = "wavult-identity-core"
  subnet_ids = [var.private_subnet_a, var.private_subnet_b]

  tags = {
    Name        = "wavult-identity-core"
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_db_subnet_group" "identity_ecs" {
  name       = "wavult-identity-ecs-vpc"
  subnet_ids = [var.private_subnet_a, var.private_subnet_b]

  tags = {
    Name        = "wavult-identity-ecs-vpc"
    Environment = var.environment
    Project     = "wavult"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "wavult-rds-sg"
  description = "Allow PostgreSQL from ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [data.aws_security_group.ecs.id]
    description     = "PostgreSQL from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "wavult-rds-sg"
    Environment = var.environment
    Project     = "wavult"
  }
}

# RDS: wavult-identity-core (Multi-AZ PostgreSQL 16.6)
resource "aws_db_instance" "identity_core" {
  identifier                   = "wavult-identity-core"
  engine                       = "postgres"
  engine_version               = "16.6"
  instance_class               = "db.t4g.micro"
  allocated_storage            = 20
  max_allocated_storage        = 100
  storage_type                 = "gp2"
  storage_encrypted            = true
  username                     = var.rds_master_username
  password                     = var.rds_master_password
  db_name                      = "identity"
  multi_az                     = true
  publicly_accessible          = false
  deletion_protection          = true
  skip_final_snapshot          = false
  final_snapshot_identifier    = "wavult-identity-core-final"
  backup_retention_period      = 7
  backup_window                = "03:00-04:00"
  maintenance_window           = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade   = true
  db_subnet_group_name         = aws_db_subnet_group.identity_core.name
  vpc_security_group_ids       = [aws_security_group.rds.id]
  performance_insights_enabled = true

  tags = {
    Name        = "wavult-identity-core"
    Environment = var.environment
    Project     = "wavult"
  }

  lifecycle {
    ignore_changes = [password, engine_version]
  }
}

# RDS: wavult-identity-ecs (Multi-AZ PostgreSQL 16.6)
resource "aws_db_instance" "identity_ecs" {
  identifier                   = "wavult-identity-ecs"
  engine                       = "postgres"
  engine_version               = "16.6"
  instance_class               = "db.t4g.micro"
  allocated_storage            = 20
  max_allocated_storage        = 100
  storage_type                 = "gp2"
  storage_encrypted            = true
  username                     = var.rds_master_username
  password                     = var.rds_master_password
  db_name                      = "wavult"
  multi_az                     = true
  publicly_accessible          = false
  deletion_protection          = true
  skip_final_snapshot          = false
  final_snapshot_identifier    = "wavult-identity-ecs-final"
  backup_retention_period      = 7
  backup_window                = "03:00-04:00"
  maintenance_window           = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade   = true
  db_subnet_group_name         = aws_db_subnet_group.identity_ecs.name
  vpc_security_group_ids       = [aws_security_group.rds.id]
  performance_insights_enabled = true

  tags = {
    Name        = "wavult-identity-ecs"
    Environment = var.environment
    Project     = "wavult"
  }

  lifecycle {
    ignore_changes = [password, engine_version]
  }
}
