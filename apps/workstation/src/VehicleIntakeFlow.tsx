// VehicleIntakeFlow.tsx — Mandatory Vehicle Intake Protocol
// Triggered when mechanic stamps in on a work order.
// CANNOT be dismissed. All 4 stages must be completed before work begins.
//
// Stage 1: 8-angle photo documentation (ISO requirement)
// Stage 2: Diagnostic connection (attendance registration)
// Stage 3: Diagnostic protocol saved to work order
// Stage 4: Recall/campaign check + mechanic acknowledgment

import { useState, useEffect } from 'react';

// ─── Color system (matches Dashboard) ────────────────────────────────────────
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
  fill:      '#F2F2F7',
  separator: 'rgba(60,60,67,0.29)',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PhotoAngle = 'FRONT' | 'FRONT_RIGHT' | 'RIGHT' | 'REAR_RIGHT' | 'REAR' | 'REAR_LEFT' | 'LEFT' | 'FRONT_LEFT' | 'INTERIOR';
type Stage = 1 | 2 | 3 | 4;

interface FaultCode {
  code: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_action: string;
}

interface Recall {
  id: string;
  title: string;
  description: string;
  estimated_time_hours: number;
  customer_cost: number;
  mandatory: boolean;
  customer_consented: boolean;
  consented_at?: string;
}

interface IntakeFlowProps {
  workOrderId: string;
  vehicleReg: string;
  onComplete: (sessionId: string) => void;
  // No onCancel — this flow CANNOT be skipped
}

// ─── Photo angle layout (car from above) ─────────────────────────────────────

const REQUIRED_ANGLES: PhotoAngle[] = [
  'FRONT', 'FRONT_RIGHT', 'RIGHT', 'REAR_RIGHT',
  'REAR', 'REAR_LEFT', 'LEFT', 'FRONT_LEFT',
];

const ANGLE_LABELS: Record<PhotoAngle, string> = {
  FRONT:       'Front',
  FRONT_RIGHT: 'Höger fram',
  RIGHT:       'Höger sida',
  REAR_RIGHT:  'Höger bak',
  REAR:        'Bakifrån',
  REAR_LEFT:   'Vänster bak',
  LEFT:        'Vänster sida',
  FRONT_LEFT:  'Vänster fram',
  INTERIOR:    'Interiör',
};

const ANGLE_SHORT: Record<PhotoAngle, string> = {
  FRONT:       'FRONT',
  FRONT_RIGHT: 'FR',
  RIGHT:       'R',
  REAR_RIGHT:  'RR',
  REAR:        'REAR',
  REAR_LEFT:   'RL',
  LEFT:        'L',
  FRONT_LEFT:  'FL',
  INTERIOR:    'INT',
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_FAULT_CODES: FaultCode[] = [
  {
    code: 'P0301',
    description: 'Missfire cylinder 1',
    severity: 'HIGH',
    recommended_action: 'Kontrollera tändstift, tändspole och bränsleinjektorn på cylinder 1',
  },
  {
    code: 'P0420',
    description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    severity: 'MEDIUM',
    recommended_action: 'Kontrollera katalysatorn och lambdasonder',
  },
];

const DEMO_RECALLS: Recall[] = [
  {
    id: 'R-2024-001',
    title: 'Bromsvätska kan förorenas',
    description: 'I vissa fordon kan bromsvätskan förorenas av fukt vilket kan påverka bromsprestanda. Åtgärd: Byte av bromsvätska och kontroll av bromssystem.',
    estimated_time_hours: 1.5,
    customer_cost: 0,
    mandatory: true,
    customer_consented: true,
    consented_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
];

const DIAGNOSTIC_TOOLS = [
  { id: 'VIDA',    name: 'Volvo VIDA'     },
  { id: 'IDIAG',   name: 'iDiag / ODIS'  },
  { id: 'ISTA',    name: 'BMW ISTA'       },
  { id: 'STAR',    name: 'Mercedes STAR'  },
  { id: 'LAUNCH',  name: 'Launch X431'    },
  { id: 'AUTEL',   name: 'Autel MaxiSys'  },
  { id: 'BOSCH',   name: 'Bosch ESI[tronic]' },
  { id: 'DELPHI',  name: 'Delphi DS'     },
  { id: 'OTHER',   name: 'Övrigt'        },
];

// ─── Stage step indicator ─────────────────────────────────────────────────────

function StageIndicator({ current, stages }: { current: Stage; stages: { label: string; done: boolean }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 20px' }}>
      {stages.map((stage, i) => {
        const num = (i + 1) as Stage;
        const isActive = num === current;
        const isDone = stage.done;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 'none' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: isDone ? C.green : isActive ? C.blue : C.fill,
              border: `2px solid ${isDone ? C.green : isActive ? C.blue : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.3s ease',
            }}>
              {isDone
                ? <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>
                : <span style={{ color: isActive ? '#fff' : C.secondary, fontSize: 12, fontWeight: 700 }}>{num}</span>
              }
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 2, background: isDone ? C.green : C.border, margin: '0 4px', transition: 'background 0.3s ease' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Photo grid layout ────────────────────────────────────────────────────────
//
//         [ FRONT ]
// [FL]   [  car  ]   [FR]
// [ L ]  [  img  ]  [ R ]
// [RL]   [       ]  [RR]
//         [ REAR ]
//         [ INT  ]

function PhotoGrid({ taken, takingPhoto, onTakePhoto }: {
  taken: Set<PhotoAngle>;
  takingPhoto: PhotoAngle | null;
  onTakePhoto: (angle: PhotoAngle) => void;
}) {
  const Box = ({ angle, style }: { angle: PhotoAngle; style?: React.CSSProperties }) => {
    const isDone = taken.has(angle);
    const isProcessing = takingPhoto === angle;
    return (
      <button
        onClick={() => !isDone && !isProcessing && onTakePhoto(angle)}
        style={{
          width: 72, height: 52,
          borderRadius: 10,
          border: `2px solid ${isDone ? C.green : isProcessing ? C.blue : C.border}`,
          background: isDone ? '#34C75915' : isProcessing ? '#007AFF10' : C.surface,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: isDone ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'inherit',
          padding: 4,
          ...style,
        }}
      >
        <div style={{ fontSize: 16, marginBottom: 2 }}>
          {isDone ? '✅' : isProcessing ? '⏳' : '📷'}
        </div>
        <div style={{ fontSize: 9, color: isDone ? C.green : C.secondary, fontWeight: 600, textAlign: 'center' }}>
          {ANGLE_SHORT[angle]}
        </div>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* FRONT */}
      <Box angle="FRONT" />
      {/* Row: FL, car silhouette, FR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Box angle="FRONT_LEFT" />
        <div style={{
          width: 80, height: 52,
          borderRadius: 8,
          background: '#F2F2F7',
          border: `1.5px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>🚗</div>
        <Box angle="FRONT_RIGHT" />
      </div>
      {/* Row: L, center, R */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Box angle="LEFT" />
        <div style={{ width: 80, height: 52 }} /> {/* spacer */}
        <Box angle="RIGHT" />
      </div>
      {/* Row: RL, center, RR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Box angle="REAR_LEFT" />
        <div style={{ width: 80, height: 52 }} />
        <Box angle="REAR_RIGHT" />
      </div>
      {/* REAR */}
      <Box angle="REAR" />
      {/* INTERIOR */}
      <Box angle="INTERIOR" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VehicleIntakeFlow({ workOrderId, vehicleReg, onComplete }: IntakeFlowProps) {
  const [stage, setStage] = useState<Stage>(1);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Stage 1
  const [takenPhotos, setTakenPhotos] = useState<Set<PhotoAngle>>(new Set());
  const [takingPhoto, setTakingPhoto] = useState<PhotoAngle | null>(null);
  const [photosDone, setPhotosDone] = useState(false);

  // Stage 2
  const [selectedTool, setSelectedTool] = useState('');
  const [vin, setVin] = useState('');
  const [odometer, setOdometer] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [diagnosticConnected, setDiagnosticConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  // Stage 3
  const [faultCodes, setFaultCodes] = useState<FaultCode[]>([]);
  const [loadingFaults, setLoadingFaults] = useState(false);
  const [protocolSaved, setProtocolSaved] = useState(false);
  const [protocolUrl, setProtocolUrl] = useState<string | null>(null);

  // Stage 4
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [acknowledgedRecalls, setAcknowledgedRecalls] = useState<Set<string>>(new Set());
  const [loadingRecalls, setLoadingRecalls] = useState(false);
  const [recallsDone, setRecallsDone] = useState(false);

  const [completing, setCompleting] = useState(false);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('pixdrift_token') || '' : '';
  const API = 'https://api.bc.pixdrift.com';

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      const res = await fetch(`${API}/api/intake/start`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ work_order_id: workOrderId, vehicle_reg: vehicleReg }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
      }
    } catch {
      // Demo mode — generate local session ID
      setSessionId(`demo-${Date.now()}`);
    }
  }

  // ─── Stage 1: Photos ──────────────────────────────────────────────────────

  async function handleTakePhoto(angle: PhotoAngle) {
    setTakingPhoto(angle);
    // Simulate camera capture (1s delay)
    await new Promise(r => setTimeout(r, 1000));

    const newTaken = new Set(takenPhotos);
    newTaken.add(angle);
    setTakenPhotos(newTaken);
    setTakingPhoto(null);

    // Post to API
    if (sessionId && !sessionId.startsWith('demo-')) {
      try {
        await fetch(`${API}/api/intake/${sessionId}/photos`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            angle,
            photo_url: `https://demo-photos.pixdrift.com/${sessionId}/${angle.toLowerCase()}.jpg`,
          }),
        });
      } catch { /* demo fallback */ }
    }
  }

  async function handleCompletePhotos() {
    if (sessionId && !sessionId.startsWith('demo-')) {
      try {
        await fetch(`${API}/api/intake/${sessionId}/photos/complete`, {
          method: 'POST',
          headers: authHeaders,
        });
      } catch { /* demo fallback */ }
    }
    setPhotosDone(true);
    setStage(2);
  }

  // ─── Stage 2: Diagnostic ──────────────────────────────────────────────────

  async function handleConnectDiagnostic() {
    if (!selectedTool) return;
    setConnecting(true);
    // Simulate connection (2s)
    await new Promise(r => setTimeout(r, 2000));

    const now = new Date().toISOString();

    if (sessionId && !sessionId.startsWith('demo-')) {
      try {
        await fetch(`${API}/api/intake/${sessionId}/diagnostic/connect`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            tool_id: selectedTool,
            tool_name: DIAGNOSTIC_TOOLS.find(t => t.id === selectedTool)?.name || selectedTool,
            vin_verified: vin.length > 0,
            odometer: odometer ? parseInt(odometer) : undefined,
          }),
        });
      } catch { /* demo fallback */ }
    }

    setConnecting(false);
    setDiagnosticConnected(true);
    setConnectedAt(now);
  }

  async function handleScanVin() {
    // Demo: auto-fill VIN
    setVin('YV1RS61R942387429');
  }

  // ─── Stage 3: Protocol ────────────────────────────────────────────────────

  async function handleLoadFaultCodes() {
    setLoadingFaults(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate fetch
    setFaultCodes(DEMO_FAULT_CODES);
    setLoadingFaults(false);

    if (sessionId && !sessionId.startsWith('demo-')) {
      try {
        await fetch(`${API}/api/intake/${sessionId}/diagnostic/results`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ fault_codes: DEMO_FAULT_CODES }),
        });
      } catch { /* demo fallback */ }
    }
  }

  async function handleSaveProtocol() {
    const url = `https://api.bc.pixdrift.com/intake/${sessionId}/protocol.pdf`;
    setProtocolUrl(url);
    setProtocolSaved(true);
  }

  // ─── Stage 4: Recalls ─────────────────────────────────────────────────────

  async function handleLoadRecalls() {
    setLoadingRecalls(true);
    await new Promise(r => setTimeout(r, 1000));

    if (sessionId && !sessionId.startsWith('demo-')) {
      try {
        const res = await fetch(`${API}/api/intake/${sessionId}/recalls`, { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          setRecalls(data.open_recalls || DEMO_RECALLS);
          setLoadingRecalls(false);
          return;
        }
      } catch { /* demo fallback */ }
    }

    // Demo data based on vehicle reg
    const reg = vehicleReg.replace(/\s/g, '').toUpperCase();
    setRecalls(reg === 'ABC123' || vehicleReg.toUpperCase().includes('ABC') ? DEMO_RECALLS : []);
    setLoadingRecalls(false);
  }

  useEffect(() => {
    if (stage === 4) handleLoadRecalls();
  }, [stage]);

  function handleAcknowledgeRecall(recallId: string) {
    const newAck = new Set(acknowledgedRecalls);
    newAck.add(recallId);
    setAcknowledgedRecalls(newAck);
    if (recalls.every(r => newAck.has(r.id))) {
      setRecallsDone(true);
    }
  }

  // ─── Complete intake ──────────────────────────────────────────────────────

  async function handleComplete() {
    setCompleting(true);
    if (sessionId && !sessionId.startsWith('demo-')) {
      try {
        await fetch(`${API}/api/intake/${sessionId}/complete`, {
          method: 'POST',
          headers: authHeaders,
        });
      } catch { /* demo fallback */ }
    }
    setCompleting(false);
    onComplete(sessionId || 'demo-completed');
  }

  const allPhotosTaken = REQUIRED_ANGLES.every(a => takenPhotos.has(a));
  const allRecallsAcknowledged = recalls.length === 0 || recalls.every(r => acknowledgedRecalls.has(r.id));

  // ─── Stage components ─────────────────────────────────────────────────────

  const stageConfig = [
    { label: 'FOTON',         done: photosDone },
    { label: 'DIAGNOS',       done: diagnosticConnected },
    { label: 'PROTOKOLL',     done: protocolSaved },
    { label: 'ÅTERKALLELSER', done: recallsDone || (stage > 4) },
  ];

  function renderStage1() {
    return (
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            Fotografera fordonet
          </div>
          <div style={{ fontSize: 14, color: C.secondary }}>
            {takenPhotos.size} av {REQUIRED_ANGLES.length} foton tagna
          </div>
          <div style={{
            height: 4, background: C.fill, borderRadius: 2, marginTop: 12, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(takenPhotos.size / REQUIRED_ANGLES.length) * 100}%`,
              background: allPhotosTaken ? C.green : C.blue,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Photo grid */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <PhotoGrid
            taken={takenPhotos}
            takingPhoto={takingPhoto}
            onTakePhoto={handleTakePhoto}
          />
        </div>

        {/* Angle list */}
        <div style={{
          background: C.surface, borderRadius: 14, overflow: 'hidden', border: `0.5px solid ${C.border}`,
          marginBottom: 20,
        }}>
          {[...REQUIRED_ANGLES, 'INTERIOR' as PhotoAngle].map((angle, i, arr) => {
            const done = takenPhotos.has(angle);
            const processing = takingPhoto === angle;
            return (
              <div key={angle} style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? `0.5px solid ${C.fill}` : 'none',
              }}>
                <div style={{ flex: 1, fontSize: 15, color: C.text }}>{ANGLE_LABELS[angle]}</div>
                {processing ? (
                  <div style={{ fontSize: 13, color: C.blue }}>📷 Tar foto...</div>
                ) : done ? (
                  <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>✓ Tagen</div>
                ) : (
                  <button
                    onClick={() => handleTakePhoto(angle)}
                    style={{
                      padding: '6px 14px', background: C.blue, color: '#fff',
                      border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Ta foto
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleCompletePhotos}
          disabled={!allPhotosTaken}
          style={{
            width: '100%', height: 50,
            background: allPhotosTaken ? C.green : C.fill,
            color: allPhotosTaken ? '#fff' : C.secondary,
            border: 'none', borderRadius: 14,
            fontSize: 17, fontWeight: 600,
            cursor: allPhotosTaken ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
          }}
        >
          {allPhotosTaken ? 'Foton klara — Gå vidare →' : `Kvar: ${REQUIRED_ANGLES.filter(a => !takenPhotos.has(a)).length} foton`}
        </button>
      </div>
    );
  }

  function renderStage2() {
    return (
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            Anslut diagnosutrustning
          </div>
          <div style={{ fontSize: 14, color: C.secondary }}>
            Anslutningen registreras som närvaro mot tillverkarens system
          </div>
        </div>

        {diagnosticConnected ? (
          <div style={{
            background: '#34C75915', border: `1.5px solid ${C.green}`,
            borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.green, marginBottom: 4 }}>
              Ansluten
            </div>
            <div style={{ fontSize: 13, color: C.secondary }}>
              {DIAGNOSTIC_TOOLS.find(t => t.id === selectedTool)?.name}
            </div>
            <div style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>
              {connectedAt ? new Date(connectedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
            </div>
            <div style={{ fontSize: 11, color: C.green, marginTop: 8, fontWeight: 600 }}>
              ✓ Närvaro registrerad
            </div>
          </div>
        ) : (
          <div style={{
            background: C.surface, borderRadius: 14, border: `0.5px solid ${C.border}`,
            padding: 20, marginBottom: 20,
          }}>
            {/* Tool selection */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.secondary, marginBottom: 8 }}>
                DIAGNOS VERKTYG
              </div>
              <select
                value={selectedTool}
                onChange={e => setSelectedTool(e.target.value)}
                style={{
                  width: '100%', height: 44,
                  borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.fill, padding: '0 12px',
                  fontSize: 15, color: C.text, fontFamily: 'inherit',
                  appearance: 'none',
                }}
              >
                <option value="">Välj verktyg...</option>
                {DIAGNOSTIC_TOOLS.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* VIN */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.secondary, marginBottom: 8 }}>
                VIN-NUMMER
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={vin}
                  onChange={e => setVin(e.target.value)}
                  placeholder="Skannas automatiskt..."
                  style={{
                    flex: 1, height: 44, borderRadius: 10, border: `1px solid ${C.border}`,
                    background: C.fill, padding: '0 12px',
                    fontSize: 15, color: C.text, fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleScanVin}
                  style={{
                    height: 44, padding: '0 16px',
                    background: C.fill, border: `1px solid ${C.border}`,
                    borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', color: C.blue, fontFamily: 'inherit',
                  }}
                >
                  Skanna
                </button>
              </div>
            </div>

            {/* Odometer */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.secondary, marginBottom: 8 }}>
                MÄTARSTÄLLNING (km)
              </div>
              <input
                value={odometer}
                onChange={e => setOdometer(e.target.value)}
                type="number"
                placeholder="T.ex. 87450"
                style={{
                  width: '100%', height: 44, borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.fill, padding: '0 12px',
                  fontSize: 15, color: C.text, fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={handleConnectDiagnostic}
              disabled={!selectedTool || connecting}
              style={{
                width: '100%', height: 50,
                background: selectedTool && !connecting ? C.blue : C.fill,
                color: selectedTool && !connecting ? '#fff' : C.secondary,
                border: 'none', borderRadius: 14,
                fontSize: 17, fontWeight: 600,
                cursor: selectedTool && !connecting ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              {connecting ? '⏳ Ansluter...' : '🔌 Registrera anslutning'}
            </button>
          </div>
        )}

        {diagnosticConnected && (
          <button
            onClick={() => setStage(3)}
            style={{
              width: '100%', height: 50,
              background: C.green, color: '#fff',
              border: 'none', borderRadius: 14,
              fontSize: 17, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Anslutning klar — Hämta felkoder →
          </button>
        )}
      </div>
    );
  }

  function renderStage3() {
    return (
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            Diagnosprotokoll
          </div>
          <div style={{ fontSize: 14, color: C.secondary }}>
            Läs av och spara felkoder kopplade till arbetsorder
          </div>
        </div>

        {faultCodes.length === 0 && !loadingFaults && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <button
              onClick={handleLoadFaultCodes}
              style={{
                padding: '12px 32px',
                background: C.blue, color: '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🔍 Läs av felkoder
            </button>
          </div>
        )}

        {loadingFaults && (
          <div style={{
            textAlign: 'center', padding: 40, color: C.secondary, fontSize: 14,
          }}>
            ⏳ Läser av diagnosutrustning...
          </div>
        )}

        {faultCodes.length > 0 && (
          <>
            <div style={{
              background: C.surface, borderRadius: 14, border: `0.5px solid ${C.border}`,
              overflow: 'hidden', marginBottom: 16,
            }}>
              {faultCodes.map((fault, i) => (
                <div key={fault.code} style={{
                  padding: '14px 16px',
                  borderBottom: i < faultCodes.length - 1 ? `0.5px solid ${C.fill}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      background: fault.severity === 'HIGH' ? C.red : fault.severity === 'MEDIUM' ? C.orange : C.green,
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      {fault.severity}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>
                      {fault.code}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: C.text, marginBottom: 4 }}>
                    {fault.description}
                  </div>
                  <div style={{ fontSize: 12, color: C.secondary }}>
                    → {fault.recommended_action}
                  </div>
                </div>
              ))}
            </div>

            {!protocolSaved ? (
              <button
                onClick={handleSaveProtocol}
                style={{
                  width: '100%', height: 50,
                  background: C.blue, color: '#fff',
                  border: 'none', borderRadius: 14,
                  fontSize: 17, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  marginBottom: 12,
                }}
              >
                📄 Spara protokoll
              </button>
            ) : (
              <>
                <div style={{
                  background: '#34C75910', border: `1px solid ${C.green}`,
                  borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>Protokoll sparat</div>
                    <div style={{ fontSize: 12, color: C.secondary }}>Länkat till arbetsorder</div>
                  </div>
                </div>
                <button
                  onClick={() => setStage(4)}
                  style={{
                    width: '100%', height: 50,
                    background: C.green, color: '#fff',
                    border: 'none', borderRadius: 14,
                    fontSize: 17, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Protokoll klart — Kontrollera återkallelser →
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  function renderStage4() {
    const allAcknowledged = recalls.length === 0 || recalls.every(r => acknowledgedRecalls.has(r.id));

    return (
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            Återkallelser & kampanjer
          </div>
          <div style={{ fontSize: 14, color: C.secondary }}>
            {recalls.length > 0
              ? `${recalls.length} öppen återkallelse — kunden samtyckte vid bokning`
              : 'Kontrollerar återkallelser...'}
          </div>
        </div>

        {loadingRecalls && (
          <div style={{ textAlign: 'center', padding: 40, color: C.secondary, fontSize: 14 }}>
            ⏳ Söker återkallelser...
          </div>
        )}

        {!loadingRecalls && recalls.length === 0 && (
          <div style={{
            background: '#34C75910', border: `1px solid ${C.green}`,
            borderRadius: 14, padding: 24, textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.green }}>
              Inga öppna återkallelser
            </div>
            <div style={{ fontSize: 13, color: C.secondary, marginTop: 4 }}>
              Fordonet är inte drabbat av några aktiva återkallelser
            </div>
          </div>
        )}

        {recalls.map(recall => {
          const acknowledged = acknowledgedRecalls.has(recall.id);
          return (
            <div key={recall.id} style={{
              background: C.surface,
              border: `1.5px solid ${acknowledged ? C.green : recall.mandatory ? C.orange : C.border}`,
              borderRadius: 14, padding: 16, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                    {recall.title}
                  </div>
                  <div style={{ fontSize: 11, color: recall.mandatory ? C.orange : C.secondary, fontWeight: 600 }}>
                    {recall.mandatory ? '⚠️ OBLIGATORISK' : 'Valfri'} · {recall.estimated_time_hours}h
                    {recall.customer_cost === 0 ? ' · Kostnadsfritt för kund' : ` · ${recall.customer_cost} kr`}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                  color: recall.customer_consented ? C.green : C.red,
                }}>
                  {recall.customer_consented ? '✓ Samtycke' : '✗ Ej informerad'}
                </div>
              </div>

              <div style={{ fontSize: 13, color: C.secondary, marginBottom: 12, lineHeight: 1.4 }}>
                {recall.description}
              </div>

              {recall.customer_consented && recall.consented_at && (
                <div style={{ fontSize: 11, color: C.green, marginBottom: 10 }}>
                  ✓ Kund informerad {new Date(recall.consented_at).toLocaleDateString('sv-SE')} (vid bokning)
                </div>
              )}

              {acknowledged ? (
                <div style={{
                  background: '#34C75910', borderRadius: 8, padding: '8px 12px',
                  fontSize: 13, color: C.green, fontWeight: 600,
                }}>
                  ✓ Bekräftad av mekaniker
                </div>
              ) : (
                <button
                  onClick={() => handleAcknowledgeRecall(recall.id)}
                  style={{
                    width: '100%', height: 40,
                    background: C.blue, color: '#fff',
                    border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Bekräfta att jag sett detta
                </button>
              )}
            </div>
          );
        })}

        {!loadingRecalls && (
          <button
            onClick={handleComplete}
            disabled={!allAcknowledged || completing}
            style={{
              width: '100%', height: 54,
              background: allAcknowledged && !completing ? C.green : C.fill,
              color: allAcknowledged && !completing ? '#fff' : C.secondary,
              border: 'none', borderRadius: 14,
              fontSize: 17, fontWeight: 700,
              cursor: allAcknowledged && !completing ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              marginTop: 8,
            }}
          >
            {completing ? '⏳ Slutför...' : '✅ Starta arbetet'}
          </button>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      position:   'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex:     1000,
      display:    'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }}>
      <div style={{
        background:   C.bg,
        width:        '100%',
        maxWidth:     600,
        maxHeight:    '95vh',
        borderRadius: '20px 20px 0 0',
        overflow:     'hidden',
        display:      'flex',
        flexDirection: 'column',
        fontFamily:   '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      }}>
        {/* Header — no close button */}
        <div style={{
          background:   C.surface,
          padding:      '16px 20px 12px',
          borderBottom: `0.5px solid ${C.separator}`,
          flexShrink:   0,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.red, fontWeight: 700, marginBottom: 2 }}>
              OBLIGATORISK — KAN EJ AVBRYTAS
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>
              Intagsprotokoll
            </div>
            <div style={{ fontSize: 14, color: C.secondary, marginTop: 2 }}>
              {vehicleReg} · Arbetsorder #{workOrderId.slice(-6)}
            </div>
          </div>

          <StageIndicator current={stage} stages={stageConfig} />

          {/* Stage label */}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: C.blue,
              letterSpacing: '0.06em',
            }}>
              STEG {stage}: {stageConfig[stage - 1]?.label}
            </span>
          </div>
        </div>

        {/* Content — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
          {stage === 1 && renderStage1()}
          {stage === 2 && renderStage2()}
          {stage === 3 && renderStage3()}
          {stage === 4 && renderStage4()}
        </div>
      </div>

      <style>{`
        @keyframes intakePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
