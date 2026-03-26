// ─── Mock data for Reports & Analytics ───────────────────────────────────────

export interface EntityFinancials {
  id: string
  name: string
  shortName: string
  color: string
  country: string
  arr: number // Annual Recurring Revenue (SEK)
  cashPosition: number // SEK
  revenue: {
    jan: number; feb: number; mar: number; apr: number
    may: number; jun: number; jul: number; aug: number
    sep: number; oct: number; nov: number; dec: number
  }
  expenses: {
    jan: number; feb: number; mar: number; apr: number
    may: number; jun: number; jul: number; aug: number
    sep: number; oct: number; nov: number; dec: number
  }
  assets: number
  liabilities: number
  equity: number
  headcount: number
  monthlySalaryCost: number
}

export const ENTITY_FINANCIALS: EntityFinancials[] = [
  {
    id: 'wavult-group',
    name: 'Wavult Group (Konsoliderat)',
    shortName: 'Group',
    color: '#6C63FF',
    country: 'SE',
    arr: 4_200_000,
    cashPosition: 1_850_000,
    revenue:   { jan:180000, feb:195000, mar:210000, apr:220000, may:235000, jun:240000, jul:200000, aug:210000, sep:230000, oct:245000, nov:260000, dec:275000 },
    expenses:  { jan:160000, feb:165000, mar:170000, apr:175000, may:180000, jun:185000, jul:175000, aug:178000, sep:182000, oct:190000, nov:195000, dec:200000 },
    assets: 3_400_000,
    liabilities: 1_550_000,
    equity: 1_850_000,
    headcount: 7,
    monthlySalaryCost: 449_500,
  },
  {
    id: 'quixzoom',
    name: 'QuixZoom AB',
    shortName: 'QZoom',
    color: '#00C2FF',
    country: 'SE',
    arr: 1_200_000,
    cashPosition: 450_000,
    revenue:   { jan:40000, feb:45000, mar:50000, apr:55000, may:60000, jun:65000, jul:55000, aug:58000, sep:62000, oct:70000, nov:75000, dec:80000 },
    expenses:  { jan:55000, feb:57000, mar:60000, apr:62000, may:65000, jun:68000, jul:63000, aug:64000, sep:66000, oct:70000, nov:72000, dec:75000 },
    assets: 820_000,
    liabilities: 370_000,
    equity: 450_000,
    headcount: 2,
    monthlySalaryCost: 120_000,
  },
  {
    id: 'optical-insight',
    name: 'Optical Insight AB',
    shortName: 'OptIn',
    color: '#FF6B35',
    country: 'SE',
    arr: 800_000,
    cashPosition: 280_000,
    revenue:   { jan:25000, feb:28000, mar:32000, apr:35000, may:38000, jun:40000, jul:35000, aug:37000, sep:40000, oct:44000, nov:48000, dec:52000 },
    expenses:  { jan:38000, feb:39000, mar:40000, apr:41000, may:42000, jun:43000, jul:41000, aug:41000, sep:42000, oct:44000, nov:45000, dec:46000 },
    assets: 520_000,
    liabilities: 240_000,
    equity: 280_000,
    headcount: 2,
    monthlySalaryCost: 110_000,
  },
  {
    id: 'hypbit',
    name: 'Hypbit AB',
    shortName: 'Hypbit',
    color: '#4CAF50',
    country: 'SE',
    arr: 1_800_000,
    cashPosition: 720_000,
    revenue:   { jan:90000, feb:95000, mar:100000, apr:105000, may:110000, jun:112000, jul:90000, aug:95000, sep:100000, oct:108000, nov:115000, dec:120000 },
    expenses:  { jan:75000, feb:77000, mar:78000, apr:80000, may:82000, jun:83000, jul:79000, aug:80000, sep:82000, oct:85000, nov:87000, dec:90000 },
    assets: 1_200_000,
    liabilities: 480_000,
    equity: 720_000,
    headcount: 3,
    monthlySalaryCost: 219_500,
  },
  {
    id: 'quixom-ads',
    name: 'Quixom Ads LLC',
    shortName: 'QAds',
    color: '#FF4081',
    country: 'US',
    arr: 400_000,
    cashPosition: 400_000,
    revenue:   { jan:25000, feb:27000, mar:28000, apr:25000, may:27000, jun:23000, jul:20000, aug:20000, sep:28000, oct:23000, nov:22000, dec:23000 },
    expenses:  { jan:12000, feb:12000, mar:12000, apr:12000, may:11000, jun:11000, jul:12000, aug:13000, sep:12000, oct:11000, nov:11000, dec:14000 },
    assets: 860_000,
    liabilities: 460_000,
    equity: 400_000,
    headcount: 0,
    monthlySalaryCost: 0,
  },
]

export interface PipelineDeal {
  id: string
  name: string
  company: string
  product: string
  value: number // SEK
  stage: 'Prospekt' | 'Kvalificerad' | 'Demo' | 'Förhandling' | 'Stängd-Vann' | 'Stängd-Förlorad'
  probability: number // 0-100
  owner: string
  createdDate: string
  expectedClose: string
}

export const PIPELINE_DEALS: PipelineDeal[] = [
  { id: 'D001', name: 'Sthlm Fastigheter — AI-övervakning', company: 'Stockholm Fastigheter AB', product: 'Optical Insight', value: 480_000, stage: 'Förhandling', probability: 65, owner: 'Leon Russo', createdDate: '2026-01-15', expectedClose: '2026-04-30' },
  { id: 'D002', name: 'Trafikverket Pilot', company: 'Trafikverket', product: 'Optical Insight', value: 1_200_000, stage: 'Demo', probability: 40, owner: 'Erik Svensson', createdDate: '2026-02-01', expectedClose: '2026-06-30' },
  { id: 'D003', name: 'QuixZoom — Nordic Expansion', company: 'Freelancer Pool Nordic', product: 'QuixZoom', value: 360_000, stage: 'Kvalificerad', probability: 55, owner: 'Leon Russo', createdDate: '2026-02-10', expectedClose: '2026-05-15' },
  { id: 'D004', name: 'Hypbit SaaS — Bilverkstad', company: 'Bildoktorn Sverige AB', product: 'Hypbit OS', value: 144_000, stage: 'Stängd-Vann', probability: 100, owner: 'Johan Berglund', createdDate: '2026-01-05', expectedClose: '2026-03-01' },
  { id: 'D005', name: 'Göteborg Stad — Kameraanalys', company: 'Göteborgs Stad', product: 'Optical Insight', value: 2_400_000, stage: 'Prospekt', probability: 15, owner: 'Erik Svensson', createdDate: '2026-03-01', expectedClose: '2026-09-30' },
  { id: 'D006', name: 'Quixom Ads — Media Agency', company: 'Bonnier News', product: 'Quixom Ads', value: 600_000, stage: 'Demo', probability: 50, owner: 'Dennis Bjarnemark', createdDate: '2026-02-20', expectedClose: '2026-05-01' },
  { id: 'D007', name: 'Hypbit SaaS — Däckfirma', company: 'Däckmaster AB', product: 'Hypbit OS', value: 96_000, stage: 'Stängd-Förlorad', probability: 0, owner: 'Johan Berglund', createdDate: '2025-12-10', expectedClose: '2026-02-28' },
  { id: 'D008', name: 'QuixZoom — Försäkring', company: 'Folksam', product: 'QuixZoom', value: 900_000, stage: 'Kvalificerad', probability: 35, owner: 'Leon Russo', createdDate: '2026-03-05', expectedClose: '2026-07-01' },
]

export interface SalesActivity {
  owner: string
  calls: number
  emails: number
  meetings: number
  demos: number
  closedWon: number
  closedLost: number
  revenue: number
}

export const SALES_ACTIVITIES: SalesActivity[] = [
  { owner: 'Leon Russo', calls: 48, emails: 120, meetings: 18, demos: 8, closedWon: 3, closedLost: 1, revenue: 984_000 },
  { owner: 'Erik Svensson', calls: 22, emails: 65, meetings: 12, demos: 5, closedWon: 1, closedLost: 0, revenue: 1_200_000 },
  { owner: 'Johan Berglund', calls: 15, emails: 40, meetings: 8, demos: 4, closedWon: 2, closedLost: 2, revenue: 240_000 },
  { owner: 'Dennis Bjarnemark', calls: 12, emails: 55, meetings: 6, demos: 2, closedWon: 0, closedLost: 0, revenue: 0 },
]

export interface SystemMetrics {
  service: string
  uptime: number // percent
  deploysThisWeek: number
  apiErrorRate: number // percent
  avgResponseMs: number
}

export const SYSTEM_METRICS: SystemMetrics[] = [
  { service: 'Hypbit API', uptime: 99.7, deploysThisWeek: 4, apiErrorRate: 0.3, avgResponseMs: 142 },
  { service: 'QuixZoom Backend', uptime: 98.9, deploysThisWeek: 2, apiErrorRate: 0.8, avgResponseMs: 210 },
  { service: 'Optical Insight AI', uptime: 99.1, deploysThisWeek: 1, apiErrorRate: 0.5, avgResponseMs: 380 },
  { service: 'Wavult Command Center', uptime: 99.9, deploysThisWeek: 6, apiErrorRate: 0.1, avgResponseMs: 95 },
  { service: 'Auth Service', uptime: 100, deploysThisWeek: 0, apiErrorRate: 0.0, avgResponseMs: 45 },
]

export const ZOOMER_COUNT = 127 // number of active QuixZoom photographers

export interface CriticalItem {
  id: string
  type: 'legal' | 'compliance' | 'financial' | 'operational'
  severity: 'critical' | 'high' | 'medium'
  title: string
  description: string
  deadline?: string
  owner: string
}

export const CRITICAL_ITEMS: CriticalItem[] = [
  { id: 'C001', type: 'legal', severity: 'critical', title: 'Texas LLC — Registered Agent förnyelse', description: 'Annual registered agent fee due. Non-payment = dissolution.', deadline: '2026-04-15', owner: 'Dennis Bjarnemark' },
  { id: 'C002', type: 'compliance', severity: 'high', title: 'GDPR DPA — Optical Insight', description: 'Data Processing Agreement saknas för kommunkontrakt.', deadline: '2026-04-30', owner: 'Dennis Bjarnemark' },
  { id: 'C003', type: 'financial', severity: 'high', title: 'Bolagsverket årsredovisning', description: 'Hypbit AB — årsredovisning ska lämnas in.', deadline: '2026-06-30', owner: 'Winston Bjarnemark' },
  { id: 'C004', type: 'operational', severity: 'medium', title: 'Thailand Workcamp förberedelser', description: 'Hotellbokningar, reseförsäkringar och agenda klar senast 1 april.', deadline: '2026-04-01', owner: 'Erik Svensson' },
  { id: 'C005', type: 'compliance', severity: 'medium', title: 'ISO 27001 gap-analys', description: 'Krävs för enterprise-kundavtal med kommuner.', deadline: '2026-05-15', owner: 'Johan Berglund' },
]

export const NEXT_MILESTONES = [
  { date: '2026-04-01', label: 'Thailand-agenda klar' },
  { date: '2026-04-11', label: '🇹🇭 Thailand Workcamp startar' },
  { date: '2026-04-30', label: 'QuixZoom Nordic Beta — 500 zoomers' },
  { date: '2026-05-31', label: 'Optical Insight MVP till Trafikverket' },
  { date: '2026-06-30', label: 'Hypbit OS v3.0 release' },
  { date: '2026-09-30', label: 'Göteborg Stad-deal stängs (mål)' },
]
