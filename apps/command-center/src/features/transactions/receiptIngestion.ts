// Receipt Ingestion Service
// Processes incoming invoice emails and auto-attaches to transactions

export interface IncomingReceipt {
  messageId: string
  from: string
  subject: string
  date: string
  attachments: Array<{
    filename: string
    contentType: string
    s3Key: string
    s3Url: string
  }>
  bodyText: string
}

export interface ReceiptMatch {
  transactionId: string
  confidence: number  // 0-1
  matchReason: string
}

// Company invoice email addresses
export const COMPANY_INVOICE_EMAILS: Record<string, string> = {
  'Landvex AB':          'faktura@landvex.com',
  'Landvex Inc':         'billing@landvex.com',
  'QuiXzoom UAB':        'faktura@quixzoom.com',
  'QuiXzoom Inc':        'billing@quixzoom.com',
  'Wavult Group':        'faktura@wavult.com',
  'Sommarliden Holding': 'faktura@wavult.com',
}

// Auto-match incoming receipt to a transaction
export function matchReceiptToTransaction(
  receipt: IncomingReceipt,
  transactions: Array<{ id: string; counterparty: string; amount: number; date: string; reference?: string }>
): ReceiptMatch | null {
  const subjectLower = receipt.subject.toLowerCase()
  const bodyLower = receipt.bodyText.toLowerCase()

  let bestMatch: ReceiptMatch | null = null

  for (const tx of transactions) {
    let score = 0
    const reasons: string[] = []

    // Reference number match (highest confidence)
    if (tx.reference && (subjectLower.includes(tx.reference.toLowerCase()) || bodyLower.includes(tx.reference.toLowerCase()))) {
      score += 0.9
      reasons.push(`Reference match: ${tx.reference}`)
    }

    // Counterparty name match
    const cpLower = tx.counterparty.toLowerCase()
    if (receipt.from.toLowerCase().includes(cpLower) || subjectLower.includes(cpLower) || bodyLower.includes(cpLower)) {
      score += 0.4
      reasons.push(`Counterparty match: ${tx.counterparty}`)
    }

    // Amount match in body
    const absAmount = Math.abs(tx.amount)
    const amountStr = absAmount.toString()
    if (bodyLower.includes(amountStr) || receipt.subject.includes(amountStr)) {
      score += 0.3
      reasons.push(`Amount match: ${absAmount}`)
    }

    // Date proximity (within 7 days)
    const txDate = new Date(tx.date)
    const receiptDate = new Date(receipt.date)
    const daysDiff = Math.abs((txDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 7) {
      score += 0.2
      reasons.push(`Date proximity: ${daysDiff.toFixed(0)} days`)
    }

    if (score > 0.3 && (!bestMatch || score > bestMatch.confidence)) {
      bestMatch = {
        transactionId: tx.id,
        confidence: Math.min(score, 1),
        matchReason: reasons.join(', ')
      }
    }
  }

  return bestMatch
}

// Webhook handler — called by n8n when new invoice email arrives
export async function handleIncomingReceiptWebhook(payload: {
  messageId: string
  from: string
  subject: string
  date: string
  s3Keys: string[]
  bodyText: string
}): Promise<{ matched: boolean; transactionId?: string; confidence?: number }> {
  // In production: fetch transactions from API, run matcher, update receiptUrl
  // For now: log and return
  console.log('[ReceiptIngestion] New receipt:', payload.subject, 'from', payload.from)
  return { matched: false }
}
