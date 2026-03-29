// Deterministic split engine — splits MUST equal exactly 100%
// All money flows through FinanceCo

export type Currency = 'SEK' | 'USD' | 'EUR' | 'AED' | 'GBP' | 'CAD' | 'TRY'

export interface SplitConfig {
  finance_fee: number    // 2.5
  devops_fee: number     // 10.0
  ip_royalty: number     // 8.0
  data_cost?: number     // 7.0 (Landvex only)
  zoomer_share?: number  // 75.0 (QuiXzoom only)
  creator_share?: number // 40.0 (Ads only)
  platform_fee?: number  // 25.0 (Ads: quixzoom marketplace)
  buffer?: number        // 10.0 (Ads margin buffer)
}

export interface SplitLine {
  recipient: string      // entity id or 'zoomer' | 'creator'
  fee_type: string
  percentage: number
  amount: number
  currency: Currency
}

export const DEFAULT_SPLITS = {
  landvex: {
    finance_fee: 2.5,
    devops_fee: 10.0,
    ip_royalty: 8.0,
    data_cost: 7.0,
    // remainder 72.5% → Landvex
  },
  quixzoom_payout: {
    zoomer_share: 75.0,
    devops_fee: 10.0,
    ip_royalty: 5.0,
    finance_fee: 2.5,
    platform: 7.5,  // quixzoom entity
  },
  ads: {
    creator_share: 40.0,
    platform_fee: 25.0,
    devops_fee: 10.0,
    ip_royalty: 10.0,
    finance_fee: 5.0,
    buffer: 10.0,
  },
} as const

export function computeSplits(
  grossAmount: number,
  currency: Currency,
  splitType: keyof typeof DEFAULT_SPLITS,
  entityId: string
): SplitLine[] {
  const lines: SplitLine[] = []
  let usedPercent = 0

  const addLine = (recipient: string, feeType: string, pct: number) => {
    if (!pct) return
    lines.push({
      recipient,
      fee_type: feeType,
      percentage: pct,
      amount: Math.round(grossAmount * pct / 100 * 100) / 100,
      currency,
    })
    usedPercent += pct
  }

  if (splitType === 'landvex') {
    addLine('finance-co', 'finance_fee', DEFAULT_SPLITS.landvex.finance_fee)
    addLine('devops-co', 'devops_fee', DEFAULT_SPLITS.landvex.devops_fee)
    addLine('wavult-group', 'ip_royalty', DEFAULT_SPLITS.landvex.ip_royalty)
    addLine('quixzoom-uab', 'data_cost', DEFAULT_SPLITS.landvex.data_cost)
    const remainder = Math.round((100 - usedPercent) * 100) / 100
    addLine(entityId, 'net_revenue', remainder)
  } else if (splitType === 'quixzoom_payout') {
    addLine('zoomer', 'zoomer_share', DEFAULT_SPLITS.quixzoom_payout.zoomer_share)
    addLine('devops-co', 'devops_fee', DEFAULT_SPLITS.quixzoom_payout.devops_fee)
    addLine('wavult-group', 'ip_royalty', DEFAULT_SPLITS.quixzoom_payout.ip_royalty)
    addLine('finance-co', 'finance_fee', DEFAULT_SPLITS.quixzoom_payout.finance_fee)
    addLine(entityId, 'platform_fee', DEFAULT_SPLITS.quixzoom_payout.platform)
  } else if (splitType === 'ads') {
    addLine('creator', 'creator_share', DEFAULT_SPLITS.ads.creator_share)
    addLine(entityId, 'platform_fee', DEFAULT_SPLITS.ads.platform_fee)
    addLine('devops-co', 'devops_fee', DEFAULT_SPLITS.ads.devops_fee)
    addLine('wavult-group', 'ip_royalty', DEFAULT_SPLITS.ads.ip_royalty)
    addLine('finance-co', 'finance_fee', DEFAULT_SPLITS.ads.finance_fee)
    addLine('finance-co', 'buffer', DEFAULT_SPLITS.ads.buffer)
  }

  // ENFORCEMENT: splits must equal exactly 100%
  const totalPercent = lines.reduce((sum, l) => sum + l.percentage, 0)
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`SPLIT_ERROR: splits sum to ${totalPercent}%, must be exactly 100%`)
  }

  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0)
  if (Math.abs(totalAmount - grossAmount) > 0.02) {
    throw new Error(`SPLIT_ROUNDING_ERROR: splits amount to ${totalAmount}, gross is ${grossAmount}`)
  }

  return lines
}

export function assertCurrencySupported(currency: string): asserts currency is Currency {
  const supported: Currency[] = ['SEK', 'USD', 'EUR', 'AED', 'GBP', 'CAD', 'TRY']
  if (!supported.includes(currency as Currency)) {
    throw new Error(`UNSUPPORTED_CURRENCY: ${currency}`)
  }
}
