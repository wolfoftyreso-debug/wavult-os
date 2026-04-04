// ─── UAPIX Admin Panel ────────────────────────────────────────────────────────
// Route: /uapix-admin

import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'https://api.wavult.com'

interface Stats {
  total_customers: string
  pro_customers: string
  enterprise_customers: string
  active_keys: string
  calls_24h: string
  calls_30d: string
  cost_30d: string
}

interface Customer {
  id: string
  email: string
  name: string | null
  plan: string
  status: string
  calls_this_month: number
  calls_limit: number
  created_at: string
  active_keys: string
  total_cost_30d: string
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  pro: 'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-violet-100 text-violet-700',
}

function StatCard({ label, value, sub, color = '#1E1B4B' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function reltime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export default function UapixAdminView() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c] = await Promise.all([
          fetch(`${API}/v1/uapix/admin/stats`).then(r => r.json()),
          fetch(`${API}/v1/uapix/admin/customers`).then(r => r.json()),
        ])
        setStats(s)
        setCustomers(Array.isArray(c) ? c : [])
      } catch (e) {
        console.error('[UapixAdmin]', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const filtered = customers.filter((c) => {
    const matchSearch = !search ||
      c.email.includes(search.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(search.toLowerCase())
    const matchPlan = planFilter === 'all' || c.plan === planFilter
    return matchSearch && matchPlan
  })

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1E1B4B] mb-1 flex items-center gap-3">
          <span className="text-2xl">🐝</span> UAPIX Admin
        </h1>
        <p className="text-sm text-slate-500">Customer overview, API usage, revenue.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total customers" value={Number(stats.total_customers).toLocaleString()} color="#1E1B4B" />
          <StatCard label="Pro customers" value={Number(stats.pro_customers).toLocaleString()} color="#4F46E5" />
          <StatCard label="Enterprise" value={Number(stats.enterprise_customers).toLocaleString()} color="#7C3AED" />
          <StatCard label="Active keys" value={Number(stats.active_keys).toLocaleString()} color="#0891B2" />
          <StatCard label="Calls (24h)" value={Number(stats.calls_24h).toLocaleString()} color="#059669" />
          <StatCard label="Calls (30d)" value={Number(stats.calls_30d).toLocaleString()} color="#0284C7" />
          <StatCard
            label="Revenue (30d)"
            value={`$${Number(stats.cost_30d).toFixed(2)}`}
            sub="Provider costs (not MRR)"
            color="#D97706"
          />
        </div>
      ) : null}

      {/* Customer table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center">
          <h2 className="font-semibold text-[#1E1B4B]">Customers</h2>
          <div className="flex-1" />
          <input
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-indigo-400"
            placeholder="Search email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="all">All plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No customers yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Calls (month)</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Keys</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Cost (30d)</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E1B4B]">{c.email}</div>
                      {c.name && <div className="text-xs text-slate-400">{c.name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${PLAN_BADGE[c.plan] || 'bg-slate-100 text-slate-600'}`}>
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{c.calls_this_month.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">of {c.calls_limit.toLocaleString()}</div>
                      <div className="mt-1 h-1 bg-slate-100 rounded-full w-20 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, (c.calls_this_month / c.calls_limit) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.active_keys}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">${Number(c.total_cost_30d).toFixed(4)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{reltime(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
          {filtered.length} of {customers.length} customers
        </div>
      </div>
    </div>
  )
}
