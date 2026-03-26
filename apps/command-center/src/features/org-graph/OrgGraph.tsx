// ─── Organization — Companies and People ────────────────────────────────────
// Apple Settings style. Clean list with drill-down.

import { useState } from 'react'
import { ENTITIES, RELATIONSHIPS, ROLE_MAPPINGS, type Entity } from './data'

const LAYERS = [
  { layer: 0, label: 'Holding' },
  { layer: 1, label: 'Operations' },
  { layer: 2, label: 'Product companies' },
  { layer: 3, label: 'Systems' },
]

const STATUS_COLOR: Record<string, string> = {
  live: '#34C759', forming: '#FF9500', planned: '#8E8E93',
}

export function OrgGraph() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? ENTITIES.find(e => e.id === selectedId) : null

  if (selected) {
    return <EntityDetail entity={selected} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-[28px] font-bold text-[#1C1C1E] mb-1">Organization</h1>
      <p className="text-[15px] text-[#8E8E93] mb-6">{ENTITIES.length} companies, {ROLE_MAPPINGS.length} people</p>

      {LAYERS.map(({ layer, label }) => {
        const entities = ENTITIES.filter(e => e.layer === layer)
        if (entities.length === 0) return null
        return (
          <div key={layer} className="mb-6">
            <div className="px-4 mb-1"><span className="text-[13px] text-[#8E8E93] uppercase">{label}</span></div>
            <div className="bg-white rounded-xl overflow-hidden">
              {entities.map(entity => (
                <button key={entity.id} onClick={() => setSelectedId(entity.id)}
                  className="w-full flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0 text-left hover:bg-[#F2F2F7] transition-colors">
                  <div className="flex-1">
                    <div className="text-[15px] text-[#1C1C1E]">{entity.name}</div>
                    <div className="text-[13px] text-[#8E8E93]">{entity.jurisdiction} — {entity.type}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className="text-[13px]" style={{ color: STATUS_COLOR[entity.active_status] ?? '#8E8E93' }}>
                      {entity.active_status}
                    </span>
                    <span className="text-[#C7C7CC] text-[14px]">&#8250;</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* People */}
      <div className="mb-6">
        <div className="px-4 mb-1"><span className="text-[13px] text-[#8E8E93] uppercase">Team</span></div>
        <div className="bg-white rounded-xl overflow-hidden">
          {ROLE_MAPPINGS.map(p => (
            <div key={p.person} className="flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0">
              <div className="flex-1">
                <div className="text-[15px] text-[#1C1C1E]">{p.person}</div>
                <div className="text-[13px] text-[#8E8E93]">{p.role_type}</div>
              </div>
              <span className="text-[13px] text-[#8E8E93]">{p.entity_ids.length} companies</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EntityDetail({ entity, onBack }: { entity: Entity; onBack: () => void }) {
  const parent = entity.parent_entity_id ? ENTITIES.find(e => e.id === entity.parent_entity_id) : null
  const children = ENTITIES.filter(e => e.parent_entity_id === entity.id)
  const people = ROLE_MAPPINGS.filter(r => r.entity_ids.includes(entity.id))
  const rels = RELATIONSHIPS.filter(r => r.from_entity_id === entity.id || r.to_entity_id === entity.id)

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <button onClick={onBack} className="text-[15px] text-[#007AFF] mb-4">Back</button>
      <h1 className="text-[28px] font-bold text-[#1C1C1E] mb-1">{entity.name}</h1>
      <p className="text-[15px] text-[#8E8E93] mb-6">{entity.description}</p>

      {/* Details */}
      <Section title="Details">
        <InfoRow label="Short name" value={entity.shortName} />
        <InfoRow label="Type" value={entity.type} />
        <InfoRow label="Jurisdiction" value={entity.jurisdiction} />
        <InfoRow label="Status" value={entity.active_status} valueColor={STATUS_COLOR[entity.active_status]} />
        {Object.entries(entity.metadata).map(([k, v]) => (
          <InfoRow key={k} label={k} value={v} />
        ))}
      </Section>

      {/* Parent */}
      {parent && (
        <Section title="Parent company">
          <InfoRow label={parent.name} value={parent.jurisdiction} />
        </Section>
      )}

      {/* Subsidiaries */}
      {children.length > 0 && (
        <Section title={`Subsidiaries (${children.length})`}>
          {children.map(c => (
            <InfoRow key={c.id} label={c.name} value={c.jurisdiction} />
          ))}
        </Section>
      )}

      {/* People */}
      {people.length > 0 && (
        <Section title={`People (${people.length})`}>
          {people.map(p => (
            <InfoRow key={p.person} label={p.person} value={p.role_type} />
          ))}
        </Section>
      )}

      {/* Relationships */}
      {rels.length > 0 && (
        <Section title={`Relationships (${rels.length})`}>
          {rels.map(r => {
            const other = ENTITIES.find(e => e.id === (r.from_entity_id === entity.id ? r.to_entity_id : r.from_entity_id))
            return <InfoRow key={r.id} label={r.label} value={other?.name ?? ''} />
          })}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="px-4 mb-1"><span className="text-[13px] text-[#8E8E93] uppercase">{title}</span></div>
      <div className="bg-white rounded-xl overflow-hidden">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center px-4 py-[11px] border-b border-[#E5E5EA] last:border-b-0">
      <span className="flex-1 text-[15px] text-[#1C1C1E]">{label}</span>
      <span className="text-[15px] flex-shrink-0 ml-3" style={{ color: valueColor ?? '#8E8E93' }}>{value}</span>
    </div>
  )
}
