# ── ACM certificate for API (ALB — eu-north-1) ────────────────────────────────
resource "aws_acm_certificate" "api" {
  domain_name               = "${var.api_subdomain}.${var.domain}"
  validation_method         = "DNS"
  subject_alternative_names = ["${var.api_subdomain}.${var.domain}"]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# ── ACM certificate for CloudFront frontends (MUST be in us-east-1) ────────────
resource "aws_acm_certificate" "frontends" {
  provider = aws.us_east_1

  domain_name = var.domain
  subject_alternative_names = [
    "*.${var.domain}",
    "workstation.${var.domain}",
    "admin.${var.domain}",
    "crm.${var.domain}",
    "sales.${var.domain}",
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "frontend_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontends.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "frontends" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontends.arn
  validation_record_fqdns = [for record in aws_route53_record.frontend_cert_validation : record.fqdn]
}
