import { Supplier, PurchaseOrder, Contract, ApprovalRequest } from './types'

// ─── Leverantörer — verkliga leverantörer, inga fejkade belopp ───────────────
export const SUPPLIERS: Supplier[] = [
  { id: 's1',  name: 'AWS',        category: 'Infrastruktur', country: 'USA',     contact: 'aws-support@amazon.com',   email: 'billing@amazon.com',         status: 'aktiv' },
  { id: 's2',  name: 'Supabase',   category: 'Tech/SaaS',     country: 'USA',     contact: 'support@supabase.io',      email: 'billing@supabase.io',        status: 'aktiv' },
  { id: 's3',  name: 'Cloudflare', category: 'Infrastruktur', country: 'USA',     contact: 'support@cloudflare.com',   email: 'billing@cloudflare.com',     status: 'aktiv' },
  { id: 's4',  name: 'Stripe',     category: 'Tech/SaaS',     country: 'USA',     contact: 'support@stripe.com',       email: 'billing@stripe.com',         status: 'aktiv' },
  { id: 's5',  name: 'Revolut',    category: 'Tech/SaaS',     country: 'UK',      contact: 'support@revolut.com',      email: 'business@revolut.com',       status: 'aktiv' },
  { id: 's6',  name: 'Loopia',     category: 'Infrastruktur', country: 'Sverige', contact: 'support@loopia.se',        email: 'faktura@loopia.se',          status: 'aktiv' },
  { id: 's7',  name: '46elks',     category: 'Tech/SaaS',     country: 'Sverige', contact: 'hello@46elks.com',         email: 'billing@46elks.com',         status: 'aktiv' },
  { id: 's8',  name: 'Twilio',     category: 'Tech/SaaS',     country: 'USA',     contact: 'help@twilio.com',          email: 'billing@twilio.com',         status: 'inaktiv' },
  { id: 's9',  name: 'GitHub',     category: 'Tech/SaaS',     country: 'USA',     contact: 'support@github.com',       email: 'billing@github.com',         status: 'aktiv' },
  { id: 's10', name: 'Fortnox',    category: 'Redovisning',   country: 'Sverige', contact: 'support@fortnox.se',       email: 'faktura@fortnox.se',         status: 'aktiv' },
]

// ─── Inköpsordrar — tomma tills konfigurerat ─────────────────────────────────
// Registrera verkliga POs via procurement-modulen
export const PURCHASE_ORDERS: PurchaseOrder[] = []

// ─── Kontrakt — tomma tills konfigurerat ─────────────────────────────────────
// Registrera verkliga avtal via contracts-modulen
export const CONTRACTS: Contract[] = []

// ─── Godkännandeärenden — tomma tills konfigurerat ───────────────────────────
export const APPROVAL_REQUESTS: ApprovalRequest[] = []
