import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// ApprovalEngine.tsx — Real-time Customer Approval System
// pixdrift Workstation App — Apple HIG Design Language
// ============================================================

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'https://api.bc.pixdrift.com';

async function apiCall(endpoint: string, options?: RequestInit): Promise<any> {
  const token = localStorage.getItem('pixdrift_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };
  if (token) (headers as any)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Types ────────────────────────────────────────────────

type IssueCategory = 'SAFETY' | 'MAINTENANCE' | 'PREVENTIVE' | 'COSMETIC';
type Urgency       = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type ApprovalStatus = 'PENDING' | 'VIEWED' | 'APPROVED' | 'REJECTED' | 'CALLBACK' | 'EXPIRED';

interface Approval {
  id: string;
  work_order_id: string;
  customer_token: string;
  issue_category: IssueCategory;
  urgency: Urgency;
  status: ApprovalStatus;
  simple_explanation_title?: string;
  simple_explanation?: string;
  risk_if_ignored?: string;
  price_estimate?: number;
  time_estimate_hours?: number;
  video_url?: string;
  technician_notes?: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_reg?: string;
  workshop_name?: string;
  created_at: string;
  customer_viewed_at?: string;
  customer_responded_at?: string;
  sms_sent_at?: string;
  wait_minutes?: number;
}

interface UploadUrlResponse {
  upload_url: string;
  cdn_url: string;
  key: string;
}

interface CreateApprovalResponse {
  approval_id: string;
  customer_link: string;
  expires_at: string;
  translation: {
    simple_explanation_title: string;
    simple_explanation: string;
    recommended_action: string;
    risk_if_ignored: string;
    delay_cost_warning: string;
  };
}

// ── Constants ────────────────────────────────────────────

const CATEGORY_CONFIG: Record<IssueCategory, { label: string; emoji: string; color: string; bg: string }> = {
  SAFETY:     { label: 'Säkerhet',      emoji: '🔴', color: '#FF3B30', bg: '#FFF0EE' },
  MAINTENANCE:{ label: 'Underhåll',     emoji: '🟠', color: '#FF9500', bg: '#FFF8EE' },
  PREVENTIVE: { label: 'Förebyggande',  emoji: '🔵', color: '#007AFF', bg: '#EEF5FF' },
  COSMETIC:   { label: 'Kosmetisk',     emoji: '⚪', color: '#8E8E93', bg: '#F2F2F7' },
};

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string; dot: string }> = {
  CRITICAL: { label: 'Kritiskt',      color: '#FF3B30', dot: '🔴' },
  HIGH:     { label: 'Viktigt',       color: '#FF9500', dot: '🟠' },
  MEDIUM:   { label: 'Rekommenderat', color: '#007AFF', dot: '🔵' },
  LOW:      { label: 'Frivilligt',    color: '#34C759', dot: '🟢' },
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Inväntar svar', color: '#FF9500', bg: '#FFF8EE' },
  VIEWED:   { label: 'Sedd',          color: '#007AFF', bg: '#EEF5FF' },
  APPROVED: { label: 'Godkänd ✓',    color: '#34C759', bg: '#EEFAF1' },
  REJECTED: { label: 'Avböjd',        color: '#FF3B30', bg: '#FFF0EE' },
  CALLBACK: { label: 'Ring önskas',  color: '#AF52DE', bg: '#F5EEFF' },
  EXPIRED:  { label: 'Utgången',     color: '#8E8E93', bg: '#F2F2F7' },
};

// ── Styles (inline — consistent with workstation app) ─────

const S = {
  // Container
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    background: '#F2F2F7',
    minHeight: '100vh',
    color: '#000',
    WebkitFontSmoothing: 'antialiased',
  } as React.CSSProperties,

  // Section header
  sectionHeader: {
    padding: '20px 20px 8px',
    fontSize: 13,
    fontWeight: 600,
    color: '#8E8E93',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },

  // Card
  card: {
    background: '#fff',
    borderRadius: 16,
    margin: '0 16px 12px',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,

  // Primary button
  btnPrimary: {
    width: '100%', height: 52,
    background: '#007AFF', color: '#fff',
    border: 'none', borderRadius: 13,
    fontSize: 17, fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 10,
  } as React.CSSProperties,

  // Destructive button
  btnDestructive: {
    width: '100%', height: 52,
    background: '#FF3B30', color: '#fff',
    border: 'none', borderRadius: 13,
    fontSize: 17, fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer',
    marginBottom: 10,
  } as React.CSSProperties,

  // Secondary button
  btnSecondary: {
    flex: 1, height: 44,
    background: '#F2F2F7', color: '#007AFF',
    border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer',
  } as React.CSSProperties,

  // Label
  label: { fontSize: 13, color: '#8E8E93', marginBottom: 6, fontWeight: 500 },

  // Input
  input: {
    width: '100%', height: 44, padding: '0 14px',
    background: '#F2F2F7', border: 'none', borderRadius: 10,
    fontSize: 15, fontFamily: 'inherit', color: '#000',
    marginBottom: 14,
  } as React.CSSProperties,

  // Textarea
  textarea: {
    width: '100%', padding: '12px 14px',
    background: '#F2F2F7', border: 'none', borderRadius: 10,
    fontSize: 15, fontFamily: 'inherit', color: '#000',
    resize: 'vertical' as const, minHeight: 80,
    marginBottom: 14,
  } as React.CSSProperties,

  // Divider
  divider: { height: 0.5, background: '#E5E5EA', margin: '12px 0' },

  // Badge
  badge: (color: string, bg: string) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 10px', borderRadius: 980,
    fontSize: 12, fontWeight: 700,
    color, background: bg,
  } as React.CSSProperties),
};

// ── Sub-components ────────────────────────────────────────

function WaitTimer({ createdAt, viewedAt }: { createdAt: string; viewedAt?: string }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    const update = () => {
      const start = new Date(createdAt).getTime();
      setMins(Math.floor((Date.now() - start) / 60000));
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [createdAt]);

  const color = mins < 30 ? '#34C759' : mins < 60 ? '#FF9500' : '#FF3B30';

  return (
    <span style={{ fontSize: 13, color, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
      {mins < 60 ? `${mins}min` : `${Math.floor(mins/60)}h ${mins%60}min`}
    </span>
  );
}

function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={S.badge(cfg.color, cfg.bg)}>{cfg.label}</span>
  );
}

// ── Main Component ────────────────────────────────────────

interface ApprovalEngineProps {
  workOrderId: string;
  customerId?: string;
  vehicleReg?: string;
  workshopName?: string;
  onClose?: () => void;
}

type View = 'list' | 'create' | 'preview' | 'status';

export default function ApprovalEngine({
  workOrderId,
  customerId,
  vehicleReg,
  workshopName,
  onClose,
}: ApprovalEngineProps) {
  // View state
  const [view, setView] = useState<View>('list');

  // Create form state
  const [category, setCategory] = useState<IssueCategory>('MAINTENANCE');
  const [urgency, setUrgency]   = useState<Urgency>('MEDIUM');
  const [price, setPrice]       = useState('');
  const [notes, setNotes]       = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [createdApproval, setCreatedApproval] = useState<CreateApprovalResponse | null>(null);

  // List state
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load pending approvals ──────────────────────────────

  const loadPending = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await apiCall(`/api/approvals/pending?work_order_id=${workOrderId}`);
      setPendingApprovals(data.approvals || []);
    } catch (err) {
      console.error('[ApprovalEngine] Load pending failed:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, [workOrderId, apiCall]);

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [loadPending]);

  // ── Video recording ─────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
        audio: true,
      });
      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const file = new File([blob], `approval-${Date.now()}.mp4`, { type: 'video/mp4' });
        setVideoFile(file);
        setVideoPreviewUrl(URL.createObjectURL(blob));
        setRecordedChunks(chunks);

        // Stop camera
        stream.getTracks().forEach(t => t.stop());
        setMediaStream(null);
        if (videoRef.current) videoRef.current.srcObject = null;
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Auto-stop after 90 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') stopRecording(recorder);
      }, 90000);

    } catch (err) {
      console.error('[Video] Failed to start recording:', err);
      alert('Kunde inte starta kameran. Kontrollera behörigheter.');
    }
  };

  const stopRecording = (recorder?: MediaRecorder) => {
    const rec = recorder || mediaRecorder;
    if (rec && rec.state === 'recording') {
      rec.stop();
    }
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  // ── Upload video to S3 ──────────────────────────────────

  const uploadVideo = async (file: File): Promise<string | null> => {
    try {
      // Get presigned URL
      const urlData: UploadUrlResponse = await apiCall(
        `/api/approvals/upload-url?work_order_id=${workOrderId}&file_type=video`
      );

      // Upload directly to S3
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', urlData.upload_url);
      xhr.setRequestHeader('Content-Type', 'video/mp4');

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Upload error'));
        xhr.send(file);
      });

      return urlData.cdn_url;
    } catch (err) {
      console.error('[Upload] Failed:', err);
      return null;
    }
  };

  // ── Submit approval request ─────────────────────────────

  const handleSubmit = async () => {
    if (!category || !urgency) return;
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let videoUrl: string | undefined;

      if (videoFile) {
        const uploaded = await uploadVideo(videoFile);
        if (uploaded) videoUrl = uploaded;
      }

      const body = {
        work_order_id: workOrderId,
        issue_category: category,
        urgency,
        technician_price_estimate: price ? parseFloat(price) : undefined,
        technician_notes: notes || undefined,
        video_url: videoUrl,
      };

      const result: CreateApprovalResponse = await apiCall('/api/approvals/capture', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      setCreatedApproval(result);
      setView('preview');
      await loadPending();

    } catch (err) {
      console.error('[ApprovalEngine] Submit failed:', err);
      alert('Det gick inte att skicka godkännandet. Försök igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Send reminder ───────────────────────────────────────

  const sendReminder = async (approvalId: string) => {
    try {
      await apiCall(`/api/approvals/${approvalId}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'manual_reminder' }),
        headers: { 'Content-Type': 'application/json' },
      });
      await loadPending();
    } catch (err) {
      console.error('[Reminder] Failed:', err);
    }
  };

  // ── Reset form ──────────────────────────────────────────

  const resetForm = () => {
    setCategory('MAINTENANCE');
    setUrgency('MEDIUM');
    setPrice('');
    setNotes('');
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setCreatedApproval(null);
    setUploadProgress(0);
  };

  // ── Render: List view ───────────────────────────────────

  const renderList = () => (
    <div style={S.container}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '0.5px solid #E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Kundgodkännanden</div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>
            {pendingApprovals.length > 0
              ? `${pendingApprovals.filter(a => a.status === 'PENDING' || a.status === 'VIEWED').length} inväntar svar`
              : 'Inga väntande godkännanden'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { resetForm(); setView('create'); }}
            style={{ ...S.btnPrimary, width: 'auto', height: 40, padding: '0 18px', fontSize: 15, marginBottom: 0 }}
          >
            + Nytt fynd
          </button>
          {onClose && (
            <button onClick={onClose} style={{ ...S.btnSecondary, height: 40, padding: '0 14px' }}>✕</button>
          )}
        </div>
      </div>

      {/* Pending list */}
      {isLoadingList && pendingApprovals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>Laddar...</div>
      ) : pendingApprovals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Inga aktiva godkännanden</div>
          <div style={{ fontSize: 14, color: '#8E8E93', marginBottom: 24 }}>
            Hittade du ett problem? Skapa ett godkännande så kontaktas kunden direkt.
          </div>
          <button
            onClick={() => { resetForm(); setView('create'); }}
            style={{ ...S.btnPrimary, width: 'auto', padding: '0 24px' }}
          >
            Skapa godkännande
          </button>
        </div>
      ) : (
        <>
          <div style={S.sectionHeader}>Inväntar svar</div>
          {pendingApprovals.map(a => (
            <div key={a.id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => { setSelectedApproval(a); setView('status'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {a.simple_explanation_title || CATEGORY_CONFIG[a.issue_category]?.label || a.issue_category}
                  </div>
                  <div style={{ fontSize: 13, color: '#8E8E93' }}>
                    {a.vehicle_reg && `${a.vehicle_reg} · `}{a.customer_name || 'Kund'}
                  </div>
                </div>
                <ApprovalStatusBadge status={a.status} />
              </div>

              <div style={S.divider} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={S.badge(URGENCY_CONFIG[a.urgency].color, '#F2F2F7')}>
                    {URGENCY_CONFIG[a.urgency].dot} {URGENCY_CONFIG[a.urgency].label}
                  </span>
                  {a.price_estimate && (
                    <span style={{ fontSize: 14, color: '#3C3C43', fontWeight: 600 }}>
                      {Math.round(a.price_estimate).toLocaleString('sv-SE')} kr
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#8E8E93' }}>
                  Väntat: <WaitTimer createdAt={a.created_at} viewedAt={a.customer_viewed_at} />
                </div>
              </div>

              {(a.status === 'PENDING' || a.status === 'VIEWED') && (
                <button
                  onClick={(e) => { e.stopPropagation(); sendReminder(a.id); }}
                  style={{ ...S.btnSecondary, marginTop: 10, width: '100%', height: 36, fontSize: 13, background: '#F2F2F7', color: '#FF9500' }}
                >
                  📨 Skicka påminnelse
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );

  // ── Render: Create view ─────────────────────────────────

  const renderCreate = () => (
    <div style={S.container}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '0.5px solid #E5E5EA', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: '#007AFF', fontFamily: 'inherit', padding: 0 }}>
          ← Tillbaka
        </button>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Nytt fynd</div>
      </div>

      <div style={{ padding: '0 0 32px' }}>

        {/* Category selection */}
        <div style={S.sectionHeader}>Typ av problem</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 16px 12px' }}>
          {(Object.keys(CATEGORY_CONFIG) as IssueCategory[]).map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '14px 12px',
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? cfg.color : 'transparent'}`,
                  background: isSelected ? cfg.bg : '#fff',
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{cfg.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? cfg.color : '#000' }}>{cfg.label}</div>
              </button>
            );
          })}
        </div>

        {/* Urgency selection */}
        <div style={S.sectionHeader}>Prioritet</div>
        <div style={{ ...S.card, padding: '4px 0' }}>
          {(Object.keys(URGENCY_CONFIG) as Urgency[]).map(urg => {
            const cfg = URGENCY_CONFIG[urg];
            const isSelected = urgency === urg;
            return (
              <div
                key={urg}
                onClick={() => setUrgency(urg)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', cursor: 'pointer',
                  background: isSelected ? `${cfg.color}12` : 'transparent',
                  borderRadius: 10, margin: '2px 4px',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{cfg.dot}</span>
                  <span style={{ fontSize: 15, fontWeight: isSelected ? 700 : 400, color: isSelected ? cfg.color : '#000' }}>
                    {cfg.label}
                  </span>
                </div>
                {isSelected && <span style={{ color: cfg.color, fontWeight: 700 }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Video capture */}
        <div style={S.sectionHeader}>Video (rekommenderas)</div>
        <div style={S.card}>
          {videoPreviewUrl ? (
            <div>
              <video src={videoPreviewUrl} controls style={{ width: '100%', borderRadius: 10, marginBottom: 10 }} />
              <button
                onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); }}
                style={{ ...S.btnSecondary, width: '100%', height: 40, color: '#FF3B30', background: '#FFF0EE' }}
              >
                🗑 Ta bort video
              </button>
            </div>
          ) : isRecording ? (
            <div>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', borderRadius: 10, marginBottom: 12, background: '#000' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF3B30', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: 14, color: '#FF3B30', fontWeight: 600 }}>Spelar in... (max 90s)</span>
              </div>
              <button
                onClick={() => stopRecording()}
                style={{ ...S.btnDestructive, fontSize: 16 }}
              >
                ⏹ Stoppa inspelning
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={startRecording}
                style={{ ...S.btnPrimary, height: 54, marginBottom: 0, fontSize: 15 }}
              >
                🎥 Filma problem
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ ...S.btnSecondary, height: 54, fontSize: 15 }}
              >
                📂 Välj fil
              </button>
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
          )}
        </div>

        {/* Price & notes */}
        <div style={S.sectionHeader}>Kostnadsestimat & Anteckningar</div>
        <div style={S.card}>
          <div style={S.label}>Estimerad kostnad (kr inkl. moms)</div>
          <input
            type="number"
            placeholder="t.ex. 2400"
            value={price}
            onChange={e => setPrice(e.target.value)}
            style={S.input}
          />
          <div style={S.label}>Tekniker-anteckningar (AI översätter till kundspråk)</div>
          <textarea
            placeholder="t.ex. Bromsbelägg fram 2mm, limit 3mm. Behöver bytas asap."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={S.textarea}
          />
        </div>

        {/* Submit */}
        <div style={{ margin: '0 16px' }}>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#8E8E93', marginBottom: 6 }}>Laddar upp video... {uploadProgress}%</div>
              <div style={{ height: 4, background: '#E5E5EA', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#007AFF', borderRadius: 2, transition: 'width 0.2s' }} />
              </div>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ ...S.btnPrimary, height: 54, fontSize: 17, opacity: isSubmitting ? 0.7 : 1, background: '#34C759' }}
          >
            {isSubmitting ? 'Skickar till kund...' : '📤 Skicka SMS till kund'}
          </button>
          <p style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
            AI översätter din input till enkelt kundspråk. SMS skickas direkt.
          </p>
        </div>

      </div>
    </div>
  );

  // ── Render: Preview / Success view ─────────────────────

  const renderPreview = () => {
    if (!createdApproval) return null;
    const t = createdApproval.translation;

    return (
      <div style={S.container}>
        <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '0.5px solid #E5E5EA', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>SMS skickat ✓</div>
        </div>

        <div style={{ textAlign: 'center', padding: '32px 20px 20px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#34C759', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>SMS skickat till kunden!</div>
          <div style={{ fontSize: 14, color: '#8E8E93', marginBottom: 24 }}>Du meddelas direkt när kunden svarar.</div>

          {/* Customer preview */}
          <div style={S.sectionHeader}>Kunden ser detta:</div>
          <div style={{ ...S.card, textAlign: 'left', background: '#F9F9FB' }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t.simple_explanation_title}</div>
            <div style={{ fontSize: 14, color: '#3C3C43', lineHeight: 1.6, marginBottom: 10 }}>{t.simple_explanation}</div>
            <div style={{ background: '#FFF3E0', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: '#795548' }}>⚠️ {t.risk_if_ignored}</div>
            </div>
            <div style={{ fontSize: 13, color: '#8E8E93' }}>📎 {t.recommended_action}</div>
          </div>
        </div>

        <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setView('list')} style={{ ...S.btnPrimary, fontSize: 16 }}>
            Tillbaka till listan
          </button>
          <button
            onClick={() => { resetForm(); setView('create'); }}
            style={{ ...S.btnSecondary, height: 48, fontSize: 15 }}
          >
            + Skapa nytt fynd
          </button>
        </div>
      </div>
    );
  };

  // ── Render: Status detail view ──────────────────────────

  const renderStatus = () => {
    if (!selectedApproval) return null;
    const a = selectedApproval;

    return (
      <div style={S.container}>
        <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '0.5px solid #E5E5EA', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: '#007AFF', fontFamily: 'inherit', padding: 0 }}>
            ← Tillbaka
          </button>
          <div style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>Status</div>
          <ApprovalStatusBadge status={a.status} />
        </div>

        {/* Issue summary */}
        <div style={S.sectionHeader}>Ärende</div>
        <div style={S.card}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{a.simple_explanation_title || a.issue_category}</div>
          {a.simple_explanation && <div style={{ fontSize: 14, color: '#3C3C43', lineHeight: 1.6, marginBottom: 10 }}>{a.simple_explanation}</div>}
          <div style={S.divider} />
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div>
              <div style={{ ...S.label, marginBottom: 2 }}>Prioritet</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: URGENCY_CONFIG[a.urgency].color }}>
                {URGENCY_CONFIG[a.urgency].dot} {URGENCY_CONFIG[a.urgency].label}
              </div>
            </div>
            {a.price_estimate && (
              <div>
                <div style={{ ...S.label, marginBottom: 2 }}>Estimat</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(a.price_estimate).toLocaleString('sv-SE')} kr</div>
              </div>
            )}
          </div>
        </div>

        {/* Customer info */}
        <div style={S.sectionHeader}>Kund</div>
        <div style={S.card}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{a.customer_name || '—'}</div>
          {a.vehicle_reg && <div style={{ fontSize: 13, color: '#8E8E93' }}>Fordon: {a.vehicle_reg}</div>}
          {a.customer_phone && <div style={{ fontSize: 13, color: '#8E8E93' }}>Tel: {a.customer_phone}</div>}
        </div>

        {/* Timeline */}
        <div style={S.sectionHeader}>Tidslinje</div>
        <div style={S.card}>
          {[
            { label: 'SMS skickat',       time: a.sms_sent_at, icon: '📤' },
            { label: 'Kunden öppnade',    time: a.customer_viewed_at, icon: '👀' },
            { label: 'Kunden svarade',    time: a.customer_responded_at, icon: '✅' },
          ].map(({ label, time, icon }) => (
            <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #F2F2F7' }}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
              </div>
              <div style={{ fontSize: 13, color: time ? '#3C3C43' : '#C7C7CC' }}>
                {time
                  ? new Date(time).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                  : '—'
                }
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {(a.status === 'PENDING' || a.status === 'VIEWED') && (
          <div style={{ margin: '0 16px 32px' }}>
            <button
              onClick={() => sendReminder(a.id).then(() => setView('list'))}
              style={{ ...S.btnSecondary, width: '100%', height: 50, fontSize: 15, color: '#FF9500', background: '#FFF8EE' }}
            >
              📨 Skicka påminnelse
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Root render ──────────────────────────────────────────

  return (
    <div>
      {view === 'list'    && renderList()}
      {view === 'create'  && renderCreate()}
      {view === 'preview' && renderPreview()}
      {view === 'status'  && renderStatus()}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ── Standalone button to inject into WorkOrder detail page ─

export function ApprovalEngineButton({
  workOrderId,
  pendingCount = 0,
  onClick,
}: {
  workOrderId: string;
  pendingCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px', borderRadius: 12,
        background: pendingCount > 0 ? '#FFF8EE' : '#EEF5FF',
        border: `1.5px solid ${pendingCount > 0 ? '#FF9500' : '#007AFF'}`,
        color: pendingCount > 0 ? '#FF9500' : '#007AFF',
        fontSize: 15, fontWeight: 700,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <span>📋</span>
      <span>Kundgodkännande</span>
      {pendingCount > 0 && (
        <span style={{
          position: 'absolute', top: -6, right: -6,
          width: 20, height: 20, borderRadius: '50%',
          background: '#FF3B30', color: '#fff',
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {pendingCount}
        </span>
      )}
    </button>
  );
}
