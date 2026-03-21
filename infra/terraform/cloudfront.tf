locals {
  app_subdomains = {
    admin       = "admin.${var.domain}"
    workstation = "workstation.${var.domain}"
    crm         = "crm.${var.domain}"
    sales       = "sales.${var.domain}"
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  for_each = local.app_subdomains

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Hypbit ${each.key}"
  default_root_object = "index.html"
  aliases             = [each.value]
  price_class         = "PriceClass_100" # US, Canada, Europe (cheapest)

  origin {
    domain_name              = aws_s3_bucket.frontend[each.key].bucket_regional_domain_name
    origin_id                = "s3-${each.key}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend[each.key].id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${each.key}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # SPA routing: serve index.html for 403/404
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontends.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "hypbit-${each.key}-cf" }
}
