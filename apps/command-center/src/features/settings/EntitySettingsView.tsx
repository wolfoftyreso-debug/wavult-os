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
    id: 'wavult-group-dmcc',
    name: 'Wavult Group DMCC',
    shortName: 'WG',
    color: '#1E40AF',
    country: '🇦🇪 Dubai, UAE',
    currency: 'USD',
    jurisdiction: 'DMCC Free Zone',
    taxTable: '0% (UAE FZCO)',
    orgNumber: 'WG-AE-HOLD-001',
    address: 'DMCC Free Zone, Dubai, UAE',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Erik Svensson', role: 'Chairman & Group CEO', email: 'erik@wavult.com', phone: '+46709123223' },
      { name: 'Dennis Bjarnemark', role: 'Chief Legal & Operations', email: 'dennis@wavult.com', phone: '+46761474243' },
    ],
  },
  {
    id: 'financo-fzco',
    name: 'FinanceCo FZCO',
    shortName: 'FCO',
    color: '#16A34A',
    country: '🇦🇪 Dubai, UAE',
    currency: 'USD',
    jurisdiction: 'DMCC Free Zone',
    taxTable: '0% (UAE FZCO)',
    orgNumber: 'WG-AE-FIN-001',
    address: 'DMCC Free Zone, Dubai, UAE',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Winston Bjarnemark', role: 'CFO', email: 'winston@wavult.com', phone: '+46768123548' },
    ],
  },
  {
    id: 'quixzoom-inc',
    name: 'quiXzoom Inc.',
    shortName: 'QZ-US',
    color: '#0284C7',
    country: '🇺🇸 Delaware, USA',
    currency: 'USD',
    jurisdiction: 'Delaware C-Corp',
    taxTable: 'US Federal',
    orgNumber: 'WG-US-DE-PROD-001',
    address: 'Delaware, USA (Stripe Atlas)',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Erik Svensson', role: 'Chairman & Group CEO', email: 'erik@wavult.com', phone: '+46709123223' },
    ],
  },
  {
    id: 'quixzoom-uab',
    name: 'QuiXzoom UAB',
    shortName: 'QZ-EU',
    color: '#10B981',
    country: '🇱🇹 Litauen, EU',
    currency: 'EUR',
    jurisdiction: 'UAB (Lithuania)',
    taxTable: '15% (Lithuania)',
    orgNumber: 'WG-LT-PROD-001',
    address: 'Vilnius, Lithuania (planned)',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Leon Russo De Cerame', role: 'CEO Operations', email: 'leon@wavult.com', phone: '+46738968949' },
    ],
  },
  {
    id: 'landvex-ab',
    name: 'Landvex AB',
    shortName: 'LNDVX',
    color: '#D97706',
    country: '🇸🇪 Sverige',
    currency: 'SEK',
    jurisdiction: 'Aktiebolag (SE)',
    taxTable: '20,6%',
    orgNumber: '559141-7042',
    address: 'Sverige',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Dennis Bjarnemark', role: 'Chief Legal & Operations', email: 'dennis@wavult.com', phone: '+46761474243' },
    ],
  },
  {
    id: 'landvex-inc',
    name: 'Landvex Inc.',
    shortName: 'LVX-US',
    color: '#F59E0B',
    country: '🇺🇸 Texas, USA',
    currency: 'USD',
    jurisdiction: 'Texas LLC',
    taxTable: 'US Federal + Texas',
    orgNumber: 'WG-US-TX-PROD-001',
    address: 'Houston, Texas, USA (forming)',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Dennis Bjarnemark', role: 'Chief Legal & Operations', email: 'dennis@wavult.com', phone: '+46761474243' },
    ],
  },,
  {
    id: 'devops-fzco',
    name: 'DevOps FZCO',
    shortName: 'DVO',
    color: '#7C3AED',
    country: '🇦🇪 Dubai, UAE',
    currency: 'USD',
    jurisdiction: 'DMCC Free Zone',
    taxTable: '0% (UAE FZCO)',
    orgNumber: 'WG-AE-OPS-001',
    address: 'DMCC Free Zone, Dubai, UAE',
    vatNumber: '',
    bankAccount: '',
    invoiceLogoUrl: '',
    contacts: [
      { name: 'Johan Berglund', role: 'Group CTO', email: 'johan@wavult.com', phone: '+46736977576' },
    ],
  }
]

function EntityCard({ entity }: { entity: EntityConfig }) {
  const [showBank, setShowBank] = useState(false)
  const [editing, setEditing] = useState(false)
  const [currency, setCurrency] = useState(entity.currency)
  const [address, setAddress] = useState(entity.address)

  return (
    <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
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
          <div className="text-sm font-bold text-text-primary">{entity.name}</div>
          <div className="text-xs text-gray-9000">{entity.country}{entity.orgNumber ? ` · ${entity.orgNumber}` : ' · Org.nr (ej registrerat)'}</div>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-gray-9000 hover:text-gray-600 transition-colors font-mono"
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
                className="w-full bg-muted/30 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none"
              >
                <option>SEK</option>
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
                <option>AED</option>
              </select>
            ) : (
              <div className="text-sm text-text-primary font-semibold">{currency}</div>
            )}
          </div>

          {/* Jurisdiction */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Jurisdiktion</div>
            <div className="text-sm text-text-primary">{entity.jurisdiction}</div>
          </div>

          {/* Tax table */}
          <div className="space-y-1 col-span-2">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Skattetabell</div>
            <div className="text-sm text-gray-600">{entity.taxTable}</div>
          </div>

          {/* VAT */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Momsregistrering</div>
            <div className="text-xs text-gray-9000 font-mono">{entity.vatNumber || <span className="text-gray-9000 italic">VAT-nummer (ej registrerat)</span>}</div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <div className="text-[9px] text-gray-600 font-mono uppercase">Adress (faktura)</div>
            {editing ? (
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-muted/30 border border-surface-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none"
              />
            ) : (
              <div className="text-xs text-gray-9000">{address || <span className="text-gray-9000 italic">Lägg till adress</span>}</div>
            )}
          </div>

          {/* Bank account */}
          <div className="space-y-1 col-span-2">
            <div className="text-[9px] text-gray-600 font-mono uppercase flex items-center gap-2">
              Bankkontonummer
              <button
                onClick={() => setShowBank(b => !b)}
                className="text-gray-9000 hover:text-gray-9000 transition-colors"
              >
                {showBank ? '🙈 dölj' : '👁 visa'}
              </button>
            </div>
            <div className="text-xs font-mono text-gray-9000">
              {entity.bankAccount
                ? (showBank ? entity.bankAccount.replace(/•/g, '0') : entity.bankAccount)
                : <span className="italic text-gray-9000">Bankkontonummer (ej registrerat)</span>}
            </div>
          </div>
        </div>

        {/* Invoice template preview */}
        <div className="rounded-lg border border-surface-border/50 bg-muted/30 px-3 py-2 text-xs text-gray-9000">
          <div className="font-mono uppercase text-gray-600 mb-1">Fakturamall</div>
          <div>Logotyp: <span className="text-gray-9000">{entity.invoiceLogoUrl || 'ej uppladdad'}</span></div>
          <div>Adress: <span className="text-gray-9000">{address || 'Lägg till adress'}</span></div>
          <div>Org.nr: <span className="text-gray-9000">{entity.orgNumber || 'Org.nr (ej registrerat)'}</span></div>
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
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-gray-100"
              >
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: entity.color + '20', color: entity.color }}
                >
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text-primary">{c.name}</div>
                  <div className="text-xs text-gray-9000">{c.role}</div>
                </div>
                <div className="text-right text-xs text-gray-9000">
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
      <p className="text-xs text-gray-9000">
        Inställningar per bolag — valuta, skatt, fakturamall, bankkonto, kontaktpersoner.
      </p>
      {ENTITIES.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </div>
  )
}
