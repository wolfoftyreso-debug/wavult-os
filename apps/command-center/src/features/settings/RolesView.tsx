import { useState } from 'react'

interface Module {
  id: string
  label: string
  icon: string
}

interface RoleDef {
  id: string
  title: string
  person: string
  color: string
  emoji: string
  description: string
  modules: string[]
}

const ALL_MODULES: Module[] = [
  { id: 'dashboard',      label: 'Dashboard',         icon: '⬛' },
  { id: 'crm',            label: 'CRM',               icon: '🎯' },
  { id: 'finance',        label: 'Finance',           icon: '💰' },
  { id: 'payroll',        label: 'Lön & Personal',    icon: '👥' },
  { id: 'transactions',   label: 'Transaktioner',     icon: '↕' },
  { id: 'incidents',      label: 'Alerts',   icon: '🚨' },
  { id: 'legal',          label: 'Legal Hub',         icon: '⚖️' },
  { id: 'entities',       label: 'Entities',          icon: '🏢' },
  { id: 'org',            label: 'Corporate Graph',   icon: '🏗' },
  { id: 'projects',       label: 'Projekt & KPI',     icon: '🚀' },
  { id: 'tasks',          label: 'Task Board',        icon: '📋' },
  { id: 'people',         label: 'Team',              icon: '👤' },
  { id: 'markets',        label: 'Market Deployment', icon: '🌍' },
  { id: 'campaigns',      label: 'Campaign OS',       icon: '⚡' },
  { id: 'submissions',    label: 'Submissions',       icon: '📥' },
  { id: 'settings',       label: 'Inställningar',     icon: '⚙️' },
  { id: 'company-launch', label: 'Company Launch',    icon: '🏢' },
]

const ROLES: RoleDef[] = [
  {
    id: 'admin',
    title: 'Admin',
    person: 'Erik',
    color: '#8B5CF6',
    emoji: '🔐',
    description: 'Full systemtillgång — alla moduler, alla bolag, alla behörigheter.',
    modules: ALL_MODULES.map(m => m.id),
  },
  {
    id: 'ceo-ops',
    title: 'CEO Operations',
    person: 'Leon',
    color: '#3B82F6',
    emoji: '🎯',
    description: 'Operativ ledning — CRM, kommunikation, dashboard, marknad.',
    modules: ['dashboard', 'crm', 'campaigns', 'markets', 'people', 'tasks', 'projects', 'incidents'],
  },
  {
    id: 'cfo',
    title: 'CFO',
    person: 'Winston',
    color: '#10B981',
    emoji: '💰',
    description: 'Ekonomi & lön — finance, transaktioner, lönekörning.',
    modules: ['dashboard', 'finance', 'payroll', 'transactions', 'entities'],
  },
  {
    id: 'clo',
    title: 'Legal',
    person: 'Dennis',
    color: '#F59E0B',
    emoji: '⚖️',
    description: 'Juridik & bolagsstyrning — legal hub, corporate, avtal.',
    modules: ['dashboard', 'legal', 'entities', 'company-launch', 'submissions'],
  },
  {
    id: 'cto',
    title: 'CTO',
    person: 'Johan',
    color: '#EF4444',
    emoji: '⚙️',
    description: 'Teknisk ledning — system settings, deployments, infrastruktur.',
    modules: ['dashboard', 'settings', 'incidents', 'projects', 'tasks', 'entities', 'org'],
  },
]

export function RolesView() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [editedModules, setEditedModules] = useState<Record<string, string[]>>({})
  const [saved, setSaved] = useState<string | null>(null)

  const role = ROLES.find(r => r.id === selectedRole)

  function getModules(roleId: string): string[] {
    return editedModules[roleId] ?? ROLES.find(r => r.id === roleId)?.modules ?? []
  }

  function toggleModule(roleId: string, moduleId: string) {
    const current = getModules(roleId)
    const updated = current.includes(moduleId)
      ? current.filter(m => m !== moduleId)
      : [...current, moduleId]
    setEditedModules(prev => ({ ...prev, [roleId]: updated }))
  }

  function handleSave(roleId: string) {
    setSaved(roleId)
    setTimeout(() => setSaved(null), 2000)
  }

  if (selectedRole && role) {
    const modules = getModules(selectedRole)
    return (
      <div className="space-y-4">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedRole(null)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            ← Tillbaka
          </button>
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: role.color + '20', color: role.color }}
          >
            {role.emoji}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{role.person} — {role.title}</h2>
            <p className="text-xs text-gray-600">{role.description}</p>
          </div>
        </div>

        {/* Module toggles */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0A0C14] divide-y divide-white/[0.04] overflow-hidden">
          {ALL_MODULES.map(mod => {
            const enabled = modules.includes(mod.id)
            const isAdminLocked = selectedRole === 'admin'
            return (
              <div key={mod.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-base leading-none w-6 text-center flex-shrink-0">{mod.icon}</span>
                <span className="flex-1 text-sm text-gray-300">{mod.label}</span>
                <button
                  onClick={() => !isAdminLocked && toggleModule(selectedRole, mod.id)}
                  disabled={isAdminLocked}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                    isAdminLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  style={{ background: enabled ? role.color : '#374151' }}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span
                  className="text-xs font-mono w-12 text-right flex-shrink-0"
                  style={{ color: enabled ? role.color : '#6B7280' }}
                >
                  {enabled ? 'PÅ' : 'AV'}
                </span>
              </div>
            )
          })}
        </div>

        {selectedRole !== 'admin' && (
          <div className="flex justify-end">
            <button
              onClick={() => handleSave(selectedRole)}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: saved === selectedRole ? '#10B98120' : role.color + '20',
                border: `1px solid ${saved === selectedRole ? '#10B98140' : role.color + '40'}`,
                color: saved === selectedRole ? '#10B981' : role.color,
              }}
            >
              {saved === selectedRole ? '✅ Sparad' : 'Spara behörigheter'}
            </button>
          </div>
        )}

        {selectedRole === 'admin' && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-xs text-gray-500">
            🔐 Admin har alltid full tillgång och kan inte begränsas.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">Klicka på en roll för att redigera modultillgång.</p>

      {ROLES.map(r => {
        const modules = getModules(r.id)
        const activeModules = ALL_MODULES.filter(m => modules.includes(m.id))

        return (
          <button
            key={r.id}
            onClick={() => setSelectedRole(r.id)}
            className="w-full text-left rounded-xl border border-white/[0.06] bg-[#0A0C14] px-5 py-4 hover:border-white/[0.12] transition-all group"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: r.color + '20', color: r.color }}
              >
                {r.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{r.person}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ background: r.color + '15', color: r.color }}
                  >
                    {r.title}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 truncate">{r.description}</p>
              </div>

              {/* Module count */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold" style={{ color: r.color }}>{activeModules.length}</div>
                <div className="text-[9px] text-gray-700 font-mono">moduler</div>
              </div>

              <span className="text-gray-700 group-hover:text-gray-400 transition-colors text-sm flex-shrink-0">›</span>
            </div>

            {/* Module pills */}
            <div className="flex gap-1.5 flex-wrap mt-3 ml-13">
              {activeModules.slice(0, 8).map(mod => (
                <span
                  key={mod.id}
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: r.color + '10', color: r.color + 'aa' }}
                >
                  {mod.icon} {mod.label}
                </span>
              ))}
              {activeModules.length > 8 && (
                <span className="text-[9px] text-gray-700 font-mono px-1.5 py-0.5">
                  +{activeModules.length - 8} till
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
