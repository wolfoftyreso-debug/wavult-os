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
          <div className="text-3xl">⚠️</div>
          <p className="text-sm font-semibold text-white">{this.props.tabLabel} — data saknas</p>
          <p className="text-xs text-gray-500 max-w-sm text-center">
            Den här modulen behöver live-data från Supabase. Tabellerna är inte satta upp ännu.
            All data är mockad tills Supabase-scheman är live.
          </p>
          <p className="text-xs text-gray-700 font-mono">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-4 py-2 rounded-lg bg-surface-raised border border-surface-border text-gray-400 hover:text-white transition-colors"
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

const TABS: Array<{ id: Tab; label: string; icon: string; tooltip: string; ingress: string }> = [
  {
    id: 'overview',
    label: 'Översikt',
    icon: '📊',
    tooltip: 'Sammanfattning av ekonomin för valt bolag. KPI:er, senaste transaktioner och status på ett ställe.',
    ingress: 'Sammanfattning av ekonomin för valt bolag — KPI:er, senaste transaktioner och status i ett enda vy.',
  },
  {
    id: 'accounts',
    label: 'Kontoplan',
    icon: '📋',
    tooltip: 'Alla konton i bokföringen — intäkter, kostnader, tillgångar och skulder. Baserat på BAS-kontoplanen.',
    ingress: 'Alla bokföringskonton organiserade enligt BAS-kontoplanen — intäkter, kostnader, tillgångar och skulder.',
  },
  {
    id: 'ledger',
    label: 'Transaktioner',
    icon: '↕',
    tooltip: 'Alla enskilda transaktioner kronologiskt. Filtrera per bolag, konto eller period.',
    ingress: 'Kronologisk lista över alla transaktioner. Filtrera per bolag, konto eller tidsperiod.',
  },
  {
    id: 'invoices',
    label: 'Fakturor',
    icon: '🧾',
    tooltip: 'Utgående fakturor till kunder och inkommande fakturor från leverantörer.',
    ingress: 'Utgående fakturor till kunder och inkommande leverantörsfakturor. Status: utkast, skickad, betald.',
  },
  {
    id: 'cashflow',
    label: 'Kassaflöde',
    icon: '💧',
    tooltip: 'Pengar in minus pengar ut. Det viktigaste måttet på bolagets hälsa i realtid.',
    ingress: 'Pengar in minus pengar ut — det viktigaste måttet på bolagets löpande hälsa.',
  },
  {
    id: 'tax',
    label: 'Moms/Skatt',
    icon: '🏛️',
    tooltip: 'Momsredovisning och skatteberäkning per bolag och jurisdiktion. SE, LT och UAE har olika regler.',
    ingress: 'Momsredovisning och skatteberäkning per jurisdiktion. Sverige, Litauen och UAE har olika regler och periodicitet.',
  },
  {
    id: 'intercompany',
    label: 'Intercompany',
    icon: '↔️',
    tooltip: 'Betalningar MELLAN bolagen i koncernen — t.ex. licensavgifter från dotterbolag till Dubai-holding.',
    ingress: 'Betalningar och licensavgifter MELLAN bolagen i koncernen. Licensflöden samlas i Wavult DevOps FZCO (Dubai, 0% bolagsskatt).',
  },
  {
    id: 'payments',
    label: 'Betalningar',
    icon: '💳',
    tooltip: 'Betalningsflöden via Stripe, Revolut och andra PSP:er. Status och historik.',
    ingress: 'Betalningsflöden via Stripe, Revolut och andra betalningsprocessorer — status och historik per transaktion.',
  },
  {
    id: 'optimization',
    label: 'Optimering',
    icon: '⚡',
    tooltip: 'AI-driven rekommendation: när och hur ska ni flytta pengar mellan bolagen för att optimera kassaflöde och skatt.',
    ingress: 'AI-driven kassaflödesoptimering — rekommendationer för när och hur pengar bör flyttas mellan bolagen för att minimera skatt och maximera likviditet.',
  },
]

/**
 * FinanceHub — Main finance module with tab navigation.
 * Displays inline ingress text on tab switch and semantic
 * section descriptions for Intercompany and Optimering.
 */
export function FinanceHub() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showIngress, setShowIngress] = useState(true)
  const prevTabRef = useRef<Tab>('overview')
  const { activeEntity } = useEntityScope()

  // Show ingress briefly when the user switches tabs
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      setShowIngress(true)
      prevTabRef.current = activeTab
      const id = setTimeout(() => setShowIngress(false), 6_000)
      return () => clearTimeout(id)
    }
  }, [activeTab])

  return (
    <div className="flex flex-col h-full bg-[#07080F] text-white">
      <ModuleHeader moduleId="finance" />
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] font-bold text-white">Finance Hub</h1>
            <p className="text-xs text-gray-600 font-mono truncate">
              {activeEntity.layer === 0 ? 'Wavult Group — konsoliderad' : activeEntity.name}
            </p>
          </div>
          <div
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: activeEntity.color + '15',
              border: `1px solid ${activeEntity.color}30`,
              color: activeEntity.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEntity.color }} />
            {activeEntity.name}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-4 md:px-6 py-2 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            {tab.label}
            <Tooltip content={tab.tooltip} asIcon position="bottom" />
          </button>
        ))}
      </div>

      {/* Tab ingress — shown briefly on tab switch */}
      {showIngress && (() => {
        const tab = TABS.find(t => t.id === activeTab)
        return tab ? (
          <div className="px-6 py-2 border-b border-white/[0.04] flex-shrink-0 flex items-center gap-2 bg-white/[0.01]">
            <span className="text-sm leading-none">{tab.icon}</span>
            <p className="text-xs text-gray-500 leading-snug">{tab.ingress}</p>
            <button
              onClick={() => setShowIngress(false)}
              className="ml-auto text-gray-700 hover:text-gray-500 transition-colors flex-shrink-0"
              aria-label="Stäng beskrivning"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null
      })()}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
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
