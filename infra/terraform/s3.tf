locals {
  frontend_apps = ["admin", "workstation", "crm", "sales"]
}

# ── S3 buckets for each frontend app ─────────────────────────────────────────
resource "aws_s3_bucket" "frontend" {
  for_each = toset(local.frontend_apps)

  bucket = "${each.key}.${var.domain}"

  tags = { Name = "hypbit-${each.key}" }
}

resource "aws_s3_bucket_versioning" "frontend" {
  for_each = aws_s3_bucket.frontend

  bucket = each.value.id
  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  for_each = aws_s3_bucket.frontend

  bucket = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  for_each = aws_s3_bucket.frontend

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  for_each = aws_s3_bucket.frontend

  bucket = each.value.id

  index_document { suffix = "index.html" }
  error_document { key = "index.html" } # SPA fallback
}

# ── Origin Access Control for CloudFront → S3 ────────────────────────────────
resource "aws_cloudfront_origin_access_control" "frontend" {
  for_each = toset(local.frontend_apps)

  name                              = "hypbit-${each.key}-oac"
  description                       = "OAC for hypbit ${each.key}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── Bucket policies to allow only CloudFront ──────────────────────────────────
resource "aws_s3_bucket_policy" "frontend" {
  for_each = aws_s3_bucket.frontend

  bucket = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action   = "s3:GetObject"
        Resource = "${each.value.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend[each.key].arn
          }
        }
      }
    ]
  })

  depends_on = [aws_cloudfront_distribution.frontend]
}
