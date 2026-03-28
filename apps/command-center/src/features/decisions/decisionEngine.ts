// ─── Decision Engine — Beslutslogik för Wavult OS ────────────────────────────
// Frontend-driven MVP: all logik körs i klienten

import type {
  MeetingLevel,
  VoteChoice,
  DecisionBlock,
  SystemAction,
} from './decisionTypes'
import { MEETING_AUTHORITY } from './decisionTypes'

// ─── Validering ───────────────────────────────────────────────────────────────

/**
 * Kontrollerar om ett möte på given nivå har befogenhet att besluta om den
 * angivna beslutstypen.
 */
export function validateMeetingCanDecide(
  level: MeetingLevel,
  decisionType: string
): boolean {
  const authority = MEETING_AUTHORITY[level]
  return authority.includes(decisionType)
}

// ─── Röstberäkning ────────────────────────────────────────────────────────────

/**
 * Beräknar majoritetsresultat från röstlängden.
 * Abstain räknas inte mot något alternativ.
 * Vid lika → null (ingen majoritet — kräver CEO override eller ny omröstning).
 */
export function calculateMajority(
  votes: Record<string, VoteChoice>
): 'A' | 'B' | 'C' | null {
  const counts: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 }

  for (const vote of Object.values(votes)) {
    if (vote !== 'abstain') {
      counts[vote]++
    }
  }

  const total = counts.A + counts.B + counts.C
  if (total === 0) return null

  // Absolut majoritet krävs (>50%)
  for (const alt of ['A', 'B', 'C'] as const) {
    if (counts[alt] > total / 2) return alt
  }

  // Relativ majoritet som fallback vid >= 3 röster utan abstain-dominans
  const max = Math.max(counts.A, counts.B, counts.C)
  const winners = (['A', 'B', 'C'] as const).filter(a => counts[a] === max)
  if (winners.length === 1) return winners[0]

  return null // Lika — ingen majoritet
}

// ─── Röstfördelning (util) ────────────────────────────────────────────────────

export function getVoteCounts(
  votes: Record<string, VoteChoice>
): { A: number; B: number; C: number; abstain: number; total: number } {
  const counts = { A: 0, B: 0, C: 0, abstain: 0, total: 0 }
  for (const vote of Object.values(votes)) {
    counts[vote]++
    counts.total++
  }
  return counts
}

// ─── Systemåtgärder ───────────────────────────────────────────────────────────

/**
 * Genererar de systemåtgärder som ska triggas automatiskt baserat på
 * beslutsresultatet och blockets konfiguration.
 */
export function generateSystemActions(
  result: 'A' | 'B' | 'C',
  block: DecisionBlock
): SystemAction[] {
  const chosen = block.alternatives.find(a => a.id === result)
  if (!chosen) return []

  const actions: SystemAction[] = []

  // Alltid: uppdatera budget om det finns ekonomisk påverkan
  if (chosen.revenueImpact !== 0 || chosen.costImpact !== 0) {
    actions.push({
      type: 'update_budget',
      payload: {
        decisionBlockId: block.id,
        alternativeId: result,
        revenueImpact: chosen.revenueImpact,
        costImpact: chosen.costImpact,
        note: `Automatisk budgetuppdatering från beslut: ${block.title} → Alt ${result}`,
      },
      executed: false,
      executedAt: null,
    })
  }

  // Skapa milestone baserat på tidsram
  if (chosen.timeframe) {
    actions.push({
      type: 'create_milestone',
      payload: {
        decisionBlockId: block.id,
        title: `Implementera: ${chosen.title}`,
        description: chosen.operationalImpact,
        timeframe: chosen.timeframe,
        triggeredBy: `Beslut ${block.title} → Alt ${result}`,
      },
      executed: false,
      executedAt: null,
    })
  }

  // Uppdatera OKR om beslutet gäller strategisk riktning
  if (block.objective) {
    actions.push({
      type: 'update_okr',
      payload: {
        decisionBlockId: block.id,
        objective: block.objective,
        chosenApproach: chosen.title,
        note: `OKR uppdaterad via beslut: ${block.title}`,
      },
      executed: false,
      executedAt: null,
    })
  }

  // Hög-risk beslut kräver uppföljningsuppgift
  if (chosen.riskLevel === 'high' || chosen.riskLevel === 'critical') {
    actions.push({
      type: 'create_task',
      payload: {
        decisionBlockId: block.id,
        title: `Riskuppföljning: ${chosen.title}`,
        description: `Beslut med ${chosen.riskLevel === 'critical' ? 'kritisk' : 'hög'} risk kräver uppföljning. Operationell påverkan: ${chosen.operationalImpact}`,
        priority: chosen.riskLevel === 'critical' ? 'critical' : 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 vecka
      },
      executed: false,
      executedAt: null,
    })
  }

  return actions
}

// ─── Behörighetskontroll ──────────────────────────────────────────────────────

/**
 * Kontrollerar om en användare kan göra CEO override på ett beslut.
 * Enbart Group CEO och Board-nivå har denna befogenhet.
 */
export function canOverride(_userId: string, userRole: string): boolean {
  const overrideRoles = ['group-ceo', 'board-chair', 'chairman']
  return overrideRoles.includes(userRole.toLowerCase())
}

// ─── Protokollgenerering ──────────────────────────────────────────────────────

/**
 * Genererar mötesprotokoll som markdown-text.
 */
export function generateMinutes(
  meeting: {
    title: string
    level: string
    scheduledAt: string
    participants: string[]
    agenda: DecisionBlock[]
  }
): string {
  const date = new Date(meeting.scheduledAt).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const lines: string[] = [
    `# Mötesprotokoll — ${meeting.title}`,
    `**Datum:** ${date}`,
    `**Nivå:** ${meeting.level.toUpperCase()}`,
    `**Antal deltagare:** ${meeting.participants.length}`,
    '',
    '---',
    '',
    '## Beslutspunkter',
    '',
  ]

  meeting.agenda.forEach((block, i) => {
    lines.push(`### ${i + 1}. ${block.title}`)
    lines.push(`**Målsättning:** ${block.objective}`)
    lines.push(`**Problem:** ${block.problemStatement}`)
    lines.push('')

    if (block.result) {
      const chosen = block.alternatives.find(a => a.id === block.result)
      lines.push(`**BESLUT: Alternativ ${block.result} — ${chosen?.title ?? ''}**`)
      if (block.overriddenBy) {
        lines.push(`> ⚠️ CEO Override av: ${block.overriddenBy}`)
        lines.push(`> Anledning: ${block.overrideReason}`)
      }
      lines.push('')

      const counts = getVoteCounts(block.votes)
      lines.push(`**Röstfördelning:** A: ${counts.A} | B: ${counts.B} | C: ${counts.C} | Abstain: ${counts.abstain}`)
      lines.push('')

      if (block.systemActions.length > 0) {
        lines.push('**Automatiska åtgärder:**')
        block.systemActions.forEach(action => {
          lines.push(`- ${action.type.replace(/_/g, ' ').toUpperCase()}`)
        })
      }
    } else {
      lines.push('_Inget beslut fattat_')
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  })

  lines.push(`_Protokoll genererat ${new Date().toLocaleDateString('sv-SE')}_`)

  return lines.join('\n')
}
