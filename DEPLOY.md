# Hypbit — Driftsättning imorgon 🚀

## Status: Klart att köra (lokalt)

Allt är committat lokalt på branch `claude/setup-hypbit-oms-B9rQI`.
Commit: `dc6bb91 feat: monorepo restructure + bug fixes + infra`

---

## Steg 0: Pusha till GitHub (manuellt)

SSH-nyckeln behöver läggas till i GitHub-kontot `wolfoftyreso-debug`:

```bash
# Kör från WSL:
cat ~/.ssh/id_ed25519.pub
# Kopiera och lägg till på: https://github.com/settings/keys
```

Eller sätt upp en Personal Access Token (PAT):
```bash
git remote set-url origin https://TOKEN@github.com/wolfoftyreso-debug/hypbit.git
git push origin claude/setup-hypbit-oms-B9rQI
# Merga sedan till main via GitHub UI
```

---

## Steg 1: Skapa AWS-konto

1. Gå till https://aws.amazon.com/ → "Create an AWS Account"
2. Välj region: **eu-north-1 (Stockholm)**
3. Skapa en IAM-användare med AdministratorAccess (för Terraform)
4. Spara `AWS_ACCESS_KEY_ID` och `AWS_SECRET_ACCESS_KEY`

---

## Steg 2: Förbered Terraform

```bash
# Installera Terraform: https://developer.hashicorp.com/terraform/install

# Skapa S3-bucket för state (en gång):
aws s3 mb s3://hypbit-terraform-state --region eu-north-1
aws dynamodb create-table \
  --table-name hypbit-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-north-1

# Initiera:
cd infra/terraform
terraform init
```

---

## Steg 3: Sätt Supabase-hemligheter i SSM

```bash
aws ssm put-parameter \
  --name "/hypbit/prod/SUPABASE_URL" \
  --value "din-supabase-url" \
  --type SecureString --overwrite \
  --region eu-north-1

aws ssm put-parameter \
  --name "/hypbit/prod/SUPABASE_ANON_KEY" \
  --value "din-anon-key" \
  --type SecureString --overwrite \
  --region eu-north-1

aws ssm put-parameter \
  --name "/hypbit/prod/SUPABASE_SERVICE_ROLE_KEY" \
  --value "din-service-role-key" \
  --type SecureString --overwrite \
  --region eu-north-1
```

---

## Steg 4: Terraform apply

```bash
cd infra/terraform
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
```

Detta skapar: VPC, ECR, ECS, ALB, 4×S3, 4×CloudFront, Route53, ACM, SSM.

---

## Steg 5: GitHub Actions-hemligheter

Lägg till dessa i GitHub → Settings → Secrets and variables → Actions:

| Namn | Värde |
|------|-------|
| `AWS_ROLE_ARN` | ARN för IAM-rollen (skapa OIDC-integration) |
| `CF_DISTRIBUTION_ADMIN` | CloudFront distribution ID (från `terraform output`) |
| `CF_DISTRIBUTION_WORKSTATION` | CloudFront distribution ID |
| `CF_DISTRIBUTION_CRM` | CloudFront distribution ID |
| `CF_DISTRIBUTION_SALES` | CloudFront distribution ID |

Kör `terraform output` för att få distribution IDs.

---

## Steg 6: Bygg och deploya API:t manuellt (första gången)

```bash
cd server

# Bygg Docker-image:
docker build -t hypbit-api .

# Tagga och pusha till ECR (hämta URL från terraform output ecr_repository_url):
ECR_URL=$(aws ecr describe-repositories --repository-names hypbit/api --query 'repositories[0].repositoryUri' --output text --region eu-north-1)
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin $ECR_URL
docker tag hypbit-api:latest $ECR_URL:latest
docker push $ECR_URL:latest
```

---

## Buggar som är fixade ✅

1. ✅ `/health` returnerade 401 — nu publik, FÖRE auth-middleware
2. ✅ `/api/processes/performance` returnerade 400 — nu graceful fallback
3. ✅ `/api/fx/exposure` returnerade 500 — nu graceful fallback på saknad tabell

---

## Monorepo-struktur ✅

```
hypbit/
├── apps/
│   ├── admin/          Ledningsportal (Vite+React+TS+Tailwind)
│   ├── workstation/    Operatörsstation ✅ bygger till dist/
│   ├── crm/            CRM (tom Vite+React+TS+Tailwind)
│   └── sales/          Försäljning (tom)
├── packages/
│   ├── ui/             Delat komponentbibliotek
│   └── types/          Delade TypeScript-typer
├── server/             Express API (alla buggar fixade)
├── infra/terraform/    Komplett IaC (13 filer)
├── .github/workflows/  CI/CD (api + frontend)
├── turbo.json
└── package.json
```
