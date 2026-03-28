import { COMPANIES } from './data'

interface OwnerNode {
  id: string
  name: string
  shortName: string
  jurisdiction: string
  orgNr: string
  founded: string
  status: 'aktiv' | 'under bildning'
  color: string
  ownership?: string
  children?: OwnerNode[]
}

const OWNERSHIP_TREE: OwnerNode = {
  id: 'wavult-group',
  name: 'Wavult Group DMCC',
  shortName: 'Wavult Group',
  jurisdiction: 'Dubai, UAE 🇦🇪',
  orgNr: 'DMCC-2025-4471',
  founded: '2025-06-01',
  status: 'aktiv',
  color: '#6366f1',
  children: [
    {
      id: 'landvex-ab',
      name: 'Landvex AB',
      shortName: 'Landvex AB',
      jurisdiction: 'Sverige 🇸🇪',
      orgNr: '559412-8834',
      founded: '2024-03-15',
      status: 'aktiv',
      color: '#3b82f6',
      ownership: '100%',
    },
    {
      id: 'quixzoom-inc',
      name: 'QuiXzoom Inc',
      shortName: 'QuiXzoom Inc',
      jurisdiction: 'Delaware, USA 🇺🇸',
      orgNr: 'DE-7782341',
      founded: '2024-08-20',
      status: 'aktiv',
      color: '#10b981',
      ownership: 'Wavult 20% · Erik 70% · Pool 10%',
      children: [
        {
          id: 'landvex-inc',
          name: 'Landvex Inc',
          shortName: 'Landvex Inc',
          jurisdiction: 'Texas, USA 🇺🇸',
          orgNr: 'TX-0041882',
          founded: '2025-01-10',
          status: 'aktiv',
          color: '#f59e0b',
          ownership: '100%',
        },
        {
          id: 'quixzoom-uab',
          name: 'QuiXzoom UAB',
          shortName: 'QuiXzoom UAB',
          jurisdiction: 'Litauen 🇱🇹',
          orgNr: '306182744',
          founded: '2025-03-01',
          status: 'aktiv',
          color: '#ec4899',
          ownership: '100%',
        },
      ],
    },
  ],
}

function NodeCard({ node, depth = 0 }: { node: OwnerNode; depth?: number }) {
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-0">
        {/* Tree lines */}
        {depth > 0 && (
          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32, marginTop: 24 }}>
            <div className="w-px flex-1 bg-white/[0.1]" style={{ minHeight: 20, maxHeight: 20 }} />
            <div className="flex items-center" style={{ height: 2 }}>
              <div className="w-4 h-px bg-white/[0.1]" />
            </div>
          </div>
        )}

        {/* Card */}
        <div
          className="rounded-xl border p-4 flex-1 transition-all hover:bg-white/[0.03]"
          style={{
            borderColor: node.color + '40',
            background: node.color + '08',
            marginLeft: depth > 0 ? 0 : 0,
          }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: node.color }} />
                <span className="text-[15px] font-semibold text-white">{node.name}</span>
                <span
                  className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${
                    node.status === 'aktiv'
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                  }`}
                >
                  {node.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 ml-4">
                <span>{node.jurisdiction}</span>
                <span>·</span>
                <span className="font-mono">{node.orgNr}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {node.ownership && (
                <div
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border mb-1"
                  style={{ background: node.color + '15', color: node.color, borderColor: node.color + '40' }}
                >
                  {node.ownership}
                </div>
              )}
              <div className="text-xs text-gray-600 font-mono">
                Grundat {new Date(node.founded).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && (
        <div className="flex flex-col ml-8 mt-0">
          {/* Vertical line from parent */}
          <div className="flex">
            <div className="w-px bg-white/[0.1] mx-4" style={{ minHeight: 16, maxHeight: 16 }} />
          </div>
          <div className="flex">
            <div className="flex flex-col gap-3 flex-1">
              {node.children!.map((child, i) => (
                <div key={child.id} className="flex gap-0 items-start">
                  {/* Connector */}
                  <div className="flex flex-col items-end flex-shrink-0" style={{ width: 16 }}>
                    <div
                      className="border-l border-b border-white/[0.1] rounded-bl"
                      style={{ width: 16, height: 28, borderBottomLeftRadius: 4 }}
                    />
                    {i < node.children!.length - 1 && (
                      <div className="w-px flex-1 bg-white/[0.1]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <NodeCard node={child} depth={depth + 1} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OwnershipTree() {
  return (
    <div className="p-2">
      <NodeCard node={OWNERSHIP_TREE} depth={0} />
    </div>
  )
}

function StatsGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {COMPANIES.map(c => (
        <div
          key={c.id}
          className="rounded-xl p-3 border"
          style={{ borderColor: c.color + '30', background: c.color + '08' }}
        >
          <div className="text-sm font-semibold text-white mb-0.5">{c.shortName}</div>
          <div className="text-xs text-gray-500 font-mono">{c.orgNr}</div>
          <div className="text-xs text-gray-600 mt-1">{c.jurisdiction}</div>
          <div className="mt-2 flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${c.status === 'aktiv' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-xs text-gray-500">{c.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function OwnershipView() {
  return (
    <div className="space-y-6">
      {/* Entity cards */}
      <StatsGrid />

      {/* Ownership tree */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Ägarstruktur</h3>
        <OwnershipTree />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span>Aktiv</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          <span>Under bildning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-px bg-white/[0.2]" />
          <span>Ägarrelation</span>
        </div>
        <span className="text-gray-600">·</span>
        <span>Procent = ägarandel i dotterbolaget</span>
      </div>
    </div>
  )
}
