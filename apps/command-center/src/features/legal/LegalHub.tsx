import { useState } from 'react'
import { Scale, FileText, Shield, AlertTriangle, CheckCircle, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { LEGAL_DOCUMENTS, SIGNING_LEVEL_LABELS, SIGN_METHOD_LABELS, type LegalDocument, type DocStatus } from './data'
import { ENTITIES } from '../org-graph/data'

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string }> = {
  proposed:          { label: 'Föreslagen',         color: '#F59E0B', bg: '#F59E0B15' },
  draft:             { label: 'Utkast',              color: '#6B7280', bg: '#6B728015' },
  pending_signature: { label: 'Väntar på signatur',  color: '#3B82F6', bg: '#3B82F615' },
  signed:            { label: 'Signerad',            color: '#10B981', bg: '#10B98115' },
  expired:           { label: 'Utgången',            color: '#EF4444', bg: '#EF444415' },
  rejected:          { label: 'Avvisad',             color: '#EF4444', bg: '#EF444415' },
}

const LEVEL_COLOR: Record<string, string> = { L1: '#6B7280', L2: '#3B82F6', L3: '#8B5CF6' }

function entityName(id: string): string {
  return ENTITIES.find(e => e.id === id)?.shortName ?? id
}

function DocRow({ doc, onSend }: { doc: LegalDocument; onSend: (doc: LegalDocument) => void }) {
  const status = STATUS_CONFIG[doc.status]
  const levelColor = LEVEL_COLOR[doc.signing_level]
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <FileText size={14} className="text-gray-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-white truncate">{doc.title}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{doc.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-mono text-gray-600">{entityName(doc.party_a)} → {entityName(doc.party_b)}</span>
          {doc.amount && <span className="text-[9px] text-gray-600 font-mono">{doc.amount.toLocaleString()} {doc.currency}</span>}
          {doc.royalty_rate && <span className="text-[9px] text-gray-600 font-mono">{doc.royalty_rate}% royalty</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: levelColor, background: levelColor + '15' }}>
          {doc.signing_level} · {SIGNING_LEVEL_LABELS[doc.signing_level]}
        </span>
        <span className="text-[9px] font-mono">{SIGN_METHOD_LABELS[doc.sign_method]}</span>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ color: status.color, background: status.bg }}>
          {status.label}
        </span>
        {(doc.status === 'proposed' || doc.status === 'draft') && (
          <button
            onClick={() => onSend(doc)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold bg-white/[0.06] hover:bg-white/[0.10] text-white transition-colors"
          >
            <Send size={10} /> Skicka
          </button>
        )}
      </div>
    </div>
  )
}

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
          <Scale size={18} className="text-purple-400" />
          <h2 className="text-[14px] font-bold text-white">Skicka för signering</h2>
        </div>
        <p className="text-[12px] text-white font-semibold mb-1">{doc.title}</p>
        <p className="text-[11px] text-gray-500 mb-4">{doc.description}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ color: levelColor, background: levelColor + '20' }}>
            {doc.signing_level} — {SIGNING_LEVEL_LABELS[doc.signing_level]}
          </span>
          <span className="text-[10px] text-gray-500">{SIGN_METHOD_LABELS[doc.sign_method]}</span>
        </div>
        {doc.sign_method !== 'click' && (
          <div className="mb-4">
            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block mb-1.5">
              {doc.sign_method === 'bankid' ? 'Personnummer (YYYYMMDD-XXXX)' : 'E-postadress till motpart'}
            </label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={doc.sign_method === 'bankid' ? '19870926-1234' : 'motpart@företag.com'}
              className="w-full bg-[#070709] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder-gray-700 focus:outline-none focus:border-white/20"
            />
            {doc.sign_method !== 'bankid' && (
              <p className="text-[9px] text-amber-500/70 mt-1.5">⚠️ BankID kräver svenskt personnummer. Internationella parter signerar via {SIGN_METHOD_LABELS[doc.sign_method]}.</p>
            )}
          </div>
        )}
        {sent ? (
          <div className="flex items-center gap-2 text-emerald-400 text-[12px] font-semibold">
            <CheckCircle size={16} /> Skickat!
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={handle} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-semibold transition-colors flex items-center justify-center gap-2">
              <Send size={13} /> Skicka för signering
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/[0.08] text-gray-500 text-[12px] hover:text-white transition-colors">
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function LegalHub() {
  const [filter, setFilter] = useState<DocStatus | 'all'>('all')
  const [sendDoc, setSendDoc] = useState<LegalDocument | null>(null)
  const [showTriggers, setShowTriggers] = useState(false)

  const proposed = LEGAL_DOCUMENTS.filter(d => d.status === 'proposed')
  const signed   = LEGAL_DOCUMENTS.filter(d => d.status === 'signed')
  const pending  = LEGAL_DOCUMENTS.filter(d => d.status === 'pending_signature')

  const filtered = filter === 'all' ? LEGAL_DOCUMENTS : LEGAL_DOCUMENTS.filter(d => d.status === filter)

  return (
    <div className="flex flex-col h-full bg-[#070709] text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 mb-4">
          <Scale size={20} className="text-purple-400" />
          <h1 className="text-[16px] font-bold text-white">Legal Hub</h1>
          <span className="text-[9px] font-mono text-gray-700 ml-2">Wavult Group</span>
        </div>
        {/* Stats */}
        <div className="flex gap-4">
          {[
            { label: 'Totalt', value: LEGAL_DOCUMENTS.length, color: '#ffffff' },
            { label: 'Föreslagna', value: proposed.length, color: '#F59E0B' },
            { label: 'Väntar', value: pending.length, color: '#3B82F6' },
            { label: 'Signerade', value: signed.length, color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Proposed alert banner */}
      {proposed.length > 0 && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-amber-300">{proposed.length} dokument föreslagna av systemet</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Systemet har identifierat juridiska behov baserat på bolagsstrukturen. Granska och skicka för signering.</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-3">
        {(['all', 'proposed', 'pending_signature', 'signed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {f === 'all' ? 'Alla' : f === 'proposed' ? 'Föreslagna' : f === 'pending_signature' ? 'Väntar' : 'Signerade'}
          </button>
        ))}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-4 rounded-xl border border-white/[0.06] overflow-hidden bg-[#0D0F1A]">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-700">
              <div className="text-center">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-[12px]">Inga dokument i denna kategori</p>
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
            className="flex items-center gap-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showTriggers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <Shield size={11} />
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
                    <p className="text-[11px] font-semibold text-white">{t.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
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
    </div>
  )
}
