// ServiceAdvisorView.tsx — Exception management + reality control
// Designed for: service advisors, front-desk managers
// NOT for: mechanics (WorkerView), CEOs (OverviewView)
//
// Core principle: "Plan the work — but control the chaos."
//
// Role hierarchy:
// 1. Flow control             ← DEFAULT — show the flow, fix the flow
// 2. Handle exceptions        ← if something's wrong, fix it NOW
// 3. Idag                     ← timeline awareness

import { useState, useEffect } from 'react';

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

// ─── Chaos control types ───────────────────────────────────────────────────────
interface UnbookedVehicle {
  id: string;
  reg: string;
  make: string;
  issue: string;
  arrival_time: string;
  wait_minutes: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  pix_type?: string;
  suggested_mechanic: string | null;
  suggested_slot: string | null;
  time_saved_minutes: number;
  snoozed?: boolean;
}

interface QuickDecision {
  id: string;
  label: string;
  sublabel: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  action: () => void;
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
    description: 'Bromsskiva saknas — jobb inbokat kl 14:00',
    since: 'kl 14',
    severity: 'HIGH',
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

// ─── Unbooked queue demo data ──────────────────────────────────────────────────
const DEMO_UNBOOKED: UnbookedVehicle[] = [
  {
    id: 'u1', reg: 'ABC 123', make: 'VW Passat',
    issue: 'Bärgning — Felsökning',
    arrival_time: '08:10', wait_minutes: 80,
    priority: 'HIGH', pix_type: 'arrival_pix',
    suggested_mechanic: 'Eric Karlsson', suggested_slot: '10:15', time_saved_minutes: 40,
  },
  {
    id: 'u2', reg: 'DEF 456', make: 'Audi Q5',
    issue: 'Akut bromsproblem',
    arrival_time: '09:00', wait_minutes: 45,
    priority: 'MEDIUM',
    suggested_mechanic: 'Jonas Lindström', suggested_slot: '13:30', time_saved_minutes: 20,
  },
  {
    id: 'u3', reg: 'GHI 789', make: 'Toyota Yaris',
    issue: 'Startproblem',
    arrival_time: '09:30', wait_minutes: 15,
    priority: 'LOW',
    suggested_mechanic: null, suggested_slot: null, time_saved_minutes: 0,
  },
];

// Quick decisions base (actions wired in component)
const DEMO_QUICK_DECISIONS_BASE = [
  { id: 'qd1', label: 'Flytta BMW 320 → Eric', sublabel: '→ Minskar Robins kö med 35 min', impact: 'HIGH' as const },
  { id: 'qd2', label: 'Lägg in VW Passat → Eric kl 10:15', sublabel: '→ Minskar väntetid 40 min · utnyttjar ledig slot', impact: 'HIGH' as const },
  { id: 'qd3', label: 'Prioritera Volvo XC60', sublabel: '→ Kund på plats sedan 09:00', impact: 'MEDIUM' as const },
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

// ─── Wait time formatter ───────────────────────────────────────────────────────
function waitLabel(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min} min`;
}

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

// ─── Unbooked Queue section ────────────────────────────────────────────────────
function UnbookedQueueSection({
  vehicles,
  availableMechanics,
  onAssign,
  onSnooze,
  onDismiss,
}: {
  vehicles: UnbookedVehicle[];
  availableMechanics: string[];
  onAssign: (vehicleId: string, mechanicName: string) => void;
  onSnooze: (vehicleId: string) => void;
  onDismiss: (vehicleId: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);

  const priorityColor = (p: UnbookedVehicle['priority']) =>
    p === 'HIGH' ? '#FF3B30' : p === 'MEDIUM' ? '#FF9500' : '#34C759';

  const priorityLabel = (p: UnbookedVehicle['priority']) =>
    p === 'HIGH' ? '🔴 Hög prioritet' : p === 'MEDIUM' ? '🟡 Medium' : '🟢 Låg';

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <span style={{ fontSize: 16 }}>🚨</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: '#FF3B30',
        }}>
          Obokad kö ({vehicles.length})
        </span>
      </div>

      {vehicles.map(v => {
        const pColor = priorityColor(v.priority);
        const isPickerOpen = pickerOpen === v.id;

        return (
          <div key={v.id} style={{
            background: C.surface,
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 8,
            border: `0.5px solid ${pColor}30`,
            borderLeft: `4px solid ${pColor}`,
            boxShadow: shadow,
          }}>
            {/* Priority row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 4,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: pColor }}>
                {priorityLabel(v.priority)}
              </span>
              {/* PIX signal dots — system-level, 8px */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {v.pix_type && (
                  <span
                    title={`PIX: ${v.pix_type}`}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, display: 'inline-block' }}
                  />
                )}
                {v.wait_minutes >= 60 && (
                  <span
                    title="PIX: waiting_time_pix"
                    style={{ width: 8, height: 8, borderRadius: '50%', background: C.orange, display: 'inline-block' }}
                  />
                )}
                {v.priority === 'HIGH' && (
                  <span
                    title="PIX: urgency_pix"
                    style={{ width: 8, height: 8, borderRadius: '50%', background: C.red, display: 'inline-block' }}
                  />
                )}
              </div>
            </div>

            {/* Vehicle */}
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>
              {v.make}{' '}
              <span style={{ fontSize: 12, fontWeight: 500, color: C.secondary }}>· {v.reg}</span>
            </div>

            {/* Issue */}
            <div style={{ fontSize: 13, color: C.secondary, marginBottom: 4 }}>
              {v.issue}
            </div>

            {/* Wait time */}
            <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>
              Väntat: {waitLabel(v.wait_minutes)} · In: {v.arrival_time}
            </div>

            {/* PIX suggestion */}
            {v.suggested_mechanic && v.suggested_slot && (
              <div style={{
                fontSize: 12, color: C.blue,
                background: '#007AFF0D', borderRadius: 6,
                padding: '5px 8px', marginBottom: 8,
              }}>
                💡 {v.suggested_mechanic} kl {v.suggested_slot} → minskar väntan {v.time_saved_minutes} min
              </div>
            )}

            {/* Actions */}
            {!isPickerOpen ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setPickerOpen(v.id)}
                  style={{
                    background: C.blue, color: '#fff',
                    border: 'none', borderRadius: 8,
                    padding: '7px 12px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {v.suggested_mechanic
                    ? `Tilldela → ${v.suggested_mechanic.split(' ')[0]}`
                    : 'Tilldela →'}
                </button>
                <button
                  onClick={() => onSnooze(v.id)}
                  style={{
                    background: C.fill, color: C.secondary,
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: '7px 12px', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Vänta
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Avvisa ${v.make} (${v.reg}) från kön?`)) {
                      onDismiss(v.id);
                    }
                  }}
                  style={{
                    background: 'transparent', color: C.red,
                    border: `1px solid ${C.red}40`, borderRadius: 8,
                    padding: '7px 12px', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Avvisa
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: C.secondary, marginBottom: 6 }}>
                  Välj mekaniker:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {availableMechanics.map(mName => {
                    const isSuggested = mName === v.suggested_mechanic;
                    return (
                      <button
                        key={mName}
                        onClick={() => {
                          onAssign(v.id, mName);
                          setPickerOpen(null);
                        }}
                        style={{
                          background: isSuggested ? C.blue : C.fill,
                          color: isSuggested ? '#fff' : C.text,
                          border: `1px solid ${isSuggested ? C.blue : C.border}`,
                          borderRadius: 8, padding: '8px 12px',
                          fontSize: 13, fontWeight: isSuggested ? 600 : 400,
                          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        }}
                      >
                        {isSuggested ? `✓ ${mName}` : mName}
                        {isSuggested && v.suggested_slot && (
                          <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.8 }}>
                            kl {v.suggested_slot}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPickerOpen(null)}
                    style={{
                      background: 'transparent', color: C.secondary,
                      border: 'none', fontSize: 12,
                      cursor: 'pointer', padding: '4px 0',
                      textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    ✕ Avbryt
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick Decisions section ───────────────────────────────────────────────────
function QuickDecisionsSection({
  decisions,
  onAccept,
}: {
  decisions: QuickDecision[];
  onAccept: (decision: QuickDecision) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: C.secondary,
        }}>
          Snabbbeslut
        </span>
      </div>

      {decisions.map(d => {
        const isHigh = d.impact === 'HIGH';
        const isMedium = d.impact === 'MEDIUM';

        return (
          <button
            key={d.id}
            onClick={() => onAccept(d)}
            style={{
              display: 'block', width: '100%',
              padding: '12px 16px', marginBottom: 8,
              borderRadius: 12, cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
              background: isHigh ? C.blue : 'transparent',
              color: isHigh ? '#fff' : isMedium ? C.orange : C.secondary,
              border: isHigh
                ? 'none'
                : `1.5px solid ${isMedium ? C.orange : C.border}`,
              boxShadow: isHigh ? '0 2px 8px rgba(0,122,255,0.20)' : shadow,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
              {d.label}
            </div>
            <div style={{
              fontSize: 12,
              color: isHigh ? 'rgba(255,255,255,0.80)' : isMedium ? C.orange : C.secondary,
            }}>
              {d.sublabel}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Mechanic lane component — action-driven ───────────────────────────────────
function MechanicLaneCmp({
  mechanic,
  onMoveJob,
  unbookedQueue,
  onAssign,
}: {
  mechanic: MechanicLane;
  onMoveJob: (jobId: string) => void;
  unbookedQueue: UnbookedVehicle[];
  onAssign: (vehicleId: string, mechanicName: string) => void;
}) {
  const isOverloaded = mechanic.load_pct > 100;
  const overloadPct = mechanic.load_pct - 100;

  // Find first high/medium priority unbooked vehicle that could fill free slot
  const candidateVehicle = mechanic.free_slot
    ? unbookedQueue.find(v => !v.snoozed && (v.priority === 'HIGH' || v.priority === 'MEDIUM'))
    : null;

  return (
    <div style={{
      background: C.surface,
      borderRadius: 14,
      marginBottom: 10,
      border: `0.5px solid ${isOverloaded ? C.red + '40' : C.border}`,
      overflow: 'hidden',
    }}>
      {/* Mechanic header */}
      <div style={{
        padding: '12px 16px',
        background: isOverloaded ? '#FF3B3008' : C.surface,
        borderBottom: `0.5px solid ${C.separator}`,
      }}>
        {/* Top row: avatar + name + load */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: (isOverloaded || candidateVehicle || mechanic.free_slot) ? 10 : 0,
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
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                {isOverloaded
                  ? `⚠️ ${mechanic.name} är överbelastad (+${overloadPct}%)`
                  : `${mechanic.name} — ${mechanic.load_pct}% belagd`}
              </div>
              <div style={{ fontSize: 11, color: C.secondary }}>{mechanic.jobs.length} jobb</div>
            </div>
          </div>

          {/* Load indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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

        {/* Overload action */}
        {isOverloaded && (
          <div style={{
            background: '#FF3B3010', borderRadius: 8,
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: 12, color: C.red, marginBottom: 6 }}>
              → Förslag: flytta ett jobb till ledig mekaniker
            </div>
            <button
              onClick={() => {
                const jobToMove = mechanic.jobs[1] ?? mechanic.jobs[0];
                if (jobToMove) onMoveJob(jobToMove.id);
              }}
              style={{
                background: C.red, color: '#fff',
                border: 'none', borderRadius: 7,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Acceptera direkt
            </button>
          </div>
        )}

        {/* Free slot with candidate vehicle */}
        {!isOverloaded && candidateVehicle && mechanic.free_slot && (
          <div style={{
            background: '#34C75908', borderRadius: 8,
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: 11, color: C.green, marginBottom: 4 }}>
              ✓ Ledig: {mechanic.free_slot.from}–{mechanic.free_slot.to}
            </div>
            <div style={{ fontSize: 12, color: C.blue, marginBottom: 6 }}>
              💡 Kan ta: {candidateVehicle.make} (akut, väntar {waitLabel(candidateVehicle.wait_minutes)})
            </div>
            <button
              onClick={() => onAssign(candidateVehicle.id, mechanic.name)}
              style={{
                background: C.blue, color: '#fff',
                border: 'none', borderRadius: 7,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Tilldela {candidateVehicle.make}
            </button>
          </div>
        )}

        {/* Free slot without candidate */}
        {!isOverloaded && !candidateVehicle && mechanic.free_slot && (
          <div style={{
            fontSize: 11, color: C.green,
            background: '#34C75908', borderRadius: 6,
            padding: '5px 8px',
          }}>
            ✓ Ledig: {mechanic.free_slot.from}–{mechanic.free_slot.to}
          </div>
        )}
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
  unbookedQueue,
  quickDecisions,
  onAcceptSuggestion,
  onIgnoreSuggestion,
  onMoveJob,
  onAssign,
  onSnooze,
  onDismiss,
  onAcceptDecision,
}: {
  lanes: MechanicLane[];
  suggestions: SystemSuggestion[];
  unbookedQueue: UnbookedVehicle[];
  quickDecisions: QuickDecision[];
  onAcceptSuggestion: (idx: number) => void;
  onIgnoreSuggestion: (idx: number) => void;
  onMoveJob: (jobId: string) => void;
  onAssign: (vehicleId: string, mechanicName: string) => void;
  onSnooze: (vehicleId: string) => void;
  onDismiss: (vehicleId: string) => void;
  onAcceptDecision: (decision: QuickDecision) => void;
}) {
  const avgLoad = Math.round(lanes.reduce((sum, l) => sum + l.load_pct, 0) / lanes.length);
  const overloaded = lanes.filter(l => l.load_pct > 100).length;
  const delayed = lanes.flatMap(l => l.jobs).filter(j => j.is_delayed).length;
  const availableMechanics = lanes.map(l => l.name);
  const activeUnbooked = unbookedQueue.filter(v => !v.snoozed);

  return (
    <div>
      {/* 1. Unbooked queue — always first */}
      {activeUnbooked.length > 0 && (
        <UnbookedQueueSection
          vehicles={activeUnbooked}
          availableMechanics={availableMechanics}
          onAssign={onAssign}
          onSnooze={onSnooze}
          onDismiss={onDismiss}
        />
      )}

      {/* 2. Quick decisions */}
      {quickDecisions.length > 0 && (
        <QuickDecisionsSection
          decisions={quickDecisions}
          onAccept={onAcceptDecision}
        />
      )}

      {/* 3. Mechanic lanes */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: C.secondary,
        }}>
          👨‍🔧 Mekaniker / Flow
        </span>
        <span style={{ fontSize: 12, color: C.tertiary }}>{lanes.length} mekaniker</span>
      </div>

      {lanes.map(lane => (
        <MechanicLaneCmp
          key={lane.id}
          mechanic={lane}
          onMoveJob={onMoveJob}
          unbookedQueue={unbookedQueue}
          onAssign={onAssign}
        />
      ))}

      {/* System suggestions (existing) */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 6 }}>
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

      {/* 4. Summary strip */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 14,
        background: C.surface, borderRadius: 12,
        padding: '10px 12px', boxShadow: shadow,
        border: `0.5px solid ${C.border}`,
      }}>
        {[
          { label: 'Beläggning', value: `${avgLoad}%`, color: loadColor(avgLoad) },
          { label: 'Överbelastade', value: overloaded.toString(), color: overloaded > 0 ? C.red : C.green },
          { label: 'Försenade', value: delayed.toString(), color: delayed > 0 ? C.orange : C.green },
          { label: 'Obokade', value: activeUnbooked.length.toString(), color: activeUnbooked.length > 0 ? C.red : C.green },
        ].map(kpi => (
          <div key={kpi.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: C.secondary, marginTop: 2 }}>{kpi.label}</div>
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
}

type TabId = 'flow' | 'exceptions' | 'idag';

export default function ServiceAdvisorView({ user }: ServiceAdvisorViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('flow');
  const [exceptions, setExceptions] = useState<Exception[]>(DEMO_EXCEPTIONS);
  const [flow] = useState<FlowStats>(DEMO_FLOW);
  const [timeline] = useState<WorkshopJob[]>(DEMO_TIMELINE);
  const [lanes, setLanes] = useState<MechanicLane[]>(DEMO_LANES);
  const [suggestions, setSuggestions] = useState<SystemSuggestion[]>(DEMO_SUGGESTIONS);
  const [unbookedQueue, setUnbookedQueue] = useState<UnbookedVehicle[]>(DEMO_UNBOOKED);
  const [toast, setToast] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Wire quick decisions with actual side-effect actions
  const [quickDecisions, setQuickDecisions] = useState<QuickDecision[]>(
    DEMO_QUICK_DECISIONS_BASE.map(base => ({ ...base, action: () => {} }))
  );

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

  // ── Unbooked queue handlers ──────────────────────────────────────────────────
  function assignFromQueue(vehicleId: string, mechanicName: string) {
    const vehicle = unbookedQueue.find(v => v.id === vehicleId);
    setUnbookedQueue(q => q.filter(v => v.id !== vehicleId));
    // Remove related quick decisions (qd2 links to u1/VW Passat)
    setQuickDecisions(d => d.filter(x => {
      if (vehicleId === 'u1' && x.id === 'qd2') return false;
      if (vehicleId === 'u2' && x.id === 'qd3') return false;
      return true;
    }));
    if (vehicle) {
      showToast(`${vehicle.make} tilldelas ${mechanicName}`);
    }
  }

  function snoozeVehicle(vehicleId: string) {
    setUnbookedQueue(q => q.map(v => v.id === vehicleId ? { ...v, snoozed: true } : v));
    setTimeout(() => {
      setUnbookedQueue(q => q.map(v => v.id === vehicleId ? { ...v, snoozed: false } : v));
    }, 15 * 60 * 1000);
    showToast('Vilar i 15 min');
  }

  function dismissVehicle(vehicleId: string) {
    setUnbookedQueue(q => q.filter(v => v.id !== vehicleId));
    showToast('Fordon avvisat från kön');
  }

  // ── Quick decision handler ───────────────────────────────────────────────────
  function acceptDecision(decision: QuickDecision) {
    setQuickDecisions(d => d.filter(x => x.id !== decision.id));

    if (decision.id === 'qd1') {
      // Move BMW 320 from Robin to Eric
      setLanes(prev => {
        const fromLane = prev.find(l => l.name === 'Robin Björk');
        const toLane = prev.find(l => l.name === 'Eric Karlsson');
        if (!fromLane || !toLane) return prev;
        const job = fromLane.jobs.find(j => j.id === 'j2');
        if (!job) return prev;
        return prev.map(lane => {
          if (lane.name === 'Robin Björk') {
            return { ...lane, load_pct: Math.max(80, lane.load_pct - 25), jobs: lane.jobs.filter(j => j.id !== 'j2') };
          }
          if (lane.name === 'Eric Karlsson') {
            return { ...lane, load_pct: Math.min(lane.load_pct + 20, 100), jobs: [...lane.jobs, { ...job, status: 'NEXT' as const }] };
          }
          return lane;
        });
      });
      showToast('BMW 320 flyttad till Eric — sparar 35 min');
    } else if (decision.id === 'qd2') {
      // Assign VW Passat (u1) to Eric
      assignFromQueue('u1', 'Eric Karlsson');
    } else if (decision.id === 'qd3') {
      showToast('Volvo XC60 prioriterad');
    } else {
      decision.action();
      showToast(`${decision.label} — utfört`);
    }
  }

  // ── Existing handlers ────────────────────────────────────────────────────────
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
          unbookedQueue={unbookedQueue}
          quickDecisions={quickDecisions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onIgnoreSuggestion={handleIgnoreSuggestion}
          onMoveJob={handleMoveJob}
          onAssign={assignFromQueue}
          onSnooze={snoozeVehicle}
          onDismiss={dismissVehicle}
          onAcceptDecision={acceptDecision}
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
          🔧 DEV: role={user?.user_metadata?.role ?? user?.role ?? 'unknown'} | tab={activeTab} | exceptions={exceptions.length} | unresolved={unresolved.length} | suggestions={suggestions.length} | unbooked={unbookedQueue.length} | decisions={quickDecisions.length}
        </div>
      )}
    </div>
  );
}
