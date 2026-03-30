// ─── Wavult OS — Wavult ID · Identity Verification ───────────────────────────
// Intern KYC-hantering för Wavult Group-teamet
// Tabell: wavult_identity_verifications (Supabase wavult-os)

import { useState, useEffect, useMemo } from 'react'
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Search, X, Plus, User, ChevronDown, ChevronUp,
  Calendar, Globe, Hash, Clock, CheckCircle,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)

// ─── Types ────────────────────────────────────────────────────────────────────

type VerificationStatus = 'verified' | 'pending' | 'expired' | 'rejected'

interface IdentityVerification {
  id: string
  user_id: string | null
  full_name: string
  passport_number: string
  date_of_birth: string | null
  place_of_birth: string | null
  nationality: string | null
  passport_expiry: string | null
  verified_at: string | null
  verified_by: string | null
  status: VerificationStatus
  raw_data: Record<string, unknown> | null
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskPassport(num: string): string {
  if (num.length <= 4) return num
  return num.slice(0, 2) + '*'.repeat(num.length - 4) + num.slice(-2)
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

function effectiveStatus(v: IdentityVerification): VerificationStatus {
  if (v.status === 'verified' && isExpired(v.passport_expiry)) return 'expired'
  return v.status
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('sv-SE')
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'Idag'
  if (days === 1) return 'Igår'
  return `${days} dagar sedan`
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VerificationStatus }) {
  const cfg = {
    verified: { icon: <ShieldCheck size={10} />, label: 'VERIFIED',  color: 'var(--color-success)',  bg: 'var(--color-success-bg)' },
    pending:  { icon: <Shield size={10} />,      label: 'PENDING',   color: 'var(--color-warning)',  bg: 'var(--color-warning-bg)' },
    expired:  { icon: <ShieldAlert size={10} />, label: 'EXPIRED',   color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)'  },
    rejected: { icon: <ShieldOff size={10} />,   label: 'REJECTED',  color: 'var(--color-neutral)',  bg: 'var(--color-neutral-bg)' },
  }[status]

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function IdentityDrawer({ v, onClose }: { v: IdentityVerification; onClose: () => void }) {
  const status = effectiveStatus(v)

  const rows: [string, string][] = [
    ['Fullständigt namn', v.full_name],
    ['Passnummer', v.passport_number],
    ['Personnummer', (v.raw_data?.personal_number as string) ?? '—'],
    ['Nationalitet', v.nationality ?? '—'],
    ['Födelsedag', formatDate(v.date_of_birth)],
    ['Födelseort', v.place_of_birth ?? '—'],
    ['Passgiltig till', formatDate(v.passport_expiry)],
    ['Verifierat', formatDate(v.verified_at)],
    ['Verifierat av', v.verified_by ?? '—'],
    ['Skapad', formatDate(v.created_at)],
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-md shadow-xl overflow-y-auto"
        style={{ background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: 'var(--color-brand)' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Wavult ID
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {v.id.slice(0, 8)}
              </span>
              <StatusBadge status={status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          <section>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Identitetsuppgifter
            </h3>
            <div
              className="rounded-lg border divide-y"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-subtle)' }}
            >
              {rows.map(([k, val]) => (
                <div key={k} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span
                    className="text-xs font-mono text-right"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {v.raw_data && Object.keys(v.raw_data).length > 0 && (
            <section>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Rådata / Verifieringsspår
              </h3>
              <pre
                className="rounded-lg border px-3 py-2 text-xs font-mono overflow-x-auto"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {JSON.stringify(v.raw_data, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Verification Form ────────────────────────────────────────────────────

function AddVerificationForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: '',
    passport_number: '',
    date_of_birth: '',
    place_of_birth: '',
    nationality: 'Swedish',
    passport_expiry: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.passport_number) {
      setError('Namn och passnummer krävs')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('wavult_identity_verifications')
      .insert({
        full_name: form.full_name,
        passport_number: form.passport_number,
        date_of_birth: form.date_of_birth || null,
        place_of_birth: form.place_of_birth || null,
        nationality: form.nationality || null,
        passport_expiry: form.passport_expiry || null,
        verified_by: 'manual',
        status: 'verified',
        raw_data: form.notes ? { notes: form.notes } : null,
      })
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      onSaved()
      onClose()
    }
  }

  const fields: { key: keyof typeof form; label: string; type?: string; placeholder?: string }[] = [
    { key: 'full_name',       label: 'Fullständigt namn *', placeholder: 'Förnamn Efternamn' },
    { key: 'passport_number', label: 'Passnummer *',        placeholder: 'AA1234567' },
    { key: 'nationality',     label: 'Nationalitet',        placeholder: 'Swedish' },
    { key: 'date_of_birth',   label: 'Födelsedag',          type: 'date' },
    { key: 'place_of_birth',  label: 'Födelseort',          placeholder: 'Stockholm' },
    { key: 'passport_expiry', label: 'Passgiltig till',     type: 'date' },
    { key: 'notes',           label: 'Anteckningar',        placeholder: 'Valfri notering' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl shadow-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Lägg till verifiering
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {f.label}
              </label>
              <input
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ background: 'var(--color-brand)', color: '#fff' }}
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

type SortKey = 'full_name' | 'status' | 'nationality' | 'passport_expiry' | 'verified_at'
type SortDir = 'asc' | 'desc'

export function WavultIDView() {
  const [records, setRecords]       = useState<IdentityVerification[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<IdentityVerification | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [sortKey, setSortKey]       = useState<SortKey>('verified_at')
  const [sortDir, setSortDir]       = useState<SortDir>('desc')
  const [filterStatus, setFilter]   = useState<VerificationStatus | 'all'>('all')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('wavult_identity_verifications')
      .select('*')
      .order('created_at', { ascending: false })
    setRecords((data as IdentityVerification[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let rows = records.map(r => ({ ...r, _status: effectiveStatus(r) }))
    if (filterStatus !== 'all') rows = rows.filter(r => r._status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.full_name.toLowerCase().includes(q) ||
        r.passport_number.toLowerCase().includes(q) ||
        (r.nationality ?? '').toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      let av = a[sortKey] ?? ''
      let bv = b[sortKey] ?? ''
      if (sortKey === 'status') { av = a._status; bv = b._status }
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [records, search, filterStatus, sortKey, sortDir])

  // Summary counts
  const counts = useMemo(() => {
    const c = { verified: 0, pending: 0, expired: 0, rejected: 0 }
    records.forEach(r => { const s = effectiveStatus(r); c[s] = (c[s] ?? 0) + 1 })
    return c
  }, [records])

  function Th({ label, k }: { label: string; k: SortKey }) {
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
        style={{ color: 'var(--color-text-muted)' }}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortKey === k
            ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
            : <span style={{ opacity: 0.3 }}><ChevronUp size={10} /></span>}
        </span>
      </th>
    )
  }

  const statusFilters: { value: VerificationStatus | 'all'; label: string }[] = [
    { value: 'all',      label: 'Alla' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending',  label: 'Pending' },
    { value: 'expired',  label: 'Expired' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="h-full overflow-auto" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} style={{ color: 'var(--color-brand)' }} />
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Wavult ID
              </h1>
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
              Intern identitetsverifiering · {records.length} poster
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-brand)', color: '#fff' }}
          >
            <Plus size={14} />
            Lägg till
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {([
            { label: 'Verified',  count: counts.verified,  color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
            { label: 'Pending',   count: counts.pending,   color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
            { label: 'Expired',   count: counts.expired,   color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
            { label: 'Rejected',  count: counts.rejected,  color: 'var(--color-neutral)', bg: 'var(--color-neutral-bg)' },
          ] as const).map(item => (
            <div
              key={item.label}
              className="rounded-lg border px-4 py-3 text-center cursor-pointer transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', background: item.bg }}
              onClick={() => setFilter(f => f === item.label.toLowerCase() as VerificationStatus ? 'all' : item.label.toLowerCase() as VerificationStatus)}
            >
              <div className="text-2xl font-bold font-mono" style={{ color: item.color }}>{item.count}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: item.color }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Sök namn, passnummer, nationalitet…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div className="flex gap-1">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="px-3 py-2 text-xs rounded-lg font-medium border transition-colors"
                style={{
                  borderColor: filterStatus === f.value ? 'var(--color-brand)' : 'var(--color-border)',
                  background: filterStatus === f.value ? 'var(--color-brand-bg, #EFF6FF)' : 'var(--color-surface)',
                  color: filterStatus === f.value ? 'var(--color-brand)' : 'var(--color-text-muted)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <User size={32} style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Inga verifieringar hittades</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm min-w-[700px]">
              <thead style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <Th label="Namn"          k="full_name" />
                  <Th label="Status"        k="status" />
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Passnr</th>
                  <Th label="Nationalitet"  k="nationality" />
                  <Th label="Giltig till"   k="passport_expiry" />
                  <Th label="Verifierat"    k="verified_at" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr
                    key={v.id}
                    className="border-t cursor-pointer transition-colors hover:bg-blue-50"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: i % 2 === 1 ? 'var(--color-bg-subtle)' : 'var(--color-surface)',
                    }}
                    onClick={() => setSelected(v)}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'var(--color-brand-bg, #EFF6FF)', color: 'var(--color-brand)' }}
                        >
                          {v.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {v.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={v._status} />
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        {maskPassport(v.passport_number)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {v.nationality ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-xs font-mono"
                        style={{ color: isExpired(v.passport_expiry) ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}
                      >
                        {formatDate(v.passport_expiry)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        {timeAgo(v.verified_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {selected && <IdentityDrawer v={selected} onClose={() => setSelected(null)} />}
      {showAdd && <AddVerificationForm onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  )
}
