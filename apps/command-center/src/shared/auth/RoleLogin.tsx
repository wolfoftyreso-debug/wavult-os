import { Crown, DollarSign, Cpu, Scale, User } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { ROLES, RoleProfile, useRole } from './RoleContext'

function getRoleIcon(roleId: string): React.ComponentType<LucideProps> {
  switch (roleId) {
    case 'group-ceo':
    case 'admin':
      return Crown
    case 'cfo':
      return DollarSign
    case 'cto':
      return Cpu
    case 'clo':
      return Scale
    default:
      return User
  }
}

export function RoleLogin() {
  const { setRole } = useRole()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-700 mb-4">
          <span className="text-xl font-bold text-white">W</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Wavult OS</h1>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mt-1">Wavult Ecosystem</p>
        <p className="text-sm text-gray-500 mt-2">Välj din roll för att fortsätta</p>
      </div>

      {/* Role grid */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-md">
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <RoleCard key={r.id} role={r} onSelect={() => setRole(r)} />
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400 font-mono">
        Wavult OS · Intern access
      </p>
    </div>
  )
}

function RoleCard({ role, onSelect }: { role: RoleProfile; onSelect: () => void }) {
  const vacant = role.name.startsWith('—')
  const Icon = getRoleIcon(role.id)

  return (
    <button
      onClick={onSelect}
      disabled={vacant}
      className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:shadow-sm cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 flex-shrink-0"
        style={{ background: role.color + '18', border: `1px solid ${role.color}40` }}
      >
        <Icon className="w-4 h-4" style={{ color: role.color }} />
      </div>

      {/* Role info */}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{role.person}</div>
        <div className="text-xs font-medium mt-0.5 truncate" style={{ color: role.color }}>
          {role.title}
        </div>
        <div className="text-xs text-gray-500 mt-1 truncate">{role.name}</div>
      </div>

      {/* Access scopes */}
      <div className="flex flex-wrap gap-1 mt-3">
        {role.access.slice(0, 2).map((scope) => (
          <span
            key={scope}
            className="text-xs px-1.5 py-0.5 rounded-full font-mono capitalize"
            style={{ background: role.color + '12', color: role.color, border: `1px solid ${role.color}25` }}
          >
            {scope}
          </span>
        ))}
        {role.access.length > 2 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-mono bg-gray-100 text-gray-500">
            +{role.access.length - 2}
          </span>
        )}
      </div>

      {!vacant && (
        <div
          className="mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: role.color }}
        >
          Logga in
        </div>
      )}
    </button>
  )
}
