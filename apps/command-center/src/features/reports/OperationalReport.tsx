import { SYSTEM_METRICS, ZOOMER_COUNT } from './data'

function UptimeBadge({ uptime }: { uptime: number }) {
  const color = uptime >= 99.9 ? '#10B981' : uptime >= 99 ? '#F59E0B' : '#EF4444'
  const label = uptime >= 99.9 ? 'Excellent' : uptime >= 99 ? 'Good' : 'Degraded'
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: color + '20', color }}
    >
      {label}
    </span>
  )
}

function UptimeBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  const color = pct >= 99.9 ? '#10B981' : pct >= 99 ? '#F59E0B' : '#EF4444'
  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden w-24">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

const WEEKLY_DEPLOYS = [3, 5, 2, 6, 4, 7, 5, 4, 6, 8, 5, 6]
const DEPLOY_LABELS  = ['Mar W1','Mar W2','Mar W3','Mar W4','Apr W1','Apr W2','Apr W3','Apr W4','Maj W1','Maj W2','Maj W3','Maj W4']

function DeployChart() {
  const max = Math.max(...WEEKLY_DEPLOYS, 1)
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">Deploys per vecka (alla tjänster)</p>
      <div className="flex items-end gap-1 h-24">
        {WEEKLY_DEPLOYS.map((d, i) => {
          const h = (d / max) * 100
          const isLast4 = i >= WEEKLY_DEPLOYS.length - 4
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${DEPLOY_LABELS[i]}: ${d} deploys`}>
              <span className="text-[8px] text-gray-600 font-mono">{d}</span>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${h}%`,
                  minHeight: '4px',
                  background: isLast4 ? '#6C63FF' : '#6C63FF60',
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex mt-1 gap-1">
        {DEPLOY_LABELS.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[7px] text-gray-700 font-mono leading-tight">{l.split(' ')[1]}</div>
        ))}
      </div>
      <p className="text-[9px] text-gray-600 mt-1 font-mono">Lila = senaste 4 veckorna</p>
    </div>
  )
}

const ERROR_HISTORY = [0.8, 0.5, 0.3, 0.7, 0.4, 0.2, 0.6, 0.3, 0.4, 0.3, 0.2, 0.3]

function ErrorRateChart() {
  const max = Math.max(...ERROR_HISTORY, 0.01)
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
      <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">API-felfrekvens (%) — 12 veckor</p>
      <div className="flex items-end gap-1 h-20">
        {ERROR_HISTORY.map((v, i) => {
          const h = (v / max) * 100
          const color = v >= 1 ? '#EF4444' : v >= 0.5 ? '#F59E0B' : '#10B981'
          return (
            <div key={i} className="flex-1 flex flex-col items-end" title={`Vecka ${i + 1}: ${v}%`}>
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${h}%`, minHeight: '3px', background: color }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /><span className="text-[9px] text-gray-600">{'< 0.5%'}</span></div>
        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><span className="text-[9px] text-gray-600">0.5–1%</span></div>
        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /><span className="text-[9px] text-gray-600">{'> 1%'}</span></div>
        <span className="ml-auto text-xs text-gray-600 font-mono">
          Snitt: {(ERROR_HISTORY.reduce((s, v) => s + v, 0) / ERROR_HISTORY.length).toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

export function OperationalReport() {
  const totalDeploys = SYSTEM_METRICS.reduce((s, m) => s + m.deploysThisWeek, 0)
  const avgUptime    = SYSTEM_METRICS.reduce((s, m) => s + m.uptime, 0) / SYSTEM_METRICS.length
  const avgError     = SYSTEM_METRICS.reduce((s, m) => s + m.apiErrorRate, 0) / SYSTEM_METRICS.length

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">Avg. Uptime</p>
          <p className="text-xl font-black text-green-400">{avgUptime.toFixed(2)}%</p>
          <p className="text-[9px] text-gray-600 mt-0.5">alla tjänster</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">Deploys/vecka</p>
          <p className="text-xl font-black text-[#6C63FF]">{totalDeploys}</p>
          <p className="text-[9px] text-gray-600 mt-0.5">denna vecka</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">Aktiva Zoomers</p>
          <p className="text-xl font-black text-[#00C2FF]">{ZOOMER_COUNT}</p>
          <p className="text-[9px] text-gray-600 mt-0.5">fotografer</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-mono uppercase mb-1">API-felfrekvens</p>
          <p className="text-xl font-black" style={{ color: avgError > 0.5 ? '#F59E0B' : '#10B981' }}>
            {avgError.toFixed(2)}%
          </p>
          <p className="text-[9px] text-gray-600 mt-0.5">snitt alla tjänster</p>
        </div>
      </div>

      {/* Service table */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Tjänster — systemstatus</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Tjänst','Uptime','Status','Deploys/v','API-fel','Resp. tid'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-gray-600 font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SYSTEM_METRICS.map((m, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{m.service}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UptimeBar value={m.uptime} />
                      <span className="font-mono text-gray-300">{m.uptime}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><UptimeBadge uptime={m.uptime} /></td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{m.deploysThisWeek}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: m.apiErrorRate >= 1 ? '#EF4444' : m.apiErrorRate >= 0.5 ? '#F59E0B' : '#10B981' }}>
                    {m.apiErrorRate}%
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{m.avgResponseMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DeployChart />
        <ErrorRateChart />
      </div>

      {/* Zoomer breakdown */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">QuixZoom — Photographer Network</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Aktiva', value: ZOOMER_COUNT, color: '#10B981' },
            { label: 'Sverige', value: 62, color: '#6C63FF' },
            { label: 'Danmark', value: 18, color: '#00C2FF' },
            { label: 'Norge', value: 24, color: '#FF6B35' },
            { label: 'Finland', value: 13, color: '#FF4081' },
            { label: 'Övriga', value: 10, color: '#6B7280' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
              <p className="text-[9px] text-gray-600 font-mono mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
