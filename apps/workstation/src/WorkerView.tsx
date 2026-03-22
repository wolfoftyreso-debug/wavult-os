// WorkerView.tsx — The "show the work" view
// Designed for: mechanics, technicians, field workers
// NOT for: managers, CEOs, sales people
//
// 3-second rule: worker must understand their full day in 3 seconds

import { useState, useEffect } from 'react';

// Color system — same as Dashboard
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
  fill:      "#F2F2F7",
  separator: "rgba(60,60,67,0.29)",
};

interface Job {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string | null;
  progress?: number;
  status: string;
  type?: string;
  reg?: string;
  duration?: string;
  missing_parts?: boolean;
  customer_waiting?: boolean;
  overdue?: boolean;
}

interface Risk {
  type: string;
  message: string;
  time?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Demo data — shown when API is unavailable
const DEMO_CURRENT: Job = {
  id: '1',
  title: 'Audi A6 — Service + bromsar',
  start_time: '08:00',
  end_time: '10:30',
  location: 'Lift 2',
  progress: 65,
  status: 'IN_PROGRESS',
  type: 'SERVICE',
  reg: 'ABC 123',
};

const DEMO_QUEUE: Job[] = [
  { id: '2', title: 'Volvo XC60 — Felsökning',    start_time: '10:30', duration: '1.5h', status: 'WAITING', customer_waiting: true, reg: 'DEF 456' },
  { id: '3', title: 'BMW 320 — Service',           start_time: '12:00', duration: '2h',   status: 'WAITING', reg: 'GHI 789' },
  { id: '4', title: 'VW Golf — Byte bromskiva',    start_time: '14:30', duration: '1.5h', status: 'WAITING', missing_parts: true, reg: 'JKL 012' },
];

const DEMO_RISKS: Risk[] = [
  { type: 'PARTS',    message: 'Del saknas: VW Golf (kl 14:30)',  severity: 'HIGH'   },
  { type: 'CUSTOMER', message: 'Kund väntar: Volvo XC60',         severity: 'MEDIUM' },
];

// ─── Normalizers ──────────────────────────────────────────────────────────────
function normalizeTask(task: any): Job {
  return {
    id:         task.id,
    title:      task.title || task.name,
    start_time: task.due_date
      ? new Date(task.due_date).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      : '--',
    end_time:   '--',
    status:     task.status,
    progress:   task.progress_pct || 0,
    type:       'TASK',
  };
}

function normalizeWorkOrder(wo: any): Job {
  return {
    id:       wo.id,
    title:    `${wo.vehicle_reg || ''} — ${wo.work_type || wo.description || ''}`.trim(),
    start_time: wo.started_at
      ? new Date(wo.started_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      : '--',
    end_time: wo.promised_date
      ? new Date(wo.promised_date).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      : '--',
    status:   wo.status,
    progress: wo.progress_pct || 0,
    location: wo.bay_number ? `Lift ${wo.bay_number}` : null,
    type:     'WORK_ORDER',
    reg:      wo.vehicle_reg,
  };
}

// ─── WorkerView ───────────────────────────────────────────────────────────────
export default function WorkerView({ user }: { user: any }) {
  const [currentJob, setCurrentJob]   = useState<Job | null>(null);
  const [queue,      setQueue]         = useState<Job[]>([]);
  const [risks,      setRisks]         = useState<Risk[]>([]);
  const [dayProgress, setDayProgress] = useState({ completed: 0, total: 0, onTime: true });
  const [loading,    setLoading]       = useState(true);

  const workerName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.full_name?.split(' ')[0]
    || user?.name?.split(' ')[0]
    || 'du';

  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('pixdrift_token')) || '';
  const API   = 'https://api.bc.pixdrift.com';

  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'God morgon'
    : hour < 17  ? 'God eftermiddag'
    : 'God kväll';
  const dayName = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'][new Date().getDay()];
  const dateStr = new Date().toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });

  useEffect(() => { loadWorkerData(); }, []);

  async function loadWorkerData() {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [tasksRes, workOrdersRes] = await Promise.allSettled([
        fetch(`${API}/api/tasks/my`, { headers }),
        fetch(`${API}/api/workshop/work-orders?technician=me&date=today`, { headers }),
      ]);

      const tasks = (tasksRes.status === 'fulfilled' && tasksRes.value.ok)
        ? await tasksRes.value.json() : [];
      const workOrders = (workOrdersRes.status === 'fulfilled' && workOrdersRes.value.ok)
        ? await workOrdersRes.value.json() : [];

      const allWork: Job[] = [
        ...tasks.map(normalizeTask),
        ...workOrders.map(normalizeWorkOrder),
      ].sort((a, b) => a.start_time.localeCompare(b.start_time));

      if (allWork.length === 0) throw new Error('no data');

      const current = allWork.find(j => j.status === 'IN_PROGRESS') || allWork[0] || null;
      const nextJobs = allWork.filter(j => j !== current && j.status !== 'COMPLETED');

      const detectedRisks: Risk[] = [];
      allWork.forEach(job => {
        if (job.missing_parts)    detectedRisks.push({ type: 'PARTS',    message: `Del saknas: ${job.title}`,        time: job.start_time, severity: 'HIGH'   });
        if (job.customer_waiting) detectedRisks.push({ type: 'CUSTOMER', message: `Kund väntar: ${job.title}`,                             severity: 'MEDIUM' });
        if (job.overdue)          detectedRisks.push({ type: 'DELAY',    message: `Förseningsrisk: ${job.title}`,                           severity: 'HIGH'   });
      });

      setCurrentJob(current);
      setQueue(nextJobs.slice(0, 4));
      setRisks(detectedRisks);
      setDayProgress({
        completed: allWork.filter(j => j.status === 'COMPLETED').length,
        total:     allWork.length,
        onTime:    detectedRisks.filter(r => r.severity === 'HIGH').length === 0,
      });
    } catch {
      // Fall back to demo data so screen is never empty
      setCurrentJob(DEMO_CURRENT);
      setQueue(DEMO_QUEUE);
      setRisks(DEMO_RISKS);
      setDayProgress({ completed: 1, total: 4, onTime: true });
    } finally {
      setLoading(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ fontSize: 14, color: C.secondary }}>Laddar ditt arbete...</div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background:  C.bg,
      minHeight:   '100vh',
      fontFamily:  '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      maxWidth:    600,
      margin:      '0 auto',
      padding:     '0 0 60px 0',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding:      '16px 20px 12px',
        background:   C.surface,
        borderBottom: `0.5px solid ${C.separator}`,
        position:     'sticky',
        top:          0,
        zIndex:       10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.text }}>
              {greeting}, {workerName}
            </div>
            <div style={{ fontSize: 13, color: C.secondary, marginTop: 2 }}>
              {dayName} · {dateStr}
            </div>
          </div>
          <div style={{
            fontSize:    12,
            fontWeight:  600,
            color:       dayProgress.onTime ? C.green : C.orange,
            background:  dayProgress.onTime ? '#34C75910' : '#FF950010',
            padding:     '4px 12px',
            borderRadius: 980,
          }}>
            {dayProgress.onTime ? '✓ I tid' : '⚠️ Risk för försening'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── NU — current job, dominant block ── */}
        {currentJob && (
          <div style={{ marginTop: 16, marginBottom: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: C.secondary,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 8, paddingLeft: 4,
            }}>
              NU
            </div>

            <div style={{
              background:   C.surface,
              borderRadius: 16,
              overflow:     'hidden',
              border:       `0.5px solid ${C.border}`,
              boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {/* Blue progress sliver at top of card */}
              <div style={{ height: 3, background: C.blue, width: `${currentJob.progress ?? 65}%` }} />

              <div style={{ padding: '20px 20px 16px' }}>
                {/* Title + live indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>
                      {currentJob.title}
                    </div>
                    <div style={{ fontSize: 14, color: C.secondary }}>
                      {currentJob.start_time}
                      {currentJob.end_time && currentJob.end_time !== '--' ? ` – ${currentJob.end_time}` : ''}
                      {currentJob.location ? ` · ${currentJob.location}` : ''}
                    </div>
                  </div>
                  {/* Pulsing live dot */}
                  <div style={{
                    width:      10,
                    height:     10,
                    borderRadius: '50%',
                    background: C.blue,
                    boxShadow:  `0 0 0 4px ${C.blue}30`,
                    marginTop:  6,
                    flexShrink: 0,
                    animation:  'workerPulse 2s infinite',
                  }} />
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.secondary }}>Framsteg</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.blue }}>
                      {currentJob.progress ?? 65}% klart
                    </span>
                  </div>
                  <div style={{ height: 6, background: C.fill, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height:     '100%',
                      width:      `${currentJob.progress ?? 65}%`,
                      background: C.blue,
                      borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button style={{
                    height: 44, background: C.blue, color: '#fff',
                    border: 'none', borderRadius: 12,
                    fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Uppdatera
                  </button>
                  <button style={{
                    height: 44, background: C.fill, color: C.text,
                    border: 'none', borderRadius: 12,
                    fontSize: 15, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Rapportera problem
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ATT TÄNKA PÅ — risks, only shown if any ── */}
        {risks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              background:   '#FFF3E0',
              border:       `0.5px solid ${C.orange}40`,
              borderRadius: 12,
              padding:      '14px 16px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 8 }}>
                ⚠️ Att tänka på
              </div>
              {risks.map((risk, i) => (
                <div key={i} style={{
                  fontSize:     14,
                  color:        '#4A3000',
                  paddingLeft:  10,
                  marginBottom: i < risks.length - 1 ? 6 : 0,
                  borderLeft:   `2px solid ${risk.severity === 'HIGH' ? C.red : C.orange}`,
                }}>
                  {risk.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NÄSTA — job queue ── */}
        {queue.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: C.secondary,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 8, paddingLeft: 4,
            }}>
              NÄSTA
            </div>
            <div style={{
              background:   C.surface,
              borderRadius: 14,
              overflow:     'hidden',
              border:       `0.5px solid ${C.border}`,
            }}>
              {queue.map((job, i) => (
                <div key={job.id} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          14,
                  padding:      '14px 16px',
                  borderBottom: i < queue.length - 1 ? `0.5px solid ${C.fill}` : 'none',
                }}>
                  {/* Time stamp */}
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize:   13,
                    color:      C.secondary,
                    flexShrink: 0,
                    width:      40,
                  }}>
                    {job.start_time}
                  </div>

                  {/* Job title + duration */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:     15,
                      fontWeight:   500,
                      color:        C.text,
                      marginBottom: 2,
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {job.title}
                    </div>
                    {job.duration && (
                      <div style={{ fontSize: 12, color: C.secondary }}>{job.duration}</div>
                    )}
                  </div>

                  {/* Risk badge */}
                  {(job.missing_parts || job.customer_waiting) && (
                    <div style={{
                      fontSize:   11,
                      fontWeight: 600,
                      color:      job.missing_parts ? C.red : C.orange,
                      flexShrink: 0,
                    }}>
                      {job.missing_parts ? '❌ Del saknas' : '👤 Väntar'}
                    </div>
                  )}

                  <div style={{ color: C.tertiary, fontSize: 16, flexShrink: 0 }}>›</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MIN DAG — day summary ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.secondary,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 8, paddingLeft: 4,
          }}>
            MIN DAG
          </div>
          <div style={{
            background:   C.surface,
            borderRadius: 14,
            padding:      '16px 20px',
            border:       `0.5px solid ${C.border}`,
          }}>
            {/* Three stat counters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                  {dayProgress.completed}
                </div>
                <div style={{ fontSize: 11, color: C.secondary }}>Klara</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>
                  {dayProgress.total - dayProgress.completed}
                </div>
                <div style={{ fontSize: 11, color: C.secondary }}>Kvar</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: risks.length > 0 ? C.orange : C.green, fontVariantNumeric: 'tabular-nums' }}>
                  {risks.length}
                </div>
                <div style={{ fontSize: 11, color: C.secondary }}>Risker</div>
              </div>
            </div>

            {/* Day completion bar */}
            <div>
              <div style={{ height: 6, background: C.fill, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height:     '100%',
                  width:      `${dayProgress.total ? (dayProgress.completed / dayProgress.total) * 100 : 0}%`,
                  background: C.green,
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: C.secondary, marginTop: 6, textAlign: 'right' }}>
                {dayProgress.completed} av {dayProgress.total} jobb klara
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes workerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
