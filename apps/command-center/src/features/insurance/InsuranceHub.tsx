/**
 * InsuranceHub — Wavult Group Insurance Management
 *
 * AXA Partners integration (pending partnership approval).
 * Three coverage areas: Platform (Zoomers), Infrastructure (LandveX), Group (Wavult).
 *
 * API endpoints (configured once AXA provides credentials):
 * POST /api/insurance/policy/activate  — Activate per-mission Zoomer coverage
 * POST /api/insurance/policy/deactivate — Deactivate on mission complete
 * POST /api/insurance/claim/initiate   — Trigger claim from LandveX alert
 * GET  /api/insurance/coverage/status  — Current group coverage status
 */

import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, ExternalLink, Zap, Building2, Users } from 'lucide-react'

type CoverageArea = 'platform' | 'infrastructure' | 'group'

const COVERAGE = {
  platform: {
    title: 'Platform Liability',
    subtitle: 'quiXzoom — Per-mission Zoomer coverage',
    icon: Users,
    color: '#2563EB',
    status: 'pending_partner' as const,
    description: 'On-demand liability coverage per Zoomer mission. Policy activates via API on mission start, deactivates on completion. Scales with active operators.',
    features: [
      'API-triggered policy activation',
      'Per-mission premium calculation',
      'Automatic claim trigger on incident',
      'Coverage: bodily injury, property damage, third-party liability',
      'Jurisdictions: SE, NL, DE, GB, US',
    ],
    stats: { zoomers: '50 000+', missions: '1M+/year', target: 'Q3 2026' },
  },
  infrastructure: {
    title: 'Infrastructure Intelligence',
    subtitle: 'LandveX — AI-triggered claims',
    icon: Building2,
    color: '#1E40AF',
    status: 'pending_partner' as const,
    description: 'When LandveX vision engine detects structural anomalies, automatically trigger claim assessment via AXA API. New product category: evidence-based infrastructure claims.',
    features: [
      'Webhook: LandveX alert → AXA claim assessment',
      'Optical evidence package auto-attached',
      'Municipality and port authority coverage',
      'Infrastructure: roads, bridges, harbors, buildings',
      'SLA: claim acknowledgement < 4 hours',
    ],
    stats: { clients: '100+ target', alertTypes: '12', responseTime: '< 4h' },
  },
  group: {
    title: 'Group Coverage',
    subtitle: 'Wavult Group — D&O, Cyber, Travel',
    icon: Shield,
    color: '#0284C7',
    status: 'pending_partner' as const,
    description: 'Comprehensive group-level insurance: Directors & Officers, Cyber, Professional Indemnity, and Travel for the Wavult executive team across all jurisdictions.',
    features: [
      'D&O: Erik Svensson, Dennis Bjarnemark, Winston Bjarnemark',
      'Cyber: AWS infrastructure, Cloudflare, databases',
      'Professional indemnity: UAPIX, LandveX, Apifly data products',
      'Travel: SE, UAE, US, Thailand (active from April 11, 2026)',
      'Jurisdictions: Sweden, UAE (Dubai), USA (Delaware)',
    ],
    stats: { directors: '5', jurisdictions: '4+', urgency: 'April 11' },
  },
}

const STATUS_LABELS = {
  active: { label: 'Active', color: '#16A34A', bg: '#052E16' },
  pending_partner: { label: 'Awaiting AXA Partnership', color: '#D97706', bg: '#1C1107' },
  pending_config: { label: 'Pending API Config', color: '#2563EB', bg: '#0F2444' },
  inactive: { label: 'Not configured', color: '#64748B', bg: '#0F172A' },
}

export function InsuranceHub() {
  const [active, setActive] = useState<CoverageArea>('platform')

  const coverage = COVERAGE[active]
  const CoverageIcon = coverage.icon
  const statusInfo = STATUS_LABELS[coverage.status]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} style={{ color: '#2563EB' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Insurance</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>AXA Partners · Partnership pending</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px', borderRadius: 4, background: '#1C1107', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
            <Clock size={11} /> Partnership enquiry sent · Awaiting response
          </div>
          <a href="https://partners.axa.com" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
            <ExternalLink size={11} /> AXA Partners
          </a>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', overflowX: 'auto' }}>
        {(Object.entries(COVERAGE) as [CoverageArea, typeof coverage][]).map(([key, cov]) => (
          <button key={key} onClick={() => setActive(key)}
            style={{ padding: '10px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: active === key ? 700 : 400,
              color: active === key ? cov.color : 'var(--color-text-muted)',
              borderBottom: active === key ? `2px solid ${cov.color}` : '2px solid transparent',
              whiteSpace: 'nowrap' }}>
            {cov.title}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {/* Coverage header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: `${coverage.color}15`, border: `1px solid ${coverage.color}30`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CoverageIcon size={22} style={{ color: coverage.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--color-text-primary)' }}>{coverage.title}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}30`, fontFamily: 'monospace' }}>
                {statusInfo.label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{coverage.subtitle}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
          {Object.entries(coverage.stats).map(([k, v]) => (
            <div key={k} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '12px', background: 'var(--color-surface)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.03em', color: coverage.color }}>{v}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: 2 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
          {coverage.description}
        </div>

        {/* Features */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>Coverage Features</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {coverage.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle size={14} style={{ color: coverage.color, flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Integration preview */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)', fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            API Integration — Ready to connect when AXA credentials received
          </div>
          <div style={{ padding: '14px', background: '#0A0F1E', fontFamily: 'monospace', fontSize: 12, color: '#94A3B8', lineHeight: 1.8 }}>
            {active === 'platform' && <>
              <div style={{ color: '#64748B' }}>// POST /api/insurance/policy/activate</div>
              <div><span style={{ color: '#2563EB' }}>const</span> policy = <span style={{ color: '#2563EB' }}>await</span> axa.activate{'({'}</div>
              <div>  missionId: <span style={{ color: '#22C55E' }}>"M-4729"</span>,</div>
              <div>  zoomerId: <span style={{ color: '#22C55E' }}>"Z-8831"</span>,</div>
              <div>  location: <span style={{ color: '#22C55E' }}>"Stockholm, SE"</span>,</div>
              <div>  coverage: <span style={{ color: '#22C55E' }}>"liability_standard"</span></div>
              <div>{'}'})  <span style={{ color: '#64748B' }}>// Returns: policyId + premium</span></div>
            </>}
            {active === 'infrastructure' && <>
              <div style={{ color: '#64748B' }}>// LandveX alert → AXA claim webhook</div>
              <div><span style={{ color: '#2563EB' }}>await</span> axa.initiateClaimAssessment({'({'}</div>
              <div>  alertId: <span style={{ color: '#22C55E' }}>"A-1047"</span>,</div>
              <div>  type: <span style={{ color: '#22C55E' }}>"structural_anomaly"</span>,</div>
              <div>  evidence: landvexReport.imageUrls,</div>
              <div>  clientId: <span style={{ color: '#22C55E' }}>"Gotlands Kommun"</span></div>
              <div>{'}'})  <span style={{ color: '#64748B' }}>// Returns: claimRef + assessor</span></div>
            </>}
            {active === 'group' && <>
              <div style={{ color: '#64748B' }}>// GET /api/insurance/coverage/status</div>
              <div><span style={{ color: '#2563EB' }}>const</span> status = <span style={{ color: '#2563EB' }}>await</span> axa.getCoverage({'({'}</div>
              <div>  entity: <span style={{ color: '#22C55E' }}>"Wavult Group"</span>,</div>
              <div>  types: [<span style={{ color: '#22C55E' }}>"D&O"</span>, <span style={{ color: '#22C55E' }}>"cyber"</span>, <span style={{ color: '#22C55E' }}>"travel"</span>],</div>
              <div>  jurisdictions: [<span style={{ color: '#22C55E' }}>"SE"</span>, <span style={{ color: '#22C55E' }}>"UAE"</span>, <span style={{ color: '#22C55E' }}>"US"</span>]</div>
              <div>{'}'})  <span style={{ color: '#64748B' }}>// Returns: policies[] + expiry dates</span></div>
            </>}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 6, border: '1px solid rgba(37,99,235,0.2)', background: 'rgba(37,99,235,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>Partnership enquiry sent to AXA Partners</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Awaiting response from partners@axa-assistance.com · cc: dennis@wavult.com</div>
          </div>
          <a href="mailto:partners@axa-assistance.com" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 4, background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            <ExternalLink size={12} /> Follow up
          </a>
        </div>
      </div>
    </div>
  )
}
