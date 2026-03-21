# pixdrift — Enterprise ERP Integration Architecture

**Version:** 1.0.0  
**Datum:** 2026-03-21  
**Ansvarig:** Integration Platform Team

---

## Innehållsförteckning

1. [Arkitekturöversikt](#1-arkitekturöversikt)
2. [SAP S/4HANA & SAP Business One](#2-sap-s4hana--sap-business-one)
3. [Oracle NetSuite & Oracle ERP Cloud](#3-oracle-netsuite--oracle-erp-cloud)
4. [Microsoft Dynamics 365](#4-microsoft-dynamics-365)
5. [IFS Applications](#5-ifs-applications)
6. [Nordiska ERP-system](#6-nordiska-erp-system-jeeves-monitor-pyramid)
7. [Sage & Infor](#7-sage--infor)
8. [Generisk integration](#8-generisk-integration-webhook--polling)
9. [Databas & Schema](#9-databas--schema)
10. [Fältkartläggning](#10-fältkartläggning)
11. [Conflict Resolution](#11-conflict-resolution-strategi)
12. [API-nycklar & Licenskrav](#12-api-nycklar--licenskrav)
13. [Säkerhet](#13-säkerhet)

---

## 1. Arkitekturöversikt

```
                    ┌─────────────────────────────────────┐
                    │         pixdrift API                │
                    │   /api/integrations/*               │
                    │   server/src/integrations/erp.ts   │
                    └───────────┬─────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────────┐
          │                     │                         │
    ┌─────▼─────┐        ┌──────▼──────┐         ┌────────▼──────┐
    │ SAP BTP   │        │ Oracle NS   │         │ Azure AD /    │
    │ OData v4  │        │ REST v2.0   │         │ Dynamics 365  │
    └─────┬─────┘        └──────┬──────┘         └────────┬──────┘
          │                     │                         │
    ┌─────▼─────────────────────▼─────────────────────────▼──────┐
    │                   integration_configs                       │
    │               (Supabase PostgreSQL)                         │
    │     credentials JSONB (krypterat)                          │
    └─────────────────────────────────────────────────────────────┘
```

### Design-principer

| Princip | Implementering |
|---------|----------------|
| **Stateless API** | Alla credentials lagras i `integration_configs`, aldrig i minnet |
| **Audit trail** | Varje synk loggas i `integration_sync_log` |
| **Idempotent upserts** | Conflict-detection via `external_id` |
| **Webhook-first** | Realtidsuppdateringar via webhooks där möjligt |
| **Graceful degradation** | REST polling som fallback för system utan webhooks |

### Filer

```
server/src/integrations/
  erp.ts              ← Alla ERP-endpoints (denna release)
  sap.ts              ← SAP low-level connector (OData, CSRF)
  fortnox.ts          ← Fortnox OAuth2 connector
  generic-webhook.ts  ← Generisk webhook-mottagare
  integration-api.ts  ← CRUD för integration_connectors
  connector.ts        ← Bas-interface (ERPConnector)

sql/
  31_integrations_schema.sql  ← Schema för denna release

apps/admin/src/
  IntegrationsHub.tsx ← Admin UI
```

---

## 2. SAP S/4HANA & SAP Business One

### Autentisering

#### OAuth2 via SAP BTP (rekommenderat för S/4HANA Cloud)

```
1. GET /api/integrations/sap/connect
   → Redirect till SAP BTP Authorization Server
   → URL: https://{subaccount}.authentication.eu10.hana.ondemand.com/oauth/authorize

2. POST /api/integrations/sap/callback
   → Tar emot code, exchange mot access_token
   → Lagrar token i integration_configs.credentials

3. Alla efterföljande anrop:
   Authorization: Bearer {access_token}
```

#### Basic Auth / SAP RFC (legacy SAP_RFC för on-premise)

```
1. Konfigurera username/password i integration_configs.credentials
2. CSRF-token hämtas via GET med header X-CSRF-Token: Fetch
3. Alla skrivanrop skickar X-CSRF-Token: {token}
```

### API-nycklar & licenskrav

| Krav | Detalj |
|------|--------|
| **SAP BTP-licens** | SAP Integration Suite eller BTP standard |
| **API-aktivering** | Aktivera OData APIs i SAP API Business Hub |
| **S/4HANA APIs** | `API_BUSINESS_PARTNER`, `API_SALES_ORDER_SRV`, `API_GL_ACCOUNT_SRV` |
| **SuccessFactors** | SuccessFactors HXM Suite + API-tillgång |

### Endpoints

| Endpoint | Metod | SAP API |
|----------|-------|---------|
| `/api/integrations/sap/customers` | GET | `API_BUSINESS_PARTNER` (Category=1) |
| `/api/integrations/sap/vendors` | GET | `API_BUSINESS_PARTNER` (Category=2) |
| `/api/integrations/sap/products` | GET | `API_PRODUCT_SRV` |
| `/api/integrations/sap/cost-centers` | GET | `API_COSTCENTER_SRV` |
| `/api/integrations/sap/invoices` | GET | `API_BILLING_DOCUMENT_SRV` |
| `/api/integrations/sap/push-invoice` | POST | `API_SALES_ORDER_SRV` |
| `/api/integrations/sap/payments` | GET | `API_PAYMENT_DOCUMENT` |
| `/api/integrations/sap/push-payment` | POST | `API_PAYMENT_DOCUMENT` |
| `/api/integrations/sap/gl-accounts` | GET | `API_GL_ACCOUNT_SRV` |
| `/api/integrations/sap/journal-entries` | GET | `API_JOURNAL_ENTRY` |
| `/api/integrations/sap/push-journal` | POST | `API_JOURNAL_ENTRY` |
| `/api/integrations/sap/employees` | GET | SuccessFactors `PerPerson` |
| `/api/integrations/sap/push-capability` | POST | SuccessFactors `EmpCompetency` |
| `/api/integrations/sap/sync` | POST | Alla ovan (bidirektionell) |
| `/api/integrations/sap/idoc` | POST | IDoc XML (legacy) |
| `/api/integrations/sap/bapi/:fn` | POST | BAPI REST proxy |

### SAP IDoc (legacy on-premise)

```xml
<!-- Inkommande IDoc -->
POST /api/integrations/sap/idoc
Content-Type: text/xml

<IDOC>
  <IDOCTYPE>ORDERS05</IDOCTYPE>
  <DOCNUM>0000000012345678</DOCNUM>
  <E2EDK01005>...</E2EDK01005>
</IDOC>

<!-- Svar -->
<IDOC_ACK>
  <STATUS>OK</STATUS>
  <DOCNUM>0000000012345678</DOCNUM>
</IDOC_ACK>
```

---

## 3. Oracle NetSuite & Oracle ERP Cloud

### Autentisering

#### Token-Based Authentication (TBA) — NetSuite

```
1. Skapa en Integration Record i NetSuite (Setup → Integrations → Manage Integrations)
2. Generera Consumer Key/Secret + Token Key/Secret
3. Konfigurera i integration_configs.credentials:
   {
     "account_id": "TSTDRV123456",
     "consumer_key": "...",
     "consumer_secret": "...",
     "token_key": "...",
     "token_secret": "..."
   }
```

#### OAuth2 (NetSuite 2022.1+)

```
1. GET /api/integrations/oracle/connect
   → Redirect till https://{account_id}.app.netsuite.com/app/login/oauth2/authorize.nl

2. POST /api/integrations/oracle/callback
   → Token exchange mot NetSuite token endpoint
```

### Licenskrav

| Krav | Detalj |
|------|--------|
| **NetSuite licens** | NetSuite Advanced Financials + REST API add-on |
| **Oracle ERP Cloud** | Cloud Service Administrator-roll |
| **API-aktivering** | REST Web Services måste aktiveras i Feature-inställningar |

### Endpoints

| Endpoint | Metod | NetSuite Record |
|----------|-------|-----------------|
| `/api/integrations/oracle/customers` | GET | `customer` |
| `/api/integrations/oracle/push-customer` | POST | `customer` |
| `/api/integrations/oracle/invoices` | GET | `invoice` |
| `/api/integrations/oracle/push-invoice` | POST | `invoice` |
| `/api/integrations/oracle/purchase-orders` | GET | `purchaseOrder` |
| `/api/integrations/oracle/gl-accounts` | GET | `account` |
| `/api/integrations/oracle/journal-entry` | POST | `journalentry` |
| `/api/integrations/oracle/inventory` | GET | `inventoryItem` |
| `/api/integrations/oracle/inventory-adjustment` | POST | `inventoryAdjustment` |

---

## 4. Microsoft Dynamics 365

### Autentisering

#### Azure AD OAuth2 (alla Dynamics 365-produkter)

```
1. Registrera en app i Azure AD (portal.azure.com → App registrations)
2. Konfigurera API-behörigheter:
   - Business Central: Financials.ReadWrite.All
   - Dynamics Sales: Dynamics CRM user_impersonation
3. Hämta: Tenant ID, Client ID, Client Secret

4. GET /api/integrations/dynamics/connect
   → Redirect till https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize

5. POST /api/integrations/dynamics/callback
   → Token exchange
```

### Licenskrav

| Produkt | Licens |
|---------|--------|
| **Business Central** | Microsoft Dynamics 365 Business Central Essentials eller Premium |
| **Dynamics 365 Sales** | Dynamics 365 Sales Professional eller Enterprise |
| **Power Automate** | Microsoft 365 (inkl.) eller Power Automate Per User |

### Endpoints — Business Central

| Endpoint | OData Endpoint |
|----------|----------------|
| `/api/integrations/dynamics/bc/customers` | `/companies({id})/customers` |
| `/api/integrations/dynamics/bc/vendors` | `/companies({id})/vendors` |
| `/api/integrations/dynamics/bc/invoices` | `/companies({id})/salesInvoices` |
| `/api/integrations/dynamics/bc/push-invoice` | POST `/companies({id})/salesInvoices` |
| `/api/integrations/dynamics/bc/gl-entries` | `/companies({id})/generalLedgerEntries` |

### Endpoints — Dynamics 365 Sales (CRM)

| Endpoint | Dataverse API |
|----------|---------------|
| `/api/integrations/dynamics/crm/accounts` | `/api/data/v9.2/accounts` |
| `/api/integrations/dynamics/crm/opportunities` | `/api/data/v9.2/opportunities` |
| `/api/integrations/dynamics/crm/push-deal` | POST `/api/data/v9.2/opportunities` |

### Power Automate Webhook

```
POST /api/integrations/dynamics/webhook
Content-Type: application/json
X-MS-Workflow-Signature: {hmac-sha256}

{
  "trigger_type": "deal.created",
  "payload": { ... }
}
```

---

## 5. IFS Applications

**Kunder:** Saab, Volvo, Alfa Laval, Atlas Copco, Ericsson, BAE Systems

### Autentisering

```
IFS Cloud (2020+): OAuth2 via IFS Identity Provider
IFS Apps 10 (on-premise): API-nyckel eller Basic Auth
```

### Konfiguration

```json
{
  "provider": "ifs",
  "base_url": "https://your-ifs-instance.com",
  "auth_type": "api_key",
  "credentials": {
    "api_key": "...",
    "module_paths": {
      "customers": "/ifsapp/rest/v1/CustomerInfo",
      "invoices": "/ifsapp/rest/v1/CustomerInvoice",
      "orders": "/ifsapp/rest/v1/CustomerOrder"
    }
  },
  "settings": {
    "modules": ["customers", "invoices", "orders"],
    "sync_frequency": "hourly"
  }
}
```

---

## 6. Nordiska ERP-system (Jeeves, Monitor, Pyramid)

Alla tre använder en generisk sync-motor med konfigurerbar `module_paths`.

### Jeeves ERP

```
Används av: tillverkningsföretag i Norden
Auth: Basic Auth eller API-nyckel
Base URL: https://your-jeeves.company.com/api
```

### Monitor ERP

```
Används av: Tillverkande industri, SMB
Auth: API-nyckel (Monitor REST API)
Base URL: https://your-monitor.company.com/MonitorAPI
```

### Pyramid Business Studio

```
Används av: Handel, bygg, projekt
Auth: Basic Auth
Base URL: https://your-pyramid.company.com/pyramid
```

### Gemensam konfiguration

```json
POST /api/integrations
{
  "provider": "jeeves",        // eller "monitor", "pyramid"
  "name": "Jeeves Produktion",
  "base_url": "https://erp.company.com",
  "auth_type": "api_key",
  "credentials": { "api_key": "..." },
  "settings": {
    "modules": ["customers", "invoices"],
    "target_tables": {
      "customers": "companies",
      "invoices": "transactions"
    },
    "module_paths": {
      "customers": "/api/v1/customers",
      "invoices": "/api/v1/invoices"
    },
    "poll_endpoint": "/api/v1/changes"
  }
}
```

---

## 7. Sage & Infor

### Sage (Sage 200, Sage X3, Sage Business Cloud)

```
Auth: OAuth2 via Sage Network
Client ID/Secret: developer.sage.com → My Apps
Scopes: full_access
```

### Infor (Infor OS / CloudSuite)

```
Auth: OAuth2 via Infor OS Identity Provider
Scopes: infor.api
IFS-liknande konfiguration med module_paths
```

---

## 8. Generisk Integration (Webhook & Polling)

### Webhook-mottagare

```
POST /api/integrations/webhook/{integration_id}
Content-Type: application/json
X-Webhook-Signature: sha256={hmac-signature}

{
  "object_type": "customer",    // customer | invoice | contact | transaction
  "id": "EXT-12345",
  "name": "Acme Corp",
  ...
}
```

**Signaturvalidering:**
```
HMAC-SHA256(secret, JSON.stringify(body)) == X-Webhook-Signature
```

### REST Polling

```
POST /api/integrations/{id}/poll

Hämtar bara poster ändrade sedan last_sync_at:
GET {base_url}{poll_endpoint}?updated_after={last_sync_at}&limit=500

Returerar: { polled: 87, created: 12, updated: 75, failed: 0 }
```

### Zapier / Make.com Triggers

```
POST /api/integrations/zapier/trigger
{
  "event": "deal.won",     // deal.created | deal.won | task.completed | invoice.paid | nc.opened | nc.closed
  "payload": { "deal_id": "uuid", "value": 125000, "currency": "SEK" }
}
```

Registrera en Zapier-hook:
```
POST /api/integrations/webhooks
{
  "name": "Zapier - Deal Won",
  "url": "https://hooks.zapier.com/hooks/catch/12345/abcde/",
  "events": ["deal.won", "deal.created"],
  "secret": "optional-hmac-secret"
}
```

---

## 9. Databas & Schema

```sql
-- Kör efter 30_decision_intelligence.sql
\i sql/31_integrations_schema.sql
```

### Tabeller

| Tabell | Beskrivning |
|--------|-------------|
| `integration_configs` | En rad per provider/org — lagrar auth och inställningar |
| `integration_sync_log` | Immutabel logg av alla synk-körningar |
| `integration_field_mappings` | Fält-för-fält kartläggning source → target |
| `integration_webhooks` | Utgående webhook-registreringar |
| `integration_provider_catalogue` | Read-only lista av stödda providers (seed) |

### Säkerhet

- `credentials JSONB` bör krypteras med `pgcrypto` eller Supabase Vault
- Row Level Security aktiverat — org-members kan läsa, org-admins kan skriva
- Webhook-signaturer valideras med `crypto.timingSafeEqual`

---

## 10. Fältkartläggning

### Konfigurera via API

```bash
# Lägg till kartläggning
POST /api/integrations/{id}/mapping
{
  "source_object": "Customer",
  "source_field": "AccountName",
  "target_table": "companies",
  "target_field": "name",
  "transform": "trim",
  "required": true
}

# Hämta alla kartläggningar
GET /api/integrations/{id}/mapping
```

### Tillgängliga transforms

| Transform | Effekt |
|-----------|--------|
| `trim` | Tar bort whitespace i början/slutet |
| `uppercase` | Konverterar till versaler |
| `lowercase` | Konverterar till gemener |
| `date_format` | Konverterar till ISO 8601 (YYYY-MM-DD) |
| `boolean` | `Boolean(value)` |
| `number` | `Number(value)` |

### Vanliga kartläggningar — SAP Kund → pixdrift Company

| SAP-fält | pixdrift-tabell | pixdrift-fält | Transform |
|----------|-----------------|---------------|-----------|
| `BusinessPartnerFullName` | `companies` | `name` | `trim` |
| `TaxNumber1` | `companies` | `vat_number` | — |
| `BusinessPartner` | `companies` | `external_id` | — |
| `SearchTerm1` | `companies` | `short_name` | `uppercase` |

---

## 11. Conflict Resolution-strategi

```
pixdrift VINNER för:           SAP/ERP VINNER för:
───────────────────────        ──────────────────────────────
- Operationsdata               - Finansiell masterdata
- Tasks & aktiviteter          - GL-kontoplan
- NC-avvikelser                - Kostnadscenter
- Kompetensdata                - Officiella kundnummer
- Projektdata                  - Valutakurser
- Kommentarer                  - Skattenummer/VAT
```

**Implementation i `sap/sync`:**

```typescript
// Kund-sync: uppdaterar bara finansiella fält från SAP
await supabase.from('companies').update({
  vat_number: bp.TaxNumber1,          // ← SAP vinner
  // name, contact etc. berörs inte   // ← pixdrift behåller
  updated_at: new Date().toISOString()
}).eq('id', existing.id);
```

---

## 12. API-nycklar & Licenskrav

### SAP

| Krav | Var |
|------|-----|
| SAP BTP Account | account.sap.com |
| Client ID + Secret | SAP BTP Cockpit → Security → OAuth2 Clients |
| SAP API Hub-åtkomst | api.sap.com |
| S/4HANA system-URL | Din SAP-administratör |

### Oracle NetSuite

| Krav | Var |
|------|-----|
| NetSuite Account ID | Setup → Company → Company Information |
| Consumer Key/Secret | Setup → Integrations → Manage Integrations |
| Token Key/Secret | Setup → Users/Roles → Access Tokens |

### Microsoft Dynamics 365

| Krav | Var |
|------|-----|
| Azure Tenant ID | portal.azure.com → Azure Active Directory |
| Client ID | App Registration → Application (client) ID |
| Client Secret | App Registration → Certificates & secrets |
| BC Company ID | Business Central → Company Information |

### IFS, Jeeves, Monitor, Pyramid

Kontakta din systemleverantör för API-åtkomst. Kräver normalt:
- Separat API-modul/licens
- Nätverksåtkomst (IP-whitelist om on-premise)
- API-nyckel eller service account

---

## 13. Säkerhet

### Credential-hantering

```
1. credentials JSONB lagras krypterat (rekommenderas: Supabase Vault)
2. Access tokens roteras automatiskt via refresh_token
3. Credentials exponeras aldrig i API-svar (SELECT exkluderar credentials)
```

### Webhook-validering

```typescript
// HMAC-SHA256 timing-safe comparison
const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
```

### Row Level Security

```sql
-- Org-members kan läsa; org-admins kan skriva
-- Se sql/31_integrations_schema.sql för fullständiga RLS-policies
```

### Nätverkssäkerhet

- Alla API-anrop sker server-side (inga credentials i frontend)
- HTTPS obligatoriskt för alla externa endpoints
- IP-whitelist rekommenderas för on-premise SAP/IFS-system

---

## Slutsummering

| System | Endpoints | Auth | Synk-riktning |
|--------|-----------|------|---------------|
| SAP S/4HANA | 14 | OAuth2 / SAP_RFC | Bidirektionell |
| SAP SuccessFactors | 2 | OAuth2 | Bidirektionell |
| SAP IDoc/BAPI | 2 | — | Inbound + Proxy |
| Oracle NetSuite | 9 | OAuth2 / TBA | Bidirektionell |
| Dynamics 365 BC | 5 | Azure AD OAuth2 | Bidirektionell |
| Dynamics 365 Sales | 3 | Azure AD OAuth2 | Bidirektionell |
| Power Automate | 1 | Webhook | Inbound |
| IFS | 2 | OAuth2 / API-Key | Bidirektionell |
| Jeeves ERP | 2 | API-Key / Basic | Bidirektionell |
| Monitor ERP | 2 | API-Key / Basic | Bidirektionell |
| Pyramid | 2 | API-Key / Basic | Bidirektionell |
| Sage | 2 | OAuth2 | Bidirektionell |
| Infor | 2 | OAuth2 | Bidirektionell |
| Generisk Webhook | 3 | HMAC | Inbound |
| Zapier/Make | 3 | API-Key | Outbound |
| REST Polling | 1 | Konfigurerbar | Inbound |

**Totalt: 55 endpoints, 25 system täckta.**
