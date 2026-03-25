import { useEntityScope } from '../../shared/scope/EntityScopeContext'

export function TransactionFeed() {
  const { activeEntity } = useEntityScope()
  const isRoot = activeEntity.layer === 0

  const ledgerLabel = isRoot
    ? 'Group-wide ledger'
    : `Showing ledger for ${activeEntity.name}`

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-gray-400 mt-1">{ledgerLabel} — coming in v2.1</p>
        {/* Scope banner */}
        {!isRoot && (
          <div
            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: activeEntity.color + '15',
              border: `1px solid ${activeEntity.color}30`,
              color: activeEntity.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: activeEntity.color }} />
            {activeEntity.name}
          </div>
        )}
      </div>

      <div className="bg-surface-raised border border-surface-border rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">↕</div>
        <h3 className="text-lg font-semibold text-white mb-2">Ledger Core — Building</h3>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          {isRoot
            ? 'Multi-entity, multi-currency transaction engine med intercompany clearing.'
            : `Transaction engine for ${activeEntity.name} — intercompany clearing.`}
          {' '}Rullar ut i v2.1 (Q2 2026).
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <span className="px-3 py-1 bg-brand-warning/10 text-brand-warning border border-brand-warning/30 text-xs rounded-full">SEK · EUR · USD · AED</span>
          <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent border border-brand-accent/30 text-xs rounded-full">TX ↔ LT ↔ DIFC</span>
        </div>
      </div>
    </div>
  )
}
