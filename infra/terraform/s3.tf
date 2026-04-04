# S3 Buckets — 38 buckets inventoried
# Groups: wavult-core, images (primary/DR), quixzoom, hypbit/pixdrift (legacy), landvex, ops

locals {
  # Buckets with versioning enabled
  versioned_buckets = [
    "wavult-images-eu-primary",
    "wavult-images-us-primary",
    "wavult-raw-archive",
    "wavult-receipts",
    "wavult-assets",
    "wavult-mail-store",
    "wavult-build-artifacts-155407238699",
    "wavult-terraform-state",
    "quixzoom-media-prod",
    "landvex-prod",
    "optical-insight-prod"
  ]
}

# Helper: standard bucket resource with encryption, versioning, public block
# Each bucket is defined individually to allow per-bucket customization

# ─── WAVULT CORE BUCKETS ──────────────────────────────────────────────────────

resource "aws_s3_bucket" "wavult_assets" {
  bucket = "wavult-assets"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "wavult_build_artifacts" {
  bucket = "wavult-build-artifacts-155407238699"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "wavult_group_web" {
  bucket = "wavult-group-web"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "wavult_mail_store" {
  bucket = "wavult-mail-store"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "wavult_ops_dashboard" {
  bucket = "wavult-ops-dashboard"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "wavult_ops_dashboard_dr" {
  bucket   = "wavult-ops-dashboard-dr-eu-west"
  provider = aws
  tags     = { Project = "wavult", Environment = var.environment, Role = "dr" }
}

resource "aws_s3_bucket" "wavult_raw_archive" {
  bucket = "wavult-raw-archive"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "wavult_receipts" {
  bucket = "wavult-receipts"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "wavult_receipts_dr" {
  bucket = "wavult-receipts-dr-eu-west"
  tags   = { Project = "wavult", Environment = var.environment, Role = "dr" }
}

# ─── WAVULT IMAGE BUCKETS (multi-region) ──────────────────────────────────────

resource "aws_s3_bucket" "wavult_images_eu_primary" {
  bucket = "wavult-images-eu-primary"
  tags   = { Project = "wavult", Environment = var.environment, Role = "primary" }
}

resource "aws_s3_bucket" "wavult_images_eu_backup" {
  bucket = "wavult-images-eu-backup"
  tags   = { Project = "wavult", Environment = var.environment, Role = "backup" }
}

resource "aws_s3_bucket" "wavult_images_us_primary" {
  bucket = "wavult-images-us-primary"
  tags   = { Project = "wavult", Environment = var.environment, Role = "primary" }
}

resource "aws_s3_bucket" "wavult_images_us_backup" {
  bucket = "wavult-images-us-backup"
  tags   = { Project = "wavult", Environment = var.environment, Role = "backup" }
}

# ─── QUIXZOOM BUCKETS ─────────────────────────────────────────────────────────

resource "aws_s3_bucket" "quixzoom_app_prod" {
  bucket = "quixzoom-app-prod"
  tags   = { Project = "quixzoom", Environment = var.environment }
}

resource "aws_s3_bucket" "quixzoom_landing_prod" {
  bucket = "quixzoom-landing-prod"
  tags   = { Project = "quixzoom", Environment = var.environment }
}

resource "aws_s3_bucket" "quixzoom_media_prod" {
  bucket = "quixzoom-media-prod"
  tags   = { Project = "quixzoom", Environment = var.environment }
}

resource "aws_s3_bucket" "quixzoom_media_prod_dr" {
  bucket = "quixzoom-media-prod-dr-eu-west"
  tags   = { Project = "quixzoom", Environment = var.environment, Role = "dr" }
}

# ─── LANDVEX BUCKETS ──────────────────────────────────────────────────────────

resource "aws_s3_bucket" "landvex_prod" {
  bucket = "landvex-prod"
  tags   = { Project = "landvex", Environment = var.environment }
}

resource "aws_s3_bucket" "landvex_prod_dr" {
  bucket = "landvex-prod-dr-eu-west"
  tags   = { Project = "landvex", Environment = var.environment, Role = "dr" }
}

# ─── OPTICAL INSIGHT ──────────────────────────────────────────────────────────

resource "aws_s3_bucket" "optical_insight_prod" {
  bucket = "optical-insight-prod"
  tags   = { Project = "optical-insight", Environment = var.environment }
}

resource "aws_s3_bucket" "mlcs_prod" {
  bucket = "mlcs-prod"
  tags   = { Project = "wavult", Environment = var.environment }
}

# ─── LEGACY / HYPBIT / PIXDRIFT ───────────────────────────────────────────────

resource "aws_s3_bucket" "hypbit_codebuild_src" {
  bucket = "hypbit-codebuild-src-155407238699"
  tags   = { Project = "hypbit", Environment = var.environment }
}

resource "aws_s3_bucket" "hypbit_landing_prod" {
  bucket = "hypbit-landing-prod"
  tags   = { Project = "hypbit", Environment = var.environment }
}

resource "aws_s3_bucket" "hypbit_morning_brief" {
  bucket = "hypbit-morning-brief"
  tags   = { Project = "hypbit", Environment = var.environment }
}

resource "aws_s3_bucket" "hypebit_app_prod" {
  bucket = "hypebit-app-prod"
  tags   = { Project = "hypbit", Environment = var.environment }
}

resource "aws_s3_bucket" "hypbit_terraform_state" {
  bucket = "hypbit-terraform-state"
  tags   = { Project = "hypbit", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_bc_admin_prod" {
  bucket = "pixdrift-bc-admin-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_bc_crm_prod" {
  bucket = "pixdrift-bc-crm-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_bc_sales_prod" {
  bucket = "pixdrift-bc-sales-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_bc_workstation_prod" {
  bucket = "pixdrift-bc-workstation-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_developers_prod" {
  bucket = "pixdrift-developers-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_landing_prod" {
  bucket = "pixdrift-landing-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_press_prod" {
  bucket = "pixdrift-press-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "pixdrift_status_prod" {
  bucket = "pixdrift-status-prod"
  tags   = { Project = "pixdrift", Environment = var.environment }
}

resource "aws_s3_bucket" "cert_integrity_prod" {
  bucket = "cert-integrity-prod"
  tags   = { Project = "wavult", Environment = var.environment }
}

resource "aws_s3_bucket" "tryggbil_paket_public" {
  bucket = "tryggbil-paket-public"
  tags   = { Project = "wavult", Environment = var.environment }
}

# ─── WOLVOLD ──────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "wolvold_media_raw" {
  bucket = "wolvold-media-raw"
  tags   = { Project = "wolvold", Environment = var.environment }
}

resource "aws_s3_bucket" "wolvold_media_raw_backup" {
  bucket = "wolvold-media-raw-backup"
  tags   = { Project = "wolvold", Environment = var.environment, Role = "backup" }
}

# ─── ENCRYPTION (all buckets) ─────────────────────────────────────────────────

locals {
  all_buckets = [
    aws_s3_bucket.wavult_assets,
    aws_s3_bucket.wavult_build_artifacts,
    aws_s3_bucket.wavult_group_web,
    aws_s3_bucket.wavult_mail_store,
    aws_s3_bucket.wavult_ops_dashboard,
    aws_s3_bucket.wavult_ops_dashboard_dr,
    aws_s3_bucket.wavult_raw_archive,
    aws_s3_bucket.wavult_receipts,
    aws_s3_bucket.wavult_receipts_dr,
    aws_s3_bucket.wavult_images_eu_primary,
    aws_s3_bucket.wavult_images_eu_backup,
    aws_s3_bucket.wavult_images_us_primary,
    aws_s3_bucket.wavult_images_us_backup,
    aws_s3_bucket.quixzoom_app_prod,
    aws_s3_bucket.quixzoom_landing_prod,
    aws_s3_bucket.quixzoom_media_prod,
    aws_s3_bucket.quixzoom_media_prod_dr,
    aws_s3_bucket.landvex_prod,
    aws_s3_bucket.landvex_prod_dr,
    aws_s3_bucket.optical_insight_prod,
    aws_s3_bucket.mlcs_prod,
    aws_s3_bucket.cert_integrity_prod,
    aws_s3_bucket.tryggbil_paket_public,
    aws_s3_bucket.wolvold_media_raw,
    aws_s3_bucket.wolvold_media_raw_backup,
  ]
}

resource "aws_s3_bucket_server_side_encryption_configuration" "wavult_images_eu_primary" {
  bucket = aws_s3_bucket.wavult_images_eu_primary.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "wavult_images_eu_primary" {
  bucket = aws_s3_bucket.wavult_images_eu_primary.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "wavult_raw_archive" {
  bucket = aws_s3_bucket.wavult_raw_archive.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "wavult_raw_archive" {
  bucket = aws_s3_bucket.wavult_raw_archive.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "wavult_receipts" {
  bucket = aws_s3_bucket.wavult_receipts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "wavult_receipts" {
  bucket = aws_s3_bucket.wavult_receipts.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "quixzoom_media_prod" {
  bucket = aws_s3_bucket.quixzoom_media_prod.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "quixzoom_media_prod" {
  bucket = aws_s3_bucket.quixzoom_media_prod.id
  versioning_configuration { status = "Enabled" }
}

# Block public access for sensitive buckets
resource "aws_s3_bucket_public_access_block" "wavult_receipts" {
  bucket                  = aws_s3_bucket.wavult_receipts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "wavult_mail_store" {
  bucket                  = aws_s3_bucket.wavult_mail_store.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "wavult_raw_archive" {
  bucket                  = aws_s3_bucket.wavult_raw_archive.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Replication role reference
data "aws_iam_role" "s3_replication" {
  name = "wavult-s3-replication"
}
