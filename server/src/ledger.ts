/**
 * Wavult Ledger Core v1
 * Double-entry bookkeeping service — multi-entity, multi-currency
 *
 * REGLER:
 * - Belopp alltid i minor units (integer). 100 SEK = 10000.
 * - Aldrig float för pengar.
 * - Alla transaktioner kräver idempotency_key.
 * - Poster voidar — raderas aldrig.
 */

import { supabase } from './supabase'

// ── Types ──────────────────────────────────────────────────────────────────

export type Currency = 'SEK' | 'EUR' | 'USD' | 'AED' | 'GBP' | 'NOK' | 'DKK'
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOID'
export type JournalType = 'STANDARD' | 'INTERCOMPANY' | 'PAYROLL' | 'ADJUSTMENT' | 'OPENING_BALANCE'
export type IntercompanyFlowType =
  | 'MANAGEMENT_FEE'
  | 'LOAN'
  | 'DIVIDEND'
  | 'LICENSE_FEE'
  | 'SERVICE_FEE'
  | 'CAPITAL_INJECTION'
  | 'OTHER'

export interface JournalLine {
  accountCode: string       // e.g. '1000'
  debitMinor?: number       // integer, minor units
  creditMinor?: number      // integer, minor units
  description?: string
  originalAmount?: number   // om FX-konvertering
  originalCurrency?: Currency
  fxRate?: number
}

export interface CreateJournalInput {
  orgId: string
  entryDate: string         // 'YYYY-MM-DD'
  description: string
  currency: Currency
  type?: JournalType
  reference?: string
  idempotencyKey?: string
  lines: JournalLine[]
  autoPost?: boolean        // posta direkt om i balans
}

export interface IntercompanyInput {
  fromOrgId: string
  toOrgId: string
  amountMinor: number
  currency: Currency
  flowType: IntercompanyFlowType
  description: string
  settlementDate?: string
  idempotencyKey?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Konvertera decimal-belopp till minor units
 * toMinor(100.50, 'SEK') → 10050
 */
export function toMinor(amount: number, currency: Currency): number {
  const minorUnits: Record<Currency, number> = { SEK: 2, EUR: 2, USD: 2, AED: 2, GBP: 2, NOK: 2, DKK: 2 }
  const factor = Math.pow(10, minorUnits[currency] ?? 2)
  return Math.round(amount * factor)
}

/**
 * Konvertera minor units till decimal
 * fromMinor(10050, 'SEK') → 100.50
 */
export function fromMinor(minor: number, currency: Currency): number {
  const minorUnits: Record<Currency, number> = { SEK: 2, EUR: 2, USD: 2, AED: 2, GBP: 2, NOK: 2, DKK: 2 }
  const factor = Math.pow(10, minorUnits[currency] ?? 2)
  return minor / factor
}

/**
 * Formatera belopp för display
 * formatAmount(10050, 'SEK') → '100,50 kr'
 */
export function formatAmount(minor: number, currency: Currency): string {
  const amount = fromMinor(minor, currency)
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ── Entry number generator ─────────────────────────────────────────────────

const ORG_PREFIXES: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000001': 'WGH',
  'a1000000-0000-0000-0000-000000000002': 'WTL',
  'a1000000-0000-0000-0000-000000000003': 'WIU',
}

async function nextEntryNumber(orgId: string, year: number): Promise<string> {
  const prefix = ORG_PREFIXES[orgId] ?? 'UNK'
  const { count } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .like('entry_number', `${prefix}-${year}-%`)

  const seq = ((count ?? 0) + 1).toString().padStart(4, '0')
  return `${prefix}-${year}-${seq}`
}

// ── Ledger Service ─────────────────────────────────────────────────────────

export const LedgerService = {

  /**
   * Skapa ett nytt verifikat (journal entry) med rader — ATOMISKT via PostgreSQL RPC.
   *
   * Debet och kredit skapas i en enda databastransaktion (BEGIN/COMMIT).
   * Om servern kraschar mitt i finns inga halva bokföringsposter.
   * Idempotency-key är obligatorisk — duplicat returnerar befintlig post.
   */
  async createEntry(input: CreateJournalInput): Promise<{ id: string; entryNumber: string }> {
    if (!input.idempotencyKey) {
      // Fallback: generera UUID om anroparen inte skickade en nyckel.
      // Logga varning — anropare bör skicka sin egen nyckel för äkta idempotency.
      console.warn('[LedgerService] createEntry called without idempotencyKey — generating fallback UUID. Caller should provide a stable key.')
      input = { ...input, idempotencyKey: crypto.randomUUID() }
    }

    // Mappa JournalLine → JSONB-format som PostgreSQL-funktionen förväntar sig
    const lines = input.lines.map(line => ({
      account_code:  line.accountCode,
      debit_minor:   line.debitMinor  ?? 0,
      credit_minor:  line.creditMinor ?? 0,
      description:   line.description ?? null,
    }))

    const { data, error } = await supabase.rpc('create_journal_entry', {
      p_org_id:          input.orgId,
      p_entry_date:      input.entryDate,
      p_description:     input.description,
      p_currency:        input.currency,
      p_type:            input.type ?? 'STANDARD',
      p_reference:       input.reference ?? null,
      p_idempotency_key: input.idempotencyKey,
      p_lines:           lines,
    })

    if (error) throw new Error(`Failed to create journal entry: ${error.message}`)
    if (!data)  throw new Error('create_journal_entry returned no data')

    // Auto-post om begärt
    if (input.autoPost) {
      await LedgerService.postEntry(data.id)
    }

    return { id: data.id, entryNumber: data.entry_number ?? data.id }
  },

  /**
   * Posta ett verifikat (validerar balans)
   */
  async postEntry(journalId: string): Promise<void> {
    const { error } = await supabase.rpc('post_journal_entry', { p_journal_id: journalId })
    if (error) throw new Error(`Failed to post entry: ${error.message}`)
  },

  /**
   * Void ett verifikat
   */
  async voidEntry(journalId: string, reason: string, voidBy?: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .update({
        status: 'VOID',
        void_reason: reason,
        void_at: new Date().toISOString(),
        void_by: voidBy,
      })
      .eq('id', journalId)
      .eq('status', 'POSTED')

    if (error) throw new Error(`Failed to void entry: ${error.message}`)
  },

  /**
   * Hämta saldo för ett konto
   */
  async getAccountBalance(orgId: string, accountCode: string, asOf?: string): Promise<number> {
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('org_id', orgId)
      .eq('account_code', accountCode)
      .single()

    if (!account) throw new Error(`Account ${accountCode} not found`)

    const { data, error } = await supabase.rpc('account_balance', {
      p_account_id: (account as { id: string }).id,
      p_as_of: asOf ?? new Date().toISOString().split('T')[0],
    })

    if (error) throw new Error(`Failed to get balance: ${error.message}`)
    return data as number
  },

  /**
   * Hämta trial balance för en entitet
   */
  async getTrialBalance(orgId: string): Promise<Array<{
    accountCode: string
    accountName: string
    type: AccountType
    currency: Currency
    totalDebit: number
    totalCredit: number
    balance: number
  }>> {
    const { data, error } = await supabase
      .from('v_trial_balance')
      .select('*')
      .eq('org_id', orgId)

    if (error) throw new Error(`Failed to get trial balance: ${error.message}`)

    return (data ?? []).map((row: Record<string, unknown>) => ({
      accountCode: row.account_code as string,
      accountName: row.account_name as string,
      type: row.account_type as AccountType,
      currency: row.currency as Currency,
      totalDebit: row.total_debit as number,
      totalCredit: row.total_credit as number,
      balance: row.balance as number,
    }))
  },

  /**
   * Skapa intercompany-transaktion (skapar journal entries i båda bolagen)
   */
  async createIntercompanyFlow(input: IntercompanyInput): Promise<{ flowId: string }> {
    // Skapa "payable" entry i from-bolaget
    const fromEntry = await LedgerService.createEntry({
      orgId: input.fromOrgId,
      entryDate: input.settlementDate ?? new Date().toISOString().split('T')[0],
      description: `Intercompany: ${input.description}`,
      currency: input.currency,
      type: 'INTERCOMPANY',
      idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}-from` : undefined,
      lines: [
        { accountCode: '5300', debitMinor: input.amountMinor, description: input.description },
        { accountCode: '2100', creditMinor: input.amountMinor, description: input.description },
      ],
      autoPost: true,
    })

    // Skapa "receivable" entry i to-bolaget
    const toEntry = await LedgerService.createEntry({
      orgId: input.toOrgId,
      entryDate: input.settlementDate ?? new Date().toISOString().split('T')[0],
      description: `Intercompany received: ${input.description}`,
      currency: input.currency,
      type: 'INTERCOMPANY',
      idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}-to` : undefined,
      lines: [
        { accountCode: '1200', debitMinor: input.amountMinor, description: input.description },
        { accountCode: '4000', creditMinor: input.amountMinor, description: input.description },
      ],
      autoPost: true,
    })

    // Registrera flödet
    const { data: flow, error } = await supabase
      .from('intercompany_flows')
      .insert({
        from_org_id: input.fromOrgId,
        to_org_id: input.toOrgId,
        amount_minor: input.amountMinor,
        currency: input.currency,
        flow_type: input.flowType,
        description: input.description,
        from_journal_id: fromEntry.id,
        to_journal_id: toEntry.id,
        settlement_date: input.settlementDate,
        idempotency_key: input.idempotencyKey,
        status: 'MATCHED',
      })
      .select('id')
      .single()

    if (error || !flow) throw new Error(`Failed to create intercompany flow: ${error?.message}`)

    return { flowId: (flow as { id: string }).id }
  },

  /**
   * Hämta senaste FX-kurs
   */
  async getFxRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1

    const { data, error } = await supabase
      .from('fx_rates')
      .select('rate')
      .eq('from_currency', from)
      .eq('to_currency', to)
      .order('rate_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) throw new Error(`No FX rate found for ${from}→${to}`)
    return Number((data as { rate: number }).rate)
  },

  /**
   * Konvertera belopp mellan valutor (returnerar minor units)
   */
  async convertAmount(amountMinor: number, from: Currency, to: Currency): Promise<number> {
    const rate = await LedgerService.getFxRate(from, to)
    return Math.round(amountMinor * rate)
  },
}

export default LedgerService
