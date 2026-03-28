import { useState } from 'react'
import {
  LEGAL_DOCUMENTS,
  SIGNING_LEVEL_LABELS,
  SIGN_METHOD_LABELS,
  DOC_TYPE_LABELS,
  DOC_TYPE_SIGNING_LEVEL,
  getSignMethod,
  type LegalDocument,
  type LegalDocType,
  type DocStatus,
  type SigningLevel,
  type SignMethod,
} from './data'
import { getTemplate } from './templates'
import { ENTITIES } from '../org-graph/data'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string; description: string }> = {
  proposed:          {
    label: 'Föreslagen',
    color: '#F59E0B',
    bg: '#F59E0B15',
    description: 'Systemet har identifierat ett juridiskt behov baserat på bolagsstrukturen. Dokumentet är ej skapat ännu — granska och skicka för signering.',
  },
  draft:             {
    label: 'Utkast',
    color: '#6B7280',
    bg: '#6B728015',
    description: 'Dokumentet är skapat men ej skickat för signering. Redigera och skicka när det är klart.',
  },
  pending_signature: {
    label: 'Väntar på signatur',
    color: '#3B82F6',
    bg: '#3B82F615',
    description: 'Dokumentet är skickat och väntar på digital signering från en eller flera parter (BankID / DocuSign / eIDAS).',
  },
  signed:            {
    label: 'Signerad',
    color: '#10B981',
    bg: '#10B98115',
    description: 'Alla parter har signerat. Dokumentet är juridiskt bindande och arkiverat.',
  },
  expired:           {
    label: 'Utgången',
    color: '#EF4444',
    bg: '#EF444415',
    description: 'Avtalets giltighetstid har löpt ut. Förnya eller arkivera dokumentet.',
  },
  rejected:          {
    label: 'Avvisad',
    color: '#EF4444',
    bg: '#EF444415',
    description: 'En part har avvisat signeringen. Granska kommentarer och revideraeller avbryt dokumentet.',
  },
}

const LEVEL_COLOR: Record<string, string> = { L1: '#6B7280', L2: '#3B82F6', L3: '#8B5CF6' }

function entityName(id: string): string {
  return ENTITIES.find(e => e.id === id)?.shortName ?? id
}

// ─── Icon components ──────────────────────────────────────────────────────────

function IconScale({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v18M3 9h18M5 9l3-6 3 6M13 9l3-6 3 6M5 9c0 2.21 1.34 4 3 4s3-1.79 3-4M13 9c0 2.21 1.34 4 3 4s3-1.79 3-4M5 21h14" />
    </svg>
  )
}

function IconFile({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function IconShield({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconWarning({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCheck({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconSend({ size = 10, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function IconChevronDown({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconChevronUp({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function IconPlus({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ─── DocRow ───────────────────────────────────────────────────────────────────

function DocRow({ doc, onSend }: { doc: LegalDocument; onSend: (doc: LegalDocument) => void }) {
  const status = STATUS_CONFIG[doc.status]
  const levelColor = LEVEL_COLOR[doc.signing_level]
  return (
    <div className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      {/* Row 1: icon + title + status badge */}
      <div className="flex items-start gap-2">
        <IconFile size={13} className="text-gray-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-snug">{doc.title}</p>
        </div>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-1"
          style={{ color: status.color, background: status.bg }}>
          {status.label}
        </span>
      </div>

      {/* Row 2: meta + action */}
      <div className="flex items-center gap-2 mt-1.5 pl-5 flex-wrap">
        <span className="text-[9px] font-mono text-gray-600 truncate max-w-[140px]">
          {entityName(doc.party_a)} → {entityName(doc.party_b)}
        </span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ color: levelColor, background: levelColor + '15' }}>
          {doc.signing_level}
        </span>
        <span className="text-[9px] text-gray-700 font-mono flex-shrink-0">{SIGN_METHOD_LABELS[doc.sign_method]}</span>
        {doc.royalty_rate && (
          <span className="text-[9px] text-gray-600 font-mono flex-shrink-0">{doc.royalty_rate}% royalty</span>
        )}
        {(doc.status === 'proposed' || doc.status === 'draft') && (
          <button
            onClick={() => onSend(doc)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-white/[0.06] hover:bg-white/[0.10] text-white transition-colors flex-shrink-0 ml-auto"
          >
            <IconSend size={9} /> Skicka
          </button>
        )}
      </div>
    </div>
  )
}

// ─── SendModal ────────────────────────────────────────────────────────────────

function SendModal({ doc, onClose }: { doc: LegalDocument; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const levelColor = LEVEL_COLOR[doc.signing_level]

  const handle = () => {
    setSent(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0D0F1A] border border-white/[0.08] rounded-2xl p-6 w-[480px] max-w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <IconScale size={18} className="text-purple-400" />
          <h2 className="text-[14px] font-bold text-white">Skicka för signering</h2>
        </div>
        <p className="text-xs text-white font-semibold mb-1">{doc.title}</p>
        <p className="text-xs text-gray-500 mb-4">{doc.description}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: levelColor, background: levelColor + '20' }}>
            {doc.signing_level} — {SIGNING_LEVEL_LABELS[doc.signing_level]}
          </span>
          <span className="text-xs text-gray-500">{SIGN_METHOD_LABELS[doc.sign_method]}</span>
        </div>
        {doc.sign_method !== 'click' && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 font-mono uppercase tracking-wider block mb-1.5">
              {doc.sign_method === 'bankid' ? 'Personnummer (YYYYMMDD-XXXX)' : 'E-postadress till motpart'}
            </label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={doc.sign_method === 'bankid' ? '19870926-1234' : 'motpart@företag.com'}
              className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-white/20"
            />
            {doc.sign_method !== 'bankid' && (
              <p className="text-[9px] text-amber-500/70 mt-1.5">⚠️ BankID kräver svenskt personnummer. Internationella parter signerar via {SIGN_METHOD_LABELS[doc.sign_method]}.</p>
            )}
          </div>
        )}
        {sent ? (
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <IconCheck size={16} /> Skickat!
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={handle} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2">
              <IconSend size={13} /> Skicka för signering
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/[0.08] text-gray-500 text-xs hover:text-white transition-colors">
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── NewDocModal ──────────────────────────────────────────────────────────────

const ALL_DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as LegalDocType[]

function NewDocModal({ onClose, onSave }: { onClose: () => void; onSave: (doc: Partial<LegalDocument>) => void }) {
  const [docType, setDocType] = useState<LegalDocType>('nda')
  const [partyA, setPartyA] = useState('')
  const [partyB, setPartyB] = useState('')
  const [jurisdiction, setJurisdiction] = useState('SE')
  const [saved, setSaved] = useState(false)

  const template = getTemplate(docType)
  const defaultLevel: SigningLevel = DOC_TYPE_SIGNING_LEVEL[docType]
  const suggestedMethod: SignMethod = getSignMethod(jurisdiction, defaultLevel)
  const levelColor = LEVEL_COLOR[defaultLevel]

  const entityOptions = ENTITIES.map(e => ({ id: e.id, label: e.shortName ?? e.name }))

  const handleSave = () => {
    const now = new Date().toISOString().slice(0, 10)
    onSave({
      type: docType,
      title: `${DOC_TYPE_LABELS[docType]} — ${partyA || 'Part A'} ↔ ${partyB || 'Part B'}`,
      party_a: partyA,
      party_b: partyB,
      signing_level: defaultLevel,
      sign_method: suggestedMethod,
      status: 'draft',
      created_at: now,
      description: template?.description ?? '',
      required: false,
      auto_proposed: false,
    })
    setSaved(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0D0F1A] border border-white/[0.08] rounded-2xl p-6 w-[540px] max-w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <IconPlus size={18} className="text-purple-400" />
          <h2 className="text-[14px] font-bold text-white">Nytt dokument</h2>
        </div>

        {/* Dokumenttyp */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 font-mono uppercase tracking-wider block mb-1.5">Dokumenttyp</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value as LegalDocType)}
            className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
          >
            {ALL_DOC_TYPES.map(t => (
              <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
            ))}
          </select>
          {template && (
            <p className="text-xs text-gray-600 mt-1.5">{template.description.slice(0, 100)}…</p>
          )}
        </div>

        {/* Parter */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 font-mono uppercase tracking-wider block mb-1.5">
              {template?.partyALabel ?? 'Part A'}
            </label>
            <select
              value={partyA}
              onChange={e => setPartyA(e.target.value)}
              className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
            >
              <option value="">Välj part…</option>
              {entityOptions.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-mono uppercase tracking-wider block mb-1.5">
              {template?.partyBLabel ?? 'Part B'}
            </label>
            <select
              value={partyB}
              onChange={e => setPartyB(e.target.value)}
              className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
            >
              <option value="">Välj part…</option>
              {entityOptions.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Jurisdiktion */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 font-mono uppercase tracking-wider block mb-1.5">Jurisdiktion (för signering)</label>
          <select
            value={jurisdiction}
            onChange={e => setJurisdiction(e.target.value)}
            className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
          >
            <option value="SE">🇸🇪 Sverige (BankID)</option>
            <option value="EU-LT">🇱🇹 Litauen (eIDAS)</option>
            <option value="EU-DE">🇩🇪 Tyskland (eIDAS)</option>
            <option value="AE">🇦🇪 Dubai / UAE (DocuSign)</option>
            <option value="US">🇺🇸 USA (DocuSign)</option>
            <option value="OTHER">🌍 Övriga (E-post OTP)</option>
          </select>
        </div>

        {/* Föreslagen signering */}
        <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <span className="text-xs text-gray-500">Föreslagen signering:</span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: levelColor, background: levelColor + '20' }}>
            {defaultLevel} — {SIGNING_LEVEL_LABELS[defaultLevel]}
          </span>
          <span className="text-xs text-gray-400">{SIGN_METHOD_LABELS[suggestedMethod]}</span>
        </div>

        {/* Checklist */}
        {template && template.checklist.length > 0 && (
          <div className="mb-5">
            <p className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-2">Checklista för detta dokumenttyp</p>
            <ul className="space-y-1">
              {template.checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="text-gray-700 flex-shrink-0 mt-0.5">◦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Knappar */}
        {saved ? (
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <IconCheck size={16} /> Sparat som utkast!
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!partyA || !partyB}
              className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <IconFile size={13} /> Spara som utkast
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/[0.08] text-gray-500 text-xs hover:text-white transition-colors">
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LegalHub ─────────────────────────────────────────────────────────────────

/**
 * LegalHub — Manages all legal documents and signing flows within
 * the Wavult Group corporate structure.
 *
 * Status legend:
 *   Föreslagen        → systemgenererat behov, ej skapat ännu
 *   Utkast            → skapad, ej skickad
 *   Väntar på signatur→ skickad för signering
 *   Signerad          → juridiskt bindande, arkiverad
 *   Utgången          → avtalstid löpt ut
 *   Avvisad           → part har nekat signering
 */
export function LegalHub() {
  const [filter, setFilter] = useState<DocStatus | 'all'>('all')
  const [sendDoc, setSendDoc] = useState<LegalDocument | null>(null)
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [showTriggers, setShowTriggers] = useState(false)
  const [showStatusLegend, setShowStatusLegend] = useState(false)
  const [localDocs, setLocalDocs] = useState<LegalDocument[]>([])
  const { activeEntity, scopedEntities } = useEntityScope()

  const allDocs = [...LEGAL_DOCUMENTS, ...localDocs]

  // Scope: root entity (wavult-group, layer 0) → visa alla. Annars filtrera på party_a/party_b.
  const scopedIds = new Set(scopedEntities.map(e => e.id))
  const isRoot = activeEntity.layer === 0
  const scopedDocs = isRoot
    ? allDocs
    : allDocs.filter(d => scopedIds.has(d.party_a) || scopedIds.has(d.party_b))

  const proposed = scopedDocs.filter(d => d.status === 'proposed')
  const signed   = scopedDocs.filter(d => d.status === 'signed')
  const pending  = scopedDocs.filter(d => d.status === 'pending_signature')

  const filtered = filter === 'all' ? scopedDocs : scopedDocs.filter(d => d.status === filter)

  const handleNewDocSave = (partial: Partial<LegalDocument>) => {
    const newDoc: LegalDocument = {
      id: `local-${Date.now()}`,
      type: partial.type ?? 'nda',
      title: partial.title ?? 'Nytt dokument',
      party_a: partial.party_a ?? '',
      party_b: partial.party_b ?? '',
      signing_level: partial.signing_level ?? 'L2',
      sign_method: partial.sign_method ?? 'bankid',
      status: 'draft',
      created_at: partial.created_at ?? new Date().toISOString().slice(0, 10),
      description: partial.description ?? '',
      required: false,
      auto_proposed: false,
    }
    setLocalDocs(prev => [...prev, newDoc])
  }

  return (
    <div className="flex flex-col h-full bg-[#070709] text-white">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <IconScale size={18} className="text-purple-400 flex-shrink-0" />
          <h1 className="text-[15px] font-bold text-white">Legal Hub</h1>
          <span className="text-[9px] font-mono" style={{ color: activeEntity.color }}>{activeEntity.name}</span>
          <button
            onClick={() => setShowNewDoc(true)}
            className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors flex-shrink-0"
          >
            <IconPlus size={11} /> <span className="hidden sm:inline">Nytt dokument</span><span className="sm:hidden">Nytt</span>
          </button>
        </div>
        {/* Stats — horizontal scroll on mobile */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[
            { label: 'Totalt', value: allDocs.length, color: '#ffffff' },
            { label: 'Föreslagna', value: proposed.length, color: '#F59E0B' },
            { label: 'Väntar', value: pending.length, color: '#3B82F6' },
            { label: 'Signerade', value: signed.length, color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="text-center flex-shrink-0">
              <p className="text-[20px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Proposed alert banner */}
      {proposed.length > 0 && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <IconWarning size={16} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-300">{proposed.length} dokument föreslagna av systemet</p>
            <p className="text-xs text-amber-600 mt-0.5">Systemet har identifierat juridiska behov baserat på bolagsstrukturen. Granska och skicka för signering.</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-3">
        {(['all', 'proposed', 'pending_signature', 'draft', 'signed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {f === 'all' ? 'Alla' : f === 'proposed' ? 'Föreslagna' : f === 'pending_signature' ? 'Väntar' : f === 'draft' ? 'Utkast' : 'Signerade'}
          </button>
        ))}
      </div>

      {/* Status legend — collapsible inline reference */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowStatusLegend(s => !s)}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          <IconShield size={10} />
          {showStatusLegend ? 'Dölj statusförklaring' : 'Vad betyder statusarna? →'}
        </button>
        {showStatusLegend && (
          <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.05]">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Dokumentstatus — förklaring</p>
            </div>
            {(Object.entries(STATUS_CONFIG) as [DocStatus, typeof STATUS_CONFIG[DocStatus]][]).map(([key, cfg]) => (
              <div key={key} className="flex items-start gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0">
                <span
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                  style={{ color: cfg.color, background: cfg.bg }}
                >
                  {cfg.label}
                </span>
                <p className="text-xs text-gray-500 leading-snug">{cfg.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-4 rounded-xl border border-white/[0.06] overflow-hidden bg-[#0D0F1A]">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-700">
              <div className="text-center">
                <IconCheck size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Inga dokument i denna kategori</p>
              </div>
            </div>
          ) : (
            filtered.map(doc => <DocRow key={doc.id} doc={doc} onSend={setSendDoc} />)
          )}
        </div>

        {/* Triggers panel */}
        <div className="mx-4 mt-4 mb-6">
          <button
            onClick={() => setShowTriggers(s => !s)}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showTriggers ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            <IconShield size={11} />
            Automatiska juridiktriggers
          </button>
          {showTriggers && (
            <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0D0F1A] overflow-hidden">
              {[
                { icon: '🏢', title: 'Nytt bolag', desc: 'IP-licens + Management Agreement föreslås automatiskt', priority: 'critical' },
                { icon: '💸', title: 'Kapitalöverföring > 50k SEK', desc: 'Koncernlån-avtal föreslås', priority: 'high' },
                { icon: '🇪🇺', title: 'EU-bolag + personuppgifter', desc: 'DPA (GDPR) föreslås automatiskt', priority: 'critical' },
                { icon: '👤', title: 'Ny extern part', desc: 'NDA + Service Agreement föreslås', priority: 'medium' },
              ].map(t => (
                <div key={t.title} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0">
                  <span className="text-sm flex-shrink-0 mt-0.5">{t.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                  <span className={`ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${t.priority === 'critical' ? 'bg-red-500/15 text-red-400' : t.priority === 'high' ? 'bg-amber-500/15 text-amber-400' : 'bg-gray-500/15 text-gray-400'}`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {sendDoc && <SendModal doc={sendDoc} onClose={() => setSendDoc(null)} />}
      {showNewDoc && <NewDocModal onClose={() => setShowNewDoc(false)} onSave={handleNewDocSave} />}
    </div>
  )
}
