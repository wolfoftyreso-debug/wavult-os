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
    taxTable: 'Ej konfigurerat',
    orgNumber: '',
    address: '',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Erik Svensson', role: 'Chairman / Group CEO', email: 'erik@wavult.com', phone: '+46709123223' },
      { name: 'Winston Bjarnemark', role: 'CFO', email: 'winston@wavult.com', phone: '0768123548' },
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
    taxTable: 'Ej konfigurerat',
    orgNumber: '',
    address: '',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Leon Russo De Cerame', role: 'CEO Operations', email: 'leon@wavult.com', phone: '+46738968949' },
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
    taxTable: 'Ej konfigurerat',
    orgNumber: '',
    address: '',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Johan Berglund', role: 'CTO', email: 'johan@wavult.com', phone: '+46736977576' },
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
    taxTable: 'Ej konfigurerat',
    orgNumber: '',
    address: '',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Dennis Bjarnemark', role: 'CLO', email: 'dennis@wavult.com', phone: '0761474243' },
    ],
  },
]

function EntityCard({ entity }: { entity: EntityConfig }) {
  const [showBank, setShowBank] = useState(false)
  const [editing, setEditing] = useState(false)
  const [currency, setCurrency] = useState(entity.currency)
  const [address, setAddress] = useState(entity.address)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
        style={{ background: entity.color + '08' }}
      >
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: entity.color + '20', color: entity.color }}
        >
          {entity.shortName}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">{entity.name}</div>
          <div className="text-xs text-gray-500">{entity.country}{entity.orgNumber ? ` · ${entity.orgNumber}` : ' · Org.nr (ej registrerat)'}</div>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-gray-500 hover:text-gray-600 transition-colors font-mono"
        >
          {editing ? '✕ stäng' : '✎ redigera'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Fields grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Currency */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Primärvaluta</div>
            {editing ? (
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-white/[0.04] border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 focus:outline-none"
              >
                <option>SEK</option>
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>AED</option>
              </select>
            ) : (
              <div className="text-sm text-gray-900 font-semibold">{currency}</div>
            )}
          </div>

          {/* Jurisdiction */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Jurisdiktion</div>
            <div className="text-sm text-gray-900">{entity.jurisdiction}</div>
          </div>

          {/* Tax table */}
          <div className="space-y-1 col-span-2">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Skattetabell</div>
            <div className="text-sm text-gray-600">{entity.taxTable}</div>
          </div>

          {/* VAT */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Momsregistrering</div>
            <div className="text-xs text-gray-500 font-mono">{entity.vatNumber || <span className="text-gray-500 italic">VAT-nummer (ej registrerat)</span>}</div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Adress (faktura)</div>
            {editing ? (
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-white/[0.04] border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 focus:outline-none"
              />
            ) : (
              <div className="text-xs text-gray-500">{address || <span className="text-gray-500 italic">Lägg till adress</span>}</div>
            )}
          </div>

          {/* Bank account */}
          <div className="space-y-1 col-span-2">
            <div className="text-[9px] text-gray-600 font-mono uppercase flex items-center gap-2">
              Bankkontonummer
              <button
                onClick={() => setShowBank(b => !b)}
                className="text-gray-500 hover:text-gray-500 transition-colors"
              >
                {showBank ? '🙈 dölj' : '👁 visa'}
              </button>
            </div>
            <div className="text-xs font-mono text-gray-500">
              {entity.bankAccount
                ? (showBank ? entity.bankAccount.replace(/•/g, '0') : entity.bankAccount)
                : <span className="italic text-gray-500">Bankkontonummer (ej registrerat)</span>}
            </div>
          </div>
        </div>

        {/* Invoice template preview */}
        <div className="rounded-lg border border-gray-100 bg-white/[0.02] px-3 py-2 text-xs text-gray-500">
          <div className="font-mono uppercase text-gray-600 mb-1">Fakturamall</div>
          <div>Logotyp: <span className="text-gray-500">{entity.invoiceLogoUrl || 'ej uppladdad'}</span></div>
          <div>Adress: <span className="text-gray-500">{address || 'Lägg till adress'}</span></div>
          <div>Org.nr: <span className="text-gray-500">{entity.orgNumber || 'Org.nr (ej registrerat)'}</span></div>
          {editing && (
            <button className="mt-2 text-xs text-blue-700 hover:text-blue-300 transition-colors">
              + Ladda upp logotyp
            </button>
          )}
        </div>

        {/* Contacts */}
        <div>
          <div className="text-[9px] text-gray-600 font-mono uppercase mb-2">Kontaktpersoner</div>
          <div className="space-y-2">
            {entity.contacts.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-gray-100"
              >
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: entity.color + '20', color: entity.color }}
                >
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.role}</div>
                </div>
                <div className="text-right text-xs text-gray-500">
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
      <p className="text-xs text-gray-500">
        Inställningar per bolag — valuta, skatt, fakturamall, bankkonto, kontaktpersoner.
      </p>
      {ENTITIES.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </div>
  )
}
