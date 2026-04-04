# IAM — Roles and Policies for Wavult infrastructure

# ─── ECS TASK EXECUTION ROLE ─────────────────────────────────────────────────

resource "aws_iam_role" "ecs_task_execution" {
  name = "hypbit-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_ssm" {
  name = "ssm-secrets-access"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameters", "ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/wavult/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameters", "ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/hypbit/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
      }
    ]
  })
}

# ─── ECS TASK ROLE ────────────────────────────────────────────────────────────

resource "aws_iam_role" "ecs_task" {
  name = "hypbit-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::wavult-*",
          "arn:aws:s3:::wavult-*/*",
          "arn:aws:s3:::quixzoom-*",
          "arn:aws:s3:::quixzoom-*/*",
          "arn:aws:s3:::landvex-*",
          "arn:aws:s3:::landvex-*/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameters", "ssm:GetParameter", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/wavult/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:${var.aws_account_id}:log-group:/ecs/*"
      }
    ]
  })
}

# ─── GITEA TASK ROLE ──────────────────────────────────────────────────────────

resource "aws_iam_role" "wavult_gitea_task" {
  name = "wavult-gitea-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "gitea_task_ecr" {
  name = "ecr-access"
  role = aws_iam_role.wavult_gitea_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"]
      Resource = "*"
    }]
  })
}

# ─── LAMBDA ROLES ─────────────────────────────────────────────────────────────

resource "aws_iam_role" "wavult_lambda" {
  name = "wavult-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "wavult_lambda_basic" {
  role       = aws_iam_role.wavult_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "wavult_lambda_s3_ssm" {
  name = "s3-ssm-access"
  role = aws_iam_role.wavult_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = ["arn:aws:s3:::wavult-*", "arn:aws:s3:::wavult-*/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameters", "ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/wavult/*"
      }
    ]
  })
}

resource "aws_iam_role" "wavult_api_core_lambda" {
  name = "wavult-api-core-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "api_core_lambda_basic" {
  role       = aws_iam_role.wavult_api_core_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role" "wavult_financial_core_lambda" {
  name = "wavult-financial-core-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "financial_lambda_basic" {
  role       = aws_iam_role.wavult_financial_core_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ─── S3 REPLICATION ROLE ──────────────────────────────────────────────────────

resource "aws_iam_role" "wavult_s3_replication" {
  name = "wavult-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "wavult_s3_replication" {
  name = "s3-replication-policy"
  role = aws_iam_role.wavult_s3_replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetReplicationConfiguration", "s3:ListBucket"]
        Resource = ["arn:aws:s3:::wavult-images-*", "arn:aws:s3:::quixzoom-media-*", "arn:aws:s3:::landvex-*"]
      },
      {
        Effect = "Allow"
        Action = ["s3:GetObjectVersionForReplication", "s3:GetObjectVersionAcl", "s3:GetObjectVersionTagging"]
        Resource = [
          "arn:aws:s3:::wavult-images-*/*",
          "arn:aws:s3:::quixzoom-media-*/*",
          "arn:aws:s3:::landvex-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["s3:ReplicateObject", "s3:ReplicateDelete", "s3:ReplicateTags"]
        Resource = [
          "arn:aws:s3:::wavult-images-*/*",
          "arn:aws:s3:::quixzoom-media-*/*",
          "arn:aws:s3:::landvex-*/*"
        ]
      }
    ]
  })
}

# ─── CODEBUILD ROLE ───────────────────────────────────────────────────────────

resource "aws_iam_role" "hypbit_codebuild" {
  name = "hypbit-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })

  tags = {
    Project     = "wavult"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "hypbit_codebuild" {
  name = "codebuild-policy"
  role = aws_iam_role.hypbit_codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:*"]
        Resource = "arn:aws:ecr:${var.aws_region}:${var.aws_account_id}:repository/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:DescribeServices"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:GetObjectVersion"]
        Resource = "arn:aws:s3:::hypbit-codebuild-src-${var.aws_account_id}/*"
      }
    ]
  })
}
