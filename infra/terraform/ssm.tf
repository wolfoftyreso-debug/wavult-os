# ── Supabase secrets ──────────────────────────────────────────────────────────
resource "aws_ssm_parameter" "supabase_url" {
  name        = "/hypbit/prod/SUPABASE_URL"
  description = "Supabase project URL"
  type        = "SecureString"
  value       = var.supabase_url != "" ? var.supabase_url : "PLACEHOLDER_SET_VIA_CI_OR_CONSOLE"

  lifecycle {
    ignore_changes = [value] # Managed externally after first apply
  }
}

resource "aws_ssm_parameter" "supabase_anon_key" {
  name        = "/hypbit/prod/SUPABASE_ANON_KEY"
  description = "Supabase anon (public) key"
  type        = "SecureString"
  value       = var.supabase_anon_key != "" ? var.supabase_anon_key : "PLACEHOLDER_SET_VIA_CI_OR_CONSOLE"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "supabase_service_role_key" {
  name        = "/hypbit/prod/SUPABASE_SERVICE_ROLE_KEY"
  description = "Supabase service role key (secret)"
  type        = "SecureString"
  value       = var.supabase_service_role_key != "" ? var.supabase_service_role_key : "PLACEHOLDER_SET_VIA_CI_OR_CONSOLE"

  lifecycle {
    ignore_changes = [value]
  }
}

# ── Optional additional secrets ────────────────────────────────────────────────
resource "aws_ssm_parameter" "cors_origin" {
  name        = "/hypbit/prod/CORS_ORIGIN"
  description = "Allowed CORS origins"
  type        = "String"
  value       = "https://${var.domain},https://admin.${var.domain},https://workstation.${var.domain},https://crm.${var.domain},https://sales.${var.domain}"
}
