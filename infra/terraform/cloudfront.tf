# CloudFront Distributions
# 19 distributions inventoried — managed via data sources (existing)
# New distributions should be added as resources below.

# ─── DATA SOURCES (existing distributions) ────────────────────────────────────

data "aws_cloudfront_distribution" "wavult_com" {
  id = "E281H61AW2WQOH" # wavult.com, www.wavult.com
}

data "aws_cloudfront_distribution" "wavult_group_web" {
  id = "E2JOYHG1LYOXGM" # hypbit.com, www.hypbit.com, brief.wavult.com
}

data "aws_cloudfront_distribution" "app_hypbit" {
  id = "E2Z3B93KJXH71F" # app.hypbit.com
}

data "aws_cloudfront_distribution" "quixzoom_app" {
  id = "E2QUO7HIHWWP18" # app.quixzoom.com
}

data "aws_cloudfront_distribution" "quixzoom_landing" {
  id = "EE30B9WM5ZYM7" # quixzoom.com, www.quixzoom.com
}

data "aws_cloudfront_distribution" "git_wavult" {
  id = "E1YSFJFNQ5QH94" # git.wavult.com
}

data "aws_cloudfront_distribution" "landvex" {
  id = "E2M3J95HLUR89H" # landvex.com, www.landvex.com
}

data "aws_cloudfront_distribution" "pixdrift_landing" {
  id = "E2CZK80C8S8JPF" # pixdrift.com, www.pixdrift.com
}

data "aws_cloudfront_distribution" "pixdrift_sales" {
  id = "E1R5ZQK0FQYN5D" # sales.bc.pixdrift.com
}

data "aws_cloudfront_distribution" "pixdrift_admin" {
  id = "EN6V1PLNRWZV" # admin.bc.pixdrift.com
}

data "aws_cloudfront_distribution" "pixdrift_crm" {
  id = "E2P38O4WNORKE9" # crm.bc.pixdrift.com
}

data "aws_cloudfront_distribution" "pixdrift_app" {
  id = "E30M5LZSQ7FMEZ" # app.bc.pixdrift.com
}

data "aws_cloudfront_distribution" "pixdrift_developers" {
  id = "EC7A2RM42H14M" # developers.pixdrift.com
}

data "aws_cloudfront_distribution" "pixdrift_press" {
  id = "E1HICRMY8BLBZC" # press.pixdrift.com
}

data "aws_cloudfront_distribution" "pixdrift_status" {
  id = "EGHB0CHLK9CDI" # status.pixdrift.com
}

# ─── WAVULT.COM — Production CloudFront ───────────────────────────────────────
# Main wavult.com distribution — references S3 bucket wavult-group-web

resource "aws_cloudfront_origin_access_control" "wavult_group_web" {
  name                              = "wavult-group-web-oac"
  description                       = "OAC for wavult-group-web S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# OAC for quixzoom app
resource "aws_cloudfront_origin_access_control" "quixzoom_app" {
  name                              = "quixzoom-app-oac"
  description                       = "OAC for quixzoom-app-prod S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Cache policies
resource "aws_cloudfront_cache_policy" "wavult_spa" {
  name        = "wavult-spa-cache"
  comment     = "Cache policy for Wavult SPA apps"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}
