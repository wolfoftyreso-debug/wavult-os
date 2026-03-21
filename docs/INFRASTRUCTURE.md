# pixdrift Infrastruktur

> Skapad: 2026-03-21 | Senior AWS-arkitekt: Bernt

## URL-arkitektur

| URL | CloudFront ID | CloudFront Domain | S3 Bucket | Syfte |
|-----|--------------|-------------------|-----------|-------|
| pixdrift.com | E2CZK80C8S8JPF | d32vz1dqlzn29d.cloudfront.net | pixdrift-landing-prod | Öppen landningssida (statisk HTML) |
| www.pixdrift.com | E2CZK80C8S8JPF | d32vz1dqlzn29d.cloudfront.net | pixdrift-landing-prod | Alias för apex |
| app.bc.pixdrift.com | E30M5LZSQ7FMEZ | d2bmqxzyhu2af4.cloudfront.net | pixdrift-bc-workstation-prod | Autentiserad SPA-app |
| admin.bc.pixdrift.com | EN6V1PLNRWZV | d1lxaupcjwd2y0.cloudfront.net | pixdrift-bc-admin-prod | Admin-portal |
| crm.bc.pixdrift.com | E2P38O4WNORKE9 | d270h53fvn20bu.cloudfront.net | pixdrift-bc-crm-prod | CRM |
| sales.bc.pixdrift.com | E1R5ZQK0FQYN5D | d1r8hyoqjmk0sj.cloudfront.net | pixdrift-bc-sales-prod | Sales |
| api.bc.pixdrift.com | ALB | hypbit-api-alb-1238636464.eu-north-1.elb.amazonaws.com | ECS Fargate | API |
| status.pixdrift.com | EGHB0CHLK9CDI | d2momzxykt4a1r.cloudfront.net | pixdrift-status-prod | Statussida |
| developers.pixdrift.com | EC7A2RM42H14M | d2nvngupq3fkcm.cloudfront.net | pixdrift-developers-prod | Developer portal |
| press.pixdrift.com | E1HICRMY8BLBZC | d1jehmey81q5ys.cloudfront.net | pixdrift-press-prod | Pressrum |

## S3-buckets — säkerhetsmodell

### pixdrift-landing-prod
- **Åtkomst:** Publik läsning (public-access-block av, publik bucket policy)
- **Orsak:** CloudFront använder S3 website-endpoint (HTTP), kräver publik bucket
- **Skydd:** Inga känsliga data — statisk HTML/CSS/JS/bilder
- **Region:** eu-north-1

### pixdrift-bc-*-prod (workstation/admin/crm/sales)
- **Åtkomst:** Privat — CloudFront OAC (Origin Access Control) via sigv4
- **Orsak:** Autentiserade appar, ska INTE vara publikt tillgängliga direkt
- **Skydd:** Bucket policy tillåter endast CloudFront via `AWS:SourceArn`
- **Region:** eu-north-1

## DNS — Cloudflare

- **Zone:** pixdrift.com (Zone ID: 7fa7c28b0748ded5b4d48f06eae6faec)
- **Nameservers:** amy.ns.cloudflare.com, dylan.ns.cloudflare.com
- **Plan:** Free Website
- **Proxy:** Disabled (orange cloud av) — CloudFront hanterar SSL/CDN

### DNS-records
```
pixdrift.com         CNAME  d32vz1dqlzn29d.cloudfront.net     (landing)
www.pixdrift.com     CNAME  d32vz1dqlzn29d.cloudfront.net     (landing)
app.bc.pixdrift.com  CNAME  d2bmqxzyhu2af4.cloudfront.net     (workstation)
admin.bc.pixdrift.com CNAME d1lxaupcjwd2y0.cloudfront.net     (admin)
crm.bc.pixdrift.com  CNAME  d270h53fvn20bu.cloudfront.net     (crm)
sales.bc.pixdrift.com CNAME d1r8hyoqjmk0sj.cloudfront.net    (sales)
api.bc.pixdrift.com  CNAME  hypbit-api-alb-*.eu-north-1.elb.amazonaws.com (api)
status.pixdrift.com  CNAME  d2momzxykt4a1r.cloudfront.net     (status)
developers.pixdrift.com CNAME d2nvngupq3fkcm.cloudfront.net   (developers)
press.pixdrift.com   CNAME  d1jehmey81q5ys.cloudfront.net     (press)
```

## Terraform-state

- **Backend:** S3 (`hypbit-terraform-state/prod/terraform.tfstate`, eu-north-1)
- **Locking:** DynamoDB (`hypbit-terraform-locks`)
- **Landnings-CF:** `aws_cloudfront_distribution.landing` (importeras via `terraform import`)
- **App-CF:er:** `aws_cloudfront_distribution.frontends[*]`

### Importera landing CF till Terraform state
```bash
cd infra/terraform
terraform import \
  -var="cloudflare_api_token=$CLOUDFLARE_API_TOKEN" \
  aws_cloudfront_distribution.landing E2CZK80C8S8JPF

terraform import \
  -var="cloudflare_api_token=$CLOUDFLARE_API_TOKEN" \
  aws_s3_bucket.landing pixdrift-landing-prod
```

## Deploy-kommandon

### Landing-sida (pixdrift.com)
```bash
# Deployer statisk HTML — INTE från dist/ utan direkt från apps/landing/
aws s3 sync apps/landing/ s3://pixdrift-landing-prod/ \
  --delete \
  --exclude "*.tsx" --exclude "*.ts" \
  --region eu-north-1

aws cloudfront create-invalidation \
  --distribution-id E2CZK80C8S8JPF \
  --paths "/*" --region us-east-1
```

### Workstation-app (app.bc.pixdrift.com)
```bash
cd apps/workstation && npm run build
aws s3 sync dist/ s3://pixdrift-bc-workstation-prod/ \
  --delete --region eu-north-1
aws cloudfront create-invalidation \
  --distribution-id E30M5LZSQ7FMEZ \
  --paths "/*" --region us-east-1
```

### Admin (admin.bc.pixdrift.com)
```bash
cd apps/admin && npm run build
aws s3 sync dist/ s3://pixdrift-bc-admin-prod/ \
  --delete --region eu-north-1
aws cloudfront create-invalidation \
  --distribution-id EN6V1PLNRWZV \
  --paths "/*" --region us-east-1
```

### CRM (crm.bc.pixdrift.com)
```bash
cd apps/crm && npm run build
aws s3 sync dist/ s3://pixdrift-bc-crm-prod/ \
  --delete --region eu-north-1
aws cloudfront create-invalidation \
  --distribution-id E2P38O4WNORKE9 \
  --paths "/*" --region us-east-1
```

### Sales (sales.bc.pixdrift.com)
```bash
cd apps/sales && npm run build
aws s3 sync dist/ s3://pixdrift-bc-sales-prod/ \
  --delete --region eu-north-1
aws cloudfront create-invalidation \
  --distribution-id E1R5ZQK0FQYN5D \
  --paths "/*" --region us-east-1
```

## Monitoring — CloudWatch

### Aktiva larm (skapade 2026-03-21)

| Larm | Distribution | Metric | Threshold | Region |
|------|-------------|--------|-----------|--------|
| pixdrift-landing-5xx | E2CZK80C8S8JPF | 5xxErrorRate | >5% / 5min | us-east-1 |
| pixdrift-app-5xx | E30M5LZSQ7FMEZ | 5xxErrorRate | >5% / 5min | us-east-1 |
| pixdrift-admin-5xx | EN6V1PLNRWZV | 5xxErrorRate | >5% / 5min | us-east-1 |
| pixdrift-crm-5xx | E2P38O4WNORKE9 | 5xxErrorRate | >5% / 5min | us-east-1 |
| pixdrift-sales-5xx | E1R5ZQK0FQYN5D | 5xxErrorRate | >5% / 5min | us-east-1 |

### Övrig monitoring
```bash
# ECS API-tjänst
aws ecs describe-services --cluster hypbit --services hypbit-api --region eu-north-1

# CloudFront access logs (om aktiverade)
aws logs describe-log-groups --region us-east-1 | grep cloudfront

# CloudWatch-larm status
aws cloudwatch describe-alarms --alarm-names \
  pixdrift-landing-5xx pixdrift-app-5xx pixdrift-admin-5xx pixdrift-crm-5xx pixdrift-sales-5xx \
  --region us-east-1
```

## GitHub Actions CI/CD

**Workflow:** `.github/workflows/deploy-frontend.yml`
**Trigger:** Push till `main` som påverkar `apps/**`

### Deploy-ordning
1. Install + Turbo build (alla appar)
2. Deploy landing → `pixdrift-landing-prod` + invalidera E2CZK80C8S8JPF
3. Deploy workstation → `pixdrift-bc-workstation-prod` + invalidera E30M5LZSQ7FMEZ
4. Deploy admin → `pixdrift-bc-admin-prod` + invalidera EN6V1PLNRWZV
5. Deploy CRM → `pixdrift-bc-crm-prod` + invalidera E2P38O4WNORKE9
6. Deploy sales → `pixdrift-bc-sales-prod` + invalidera E1R5ZQK0FQYN5D
7. Smoke test (verifierar att landing INTE är React-appen)
8. Notify API av deploy

### Secrets som krävs i GitHub
| Secret | Värde |
|--------|-------|
| AWS_ROLE_ARN | ARN för GitHub Actions OIDC-rollen |
| CF_DISTRIBUTION_WORKSTATION | E30M5LZSQ7FMEZ |
| CF_DISTRIBUTION_ADMIN | EN6V1PLNRWZV |
| CF_DISTRIBUTION_CRM | E2P38O4WNORKE9 |
| CF_DISTRIBUTION_SALES | E1R5ZQK0FQYN5D |
| TURBO_TOKEN | Turbo Remote Cache token |
| TURBO_TEAM | Turbo team name |
| INDEXNOW_KEY | IndexNow API-nyckel |

## Viktiga noter

### pixdrift.com vs app.bc.pixdrift.com — KRITISK separation
- `pixdrift.com` = **landing** (statisk HTML, ingen React, ingen autentisering)
- `app.bc.pixdrift.com` = **workstation** (React SPA, kräver login)
- **ALDRIG** synka `apps/workstation/dist/` till `pixdrift-landing-prod`

### Cloudflare-token
Cloudflare API-token behövs för Terraform-apply (DNS-ändringar).
Token lagras INTE i SSM — sätts som `TF_VAR_cloudflare_api_token` vid apply:
```bash
export TF_VAR_cloudflare_api_token="token-här"
terraform apply
```

### DNS-propagering
Cloudflare TTL = 60s. DNS-ändringar propagerar snabbt (~1-2 min).
CloudFront-invalidation tar vanligtvis 1-3 minuter.

## Arkitekturdiagram

```
Internet
    │
    ├── pixdrift.com ──────────────► CF E2CZK80C8S8JPF ──► S3 pixdrift-landing-prod
    │   www.pixdrift.com                                    (statisk HTML landing)
    │
    ├── app.bc.pixdrift.com ───────► CF E30M5LZSQ7FMEZ ──► S3 pixdrift-bc-workstation-prod
    │                                                       (React SPA, autentiserad)
    │
    ├── admin.bc.pixdrift.com ─────► CF EN6V1PLNRWZV ────► S3 pixdrift-bc-admin-prod
    │
    ├── crm.bc.pixdrift.com ───────► CF E2P38O4WNORKE9 ──► S3 pixdrift-bc-crm-prod
    │
    ├── sales.bc.pixdrift.com ─────► CF E1R5ZQK0FQYN5D ──► S3 pixdrift-bc-sales-prod
    │
    └── api.bc.pixdrift.com ───────► ALB ────────────────► ECS Fargate (hypbit-api)
                                                            Node.js + Supabase
```

## Skapad av
Bernt (OpenClaw AI-assistent) — 2026-03-21
