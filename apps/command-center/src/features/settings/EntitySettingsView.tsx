import { useState } from 'react'

interface ContactPerson {
  name: string
  role: string
  email: string
  phone: string
}

interface EntityConfig {
  id: string
  name: string
  shortName: string
  color: string
  country: string
  currency: string
  jurisdiction: string
  taxTable: string
  orgNumber: string
  address: string
  vatNumber: string
  bankAccount: string
  invoiceLogoUrl: string
  contacts: ContactPerson[]
}

const ENTITIES: EntityConfig[] = [
  {
    id: 'wavult-group',
    name: 'Wavult Group AB',
    shortName: 'WG',
    color: '#8B5CF6',
    country: '🇸🇪 Sverige',
    currency: 'SEK',
    jurisdiction: 'Sverige',
    taxTable: '30 — Stockholms Tingsrätt',
    orgNumber: '559XXX-XXXX',
    address: 'Storgatan 1, 111 51 Stockholm',
    vatNumber: 'SE559XXXXXXXX01',
    bankAccount: '••••••7849',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Erik Svensson', role: 'Chairman / Group CEO', email: 'erik@hypbit.com', phone: '+46709123223' },
      { name: 'Winston Bjarnemark', role: 'CFO', email: 'winston@hypbit.com', phone: '0768123548' },
    ],
  },
  {
    id: 'wavult-ops',
    name: 'Wavult Operations AB',
    shortName: 'WO',
    color: '#3B82F6',
    country: '🇸🇪 Sverige',
    currency: 'SEK',
    jurisdiction: 'Sverige',
    taxTable: '30 — Bolagsverket',
    orgNumber: '559XXX-YYYY',
    address: 'Storgatan 1, 111 51 Stockholm',
    vatNumber: 'SE559XXXXXXXX02',
    bankAccount: '••••••3312',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Leon Russo De Cerame', role: 'CEO Operations', email: 'leon@hypbit.com', phone: '+46738968949' },
    ],
  },
  {
    id: 'wavult-tech',
    name: 'Wavult Tech LLC',
    shortName: 'WT',
    color: '#EF4444',
    country: '🇺🇸 Texas, USA',
    currency: 'USD',
    jurisdiction: 'Texas',
    taxTable: 'US Federal + Texas State',
    orgNumber: 'EIN XX-XXXXXXX',
    address: '123 Tech Blvd, Austin TX 78701',
    vatNumber: 'N/A (USA)',
    bankAccount: '••••••8801',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Johan Berglund', role: 'CTO', email: 'johan@hypbit.com', phone: '+46736977576' },
    ],
  },
  {
    id: 'wavult-legal',
    name: 'Wavult Legal UAB',
    shortName: 'WL',
    color: '#F59E0B',
    country: '🇱🇹 Litauen',
    currency: 'EUR',
    jurisdiction: 'Vilnius, Litauen',
    taxTable: 'LT-Standard 15%',
    orgNumber: '3XXXXXXX',
    address: 'Gedimino pr. 1, Vilnius',
    vatNumber: 'LT3XXXXXXXX',
    bankAccount: '••••••5560',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Dennis Bjarnemark', role: 'CLO', email: 'dennis@hypbit.com', phone: '0761474243' },
    ],
  },
]

function EntityCard({ entity }: { entity: EntityConfig }) {
  const [showBank, setShowBank] = useState(false)
  const [editing, setEditing] = useState(false)
  const [currency, setCurrency] = useState(entity.currency)
  const [address, setAddress] = useState(entity.address)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0A0C14] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]"
        style={{ background: entity.color + '08' }}
      >
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: entity.color + '20', color: entity.color }}
        >
          {entity.shortName}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">{entity.name}</div>
          <div className="text-xs text-gray-600">{entity.country} · {entity.orgNumber}</div>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-gray-600 hover:text-gray-300 transition-colors font-mono"
        >
          {editing ? '✕ stäng' : '✎ redigera'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Fields grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Currency */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-700 font-mono uppercase">Primärvaluta</div>
            {editing ? (
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              >
                <option>SEK</option>
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>AED</option>
              </select>
            ) : (
              <div className="text-sm text-white font-semibold">{currency}</div>
            )}
          </div>

          {/* Jurisdiction */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-700 font-mono uppercase">Jurisdiktion</div>
            <div className="text-sm text-white">{entity.jurisdiction}</div>
          </div>

          {/* Tax table */}
          <div className="space-y-1 col-span-2">
            <div className="text-[9px] text-gray-700 font-mono uppercase">Skattetabell</div>
            <div className="text-sm text-gray-300">{entity.taxTable}</div>
          </div>

          {/* VAT */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-700 font-mono uppercase">Momsregistrering</div>
            <div className="text-xs text-gray-400 font-mono">{entity.vatNumber}</div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-700 font-mono uppercase">Adress (faktura)</div>
            {editing ? (
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              />
            ) : (
              <div className="text-xs text-gray-400">{address}</div>
            )}
          </div>

          {/* Bank account */}
          <div className="space-y-1 col-span-2">
            <div className="text-[9px] text-gray-700 font-mono uppercase flex items-center gap-2">
              Bankkontonummer
              <button
                onClick={() => setShowBank(b => !b)}
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                {showBank ? '🙈 dölj' : '👁 visa'}
              </button>
            </div>
            <div className="text-xs font-mono text-gray-400">
              {showBank ? entity.bankAccount.replace(/•/g, '0') + ' (demo)' : entity.bankAccount}
            </div>
          </div>
        </div>

        {/* Invoice template preview */}
        <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-xs text-gray-600">
          <div className="font-mono uppercase text-gray-700 mb-1">Fakturamall</div>
          <div>Logotyp: <span className="text-gray-500">{entity.invoiceLogoUrl || 'ej uppladdad'}</span></div>
          <div>Adress: <span className="text-gray-500">{address}</span></div>
          <div>Org.nr: <span className="text-gray-500">{entity.orgNumber}</span></div>
          {editing && (
            <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              + Ladda upp logotyp
            </button>
          )}
        </div>

        {/* Contacts */}
        <div>
          <div className="text-[9px] text-gray-700 font-mono uppercase mb-2">Kontaktpersoner</div>
          <div className="space-y-2">
            {entity.contacts.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: entity.color + '20', color: entity.color }}
                >
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">{c.name}</div>
                  <div className="text-xs text-gray-600">{c.role}</div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <div>{c.email}</div>
                  <div>{c.phone}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {editing && (
          <div className="flex justify-end">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: entity.color + '20',
                border: `1px solid ${entity.color}40`,
                color: entity.color,
              }}
            >
              ✅ Spara ändringar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function EntitySettingsView() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-600">
        Inställningar per bolag — valuta, skatt, fakturamall, bankkonto, kontaktpersoner.
      </p>
      {ENTITIES.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </div>
  )
}
