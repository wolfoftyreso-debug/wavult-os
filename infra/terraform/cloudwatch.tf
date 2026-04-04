# CloudWatch Log Groups — all ECS services + Lambda functions

locals {
  ecs_log_groups = [
    "/ecs/bos-scheduler",
    "/ecs/gitea",
    "/ecs/gitea-runner",
    "/ecs/identity-core",
    "/ecs/landvex-api",
    "/ecs/n8n",
    "/ecs/quixzoom-api",
    "/ecs/supabase-auth",
    "/ecs/supabase-kong",
    "/ecs/supabase-rest",
    "/ecs/supabase-studio",
    "/ecs/team-pulse",
    "/ecs/wavult-core",
    "/ecs/wavult-kafka",
    "/ecs/wavult-mail-server",
    "/ecs/wavult-os-api",
    "/ecs/wavult-redis",
  ]

  lambda_log_groups = [
    "/aws/lambda/wavult-api-core",
    "/aws/lambda/wavult-invoice-upload",
    "/aws/lambda/wavult-mail-router",
    "/aws/lambda/wolvold-media-ingest",
  ]
}

resource "aws_cloudwatch_log_group" "ecs" {
  for_each          = toset(local.ecs_log_groups)
  name              = each.value
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = toset(local.lambda_log_groups)
  name              = each.value
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_cloudwatch_log_group" "ecs_insights_wavult" {
  name              = "/aws/ecs/containerinsights/wavult/performance"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_cloudwatch_log_group" "ecs_insights_hypbit" {
  name              = "/aws/ecs/containerinsights/hypbit/performance"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

# ─── ALARMS ───────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "wavult-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS cluster CPU > 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "wavult"
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "wavult-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU > 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = "wavult-identity-ecs"
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "wavult-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5XX errors > 10/min"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = "app/wavult-api-alb/4a43ac00421d43ab"
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }
}
