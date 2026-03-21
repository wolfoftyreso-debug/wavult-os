# ============================================================
# Cloudflare DNS — pixdrift.com
# Zone ID: 7fa7c28b0748ded5b4d48f06eae6faec
# ============================================================

data "cloudflare_zone" "main" {
  zone_id = "7fa7c28b0748ded5b4d48f06eae6faec"
}

locals {
  api_fqdn = "api.${var.product_prefix}.${var.domain}"
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

# Frontend-subdomäner (app/admin/crm/sales) → CloudFront
resource "cloudflare_record" "frontends" {
  for_each = local.frontends
  zone_id  = data.cloudflare_zone.main.zone_id
  name     = each.value
  type     = "CNAME"
  content  = aws_cloudfront_distribution.frontends[each.key].domain_name
  proxied  = false
  ttl      = 60
}

# pixdrift.com → Landing CloudFront (E2CZK80C8S8JPF)
# VIKTIGT: apex-domänen ska peka på landningssidan, INTE workstation-appen
resource "cloudflare_record" "apex" {
  zone_id = data.cloudflare_zone.main.zone_id
  name    = var.domain
  type    = "CNAME"
  content = aws_cloudfront_distribution.landing.domain_name
  proxied = false
  ttl     = 60
}

# www.pixdrift.com → Landing CloudFront
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.main.zone_id
  name    = "www.${var.domain}"
  type    = "CNAME"
  content = aws_cloudfront_distribution.landing.domain_name
  proxied = false
  ttl     = 60
}
