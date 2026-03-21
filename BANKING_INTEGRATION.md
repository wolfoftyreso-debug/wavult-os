# pixdrift Banking Integration

Complete Open Banking and accounting system integration infrastructure for pixdrift.

---

## Architecture Overview

```
pixdrift Backend (api.bc.pixdrift.com)
│
├── Open Banking (PSD2)
│   └── Tink (Visa) ─── SEB, Handelsbanken, Nordea, Swedbank + 3500 banks
│       ├── Account Information Service (AIS)
│       └── Payment Initiation Service (PIS)
│
├── Swedish Payment Rails
│   ├── Bankgiro / Plusgiro (BGC TK-format)
│   ├── Autogiro (direct debit)
│   ├── SEPA Credit Transfer (EU)
│   └── Swish for Business (M-Commerce)
│
├── Accounting System Integrations
│   ├── Fortnox (OAuth2, REST API v3)
│   ├── Visma e-conomic (OAuth2, REST API)
│   └── PE Accounting (placeholder)
│
└── Supabase (znmxtnxxjpmgtycmsqjv.supabase.co)
    ├── bank_connections
    ├── bank_transactions
    ├── bank_payments
    ├── autogiro_mandates
    ├── accounting_integrations
    └── bank_reconciliation_log
```

---

## Supported Banks

### Sverige (10 banker)
| Bank | ID | Tink Provider |
|------|----|--------------|
| SEB | `se-seb` | se-seb-ob |
| Handelsbanken | `se-handelsbanken` | se-handelsbanken-ob |
| Nordea | `se-nordea` | se-nordea-ob |
| Swedbank | `se-swedbank` | se-swedbank-ob |
| Länsförsäkringar Bank | `se-lansforsakringar` | se-lf-ob |
| ICA Banken | `se-ica` | se-icabanken-ob |
| Klarna | `se-klarna` | se-klarna-ob |
| Revolut | `se-revolut` | se-revolut-ob |
| Danske Bank | `se-danske` | se-danskebank-ob |
| Sparbanken Skåne | `se-sparbanken` | se-sparbanken-skane-ob |

### Norge (4 banker)
DNB, SpareBank 1, Nordea Norge, Handelsbanken Norge

### Danmark (3 banker)
Danske Bank DK, Jyske Bank, Nordea Danmark

### Finland (3 banker)
OP Finansgruppen, Nordea Finland, Säästöpankki

### Europa (8 banker)
Deutsche Bank, Sparkasse, Commerzbank, Barclays, HSBC, Lloyds, NatWest, ING, BNP Paribas

**Total: 28+ namngivna banker + 3500+ via Tink globalt**

---

## Accounting System Integrations

| System | Marknad | Auth | Status |
|--------|---------|------|--------|
| Fortnox | SE SMB | OAuth2 | ✅ Fullständig |
| Visma e-conomic | SE/Nordic SMB | OAuth2 | ✅ Fullständig |
| PE Accounting | SE Mid | API Key | 🔧 Placeholder |
| Björn Lundén | SE SMB | API Key | 🔧 Placeholder |
| Xero | International | OAuth2 | 🔧 Placeholder |
| QuickBooks | US | OAuth2 | 🔧 Placeholder |

---

## API Endpoints

### Open Banking (Tink)
```
GET  /api/banking/connect              # Generera Tink Link URL
GET  /api/banking/callback             # OAuth2 callback → sparar tokens
GET  /api/banking/accounts             # Lista kopplade bankkonton
GET  /api/banking/transactions         # Banktransaktioner med filter
POST /api/banking/sync                 # Synka alla konton (import)
POST /api/banking/categorize           # AI-kategorisering → BAS-konton
GET  /api/banking/banks                # Lista stödda banker
```

### Transaktioner
```
POST /api/banking/transactions/:id/match   # Koppla till ledger-post
POST /api/banking/transactions/:id/post    # Bokför transaktion
```

### Betalningar
```
GET  /api/banking/payments              # Lista betalningar
POST /api/banking/payments/:id/approve  # Godkänn betalning
```

### Bankgiro / Autogiro
```
GET  /api/banking/bgc-file             # Generera BGC TK-format fil
POST /api/banking/autogiro/mandate     # Skapa autogiro-medgivande
GET  /api/banking/autogiro/mandates    # Lista medgivanden
```

### SEPA
```
POST /api/banking/sepa/payment         # Initiera SEPA-betalning
GET  /api/banking/sepa/payment/:id     # Kontrollera status
```

### Swish
```
POST /api/banking/swish/payment-request  # Skapa betalningsförfrågan + QR
GET  /api/banking/swish/payment/:token   # Kontrollera status
POST /api/banking/swish/callback         # Webhook från Swish
```

### Bankavstämning
```
GET  /api/banking/reconciliation        # Historik + oavstämda poster
POST /api/banking/reconciliation/close  # Stäng period
```

### Integrationer
```
GET  /api/banking/integrations/status   # Status alla bokföringssystem

GET  /api/integrations/fortnox/connect  # Starta Fortnox OAuth2
POST /api/integrations/fortnox/callback # OAuth2 callback
POST /api/integrations/fortnox/sync-invoices
POST /api/integrations/fortnox/sync-transactions
POST /api/integrations/fortnox/push-invoice
GET  /api/integrations/fortnox/supplier-invoices
POST /api/integrations/fortnox/approve-payment

GET  /api/integrations/visma/connect    # Starta Visma OAuth2
POST /api/integrations/visma/sync
GET  /api/integrations/visma/accounts
POST /api/integrations/visma/push-entry
```

---

## Setup Guide

### 1. Tink (Open Banking)

1. Registrera på [Tink Console](https://console.tink.com/)
2. Skapa en app under "Apps"
3. Konfigurera redirect URI: `https://api.bc.pixdrift.com/api/banking/callback`
4. Aktivera scoper: `accounts:read`, `transactions:read`, `balances:read`, `identity:read`
5. Aktivera Payment Initiation om SEPA-betalningar ska stödjas (separat avtal)

```env
TINK_CLIENT_ID=your_client_id_here
TINK_CLIENT_SECRET=your_client_secret_here
TINK_REDIRECT_URI=https://api.bc.pixdrift.com/api/banking/callback
```

**Sandbox-testning:**
Tink erbjuder sandbox-miljö med testbanker. Använd `sandbox.tink.com` under utveckling.

---

### 2. Fortnox

1. Registrera som Fortnox-partner på [Fortnox Developer Portal](https://developer.fortnox.se/)
2. Skapa en integration och hämta Client ID + Client Secret
3. Konfigurera redirect URI: `https://api.bc.pixdrift.com/api/integrations/fortnox/callback`
4. Välj scoper: `companyinformation`, `invoice`, `bookkeeping`, `supplierinvoice`

```env
FORTNOX_CLIENT_ID=your_client_id_here
FORTNOX_CLIENT_SECRET=your_client_secret_here
FORTNOX_REDIRECT_URI=https://api.bc.pixdrift.com/api/integrations/fortnox/callback
```

**Token-hantering:**
Fortnox access tokens löper ut. Implementera token refresh med `refresh_token` lagrat i `accounting_integrations`-tabellen.

---

### 3. Visma e-conomic

1. Registrera på [Visma Developer](https://developer.visma.com/)
2. Skapa en OAuth2-app för e-conomic
3. Hämta App Secret Token (för server-to-server) och Agreement Grant Token (per kund)

```env
VISMA_CLIENT_ID=your_client_id_here
VISMA_SECRET_TOKEN=your_app_secret_token
VISMA_REDIRECT_URI=https://api.bc.pixdrift.com/api/integrations/visma/callback
```

**Auth-modell:**
Visma e-conomic använder en tvånivå-auth: `X-AppSecretToken` (din app) + `X-AgreementGrantToken` (kundens medgivande).

---

### 4. Swish for Business

Swish Handel kräver:
1. Swish Handelsavtal med din bank
2. MSS-certifikat (P12-format) utfärdat av Getswish AB
3. Test-certifikat fås på [Swish Simulator](https://developer.swish.nu/)

```env
SWISH_PAYEE_ALIAS=1231181189      # Ditt Swish-nummer (10 siffror)
SWISH_CERT_PATH=/certs/swish.p12  # Sökväg till P12-certifikat
SWISH_KEY_PATH=/certs/swish.key   # Privat nyckel
```

**mTLS-krav:**
Swish API kräver mutual TLS. I produktion behövs `https.Agent` med cert/key options i Node.js.
Swish API anropas aldrig direkt från frontend — alltid via backend.

---

## Miljövariabler (komplett lista)

```env
# Tink Open Banking
TINK_CLIENT_ID=
TINK_CLIENT_SECRET=
TINK_REDIRECT_URI=https://api.bc.pixdrift.com/api/banking/callback

# Fortnox
FORTNOX_CLIENT_ID=
FORTNOX_CLIENT_SECRET=
FORTNOX_REDIRECT_URI=https://api.bc.pixdrift.com/api/integrations/fortnox/callback

# Visma e-conomic
VISMA_CLIENT_ID=
VISMA_SECRET_TOKEN=
VISMA_REDIRECT_URI=https://api.bc.pixdrift.com/api/integrations/visma/callback

# Swish for Business
SWISH_PAYEE_ALIAS=
SWISH_CERT_PATH=
SWISH_KEY_PATH=

# Befintliga
SUPABASE_URL=https://znmxtnxxjpmgtycmsqjv.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

---

## Databastabeller

| Tabell | Beskrivning |
|--------|-------------|
| `bank_connections` | Kopplade bankkonton (Tink tokens, IBAN, saldo) |
| `bank_transactions` | Importerade banktransaktioner med matchningsstatus |
| `bank_payments` | Utgående betalningar (SEPA, BGC, Swish) |
| `autogiro_mandates` | Autogiro-medgivanden från kunder |
| `accounting_integrations` | Fortnox/Visma OAuth-tokens och synkstatus |
| `bank_reconciliation_log` | Månadsvis bankavstämningslogg |
| `bank_oauth_states` | CSRF-skydd för OAuth-flöden |
| `swish_payment_tokens` | Swish QR-tokens med expiry |

**RLS (Row-Level Security):** Alla tabeller har RLS aktiverat. Policies isolerar data per `org_id`.

---

## Säkerhetsmodell

### Token-kryptering
I nuläget lagras tokens i klartext i Supabase. För produktion rekommenderas:
- **Supabase Vault** för kryptering-at-rest av känsliga fält
- Alternativt **AWS KMS** för envelope encryption

### 4-Eyes Principle
Betalningar ≥ 50 000 kr kräver två godkännanden (`requires_second_approval` är computed column).

### PSD2 Compliance
- Tink är godkänd PSD2-agent (AISP + PISP)
- Inga bankuppgifter passerar pixdrift-servrar
- OAuth2 PKCE-flöde via Tink Link

### Supabase RLS Policies
```sql
-- Exempelpolicy (bank_transactions)
CREATE POLICY "bank_transactions_org_isolation"
  ON bank_transactions FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
```

---

## Bankavstämningsprocess

**Månadsvis:**
1. Kör `/api/banking/sync` för att hämta alla transaktioner
2. Systemet auto-matchar mot befintliga ledger-poster (fuzzy match på belopp + datum ±2 dagar)
3. Oavstämda poster visas i Bankavstämning-vyn
4. Matcha manuellt eller bokför med AI-föreslaget BAS-konto
5. Stäng perioden via `/api/banking/reconciliation/close`
6. Differens beräknas automatiskt: `bank_balance - ledger_balance`

**Statusar:**
- `reconciled` — differens < 0.01 kr
- `disputed` — differens ≥ 0.01 kr (kräver manuell utredning)

---

## AI-kategorisering (BAS-konton)

Regel-baserad kategorisering mot svenska BAS-kontoplanen:

| Mönster | BAS-konto | Säkerhet |
|---------|-----------|----------|
| lön/salary | 7210 Löner | 90% |
| hyra/rent | 5010 Lokalhyra | 88% |
| tele/mobil | 6210 Telekommunikation | 87% |
| försäkring | 6310 Företagsförsäkringar | 85% |
| programvara/SaaS | 6540 IT-kostnader | 85% |
| resor/flyg | 5800 Resekostnader | 82% |
| el/vattenfall | 5020 El, värme | 85% |
| inkomst (positivt belopp) | 3000 Rörelseintäkter | 55% |
| övrigt | 6990 Övriga rörelsekostnader | 40% |

---

## Frontend (BankingModule.tsx)

**5 vyer:**
1. **Konton** — Lista kopplade bankkonton, saldo, "+ Koppla bank"-modal
2. **Transaktioner** — Filtrerbar lista, bulk AI-kategorisering, bokför-knapp
3. **Betalningar** — SEPA/Bankgiro/Swish-modal, godkännandeflöde, statusbadges
4. **Bankavstämning** — Månadslogg med differensanalys, oavstämda poster
5. **Integrationer** — Fortnox/Visma/PE Accounting-status + koppla/synka

---

## BGC-format (Bankgiro)

Genererade filer följer BGC:s TK-format (Betalningsservice):
- `TK01` — Headerpost med avsändarinformation
- `TK20` — Betalningsposter (en per mottagare)
- `TK99` — Summapost (antal + totalbelopp)

Filer laddas ned som `.txt` med ISO-8859-1 encoding och `\r\n` radbrytningar.

---

## Production Checklist

- [ ] Sätt alla miljövariabler i produktionsmiljö
- [ ] Kör `sql/banking_schema.sql` mot Supabase
- [ ] Aktivera Supabase Vault för token-kryptering
- [ ] Konfigurera Tink redirect URI i Tink Console
- [ ] Aktivera Fortnox OAuth2-app
- [ ] Aktivera Visma e-conomic-integration
- [ ] Installera Swish MSS-certifikat på server
- [ ] Sätt upp cron-jobb för daglig `/api/banking/sync`
- [ ] Testa 4-eyes-flöde för betalningar > 50 000 kr
- [ ] Verifiera RLS-policies i Supabase
