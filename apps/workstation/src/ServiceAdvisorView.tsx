// ServiceAdvisorView.tsx — Exception management + reality control
// Designed for: service advisors, front-desk managers
// NOT for: mechanics (WorkerView), CEOs (OverviewView)
//
// Core principle: "Service advisors shouldn't manage bookings. They should manage reality."
//
// Role hierarchy:
// 1. Flow control             ← DEFAULT — show the flow, fix the flow
// 2. Handle exceptions        ← if something's wrong, fix it NOW
// 3. Idag                     ← timeline awareness

import { useState, useEffect } from 'react';
import MissingPartFlow from './MissingPartFlow';

// ─── Color system — same as Dashboard ──────────────────────────────────────────
const C = {
  bg:        "#F2F2F7",
  surface:   "#FFFFFF",
  border:    "#D1D1D6",
  text:      "#000000",
  secondary: "#8E8E93",
  tertiary:  "#C7C7CC",
  blue:      "#007AFF",
  green:     "#34C759",
  orange:    "#FF9500",
  red:       "#FF3B30",
  purple:    "#AF52DE",
  fill:      "#F2F2F7",
  separator: "rgba(60,60,67,0.29)",
};

const shadow = "0 1px 3px rgba(0,0,0,0.06)";

// ─── Exception type definitions ────────────────────────────────────────────────
const EXCEPTION_TYPES = {
  OVERDUE:          { icon: '⚠️', color: '#FF9500', label: 'Försenad' },
  MISSING_PARTS:    { icon: '❌', color: '#FF3B30', label: 'Del saknas' },
  CUSTOMER_WAITING: { icon: '👤', color: '#007AFF', label: 'Kund väntar' },
  WARRANTY_ISSUE:   { icon: '📋', color: '#AF52DE', label: 'Garantiärende' },
  ADDITIONAL_WORK:  { icon: '🔧', color: '#FF6B35', label: 'Tilläggsarbete' },
  LONG_WAIT:        { icon: '⏱',  color: '#FF9500', label: 'Lång väntan' },
  // Exit Capture deviations — soft PIX from customer experience
  EXIT_DEVIATION:   { icon: '📋', color: '#FF3B30', label: 'Kundreaktioner' },
} as const;

type ExceptionType = keyof typeof EXCEPTION_TYPES;

// ─── Data types ────────────────────────────────────────────────────────────────
interface Exception {
  id: string;
  type: ExceptionType;
  vehicle: string;
  reg?: string;
  description: string;
  since?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  resolved?: boolean;
  // Missing Part Protocol extras
  missingPartIncident?: {
    id: string;
    part_description: string;
    part_number?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_notified_at?: string;
    new_appointment_at?: string;
    compensation_type?: string;
    compensation_description?: string;
    part_eta?: string;
    part_arrived_at?: string;
    status: string;
    created_at: string;
  };
  bookedTime?: string;
}

interface WorkshopJob {
  id: string;
  time: string;
  vehicle: string;
  reg?: string;
  status: 'DONE' | 'IN_PROGRESS' | 'WAITING' | 'EXCEPTION';
  statusLabel: string;
  overdueMin?: number;
  exceptionType?: ExceptionType;
}

interface FlowStats {
  activeJobs: number;
  totalJobs: number;
  loadPct: number;
  freeSlot?: string;
}

// ─── Flow Control types ────────────────────────────────────────────────────────
interface MechanicLane {
  id: string;
  name: string;
  load_pct: number; // 0-100+
  jobs: FlowJob[];
  free_slot?: { from: string; to: string };
}

interface FlowJob {
  id: string;
  vehicle: string;
  reg: string;
  work_type: string;
  status: 'IN_PROGRESS' | 'NEXT' | 'PLANNED';
  progress_pct: number;
  scheduled_time: string;
  expected_end: string;
  is_delayed: boolean;
  delay_minutes: number;
  priority: 'normal' | 'high' | 'critical';
}

interface SystemSuggestion {
  type: 'MOVE_JOB' | 'REORDER' | 'BALANCE';
  description: string;
  from_mechanic: string;
  to_mechanic?: string;
  job_id: string;
  time_saved_minutes: number;
  confidence: number;
}

// ─── Work Order types ──────────────────────────────────────────────────────────
interface WorkOrderItem {
  id: string;
  reg: string;
  make: string;
  model: string;
  year: number;
  customer_name: string;
  customer_phone: string;
  work_type: string;
  description: string;
  mechanic_name: string;
  mechanic_initials: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  start_time: string;
  end_time: string;
  progress_pct: number;
  delay_minutes: number;
  flags: string[];
  estimated_revenue: number;
  intake_done: boolean;
}

// ─── Approval types ────────────────────────────────────────────────────────────
interface ApprovalItem {
  id: string;
  vehicle: string;
  reg: string;
  customer_name: string;
  customer_phone: string;
  mechanic_name: string;
  finding: string;
  extra_cost: number;
  extra_time: string;
  sent_at: string;
  wait_minutes: number;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  approval_channel?: string;
}

// ─── DMS types ────────────────────────────────────────────────────────────────
interface DmsVehicle {
  reg: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  owner_changes: number;
  registered_date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_since: string;
  last_visit: string;
  status: 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'BLOCKED';
  visit_history: { date: string; type: string; amount: number }[];
  lifetime_value: number;
  open_cases: number;
}

// ─── Demo data — shown when API unavailable ────────────────────────────────────
const DEMO_EXCEPTIONS: Exception[] = [
  {
    id: 'exc-1',
    type: 'OVERDUE',
    vehicle: 'Audi A6',
    reg: 'ABC 123',
    description: 'Försenad 45 min — kunden förväntar sig bilen kl 14:00',
    since: '45 min',
    severity: 'HIGH',
  },
  {
    id: 'exc-2',
    type: 'MISSING_PARTS',
    vehicle: 'VW Golf',
    reg: 'DEF 456',
    description: 'Bromsskiva saknas — jobb inbokat kl 13:00',
    since: '45 min',
    severity: 'HIGH',
    bookedTime: 'Idag kl 13:00',
    missingPartIncident: {
      id: 'demo-mpi-1',
      part_description: 'Bromsskiva bak',
      part_number: '1J0615301',
      customer_name: 'Maria Berg',
      customer_phone: '070-456 78 90',
      status: 'DETECTED',
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'exc-3',
    type: 'CUSTOMER_WAITING',
    vehicle: 'Volvo XC60',
    reg: 'GHI 789',
    description: 'Kunden väntar i väntrummet — ingen uppdatering på 40 min',
    since: '40 min',
    severity: 'MEDIUM',
  },
  // Exit Capture deviation — soft PIX from customer experience
  {
    id: 'exc-exit-1',
    type: 'EXIT_DEVIATION',
    vehicle: 'Audi A6',
    reg: 'ABC 123',
    description: '1 kund reagerade på försening — "Ja, det var ett problem" · Robin Björk',
    since: '30 min',
    severity: 'HIGH',
  },
];

const DEMO_FLOW: FlowStats = {
  activeJobs: 8,
  totalJobs: 12,
  loadPct: 78,
  freeSlot: '13:30–15:00',
};

const DEMO_TIMELINE: WorkshopJob[] = [
  {
    id: 'j-1',
    time: '08:00',
    vehicle: 'BMW 318',
    reg: 'JKL 012',
    status: 'DONE',
    statusLabel: 'Klar',
  },
  {
    id: 'j-2',
    time: '09:30',
    vehicle: 'Audi A6',
    reg: 'ABC 123',
    status: 'EXCEPTION',
    statusLabel: 'Pågående',
    overdueMin: 45,
    exceptionType: 'OVERDUE',
  },
  {
    id: 'j-3',
    time: '11:00',
    vehicle: 'Volvo XC60',
    reg: 'GHI 789',
    status: 'WAITING',
    statusLabel: 'Väntar kund',
    exceptionType: 'CUSTOMER_WAITING',
  },
  {
    id: 'j-4',
    time: '13:00',
    vehicle: 'VW Golf',
    reg: 'DEF 456',
    status: 'EXCEPTION',
    statusLabel: 'Del saknas',
    exceptionType: 'MISSING_PARTS',
  },
];

// ─── Flow Control demo data ────────────────────────────────────────────────────
const DEMO_LANES: MechanicLane[] = [
  {
    id: '1', name: 'Robin Björk', load_pct: 120,
    jobs: [
      { id: 'j1', vehicle: 'Audi A6', reg: 'ABC 123', work_type: 'Service + bromsar', status: 'IN_PROGRESS', progress_pct: 65, scheduled_time: '08:00', expected_end: '10:30', is_delayed: true, delay_minutes: 25, priority: 'high' },
      { id: 'j2', vehicle: 'BMW 320', reg: 'DEF 456', work_type: 'Service', status: 'NEXT', progress_pct: 0, scheduled_time: '11:00', expected_end: '13:00', is_delayed: false, delay_minutes: 0, priority: 'normal' },
      { id: 'j3', vehicle: 'VW Golf', reg: 'GHI 789', work_type: 'Bromsar', status: 'PLANNED', progress_pct: 0, scheduled_time: '14:30', expected_end: '16:00', is_delayed: false, delay_minutes: 0, priority: 'normal' },
    ],
  },
  {
    id: '2', name: 'Eric Karlsson', load_pct: 75,
    jobs: [
      { id: 'j4', vehicle: 'Volvo XC60', reg: 'JKL 012', work_type: 'Felsökning', status: 'IN_PROGRESS', progress_pct: 80, scheduled_time: '09:00', expected_end: '11:00', is_delayed: false, delay_minutes: 0, priority: 'normal' },
      { id: 'j5', vehicle: 'Kia Ceed', reg: 'MNO 345', work_type: 'Service', status: 'NEXT', progress_pct: 0, scheduled_time: '12:00', expected_end: '14:00', is_delayed: false, delay_minutes: 0, priority: 'normal' },
    ],
    free_slot: { from: '14:00', to: '16:00' },
  },
  {
    id: '3', name: 'Jonas Lindström', load_pct: 90,
    jobs: [
      { id: 'j6', vehicle: 'Mercedes C', reg: 'PQR 678', work_type: 'Service', status: 'IN_PROGRESS', progress_pct: 45, scheduled_time: '08:30', expected_end: '11:30', is_delayed: true, delay_minutes: 10, priority: 'normal' },
    ],
    free_slot: { from: '13:30', to: '15:00' },
  },
];

const DEMO_SUGGESTIONS: SystemSuggestion[] = [
  {
    type: 'MOVE_JOB',
    description: 'Flytta BMW 320 från Robin till Eric.\nRobin är överbelastad (120%). Eric har kapacitet.',
    from_mechanic: 'Robin Björk',
    to_mechanic: 'Eric Karlsson',
    job_id: 'j2',
    time_saved_minutes: 35,
    confidence: 87,
  },
];

// ─── Work Orders demo data ─────────────────────────────────────────────────────
const DEMO_WORK_ORDERS: WorkOrderItem[] = [
  { id: 'wo1', reg: 'ABC 123', make: 'Audi', model: 'A6', year: 2021, customer_name: 'Lars Nilsson', customer_phone: '070-123 45 67', work_type: 'Service + Bromsar', description: 'Oljebyte, bromsbelägg fram och bak, bromsvätskebyte', mechanic_name: 'Robin Björk', mechanic_initials: 'RB', status: 'IN_PROGRESS', priority: 'HIGH', start_time: '08:00', end_time: '10:30', progress_pct: 65, delay_minutes: 25, flags: ['CUSTOMER_WAITING'], estimated_revenue: 4500, intake_done: true },
  { id: 'wo2', reg: 'DEF 456', make: 'Volvo', model: 'XC60', year: 2022, customer_name: 'Anna Karlsson', customer_phone: '070-234 56 78', work_type: 'Felsökning', description: 'Motorvarningslampan lyser, P0301 och P0420', mechanic_name: 'Eric Karlsson', mechanic_initials: 'EK', status: 'IN_PROGRESS', priority: 'HIGH', start_time: '09:00', end_time: '11:00', progress_pct: 80, delay_minutes: 0, flags: [], estimated_revenue: 2200, intake_done: true },
  { id: 'wo3', reg: 'GHI 789', make: 'BMW', model: '320i', year: 2020, customer_name: 'Peter Svensson', customer_phone: '070-345 67 89', work_type: 'Service', description: 'Stor service, spark plugs, luftfilter, oljefilter', mechanic_name: 'Robin Björk', mechanic_initials: 'RB', status: 'WAITING', priority: 'MEDIUM', start_time: '11:00', end_time: '13:00', progress_pct: 0, delay_minutes: 0, flags: [], estimated_revenue: 3800, intake_done: false },
  { id: 'wo4', reg: 'JKL 012', make: 'VW', model: 'Golf', year: 2019, customer_name: 'Maria Berg', customer_phone: '070-456 78 90', work_type: 'Bromsar', description: 'Bromsskiva och bromsbelägg bak — del saknas', mechanic_name: 'Jonas Lindström', mechanic_initials: 'JL', status: 'BLOCKED', priority: 'HIGH', start_time: '13:00', end_time: '14:30', progress_pct: 0, delay_minutes: 0, flags: ['MISSING_PART'], estimated_revenue: 2900, intake_done: false },
  { id: 'wo5', reg: 'MNO 345', make: 'Kia', model: 'Ceed', year: 2023, customer_name: 'Johan Lindqvist', customer_phone: '070-567 89 01', work_type: 'Service', description: 'Intervallservice + däckbyte', mechanic_name: 'Eric Karlsson', mechanic_initials: 'EK', status: 'WAITING', priority: 'LOW', start_time: '12:00', end_time: '14:00', progress_pct: 0, delay_minutes: 0, flags: [], estimated_revenue: 3100, intake_done: false },
  { id: 'wo6', reg: 'PQR 678', make: 'Mercedes', model: 'C220', year: 2021, customer_name: 'Karin Larsson', customer_phone: '070-678 90 12', work_type: 'Service', description: 'Stor service A+B', mechanic_name: 'Jonas Lindström', mechanic_initials: 'JL', status: 'IN_PROGRESS', priority: 'MEDIUM', start_time: '08:30', end_time: '11:30', progress_pct: 45, delay_minutes: 10, flags: [], estimated_revenue: 5200, intake_done: true },
  { id: 'wo7', reg: 'STU 901', make: 'Volvo', model: 'V70', year: 2018, customer_name: 'Erik Holm', customer_phone: '070-789 01 23', work_type: 'Däck', description: 'Sommarhjul monteras', mechanic_name: 'Robin Björk', mechanic_initials: 'RB', status: 'COMPLETED', priority: 'LOW', start_time: '07:30', end_time: '08:30', progress_pct: 100, delay_minutes: 0, flags: [], estimated_revenue: 800, intake_done: true },
];

// ─── Approval demo data ────────────────────────────────────────────────────────
const DEMO_APPROVALS: ApprovalItem[] = [
  {
    id: 'ap1',
    vehicle: 'Audi A6',
    reg: 'ABC 123',
    customer_name: 'Lars Nilsson',
    customer_phone: '070-123 45 67',
    mechanic_name: 'Robin Björk',
    finding: 'Bromsskiva fram är under minimigränsen — måste bytas för att godkänna bilprovning.',
    extra_cost: 1850,
    extra_time: 'ca 45 min',
    sent_at: '09:15',
    wait_minutes: 15,
    status: 'PENDING',
  },
  {
    id: 'ap2',
    vehicle: 'VW Golf',
    reg: 'JKL 012',
    customer_name: 'Maria Berg',
    customer_phone: '070-456 78 90',
    mechanic_name: 'Jonas Lindström',
    finding: 'Drivaxeldamask höger är trasig — om ej åtgärdat sprids smuts in i axelleden.',
    extra_cost: 2400,
    extra_time: 'ca 1.5h',
    sent_at: '08:50',
    wait_minutes: 40,
    status: 'PENDING',
  },
  {
    id: 'ap3',
    vehicle: 'BMW 320i',
    reg: 'GHI 789',
    customer_name: 'Peter Svensson',
    customer_phone: '070-345 67 89',
    mechanic_name: 'Robin Björk',
    finding: 'Luftfilter + pollenfilter',
    extra_cost: 890,
    extra_time: 'ca 15 min',
    sent_at: '08:30',
    wait_minutes: 0,
    status: 'APPROVED',
    approval_channel: 'SMS',
  },
  {
    id: 'ap4',
    vehicle: 'Volvo XC60',
    reg: 'DEF 456',
    customer_name: 'Anna Karlsson',
    customer_phone: '070-234 56 78',
    mechanic_name: 'Eric Karlsson',
    finding: 'Vindrutetorkare',
    extra_cost: 450,
    extra_time: 'ca 10 min',
    sent_at: '09:05',
    wait_minutes: 0,
    status: 'APPROVED',
    approval_channel: 'portal',
  },
];

// ─── DMS demo data ─────────────────────────────────────────────────────────────
const DEMO_VEHICLES: DmsVehicle[] = [
  { reg: 'ABC 123', make: 'Audi', model: 'A6', year: 2021, vin: 'WAUZZZ4G7EN012345', owner_changes: 2, registered_date: '2021-03-15', customer_name: 'Lars Nilsson', customer_phone: '070-123 45 67', customer_email: 'lars@example.com', customer_since: '2022-03-10', last_visit: '2025-09-14', status: 'IN_PROGRESS', visit_history: [{ date: '2025-09-14', type: 'Service', amount: 3200 }, { date: '2025-03-01', type: 'Bromsar', amount: 2900 }, { date: '2024-10-12', type: 'Service', amount: 3100 }, { date: '2024-05-20', type: 'Däck', amount: 1200 }], lifetime_value: 25400, open_cases: 1 },
  { reg: 'DEF 456', make: 'Volvo', model: 'XC60', year: 2022, vin: 'YV1DZ8240N2345678', owner_changes: 1, registered_date: '2022-06-01', customer_name: 'Anna Karlsson', customer_phone: '070-234 56 78', customer_email: 'anna.k@example.com', customer_since: '2022-06-15', last_visit: '2025-02-20', status: 'IN_PROGRESS', visit_history: [{ date: '2025-02-20', type: 'Service', amount: 4100 }, { date: '2024-08-10', type: 'Däck', amount: 1800 }, { date: '2024-02-05', type: 'Service', amount: 3800 }], lifetime_value: 18200, open_cases: 1 },
  { reg: 'GHI 789', make: 'BMW', model: '320i', year: 2020, vin: 'WBA8E91020K123456', owner_changes: 1, registered_date: '2020-11-20', customer_name: 'Peter Svensson', customer_phone: '070-345 67 89', customer_email: 'p.svensson@example.com', customer_since: '2021-01-08', last_visit: '2025-04-14', status: 'WAITING', visit_history: [{ date: '2025-04-14', type: 'Service', amount: 5200 }, { date: '2024-10-22', type: 'Bromsar', amount: 3100 }, { date: '2024-04-15', type: 'Service', amount: 4800 }], lifetime_value: 31500, open_cases: 1 },
  { reg: 'JKL 012', make: 'VW', model: 'Golf', year: 2019, vin: 'WVWZZZ1KZAM123789', owner_changes: 3, registered_date: '2019-04-02', customer_name: 'Maria Berg', customer_phone: '070-456 78 90', customer_email: 'maria.b@example.com', customer_since: '2023-05-12', last_visit: '2025-01-10', status: 'BLOCKED', visit_history: [{ date: '2025-01-10', type: 'Service', amount: 2800 }, { date: '2024-06-30', type: 'Felsökning', amount: 1600 }], lifetime_value: 8400, open_cases: 1 },
  { reg: 'MNO 345', make: 'Kia', model: 'Ceed', year: 2023, vin: 'U5YHM81AAPN123456', owner_changes: 0, registered_date: '2023-01-15', customer_name: 'Johan Lindqvist', customer_phone: '070-567 89 01', customer_email: 'j.lindqvist@example.com', customer_since: '2023-01-20', last_visit: '2024-12-05', status: 'WAITING', visit_history: [{ date: '2024-12-05', type: 'Service', amount: 2400 }, { date: '2024-06-10', type: 'Däck', amount: 1400 }], lifetime_value: 6200, open_cases: 1 },
  { reg: 'PQR 678', make: 'Mercedes', model: 'C220', year: 2021, vin: 'WDD2050341R123456', owner_changes: 1, registered_date: '2021-07-28', customer_name: 'Karin Larsson', customer_phone: '070-678 90 12', customer_email: 'karin.l@example.com', customer_since: '2021-08-01', last_visit: '2025-03-22', status: 'IN_PROGRESS', visit_history: [{ date: '2025-03-22', type: 'Service', amount: 6800 }, { date: '2024-09-15', type: 'Service', amount: 7200 }, { date: '2024-03-10', type: 'Bromsar', amount: 3900 }], lifetime_value: 42300, open_cases: 1 },
  { reg: 'STU 901', make: 'Volvo', model: 'V70', year: 2018, vin: 'YV1SW6120J2345678', owner_changes: 4, registered_date: '2018-03-10', customer_name: 'Erik Holm', customer_phone: '070-789 01 23', customer_email: 'erik.holm@example.com', customer_since: '2020-11-15', last_visit: '2024-11-20', status: 'COMPLETED', visit_history: [{ date: '2024-11-20', type: 'Däck', amount: 800 }, { date: '2024-05-08', type: 'Service', amount: 3600 }, { date: '2023-11-15', type: 'Bromsar', amount: 2100 }], lifetime_value: 14800, open_cases: 0 },
];

// ─── Action button helpers ─────────────────────────────────────────────────────
function getActions(type: ExceptionType): { primary: string; secondary?: string } {
  switch (type) {
    case 'OVERDUE':
      return { primary: 'Kontakta kund', secondary: 'Prioritera till mekaniker' };
    case 'MISSING_PARTS':
      return { primary: 'Beställ del', secondary: 'Boka om' };
    case 'CUSTOMER_WAITING':
      return { primary: 'Skicka statusuppdatering', secondary: 'Ring kund' };
    case 'ADDITIONAL_WORK':
      return { primary: 'Godkänn', secondary: 'Avböj' };
    case 'WARRANTY_ISSUE':
      return { primary: 'Skicka till OEM', secondary: 'Eskalera' };
    case 'LONG_WAIT':
      return { primary: 'Kontakta kund', secondary: 'Erbjud kompensation' };
    case 'EXIT_DEVIATION':
      return { primary: 'Ring kund', secondary: 'RCA' };
    default:
      return { primary: 'Hantera' };
  }
}

// ─── Job status → icon ─────────────────────────────────────────────────────────
function jobStatusIcon(job: WorkshopJob): string {
  if (job.status === 'DONE') return '✅';
  if (job.status === 'IN_PROGRESS') return '🔄';
  if (job.status === 'WAITING') return '⏳';
  if (job.status === 'EXCEPTION' && job.exceptionType) {
    return EXCEPTION_TYPES[job.exceptionType].icon;
  }
  return '○';
}

function jobStatusColor(job: WorkshopJob): string {
  if (job.status === 'DONE') return C.green;
  if (job.status === 'IN_PROGRESS') return C.blue;
  if (job.status === 'WAITING') return C.secondary;
  if (job.status === 'EXCEPTION' && job.exceptionType) {
    return EXCEPTION_TYPES[job.exceptionType].color;
  }
  return C.tertiary;
}

// ─── Load color helpers ────────────────────────────────────────────────────────
const loadColor = (pct: number) =>
  pct > 100 ? C.red : pct > 85 ? C.orange : C.green;

const loadLabel = (pct: number) =>
  pct > 100 ? '🔴' : pct > 85 ? '🟡' : '🟢';

// ─── Job status color (for flow) ───────────────────────────────────────────────
const flowJobStatusColor = (job: FlowJob) =>
  job.is_delayed && job.delay_minutes > 30 ? C.red :
  job.is_delayed ? C.orange : C.green;

// ─── Load bar component ────────────────────────────────────────────────────────
function LoadBar({ pct }: { pct: number }) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const color = pct >= 90 ? C.red : pct >= 75 ? C.orange : C.green;
  return (
    <span style={{ letterSpacing: 1, color, fontFamily: 'monospace', fontSize: 14 }}>
      {'█'.repeat(filled)}
      <span style={{ color: C.tertiary }}>{'░'.repeat(empty)}</span>
    </span>
  );
}

// ─── Exception card ────────────────────────────────────────────────────────────
function ExceptionCard({
  exc,
  onAction,
}: {
  exc: Exception;
  onAction: (excId: string, action: string) => void;
}) {
  const def = EXCEPTION_TYPES[exc.type];
  const actions = getActions(exc.type);
  const isHighSeverity = exc.severity === 'HIGH';
  const [showMissingPartFlow, setShowMissingPartFlow] = useState(false);

  // ─── MISSING_PARTS: rich protocol card ──────────────────────────────────
  if (exc.type === 'MISSING_PARTS') {
    const mpi = exc.missingPartIncident;
    const customerInformed = !!mpi?.customer_notified_at;
    const partOrdered     = mpi?.status === 'ORDERED' || mpi?.status === 'CUSTOMER_NOTIFIED' || mpi?.status === 'RESCHEDULED' || mpi?.status === 'PART_ARRIVED' || mpi?.status === 'RESOLVED';
    const rescheduled     = !!mpi?.new_appointment_at;
    const compensated     = !!mpi?.compensation_type;
    const partArrived     = !!mpi?.part_arrived_at;

    // Determine protocol status badge
    let protocolBadge = { label: '🔴 ÅTGÄRD KRÄVS', color: C.red };
    if (exc.resolved || mpi?.status === 'RESOLVED') {
      protocolBadge = { label: '🟢 HANTERAT', color: C.green };
    } else if (partOrdered || customerInformed) {
      protocolBadge = { label: '🟡 HANTERAS', color: C.orange };
    }

    if (showMissingPartFlow && mpi) {
      return (
        <div style={{
          background: C.surface, borderRadius: 12, marginBottom: 10,
          boxShadow: shadow, borderLeft: `4px solid ${def.color}`,
          overflow: 'hidden',
        }}>
          <MissingPartFlow
            incident={{
              id: mpi.id,
              vehicle_reg: exc.reg || '',
              customer_name: mpi.customer_name,
              customer_phone: mpi.customer_phone,
              part_description: mpi.part_description,
              part_number: mpi.part_number,
              part_eta: mpi.part_eta,
              customer_notified_at: mpi.customer_notified_at,
              new_appointment_at: mpi.new_appointment_at,
              compensation_type: mpi.compensation_type,
              status: mpi.status,
              created_at: mpi.created_at,
            }}
            vehicleMake={exc.vehicle}
            bookedTime={exc.bookedTime}
            onComplete={() => {
              setShowMissingPartFlow(false);
              onAction(exc.id, 'resolved');
            }}
            onClose={() => setShowMissingPartFlow(false)}
          />
        </div>
      );
    }

    return (
      <div style={{
        background: C.surface, borderRadius: 12, padding: '14px 16px',
        marginBottom: 10, boxShadow: shadow, borderLeft: `4px solid ${def.color}`,
        opacity: exc.resolved ? 0.5 : 1, transition: 'opacity 0.2s',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>❌</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{exc.vehicle}</span>
            {exc.reg && (
              <span style={{
                fontSize: 11, fontWeight: 500, color: C.secondary,
                background: C.fill, borderRadius: 5, padding: '1px 6px',
              }}>
                {exc.reg}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: protocolBadge.color,
            letterSpacing: '0.02em',
          }}>
            {protocolBadge.label}
          </span>
        </div>

        {/* Part info */}
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 2 }}>
          {mpi?.part_description || exc.description}
        </div>
        {exc.bookedTime && (
          <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>
            Bokad: {exc.bookedTime}{mpi?.customer_name ? ` · ${mpi.customer_name}` : ''}
          </div>
        )}

        {/* Protocol checklist */}
        {mpi && (partOrdered || customerInformed || compensated || rescheduled) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {partOrdered && (
              <div style={{ fontSize: 12, color: C.green }}>
                ✅ Del beställd{mpi.part_eta ? ` · ETA: ${new Date(mpi.part_eta).toLocaleDateString('sv-SE')}` : ''}
              </div>
            )}
            {customerInformed ? (
              <div style={{ fontSize: 12, color: C.green }}>
                ✅ Kund informerad kl {new Date(mpi.customer_notified_at!).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>
                ⚠️ Kund EJ informerad
              </div>
            )}
            {compensated && (
              <div style={{ fontSize: 12, color: C.green }}>✅ {mpi.compensation_description || mpi.compensation_type} registrerad</div>
            )}
            {rescheduled ? (
              <div style={{ fontSize: 12, color: C.green }}>
                ✅ Ny tid: {new Date(mpi.new_appointment_at!).toLocaleString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            ) : partOrdered && (
              <div style={{ fontSize: 12, color: C.orange }}>⏳ Ny tid ej bokad</div>
            )}
            {partArrived && <div style={{ fontSize: 12, color: C.green }}>✅ Del anlänt</div>}
          </div>
        ) : !mpi && (
          <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginBottom: 10 }}>
            ⚠️ Kund EJ informerad · {exc.since ? `${exc.since} sedan detekterat` : ''}
          </div>
        )}

        {/* Action */}
        {!exc.resolved && (
          <div style={{ display: 'flex', gap: 8 }}>
            {mpi ? (
              <>
                {!rescheduled && partOrdered && (
                  <button
                    onClick={() => setShowMissingPartFlow(true)}
                    style={{
                      background: C.orange, color: '#FFF', border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', flex: 1,
                    }}
                  >
                    Slutför ombokning →
                  </button>
                )}
                {!partOrdered && (
                  <button
                    onClick={() => setShowMissingPartFlow(true)}
                    style={{
                      background: C.red, color: '#FFF', border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', flex: 1,
                    }}
                  >
                    Starta åtgärdsplan →
                  </button>
                )}
                {rescheduled && !exc.resolved && (
                  <button
                    onClick={() => onAction(exc.id, 'resolved')}
                    style={{
                      background: C.green, color: '#FFF', border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', flex: 1,
                    }}
                  >
                    Stäng ✓
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => onAction(exc.id, 'Starta åtgärdsplan')}
                style={{
                  background: C.red, color: '#FFF', border: 'none',
                  borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', flex: 1,
                }}
              >
                Starta åtgärdsplan →
              </button>
            )}
          </div>
        )}

        {exc.resolved && (
          <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>✅ Hanterad</div>
        )}
      </div>
    );
  }

  // ─── Default exception card ───────────────────────────────────────────────
  return (
    <div style={{
      background: C.surface,
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 10,
      boxShadow: shadow,
      borderLeft: `4px solid ${def.color}`,
      position: 'relative',
      opacity: exc.resolved ? 0.5 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{def.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.2px' }}>
              {exc.vehicle}
            </span>
            {exc.reg && (
              <span style={{
                fontSize: 11, fontWeight: 500, color: C.secondary,
                background: C.fill, borderRadius: 5, padding: '1px 6px',
              }}>
                {exc.reg}
              </span>
            )}
            {isHighSeverity && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#FFFFFF',
                background: def.color, borderRadius: 4, padding: '1px 6px',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                Brådskande
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: C.secondary, marginTop: 2, lineHeight: 1.4 }}>
            {exc.description}
          </div>
        </div>
      </div>

      {!exc.resolved && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onAction(exc.id, actions.primary)}
            style={{
              background: def.color, color: '#FFFFFF', border: 'none',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '-0.1px', flexShrink: 0,
            }}
          >
            {actions.primary}
          </button>
          {actions.secondary && (
            <button
              onClick={() => onAction(exc.id, actions.secondary!)}
              style={{
                background: 'transparent', color: def.color,
                border: `1.5px solid ${def.color}`, borderRadius: 8,
                padding: '7px 14px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', letterSpacing: '-0.1px', flexShrink: 0,
              }}
            >
              {actions.secondary}
            </button>
          )}
        </div>
      )}

      {exc.resolved && (
        <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>✅ Hanterad</div>
      )}
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, meta }: { label: string; meta?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: C.secondary,
      }}>
        {label}
      </span>
      {meta && (
        <span style={{ fontSize: 12, color: C.tertiary, fontWeight: 500 }}>{meta}</span>
      )}
    </div>
  );
}

// ─── Mechanic lane component ───────────────────────────────────────────────────
function MechanicLaneCmp({ mechanic, onMoveJob }: { mechanic: MechanicLane; onMoveJob: (jobId: string) => void }) {
  return (
    <div style={{
      background: C.surface,
      borderRadius: 14,
      marginBottom: 10,
      border: `0.5px solid ${mechanic.load_pct > 100 ? C.red + '40' : C.border}`,
      overflow: 'hidden',
    }}>
      {/* Mechanic header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: mechanic.load_pct > 100 ? '#FF3B3008' : C.surface,
        borderBottom: `0.5px solid ${C.separator}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: loadColor(mechanic.load_pct) + '20',
            border: `2px solid ${loadColor(mechanic.load_pct)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: loadColor(mechanic.load_pct),
          }}>
            {mechanic.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{mechanic.name}</div>
            <div style={{ fontSize: 11, color: C.secondary }}>{mechanic.jobs.length} jobb</div>
          </div>
        </div>

        {/* Load indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 60, height: 4, background: C.fill, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, mechanic.load_pct)}%`,
              background: loadColor(mechanic.load_pct),
              borderRadius: 2,
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: loadColor(mechanic.load_pct) }}>
            {loadLabel(mechanic.load_pct)} {mechanic.load_pct}%
          </span>
        </div>
      </div>

      {/* Jobs */}
      {mechanic.jobs.map((job: FlowJob, i: number) => (
        <div
          key={job.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            borderBottom: i < mechanic.jobs.length - 1 ? `0.5px solid ${C.fill}` : 'none',
            opacity: job.status === 'PLANNED' ? 0.6 : 1,
          }}
        >
          {/* Status dot + connector */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            flexShrink: 0, width: 16,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: job.status === 'IN_PROGRESS' ? C.blue :
                         job.status === 'NEXT' ? C.secondary : C.tertiary,
            }} />
            {i < mechanic.jobs.length - 1 && (
              <div style={{ width: 1, height: 20, background: C.separator, marginTop: 2 }} />
            )}
          </div>

          {/* Job info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2 }}>
              {job.vehicle} — {job.work_type}
            </div>
            <div style={{ fontSize: 11, color: C.secondary }}>{job.reg}</div>
          </div>

          {/* Progress bar (IN_PROGRESS only) */}
          {job.status === 'IN_PROGRESS' && (
            <div style={{ width: 60, flexShrink: 0 }}>
              <div style={{ height: 3, background: C.fill, borderRadius: 2, overflow: 'hidden', marginBottom: 2 }}>
                <div style={{
                  height: '100%', width: `${job.progress_pct}%`,
                  background: flowJobStatusColor(job), borderRadius: 2,
                }} />
              </div>
              <div style={{ fontSize: 10, color: C.secondary, textAlign: 'right' }}>
                {job.progress_pct}%
              </div>
            </div>
          )}

          {/* Time / delay badge */}
          <div style={{
            fontSize: 11,
            color: job.is_delayed ? flowJobStatusColor(job) : C.secondary,
            flexShrink: 0,
            fontWeight: job.is_delayed ? 600 : 400,
          }}>
            {job.status === 'IN_PROGRESS' ? (
              job.is_delayed ? `⚠️ +${job.delay_minutes}min` : '✓ I tid'
            ) : job.scheduled_time}
          </div>
        </div>
      ))}

      {/* Free slot */}
      {mechanic.free_slot && (
        <div style={{
          padding: '8px 16px',
          fontSize: 11, color: C.green,
          background: '#34C75908',
          borderTop: `0.5px solid ${C.fill}`,
        }}>
          ✓ Ledig: {mechanic.free_slot.from}–{mechanic.free_slot.to}
        </div>
      )}
    </div>
  );
}

// ─── System suggestion card ────────────────────────────────────────────────────
function SuggestionCard({
  suggestion,
  onAccept,
  onIgnore,
}: {
  suggestion: SystemSuggestion;
  onAccept: () => void;
  onIgnore: () => void;
}) {
  return (
    <div style={{
      background: '#FFF8E7',
      border: `0.5px solid ${C.orange}40`,
      borderRadius: 12, padding: '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 8 }}>
        ⚡ Systemförslag
      </div>
      <div style={{ fontSize: 14, color: '#4A3000', marginBottom: 12, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
        {suggestion.description}
        <br />
        <span style={{ fontSize: 12, color: C.secondary }}>
          → Sparar {suggestion.time_saved_minutes} min · {suggestion.confidence}% säkerhet
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onAccept}
          style={{
            flex: 1, height: 36, background: C.orange, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Acceptera
        </button>
        <button
          onClick={onIgnore}
          style={{
            flex: 1, height: 36, background: C.fill, color: C.secondary,
            border: 'none', borderRadius: 8, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Ignorera
        </button>
      </div>
    </div>
  );
}

// ─── Flow Control view ─────────────────────────────────────────────────────────
function FlowControlView({
  lanes,
  suggestions,
  onAcceptSuggestion,
  onIgnoreSuggestion,
  onMoveJob,
}: {
  lanes: MechanicLane[];
  suggestions: SystemSuggestion[];
  onAcceptSuggestion: (idx: number) => void;
  onIgnoreSuggestion: (idx: number) => void;
  onMoveJob: (jobId: string) => void;
}) {
  const avgLoad = Math.round(lanes.reduce((sum, l) => sum + l.load_pct, 0) / lanes.length);
  const overloaded = lanes.filter(l => l.load_pct > 100).length;
  const delayed = lanes.flatMap(l => l.jobs).filter(j => j.is_delayed).length;

  return (
    <div>
      {/* KPI strip */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14,
      }}>
        {[
          { label: 'Beläggning', value: `${avgLoad}%`, color: loadColor(avgLoad) },
          { label: 'Överbelastade', value: overloaded.toString(), color: overloaded > 0 ? C.red : C.green },
          { label: 'Försenade', value: delayed.toString(), color: delayed > 0 ? C.orange : C.green },
        ].map(kpi => (
          <div key={kpi.label} style={{
            flex: 1, background: C.surface, borderRadius: 12,
            padding: '10px 12px', boxShadow: shadow,
            border: `0.5px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: C.secondary, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Section header */}
      <SectionHeader label="Mekaniker / Flow" meta={`${lanes.length} mekaniker`} />

      {/* Mechanic lanes */}
      {lanes.map(lane => (
        <MechanicLaneCmp key={lane.id} mechanic={lane} onMoveJob={onMoveJob} />
      ))}

      {/* System suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{
            height: 1, background: C.separator, marginBottom: 14,
          }} />
          {suggestions.map((s, i) => (
            <SuggestionCard
              key={i}
              suggestion={s}
              onAccept={() => onAcceptSuggestion(i)}
              onIgnore={() => onIgnoreSuggestion(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Work Order List View ──────────────────────────────────────────────────────
function WorkOrderListView({ showToast }: { showToast: (msg: string) => void }) {
  const [filter, setFilter] = useState<'ALL' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'time' | 'mechanic' | 'priority' | 'revenue'>('time');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const statusOrder = { BLOCKED: 0, IN_PROGRESS: 1, WAITING: 2, COMPLETED: 3, CANCELLED: 4 };

  const filtered = DEMO_WORK_ORDERS
    .filter(wo => filter === 'ALL' || wo.status === filter)
    .sort((a, b) => {
      if (sortBy === 'time') return a.start_time.localeCompare(b.start_time);
      if (sortBy === 'mechanic') return a.mechanic_name.localeCompare(b.mechanic_name);
      if (sortBy === 'priority') return { HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority];
      if (sortBy === 'revenue') return b.estimated_revenue - a.estimated_revenue;
      return 0;
    });

  const groups = [
    { key: 'IN_PROGRESS', label: 'Pågående', emoji: '🔵' },
    { key: 'WAITING', label: 'Väntar', emoji: '⏳' },
    { key: 'BLOCKED', label: 'Blockerat', emoji: '🔴' },
    { key: 'COMPLETED', label: 'Klart', emoji: '✅' },
  ] as const;

  const totalRevenue = DEMO_WORK_ORDERS.reduce((s, wo) => s + wo.estimated_revenue, 0);
  const inProgress = DEMO_WORK_ORDERS.filter(wo => wo.status === 'IN_PROGRESS').length;
  const blocked = DEMO_WORK_ORDERS.filter(wo => wo.status === 'BLOCKED').length;

  const woStatusColor = (s: WorkOrderItem['status']) =>
    s === 'IN_PROGRESS' ? C.blue : s === 'BLOCKED' ? C.red : s === 'COMPLETED' ? C.green : C.secondary;

  const priorityColor = (p: WorkOrderItem['priority']) =>
    p === 'HIGH' ? C.red : p === 'MEDIUM' ? C.orange : C.secondary;

  const workDetails: Record<string, string[]> = {
    wo1: ['✓ Oljebyte', '✓ Bromsbelägg fram', '○ Bromsbelägg bak ← pågår', '○ Bromsvätskebyte'],
    wo2: ['✓ Felkodläsning (P0301, P0420)', '✓ Diagnos cylinder 1', '○ Katalysator kontroll', '○ Rapport till kund'],
    wo3: ['○ Motorolja + filter', '○ Tändstift (4 st)', '○ Luftfilter', '○ Pollenfilterbyte'],
    wo4: ['○ Bromsskiva bak vänster — del saknas', '○ Bromsskiva bak höger — del saknas', '○ Bromsbelägg bak'],
    wo5: ['○ Intervallservice olja', '○ Oljefilter', '○ Demontering vinterdäck', '○ Montering sommardäck', '○ Balansering'],
    wo6: ['✓ Service A (olja, filter)', '○ Service B (bromsvätskan, kylvätska)', '○ Kabinfilter', '○ Luftfilter'],
    wo7: ['✓ Demontering vinterdäck', '✓ Montering sommarhjul', '✓ Momentdragning', '✓ Tryck kontroll'],
  };

  const groupedOrders = (groupKey: string) =>
    filter === 'ALL'
      ? filtered.filter(wo => wo.status === groupKey)
      : filtered.filter(wo => wo.status === groupKey);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>
          Alla jobb idag
        </div>
        <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
              style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: C.text, fontFamily: 'inherit' }}
            >
              Filter {filter !== 'ALL' ? '•' : '▾'}
            </button>
            {showFilterMenu && (
              <div style={{ position: 'absolute', right: 0, top: 38, background: C.surface, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: `0.5px solid ${C.border}`, zIndex: 100, minWidth: 150, overflow: 'hidden' }}>
                {[['ALL', 'Alla'], ['IN_PROGRESS', 'Pågående'], ['WAITING', 'Väntar'], ['BLOCKED', 'Blockerat'], ['COMPLETED', 'Klart']].map(([k, l]) => (
                  <button key={k} onClick={() => { setFilter(k as typeof filter); setShowFilterMenu(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', background: filter === k ? C.blue + '10' : 'transparent', border: 'none', textAlign: 'left', fontSize: 14, color: filter === k ? C.blue : C.text, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filter === k ? 600 : 400 }}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
              style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: C.text, fontFamily: 'inherit' }}
            >
              Sortera ▾
            </button>
            {showSortMenu && (
              <div style={{ position: 'absolute', right: 0, top: 38, background: C.surface, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: `0.5px solid ${C.border}`, zIndex: 100, minWidth: 160, overflow: 'hidden' }}>
                {[['time', 'Tid'], ['mechanic', 'Mekaniker'], ['priority', 'Prioritet'], ['revenue', 'Omsättning']].map(([k, l]) => (
                  <button key={k} onClick={() => { setSortBy(k as typeof sortBy); setShowSortMenu(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', background: sortBy === k ? C.blue + '10' : 'transparent', border: 'none', textAlign: 'left', fontSize: 14, color: sortBy === k ? C.blue : C.text, cursor: 'pointer', fontFamily: 'inherit', fontWeight: sortBy === k ? 600 : 400 }}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{
        background: C.surface, borderRadius: 12, padding: '12px 16px',
        marginBottom: 16, border: `0.5px solid ${C.border}`, boxShadow: shadow,
        display: 'flex', gap: 20, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, color: C.secondary }}>
          <span style={{ fontWeight: 700, color: C.text }}>{DEMO_WORK_ORDERS.length}</span> jobb
        </span>
        <span style={{ fontSize: 13, color: C.secondary }}>
          <span style={{ fontWeight: 700, color: C.blue }}>{inProgress}</span> pågående
        </span>
        {blocked > 0 && (
          <span style={{ fontSize: 13, color: C.secondary }}>
            <span style={{ fontWeight: 700, color: C.red }}>{blocked}</span> blockerat
          </span>
        )}
        <span style={{ fontSize: 13, color: C.secondary }}>
          <span style={{ fontWeight: 700, color: C.green }}>{totalRevenue.toLocaleString('sv-SE')} kr</span> i dagens omsättning
        </span>
      </div>

      {/* Groups */}
      {groups.map(group => {
        const items = groupedOrders(group.key);
        if (filter !== 'ALL' && filter !== group.key) return null;
        if (items.length === 0 && filter === 'ALL') return null;

        return (
          <div key={group.key} style={{ marginBottom: 20 }}>
            {/* Group header */}
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: C.secondary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ flex: 1, height: 1, background: C.separator }} />
              {group.emoji} {group.label} ({items.length})
              <div style={{ flex: 1, height: 1, background: C.separator }} />
            </div>

            {/* Job cards */}
            {items.map(wo => {
              const isExpanded = expandedId === wo.id;
              const statusCol = woStatusColor(wo.status);

              return (
                <div key={wo.id} style={{
                  background: C.surface, borderRadius: 14,
                  marginBottom: 8, border: `0.5px solid ${C.border}`,
                  boxShadow: shadow, overflow: 'hidden',
                }}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : wo.id)}
                    style={{ padding: '12px 14px', cursor: 'pointer' }}
                  >
                    {/* Top line: status + vehicle + mechanic + delay */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusCol, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.2px' }}>
                        {wo.make} {wo.model} · <span style={{ fontSize: 13, fontWeight: 500, color: C.secondary }}>{wo.reg}</span>
                      </div>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: C.fill, border: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: C.secondary, flexShrink: 0,
                      }}>{wo.mechanic_initials}</div>
                      {wo.delay_minutes > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: wo.delay_minutes > 20 ? C.red : C.orange, flexShrink: 0 }}>
                          {wo.delay_minutes > 20 ? '🔴' : '🟡'} +{wo.delay_minutes}min
                        </span>
                      )}
                      {wo.delay_minutes === 0 && wo.status === 'IN_PROGRESS' && (
                        <span style={{ fontSize: 12, color: C.green, fontWeight: 600, flexShrink: 0 }}>✓ I tid</span>
                      )}
                    </div>

                    {/* Middle: customer + work type */}
                    <div style={{ marginLeft: 16, marginBottom: 6 }}>
                      <div style={{ fontSize: 13, color: C.secondary }}>{wo.customer_name} · {wo.customer_phone}</div>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginTop: 2 }}>{wo.work_type}</div>
                    </div>

                    {/* Progress bar (IN_PROGRESS) */}
                    {wo.status === 'IN_PROGRESS' && (
                      <div style={{ marginLeft: 16, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: C.fill, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${wo.progress_pct}%`, height: '100%', background: wo.delay_minutes > 0 ? C.orange : C.blue, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: C.secondary, fontWeight: 600, flexShrink: 0 }}>{wo.progress_pct}%</span>
                        </div>
                      </div>
                    )}

                    {/* Bottom: time + flags */}
                    <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: C.secondary }}>{wo.start_time}–{wo.end_time}</span>
                      {wo.flags.includes('CUSTOMER_WAITING') && (
                        <span style={{ fontSize: 11, background: C.blue + '15', color: C.blue, borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>👤 Kund väntar</span>
                      )}
                      {wo.flags.includes('MISSING_PART') && (
                        <span style={{ fontSize: 11, background: C.red + '15', color: C.red, borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>❌ Del saknas</span>
                      )}
                      {wo.status === 'COMPLETED' && (
                        <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✅ {wo.estimated_revenue.toLocaleString('sv-SE')} kr</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: isExpanded ? C.blue : C.tertiary }}>
                        {isExpanded ? '▲ Dölj' : '▼ Detaljer'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div style={{
                      borderTop: `0.5px solid ${C.separator}`,
                      padding: '14px 14px 14px 30px',
                      background: '#F8F8FA',
                    }}>
                      {/* Customer row */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: C.secondary, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kund</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{wo.customer_name} · {wo.customer_phone}</span>
                          <button onClick={() => showToast(`Ringer ${wo.customer_phone}`)} style={{ fontSize: 12, background: C.green, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Ring</button>
                          <button onClick={() => showToast(`SMS skickat till ${wo.customer_phone}`)} style={{ fontSize: 12, background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>SMS</button>
                        </div>
                      </div>

                      {/* Mechanic + timing */}
                      <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Mekaniker</div>
                          <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{wo.mechanic_name}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Start</div>
                          <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{wo.start_time}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Estimerat klart</div>
                          <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{wo.end_time}</div>
                        </div>
                        {wo.delay_minutes > 0 && (
                          <div>
                            <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Aktuellt</div>
                            <div style={{ fontSize: 14, color: C.red, fontWeight: 700 }}>+{wo.delay_minutes} min</div>
                          </div>
                        )}
                      </div>

                      {/* Work items */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: C.secondary, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Arbete</div>
                        {(workDetails[wo.id] || [wo.description]).map((item, i) => (
                          <div key={i} style={{ fontSize: 13, color: item.startsWith('✓') ? C.green : C.text, marginBottom: 3, fontWeight: item.startsWith('✓') ? 500 : 400 }}>{item}</div>
                        ))}
                      </div>

                      {/* Intake status */}
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 13, color: wo.intake_done ? C.green : C.orange, fontWeight: 600 }}>
                          {wo.intake_done ? '✓ Intagsprotokoll klart' : '○ Intagsprotokoll saknas'}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => showToast(`Kontaktar kund: ${wo.customer_name}`)} style={{ fontSize: 13, background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Kontakta kund</button>
                        <button onClick={() => showToast(`Prioriterat: ${wo.make} ${wo.model}`)} style={{ fontSize: 13, background: C.orange, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Prioritera</button>
                        <button onClick={() => showToast(`Flytta mekaniker — välj destination`)} style={{ fontSize: 13, background: C.fill, color: C.text, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Flytta mekaniker</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {items.length === 0 && filter !== 'ALL' && (
              <div style={{ padding: '20px', textAlign: 'center', color: C.secondary, fontSize: 14 }}>
                Inga jobb med status {group.label.toLowerCase()} idag
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Approval View ─────────────────────────────────────────────────────────────
function ApprovalView({ showToast }: { showToast: (msg: string) => void }) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(DEMO_APPROVALS);
  const [showHistory, setShowHistory] = useState(false);

  const pending = approvals.filter(a => a.status === 'PENDING');
  const done = approvals.filter(a => a.status !== 'PENDING');

  function handleRemind(id: string) {
    showToast('Påminnelse skickat via SMS');
  }
  function handleDecline(id: string) {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'DECLINED' as const } : a));
    showToast('Tilläggsarbete avböjt — mekaniker fortsätter utan');
  }
  function handleApprove(id: string) {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' as const, approval_channel: 'manuellt' } : a));
    showToast('Tilläggsarbete godkänt ✅');
  }

  const waitColor = (min: number) => min > 30 ? C.red : min > 15 ? C.orange : C.secondary;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>
          Tilläggsarbete
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{ fontSize: 13, background: C.fill, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: C.text, fontFamily: 'inherit', fontWeight: 500 }}
        >
          {showHistory ? 'Dölj historik' : 'Historik'}
        </button>
      </div>

      {/* Pending counter */}
      {pending.length > 0 && (
        <div style={{
          background: C.orange + '12', border: `1px solid ${C.orange}30`, borderRadius: 12,
          padding: '10px 14px', marginBottom: 16, fontSize: 14, fontWeight: 600, color: C.orange,
        }}>
          ⏳ {pending.length} väntar på godkännande
        </div>
      )}

      {pending.length === 0 && (
        <div style={{
          background: C.green + '12', border: `1px solid ${C.green}30`, borderRadius: 12,
          padding: '12px 16px', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.green }}>Inga väntande godkännanden</div>
          <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>Bra jobbat — allt är hanterat</div>
        </div>
      )}

      {/* Pending approvals */}
      {pending.map(ap => (
        <div key={ap.id} style={{
          background: C.surface, borderRadius: 14, marginBottom: 12,
          border: `0.5px solid ${C.orange}40`, boxShadow: shadow, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: `0.5px solid ${C.separator}`,
            background: C.orange + '08',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.2px' }}>
                ⏳ {ap.vehicle} · {ap.customer_name}
              </div>
              <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                Mekaniker: {ap.mechanic_name}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.orange,
              background: C.orange + '20', borderRadius: 6, padding: '3px 8px',
              letterSpacing: '0.04em',
            }}>
              VÄNTAR
            </span>
          </div>

          {/* Finding */}
          <div style={{ padding: '14px 16px' }}>
            <div style={{
              background: C.fill, borderRadius: 10, padding: '12px 14px',
              marginBottom: 14, borderLeft: `3px solid ${C.orange}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.secondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Mekanikern hittade:
              </div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>
                "{ap.finding}"
              </div>
            </div>

            {/* Cost + time */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: C.secondary }}>Tilläggskostnad</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{ap.extra_cost.toLocaleString('sv-SE')} kr</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.secondary }}>Extra tid</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{ap.extra_time}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.secondary }}>Skickat till kund</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: waitColor(ap.wait_minutes) }}>
                  {ap.sent_at} ({ap.wait_minutes} min sedan)
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: C.blue, fontWeight: 500 }}>
                📱 SMS skickat — Väntar på svar
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => handleRemind(ap.id)}
                style={{ fontSize: 13, background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                Påminn kund
              </button>
              <button onClick={() => { showToast(`Ringer ${ap.customer_name}: ${ap.customer_phone}`); }}
                style={{ fontSize: 13, background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                Ring kund · {ap.customer_phone}
              </button>
              <button onClick={() => handleApprove(ap.id)}
                style={{ fontSize: 13, background: C.green + '20', color: C.green, border: `1px solid ${C.green}40`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                ✓ Godkänn
              </button>
              <button onClick={() => handleDecline(ap.id)}
                style={{ fontSize: 13, background: 'transparent', color: C.secondary, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Avböj
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* History / Done */}
      {(showHistory || pending.length === 0) && done.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: C.secondary, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ flex: 1, height: 1, background: C.separator }} />
            Godkänt idag ({done.filter(a => a.status === 'APPROVED').length})
            <div style={{ flex: 1, height: 1, background: C.separator }} />
          </div>
          {done.map(ap => (
            <div key={ap.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: C.surface, borderRadius: 12, padding: '12px 14px',
              marginBottom: 8, border: `0.5px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 18 }}>{ap.status === 'APPROVED' ? '✅' : '❌'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{ap.vehicle} · {ap.customer_name}</div>
                <div style={{ fontSize: 13, color: C.secondary }}>
                  {ap.finding} · {ap.extra_cost.toLocaleString('sv-SE')} kr
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: ap.status === 'APPROVED' ? C.green : C.secondary, fontWeight: 600 }}>
                  {ap.status === 'APPROVED' ? `Godkänt via ${ap.approval_channel}` : 'Avböjt'}
                </div>
                <div style={{ fontSize: 11, color: C.tertiary }}>{ap.sent_at}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DMS View ─────────────────────────────────────────────────────────────────
function DmsView({ showToast }: { showToast: (msg: string) => void }) {
  const [search, setSearch] = useState('');
  const [selectedReg, setSelectedReg] = useState<string | null>(null);

  const filtered = DEMO_VEHICLES.filter(v =>
    search === '' ||
    v.reg.toLowerCase().includes(search.toLowerCase()) ||
    v.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    v.make.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  );

  const selected = DEMO_VEHICLES.find(v => v.reg === selectedReg);

  const statusLabel = (s: DmsVehicle['status']) =>
    s === 'IN_PROGRESS' ? 'Pågående' : s === 'WAITING' ? 'Väntar' : s === 'COMPLETED' ? 'Klart' : 'Blockerat';
  const statusColor = (s: DmsVehicle['status']) =>
    s === 'IN_PROGRESS' ? C.blue : s === 'WAITING' ? C.secondary : s === 'COMPLETED' ? C.green : C.red;
  const statusEmoji = (s: DmsVehicle['status']) =>
    s === 'IN_PROGRESS' ? '' : s === 'COMPLETED' ? ' ✅' : s === 'BLOCKED' ? ' ⚠️' : '';

  const yearsSince = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365));
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header + search */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.5px', marginBottom: 10 }}>
          Fordon & Kunder
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: C.tertiary }}>🔍</span>
          <input
            type="text"
            placeholder="Sök reg eller namn..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px 10px 36px',
              fontSize: 14, fontFamily: 'inherit',
              background: C.surface, border: `0.5px solid ${C.border}`,
              borderRadius: 10, outline: 'none', color: C.text,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.tertiary,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Layout: list + detail panel */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Vehicle list */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: C.secondary, marginBottom: 8,
          }}>
            Besök idag ({filtered.length})
          </div>

          {filtered.map(v => (
            <div
              key={v.reg}
              onClick={() => setSelectedReg(selectedReg === v.reg ? null : v.reg)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: selectedReg === v.reg ? C.blue + '08' : C.surface,
                border: selectedReg === v.reg ? `1px solid ${C.blue}40` : `0.5px solid ${C.border}`,
                borderRadius: 12, padding: '11px 14px', marginBottom: 6,
                cursor: 'pointer', boxShadow: shadow, transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>🚗</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{v.reg}</span>
                  <span style={{ fontSize: 13, color: C.secondary }}>{v.make} {v.model} {v.year}</span>
                </div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginTop: 1 }}>{v.customer_name}</div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(v.status) }}>
                  {statusLabel(v.status)}{statusEmoji(v.status)}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: C.secondary, fontSize: 14 }}>
              Inga fordon hittades för "{search}"
            </div>
          )}
        </div>

        {/* Detail panel (slide-in style) */}
        {selected && (
          <div style={{
            width: 300, flexShrink: 0,
            background: C.surface, borderRadius: 14,
            border: `0.5px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden', position: 'sticky', top: 12,
          }}>
            {/* Vehicle header */}
            <div style={{
              padding: '14px 16px', borderBottom: `0.5px solid ${C.separator}`,
              background: C.fill,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                  {selected.make} {selected.model}
                </div>
                <button onClick={() => setSelectedReg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.tertiary }}>×</button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.secondary, fontFamily: 'monospace' }}>{selected.reg}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 12, color: C.secondary }}>
                <span>Ägarbyten: {selected.owner_changes}</span>
                <span>·</span>
                <span>Reg: {selected.registered_date}</span>
              </div>
              <div style={{ fontSize: 11, color: C.tertiary, marginTop: 2, fontFamily: 'monospace' }}>VIN: {selected.vin}</div>
            </div>

            {/* Customer info */}
            <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${C.separator}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.secondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kund</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{selected.customer_name}</div>
              <div style={{ fontSize: 13, color: C.secondary, marginBottom: 2 }}>📞 {selected.customer_phone}</div>
              <div style={{ fontSize: 13, color: C.secondary, marginBottom: 6 }}>✉️ {selected.customer_email}</div>
              <div style={{ fontSize: 12, color: C.secondary }}>
                Kund sedan: {selected.customer_since} ({yearsSince(selected.customer_since)} år)
              </div>
              <div style={{ fontSize: 12, color: C.secondary }}>Senaste besök: {selected.last_visit}</div>
            </div>

            {/* Visit history */}
            <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${C.separator}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Besökshistorik</div>
              {selected.visit_history.map((visit, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div>
                    <span style={{ fontSize: 11, color: C.tertiary, marginRight: 6 }}>{visit.date}</span>
                    <span style={{ fontSize: 13, color: C.text }}>{visit.type} ✅</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.secondary }}>{visit.amount.toLocaleString('sv-SE')} kr</span>
                </div>
              ))}
            </div>

            {/* Stats + actions */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.secondary }}>Öppna ärenden</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: selected.open_cases > 0 ? C.blue : C.green }}>{selected.open_cases}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.secondary }}>Lifetime value</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{selected.lifetime_value.toLocaleString('sv-SE')} kr</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => showToast(`Ringer ${selected.customer_name}: ${selected.customer_phone}`)}
                  style={{ flex: 1, fontSize: 12, background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                  Ring
                </button>
                <button onClick={() => showToast(`SMS skickat till ${selected.customer_phone}`)}
                  style={{ flex: 1, fontSize: 12, background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                  SMS
                </button>
                <button onClick={() => showToast('Öppnar fullständig historik')}
                  style={{ flex: 1, fontSize: 12, background: C.fill, color: C.text, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Historik
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calendar / Schema View ────────────────────────────────────────────────────
function CalendarView({ showToast }: { showToast: (msg: string) => void }) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Timeline hours 07:00–16:00
  const START_HOUR = 7;
  const END_HOUR = 16;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const TIMELINE_WIDTH = 560; // px

  const timeToX = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return ((h - START_HOUR + m / 60) / TOTAL_HOURS) * TIMELINE_WIDTH;
  };
  const durationToW = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const dur = (eh - sh) + (em - sm) / 60;
    return (dur / TOTAL_HOURS) * TIMELINE_WIDTH;
  };

  // Current time (simulated as 09:47)
  const currentTimeX = timeToX('09:47');

  interface GanttJob {
    id: string;
    vehicle: string;
    reg: string;
    work_type: string;
    start: string;
    end: string;
    status: 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'BLOCKED';
    delayed?: boolean;
    risk?: boolean;
  }

  const mechanics: { name: string; initials: string; jobs: GanttJob[] }[] = [
    {
      name: 'Robin Björk', initials: 'RB',
      jobs: [
        { id: 'wo7', vehicle: 'Volvo V70', reg: 'STU 901', work_type: 'Däck', start: '07:30', end: '08:30', status: 'COMPLETED' },
        { id: 'wo1', vehicle: 'Audi A6', reg: 'ABC 123', work_type: 'Service + Bromsar', start: '08:00', end: '10:30', status: 'IN_PROGRESS', delayed: true },
        { id: 'wo3', vehicle: 'BMW 320i', reg: 'GHI 789', work_type: 'Service', start: '11:00', end: '13:00', status: 'WAITING' },
        { id: 'wo4', vehicle: 'VW Golf', reg: 'JKL 012', work_type: 'Bromsar', start: '13:00', end: '14:30', status: 'BLOCKED' },
      ],
    },
    {
      name: 'Eric Karlsson', initials: 'EK',
      jobs: [
        { id: 'wo2', vehicle: 'Volvo XC60', reg: 'DEF 456', work_type: 'Felsökning', start: '09:00', end: '11:00', status: 'IN_PROGRESS' },
        { id: 'wo5', vehicle: 'Kia Ceed', reg: 'MNO 345', work_type: 'Service', start: '12:00', end: '14:00', status: 'WAITING' },
      ],
    },
    {
      name: 'Jonas Lindström', initials: 'JL',
      jobs: [
        { id: 'wo6', vehicle: 'Mercedes C220', reg: 'PQR 678', work_type: 'Service', start: '08:30', end: '11:30', status: 'IN_PROGRESS', risk: true },
      ],
    },
  ];

  const jobColor = (job: GanttJob) => {
    if (job.status === 'COMPLETED') return C.green;
    if (job.status === 'BLOCKED') return C.red;
    if (job.delayed) return C.red;
    if (job.risk) return C.orange;
    if (job.status === 'IN_PROGRESS') return C.blue;
    return C.tertiary;
  };

  const jobOpacity = (job: GanttJob) =>
    job.status === 'WAITING' ? 0.45 : 1;

  const freeSlots = [
    { mechanic: 'Eric Karlsson', from: '14:00', to: '16:00', duration: '2h' },
    { mechanic: 'Jonas Lindström', from: '13:30', to: '16:00', duration: '2.5h' },
  ];

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>
          Schema · Måndag 22 mars
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('Visar igår')} style={{ fontSize: 13, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', color: C.text }}>← Igår</button>
          <button onClick={() => showToast('Visar imorgon')} style={{ fontSize: 13, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', color: C.text }}>Imorgon →</button>
        </div>
      </div>

      {/* Gantt chart */}
      <div style={{
        background: C.surface, borderRadius: 14, padding: '16px',
        border: `0.5px solid ${C.border}`, boxShadow: shadow, overflowX: 'auto',
        marginBottom: 16,
      }}>
        <div style={{ minWidth: 680 }}>
          {/* Hour ruler */}
          <div style={{ display: 'flex', marginLeft: 90, marginBottom: 8 }}>
            {hours.map(h => (
              <div key={h} style={{
                width: TIMELINE_WIDTH / TOTAL_HOURS,
                fontSize: 11, color: C.secondary, fontWeight: 500,
                textAlign: 'left', flexShrink: 0,
              }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: C.separator, marginLeft: 90, marginBottom: 8 }} />

          {/* Mechanic rows */}
          {mechanics.map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              {/* Name */}
              <div style={{ width: 90, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: C.fill, border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: C.secondary, flexShrink: 0,
                }}>
                  {m.initials}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>
                  {m.name.split(' ')[0]}
                </div>
              </div>

              {/* Timeline track */}
              <div style={{ position: 'relative', width: TIMELINE_WIDTH, height: 36, flexShrink: 0 }}>
                {/* Grid lines */}
                {hours.map(h => (
                  <div key={h} style={{
                    position: 'absolute', left: ((h - START_HOUR) / TOTAL_HOURS) * TIMELINE_WIDTH,
                    top: 0, bottom: 0, width: 1, background: C.fill,
                  }} />
                ))}

                {/* Current time line */}
                <div style={{
                  position: 'absolute', left: currentTimeX, top: 0, bottom: 0,
                  width: 2, background: C.red + 'AA', zIndex: 5,
                }}>
                  <div style={{ position: 'absolute', top: -4, left: -3, width: 8, height: 8, borderRadius: '50%', background: C.red }} />
                </div>

                {/* Job bars */}
                {m.jobs.map(job => {
                  const x = timeToX(job.start);
                  const w = durationToW(job.start, job.end);
                  const color = jobColor(job);
                  const opacity = jobOpacity(job);

                  return (
                    <div
                      key={job.id}
                      onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      title={`${job.vehicle} · ${job.reg} · ${job.start}–${job.end}`}
                      style={{
                        position: 'absolute', left: x, width: Math.max(w - 2, 20),
                        top: 4, height: 28, borderRadius: 6,
                        background: color, opacity,
                        cursor: 'pointer', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', paddingLeft: 6,
                        transition: 'opacity 0.15s',
                        boxShadow: expandedJob === job.id ? `0 0 0 2px ${color}` : 'none',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.vehicle.split(' ').slice(-1)[0]}
                        {job.delayed ? ' ⚠️' : ''}
                        {job.risk ? ' 🟡' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bottom separator */}
          <div style={{ height: 1, background: C.separator, marginLeft: 90, marginTop: 4, marginBottom: 8 }} />

          {/* Current time label */}
          <div style={{ marginLeft: 90, position: 'relative', height: 16 }}>
            <div style={{
              position: 'absolute',
              left: currentTimeX - 20,
              fontSize: 10, fontWeight: 700, color: C.red,
            }}>
              ↑ 09:47
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginLeft: 90, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { color: C.blue, label: 'Pågår' },
              { color: C.tertiary, label: 'Planerad', opacity: 0.45 },
              { color: C.green, label: 'Klar' },
              { color: C.red, label: 'Blockerad/Försenad' },
              { color: C.orange, label: 'Risk' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 14, height: 8, borderRadius: 3, background: l.color, opacity: l.opacity ?? 1 }} />
                <span style={{ fontSize: 11, color: C.secondary }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded job detail */}
      {expandedJob && (() => {
        const wo = DEMO_WORK_ORDERS.find(w => w.id === expandedJob);
        if (!wo) return null;
        return (
          <div style={{
            background: C.surface, borderRadius: 14, padding: '14px 16px',
            border: `1px solid ${C.blue}30`, boxShadow: shadow, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                {wo.make} {wo.model} · {wo.reg}
              </div>
              <button onClick={() => setExpandedJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.tertiary }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
              <div><div style={{ fontSize: 11, color: C.secondary }}>Kund</div><div style={{ fontSize: 13, fontWeight: 500 }}>{wo.customer_name} · {wo.customer_phone}</div></div>
              <div><div style={{ fontSize: 11, color: C.secondary }}>Mekaniker</div><div style={{ fontSize: 13, fontWeight: 500 }}>{wo.mechanic_name}</div></div>
              <div><div style={{ fontSize: 11, color: C.secondary }}>Tid</div><div style={{ fontSize: 13, fontWeight: 500 }}>{wo.start_time}–{wo.end_time}</div></div>
              <div><div style={{ fontSize: 11, color: C.secondary }}>Progress</div><div style={{ fontSize: 13, fontWeight: 700, color: wo.delay_minutes > 0 ? C.orange : C.green }}>{wo.progress_pct}% {wo.delay_minutes > 0 ? `+${wo.delay_minutes}min` : '✓ I tid'}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => showToast(`Ringer ${wo.customer_phone}`)} style={{ fontSize: 12, background: C.green, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Ring kund</button>
              <button onClick={() => showToast(`Prioriterat: ${wo.make} ${wo.model}`)} style={{ fontSize: 12, background: C.orange, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Prioritera</button>
            </div>
          </div>
        );
      })()}

      {/* Capacity summary */}
      <div style={{
        background: C.surface, borderRadius: 14, padding: '14px 16px',
        border: `0.5px solid ${C.border}`, boxShadow: shadow, marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Verkstaden · Idag</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
          <div><div style={{ fontSize: 11, color: C.secondary }}>Total kapacitet</div><div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>24h</div></div>
          <div><div style={{ fontSize: 11, color: C.secondary }}>Bokad</div><div style={{ fontSize: 16, fontWeight: 700, color: C.orange }}>20.5h (85%)</div></div>
          <div><div style={{ fontSize: 11, color: C.secondary }}>Ledig</div><div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>3.5h</div></div>
        </div>
        <div style={{ height: 6, background: C.fill, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '85%', height: '100%', background: C.orange, borderRadius: 3 }} />
        </div>
      </div>

      {/* Free slots */}
      <div style={{
        background: C.surface, borderRadius: 14, padding: '14px 16px',
        border: `0.5px solid ${C.border}`, boxShadow: shadow,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.secondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Lediga slots
        </div>
        {freeSlots.map(slot => (
          <div key={slot.mechanic} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0', borderBottom: `0.5px solid ${C.fill}`,
          }}>
            <span style={{ fontSize: 14, color: C.green }}>✓</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{slot.mechanic}</div>
              <div style={{ fontSize: 12, color: C.secondary }}>{slot.from}–{slot.to} ({slot.duration})</div>
            </div>
            <button
              onClick={() => showToast(`Lägger in jobb för ${slot.mechanic} kl ${slot.from}`)}
              style={{
                fontSize: 12, background: C.green, color: '#fff', border: 'none',
                borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              Lägg in jobb
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
interface ServiceAdvisorViewProps {
  user?: {
    id?: string;
    full_name?: string;
    email?: string;
    role?: string;
    user_metadata?: { role?: string };
  } | null;
  activeView?: string;
}

type TabId = 'flow' | 'exceptions' | 'idag';

export default function ServiceAdvisorView({ user, activeView = 'overview' }: ServiceAdvisorViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('flow');
  const [exceptions, setExceptions] = useState<Exception[]>(DEMO_EXCEPTIONS);
  const [flow] = useState<FlowStats>(DEMO_FLOW);
  const [timeline] = useState<WorkshopJob[]>(DEMO_TIMELINE);
  const [lanes, setLanes] = useState<MechanicLane[]>(DEMO_LANES);
  const [suggestions, setSuggestions] = useState<SystemSuggestion[]>(DEMO_SUGGESTIONS);
  const [toast, setToast] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const unresolved = exceptions.filter(e => !e.resolved);
  const highCount = unresolved.filter(e => e.severity === 'HIGH').length;
  const timeStr = lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAction(excId: string, action: string) {
    setExceptions(prev => prev.map(e => e.id === excId ? { ...e, resolved: true } : e));
    showToast(`${action} — utfört`);
  }

  function handleAcceptSuggestion(idx: number) {
    const s = suggestions[idx];
    setSuggestions(prev => prev.filter((_, i) => i !== idx));
    setLanes(prev => {
      const fromLane = prev.find(l => l.name === s.from_mechanic);
      const toLane = prev.find(l => l.name === s.to_mechanic);
      if (!fromLane || !toLane) return prev;
      const job = fromLane.jobs.find(j => j.id === s.job_id);
      if (!job) return prev;
      return prev.map(lane => {
        if (lane.name === s.from_mechanic) {
          const newLoad = Math.max(0, lane.load_pct - 20);
          return { ...lane, load_pct: newLoad, jobs: lane.jobs.filter(j => j.id !== s.job_id) };
        }
        if (lane.name === s.to_mechanic) {
          const newLoad = Math.min(lane.load_pct + 20, 100);
          return { ...lane, load_pct: newLoad, jobs: [...lane.jobs, job] };
        }
        return lane;
      });
    });
    showToast(`Jobb flyttat — sparar ${s.time_saved_minutes} min`);
  }

  function handleIgnoreSuggestion(idx: number) {
    setSuggestions(prev => prev.filter((_, i) => i !== idx));
    showToast('Förslag ignorerat');
  }

  function handleMoveJob(jobId: string) {
    showToast(`Flytta jobb ${jobId} — välj destination`);
  }

  // ── Route to sub-views based on activeView prop ──────────────────────────────
  if (activeView === 'work-orders') {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 0 40px' }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.82)', color: '#FFFFFF', borderRadius: 20, padding: '10px 20px', fontSize: 14, fontWeight: 500, zIndex: 9999, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>✅ {toast}</div>
        )}
        <WorkOrderListView showToast={showToast} />
      </div>
    );
  }

  if (activeView === 'approval') {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 0 40px' }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.82)', color: '#FFFFFF', borderRadius: 20, padding: '10px 20px', fontSize: 14, fontWeight: 500, zIndex: 9999, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>✅ {toast}</div>
        )}
        <ApprovalView showToast={showToast} />
      </div>
    );
  }

  if (activeView === 'dms') {
    return (
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 0 40px' }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.82)', color: '#FFFFFF', borderRadius: 20, padding: '10px 20px', fontSize: 14, fontWeight: 500, zIndex: 9999, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>✅ {toast}</div>
        )}
        <DmsView showToast={showToast} />
      </div>
    );
  }

  if (activeView === 'calendar') {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 40px' }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.82)', color: '#FFFFFF', borderRadius: 20, padding: '10px 20px', fontSize: 14, fontWeight: 500, zIndex: 9999, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>✅ {toast}</div>
        )}
        <CalendarView showToast={showToast} />
      </div>
    );
  }

  // ── Default: overview (Undantag & Kontroll) with tabs ───────────────────────
  // Tab definitions
  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'flow', label: 'Flödeskontroll' },
    { id: 'exceptions', label: 'Undantag', badge: unresolved.length > 0 ? unresolved.length : undefined },
    { id: 'idag', label: 'Idag' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── Toast notification ──────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.82)', color: '#FFFFFF', borderRadius: 20,
          padding: '10px 20px', fontSize: 14, fontWeight: 500,
          zIndex: 9999, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          ✅ {toast}
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        background: C.fill, borderRadius: 12, padding: 4,
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, height: 36, border: 'none', cursor: 'pointer',
                borderRadius: 9,
                background: isActive ? C.surface : 'transparent',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? C.text : C.secondary,
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span style={{
                  minWidth: 18, height: 18,
                  background: highCount > 0 ? C.red : C.orange,
                  color: '#fff', borderRadius: 9,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Flow Control tab ────────────────────────────────────────────── */}
      {activeTab === 'flow' && (
        <FlowControlView
          lanes={lanes}
          suggestions={suggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onIgnoreSuggestion={handleIgnoreSuggestion}
          onMoveJob={handleMoveJob}
        />
      )}

      {/* ── Exceptions tab ──────────────────────────────────────────────── */}
      {activeTab === 'exceptions' && (
        <div>
          <div style={{
            background: unresolved.length > 0 ? '#FFFBF0' : C.surface,
            borderRadius: 16, padding: '18px 16px 14px', marginBottom: 16,
            boxShadow: shadow,
            border: unresolved.length > 0
              ? `1.5px solid ${highCount > 0 ? C.orange : C.border}`
              : `1.5px solid ${C.green}`,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {unresolved.length > 0 ? (
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: highCount > 0 ? C.orange : '#FFD60A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {highCount > 0 ? '🚨' : '🟡'}
                  </div>
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: '#D1FAE5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    ✅
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.3px' }}>
                    {unresolved.length > 0
                      ? `${unresolved.length} situation${unresolved.length > 1 ? 'er' : ''} att hantera`
                      : 'Allt flödar normalt'}
                  </div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 1 }}>
                    Uppdaterat {timeStr}
                  </div>
                </div>
              </div>

              {unresolved.length > 0 && (
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: highCount > 0 ? C.orange : C.secondary,
                  background: highCount > 0 ? '#FFF3E0' : C.fill,
                  borderRadius: 8, padding: '4px 10px',
                }}>
                  {highCount > 0 ? `${highCount} brådskande` : 'Inga kritiska'}
                </div>
              )}
            </div>

            {unresolved.length > 0 ? (
              <div>
                {unresolved.map(exc => (
                  <ExceptionCard key={exc.id} exc={exc} onAction={handleAction} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0 8px', color: C.green, fontSize: 15, fontWeight: 500 }}>
                Inga undantag just nu — bra jobbat! 🎉
              </div>
            )}

            {exceptions.filter(e => e.resolved).length > 0 && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${C.border}`,
                fontSize: 12, color: C.secondary,
              }}>
                ✅ {exceptions.filter(e => e.resolved).length} situation{exceptions.filter(e => e.resolved).length > 1 ? 'er' : ''} hanterade idag
              </div>
            )}
          </div>

          {/* Flow stats (secondary, under exceptions) */}
          <div style={{
            background: C.surface, borderRadius: 16,
            padding: '16px 16px 14px', boxShadow: shadow, border: `0.5px solid ${C.border}`,
          }}>
            <SectionHeader label="Verkstadsflöde" meta={`${flow.activeJobs}/${flow.totalJobs} jobb`} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.secondary }}>Beläggning</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: flow.loadPct >= 90 ? C.red : flow.loadPct >= 75 ? C.orange : C.green }}>
                  {flow.loadPct}%
                </span>
              </div>
              <LoadBar pct={flow.loadPct} />
            </div>
            {flow.freeSlot && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FFF4', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 14 }}>🟢</span>
                <span style={{ fontSize: 13, color: C.green, fontWeight: 500 }}>
                  Frigjord kapacitet: {flow.freeSlot}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Idag tab ────────────────────────────────────────────────────── */}
      {activeTab === 'idag' && (
        <div style={{
          background: C.surface, borderRadius: 16,
          padding: '16px 16px 10px', boxShadow: shadow, border: `0.5px solid ${C.border}`,
        }}>
          <SectionHeader label="Idag" />
          <div>
            {timeline.map((job, i) => {
              const statusColor = jobStatusColor(job);
              const statusIcon = jobStatusIcon(job);
              const isLast = i === timeline.length - 1;
              return (
                <div
                  key={job.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 0',
                    borderBottom: isLast ? 'none' : `0.5px solid ${C.separator}`,
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: C.secondary,
                    width: 38, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {job.time}
                  </span>
                  <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>
                    {statusIcon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{job.vehicle}</span>
                    {job.reg && (
                      <span style={{ fontSize: 11, color: C.tertiary, marginLeft: 6 }}>{job.reg}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: statusColor }}>
                      {job.statusLabel}
                      {job.overdueMin && <span style={{ fontWeight: 700 }}> (+{job.overdueMin}min)</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Debug info in dev */}
      {import.meta.env.DEV && (
        <div style={{
          marginTop: 16, padding: '8px 12px', background: '#F2F2F7',
          borderRadius: 8, fontSize: 11, color: C.secondary, fontFamily: 'monospace',
        }}>
          🔧 DEV: role={user?.user_metadata?.role ?? user?.role ?? 'unknown'} | tab={activeTab} | exceptions={exceptions.length} | unresolved={unresolved.length} | suggestions={suggestions.length}
        </div>
      )}
    </div>
  );
}
