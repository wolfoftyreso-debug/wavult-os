# Fakturamail Setup — DNS + AWS SES

## E-postadresser per bolag

| Bolag | Fakturamail | Status |
|---|---|---|
| Wavult Group / Sommarliden Holding | faktura@wavult.com | Pending (wavult.com NS ej bytt) |
| Landvex AB | faktura@hypbit.com | LIVE (temporärt) |
| QuiXzoom | billing@quixzoom.com | Needs MX |
| Landvex Inc | billing@landvex.com | Needs MX |

## Steg 1: DNS MX Records (Cloudflare)

### quixzoom.com (Zone: e9a9520b64cd67eca1d8d926ca9daa79)
```
MX  10  inbound-smtp.eu-west-1.amazonaws.com
```

### landvex.com (Route 53 — ej i Cloudflare)
Lägg till MX i Route 53: inbound-smtp.us-east-1.amazonaws.com priority 10

## Steg 2: AWS SES Receipt Rules

Per domän:
- Recipients: billing@quixzoom.com, faktura@quixzoom.com
- Action 1: Store in S3: wavult-receipts-{company}
- Action 2: SNS → n8n webhook

## Steg 3: n8n Workflow
- Trigger: SNS webhook (ny faktura inkommen)
- Extract: PDF attachment från S3
- Match: POST till /v1/receipts/match (Wavult OS API)
- Update: PATCH /v1/transactions/{id}/receipt

## Temporär lösning (nu)
faktura@hypbit.com fungerar redan via AWS SES.
Vidarebefordra kvitton dit — n8n matchar automatiskt.
