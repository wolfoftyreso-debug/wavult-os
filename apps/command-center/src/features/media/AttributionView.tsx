
const COLUMNS = ['Timestamp', 'Kampanj', 'Touchpoint', 'Event Type', 'Värde', 'Session ID']

export function AttributionView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-text-primary font-semibold">Attribution</h2>
        <p className="text-xs text-gray-9000 mt-0.5">Konverteringsspårning och touchpoint-analys</p>
      </div>

      <div className="rounded-lg bg-yellow-950/40 border border-yellow-500/20 px-4 py-3">
        <p className="text-sm text-yellow-300 font-medium mb-1">Attribution aktiveras när kanaler är kopplade (Fas 2)</p>
        <p className="text-xs text-yellow-700/70">
          Attribution tracking kräver aktiva kanal-integrationer. Koppla minst en kanal för att börja spåra
          impressioner, klick och konverteringar.
        </p>
      </div>

      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              {COLUMNS.map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-9000 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-12 text-center">
                <div className="text-gray-9000 text-sm">Inga attribution-events ännu</div>
                <div className="text-gray-600 text-xs mt-1">Data visas här när kanaler är aktiva och spårning är konfigurerad</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Impressioner', value: '0' },
          { label: 'Klick', value: '0' },
          { label: 'Konverteringar', value: '0' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-surface-border rounded-xl p-4 text-center">
            <div className="text-2xl font-mono text-gray-600">{stat.value}</div>
            <div className="text-xs text-gray-9000 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
