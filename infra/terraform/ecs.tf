# ECS Cluster
resource "aws_ecs_cluster" "wavult" {
  name = "wavult"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "wavult"
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_cluster_capacity_providers" "wavult" {
  cluster_name = aws_ecs_cluster.wavult.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# ─── TASK DEFINITIONS ─────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "wavult_os_api" {
  family                   = "wavult-os-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = var.wavult_os_api_image
    essential = true
    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
    }]
    secrets = [
      { name = "DATABASE_URL", valueFrom = "/wavult/prod/WAVULT_OS_DB_URL" },
      { name = "OPENAI_API_KEY", valueFrom = "/wavult/prod/OPENAI_API_KEY" },
      { name = "ANTHROPIC_API_KEY", valueFrom = "/wavult/prod/ANTHROPIC_API_KEY" },
      { name = "REDIS_URL", valueFrom = "/wavult/prod/REDIS_URL" },
      { name = "KAFKA_BROKERS", valueFrom = "/wavult/prod/KAFKA_BROKERS" },
      { name = "STRIPE_SECRET_KEY", valueFrom = "/wavult/prod/STRIPE_SECRET_KEY" },
      { name = "ELEVENLABS_API_KEY", valueFrom = "/wavult/prod/ELEVENLABS_API_KEY" },
      { name = "GEMINI_API_KEY", valueFrom = "/wavult/prod/GEMINI_API_KEY" },
      { name = "PERPLEXITY_API_KEY", valueFrom = "/wavult/prod/PERPLEXITY_API_KEY" },
      { name = "FORTYSIX_ELKS_USERNAME", valueFrom = "/wavult/prod/FORTYSIX_ELKS_USERNAME" },
      { name = "FORTYSIX_ELKS_PASSWORD", valueFrom = "/wavult/prod/FORTYSIX_ELKS_PASSWORD" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/wavult-os-api"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "wavult_core" {
  family                   = "wavult-core"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "wavult-core"
    image     = var.wavult_core_image
    essential = true
    portMappings = [{
      containerPort = 3007
      protocol      = "tcp"
    }]
    secrets = [
      { name = "DATABASE_URL", valueFrom = "/wavult/prod/WAVULT_OS_DB_URL" },
      { name = "OPENAI_API_KEY", valueFrom = "/wavult/prod/OPENAI_API_KEY" },
      { name = "ANTHROPIC_API_KEY", valueFrom = "/wavult/prod/ANTHROPIC_API_KEY" },
      { name = "REDIS_URL", valueFrom = "/wavult/prod/REDIS_URL" },
      { name = "KAFKA_BROKERS", valueFrom = "/wavult/prod/KAFKA_BROKERS" },
      { name = "ELEVENLABS_API_KEY", valueFrom = "/wavult/prod/ELEVENLABS_API_KEY" },
      { name = "ELEVENLABS_VOICE_ID", valueFrom = "/wavult/prod/ELEVENLABS_VOICE_ID" },
      { name = "FORTYSIX_ELKS_USERNAME", valueFrom = "/wavult/prod/FORTYSIX_ELKS_USERNAME" },
      { name = "FORTYSIX_ELKS_PASSWORD", valueFrom = "/wavult/prod/FORTYSIX_ELKS_PASSWORD" },
      { name = "FORTYSIX_ELKS_NUMBER", valueFrom = "/wavult/prod/FORTYSIX_ELKS_NUMBER" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3007" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/wavult-core"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "identity_core" {
  family                   = "identity-core"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "identity-core"
    image     = var.identity_core_image
    essential = true
    portMappings = [{
      containerPort = 3005
      protocol      = "tcp"
    }]
    secrets = [
      { name = "DATABASE_URL", valueFrom = "/wavult/prod/RDS_HOST_ECS" },
      { name = "RDS_HOST", valueFrom = "/wavult/prod/RDS_HOST" },
      { name = "RDS_USER", valueFrom = "/wavult/prod/RDS_USER" },
      { name = "RDS_PASSWORD", valueFrom = "/wavult/prod/RDS_PASSWORD" },
      { name = "REDIS_URL", valueFrom = "/wavult/prod/REDIS_URL" },
      { name = "KAFKA_BROKERS", valueFrom = "/wavult/prod/KAFKA_BROKERS" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3005" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/identity-core"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "quixzoom_api" {
  family                   = "quixzoom-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "quixzoom-api"
    image     = var.quixzoom_api_image
    essential = true
    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
    }]
    secrets = [
      { name = "DATABASE_URL", valueFrom = "/wavult/prod/QUIXZOOM_DB_URL" },
      { name = "QUIXZOOM_DB_HOST", valueFrom = "/wavult/prod/QUIXZOOM_DB_HOST" },
      { name = "SUPABASE_URL", valueFrom = "/wavult/prod/QUIXZOOM_SUPABASE_URL" },
      { name = "SUPABASE_ANON_KEY", valueFrom = "/wavult/prod/QUIXZOOM_SUPABASE_KEY" },
      { name = "SUPABASE_SERVICE_KEY", valueFrom = "/wavult/prod/QUIXZOOM_SUPABASE_SERVICE_KEY" },
      { name = "KAFKA_BROKERS", valueFrom = "/wavult/prod/KAFKA_BROKERS" },
      { name = "OPENAI_API_KEY", valueFrom = "/wavult/prod/OPENAI_API_KEY" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/quixzoom-api"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "quixzoom"
  }
}

resource "aws_ecs_task_definition" "landvex_api" {
  family                   = "landvex-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "landvex-api"
    image     = var.landvex_api_image
    essential = true
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    secrets = [
      { name = "DATABASE_URL", valueFrom = "/wavult/prod/LANDVEX_DB_HOST" },
      { name = "KAFKA_BROKERS", valueFrom = "/wavult/prod/KAFKA_BROKERS" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/landvex-api"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "landvex"
  }
}

resource "aws_ecs_task_definition" "team_pulse" {
  family                   = "team-pulse"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "team-pulse"
    image     = var.team_pulse_image
    essential = true
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    secrets = [
      { name = "DATABASE_URL", valueFrom = "/wavult/prod/WAVULT_OS_DB_URL" },
      { name = "KAFKA_BROKERS", valueFrom = "/wavult/prod/KAFKA_BROKERS" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/team-pulse"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "bos_scheduler" {
  family                   = "bos-scheduler"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name         = "bos-scheduler"
    image        = var.bos_scheduler_image
    essential    = true
    portMappings = []
    secrets = [
      { name = "DATABASE_URL", valueFrom = "/wavult/prod/WAVULT_OS_DB_URL" },
      { name = "KAFKA_BROKERS", valueFrom = "/wavult/prod/KAFKA_BROKERS" }
    ]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/bos-scheduler"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "wavult_redis" {
  family                   = "wavult-redis"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "redis"
    image     = var.redis_image
    essential = true
    portMappings = [{
      containerPort = 6379
      protocol      = "tcp"
    }]
    environment = []
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/wavult-redis"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "wavult_kafka" {
  family                   = "wavult-kafka"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "kafka"
    image     = var.kafka_image
    essential = true
    portMappings = [
      { containerPort = 9092, protocol = "tcp" },
      { containerPort = 9093, protocol = "tcp" }
    ]
    environment = [
      { name = "KAFKA_CFG_NODE_ID", value = "0" },
      { name = "KAFKA_CFG_PROCESS_ROLES", value = "controller,broker" },
      { name = "KAFKA_CFG_LISTENERS", value = "PLAINTEXT://:9092,CONTROLLER://:9093" },
      { name = "KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP", value = "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT" },
      { name = "KAFKA_CFG_CONTROLLER_LISTENER_NAMES", value = "CONTROLLER" },
      { name = "KAFKA_CFG_CONTROLLER_QUORUM_VOTERS", value = "0@localhost:9093" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/wavult-kafka"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "n8n" {
  family                   = "n8n-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "n8n"
    image     = var.n8n_image
    essential = true
    portMappings = [{
      containerPort = 5678
      protocol      = "tcp"
    }]
    secrets = [
      { name = "DB_POSTGRESDB_PASSWORD", valueFrom = "/wavult/prod/RDS_PASSWORD" },
      { name = "DB_POSTGRESDB_USER", valueFrom = "/wavult/prod/RDS_USER" },
      { name = "DB_POSTGRESDB_HOST", valueFrom = "/wavult/prod/RDS_HOST" }
    ]
    environment = [
      { name = "N8N_HOST", value = "n8n.wavult.com" },
      { name = "N8N_PORT", value = "5678" },
      { name = "N8N_PROTOCOL", value = "https" },
      { name = "NODE_ENV", value = "production" },
      { name = "DB_TYPE", value = "postgresdb" },
      { name = "DB_POSTGRESDB_DATABASE", value = "n8n" }
    ]
    mountPoints = [{
      sourceVolume  = "n8n-data"
      containerPath = "/home/node/.n8n"
      readOnly      = false
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/n8n"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  volume {
    name = "n8n-data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.n8n.id
      transit_encryption = "ENABLED"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "gitea" {
  family                   = "gitea"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name      = "gitea"
    image     = var.gitea_image
    essential = true
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    secrets = [
      { name = "GITEA__database__PASSWD", valueFrom = "/wavult/prod/GITEA_DB_PASS" },
      { name = "GITEA__database__USER", valueFrom = "/wavult/prod/GITEA_DB_USER" },
      { name = "GITEA__database__HOST", valueFrom = "/wavult/prod/GITEA_DB_HOST" }
    ]
    environment = [
      { name = "GITEA__database__DB_TYPE", value = "postgres" },
      { name = "GITEA__database__NAME", value = "gitea" },
      { name = "GITEA__server__DOMAIN", value = "git.wavult.com" },
      { name = "GITEA__server__ROOT_URL", value = "https://git.wavult.com" },
      { name = "GITEA__server__HTTP_PORT", value = "3000" }
    ]
    mountPoints = [{
      sourceVolume  = "gitea-data"
      containerPath = "/data"
      readOnly      = false
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/gitea"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  volume {
    name = "gitea-data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.gitea.id
      transit_encryption = "ENABLED"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "gitea_runner" {
  family                   = "gitea-runner"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([{
    name         = "gitea-runner"
    image        = var.gitea_runner_image
    essential    = true
    portMappings = []
    environment = [
      { name = "GITEA_INSTANCE_URL", value = "https://git.wavult.com" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/gitea-runner"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

# ─── EFS FILE SYSTEMS ─────────────────────────────────────────────────────────

resource "aws_efs_file_system" "n8n" {
  creation_token = "n8n-efs"
  encrypted      = true

  tags = {
    Name        = "n8n-efs"
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_efs_mount_target" "n8n_a" {
  file_system_id  = aws_efs_file_system.n8n.id
  subnet_id       = var.private_subnet_a
  security_groups = [aws_security_group.n8n_efs.id]
}

resource "aws_efs_mount_target" "n8n_b" {
  file_system_id  = aws_efs_file_system.n8n.id
  subnet_id       = var.private_subnet_b
  security_groups = [aws_security_group.n8n_efs.id]
}

resource "aws_efs_file_system" "gitea" {
  creation_token = "gitea-efs"
  encrypted      = true

  tags = {
    Name        = "gitea-efs"
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_efs_mount_target" "gitea_a" {
  file_system_id  = aws_efs_file_system.gitea.id
  subnet_id       = var.private_subnet_a
  security_groups = [aws_security_group.gitea_efs.id]
}

resource "aws_efs_mount_target" "gitea_b" {
  file_system_id  = aws_efs_file_system.gitea.id
  subnet_id       = var.private_subnet_b
  security_groups = [aws_security_group.gitea_efs.id]
}

# ─── ECS SERVICES ─────────────────────────────────────────────────────────────

resource "aws_ecs_service" "wavult_os_api" {
  name            = "wavult-os-api"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.wavult_os_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.wavult_os_api.arn
    container_name   = "api"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "wavult_core" {
  name            = "wavult-core"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.wavult_core.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "identity_core" {
  name            = "identity-core"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.identity_core.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "quixzoom_api" {
  name            = "quixzoom-api"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.quixzoom_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.quixzoom.arn
    container_name   = "quixzoom-api"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "quixzoom"
  }
}

resource "aws_ecs_service" "landvex_api" {
  name            = "landvex-api"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.landvex_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "landvex"
  }
}

resource "aws_ecs_service" "team_pulse" {
  name            = "team-pulse"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.team_pulse.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "bos_scheduler" {
  name            = "bos-scheduler"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.bos_scheduler.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "wavult_redis" {
  name            = "wavult-redis"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.wavult_redis.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "wavult_kafka" {
  name            = "wavult-kafka"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.wavult_kafka.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.public_subnet_a]
    security_groups  = ["sg-06edb70914f5cf3bb", "sg-011d937e1b3f18392"]
    assign_public_ip = true
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "n8n" {
  name            = "n8n"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.n8n.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.n8n.arn
    container_name   = "n8n"
    container_port   = 5678
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "gitea" {
  name            = "gitea"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.gitea.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gitea.arn
    container_name   = "gitea"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "gitea_runner" {
  name            = "gitea-runner"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.gitea_runner.arn
  desired_count   = 0
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_subnet_a, var.private_subnet_b]
    security_groups  = [data.aws_security_group.ecs.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_service" "supabase" {
  name            = "supabase"
  cluster         = aws_ecs_cluster.wavult.id
  task_definition = aws_ecs_task_definition.supabase.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.public_subnet_a, var.public_subnet_b]
    security_groups  = [data.aws_security_group.supabase_alb.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.supabase.arn
    container_name   = "kong"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.supabase]

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_ecs_task_definition" "supabase" {
  family                   = "supabase-stack"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_execution_role_arn

  container_definitions = jsonencode([
    {
      name         = "kong"
      image        = var.supabase_kong_image
      essential    = true
      portMappings = [{ containerPort = 8000, protocol = "tcp" }]
      secrets = [
        { name = "SUPABASE_ANON_KEY", valueFrom = "/wavult/supabase/self/anon_key" },
        { name = "SUPABASE_SERVICE_KEY", valueFrom = "/wavult/supabase/self/service_key" }
      ]
      environment = [
        { name = "KONG_DATABASE", value = "off" },
        { name = "KONG_DECLARATIVE_CONFIG", value = "/var/lib/kong/kong.yml" },
        { name = "KONG_DNS_ORDER", value = "LAST,A,CNAME" },
        { name = "KONG_PLUGINS", value = "request-transformer,cors,key-auth,acl" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/supabase-kong"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}
