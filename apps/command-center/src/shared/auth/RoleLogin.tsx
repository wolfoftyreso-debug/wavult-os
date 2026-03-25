import { ROLES, RoleProfile, useRole } from './RoleContext'

export function RoleLogin() {
  const { setRole } = useRole()

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="text-xs font-mono text-gray-600 mb-2 tracking-widest uppercase">Wavult Ecosystem</div>
        <h1 className="text-3xl font-bold text-white mb-1">Hypbit OS</h1>
        <p className="text-sm text-gray-500">Välj din roll för att logga in</p>
      </div>

      {/* Role grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl w-full">
        {ROLES.map((r) => (
          <RoleCard key={r.id} role={r} onSelect={() => setRole(r)} />
        ))}
      </div>

      <p className="mt-10 text-xs text-gray-700">
        Wavult Ecosystem · v1.0 · Intern access
      </p>
    </div>
  )
}

function RoleCard({ role, onSelect }: { role: RoleProfile; onSelect: () => void }) {
  const vacant = role.name.startsWith('—')

  return (
    <button
      onClick={onSelect}
      disabled={vacant}
      className="text-left bg-surface-raised border border-surface-border rounded-2xl p-5 hover:border-opacity-80 hover:bg-surface-overlay transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: role.color + '30' }}
    >
      {/* Avatar + status */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: role.color + '18', border: `1px solid ${role.color}40` }}
        >
          {role.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{role.person}</div>
          <div className="text-xs mt-0.5 font-medium" style={{ color: role.color }}>
            {role.title}
          </div>
        </div>
      </div>

      {/* Full name */}
      <div className="text-xs text-gray-500 mb-4 truncate">{role.name}</div>

      {/* Access scopes */}
      <div className="flex flex-wrap gap-1.5">
        {role.access.slice(0, 3).map((scope) => (
          <span
            key={scope}
            className="text-xs px-2 py-0.5 rounded-full capitalize"
            style={{ background: role.color + '15', color: role.color, border: `1px solid ${role.color}25` }}
          >
            {scope}
          </span>
        ))}
        {role.access.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-gray-500">
            +{role.access.length - 3}
          </span>
        )}
      </div>

      {/* CTA */}
      {!vacant && (
        <div
          className="mt-4 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: role.color }}
        >
          Logga in →
        </div>
      )}
    </button>
  )
}
