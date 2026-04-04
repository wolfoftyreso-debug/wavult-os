# Wavult Infrastructure — Terraform

Komplett IaC för Wavult Groups AWS-infrastruktur. Region: `eu-north-1` | Account: `155407238699`

## Struktur

| Fil | Innehåll |
|---|---|
| `main.tf` | Provider, backend (S3 + DynamoDB) |
| `variables.tf` | Alla variabler med defaults |
| `outputs.tf` | Outputs (ARNs, endpoints, IDs) |
| `vpc.tf` | VPC + Subnets + Security Groups (data sources) |
| `ecs.tf` | ECS Cluster + 13 services + Task Definitions + EFS |
| `ecr.tf` | 14 ECR repositories + lifecycle policies |
| `alb.tf` | ALB + 8 Target Groups + Listeners + 12 Routing Rules |
| `rds.tf` | 2 RDS PostgreSQL 16.6 instanser (Multi-AZ) |
| `s3.tf` | 38 S3 buckets + encryption + versioning |
| `iam.tf` | IAM roles + policies (ECS, Lambda, S3, CodeBuild) |
| `cloudwatch.tf` | Log groups + CloudWatch Alarms |
| `ssm.tf` | SSM parameter placeholders (värden sätts externt) |
| `cloudfront.tf` | 19 CloudFront distributions (data sources + nya resurser) |

## ECS Services (wavult cluster)

| Service | Port | Load Balancer |
|---|---|---|
| wavult-os-api | 3001 | api.wavult.com, api.hypbit.com |
| wavult-core | 3007 | /v1/auth/oauth/*, /v1/missions*, /v1/zoomers*, /v1/objects*, /revolut/*, /v1/uapix/* |
| identity-core | 3005 | /identity/*, /v1/auth/*, /v1/migrate/* |
| quixzoom-api | 3001 | api.quixzoom.com |
| landvex-api | 3000 | Intern |
| team-pulse | 3000 | Intern |
| bos-scheduler | — | Intern (ingen port) |
| wavult-redis | 6379 | Intern |
| wavult-kafka | 9092/9093 | Intern (KRaft mode) |
| n8n | 5678 | n8n.wavult.com |
| gitea | 3000 | git.wavult.com |
| gitea-runner | — | Intern (desired=0) |
| supabase | 8000 | supabase.wavult.com, :8000 |

## RDS

| Identifier | Engine | Class | Multi-AZ | Endpoint |
|---|---|---|---|---|
| wavult-identity-core | PostgreSQL 16.6 | db.t4g.micro | ✅ | wavult-identity-core.cvi0qcksmsfj.eu-north-1.rds.amazonaws.com |
| wavult-identity-ecs | PostgreSQL 16.6 | db.t4g.micro | ✅ | wavult-identity-ecs.cvi0qcksmsfj.eu-north-1.rds.amazonaws.com |

## State

- **S3:** `wavult-terraform-state/wavult/prod/terraform.tfstate` (versioning + AES256)
- **Locks:** DynamoDB `wavult-terraform-locks`

## Kom igång

```bash
cp terraform.tfvars.example terraform.tfvars
# Fyll i rds_master_username + rds_master_password (hämta från SSM eller 1Password)
# Övriga värden har defaults som matchar prod

terraform init
terraform plan
terraform apply
```

## Viktigt: Befintlig infrastruktur

Majoriteten av infrastrukturen är redan skapad i AWS. Terraform-koden är skriven med:
- `lifecycle { ignore_changes = [...] }` på kritiska resurser
- `data` sources för VPC/subnets/security groups (inga ändringar görs)
- `lifecycle { prevent_destroy = true }` på ECR och RDS

**Kör alltid `terraform plan` och granska noggrant innan `apply`.**

## SSM Parameters

Alla secrets lagras i SSM Parameter Store under `/wavult/prod/*`.
Terraform skapar placeholder-parametrar (värde: `PLACEHOLDER_SET_VIA_AWS_CLI`).
Befintliga värden skrivs **aldrig** över (`ignore_changes = [value]`).

Sätt värden via:
```bash
aws ssm put-parameter \
  --name "/wavult/prod/EXAMPLE_KEY" \
  --value "actual-secret-value" \
  --type SecureString \
  --overwrite \
  --region eu-north-1
```
