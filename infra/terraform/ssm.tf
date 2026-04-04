# SSM Parameter Store — Placeholders for all Wavult secrets
# Values are managed externally (not via Terraform) to avoid secrets in state.
# Use: aws ssm put-parameter to set actual values.

# ─── WAVULT PROD ──────────────────────────────────────────────────────────────

resource "aws_ssm_parameter" "wavult_prod" {
  for_each = {
    "ANTHROPIC_API_KEY"             = "Anthropic API key for Claude"
    "OPENAI_API_KEY"                = "OpenAI API key"
    "GEMINI_API_KEY"                = "Google Gemini API key"
    "ELEVENLABS_API_KEY"            = "ElevenLabs TTS API key"
    "ELEVENLABS_VOICE_ID"           = "ElevenLabs voice ID"
    "PERPLEXITY_API_KEY"            = "Perplexity AI API key"
    "DEEPSEEK_API_KEY"              = "DeepSeek API key"
    "GROK_API_KEY"                  = "Grok/xAI API key"
    "GROQ_API_KEY"                  = "Groq API key"
    "NVIDIA_API_KEY"                = "NVIDIA API key"
    "STRIPE_SECRET_KEY"             = "Stripe secret key"
    "STRIPE_PUBLISHABLE_KEY"        = "Stripe publishable key"
    "STRIPE_WEBHOOK_SECRET"         = "Stripe webhook signing secret"
    "WAVULT_OS_DB_URL"              = "Wavult OS database connection URL"
    "RDS_HOST"                      = "RDS host (wavult-identity-core)"
    "RDS_HOST_ECS"                  = "RDS host for ECS (wavult-identity-ecs)"
    "RDS_USER"                      = "RDS master username"
    "RDS_PASSWORD"                  = "RDS master password"
    "REDIS_URL"                     = "Redis connection URL (internal)"
    "KAFKA_BROKERS"                 = "Kafka broker addresses"
    "KAFKA_INTERNAL_BROKER"         = "Kafka internal broker address"
    "FORTYSIX_ELKS_USERNAME"        = "46elks API username"
    "FORTYSIX_ELKS_PASSWORD"        = "46elks API password"
    "FORTYSIX_ELKS_NUMBER"          = "46elks phone number"
    "GITHUB_TOKEN"                  = "GitHub personal access token"
    "GITHUB_CLIENT_ID"              = "GitHub OAuth client ID"
    "GITHUB_CLIENT_SECRET"          = "GitHub OAuth client secret"
    "GOOGLE_CLIENT_ID"              = "Google OAuth client ID"
    "GOOGLE_CLIENT_SECRET"          = "Google OAuth client secret"
    "MICROSOFT_CLIENT_ID"           = "Microsoft/Entra OAuth client ID"
    "MICROSOFT_CLIENT_SECRET"       = "Microsoft/Entra OAuth client secret"
    "DISCORD_CLIENT_ID"             = "Discord OAuth client ID"
    "DISCORD_CLIENT_SECRET"         = "Discord OAuth client secret"
    "SLACK_CLIENT_ID"               = "Slack OAuth client ID"
    "SLACK_CLIENT_SECRET"           = "Slack OAuth client secret"
    "LINKEDIN_CLIENT_ID"            = "LinkedIn OAuth client ID"
    "LINKEDIN_CLIENT_SECRET"        = "LinkedIn OAuth client secret"
    "TWITTER_CLIENT_ID"             = "Twitter OAuth client ID"
    "TWITTER_CLIENT_SECRET"         = "Twitter OAuth client secret"
    "FACEBOOK_CLIENT_ID"            = "Facebook OAuth client ID"
    "FACEBOOK_CLIENT_SECRET"        = "Facebook OAuth client secret"
    "TWITCH_CLIENT_ID"              = "Twitch OAuth client ID"
    "TWITCH_CLIENT_SECRET"          = "Twitch OAuth client secret"
    "ATLASSIAN_CLIENT_ID"           = "Atlassian OAuth client ID"
    "ATLASSIAN_CLIENT_SECRET"       = "Atlassian OAuth client secret"
    "NOTION_CLIENT_ID"              = "Notion OAuth client ID"
    "NOTION_CLIENT_SECRET"          = "Notion OAuth client secret"
    "FIGMA_CLIENT_ID"               = "Figma OAuth client ID"
    "FIGMA_CLIENT_SECRET"           = "Figma OAuth client secret"
    "GITLAB_CLIENT_ID"              = "GitLab OAuth client ID"
    "GITLAB_CLIENT_SECRET"          = "GitLab OAuth client secret"
    "BITBUCKET_CLIENT_ID"           = "Bitbucket OAuth client ID"
    "BITBUCKET_CLIENT_SECRET"       = "Bitbucket OAuth client secret"
    "OKTA_CLIENT_ID"                = "Okta OAuth client ID"
    "OKTA_CLIENT_SECRET"            = "Okta OAuth client secret"
    "OKTA_DOMAIN"                   = "Okta domain"
    "DIGITALOCEAN_CLIENT_ID"        = "DigitalOcean OAuth client ID"
    "DIGITALOCEAN_CLIENT_SECRET"    = "DigitalOcean OAuth client secret"
    "UBER_APP_ID"                   = "Uber app ID"
    "UBER_CLIENT_SECRET"            = "Uber client secret"
    "RESEND_API_KEY"                = "Resend email API key"
    "MAPBOX_PUBLIC_TOKEN"           = "Mapbox public access token"
    "PEXELS_API_KEY"                = "Pexels stock media API key"
    "COVERR_API_KEY"                = "Coverr video API key"
    "COVERR_APP_ID"                 = "Coverr app ID"
    "SHOTSTACK_PRODUCTION_KEY"      = "Shotstack video production API key"
    "SHOTSTACK_SANDBOX_KEY"         = "Shotstack video sandbox API key"
    "TELEGRAM_BOT_TOKEN"            = "Telegram bot token"
    "TELEGRAM_BOT_USERNAME"         = "Telegram bot username"
    "TWILIO_ACCOUNT_SID"            = "Twilio account SID"
    "TWILIO_AUTH_TOKEN"             = "Twilio auth token"
    "REVOLUT_CLIENT_ID"             = "Revolut OAuth client ID"
    "REVOLUT_REFRESH_TOKEN"         = "Revolut refresh token"
    "REVOLUT_PRIVATE_KEY"           = "Revolut private key"
    "GANDI_API_TOKEN"               = "Gandi domain API token"
    "NAMECHEAP_USERNAME"            = "Namecheap API username"
    "NAMECHEAP_API_KEY"             = "Namecheap API key"
    "VERCEL_TOKEN"                  = "Vercel deployment token"
    "APOLLO_API_KEY"                = "Apollo.io API key"
    "DUFFEL_ACCESS_TOKEN"           = "Duffel flights API token"
    "DID_API_KEY"                   = "D-ID video API key"
    "DUIX_API_TOKEN"                = "DUIX API token"
    "DUIX_APP_ID"                   = "DUIX app ID"
    "DUIX_ENDPOINT"                 = "DUIX API endpoint"
    "GMAIL_APP_PASSWORD"            = "Gmail app password for SMTP"
    "BANKSIGN_API_USER"             = "BankSign API user"
    "BANKSIGN_PASSWORD"             = "BankSign API password"
    "BANKSIGN_COMPANY_GUID"         = "BankSign company GUID"
    "WAVULT_API_KEY"                = "Internal Wavult API key"
    "API_CORE_ENDPOINT"             = "Wavult API core endpoint URL"
    "API_CORE_ID"                   = "Wavult API core service ID"
    "QUIXZOOM_DB_HOST"              = "QuixZoom database host"
    "QUIXZOOM_DB_URL"               = "QuixZoom database connection URL"
    "QUIXZOOM_DB_SCHEMA"            = "QuixZoom database schema"
    "QUIXZOOM_SUPABASE_URL"         = "QuixZoom Supabase URL"
    "QUIXZOOM_SUPABASE_KEY"         = "QuixZoom Supabase anon key"
    "QUIXZOOM_SUPABASE_SERVICE_KEY" = "QuixZoom Supabase service key"
    "LANDVEX_DB_HOST"               = "Landvex database host"
    "GITEA_DB_HOST"                 = "Gitea database host"
    "GITEA_DB_USER"                 = "Gitea database username"
    "GITEA_DB_PASS"                 = "Gitea database password"
    "EOS_DATABASE_URL"              = "EOS migration database URL"
  }

  name        = "/wavult/prod/${each.key}"
  type        = "SecureString"
  value       = "PLACEHOLDER_SET_VIA_AWS_CLI"
  description = each.value
  overwrite   = false

  tags = {
    Environment = var.environment
    Project     = "wavult"
    ManagedBy   = "terraform-placeholder"
  }

  lifecycle {
    # Never overwrite existing values — only create if missing
    ignore_changes = [value]
  }
}

# ─── WAVULT SUPABASE ──────────────────────────────────────────────────────────

resource "aws_ssm_parameter" "supabase_self" {
  for_each = {
    "url"                = "Self-hosted Supabase URL"
    "service_key"        = "Supabase service role key"
    "anon_key"           = "Supabase anonymous key"
    "jwt_secret"         = "Supabase JWT secret"
    "postgres_password"  = "Supabase Postgres password"
    "dashboard_password" = "Supabase dashboard password"
  }

  name        = "/wavult/supabase/self/${each.key}"
  type        = "SecureString"
  value       = "PLACEHOLDER_SET_VIA_AWS_CLI"
  description = each.value
  overwrite   = false

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

# ─── WAVULT CORE / BERNT ──────────────────────────────────────────────────────

resource "aws_ssm_parameter" "wavult_core" {
  for_each = {
    "anthropic-api-key"  = "Anthropic API key for Bernt"
    "openai-api-key"     = "OpenAI API key for Bernt"
    "gemini-api-key"     = "Gemini API key for Bernt"
    "elevenlabs-api-key" = "ElevenLabs API key for Bernt"
    "perplexity-api-key" = "Perplexity API key for Bernt"
    "nvidia-api-key"     = "NVIDIA API key for Bernt"
    "image-provider"     = "Image generation provider"
    "46elks-username"    = "46elks username for voice"
    "46elks-password"    = "46elks password for voice"
  }

  name        = "/wavult/core/${each.key}"
  type        = "SecureString"
  value       = "PLACEHOLDER_SET_VIA_AWS_CLI"
  description = each.value
  overwrite   = false

  tags = {
    Environment = var.environment
    Project     = "wavult"
  }

  lifecycle {
    ignore_changes = [value]
  }
}
