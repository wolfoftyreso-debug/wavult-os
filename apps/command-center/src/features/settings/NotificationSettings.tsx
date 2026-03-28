import { useState } from 'react'

type Channel = 'email' | 'sms' | 'intern'

interface NotificationRule {
  id: string
  label: string
  description: string
  icon: string
  category: 'finance' | 'crm' | 'payroll' | 'devops' | 'incident'
  channels: Record<Channel, boolean>
  threshold?: string
}

const INITIAL_RULES: NotificationRule[] = [
  {
    id: 'payment-in',
    label: 'Ny inbetalning',
    description: 'Trigger när inbetalning överstiger tröskelvärde',
    icon: '💰',
    category: 'finance',
    threshold: '10 000 kr',
    channels: { email: true, sms: false, intern: true },
  },
  {
    id: 'deal-won',
    label: 'Deal vunnen i CRM',
    description: 'När en deal flyttas till "Stängd — vunnen"',
    icon: '🎯',
    category: 'crm',
    channels: { email: true, sms: true, intern: true },
  },
  {
    id: 'payroll-reminder',
    label: 'Lönekörning påminnelse',
    description: '5 dagar innan nästa löneperiod',
    icon: '👥',
    category: 'payroll',
    channels: { email: true, sms: false, intern: true },
  },
  {
    id: 'deploy-failed',
    label: 'Deploy misslyckad',
    description: 'GitHub Actions pipeline returnerar fel',
    icon: '🚨',
    category: 'devops',
    channels: { email: true, sms: true, intern: true },
  },
  {
    id: 'incident-critical',
    label: 'Incident kritisk',
    description: 'Severity=critical skapas i Alerts',
    icon: '🔴',
    category: 'incident',
    channels: { email: true, sms: true, intern: true },
  },
  {
    id: 'invoice-overdue',
    label: 'Faktura förfallen',
    description: 'Faktura inte betald efter förfallodatum + 3 dagar',
    icon: '🧾',
    category: 'finance',
    channels: { email: true, sms: false, intern: true },
  },
  {
    id: 'legal-pending',
    label: 'Juridiskt dokument väntar',
    description: 'Nytt dokument i status "proposed" i Legal Hub',
    icon: '⚖️',
    category: 'incident',
    channels: { email: true, sms: false, intern: true },
  },
]

const CATEGORY_CONFIG = {
  finance:  { label: 'Finans',    color: '#10B981', bg: '#10B98115' },
  crm:      { label: 'CRM',       color: '#3B82F6', bg: '#3B82F615' },
  payroll:  { label: 'Lön',       color: '#8B5CF6', bg: '#8B5CF615' },
  devops:   { label: 'DevOps',    color: '#EF4444', bg: '#EF444415' },
  incident: { label: 'Incident',  color: '#F59E0B', bg: '#F59E0B15' },
}

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: string }> = {
  email:  { label: 'E-post', icon: '📧' },
  sms:    { label: 'SMS',    icon: '📱' },
  intern: { label: 'Intern', icon: '🔔' },
}

export function NotificationSettings() {
  const [rules, setRules] = useState<NotificationRule[]>(INITIAL_RULES)
  const [saved, setSaved] = useState(false)
  const [thresholds, setThresholds] = useState<Record<string, string>>({})

  function toggleChannel(ruleId: string, channel: Channel) {
    setRules(prev =>
      prev.map(r =>
        r.id === ruleId
          ? { ...r, channels: { ...r.channels, [channel]: !r.channels[channel] } }
          : r
      )
    )
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          Välj vilka händelser som ska trigga notifikationer och via vilken kanal.
        </p>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: saved ? '#10B98120' : '#ffffff08',
            border: `1px solid ${saved ? '#10B98140' : '#ffffff10'}`,
            color: saved ? '#10B981' : '#9CA3AF',
          }}
        >
          {saved ? '✅ Sparad' : 'Spara inställningar'}
        </button>
      </div>

      {/* Channel header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0A0C14] overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-white/[0.04] bg-white/[0.02]">
          <div className="flex-1 text-[9px] text-gray-700 font-mono uppercase">Händelse</div>
          {(Object.entries(CHANNEL_CONFIG) as [Channel, typeof CHANNEL_CONFIG[Channel]][]).map(([key, cfg]) => (
            <div key={key} className="w-20 text-center text-[9px] text-gray-700 font-mono uppercase flex-shrink-0">
              {cfg.icon} {cfg.label}
            </div>
          ))}
        </div>

        {/* Rules */}
        {rules.map((rule, idx) => {
          const catCfg = CATEGORY_CONFIG[rule.category]
          return (
            <div
              key={rule.id}
              className={`flex items-center gap-2 px-5 py-3 ${
                idx < rules.length - 1 ? 'border-b border-white/[0.04]' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{rule.icon}</span>
                  <span className="text-xs font-semibold text-white">{rule.label}</span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                    style={{ background: catCfg.bg, color: catCfg.color }}
                  >
                    {catCfg.label}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5 ml-6">{rule.description}</div>
                {rule.threshold !== undefined && (
                  <div className="flex items-center gap-1.5 mt-1 ml-6">
                    <span className="text-xs text-gray-700">Tröskel:</span>
                    <input
                      value={thresholds[rule.id] ?? rule.threshold}
                      onChange={e =>
                        setThresholds(prev => ({ ...prev, [rule.id]: e.target.value }))
                      }
                      className="text-xs font-mono text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded px-2 py-0.5 w-24 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Channel toggles */}
              {(['email', 'sms', 'intern'] as Channel[]).map(channel => {
                const on = rule.channels[channel]
                return (
                  <div key={channel} className="w-20 flex justify-center flex-shrink-0">
                    <button
                      onClick={() => toggleChannel(rule.id, channel)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
                      style={{ background: on ? '#8B5CF6' : '#374151' }}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          on ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {(Object.entries(CHANNEL_CONFIG) as [Channel, typeof CHANNEL_CONFIG[Channel]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{cfg.icon}</span>
            <span className="font-mono">{cfg.label}</span>
            <span>— notifierar via {key === 'email' ? 'e-post' : key === 'sms' ? 'SMS (46elks)' : 'app-notis'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
