# Stripe Aktiveringsguide — pixdrift

## Steg 1: Skapa Stripe-konto (5 min)
1. Gå till stripe.com → Skapa konto
2. Verifiera e-post
3. Fyll i företagsinfo (pixdrift AB)

## Steg 2: Hämta API-nycklar
- Dashboard → Developers → API Keys
- Kopiera: Secret key (sk_live_...)
- Kopiera: Publishable key (pk_live_...)

## Steg 3: Skapa produkter
- Dashboard → Products → Add product
- Produkt 1: "Starter" — Recurring, €499/month, SEK 5,500/month
- Produkt 2: "Growth" — Recurring, €999/month, SEK 10,900/month
- Kopiera Price IDs (price_...)

## Steg 4: Konfigurera webhook
- Dashboard → Developers → Webhooks → Add endpoint
- URL: https://api.bc.pixdrift.com/api/stripe/webhook
- Events: checkout.session.completed, customer.subscription.deleted
- Kopiera webhook secret (whsec_...)

## Steg 5: Lägg in i AWS SSM (kör dessa kommandon)
```bash
aws ssm put-parameter --name "/hypbit/prod/STRIPE_SECRET_KEY" --value "sk_live_..." --type SecureString --overwrite --region eu-north-1
aws ssm put-parameter --name "/hypbit/prod/STRIPE_PUBLISHABLE_KEY" --value "pk_live_..." --type SecureString --overwrite --region eu-north-1
aws ssm put-parameter --name "/hypbit/prod/STRIPE_WEBHOOK_SECRET" --value "whsec_..." --type SecureString --overwrite --region eu-north-1
aws ssm put-parameter --name "/hypbit/prod/STRIPE_PRICE_STARTER" --value "price_..." --type SecureString --overwrite --region eu-north-1
aws ssm put-parameter --name "/hypbit/prod/STRIPE_PRICE_GROWTH" --value "price_..." --type SecureString --overwrite --region eu-north-1
aws ecs update-service --cluster hypbit --service hypbit-api --force-new-deployment --region eu-north-1
```

## Steg 6: Testa
- Gå till pixdrift.com/checkout.html
- Välj Starter-plan
- Använd testkort: 4242 4242 4242 4242
- Verifiera webhook i Stripe Dashboard

## Verifieringsendpoint
```
GET https://api.bc.pixdrift.com/api/stripe/health
→ { "configured": true, "mode": "live" }
```
