/**
 * Founding Configuration
 *
 * MANDATORY before OS is operational.
 * Like a pre-flight checklist — system cannot fully function without it.
 *
 * Sections:
 * 1. Organization identity & mission
 * 2. Growth intent & ambition
 * 3. Market focus & expansion order
 * 4. Financial constraints & capital strategy
 * 5. Autonomy limits — what the system can decide vs what needs human approval
 * 6. Core values that govern automated decisions
 *
 * Once completed → locked. Changes require CEO re-authentication.
 */
import { useState } from 'react'
import { useApi } from '../../shared/auth/useApi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FoundingConfigData {
  // Section 1 — Identity
  org_name: string
  org_tagline: string
  mission_statement: string
  founding_date: string
  primary_jurisdiction: string

  // Section 2 — Growth intent
  growth_mode: 'stable' | 'growth' | 'hypergrowth'
  headcount_target_12m: number
  headcount_target_36m: number
  revenue_target_12m: number
  revenue_target_36m: number

  // Section 3 — Market focus
  primary_market: string
  expansion_markets: string[]
  launch_sequence: string[]
  first_revenue_date: string

  // Section 4 — Financial constraints
  min_cash_runway_months: number
  max_monthly_burn: number
  fundraising_intent: 'bootstrapped' | 'angel' | 'vc' | 'mixed'
  financial_decision_limit: number

  // Section 5 — Autonomy limits
  can_send_external_email: boolean
  can_book_meetings: boolean
  can_deploy_to_staging: boolean
  can_deploy_to_production: boolean
  can_make_payments_under: number
  can_post_social_media: boolean
  requires_approval_for: string[]

  // Section 6 — Values
  core_values: string[]
  decision_principles: string[]
  non_negotiables: string[]
}

const EMPTY_CONFIG: FoundingConfigData = {
  org_name: 'Wavult Group',
  org_tagline: 'The Optical Layer of the World',
  mission_statement: 'Remove friction from society through optical intelligence infrastructure.',
  founding_date: '2026-04-11',
  primary_jurisdiction: 'Sweden (SE)',

  growth_mode: 'hypergrowth',
  headcount_target_12m: 15,
  headcount_target_36m: 60,
  revenue_target_12m: 0,
  revenue_target_36m: 0,

  primary_market: 'Sweden',
  expansion_markets: ['Netherlands', 'UAE', 'Lithuania', 'USA'],
  launch_sequence: ['Sweden (June 2026)', 'Netherlands (Q1 2027)', 'UAE (Q2 2027)', 'USA (2028)'],
  first_revenue_date: '2026-09-01',

  min_cash_runway_months: 6,
  max_monthly_burn: 0,
  fundraising_intent: 'mixed',
  financial_decision_limit: 5000,

  can_send_external_email: true,
  can_book_meetings: false,
  can_deploy_to_staging: true,
  can_deploy_to_production: false,
  can_make_payments_under: 1000,
  can_post_social_media: false,
  requires_approval_for: [
    'Production deploys',
    'Contracts > 50k SEK',
    'Hiring decisions',
    'Press releases',
    'Social media posts',
    'Bank transfers > 10k SEK',
  ],

  core_values: [
    'No shortcuts',
    'Enterprise from day one',
    'Own your infrastructure',
    'Friction removal is the product',
  ],
  decision_principles: [
    'Every dollar must save at least two in friction',
    'Build for production always',
    'No mock data ever in production',
  ],
  non_negotiables: [
    'Never expose PII directly',
    'CEO approves all production deploys',
    'Audit trail on every financial transaction',
  ],
}

// ── Section components ────────────────────────────────────────────────────────

function SectionHeader({
  num,
  title,
  subtitle,
  complete,
}: {
  num: number
  title: string
  subtitle: string
  complete: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          flexShrink: 0,
          background: complete ? '#2D7A4F' : '#0A3D62',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F0E8',
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {complete ? '✓' : num}
      </div>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0A3D62', margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'rgba(10,61,98,.5)', margin: '4px 0 0' }}>{subtitle}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          color: '#0A3D62',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {hint && (
        <div style={{ fontSize: 11, color: 'rgba(10,61,98,.45)', marginBottom: 6 }}>{hint}</div>
      )}
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 7,
  fontSize: 13,
  border: '1.5px solid rgba(10,61,98,.2)',
  background: '#FDFAF5',
  color: '#0A3D62',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

const toggleStyle = (active: boolean) => ({
  padding: '7px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  border: `1.5px solid ${active ? '#E8B84B' : 'rgba(10,61,98,.15)'}`,
  background: active ? 'rgba(232,184,75,.12)' : 'transparent',
  color: active ? '#8B6914' : 'rgba(10,61,98,.5)',
  fontSize: 12,
  fontWeight: active ? 700 : 400,
  transition: 'all .15s',
})

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void
}

export function FoundingConfig({ onComplete }: Props) {
  const { apiFetch } = useApi()
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState<FoundingConfigData>(EMPTY_CONFIG)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalSteps = 6

  const update = (field: keyof FoundingConfigData, value: any) => {
    setConfig(c => ({ ...c, [field]: value }))
  }

  const save = async (complete = false) => {
    setSaving(true)
    setError('')
    try {
      const body = {
        config,
        ...(complete
          ? {
              completed_at: new Date().toISOString(),
              completed_by: 'erik-svensson',
              locked: true,
            }
          : {}),
      }
      const res = await apiFetch('/api/config/founding', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (complete) onComplete()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg,#0A3D62,#0d4d78)',
          padding: '32px 48px 24px',
          color: '#F5F0E8',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 9,
              fontFamily: 'monospace',
              color: 'rgba(232,184,75,.7)',
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            System Onboarding — Required
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-.02em' }}>
            Founding Configuration
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(245,240,232,.65)', margin: 0 }}>
            This configuration must be completed before Wavult OS is fully operational. It defines
            your intentions, constraints, and values — the reference point for every system
            decision.
          </p>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i < step ? '#E8B84B' : 'rgba(255,255,255,.2)',
                  transition: 'background .3s',
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(245,240,232,.5)',
              marginTop: 6,
              fontFamily: 'monospace',
            }}
          >
            Step {step} of {totalSteps}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 48px' }}>
        {/* STEP 1 — Identity */}
        {step === 1 && (
          <div>
            <SectionHeader
              num={1}
              title="Organization Identity & Mission"
              subtitle="Who you are. What you exist to do. This cannot change without a formal decision."
              complete={false}
            />

            <Field label="Organization Name">
              <input
                style={inputStyle}
                value={config.org_name}
                onChange={e => update('org_name', e.target.value)}
              />
            </Field>
            <Field label="Tagline" hint="One line. What you are in the simplest possible terms.">
              <input
                style={inputStyle}
                value={config.org_tagline}
                onChange={e => update('org_tagline', e.target.value)}
              />
            </Field>
            <Field
              label="Mission Statement"
              hint="Why does this organization exist? What problem does it solve for the world?"
            >
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={config.mission_statement}
                onChange={e => update('mission_statement', e.target.value)}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Operational Start Date" hint="First working day.">
                <input
                  type="date"
                  style={inputStyle}
                  value={config.founding_date}
                  onChange={e => update('founding_date', e.target.value)}
                />
              </Field>
              <Field label="Primary Jurisdiction">
                <input
                  style={inputStyle}
                  value={config.primary_jurisdiction}
                  onChange={e => update('primary_jurisdiction', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 2 — Growth */}
        {step === 2 && (
          <div>
            <SectionHeader
              num={2}
              title="Growth Intent & Ambition"
              subtitle="How fast do you want to grow? This governs hiring plans, burn rate tolerance, and KPI targets."
              complete={false}
            />

            <Field
              label="Growth Mode"
              hint="This affects how the system interprets delays, missed targets, and resource requests."
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['stable', 'growth', 'hypergrowth'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => update('growth_mode', mode)}
                    style={toggleStyle(config.growth_mode === mode)}
                  >
                    {mode === 'stable'
                      ? '🏠 Stable — sustainable, profitable, no external pressure'
                      : mode === 'growth'
                        ? '📈 Growth — scale fast, some investor pressure'
                        : '🚀 Hypergrowth — maximum speed, raise capital, dominate market'}
                  </button>
                ))}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Headcount Target — 12 months">
                <input
                  type="number"
                  style={inputStyle}
                  value={config.headcount_target_12m}
                  onChange={e => update('headcount_target_12m', +e.target.value)}
                />
              </Field>
              <Field label="Headcount Target — 36 months">
                <input
                  type="number"
                  style={inputStyle}
                  value={config.headcount_target_36m}
                  onChange={e => update('headcount_target_36m', +e.target.value)}
                />
              </Field>
              <Field label="Revenue Target — 12 months (SEK)">
                <input
                  type="number"
                  style={inputStyle}
                  value={config.revenue_target_12m}
                  onChange={e => update('revenue_target_12m', +e.target.value)}
                  placeholder="0 = not set"
                />
              </Field>
              <Field label="First Revenue Date">
                <input
                  type="date"
                  style={inputStyle}
                  value={config.first_revenue_date}
                  onChange={e => update('first_revenue_date', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 3 — Markets */}
        {step === 3 && (
          <div>
            <SectionHeader
              num={3}
              title="Market Focus & Expansion Order"
              subtitle="Where you operate and in what sequence. The system will prioritize resources accordingly."
              complete={false}
            />

            <Field label="Primary Market">
              <input
                style={inputStyle}
                value={config.primary_market}
                onChange={e => update('primary_market', e.target.value)}
              />
            </Field>
            <Field label="Launch Sequence" hint="One market per line, in order of priority.">
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'monospace' }}
                value={config.launch_sequence.join('\n')}
                onChange={e =>
                  update(
                    'launch_sequence',
                    e.target.value.split('\n').filter(Boolean)
                  )
                }
              />
            </Field>
            <Field label="Expansion Markets" hint="All markets you intend to enter, comma-separated.">
              <input
                style={inputStyle}
                value={config.expansion_markets.join(', ')}
                onChange={e =>
                  update(
                    'expansion_markets',
                    e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            </Field>
          </div>
        )}

        {/* STEP 4 — Finances */}
        {step === 4 && (
          <div>
            <SectionHeader
              num={4}
              title="Financial Constraints & Capital Strategy"
              subtitle="Hard limits the system will never violate without explicit override."
              complete={false}
            />

            <Field label="Funding Strategy">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['bootstrapped', 'angel', 'vc', 'mixed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => update('fundraising_intent', f)}
                    style={toggleStyle(config.fundraising_intent === f)}
                  >
                    {f === 'bootstrapped'
                      ? '💪 Bootstrapped'
                      : f === 'angel'
                        ? '👼 Angel'
                        : f === 'vc'
                          ? '🏦 VC-backed'
                          : '🔄 Mixed'}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field
                label="Minimum Cash Runway (months)"
                hint="System alerts when runway drops below this."
              >
                <input
                  type="number"
                  style={inputStyle}
                  value={config.min_cash_runway_months}
                  onChange={e => update('min_cash_runway_months', +e.target.value)}
                />
              </Field>
              <Field label="Max Monthly Burn (SEK)" hint="0 = not set. System flags if exceeded.">
                <input
                  type="number"
                  style={inputStyle}
                  value={config.max_monthly_burn}
                  onChange={e => update('max_monthly_burn', +e.target.value)}
                  placeholder="0 = unlimited"
                />
              </Field>
              <Field
                label="Auto-payment limit (SEK)"
                hint="System can process payments below this without approval."
              >
                <input
                  type="number"
                  style={inputStyle}
                  value={config.can_make_payments_under}
                  onChange={e => update('can_make_payments_under', +e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 5 — Autonomy */}
        {step === 5 && (
          <div>
            <SectionHeader
              num={5}
              title="Autonomy Limits"
              subtitle="What can the system decide and execute on its own? What always requires human approval?"
              complete={false}
            />

            <Field
              label="System can do autonomously"
              hint="Toggle what Bernt is allowed to do without asking you first."
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { key: 'can_send_external_email', label: 'Send external email' },
                  { key: 'can_book_meetings', label: 'Book meetings in your calendar' },
                  { key: 'can_deploy_to_staging', label: 'Deploy to staging / dev' },
                  { key: 'can_deploy_to_production', label: 'Deploy to production' },
                  { key: 'can_post_social_media', label: 'Post on social media' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: 7,
                      border: '1px solid rgba(10,61,98,.1)',
                      background: '#FDFAF5',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={config[key as keyof FoundingConfigData] as boolean}
                      onChange={e => update(key as any, e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#0A3D62' }}
                    />
                    <span style={{ fontSize: 13, color: '#0A3D62' }}>{label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field
              label="Always requires human approval"
              hint="Add items — system will never proceed without explicit go-ahead."
            >
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  resize: 'vertical',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
                value={config.requires_approval_for.join('\n')}
                onChange={e =>
                  update(
                    'requires_approval_for',
                    e.target.value.split('\n').filter(Boolean)
                  )
                }
              />
            </Field>
          </div>
        )}

        {/* STEP 6 — Values */}
        {step === 6 && (
          <div>
            <SectionHeader
              num={6}
              title="Core Values & Non-Negotiables"
              subtitle="The principles that govern automated decisions. The system will reference these when making recommendations."
              complete={false}
            />

            <Field label="Core Values" hint="One per line. These are used when the system evaluates options.">
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                value={config.core_values.join('\n')}
                onChange={e =>
                  update('core_values', e.target.value.split('\n').filter(Boolean))
                }
              />
            </Field>
            <Field
              label="Decision Principles"
              hint="Explicit rules for how decisions should be made."
            >
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                value={config.decision_principles.join('\n')}
                onChange={e =>
                  update('decision_principles', e.target.value.split('\n').filter(Boolean))
                }
              />
            </Field>
            <Field
              label="Non-Negotiables"
              hint="Things that can NEVER happen, regardless of circumstances."
            >
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                value={config.non_negotiables.join('\n')}
                onChange={e =>
                  update('non_negotiables', e.target.value.split('\n').filter(Boolean))
                }
              />
            </Field>

            {/* Summary */}
            <div
              style={{
                background: 'linear-gradient(135deg,#0A3D62,#0d4d78)',
                borderRadius: 12,
                padding: '20px 24px',
                marginTop: 24,
                color: '#F5F0E8',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: 'rgba(232,184,75,.7)',
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Configuration Summary
              </div>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}
              >
                <div>
                  <span style={{ color: 'rgba(245,240,232,.5)' }}>Mission:</span>{' '}
                  {config.mission_statement.slice(0, 60)}...
                </div>
                <div>
                  <span style={{ color: 'rgba(245,240,232,.5)' }}>Growth:</span>{' '}
                  {config.growth_mode}
                </div>
                <div>
                  <span style={{ color: 'rgba(245,240,232,.5)' }}>Team 12m:</span>{' '}
                  {config.headcount_target_12m} people
                </div>
                <div>
                  <span style={{ color: 'rgba(245,240,232,.5)' }}>Auto-payments under:</span>{' '}
                  {config.can_make_payments_under.toLocaleString('sv-SE')} SEK
                </div>
                <div>
                  <span style={{ color: 'rgba(245,240,232,.5)' }}>Launch:</span>{' '}
                  {config.launch_sequence[0]}
                </div>
                <div>
                  <span style={{ color: 'rgba(245,240,232,.5)' }}>Min runway:</span>{' '}
                  {config.min_cash_runway_months} months
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '10px 16px',
              background: 'rgba(192,57,43,.1)',
              border: '1px solid rgba(192,57,43,.3)',
              borderRadius: 7,
              color: '#C0392B',
              fontSize: 13,
              marginTop: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid rgba(10,61,98,.1)',
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 7,
                  border: '1.5px solid rgba(10,61,98,.2)',
                  background: 'transparent',
                  color: '#0A3D62',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => save(false)}
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 7,
                border: '1.5px solid rgba(10,61,98,.15)',
                background: 'transparent',
                color: 'rgba(10,61,98,.5)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Save draft
            </button>
          </div>

          {step < totalSteps ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                padding: '10px 32px',
                borderRadius: 7,
                border: 'none',
                background: '#0A3D62',
                color: '#F5F0E8',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => save(true)}
              disabled={saving}
              style={{
                padding: '12px 36px',
                borderRadius: 7,
                border: 'none',
                background: '#E8B84B',
                color: '#0A3D62',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 800,
                boxShadow: '0 4px 16px rgba(232,184,75,.3)',
              }}
            >
              {saving ? 'Saving...' : '🔒 Lock & Activate System →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
