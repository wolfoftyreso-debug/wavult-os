// ─── DecisionDashboard — Huvudvy för Beslutssystem ───────────────────────────
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Calendar,
  ChevronRight,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gavel,
} from 'lucide-react'
import { HumanFigure } from '../../shared/design-system/HumanFigure'
import { mockMeetings } from './mockDecisions'
import type { Meeting, DecisionBlock } from './decisionTypes'
import { MEETING_LEVEL_LABELS } from './decisionTypes'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Formatering ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function MeetingStatusBadge({ status }: { status: Meeting['status'] }) {
  const config = {
    blocked: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', label: 'Blockerat' },
    scheduled: { bg: 'var(--color-info-bg)', color: 'var(--color-info)', label: 'Planerat' },
    in_progress: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'Pågående' },
    completed: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: 'Avslutat' },
  }[status]

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      background: config.bg,
      color: config.color,
    }}>
      {config.label}
    </span>
  )
}

function LevelBadge({ level }: { level: Meeting['level'] }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      background: 'var(--color-brand-light)',
      color: 'var(--color-brand)',
    }}>
      {MEETING_LEVEL_LABELS[level]}
    </span>
  )
}

// ─── Mötes-rad ────────────────────────────────────────────────────────────────

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onClick={() => navigate(`/decisions/${meeting.id}`)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <LevelBadge level={meeting.level} />
          <MeetingStatusBadge status={meeting.status} />
        </div>
        <p style={{
          margin: 0,
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {meeting.title}
        </p>
        {meeting.status === 'blocked' && meeting.blockedReason && (
          <p style={{
            margin: '2px 0 0',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <AlertTriangle size={10} />
            {meeting.blockedReason}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
        <Calendar size={12} />
        {formatDate(meeting.scheduledAt)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <HumanFigure variant="group" count={Math.min(5, Math.max(3, meeting.participants.length)) as 3 | 4 | 5} size="sm" />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {meeting.participants.length}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
        <Gavel size={12} />
        {meeting.agenda.length} beslut
      </div>

      <ChevronRight size={16} color="var(--color-text-muted)" />
    </div>
  )
}

// ─── Besluts-rad (aktiv) ──────────────────────────────────────────────────────

function ActiveDecisionRow({ block, meeting }: { block: DecisionBlock; meeting: Meeting }) {
  const navigate = useNavigate()
  const voteCount = Object.keys(block.votes).length

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onClick={() => navigate(`/decisions/${meeting.id}`)}
    >
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0,
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
        }}>
          {block.title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {meeting.title}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={12} color="var(--color-warning)" />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', fontWeight: 500 }}>
          {voteCount} röst{voteCount !== 1 ? 'er' : ''}
        </span>
      </div>
      <ChevronRight size={14} color="var(--color-text-muted)" />
    </div>
  )
}

// ─── Färdigt beslut-rad ───────────────────────────────────────────────────────

function DecidedRow({ block, meeting }: { block: DecisionBlock; meeting: Meeting }) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onClick={() => navigate(`/decisions/${meeting.id}`)}
    >
      <CheckCircle2 size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0,
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
        }}>
          {block.title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Beslut: Alt {block.result} •{' '}
          {block.decidedAt ? formatDate(block.decidedAt) : 'Nyligen'}
        </p>
      </div>
      {block.systemActions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-brand)', fontSize: 'var(--text-xs)' }}>
          <Cpu size={12} />
          {block.systemActions.length} åtgärd{block.systemActions.length !== 1 ? 'er' : ''}
        </div>
      )}
      <ChevronRight size={14} color="var(--color-text-muted)" />
    </div>
  )
}

// ─── Sektions-kort ────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  children,
  action,
}: {
  title: string
  count?: number
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            {title}
          </h2>
          {count !== undefined && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--color-bg-muted)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
            }}>
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Huvud-komponent ──────────────────────────────────────────────────────────

export function DecisionDashboard() {
  const { t: _t } = useTranslation() // ready for i18n
  const navigate = useNavigate()
  const [meetings] = useState<Meeting[]>(mockMeetings)

  // Sortera möten på datum
  const upcomingMeetings = [...meetings]
    .filter(m => m.status !== 'completed')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  // Aktiva decision blocks (status=active, inget result ännu)
  const activeBlocks: Array<{ block: DecisionBlock; meeting: Meeting }> = []
  meetings.forEach(meeting => {
    meeting.agenda
      .filter(b => b.status === 'active' && !b.result)
      .forEach(block => activeBlocks.push({ block, meeting }))
  })

  // Senaste beslut (max 5)
  const decidedBlocks: Array<{ block: DecisionBlock; meeting: Meeting }> = []
  meetings.forEach(meeting => {
    meeting.agenda
      .filter(b => b.status === 'decided' || b.result !== null)
      .forEach(block => decidedBlocks.push({ block, meeting }))
  })
  const recentDecisions = decidedBlocks.slice(-5).reverse()

  return (
    <div style={{
      background: 'var(--color-bg)',
      minHeight: '100%',
      padding: '24px',
    }}>
      {/* ── Page header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Gavel size={22} color="var(--color-brand)" />
            <h1 style={{
              margin: 0,
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}>
              Beslutssystem
            </h1>
          </div>
          <p style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            maxWidth: 560,
          }}>
            Möten existerar enbart för att fatta strukturerade beslut kopplade till mål, budget och strategi.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 6,
              border: '1px solid var(--color-brand)',
              background: 'transparent',
              color: 'var(--color-brand)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/decisions/live/meeting-001')}
          >
            ▶ Starta live-möte
          </button>
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
            onClick={() => navigate('/decisions/new')}
          >
            <Plus size={16} />
            Nytt möte
          </button>
        </div>
      </div>

      {/* ── KPI-rad ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {[
          {
            label: 'Kommande möten',
            value: upcomingMeetings.length,
            icon: <Calendar size={16} color="var(--color-brand)" />,
            bg: 'var(--color-brand-light)',
          },
          {
            label: 'Väntar röstning',
            value: activeBlocks.length,
            icon: <Clock size={16} color="var(--color-warning)" />,
            bg: 'var(--color-warning-bg)',
          },
          {
            label: 'Fattade beslut',
            value: decidedBlocks.length,
            icon: <CheckCircle2 size={16} color="var(--color-success)" />,
            bg: 'var(--color-success-bg)',
          },
          {
            label: 'Blockerade möten',
            value: meetings.filter(m => m.status === 'blocked').length,
            icon: <AlertTriangle size={16} color="var(--color-danger)" />,
            bg: 'var(--color-danger-bg)',
          },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: kpi.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {kpi.icon}
              </div>
            </div>
            <p style={{
              margin: 0,
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}>
              {kpi.value}
            </p>
            <p style={{
              margin: '2px 0 0',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
            }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3 sektioner ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* 1. Kommande möten */}
        <Section
          title="Kommande möten"
          count={upcomingMeetings.length}
          action={
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-brand)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={() => navigate('/decisions/new')}
            >
              <Plus size={12} />
              Lägg till
            </button>
          }
        >
          {upcomingMeetings.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Inga kommande möten planerade.
            </div>
          ) : (
            upcomingMeetings.map(m => <MeetingRow key={m.id} meeting={m} />)
          )}
        </Section>

        {/* 2. Pågående beslut */}
        <Section title="Pågående beslut" count={activeBlocks.length}>
          {activeBlocks.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Inga aktiva beslut väntar på röstning.
            </div>
          ) : (
            activeBlocks.map(({ block, meeting }) => (
              <ActiveDecisionRow key={block.id} block={block} meeting={meeting} />
            ))
          )}
        </Section>

        {/* 3. Senaste beslut */}
        <Section title="Senaste beslut" count={recentDecisions.length}>
          {recentDecisions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Inga beslut fattade ännu.
            </div>
          ) : (
            recentDecisions.map(({ block, meeting }) => (
              <DecidedRow key={block.id} block={block} meeting={meeting} />
            ))
          )}
        </Section>

      </div>
    </div>
  )
}
