export type TransactionType =
  | 'invoice'          // vi fakturerar kunden
  | 'credit_note'      // kreditnota (reducerar kundens skuld)
  | 'payment_received' // kunden betalade oss
  | 'payment_sent'     // vi betalade kunden (nettoutbetalning)
  | 'subscription'     // återkommande avgift
  | 'refund'           // återbetalning

export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'reversed'

export interface AccountTransaction {
  id: string
  account_id: string
  date: string              // ISO
  type: TransactionType
  description: string
  amount: number            // positiv = debet (kunden skyldig oss), negativ = kredit (vi skyldiga kunden)
  currency: string
  reference: string         // invoice no, payment ref etc
  status: TransactionStatus
  receipt_url?: string      // S3 URL till kvitto-PDF
  revolut_payment_id?: string
}

export interface CustomerAccount {
  id: string
  name: string
  email: string
  country: string
  type: 'school' | 'government' | 'ngo' | 'corporate'
  currency: string
  credit_threshold: number  // om nettokreditsaldo överstiger detta → auto-utbetalning
  transactions: AccountTransaction[]
  // Beräknade fält
  total_debit: number       // summa fakturor/subscriptions
  total_credit: number      // summa kreditnotor/utbetalda
  net_balance: number       // positiv = kunden skyldig oss, negativ = vi skyldiga kunden
  status: 'clear' | 'owes_us' | 'we_owe'
}
