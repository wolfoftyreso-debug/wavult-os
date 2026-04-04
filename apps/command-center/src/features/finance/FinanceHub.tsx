import { useState, Component, type ReactNode, useEffect, useRef } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { ModuleHeader } from '../../shared/maturity/ModuleHeader'
import { Tooltip } from '../../shared/ui/Tooltip'
import { FinanceOverview } from './FinanceOverview'
import { ChartOfAccounts } from './ChartOfAccounts'
import { LedgerView } from './LedgerView'
import { InvoiceHub } from './InvoiceHub'
import { CashFlowView } from './CashFlowView'
import { TaxView } from './TaxView'
import { IntercompanyView } from './IntercompanyView'
import { PaymentProcessor } from './PaymentProcessor'
import { CashFlowOptimizer } from './CashFlowOptimizer'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Error Boundary ───────────────────────────────────────────────────────────
class FinanceErrorBoundary extends Component<
  { children: ReactNode; tabLabel: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; tabLabel: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-60 gap-4">
          <p className="text-sm font-semibold text-text-primary">{this.props.tabLabel} — data saknas</p>
          <p className="text-xs text-gray-9000 max-w-sm text-center">
            Den här modulen behöver live-data från Supabase. Tabellerna är inte satta upp ännu.
            All data är mockad tills Supabase-scheman är live.
          </p>
          <p className="text-xs text-gray-9000 font-mono">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-4 py-2 rounded-lg bg-white border border-surface-border text-gray-9000 hover:bg-muted/30 transition-colors"
          >
            Försök igen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

type Tab = 'overview' | 'accounts' | 'ledger' | 'invoices' | 'cashflow' | 'tax' | 'intercompany' | 'payments' | 'optimization'

const TABS: Array<{ id: Tab; label: string; tooltip: string; ingress: string }> = [
  {
    id: 'overview',
    label: 'Oversikt',
    tooltip: 'Sammanfattning av ekonomin för valt bolag. KPI:er, senaste transaktioner och status på ett ställe.',
    ingress: 'Sammanfattning av ekonomin för valt bolag — KPI:er, senaste transaktioner och status i ett enda vy.',
  },
  {
    id: 'accounts',
    label: 'Kontoplan',
    tooltip: 'Alla konton i bokföringen — intäkter, kostnader, tillgångar och skulder. Baserat på BAS-kontoplanen.',
    ingress: 'Alla bokföringskonton organiserade enligt BAS-kontoplanen — intäkter, kostnader, tillgångar och skulder.',
  },
  {
    id: 'ledger',
    label: 'Transaktioner',
    tooltip: 'Alla enskilda transaktioner kronologiskt. Filtrera per bolag, konto eller period.',
    ingress: 'Kronologisk lista över alla transaktioner. Filtrera per bolag, konto eller tidsperiod.',
  },
  {
    id: 'invoices',
    label: 'Fakturor',
    tooltip: 'Utgående fakturor till kunder och inkommande fakturor från leverantörer.',
    ingress: 'Utgående fakturor till kunder och inkommande leverantörsfakturor. Status: utkast, skickad, betald.',
  },
  {
    id: 'cashflow',
    label: 'Kassaflode',
    tooltip: 'Pengar in minus pengar ut. Det viktigaste måttet på bolagets hälsa i realtid.',
    ingress: 'Pengar in minus pengar ut — det viktigaste måttet på bolagets löpande hälsa.',
  },
  {
    id: 'tax',
    label: 'Moms/Skatt',
    tooltip: 'Momsredovisning och skatteberäkning per bolag och jurisdiktion. SE, LT och UAE har olika regler.',
    ingress: 'Momsredovisning och skatteberäkning per jurisdiktion. Sverige, Litauen och UAE har olika regler och periodicitet.',
  },
  {
    id: 'intercompany',
    label: 'Intercompany',
    tooltip: 'Betalningar MELLAN bolagen i koncernen — t.ex. licensavgifter från dotterbolag till Dubai-holding.',
    ingress: 'Betalningar och licensavgifter MELLAN bolagen i koncernen. Licensflöden samlas i Wavult DevOps FZCO (Dubai, 0% bolagsskatt).',
  },
  {
    id: 'payments',
    label: 'Betalningar',
    tooltip: 'Betalningsflöden via Stripe, Revolut och andra PSP:er. Status och historik.',
    ingress: 'Betalningsflöden via Stripe, Revolut och andra betalningsprocessorer — status och historik per transaktion.',
  },
  {
    id: 'optimization',
    label: 'Optimering',
    tooltip: 'AI-driven rekommendation: när och hur ska ni flytta pengar mellan bolagen för att optimera kassaflöde och skatt.',
    ingress: 'AI-driven kassaflödesoptimering — rekommendationer för när och hur pengar bör flyttas mellan bolagen för att minimera skatt och maximera likviditet.',
  },
]

export function FinanceHub() {
  const { t: _t } = useTranslation() // ready for i18n
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showIngress, setShowIngress] = useState(true)
  const prevTabRef = useRef<Tab>('overview')
  const { activeEntity, viewScope, setViewScope } = useEntityScope()
  const isRoot = activeEntity.layer === 0

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      setShowIngress(true)
      prevTabRef.current = activeTab
      const id = setTimeout(() => setShowIngress(false), 6_000)
      return () => clearTimeout(id)
    }
  }, [activeTab])

  return (
    <div className="flex flex-col h-full bg-white text-text-primary rounded-xl border border-surface-border shadow-sm overflow-hidden">
      <ModuleHeader moduleId="finance" />

      {/* Entity context banner */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--color-border, #E5E7EB)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: activeEntity.color + '08',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>{activeEntity.flag}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: activeEntity.color }}>
          {activeEntity.name}
        </span>
        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>
          {activeEntity.jurisdiction}
        </span>
        {activeEntity.metadata?.['Org. nummer'] && (
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            · {activeEntity.metadata['Org. nummer']}
          </span>
        )}
        {activeEntity.metadata?.['Legal name'] && (
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            · {activeEntity.metadata['Legal name']}
          </span>
        )}
        {/* Group / Entity toggle — only show if not root */}
        {!isRoot && (
          <div style={{ marginLeft: 'auto', display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${activeEntity.color}30` }}>
            <button
              onClick={() => setViewScope('group')}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewScope === 'group' ? activeEntity.color : 'transparent',
                color: viewScope === 'group' ? '#fff' : activeEntity.color,
                transition: 'all 0.15s',
              }}
            >
              Koncern
            </button>
            <button
              onClick={() => setViewScope('entity')}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewScope === 'entity' ? activeEntity.color : 'transparent',
                color: viewScope === 'entity' ? '#fff' : activeEntity.color,
                transition: 'all 0.15s',
              }}
            >
              {activeEntity.shortName}
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-text-primary">Finance Hub</h1>
            <p className="text-xs text-gray-9000 font-mono truncate">
              {isRoot
                ? 'Wavult Group — konsoliderad'
                : viewScope === 'group'
                  ? 'Koncernvy — alla bolag aggregerade'
                  : `${activeEntity.name} — ${activeEntity.jurisdiction}`}
            </p>
          </div>
          <div
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border"
            style={{
              background: activeEntity.color + '12',
              borderColor: activeEntity.color + '30',
              color: activeEntity.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEntity.color }} />
            {activeEntity.shortName}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-4 md:px-6 border-b border-surface-border flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-700 text-blue-700 tab-active-lift'
                : 'border-transparent text-gray-9000 hover:text-gray-600 hover:border-gray-300'
            }`}
          >
            {tab.label}
            <Tooltip content={tab.tooltip} asIcon position="bottom" />
          </button>
        ))}
      </div>

      {/* Tab ingress */}
      {showIngress && (() => {
        const tab = TABS.find(t => t.id === activeTab)
        return tab ? (
          <div className="px-6 py-2 border-b border-surface-border/50 flex-shrink-0 flex items-center gap-2 bg-muted/30">
            <p className="text-xs text-gray-9000 leading-snug">{tab.ingress}</p>
            <button
              onClick={() => setShowIngress(false)}
              className="ml-auto text-gray-9000 hover:text-gray-9000 transition-colors flex-shrink-0"
              aria-label="Stang beskrivning"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null
      })()}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-muted/30">
        <FinanceErrorBoundary tabLabel={TABS.find(t => t.id === activeTab)?.label ?? activeTab}>
          {activeTab === 'overview'     && <FinanceOverview />}
          {activeTab === 'accounts'     && <ChartOfAccounts />}
          {activeTab === 'ledger'       && <LedgerView />}
          {activeTab === 'invoices'     && <InvoiceHub />}
          {activeTab === 'cashflow'     && <CashFlowView />}
          {activeTab === 'tax'          && <TaxView />}
          {activeTab === 'intercompany' && <IntercompanyView />}
          {activeTab === 'payments'     && <PaymentProcessor />}
          {activeTab === 'optimization' && <CashFlowOptimizer />}
        </FinanceErrorBoundary>
      </div>
    </div>
  )
}
