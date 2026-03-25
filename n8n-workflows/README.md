# Wavult n8n Workflows

Tre automatiserade cykler för self-improving ops.

## Setup

1. Starta: `docker compose up n8n -d`
2. Öppna: http://localhost:5678 (admin / wavult-n8n-2026)
3. Importera workflows: Settings → Import from file → välj varje .json

## Workflows

### 01-ops-pulse.json
- Kör var 30:e minut
- Hämtar health score, kör governance sweep
- Skickar email-alert om score < 70

### 02-billing-sync.json
- Kör var 15:e minut
- Synkar osynkade usage events till Lago
- Alert om fler än 5 events misslyckas

### 03-daily-health-report.json
- Kör kl 07:00 varje dag
- Kör full governance sweep
- Skickar HTML-rapport med health score + aktiv improvement plan till dev@hypbit.com

## Self-Improving Loop

```
Audit agents hittar problem
  → audit_issues populated
  → health score sjunker
  → n8n triggar alert
  → improvement_plan genereras
  → n8n checkar KPIs varje dag
  → när KPI uppnådd: ny plan
  → health score stiger
```

## Credentials i n8n

Lägg till SMTP credentials i n8n UI:
- Credentials → New → SMTP
- Host: email-smtp.eu-north-1.amazonaws.com
- Port: 587
- User: från .env SES_SMTP_USER
- Pass: från .env SES_SMTP_PASS
