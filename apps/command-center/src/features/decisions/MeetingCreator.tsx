// ─── MeetingCreator — 5-stegs wizard för att skapa beslutsmöten ─────────────
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react'
import { HumanFigure } from '../../shared/design-system/HumanFigure'
import type {
  MeetingLevel,
  RiskLevel,
} from './decisionTypes'
import { MEETING_LEVEL_LABELS, MEETING_AUTHORITY } from './decisionTypes'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Typer ────────────────────────────────────────────────────────────────────

interface DraftAlternative {
  id: 'A' | 'B' | 'C'
  title: string
  description: string
  revenueImpact: string
  costImpact: string
  riskLevel: RiskLevel
  timeframe: string
  operationalImpact: string
}

interface DraftBlock {
  id: string
  title: string
  context: string
  problemStatement: string
  objective: string
  alternatives: [DraftAlternative, DraftAlternative, DraftAlternative]
}

interface DraftMeeting {
  level: MeetingLevel | ''
  title: string
  scheduledAt: string
  participants: string
  agenda: DraftBlock[]
}

function emptyAlternatives(): [DraftAlternative, DraftAlternative, DraftAlternative] {
  return [
    { id: 'A', title: '', description: '', revenueImpact: '0', costImpact: '0', riskLevel: 'low', timeframe: '', operationalImpact: '' },
    { id: 'B', title: '', description: '', revenueImpact: '0', costImpact: '0', riskLevel: 'medium', timeframe: '', operationalImpact: '' },
    { id: 'C', title: '', description: '', revenueImpact: '0', costImpact: '0', riskLevel: 'high', timeframe: '', operationalImpact: '' },
  ]
}

function emptyBlock(_meetingId: string): DraftBlock {
  return {
    id: `block-${Date.now()}`,
    title: '',
    context: '',
    problemStatement: '',
    objective: '',
    alternatives: emptyAlternatives(),
  }
}

const LEVEL_ICONS: Record<MeetingLevel, string> = {
  annual: '🏛️',
  qbr: '📊',
  monthly: '📅',
  weekly: '🗓️',
  daily: '☀️',
}

const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: 'Låg' },
  { value: 'medium', label: 'Medel' },
  { value: 'high', label: 'Hög' },
  { value: 'critical', label: 'Kritisk' },
]

// ─── Steg-header ─────────────────────────────────────────────────────────────

function StepHeader({
  step,
  total,
  title,
  description,
}: {
  step: number
  total: number
  title: string
  description: string
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i < step ? 'var(--color-brand)' : i === step - 1 ? 'var(--color-brand)' : 'var(--color-border)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <p style={{
        margin: '0 0 4px',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Steg {step} av {total}
      </p>
      <h2 style={{
        margin: '0 0 8px',
        fontSize: 'var(--text-xl)',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
      }}>
        {title}
      </h2>
      <p style={{
        margin: 0,
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-secondary)',
      }}>
        {description}
      </p>
    </div>
  )
}

// ─── Input-komponenter ────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 6,
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 80,
  lineHeight: 1.5,
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

// ─── Steg 1 — Välj mötesnivå ─────────────────────────────────────────────────

function Step1Level({
  draft,
  onChange,
}: {
  draft: DraftMeeting
  onChange: (level: MeetingLevel) => void
}) {
  const levels: MeetingLevel[] = ['annual', 'qbr', 'monthly', 'weekly', 'daily']

  return (
    <div>
      <StepHeader
        step={1}
        total={5}
        title="Välj mötesnivå"
        description="Mötesnivån avgör vilka typer av beslut som får fattas. Varje nivå har definierade befogenheter."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {levels.map(level => (
          <div
            key={level}
            style={{
              border: draft.level === level ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '16px 20px',
              cursor: 'pointer',
              background: draft.level === level ? 'var(--color-brand-light)' : 'var(--color-surface)',
              transition: 'all 0.15s',
            }}
            onClick={() => onChange(level)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{LEVEL_ICONS[level]}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                  {MEETING_LEVEL_LABELS[level]}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Befogenheter: {MEETING_AUTHORITY[level].join(', ')}
                </p>
              </div>
              {draft.level === level && (
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--color-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={12} color="#fff" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Steg 2 — Datum + deltagare ──────────────────────────────────────────────

function Step2Details({
  draft,
  onChange,
}: {
  draft: DraftMeeting
  onChange: (updates: Partial<DraftMeeting>) => void
}) {
  return (
    <div>
      <StepHeader
        step={2}
        total={5}
        title="Detaljer"
        description="Ange mötestitel, datum och deltagare."
      />
      <Field label="Mötestitel" required>
        <input
          style={inputStyle}
          value={draft.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="t.ex. Annual Planning 2026 — Wavult Group"
        />
      </Field>
      <Field label="Datum & tid" required>
        <input
          style={inputStyle}
          type="datetime-local"
          value={draft.scheduledAt}
          onChange={e => onChange({ scheduledAt: e.target.value })}
        />
      </Field>
      <Field label="Deltagare (e-postadresser, komma-separerade)" required>
        <textarea
          style={textareaStyle}
          value={draft.participants}
          onChange={e => onChange({ participants: e.target.value })}
          placeholder="erik@hypbit.com, winston@hypbit.com, leon@hypbit.com"
        />
      </Field>
    </div>
  )
}

// ─── Steg 3 — Lägg till agenda-punkter ───────────────────────────────────────

function Step3Agenda({
  draft,
  onChange,
}: {
  draft: DraftMeeting
  onChange: (agenda: DraftBlock[]) => void
}) {
  function addBlock() {
    onChange([...draft.agenda, emptyBlock('new')])
  }

  function removeBlock(idx: number) {
    onChange(draft.agenda.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <StepHeader
        step={3}
        total={5}
        title="Agenda-punkter"
        description="Varje agenda-punkt är en beslutspunkt. Mötet kräver minst 1 beslutspunkt för att kunna skapas."
      />

      {draft.agenda.length === 0 && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger)',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: 'center',
        }}>
          <AlertCircle size={16} color="var(--color-danger)" />
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-danger)', fontWeight: 500 }}>
            Agenda saknas — mötet kan inte skapas utan beslutspunkter
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {draft.agenda.map((block, i) => (
          <div key={block.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--color-brand)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 'var(--text-xs)',
              flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {block.title || `Beslutspunkt ${i + 1} (ej namngiven)`}
              </p>
              {block.objective && (
                <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Mål: {block.objective}
                </p>
              )}
            </div>
            <button
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-danger)',
                padding: 4,
              }}
              onClick={() => removeBlock(i)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 6,
          border: '1px dashed var(--color-brand)',
          background: 'transparent',
          color: 'var(--color-brand)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'center',
        }}
        onClick={addBlock}
      >
        <Plus size={16} />
        Lägg till beslutspunkt
      </button>
    </div>
  )
}

// ─── Steg 4 — Redigera beslutspunkter ────────────────────────────────────────

function Step4Blocks({
  draft,
  onChange,
}: {
  draft: DraftMeeting
  onChange: (agenda: DraftBlock[]) => void
}) {
  function updateBlock(idx: number, updates: Partial<DraftBlock>) {
    const newAgenda = draft.agenda.map((b, i) => (i === idx ? { ...b, ...updates } : b))
    onChange(newAgenda)
  }

  function updateAlt(
    blockIdx: number,
    altId: 'A' | 'B' | 'C',
    updates: Partial<DraftAlternative>
  ) {
    const block = draft.agenda[blockIdx]
    const newAlts = block.alternatives.map(a =>
      a.id === altId ? { ...a, ...updates } : a
    ) as [DraftAlternative, DraftAlternative, DraftAlternative]
    updateBlock(blockIdx, { alternatives: newAlts })
  }

  if (draft.agenda.length === 0) {
    return (
      <div>
        <StepHeader
          step={4}
          total={5}
          title="Beslutspunkter"
          description="Inga beslutspunkter att konfigurera."
        />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Gå tillbaka och lägg till beslutspunkter i steg 3.
        </p>
      </div>
    )
  }

  return (
    <div>
      <StepHeader
        step={4}
        total={5}
        title="Konfigurera beslutspunkter"
        description="Fyll i rubrik, kontext, problem, målsättning och tre alternativ per beslutspunkt."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {draft.agenda.map((block, blockIdx) => (
          <div key={block.id} style={{
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Block-header */}
            <div style={{
              padding: '12px 20px',
              background: 'var(--color-bg-muted)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                Beslutspunkt {blockIdx + 1}
              </p>
            </div>

            <div style={{ padding: '20px' }}>
              <Field label="Rubrik" required>
                <input
                  style={inputStyle}
                  value={block.title}
                  onChange={e => updateBlock(blockIdx, { title: e.target.value })}
                  placeholder="t.ex. Budgetallokering 2026"
                />
              </Field>
              <Field label="Kontext">
                <textarea
                  style={textareaStyle}
                  value={block.context}
                  onChange={e => updateBlock(blockIdx, { context: e.target.value })}
                  placeholder="Bakgrund och situationsanalys..."
                />
              </Field>
              <Field label="Problemformulering" required>
                <textarea
                  style={textareaStyle}
                  value={block.problemStatement}
                  onChange={e => updateBlock(blockIdx, { problemStatement: e.target.value })}
                  placeholder="Vilket konkret problem ska beslutet lösa?"
                />
              </Field>
              <Field label="Målsättning" required>
                <input
                  style={inputStyle}
                  value={block.objective}
                  onChange={e => updateBlock(blockIdx, { objective: e.target.value })}
                  placeholder="Mätbart mål: 'Definiera kapitalallokering som ger ≥40% YoY tillväxt'"
                />
              </Field>

              {/* Alternativ */}
              <div style={{ marginTop: 24 }}>
                <p style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 16,
                }}>
                  Tre alternativ (A / B / C)
                </p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {block.alternatives.map(alt => (
                    <div key={alt.id} style={{
                      flex: 1,
                      minWidth: 240,
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: '16px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                      }}>
                        <span style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'var(--color-brand)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 'var(--text-xs)',
                        }}>
                          {alt.id}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          Alternativ {alt.id}
                        </span>
                      </div>

                      <Field label="Titel" required>
                        <input
                          style={inputStyle}
                          value={alt.title}
                          onChange={e => updateAlt(blockIdx, alt.id, { title: e.target.value })}
                          placeholder="Kort namn"
                        />
                      </Field>
                      <Field label="Beskrivning">
                        <textarea
                          style={{ ...textareaStyle, minHeight: 60 }}
                          value={alt.description}
                          onChange={e => updateAlt(blockIdx, alt.id, { description: e.target.value })}
                          placeholder="Vad innebär detta alternativ?"
                        />
                      </Field>
                      <Field label="Intäktspåverkan (SEK)">
                        <input
                          style={inputStyle}
                          type="number"
                          value={alt.revenueImpact}
                          onChange={e => updateAlt(blockIdx, alt.id, { revenueImpact: e.target.value })}
                        />
                      </Field>
                      <Field label="Kostnad (SEK, negativt)">
                        <input
                          style={inputStyle}
                          type="number"
                          value={alt.costImpact}
                          onChange={e => updateAlt(blockIdx, alt.id, { costImpact: e.target.value })}
                        />
                      </Field>
                      <Field label="Risknivå">
                        <select
                          style={selectStyle}
                          value={alt.riskLevel}
                          onChange={e => updateAlt(blockIdx, alt.id, { riskLevel: e.target.value as RiskLevel })}
                        >
                          {RISK_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Tidsram">
                        <input
                          style={inputStyle}
                          value={alt.timeframe}
                          onChange={e => updateAlt(blockIdx, alt.id, { timeframe: e.target.value })}
                          placeholder="t.ex. Q3 2026"
                        />
                      </Field>
                      <Field label="Operationell påverkan">
                        <textarea
                          style={{ ...textareaStyle, minHeight: 60 }}
                          value={alt.operationalImpact}
                          onChange={e => updateAlt(blockIdx, alt.id, { operationalImpact: e.target.value })}
                          placeholder="Konsekvenser för organisation och drift"
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Steg 5 — Granskning ─────────────────────────────────────────────────────

function Step5Review({ draft }: { draft: DraftMeeting }) {
  const participants = draft.participants
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <div>
      <StepHeader
        step={5}
        total={5}
        title="Granska och skapa"
        description="Kontrollera att allt stämmer innan du skapar mötet."
      />

      <div style={{
        background: 'var(--color-bg-subtle)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '20px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ReviewRow label="Nivå" value={MEETING_LEVEL_LABELS[draft.level as MeetingLevel] ?? '—'} />
          <ReviewRow label="Titel" value={draft.title || '—'} />
          <ReviewRow label="Datum" value={draft.scheduledAt ? new Date(draft.scheduledAt).toLocaleString('sv-SE') : '—'} />
          <ReviewRow
            label="Deltagare"
            value={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HumanFigure
                  variant="group"
                  count={Math.min(5, Math.max(3, participants.length)) as 3 | 4 | 5}
                  size="sm"
                />
                <span>{participants.length} deltagare</span>
              </div>
            }
          />
          <ReviewRow label="Beslutspunkter" value={`${draft.agenda.length} st`} />
        </div>
      </div>

      {draft.agenda.map((block, i) => (
        <div key={block.id} style={{
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 12,
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
            {i + 1}. {block.title || '(Ej namngiven)'}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Mål: {block.objective || '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{
        minWidth: 120,
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: 500 }}>
        {value}
      </span>
    </div>
  )
}

// ─── Valideringslogik ─────────────────────────────────────────────────────────

function validateStep(step: number, draft: DraftMeeting): string | null {
  if (step === 1 && !draft.level) return 'Välj en mötesnivå.'
  if (step === 2) {
    if (!draft.title.trim()) return 'Mötestitel krävs.'
    if (!draft.scheduledAt) return 'Datum krävs.'
    if (!draft.participants.trim()) return 'Minst en deltagare krävs.'
  }
  if (step === 3 && draft.agenda.length === 0) return 'Minst en beslutspunkt krävs.'
  if (step === 4) {
    for (const block of draft.agenda) {
      if (!block.title.trim()) return 'Alla beslutspunkter måste ha en rubrik.'
      if (!block.objective.trim()) return 'Alla beslutspunkter måste ha en målsättning.'
      for (const alt of block.alternatives) {
        if (!alt.title.trim()) return `Alternativ ${alt.id} saknar titel i "${block.title || 'beslutspunkt'}".`
      }
    }
  }
  return null
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export function MeetingCreator() {
  const { t: _t } = useTranslation() // ready for i18n
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [draft, setDraft] = useState<DraftMeeting>({
    level: '',
    title: '',
    scheduledAt: '',
    participants: 'erik@hypbit.com',
    agenda: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  function updateDraft(updates: Partial<DraftMeeting>) {
    setDraft(prev => ({ ...prev, ...updates }))
    setError(null)
  }

  function goNext() {
    const err = validateStep(currentStep, draft)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setCurrentStep(prev => Math.min(prev + 1, 5))
  }

  function goBack() {
    setError(null)
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  function handleCreate() {
    const err = validateStep(5, draft)
    if (err) { setError(err); return }
    // MVP: Lagra lokalt / navigera till dashboard
    setCreated(true)
    setTimeout(() => navigate('/decisions'), 1500)
  }

  if (created) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-success-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Check size={28} color="var(--color-success)" />
        </div>
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Mötet skapades
        </h2>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Omdirigerar till Beslutssystem...
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-bg)',
      minHeight: '100%',
      padding: '24px',
    }}>
      {/* Nav-header */}
      <div style={{ marginBottom: 24 }}>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            padding: 0,
          }}
          onClick={() => navigate('/decisions')}
        >
          <ChevronLeft size={16} />
          Avbryt
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Steg-innehåll */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '32px',
          marginBottom: 16,
        }}>
          {currentStep === 1 && (
            <Step1Level draft={draft} onChange={level => updateDraft({ level })} />
          )}
          {currentStep === 2 && (
            <Step2Details draft={draft} onChange={updateDraft} />
          )}
          {currentStep === 3 && (
            <Step3Agenda draft={draft} onChange={agenda => updateDraft({ agenda })} />
          )}
          {currentStep === 4 && (
            <Step4Blocks draft={draft} onChange={agenda => updateDraft({ agenda })} />
          )}
          {currentStep === 5 && (
            <Step5Review draft={draft} />
          )}
        </div>

        {/* Felmeddelande */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger)',
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <AlertCircle size={16} color="var(--color-danger)" />
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-danger)', fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: currentStep === 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
              fontWeight: 500,
              fontSize: 'var(--text-sm)',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            }}
            disabled={currentStep === 1}
            onClick={goBack}
          >
            <ChevronLeft size={16} />
            Tillbaka
          </button>

          {currentStep < 5 ? (
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--color-brand)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
              onClick={goNext}
            >
              Nästa
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--color-success)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
              onClick={handleCreate}
            >
              <Check size={16} />
              Skapa möte
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
