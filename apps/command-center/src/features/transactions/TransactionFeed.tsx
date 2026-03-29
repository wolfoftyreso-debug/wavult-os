import { useState } from 'react'
import { Download, Search, ChevronRight } from 'lucide-react'
import { TransactionDetail } from './TransactionDetail'

type TxStatus = 'paid' | 'pending' | 'overdue' | 'cancelled' | 'approved'
type TxType = 'invoice' | 'payment' | 'salary' | 'expense' | 'transfer' | 'intercompany'

interface Transaction {
  id: string
  date: string
  title: string
  counterparty: string
  entity: string
  type: TxType
  amount: number
  currency: string
  status: TxStatus
  category: string
  reference?: string
}

const TRANSACTIONS: Transaction[] = [
  // Intäkter
  { id: 'inv-1042', date: '2026-03-24', title: 'Faktura #1042 — Konsulttjänster', counterparty: 'Nacka Kommun', entity: 'Landvex AB', type: 'invoice', amount: 125000, currency: 'SEK', status: 'approved', category: 'Intäkt', reference: 'INV-2026-1042' },
  { id: 'inv-1041', date: '2026-03-15', title: 'Faktura #1041 — Abonnemang mars', counterparty: 'Värmdö Kommun', entity: 'Landvex AB', type: 'invoice', amount: 14900, currency: 'SEK', status: 'paid', category: 'Intäkt', reference: 'INV-2026-1041' },
  { id: 'inv-1040', date: '2026-03-10', title: 'Faktura #1040 — Optical Insight Q1', counterparty: 'Nacka Fastigheter AB', entity: 'Landvex AB', type: 'invoice', amount: 89500, currency: 'SEK', status: 'overdue', category: 'Intäkt', reference: 'INV-2026-1040' },

  // Kostnader
  { id: 'exp-0312', date: '2026-03-26', title: 'Löneutbetalning mars 2026', counterparty: 'Anställda', entity: 'Landvex AB', type: 'salary', amount: -160000, currency: 'SEK', status: 'paid', category: 'Lön' },
  { id: 'exp-0311', date: '2026-03-15', title: 'Thailand Workcamp — Förskott', counterparty: 'Nysa Hotel Bangkok', entity: 'Landvex AB', type: 'expense', amount: -45000, currency: 'SEK', status: 'paid', category: 'Resa & Event' },
  { id: 'exp-0310', date: '2026-03-01', title: 'AWS Infrastructure — mars', counterparty: 'Amazon Web Services', entity: 'Wavult Group', type: 'payment', amount: -18500, currency: 'SEK', status: 'paid', category: 'Infrastruktur' },
  { id: 'exp-0309', date: '2026-03-01', title: 'Cloudflare Pro — mars', counterparty: 'Cloudflare Inc', entity: 'Wavult Group', type: 'payment', amount: -2200, currency: 'SEK', status: 'paid', category: 'Infrastruktur' },
  { id: 'exp-0308', date: '2026-03-01', title: 'OpenClaw — mars', counterparty: 'OpenClaw Ltd', entity: 'Wavult Group', type: 'payment', amount: -10800, currency: 'SEK', status: 'paid', category: 'Mjukvara' },

  // Intercompany
  { id: 'ic-0302', date: '2026-03-31', title: 'IP Royalty Q1 2026', counterparty: 'Wavult Group FZCO', entity: 'Landvex AB', type: 'intercompany', amount: -12500, currency: 'SEK', status: 'pending', category: 'Intercompany', reference: 'IC-2026-0302' },
  { id: 'ic-0301', date: '2026-03-31', title: 'Management Fee Q1 2026', counterparty: 'DevOps FZCO', entity: 'Landvex AB', type: 'intercompany', amount: -15000, currency: 'SEK', status: 'pending', category: 'Intercompany', reference: 'IC-2026-0301' },

  // USD
  { id: 'usd-001', date: '2026-03-20', title: 'Northwest Agent Fee', counterparty: 'Northwest Registered Agent', entity: 'Landvex Inc', type: 'payment', amount: -3060, currency: 'USD', status: 'paid', category: 'Juridik' },
  { id: 'usd-002', date: '2026-03-28', title: 'Texas LLC Filing Fee', counterparty: 'Texas SOS / Northwest', entity: 'Landvex Inc', type: 'payment', amount: -3250, currency: 'USD', status: 'paid', category: 'Juridik', reference: 'TX-LLC-2026' },
  // ── Privatkortsutlägg (Erik) — ska redovisas och återbetalas av bolaget ──────
  { id: 'priv-001', date: '2026-03-14', title: 'Lovable Labs — kvitto #2784-4176', counterparty: 'Lovable Labs Inc', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'PRIV-KORT-001' },
  { id: 'priv-002', date: '2026-03-15', title: 'Lovable Labs — kvitto #2483-1641', counterparty: 'Lovable Labs Inc', entity: 'Wavult Group', type: 'expense', amount: -525, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'PRIV-KORT-002' },
  { id: 'priv-003', date: '2026-03-17', title: 'Lovable Labs — kvitto #2227-1266', counterparty: 'Lovable Labs Inc', entity: 'Wavult Group', type: 'expense', amount: -525, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'PRIV-KORT-003' },
  { id: 'priv-004', date: '2026-03-25', title: 'Stripe Atlas — QuiXzoom Inc bildningsavgift', counterparty: 'Stripe Atlas', entity: 'QuiXzoom Inc', type: 'payment', amount: -500, currency: 'USD', status: 'paid', category: 'Juridik', reference: 'STRIPE-ATLAS-1296-9493' },
  { id: 'priv-005', date: '2026-03-25', title: 'refurbed — Hårdvara/utrustning', counterparty: 'refurbed GmbH', entity: 'Wavult Group', type: 'expense', amount: -6500, currency: 'SEK', status: 'paid', category: 'Hårdvara', reference: 'REFURBED-17332832' },
  { id: 'priv-006', date: '2026-03-25', title: 'Duix — AI-tjänst kvitto #2077-2547', counterparty: 'Duix', entity: 'Wavult Group', type: 'payment', amount: -59, currency: 'USD', status: 'paid', category: 'Mjukvara', reference: 'DUIX-2077-2547' },
  { id: 'priv-007', date: '2026-03-25', title: 'Northwest — Landvex Inc agent fee', counterparty: 'Northwest Registered Agent LLC', entity: 'Landvex Inc', type: 'payment', amount: -3060, currency: 'USD', status: 'paid', category: 'Juridik', reference: 'NW-LANDVEX-TX' },

  // ── Gmail-kvitton (jan-mars 2026, wolfoftyreso@gmail.com) ─────────────────
  // Totalt: ~99 000 SEK i utgifter — privatkortsutlägg mot bolaget
  { id: 'gm-001', date: '2026-03-24', title: 'ElevenLabs — kvitto #2927-7762-7543', counterparty: 'Eleven Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -4331, currency: 'SEK', status: 'pending', category: 'AI-API', reference: 'EL-2927-7762-7543' },
  { id: 'gm-002', date: '2026-03-24', title: 'Cloudflare — mars faktura', counterparty: 'Cloudflare Inc.', entity: 'Wavult Group', type: 'payment', amount: -52, currency: 'SEK', status: 'paid', category: 'Infrastruktur', reference: 'CF-2026-03' },
  { id: 'gm-003', date: '2026-03-23', title: 'Resend — kvitto #2605-4700', counterparty: 'Resend Inc.', entity: 'Wavult Group', type: 'payment', amount: -210, currency: 'SEK', status: 'paid', category: 'Infrastruktur', reference: 'RESEND-2605-4700' },
  { id: 'gm-004', date: '2026-03-22', title: 'Anthropic (Claude) — kvitto #2700-9920-2183', counterparty: 'Anthropic PBC', entity: 'Wavult Group', type: 'payment', amount: -575, currency: 'SEK', status: 'paid', category: 'AI-API', reference: 'ANT-2700-9920-2183' },
  { id: 'gm-005', date: '2026-03-22', title: 'Anthropic (Claude) — kvitto #2977-4746-7231', counterparty: 'Anthropic PBC', entity: 'Wavult Group', type: 'payment', amount: -575, currency: 'SEK', status: 'paid', category: 'AI-API', reference: 'ANT-2977-4746-7231' },
  { id: 'gm-006', date: '2026-03-18', title: 'Anthropic (Claude) — kvitto #2649-4019-8991 (€137.68)', counterparty: 'Anthropic PBC', entity: 'Wavult Group', type: 'payment', amount: -1583, currency: 'SEK', status: 'paid', category: 'AI-API', reference: 'ANT-2649-4019-8991' },
  { id: 'gm-007', date: '2026-03-18', title: 'Anthropic (Claude) — kvitto #2414-0808-2047', counterparty: 'Anthropic PBC', entity: 'Wavult Group', type: 'payment', amount: -58, currency: 'SEK', status: 'paid', category: 'AI-API', reference: 'ANT-2414-0808-2047' },
  { id: 'gm-008', date: '2026-03-17', title: 'Lovable Labs — prenumeration mars (€2250)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -25875, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2692-8249' },
  { id: 'gm-009', date: '2026-03-13', title: 'Lovable Labs — kvitto #2059', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2059' },
  { id: 'gm-010', date: '2026-03-07', title: 'Lovable Labs — kvitto #2498-7560', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2498-7560' },
  { id: 'gm-011', date: '2026-03-05', title: 'Lovable Labs — kvitto #2336-2371 ($200)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2100, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2336-2371' },
  { id: 'gm-012', date: '2026-03-02', title: 'Anthropic (Claude) — kvitto #2516-6956-6564 (€90)', counterparty: 'Anthropic PBC', entity: 'Wavult Group', type: 'payment', amount: -1035, currency: 'SEK', status: 'paid', category: 'AI-API', reference: 'ANT-2516-6956-6564' },
  { id: 'gm-013', date: '2026-03-03', title: 'Lovable Labs — kvitto #2321-9404', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2321-9404' },
  { id: 'gm-014', date: '2026-02-22', title: 'Lovable Labs — kvitto #2474-2121 ($500)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -5250, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2474-2121' },
  { id: 'gm-015', date: '2026-02-17', title: 'Lovable Labs — kvitto #2492-0515 ($300)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -3150, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2492-0515' },
  { id: 'gm-016', date: '2026-02-17', title: 'ElevenLabs — kvitto #2565-4316-6895 ($412.50)', counterparty: 'Eleven Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -4331, currency: 'SEK', status: 'pending', category: 'AI-API', reference: 'EL-2565-4316-6895' },
  { id: 'gm-017', date: '2026-02-10', title: 'Lovable Labs — kvitto #2179-4046 ($200)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2100, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2179-4046' },
  { id: 'gm-018', date: '2026-02-09', title: 'Lovable Labs — kvitto #2061 (€300)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -3450, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2061' },
  { id: 'gm-019', date: '2026-02-07', title: 'Lovable Labs — kvitto #2528 (€300)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -3450, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2528' },
  { id: 'gm-020', date: '2026-02-07', title: 'Resend — kvitto #2185-1140', counterparty: 'Resend Inc.', entity: 'Wavult Group', type: 'payment', amount: -210, currency: 'SEK', status: 'paid', category: 'Infrastruktur', reference: 'RESEND-2185-1140' },
  { id: 'gm-021', date: '2026-02-06', title: 'Lovable Labs — kvitto #2570 ($200)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2100, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2570' },
  { id: 'gm-022', date: '2026-02-01', title: 'Lovable Labs — kvitto #2047-8960 ($200)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2100, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2047-8960' },
  { id: 'gm-023', date: '2026-01-31', title: 'Lovable Labs — kvitto #2719 (€205)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2358, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2719' },
  { id: 'gm-024', date: '2026-01-29', title: 'ElevenLabs — kvitto #2230-6582-3448 ($123.75)', counterparty: 'Eleven Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1299, currency: 'SEK', status: 'pending', category: 'AI-API', reference: 'EL-2230-6582-3448' },
  { id: 'gm-025', date: '2026-01-29', title: 'Lovable Labs — kvitto #2814-5350 ($200)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2100, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2814-5350' },
  { id: 'gm-026', date: '2026-01-25', title: 'Lovable Labs — kvitto #2783-8231 ($100)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2783-8231' },
  { id: 'gm-027', date: '2026-01-24', title: 'ElevenLabs — kvitto #2951-9078-9997 ($13.75)', counterparty: 'Eleven Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -144, currency: 'SEK', status: 'pending', category: 'AI-API', reference: 'EL-2951-9078-9997' },
  { id: 'gm-028', date: '2026-01-19', title: 'Lovable Labs — kvitto #2235 ($400)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -4200, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2235' },
  { id: 'gm-029', date: '2026-01-18', title: 'Lovable Labs — kvitto #2827-1362 (€920)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -10580, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2827-1362' },
  { id: 'gm-030', date: '2026-01-17', title: 'Lovable Labs — kvitto #2734 ($100)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2734' },
  { id: 'gm-031', date: '2026-01-14', title: 'Lovable Labs — kvitto #2074-0849 ($100)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2074-0849' },
  { id: 'gm-032', date: '2026-01-12', title: 'Lovable Labs — kvitto #2056 ($100)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2056' },
  { id: 'gm-033', date: '2026-01-11', title: 'Lovable Labs — kvitto #2833-8347 ($50)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -525, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2833-8347' },
  { id: 'gm-034', date: '2026-01-09', title: 'Lovable Labs — kvitto #2072 ($100)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2072' },
  { id: 'gm-035', date: '2026-01-03', title: 'Lovable Labs — kvitto #2732 ($200)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2100, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2732' },
  // ── Historiska utgifter (maj 2025 – dec 2025, Gmail scan) ────────────────
  // Apple — hårdvara och prenumerationer
  { id: 'hist-001', date: '2025-09-22', title: 'Apple Watch Series 11 / Apple Watch', counterparty: 'Apple Inc.', entity: 'Wavult Group', type: 'expense', amount: -4995, currency: 'SEK', status: 'pending', category: 'Hårdvara', reference: 'APPLE-2025-09-22' },
  { id: 'hist-002', date: '2025-09-24', title: 'Apple AirPods Pro 3', counterparty: 'Apple Inc.', entity: 'Wavult Group', type: 'expense', amount: -2995, currency: 'SEK', status: 'pending', category: 'Hårdvara', reference: 'APPLE-2025-09-24' },
  { id: 'hist-003', date: '2025-10-22', title: 'MacBook Pro 14" M4', counterparty: 'Apple Inc.', entity: 'Wavult Group', type: 'expense', amount: -20995, currency: 'SEK', status: 'pending', category: 'Hårdvara', reference: 'APPLE-2025-10-22' },
  { id: 'hist-004', date: '2026-03-11', title: 'Apple iCloud — prenumeration', counterparty: 'Apple Inc.', entity: 'Wavult Group', type: 'payment', amount: -129, currency: 'SEK', status: 'paid', category: 'Infrastruktur', reference: 'APPLE-ICLOUD-2026-03' },
  // Lovable Labs — dec 2025
  { id: 'hist-005', date: '2025-12-13', title: 'Lovable Labs — kvitto #2734 (€100)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1150, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2734-DEC' },
  { id: 'hist-006', date: '2025-12-14', title: 'Lovable Labs — kvitto #2083 (€380)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -4370, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2083-DEC' },
  { id: 'hist-007', date: '2025-12-22', title: 'Lovable Labs — kvitto #2296 (€225)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2588, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2296-DEC' },
  { id: 'hist-008', date: '2025-12-26', title: 'Lovable Labs — kvitto #2098 (€215)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -2473, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2098-DEC' },
  { id: 'hist-009', date: '2025-12-29', title: 'Lovable Labs — kvitto #2185 (€1330)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -15295, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2185-DEC' },
  { id: 'hist-010', date: '2025-12-31', title: 'Lovable Labs — kvitto #2238 ($50)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -525, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2238-DEC' },
  // Lovable Labs — feb 2026 extra (ej inlagda tidigare)
  { id: 'hist-011', date: '2026-02-01', title: 'Lovable Labs — kvitto #2068 (€1125)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -12938, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2068-FEB' },
  { id: 'hist-012', date: '2026-02-13', title: 'Lovable Labs — prenumeration feb (€2250)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -25875, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2494-FEB' },
  { id: 'hist-013', date: '2026-02-15', title: 'Lovable Labs — kvitto #2605 ($100)', counterparty: 'Lovable Labs Inc.', entity: 'Wavult Group', type: 'expense', amount: -1050, currency: 'SEK', status: 'pending', category: 'Mjukvara', reference: 'LOV-2605-FEB' },

]

const STATUS_LABELS: Record<TxStatus, { label: string; color: string; bg: string }> = {
  paid:      { label: 'Betald',     color: '#374151', bg: '#F3F4F6' },
  approved:  { label: 'Godkänd',   color: '#374151', bg: '#F3F4F6' },
  pending:   { label: 'Väntande',  color: '#92400E', bg: '#FEF3C7' },
  overdue:   { label: 'Förfallen', color: '#991B1B', bg: '#FEE2E2' },
  cancelled: { label: 'Annullerad', color: '#6B7280', bg: '#F9FAFB' },
}

const TYPE_LABELS: Record<TxType, string> = {
  invoice:      'Faktura',
  payment:      'Betalning',
  salary:       'Lön',
  expense:      'Utlägg',
  transfer:     'Överföring',
  intercompany: 'Intercompany',
}

const ENTITIES = ['Alla', 'Landvex AB', 'Landvex Inc', 'Wavult Group', 'QuiXzoom UAB', 'QuiXzoom Inc']
const CATEGORIES = ['Alla', 'Intäkt', 'Lön', 'Infrastruktur', 'Mjukvara', 'AI-API', 'Intercompany', 'Juridik', 'Resa & Event', 'Hårdvara']

export function TransactionFeed() {
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('Alla')
  const [categoryFilter, setCategoryFilter] = useState('Alla')
  const [selectedTx, setSelectedTx] = useState<string | null>(null)

  const filtered = TRANSACTIONS.filter(tx => {
    const matchSearch = !search ||
      tx.title.toLowerCase().includes(search.toLowerCase()) ||
      tx.counterparty.toLowerCase().includes(search.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(search.toLowerCase())
    const matchEntity = entityFilter === 'Alla' || tx.entity === entityFilter
    const matchCat = categoryFilter === 'Alla' || tx.category === categoryFilter
    return matchSearch && matchEntity && matchCat
  })

  const totalIn = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)

  function formatAmount(amount: number, currency: string): string {
    const abs = Math.abs(amount)
    const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(0)} k` : abs.toString()
    return `${amount > 0 ? '+' : '-'}${formatted} ${currency}`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2F2F7' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Transaktioner</h2>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Koncernredovisning — alla bolag</div>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
            background: '#F9FAFB', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            <Download style={{ width: 14, height: 14 }} />
            Exportera
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Inkomster (filtrerat)', value: `+${(totalIn / 1000).toFixed(0)}k SEK`, sub: `${filtered.filter(t => t.amount > 0).length} transaktioner` },
            { label: 'Utgifter (filtrerat)', value: `-${Math.abs(totalOut / 1000).toFixed(0)}k SEK`, sub: `${filtered.filter(t => t.amount < 0).length} transaktioner` },
            { label: 'Netto', value: `${((totalIn + totalOut) / 1000).toFixed(0)}k SEK`, sub: 'Balans' },
          ].map(card => (
            <div key={card.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', fontFamily: 'monospace' }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök på namn, motpart eller referens..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 14, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontFamily: 'system-ui', boxSizing: 'border-box' }}
            />
          </div>
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, color: '#374151', background: '#FFFFFF' }}>
            {ENTITIES.map(e => <option key={e}>{e}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, color: '#374151', background: '#FFFFFF' }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0 }}>
              {['Datum', 'Referens', 'Beskrivning', 'Motpart', 'Bolag', 'Typ', 'Belopp', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx, i) => {
              const s = STATUS_LABELS[tx.status]
              return (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx.id)}
                  style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F0F0F5')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA')}
                >
                  <td style={{ padding: '12px 16px', color: '#6B7280', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ padding: '12px 16px', color: '#9CA3AF', fontFamily: 'monospace', fontSize: 11 }}>{tx.reference || '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1C1C1E', maxWidth: 240 }}>{tx.title}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>{tx.counterparty}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: '#F3F4F6', color: '#374151', borderRadius: 6, fontWeight: 500 }}>{tx.entity}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>{TYPE_LABELS[tx.type]}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: tx.amount > 0 ? '#374151' : '#1C1C1E', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {formatAmount(tx.amount, tx.currency)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <ChevronRight style={{ width: 14, height: 14, color: '#D1D5DB' }} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9CA3AF' }}>
            Inga transaktioner matchar filtret
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedTx && (
        <TransactionDetail
          transactionId={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  )
}
