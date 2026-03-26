// MobilityIncidentView.tsx — Pixdrift Mobility Incident Flow Engine
// Core principle: "Breakdowns are not events. They are financial flows."
//
// Ops Lead sees incidents as high-priority items in the exceptions flow.
// Full view = airline-style flight tracker: 6 steps, real-time status.

import { useState } from 'react';

// ─── Color system ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#F2F2F7',
  surface:   '#FFFFFF',
  border:    '#D1D1D6',
  text:      '#000000',
  secondary: '#8E8E93',
  tertiary:  '#C7C7CC',
  blue:      '#007AFF',
  green:     '#34C759',
  orange:    '#FF9500',
  red:       '#FF3B30',
  purple:    '#AF52DE',
  fill:      '#F2F2F7',
};

const shadow = '0 1px 3px rgba(0,0,0,0.06)';
const shadowMed = '0 4px 16px rgba(0,0,0,0.10)';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CostSplitEntry {
  party: string;
  amount: number | null;
  label: string;
}

interface MobilityIncident {
  id: string;
  vehicle_reg: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  customer_name?: string;
  customer_phone?: string;
  issue_type: string;
  urgency: 'NORMAL' | 'HIGH' | 'CRITICAL';
  incident_location?: string;
  customer_description?: string;
  tow_provider?: string;
  tow_provider_phone?: string;
  tow_ordered_at?: string;
  tow_eta?: string;
  tow_cost_estimate?: number;
  status: string;
  responsibility_party?: string;
  responsibility_reason?: string;
  cost_split?: {
    towing?: CostSplitEntry;
    labor?: CostSplitEntry;
    parts?: CostSplitEntry;
  };
  timeline?: { time: string; icon: string; text: string }[];
}

// ─── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_MOBILITY_INCIDENT: MobilityIncident = {
  id: 'mi1',
  vehicle_reg: 'DEF 456',
  vehicle_make: 'Volvo',
  vehicle_model: 'XC60',
  vehicle_year: 2022,
  customer_name: 'Lars Nilsson',
  customer_phone: '070-123 45 67',
  issue_type: 'BREAKDOWN',
  urgency: 'HIGH',
  incident_location: 'E4 Norrtälje, riktning Stockholm',
  customer_description: 'Motorn stängdes av plötsligt, varningslampor lyser',
  tow_provider: 'Assist Bärgning AB',
  tow_provider_phone: '0771-123 456',
  tow_ordered_at: '09:15',
  tow_eta: '09:49',
  tow_cost_estimate: 3200,
  status: 'TOW_EN_ROUTE',
  responsibility_party: 'OEM_MOBILITY',
  responsibility_reason: 'Volvo On Call täcker bärgning — garanti aktiv (18 månader kvar)',
  cost_split: {
    towing: { party: 'OEM_MOBILITY', amount: 3200, label: 'Volvo On Call' },
    labor:  { party: 'PENDING', amount: null, label: 'Estimeras vid diagnos' },
    parts:  { party: 'PENDING', amount: null, label: 'Estimeras vid diagnos' },
  },
  timeline: [
    { time: '09:01', icon: '📍', text: 'Incident rapporterat · E4 Norrtälje' },
    { time: '09:15', icon: '📞', text: 'Bärgning beställd · Assist Bärgning AB' },
    { time: '09:15', icon: '📱', text: 'SMS skickat till Lars Nilsson' },
    { time: '09:20', icon: '🚚', text: 'Bärgaren på väg · ETA 35 min' },
  ],
};

// ─── State machine steps ────────────────────────────────────────────────────────
const FLOW_STEPS = [
  { id: 'INCIDENT_CREATED',          icon: '🔴', label: 'Incident' },
  { id: 'TOW_ORDERED',               icon: '🚚', label: 'Bärgning' },
  { id: 'TOW_EN_ROUTE',              icon: '🚚', label: 'Bärgning' },
  { id: 'VEHICLE_COLLECTED',         icon: '🚚', label: 'Bärgning' },
  { id: 'VEHICLE_IN_TRANSIT',        icon: '🚚', label: 'Bärgning' },
  { id: 'VEHICLE_DELIVERED',         icon: '🏭', label: 'Mottagning' },
  { id: 'RESPONSIBILITY_DETERMINED', icon: '⚖️', label: 'Ansvar' },
  { id: 'CLAIM_SUBMITTED',           icon: '💰', label: 'Kostnader' },
  { id: 'CLAIM_APPROVED',            icon: '💰', label: 'Kostnader' },
  { id: 'CLAIM_REJECTED',            icon: '💰', label: 'Kostnader' },
  { id: 'SETTLED',                   icon: '✅', label: 'Reglerat' },
  { id: 'CLOSED',                    icon: '✅', label: 'Reglerat' },
];

const PIPELINE_STEPS = [
  { key: 'incident',  icon: '🔴', label: 'Incident',  statuses: ['INCIDENT_CREATED'] },
  { key: 'tow',       icon: '🚚', label: 'Bärgning',  statuses: ['TOW_ORDERED','TOW_EN_ROUTE','VEHICLE_COLLECTED','VEHICLE_IN_TRANSIT'] },
  { key: 'reception', icon: '🏭', label: 'Mottagning', statuses: ['VEHICLE_DELIVERED'] },
  { key: 'liability', icon: '⚖️', label: 'Ansvar',    statuses: ['RESPONSIBILITY_DETERMINED'] },
  { key: 'costs',     icon: '💰', label: 'Kostnader', statuses: ['CLAIM_SUBMITTED','CLAIM_APPROVED','CLAIM_REJECTED'] },
  { key: 'settled',   icon: '✅', label: 'Reglerat',  statuses: ['SETTLED','CLOSED'] },
];

function getStepIndex(status: string): number {
  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    if (PIPELINE_STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function partyLabel(party?: string): string {
  switch (party) {
    case 'OEM_MOBILITY':          return 'OEM / Garanti';
    case 'INSURANCE':             return 'Försäkring';
    case 'SERVING_WORKSHOP':      return 'Utförande verkstad';
    case 'SELLING_WORKSHOP':      return 'Säljande verkstad';
    case 'CUSTOMER':              return 'Kund';
    case 'PENDING_DETERMINATION': return 'Granskning pågår';
    case 'PENDING':               return 'Estimeras vid diagnos';
    case 'SPLIT':                 return 'Delad kostnad';
    default:                      return party || '—';
  }
}

function urgencyColor(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL': return C.red;
    case 'HIGH':     return C.orange;
    default:         return C.blue;
  }
}

function issueIcon(type: string): string {
  switch (type) {
    case 'BREAKDOWN':    return '🔧';
    case 'ACCIDENT':     return '💥';
    case 'FLAT_TYRE':   return '🔩';
    case 'BATTERY':      return '🔋';
    case 'FUEL':         return '⛽';
    case 'LOCKED_OUT':   return '🔐';
    case 'OVERHEATING':  return '🌡️';
    case 'ELECTRICAL':   return '⚡';
    default:             return '❓';
  }
}

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('sv-SE')} kr`;
}

// ─── Pipeline progress bar ────────────────────────────────────────────────────
function PipelineProgress({ status }: { status: string }) {
  const activeIdx = getStepIndex(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        const future = i > activeIdx;

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              flex: 1,
            }}>
              <div style={{
                width: active ? 36 : 28,
                height: active ? 36 : 28,
                borderRadius: '50%',
                background: done ? C.green : active ? C.blue : C.fill,
                border: `2px solid ${done ? C.green : active ? C.blue : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: active ? 16 : 12,
                transition: 'all 0.2s',
                boxShadow: active ? `0 0 0 4px ${C.blue}22` : 'none',
              }}>
                {done ? '✓' : step.icon}
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400,
                color: active ? C.blue : done ? C.green : C.secondary,
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{
                height: 2, flex: 0.5,
                background: i < activeIdx ? C.green : C.border,
                marginBottom: 18,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Full incident view (airline-style) ───────────────────────────────────────
function MobilityIncidentDetail({
  incident,
  onBack,
}: {
  incident: MobilityIncident;
  onBack: () => void;
}) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{
        background: C.surface, borderRadius: 16, padding: '16px 20px',
        marginBottom: 16, boxShadow: shadow,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.blue, fontSize: 14, padding: 0, marginBottom: 12,
            fontFamily: 'inherit',
          }}
        >
          ← Tillbaka
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{issueIcon(incident.issue_type)}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {incident.vehicle_make} {incident.vehicle_model} · {incident.vehicle_reg}
                </div>
                <div style={{ fontSize: 14, color: C.secondary }}>
                  {incident.customer_name} · {incident.customer_phone}
                </div>
              </div>
            </div>
          </div>
          <span style={{
            background: urgencyColor(incident.urgency) + '18',
            color: urgencyColor(incident.urgency),
            borderRadius: 8, padding: '4px 10px',
            fontSize: 12, fontWeight: 700,
          }}>
            {incident.urgency}
          </span>
        </div>

        {incident.customer_description && (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: '#FFF9F0', borderRadius: 10, fontSize: 14,
            color: '#6B4A00', fontStyle: 'italic',
          }}>
            "{incident.customer_description}"
          </div>
        )}
      </div>

      {/* Pipeline progress */}
      <div style={{ background: C.surface, borderRadius: 16, padding: '20px 20px 12px', marginBottom: 16, boxShadow: shadow }}>
        <PipelineProgress status={incident.status} />
      </div>

      {/* Active step detail */}
      {['TOW_ORDERED','TOW_EN_ROUTE','VEHICLE_COLLECTED','VEHICLE_IN_TRANSIT'].includes(incident.status) && (
        <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 16, boxShadow: shadow }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: C.blue, marginBottom: 12, textTransform: 'uppercase',
          }}>
            🚚 Bärgning — aktiv
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Bärgningsleverantör</div>
              <div style={{ fontWeight: 600 }}>{incident.tow_provider || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Beställd · ETA</div>
              <div style={{ fontWeight: 600 }}>{incident.tow_ordered_at} · {incident.tow_eta}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Plats</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{incident.incident_location || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.secondary, marginBottom: 2 }}>Kostnadsestimat</div>
              <div style={{ fontWeight: 600 }}>{formatAmount(incident.tow_cost_estimate)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {incident.tow_provider_phone && (
              <a
                href={`tel:${incident.tow_provider_phone}`}
                style={{
                  flex: 1, background: C.blue, color: '#fff',
                  borderRadius: 10, padding: '10px 0', textAlign: 'center',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14,
                }}
              >
                📞 Ring bärgaren
              </a>
            )}
            <button style={{
              flex: 1, background: C.fill, border: 'none', cursor: 'pointer',
              borderRadius: 10, padding: '10px 0',
              fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
              color: C.text,
            }}>
              Uppdatera status
            </button>
          </div>
        </div>
      )}

      {/* Responsibility preview / result */}
      {incident.responsibility_party && (
        <div style={{
          background: C.surface, borderRadius: 16, padding: '18px 20px',
          marginBottom: 16, boxShadow: shadow,
          borderLeft: `4px solid ${C.purple}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: C.purple, marginBottom: 10, textTransform: 'uppercase',
          }}>
            ⚖️ {incident.status === 'RESPONSIBILITY_DETERMINED' ? 'Ansvar fastställt' : 'System förutspår'}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            {partyLabel(incident.responsibility_party)}
          </div>
          <div style={{ fontSize: 14, color: C.secondary }}>
            {incident.responsibility_reason}
          </div>
          {incident.status !== 'RESPONSIBILITY_DETERMINED' && (
            <div style={{
              marginTop: 8, fontSize: 12, color: C.tertiary,
              fontStyle: 'italic',
            }}>
              Bekräftas vid mottagning
            </div>
          )}
        </div>
      )}

      {/* Cost split */}
      {incident.cost_split && (
        <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 16, boxShadow: shadow }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: C.secondary, marginBottom: 12, textTransform: 'uppercase',
          }}>
            💰 Kostnadssplit {incident.status === 'CLAIM_SUBMITTED' ? '' : '(preliminär)'}
          </div>

          {(['towing','labor','parts'] as const).map(key => {
            const entry = incident.cost_split?.[key];
            if (!entry) return null;
            const labels: Record<string, string> = { towing: 'Bärgning', labor: 'Arbete', parts: 'Delar' };
            return (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: key !== 'parts' ? `1px solid ${C.border}` : 'none',
              }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{labels[key]}</span>
                  <span style={{
                    marginLeft: 8, fontSize: 12,
                    color: entry.party === 'OEM_MOBILITY' ? C.green : entry.party === 'PENDING' ? C.secondary : C.blue,
                  }}>
                    {entry.label || partyLabel(entry.party)}
                  </span>
                </div>
                <span style={{
                  fontWeight: 700,
                  color: entry.amount == null ? C.secondary : C.text,
                }}>
                  {formatAmount(entry.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      {incident.timeline && incident.timeline.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', boxShadow: shadow }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: C.secondary, marginBottom: 12, textTransform: 'uppercase',
          }}>
            Händelselogg
          </div>
          {incident.timeline.map((entry, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '8px 0',
              borderBottom: i < incident.timeline!.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{
                width: 44, flexShrink: 0,
                fontSize: 12, fontWeight: 600, color: C.secondary,
                paddingTop: 2,
              }}>
                {entry.time}
              </div>
              <div style={{ fontSize: 18, flexShrink: 0 }}>{entry.icon}</div>
              <div style={{ fontSize: 14, color: C.text }}>{entry.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compact card (for Ops Lead exception list) ───────────────────────────────
export function MobilityIncidentCard({
  incident,
  onViewFlow,
  onAssignWorkshop,
}: {
  incident: MobilityIncident;
  onViewFlow: (id: string) => void;
  onAssignWorkshop?: (id: string) => void;
}) {
  const statusLabel = FLOW_STEPS.find(s => s.id === incident.status)?.label || incident.status;

  return (
    <div style={{
      background: '#FFF5F5',
      border: `1px solid ${C.red}33`,
      borderLeft: `4px solid ${C.red}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 12,
    }}>
      {/* Badge */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: C.red,
          background: `${C.red}15`, borderRadius: 6, padding: '3px 8px',
          letterSpacing: 0.3,
        }}>
          🚨 MOBILITY INCIDENT
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: urgencyColor(incident.urgency),
        }}>
          {incident.urgency}
        </span>
      </div>

      {/* Vehicle + location */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
        {incident.vehicle_make} {incident.vehicle_model} · {incident.vehicle_reg}
        {incident.vehicle_make === 'Volvo' ? ' — Bärgad' : ''}
      </div>
      <div style={{ fontSize: 13, color: C.secondary, marginBottom: 8 }}>
        Från: {incident.incident_location}
      </div>

      {/* Status + ETA */}
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        <span style={{
          background: C.orange + '18', color: C.orange,
          borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 12,
        }}>
          {statusLabel} {incident.tow_eta ? `· ETA: ${incident.tow_eta}` : ''}
        </span>
      </div>

      {/* Responsibility hint */}
      {incident.responsibility_party && (
        <div style={{
          background: '#F0F9FF',
          border: `1px solid ${C.blue}33`,
          borderRadius: 10, padding: '10px 12px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 4 }}>
            💡 System
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {partyLabel(incident.responsibility_party)}
          </div>
          <div style={{ fontSize: 12, color: C.secondary }}>
            → {incident.responsibility_reason}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {onAssignWorkshop && (
          <button
            onClick={() => onAssignWorkshop(incident.id)}
            style={{
              flex: 1, background: C.fill, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '9px 0', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              color: C.text,
            }}
          >
            Tilldela verkstad
          </button>
        )}
        <button
          onClick={() => onViewFlow(incident.id)}
          style={{
            flex: 1, background: C.blue, border: 'none',
            borderRadius: 10, padding: '9px 0', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            color: '#fff',
          }}
        >
          Följ flöde →
        </button>
      </div>
    </div>
  );
}

// ─── Mobility overview list (standalone view) ──────────────────────────────────
export default function MobilityIncidentView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // In production: fetch from /api/mobility/active
  // For demo: use static demo data
  const incidents: MobilityIncident[] = [DEMO_MOBILITY_INCIDENT];

  if (selectedId) {
    const incident = incidents.find(i => i.id === selectedId);
    if (incident) {
      return (
        <MobilityIncidentDetail
          incident={incident}
          onBack={() => setSelectedId(null)}
        />
      );
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{
        background: C.surface, borderRadius: 16, padding: '18px 20px',
        marginBottom: 16, boxShadow: shadow,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Mobility & Bärgning</div>
            <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>
              Aktiva incidenter · Ansvar · Kostnader
            </div>
          </div>
          <div style={{
            background: incidents.length > 0 ? `${C.red}15` : `${C.green}15`,
            color: incidents.length > 0 ? C.red : C.green,
            borderRadius: 10, padding: '6px 12px',
            fontSize: 13, fontWeight: 700,
          }}>
            {incidents.length} aktiv{incidents.length !== 1 ? 'a' : ''}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Pågår', value: incidents.filter(i => !['SETTLED','CLOSED'].includes(i.status)).length, color: C.orange },
          { label: 'OEM/Garanti', value: incidents.filter(i => i.responsibility_party === 'OEM_MOBILITY').length, color: C.green },
          { label: 'Granskning', value: incidents.filter(i => i.responsibility_party === 'PENDING_DETERMINATION').length, color: C.purple },
        ].map(stat => (
          <div key={stat.label} style={{
            background: C.surface, borderRadius: 14, padding: '14px 16px',
            boxShadow: shadow, textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Incident cards */}
      {incidents.length === 0 ? (
        <div style={{
          background: C.surface, borderRadius: 16, padding: 32,
          textAlign: 'center', boxShadow: shadow,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Inga aktiva incidenter</div>
          <div style={{ fontSize: 14, color: C.secondary }}>Alla fordon är på plats.</div>
        </div>
      ) : (
        incidents.map(incident => (
          <MobilityIncidentCard
            key={incident.id}
            incident={incident}
            onViewFlow={(id) => setSelectedId(id)}
            onAssignWorkshop={(id) => console.log('Assign workshop:', id)}
          />
        ))
      )}
    </div>
  );
}

// ─── Re-export card for use in ServiceAdvisorView exceptions tab ───────────────
export { MobilityIncidentDetail };
export type { MobilityIncident };
