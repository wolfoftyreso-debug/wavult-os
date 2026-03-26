// ─── Four-Layer Entity Renderer ──────────────────────────────────────────────
// Renders entities as structured layers, not cards.
// Every piece of information has context. Nothing hides.

import { useState } from 'react'
import {
  type FourLayerEntity, type ValidationError, type ExecutionStatus,
  validate, completeness, toStructuredOutput,
} from './model'

// ─── Colors ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ExecutionStatus, { bg: string; text: string }> = {
  active: { bg: '#1A2A1E', text: '#4A7A5B' },
  blocked: { bg: '#2A1A1A', text: '#B04040' },
  pending: { bg: '#1A1C24', text: '#6B7280' },
  done: { bg: '#1A1C24', text: '#3D4452' },
  overdue: { bg: '#2A1A1A', text: '#B04040' },
}

const LAYER_LABEL = {
  definition: 'WHAT',
  purpose: 'WHY',
  method: 'HOW',
  execution: 'DO',
}

const LAYER_COLOR = {
  definition: '#6B7280',
  purpose: '#4A7A9B',
  method: '#9A7A30',
  execution: '#4A7A5B',
}

// ─── Compact Row (list view) ────────────────────────────────────────────────

export function EntityRow({
  entity,
  isExpanded,
  onToggle,
}: {
  entity: FourLayerEntity
  isExpanded: boolean
  onToggle: () => void
}) {
  const s = STATUS_STYLE[entity.execution.status]
  const comp = completeness(entity)
  const errors = validate(entity)

  return (
    <div className="rounded-lg border border-[#1A1C24] bg-[#0E0F14]">
      {/* Row header */}
      <button onClick={onToggle} className="w-full text-left px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: s.bg, color: s.text }}>
            {entity.execution.status}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-[#E0E1E4]">{entity.title}</span>
          </div>
          {entity.execution.outcomeSEK !== null && (
            <span className="text-[13px] font-mono text-[#E0E1E4]">
              {entity.execution.outcomeSEK.toLocaleString('sv-SE')} SEK
            </span>
          )}
          <span className="text-[12px] text-[#6B7280]">{entity.execution.owner}</span>
          <span className="text-[11px] text-[#3D4452] font-mono">{entity.execution.deadline}</span>
          {/* Completeness */}
          {comp.pct < 100 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: '#2A1A1A', color: '#B04040' }}>
              {comp.pct}%
            </span>
          )}
        </div>
      </button>

      {/* Expanded: 4 layers */}
      {isExpanded && (
        <div className="border-t border-[#1A1C24] px-4 py-3 space-y-3">
          {/* WHAT */}
          <LayerBlock layer="definition" color={LAYER_COLOR.definition}>
            <div className="text-[12px] text-[#9CA3AF]">{entity.definition.description}</div>
            <div className="text-[11px] text-[#6B7280] mt-1">Problem: {entity.definition.problem}</div>
            <div className="text-[10px] text-[#3D4452] mt-0.5">Category: {entity.definition.category}</div>
          </LayerBlock>

          {/* WHY */}
          <LayerBlock layer="purpose" color={LAYER_COLOR.purpose}>
            <div className="text-[12px] text-[#9CA3AF]">{entity.purpose.importance}</div>
            <div className="text-[11px] text-[#B04040] mt-1">If ignored: {entity.purpose.ifIgnored}</div>
            <div className="text-[10px] text-[#4A7A9B] mt-0.5">KPI: {entity.purpose.affectedKPI}</div>
          </LayerBlock>

          {/* HOW */}
          <LayerBlock layer="method" color={LAYER_COLOR.method}>
            <div className="space-y-0.5">
              {entity.method.steps.map((step, i) => (
                <div key={i} className="text-[12px] text-[#9CA3AF]">
                  <span className="text-[10px] text-[#3D4452] font-mono mr-2">{i + 1}.</span>{step}
                </div>
              ))}
            </div>
            {entity.method.dependencies.length > 0 && (
              <div className="text-[10px] text-[#3D4452] mt-1.5">
                Depends on: {entity.method.dependencies.join(', ')}
              </div>
            )}
          </LayerBlock>

          {/* DO */}
          <LayerBlock layer="execution" color={LAYER_COLOR.execution}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
              <div><span className="text-[#3D4452]">Status: </span><span style={{ color: s.text }}>{entity.execution.status}</span></div>
              <div><span className="text-[#3D4452]">Owner: </span><span className="text-[#E0E1E4]">{entity.execution.owner}</span></div>
              <div><span className="text-[#3D4452]">Next: </span><span className="text-[#E0E1E4]">{entity.execution.nextAction}</span></div>
              <div><span className="text-[#3D4452]">Deadline: </span><span className="text-[#E0E1E4] font-mono">{entity.execution.deadline}</span></div>
              {entity.execution.outcomeSEK !== null && (
                <div><span className="text-[#3D4452]">Outcome: </span><span className="text-[#4A7A5B] font-mono">{entity.execution.outcomeSEK.toLocaleString('sv-SE')} SEK</span></div>
              )}
              <div className="col-span-2"><span className="text-[#3D4452]">Expected: </span><span className="text-[#9CA3AF]">{entity.execution.outcomeDescription}</span></div>
            </div>
          </LayerBlock>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded-md bg-[#1A1214] border border-[#2A1A1A] px-3 py-2">
              <div className="text-[10px] text-[#B04040] font-mono mb-1">INVALID — {errors.length} missing fields:</div>
              {errors.map((err, i) => (
                <div key={i} className="text-[10px] text-[#6B4040]">
                  {err.layer}.{err.field}: {err.message}
                </div>
              ))}
            </div>
          )}

          {/* Structured output for chat/AI */}
          <div className="rounded-md bg-[#0A0B10] border border-[#1A1C24] px-3 py-2">
            <div className="text-[9px] text-[#3D4452] font-mono mb-1">STRUCTURED OUTPUT (for AI/chat):</div>
            <pre className="text-[10px] text-[#6B7280] font-mono whitespace-pre-wrap">{toStructuredOutput(entity)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Layer Block ────────────────────────────────────────────────────────────

function LayerBlock({
  layer,
  color,
  children,
}: {
  layer: keyof typeof LAYER_LABEL
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="w-12 flex-shrink-0 pt-0.5">
        <span className="text-[9px] font-mono font-semibold" style={{ color }}>
          {LAYER_LABEL[layer]}
        </span>
      </div>
      <div className="flex-1 min-w-0 border-l border-[#1A1C24] pl-3">
        {children}
      </div>
    </div>
  )
}

// ─── Entity List ────────────────────────────────────────────────────────────

export function EntityList({
  entities,
  title,
  subtitle,
}: {
  entities: FourLayerEntity[]
  title: string
  subtitle?: string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      {title && (
        <div className="mb-3">
          <h2 className="text-[13px] font-medium text-[#6B7280]">{title}</h2>
          {subtitle && <p className="text-[11px] text-[#3D4452] mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="space-y-1.5">
        {entities.map(entity => (
          <EntityRow
            key={entity.id}
            entity={entity}
            isExpanded={expandedId === entity.id}
            onToggle={() => setExpandedId(expandedId === entity.id ? null : entity.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Summary Stats ──────────────────────────────────────────────────────────

export function SystemSummary({ entities }: { entities: FourLayerEntity[] }) {
  const active = entities.filter(e => e.execution.status === 'active').length
  const blocked = entities.filter(e => e.execution.status === 'blocked').length
  const totalSEK = entities.reduce((s, e) => s + (e.execution.outcomeSEK ?? 0), 0)
  const avgCompleteness = Math.round(entities.reduce((s, e) => s + completeness(e).pct, 0) / entities.length)

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <div className="rounded-lg border border-[#1A1C24] bg-[#0E0F14] px-4 py-3">
        <div className="text-[11px] text-[#4A4F5C]">Active</div>
        <div className="text-[18px] font-semibold text-[#E0E1E4]">{active}</div>
      </div>
      <div className="rounded-lg border border-[#1A1C24] bg-[#0E0F14] px-4 py-3">
        <div className="text-[11px] text-[#4A4F5C]">Blocked</div>
        <div className="text-[18px] font-semibold" style={{ color: blocked > 0 ? '#B04040' : '#4A7A5B' }}>{blocked}</div>
      </div>
      <div className="rounded-lg border border-[#1A1C24] bg-[#0E0F14] px-4 py-3">
        <div className="text-[11px] text-[#4A4F5C]">Total outcome</div>
        <div className="text-[18px] font-semibold text-[#E0E1E4] font-mono">{totalSEK.toLocaleString('sv-SE')}</div>
        <div className="text-[10px] text-[#3D4452]">SEK at stake</div>
      </div>
      <div className="rounded-lg border border-[#1A1C24] bg-[#0E0F14] px-4 py-3">
        <div className="text-[11px] text-[#4A4F5C]">Data completeness</div>
        <div className="text-[18px] font-semibold" style={{ color: avgCompleteness === 100 ? '#4A7A5B' : '#9A7A30' }}>{avgCompleteness}%</div>
      </div>
    </div>
  )
}
