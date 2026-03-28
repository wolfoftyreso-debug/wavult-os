// ─── DecisionBlockCard — Wizard-mode för beslutspunkter ──────────────────────
import React, { useState } from 'react'
import {
  ChevronRight,
  CheckCircle2,
  Building2,
  Cpu,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  FileText,
} from 'lucide-react'
import { HumanFigure } from '../../shared/design-system/HumanFigure'
import type { DecisionBlock, VoteChoice, DecisionAlternative } from './decisionTypes'
import {
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from './decisionTypes'
import { calculateMajority, getVoteCounts, generateSystemActions } from './decisionEngine'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Formatering ──────────────────────────────────────────────────────────────

function formatSEK(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2).replace('.', ',')} MSEK`
  }
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Sub-komponenter ──────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: DecisionAlternative['riskLevel'] }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-semibold)',
        letterSpacing: '0.03em',
        color: RISK_LEVEL_COLORS[level],
        background:
          level === 'low' ? 'var(--color-success-bg)' :
          level === 'medium' ? 'var(--color-warning-bg)' :
          level === 'high' ? 'var(--color-danger-bg)' :
          '#FFF0F0',
        border: `1px solid ${RISK_LEVEL_COLORS[level]}40`,
      }}
    >
      <AlertTriangle size={10} />
      {RISK_LEVEL_LABELS[level]}
    </span>
  )
}

function AlternativeCard({
  alt,
  selected,
  onSelect,
}: {
  alt: DecisionAlternative
  selected: boolean
  onSelect: () => void
}) {
  const netImpact = alt.revenueImpact - Math.abs(alt.costImpact)

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: selected
          ? '2px solid var(--color-brand)'
          : '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '20px',
        background: selected ? 'var(--color-brand-light)' : 'var(--color-surface)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      onClick={onSelect}
    >
      {/* Alt-label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: selected ? 'var(--color-brand)' : 'var(--color-bg-muted)',
            color: selected ? '#fff' : 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            flexShrink: 0,
          }}
        >
          {alt.id}
        </span>
        <RiskBadge level={alt.riskLevel} />
      </div>

      {/* Titel */}
      <div>
        <p style={{
          fontWeight: 600,
          fontSize: 'var(--text-md)',
          color: 'var(--color-text-primary)',
          margin: 0,
          marginBottom: 4,
        }}>
          {alt.title}
        </p>
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {alt.description}
        </p>
      </div>

      {/* Ekonomi */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={13} color="var(--color-success)" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Intäktspåverkan:</span>
          <span style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: alt.revenueImpact >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
          }}>
            {formatSEK(alt.revenueImpact)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingDown size={13} color="var(--color-danger)" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Kostnad:</span>
          <span style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-danger)',
          }}>
            {formatSEK(alt.costImpact)}
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingTop: 4,
          borderTop: '1px dashed var(--color-border)',
        }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Nettopåverkan:</span>
          <span style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: netImpact >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
          }}>
            {netImpact >= 0 ? '+' : ''}{formatSEK(netImpact)}
          </span>
        </div>
      </div>

      {/* Tidsram */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={13} color="var(--color-text-muted)" />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {alt.timeframe}
        </span>
      </div>

      {/* Operationell påverkan */}
      <p style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
        margin: 0,
        lineHeight: 1.5,
        fontStyle: 'italic',
      }}>
        {alt.operationalImpact}
      </p>

      {/* Välj-knapp */}
      <button
        style={{
          marginTop: 'auto',
          padding: '8px 16px',
          borderRadius: 6,
          border: selected ? 'none' : '1px solid var(--color-border)',
          background: selected ? 'var(--color-brand)' : 'transparent',
          color: selected ? '#fff' : 'var(--color-text-primary)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
      >
        {selected ? (
          <>
            <CheckCircle2 size={14} />
            Valt
          </>
        ) : (
          'Välj detta alternativ'
        )}
      </button>
    </div>
  )
}

// ─── Systemnåtgärds-ikon ──────────────────────────────────────────────────────

function SystemActionIcon({ type }: { type: string }) {
  if (type === 'update_okr' || type === 'update_strategy') return <Target size={14} color="var(--color-brand)" />
  if (type === 'update_budget') return <Building2 size={14} color="var(--color-warning)" />
  if (type === 'create_milestone' || type === 'create_task') return <Cpu size={14} color="var(--color-success)" />
  return <Cpu size={14} />
}

function SystemActionLabel(type: string): string {
  const labels: Record<string, string> = {
    update_okr: 'Uppdaterar OKR',
    update_budget: 'Uppdaterar budget',
    create_milestone: 'Skapar milstolpe',
    create_task: 'Skapar uppföljningsuppgift',
    update_strategy: 'Uppdaterar strategi',
  }
  return labels[type] ?? type
}

// ─── Wizard-steg ──────────────────────────────────────────────────────────────

type WizardStep = 'context' | 'alternatives' | 'vote' | 'result'

interface DecisionBlockCardProps {
  block: DecisionBlock
  /** Aktuell användare */
  currentUserId: string
  /** Index i agenda (0-baserat) */
  index: number
  /** Totalt antal blocks i mötet */
  total: number
  /** Callback när röst kastas */
  onVote?: (blockId: string, choice: VoteChoice) => void
  /** Redan beslutad? Visa bara resultat. */
  readOnly?: boolean
}

export function DecisionBlockCard({
  block,
  currentUserId,
  index,
  total,
  onVote,
  readOnly = false,
}: DecisionBlockCardProps) {
  const { t: _t } = useTranslation() // ready for i18n
  const userVote = block.votes[currentUserId] as VoteChoice | undefined
  const hasVoted = !!userVote

  const initialStep: WizardStep =
    readOnly || block.status === 'decided'
      ? 'result'
      : hasVoted
      ? 'result'
      : 'context'

  const [step, setStep] = useState<WizardStep>(initialStep)
  const [pendingChoice, setPendingChoice] = useState<'A' | 'B' | 'C' | null>(null)

  const majority = calculateMajority(block.votes)
  const counts = getVoteCounts(block.votes)

  const simulatedActions = pendingChoice
    ? generateSystemActions(pendingChoice, block)
    : block.result
    ? generateSystemActions(block.result, block)
    : []

  function handleConfirmVote() {
    if (!pendingChoice) return
    onVote?.(block.id, pendingChoice)
    setStep('result')
  }

  // ── Kontext-vy ──────────────────────────────────────────────────────────────
  if (step === 'context') {
    return (
      <div style={cardStyle}>
        <ProgressBar index={index} total={total} />
        <div style={contentStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <HumanFigure size="md" />
            <div>
              <p style={labelStyle}>Beslutspunkt</p>
              <h2 style={titleStyle}>{block.title}</h2>
            </div>
          </div>

          <InfoSection icon={<FileText size={16} />} label="Kontext">
            <p style={bodyStyle}>{block.context}</p>
          </InfoSection>

          <InfoSection icon={<AlertTriangle size={16} color="var(--color-warning)" />} label="Problemformulering">
            <p style={bodyStyle}>{block.problemStatement}</p>
          </InfoSection>

          <InfoSection icon={<Target size={16} color="var(--color-brand)" />} label="Målsättning">
            <p style={{ ...bodyStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {block.objective}
            </p>
          </InfoSection>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button style={primaryBtnStyle} onClick={() => setStep('alternatives')}>
              Se alternativ
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Alternativ-vy ───────────────────────────────────────────────────────────
  if (step === 'alternatives') {
    return (
      <div style={cardStyle}>
        <ProgressBar index={index} total={total} />
        <div style={contentStyle}>
          <div style={{ marginBottom: 20 }}>
            <p style={labelStyle}>Beslutspunkt {index + 1}</p>
            <h2 style={titleStyle}>{block.title}</h2>
            <p style={{ ...bodyStyle, marginTop: 4 }}>Välj ett av tre alternativ framtagna av systemet.</p>
          </div>

          <div style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            {block.alternatives.map(alt => (
              <AlternativeCard
                key={alt.id}
                alt={alt}
                selected={pendingChoice === alt.id}
                onSelect={() => setPendingChoice(alt.id)}
              />
            ))}
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button style={ghostBtnStyle} onClick={() => setStep('context')}>
              ← Tillbaka
            </button>
            <button
              style={{
                ...primaryBtnStyle,
                opacity: pendingChoice ? 1 : 0.4,
                cursor: pendingChoice ? 'pointer' : 'not-allowed',
              }}
              disabled={!pendingChoice}
              onClick={() => setStep('vote')}
            >
              Gå vidare till röstning
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Röstnings-vy ────────────────────────────────────────────────────────────
  if (step === 'vote') {
    const chosen = block.alternatives.find(a => a.id === pendingChoice)!
    return (
      <div style={cardStyle}>
        <ProgressBar index={index} total={total} />
        <div style={contentStyle}>
          <div style={{ marginBottom: 24 }}>
            <p style={labelStyle}>Bekräfta ditt val</p>
            <h2 style={titleStyle}>{block.title}</h2>
          </div>

          <div style={{
            background: 'var(--color-brand-light)',
            border: '1px solid var(--color-brand)',
            borderRadius: 8,
            padding: '20px 24px',
            marginBottom: 24,
          }}>
            <p style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--color-text-secondary)' }}>
              Du har valt:
            </p>
            <p style={{
              margin: '8px 0 0',
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--color-brand)',
            }}>
              Alternativ {pendingChoice} — {chosen?.title}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {chosen?.description}
            </p>
          </div>

          {simulatedActions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={labelStyle}>Systemåtgärder som triggas automatiskt:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {simulatedActions.map((action, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: 'var(--color-bg-subtle)',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                  }}>
                    <SystemActionIcon type={action.type} />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      {SystemActionLabel(action.type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button style={ghostBtnStyle} onClick={() => setStep('alternatives')}>
              ← Ändra val
            </button>
            <button style={primaryBtnStyle} onClick={handleConfirmVote}>
              <CheckCircle2 size={16} />
              Bekräfta röst
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Resultat-vy ─────────────────────────────────────────────────────────────
  const finalResult = block.result ?? majority
  const chosenAlt = finalResult ? block.alternatives.find(a => a.id === finalResult) : null
  const finalActions = finalResult ? generateSystemActions(finalResult, block) : []

  return (
    <div style={cardStyle}>
      <ProgressBar index={index} total={total} />
      <div style={contentStyle}>
        <div style={{ marginBottom: 20 }}>
          <p style={labelStyle}>Resultat</p>
          <h2 style={titleStyle}>{block.title}</h2>
        </div>

        {finalResult && chosenAlt ? (
          <>
            <div style={{
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success)',
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle2 size={18} color="var(--color-success)" />
                <p style={{ margin: 0, fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                  Beslut: Alternativ {finalResult} — {chosenAlt.title}
                </p>
              </div>
              {block.overriddenBy && (
                <p style={{ margin: '8px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-warning)' }}>
                  ⚠️ CEO Override — {block.overrideReason}
                </p>
              )}
            </div>

            {/* Röstfördelning */}
            <div style={{ marginBottom: 24 }}>
              <p style={labelStyle}>Röstfördelning</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(['A', 'B', 'C'] as const).map(opt => (
                  <div key={opt} style={{
                    flex: 1,
                    minWidth: 80,
                    padding: '12px 16px',
                    borderRadius: 6,
                    background: finalResult === opt ? 'var(--color-brand-light)' : 'var(--color-bg-muted)',
                    border: `1px solid ${finalResult === opt ? 'var(--color-brand)' : 'var(--color-border)'}`,
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 700, color: finalResult === opt ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}>
                      {counts[opt]}
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Alt {opt}</p>
                  </div>
                ))}
                <div style={{
                  flex: 1,
                  minWidth: 80,
                  padding: '12px 16px',
                  borderRadius: 6,
                  background: 'var(--color-bg-muted)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}>
                  <p style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    {counts.abstain}
                  </p>
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Abstain</p>
                </div>
              </div>
            </div>

            {/* Systemåtgärder */}
            {finalActions.length > 0 && (
              <div>
                <p style={labelStyle}>Systemåtgärder som triggas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {finalActions.map((action, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: 6,
                      border: '1px solid var(--color-border)',
                    }}>
                      <SystemActionIcon type={action.type} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {SystemActionLabel(action.type)}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 'var(--text-xs)',
                        color: action.executed ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}>
                        {action.executed ? '✓ Utförd' : 'Väntar'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}>
            <p>Din röst är registrerad. Väntar på övriga deltagare.</p>
            <p style={{ fontSize: 'var(--text-sm)' }}>
              Röster hittills: {counts.total} av minst 2 krävs för majoritet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helper-komponenter ───────────────────────────────────────────────────────

function ProgressBar({ index, total }: { index: number; total: number }) {
  return (
    <div style={{
      padding: '12px 24px',
      background: 'var(--color-bg-muted)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        Punkt {index + 1} av {total}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 24,
              height: 4,
              borderRadius: 2,
              background: i <= index ? 'var(--color-brand)' : 'var(--color-border)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function InfoSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={labelStyle}>{label}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

const contentStyle: React.CSSProperties = {
  padding: '24px',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: 0,
}

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xl)',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  margin: '4px 0 0',
}

const bodyStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.6,
  margin: 0,
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--color-brand)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
}

const ghostBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
}
