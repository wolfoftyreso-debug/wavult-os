// ─── Supported Banks ──────────────────────────────────────────────────────────
// Banks available via Tink Open Banking (PSD2) integration

export interface BankConfig {
  id: string;
  name: string;
  country: string;
  provider: 'tink' | 'direct';
  color?: string;
  logoUrl?: string;
  tinkProviderId?: string; // Tink's internal provider identifier
}

export const SUPPORTED_BANKS: BankConfig[] = [
  // ── Sverige ────────────────────────────────────────────────────────────────
  { id: 'se-seb', name: 'SEB', country: 'SE', provider: 'tink', color: '#006F44', tinkProviderId: 'se-seb-ob' },
  { id: 'se-handelsbanken', name: 'Handelsbanken', country: 'SE', provider: 'tink', color: '#003B6F', tinkProviderId: 'se-handelsbanken-ob' },
  { id: 'se-nordea', name: 'Nordea', country: 'SE', provider: 'tink', color: '#00005E', tinkProviderId: 'se-nordea-ob' },
  { id: 'se-swedbank', name: 'Swedbank', country: 'SE', provider: 'tink', color: '#FF6600', tinkProviderId: 'se-swedbank-ob' },
  { id: 'se-lansforsakringar', name: 'Länsförsäkringar Bank', country: 'SE', provider: 'tink', color: '#005AA0', tinkProviderId: 'se-lf-ob' },
  { id: 'se-ica', name: 'ICA Banken', country: 'SE', provider: 'tink', color: '#D32926', tinkProviderId: 'se-icabanken-ob' },
  { id: 'se-klarna', name: 'Klarna', country: 'SE', provider: 'tink', color: '#FFB3C7', tinkProviderId: 'se-klarna-ob' },
  { id: 'se-revolut', name: 'Revolut', country: 'SE', provider: 'tink', color: '#0075EB', tinkProviderId: 'se-revolut-ob' },
  { id: 'se-danske', name: 'Danske Bank', country: 'SE', provider: 'tink', color: '#003755', tinkProviderId: 'se-danskebank-ob' },
  { id: 'se-sparbanken', name: 'Sparbanken Skåne', country: 'SE', provider: 'tink', color: '#1B5E97', tinkProviderId: 'se-sparbanken-skane-ob' },
  { id: 'se-forex', name: 'Forex Bank', country: 'SE', provider: 'tink', color: '#004B8D' },
  { id: 'se-marginalen', name: 'Marginalen Bank', country: 'SE', provider: 'tink', color: '#E4003A' },

  // ── Norge ──────────────────────────────────────────────────────────────────
  { id: 'no-dnb', name: 'DNB', country: 'NO', provider: 'tink', color: '#007272', tinkProviderId: 'no-dnb-ob' },
  { id: 'no-sparebank', name: 'SpareBank 1', country: 'NO', provider: 'tink', color: '#E7121B', tinkProviderId: 'no-sparebank1-ob' },
  { id: 'no-nordea', name: 'Nordea Norge', country: 'NO', provider: 'tink', color: '#00005E' },
  { id: 'no-handelsbanken', name: 'Handelsbanken Norge', country: 'NO', provider: 'tink', color: '#003B6F' },

  // ── Danmark ────────────────────────────────────────────────────────────────
  { id: 'dk-danske', name: 'Danske Bank DK', country: 'DK', provider: 'tink', color: '#003755', tinkProviderId: 'dk-danskebank-ob' },
  { id: 'dk-jyske', name: 'Jyske Bank', country: 'DK', provider: 'tink', color: '#007640', tinkProviderId: 'dk-jyskebank-ob' },
  { id: 'dk-nordea', name: 'Nordea Danmark', country: 'DK', provider: 'tink', color: '#00005E' },

  // ── Finland ────────────────────────────────────────────────────────────────
  { id: 'fi-op', name: 'OP Finansgruppen', country: 'FI', provider: 'tink', color: '#FF8000', tinkProviderId: 'fi-op-ob' },
  { id: 'fi-nordea', name: 'Nordea Finland', country: 'FI', provider: 'tink', color: '#00005E', tinkProviderId: 'fi-nordea-ob' },
  { id: 'fi-sp', name: 'Säästöpankki', country: 'FI', provider: 'tink', color: '#003F7F' },

  // ── Europa (urval) ─────────────────────────────────────────────────────────
  { id: 'de-deutsche', name: 'Deutsche Bank', country: 'DE', provider: 'tink', color: '#0018A8', tinkProviderId: 'de-deutschebank-ob' },
  { id: 'de-sparkasse', name: 'Sparkasse', country: 'DE', provider: 'tink', color: '#FF0000', tinkProviderId: 'de-sparkasse-ob' },
  { id: 'de-commerzbank', name: 'Commerzbank', country: 'DE', provider: 'tink', color: '#FFCC00' },
  { id: 'gb-barclays', name: 'Barclays', country: 'GB', provider: 'tink', color: '#00AEEF', tinkProviderId: 'uk-barclays-ob' },
  { id: 'gb-hsbc', name: 'HSBC', country: 'GB', provider: 'tink', color: '#DB0011', tinkProviderId: 'uk-hsbc-ob' },
  { id: 'gb-lloyds', name: 'Lloyds Bank', country: 'GB', provider: 'tink', color: '#024731', tinkProviderId: 'uk-lloyds-ob' },
  { id: 'gb-natwest', name: 'NatWest', country: 'GB', provider: 'tink', color: '#42145F' },
  { id: 'nl-ing', name: 'ING', country: 'NL', provider: 'tink', color: '#FF6200' },
  { id: 'fr-bnp', name: 'BNP Paribas', country: 'FR', provider: 'tink', color: '#00965E' },
];

// ─── Accounting Providers ─────────────────────────────────────────────────────

export interface AccountingProvider {
  id: string;
  name: string;
  country: string;
  market: 'SMB' | 'Mid' | 'Enterprise' | 'INTL';
  color: string;
  description?: string;
  authType: 'oauth2' | 'api_key';
  docsUrl?: string;
}

export const ACCOUNTING_PROVIDERS: AccountingProvider[] = [
  },
  {
    id: 'pe_accounting',
    name: 'PE Accounting',
    country: 'SE',
    market: 'Mid',
    color: '#6C3483',
    description: 'Heltäckande ekonomisystem för medelstora företag',
    authType: 'api_key',
    docsUrl: 'https://developer.pe.se/',
  },
  {
    id: 'bjornlunden',
    name: 'Björn Lundén',
    country: 'SE',
    market: 'SMB',
    color: '#2E4057',
    description: 'Traditionellt bokföringsprogram för svenska företag',
    authType: 'api_key',
  },
  {
    id: 'xero',
    name: 'Xero',
    country: 'INTL',
    market: 'SMB',
    color: '#13B5EA',
    description: 'Internationell molnbaserad bokföring',
    authType: 'oauth2',
    docsUrl: 'https://developer.xero.com/',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    country: 'US',
    market: 'SMB',
    color: '#2CA01C',
    description: 'Intuits bokföringslösning för SMB',
    authType: 'oauth2',
    docsUrl: 'https://developer.intuit.com/',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getBankById = (id: string): BankConfig | undefined =>
  SUPPORTED_BANKS.find((b) => b.id === id);

export const getBanksByCountry = (country: string): BankConfig[] =>
  SUPPORTED_BANKS.filter((b) => b.country === country);

export const getProviderById = (id: string): AccountingProvider | undefined =>
  ACCOUNTING_PROVIDERS.find((p) => p.id === id);
