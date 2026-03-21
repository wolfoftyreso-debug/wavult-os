data "aws_route53_zone" "main" {
  name         = var.domain
  private_zone = false
}

# ── API record → ALB ──────────────────────────────────────────────────────────
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${var.api_subdomain}.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

# ── Frontend records → CloudFront ─────────────────────────────────────────────
resource "aws_route53_record" "frontend" {
  for_each = local.app_subdomains

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend[each.key].domain_name
    zone_id                = aws_cloudfront_distribution.frontend[each.key].hosted_zone_id
    evaluate_target_health = false
  }
}

# ── AAAA (IPv6) records for CloudFront frontends ──────────────────────────────
resource "aws_route53_record" "frontend_aaaa" {
  for_each = local.app_subdomains

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.frontend[each.key].domain_name
    zone_id                = aws_cloudfront_distribution.frontend[each.key].hosted_zone_id
    evaluate_target_health = false
  }
}
