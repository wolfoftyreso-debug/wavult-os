// ─── MeetingView — Visar ett beslutsmöte ─────────────────────────────────────
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { HumanFigure } from '../../shared/design-system/HumanFigure'
import { DecisionBlockCard } from './DecisionBlockCard'
import { mockMeetings } from './mockDecisions'
import type { Meeting, DecisionBlock, VoteChoice } from './decisionTypes'
import { MEETING_LEVEL_LABELS, STATUS_LABELS } from './decisionTypes'
import { generateMinutes } from './decisionEngine'

// ─── Status-badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Meeting['status'] }) {
  const config = {
    blocked: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', label: STATUS_LABELS.blocked },
    scheduled: { bg: 'var(--color-info-bg)', color: 'var(--color-info)', label: STATUS_LABELS.scheduled },
    in_progress: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: STATUS_LABELS.in_progress },
    completed: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: STATUS_LABELS.completed },
  }[status]

  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      background: config.bg,
      color: config.color,
      letterSpacing: '0.03em',
    }}>
      {config.label}
    </span>
  )
}

function LevelBadge({ level }: { level: Meeting['level'] }) {
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      background: 'var(--color-brand-light)',
      color: 'var(--color-brand)',
      letterSpacing: '0.03em',
    }}>
      {MEETING_LEVEL_LABELS[level]}
    </span>
  )
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

interface MeetingViewProps {
  /** Direkt möte (om inte via router) */
  meeting?: Meeting
}

export function MeetingView({ meeting: propMeeting }: MeetingViewProps) {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()

  const meeting = propMeeting ?? mockMeetings.find(m => m.id === meetingId)

  const [agenda, setAgenda] = useState<DecisionBlock[]>(meeting?.agenda ?? [])
  const [minutesText, setMinutesText] = useState<string | null>(null)

  if (!meeting) {
    return (
      <div style={{ padding: 32, color: 'var(--color-text-muted)' }}>
        Mötet hittades inte.
      </div>
    )
  }

  const allDecided = agenda.length > 0 && agenda.every(b => b.status === 'decided' || b.result !== null)

  function handleVote(blockId: string, choice: VoteChoice) {
    setAgenda(prev =>
      prev.map(b =>
        b.id === blockId
          ? {
              ...b,
              votes: { ...b.votes, 'current-user': choice },
            }
          : b
      )
    )
  }

  function handleGenerateMinutes() {
    const text = generateMinutes({
      title: meeting!.title,
      level: meeting!.level,
      scheduledAt: meeting!.scheduledAt,
      participants: meeting!.participants,
      agenda,
    })
    setMinutesText(text)
  }

  const scheduledDate = new Date(meeting.scheduledAt)
  const dateStr = scheduledDate.toLocaleDateString('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = scheduledDate.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100%' }}>
      {/* ── Header ── */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '16px 24px',
      }}>
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
            marginBottom: 16,
          }}
          onClick={() => navigate('/decisions')}
        >
          <ChevronLeft size={16} />
          Tillbaka till Beslutssystem
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LevelBadge level={meeting.level} />
              <StatusBadge status={meeting.status} />
            </div>
            <h1 style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0,
              marginBottom: 8,
            }}>
              {meeting.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                <Calendar size={14} />
                {dateStr} kl. {timeStr}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HumanFigure
                  variant="group"
                  count={Math.min(5, Math.max(3, meeting.participants.length)) as 3 | 4 | 5}
                  size="sm"
                  label={`${meeting.participants.length} deltagare`}
                />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {meeting.participants.length} deltagare
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Blockerat-banner ── */}
      {meeting.status === 'blocked' && (
        <div style={{
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger)',
          borderRadius: 0,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <AlertTriangle size={18} color="var(--color-danger)" />
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-danger)', fontWeight: 500 }}>
            Mötet är blockerat — {meeting.blockedReason}
          </p>
        </div>
      )}

      {/* ── Agenda ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {agenda.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 32px',
            color: 'var(--color-text-muted)',
          }}>
            <FileText size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Inga beslutspunkter på agendan.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ marginBottom: 8 }}>
              <h2 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}>
                Agenda — {agenda.length} beslutspunkt{agenda.length !== 1 ? 'er' : ''}
              </h2>
            </div>

            {agenda.map((block, i) => (
              <DecisionBlockCard
                key={block.id}
                block={block}
                currentUserId="current-user"
                index={i}
                total={agenda.length}
                onVote={handleVote}
                readOnly={meeting.status === 'blocked'}
              />
            ))}
          </div>
        )}

        {/* ── Protokoll-footer ── */}
        <div style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 6,
              border: 'none',
              background: allDecided ? 'var(--color-brand)' : 'var(--color-bg-muted)',
              color: allDecided ? '#fff' : 'var(--color-text-muted)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              cursor: allDecided ? 'pointer' : 'not-allowed',
            }}
            disabled={!allDecided}
            onClick={handleGenerateMinutes}
          >
            <FileText size={16} />
            Generera protokoll
            {!allDecided && (
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 400 }}>
                (Väntar på alla beslut)
              </span>
            )}
          </button>
        </div>

        {/* ── Protokoll-visning ── */}
        {minutesText && (
          <div style={{
            marginTop: 24,
            padding: '24px',
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={18} color="var(--color-success)" />
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-md)' }}>Protokoll genererat</h3>
            </div>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.7,
              margin: 0,
            }}>
              {minutesText}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
