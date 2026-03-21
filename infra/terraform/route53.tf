# ============================================================
# Cloudflare DNS — pixdrift.com
# Zone ID: 7fa7c28b0748ded5b4d48f06eae6faec
# ============================================================

data "cloudflare_zone" "main" {
  zone_id = "7fa7c28b0748ded5b4d48f06eae6faec"
}

locals {
  api_fqdn     = "api.${var.product_prefix}.${var.domain}"
  product_fqdn = "${var.product_prefix}.${var.domain}"
}

# API → ALB
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.main.zone_id
  name    = local.api_fqdn
  type    = "CNAME"
  content = aws_lb.api.dns_name
  proxied = false
  ttl     = 60
}

# Frontend-subdomäner → CloudFront
resource "cloudflare_record" "frontends" {
  for_each = local.frontends
  zone_id  = data.cloudflare_zone.main.zone_id
  name     = each.value
  type     = "CNAME"
  content  = aws_cloudfront_distribution.frontends[each.key].domain_name
  proxied  = false
  ttl      = 60
}

# pixdrift.com root → workstation CloudFront
resource "cloudflare_record" "product_root" {
  zone_id = data.cloudflare_zone.main.zone_id
  name    = local.product_fqdn
  type    = "CNAME"
  content = aws_cloudfront_distribution.frontends["workstation"].domain_name
  proxied = false
  ttl     = 60
}
