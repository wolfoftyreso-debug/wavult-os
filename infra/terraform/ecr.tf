# ECR Repositories
# 14 repositories inventoried: quixzoom-api, team-pulse, eos-migration, bos-scheduler,
# identity-core, wic-api, wavult-core, wavult-os-api, wavult-mail-server,
# gitea-act-runner, gitea, hypbit/api, landvex-api, company-automation

locals {
  ecr_repos = [
    "wavult-os-api",
    "wavult-core",
    "identity-core",
    "quixzoom-api",
    "landvex-api",
    "team-pulse",
    "bos-scheduler",
    "gitea-act-runner",
    "wavult-mail-server",
    "wic-api",
    "company-automation",
    "eos-migration",
    "hypbit/api",
    "gitea"
  ]
}

resource "aws_ecr_repository" "repos" {
  for_each = toset(local.ecr_repos)

  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [name]
  }
}

# Lifecycle policy: keep last 10 tagged images, remove untagged after 1 day
resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "latest", "prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
