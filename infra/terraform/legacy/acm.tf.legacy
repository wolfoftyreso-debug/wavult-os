# ============================================================
# ACM SSL-certifikat
# CloudFront kräver certifikat i us-east-1
# ALB använder certifikat i eu-north-1
# Certifikat för pixdrift.com valideras via Cloudflare DNS
# ============================================================

# *.bc.pixdrift.com certifikat för CloudFront (us-east-1)
# Skapat och validerat via Cloudflare DNS — ARN refereras direkt
locals {
  cloudfront_cert_arn = "arn:aws:acm:us-east-1:155407238699:certificate/c8a53d01-cbb4-420e-a76d-5a0147cc4344"
}

# DNS-validering för CloudFront-certifikatet (läggs till manuellt via Cloudflare)
# CNAME: _fd55bd1e9505830495bbc84413eef166.bc.pixdrift.com
#      → _0cc4235c69db4f9b7e1b07b08fa91ac9.jkddzztszm.acm-validations.aws.
# (Tillagd i Cloudflare redan)

# Certifikat för ALB i eu-north-1
resource "aws_acm_certificate" "alb" {
  domain_name       = "api.${var.product_prefix}.${var.domain}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS-validering för ALB-certifikatet via Cloudflare
resource "cloudflare_record" "cert_validation_alb" {
  for_each = {
    for dvo in aws_acm_certificate.alb.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.cloudflare_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  content = each.value.record
  ttl     = 60
  proxied = false
}

resource "aws_acm_certificate_validation" "alb" {
  certificate_arn         = aws_acm_certificate.alb.arn
  validation_record_fqdns = [for record in cloudflare_record.cert_validation_alb : record.hostname]
}
