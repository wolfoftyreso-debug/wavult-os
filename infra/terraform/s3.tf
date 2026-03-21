# ============================================================
# S3 — Statisk hosting för 4 frontend-appar
# ============================================================

locals {
  frontends = {
    workstation = "app.${var.product_prefix}.${var.domain}"
    admin       = "admin.${var.product_prefix}.${var.domain}"
    crm         = "crm.${var.product_prefix}.${var.domain}"
    sales       = "sales.${var.product_prefix}.${var.domain}"
  }
}

resource "aws_s3_bucket" "frontend" {
  for_each = local.frontends
  bucket   = "pixdrift-bc-${each.key}-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  for_each = local.frontends
  bucket   = aws_s3_bucket.frontend[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  for_each = local.frontends
  bucket   = aws_s3_bucket.frontend[each.key].id
  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "frontend" {
  for_each                          = local.frontends
  name                              = "pixdrift-bc-${each.key}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy — tillåt CloudFront att läsa
resource "aws_s3_bucket_policy" "frontend" {
  for_each = local.frontends
  bucket   = aws_s3_bucket.frontend[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFront"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.frontend[each.key].arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontends[each.key].arn
        }
      }
    }]
  })
}
