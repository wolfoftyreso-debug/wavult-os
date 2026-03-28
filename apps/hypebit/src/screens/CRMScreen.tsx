import { useState } from 'react'

type Stage = 'Lead' | 'Kontaktad' | 'Demo' | 'Förhandling' | 'Stängd'

interface Deal {
  id: number
  name: string
  company: string
  value: string
  stage: Stage
  owner: string
  note: string
  updated: string
}

const STAGES: Stage[] = ['Lead', 'Kontaktad', 'Demo', 'Förhandling', 'Stängd']

const INITIAL_DEALS: Deal[] = [
  { id: 1, name: 'Infragruppen AB',  company: 'Infragruppen',  value: '480 KSEK', stage: 'Förhandling', owner: 'Erik',    note: 'Vill ha pilot på 2 kamerasystem. Beslut vecka 16.', updated: 'Igår' },
  { id: 2, name: 'Stockholms Stad',  company: 'Sthlm Stad',    value: '1.2 MSEK', stage: 'Demo',        owner: 'Leon',    note: 'Demos bokad 15 april. Kontakt: Anna Lindqvist', updated: '2 dagar sedan' },
  { id: 3, name: 'Trafikverket',     company: 'Trafikverket',  value: '3.4 MSEK', stage: 'Kontaktad',   owner: 'Erik',    note: 'Kallt lead, skickade one-pager förra veckan.', updated: '1 vecka sedan' },
  { id: 4, name: 'Bravida Fastig.',  company: 'Bravida',       value: '240 KSEK', stage: 'Lead',        owner: 'Dennis',  note: 'Inkommit via LinkedIn. Ej validerad budget.', updated: '3 dagar sedan' },
  { id: 5, name: 'Atkins Sverige',   company: 'Atkins',        value: '900 KSEK', stage: 'Kontaktad',   owner: 'Leon',    note: 'Möte bokat 20 april.', updated: 'Idag' },
  { id: 6, name: 'Vectura Fastigh.', company: 'Vectura',       value: '620 KSEK', stage: 'Lead',        owner: 'Erik',    note: 'Referee från Infragruppen.', updated: 'Idag' },
  { id: 7, name: 'Skanska',          company: 'Skanska',       value: '5 MSEK',   stage: 'Lead',        owner: 'Erik',    note: 'Långt lead — nationell utrullning i sikt.', updated: '2 veckor sedan' },
]

const STAGE_COLOR: Record<Stage, string> = {
  Lead:        'bg-info/10 text-blue-300 border-info/20',
  Kontaktad:   'bg-warning/10 text-yellow-300 border-warning/20',
  Demo:        'bg-accent-dim text-violet-300 border-accent/20',
  Förhandling: 'bg-success/10 text-green-300 border-success/20',
  Stängd:      'bg-white/5 text-text-secondary border-white/10',
}

export default function CRMScreen() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS)
  const [activeStage, setActiveStage] = useState<Stage>('Lead')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  const dealsInStage = (stage: Stage) => deals.filter(d => d.stage === stage)


  function moveStage(deal: Deal, direction: 1 | -1) {
    const idx = STAGES.indexOf(deal.stage)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= STAGES.length) return
    const newStage = STAGES[newIdx]
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: newStage } : d))
    setSelectedDeal(prev => prev?.id === deal.id ? { ...prev, stage: newStage } : prev)
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <p className="text-xs text-text-secondary uppercase tracking-widest mb-1">CRM</p>
        <h1 className="text-2xl font-bold text-text-primary">Pipeline</h1>
      </div>

      {/* Stage tabs — horizontal scroll */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {STAGES.map(stage => {
            const count = dealsInStage(stage).length
            const active = activeStage === stage
            return (
              <button
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`flex-shrink-0 px-4 h-9 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-accent text-white'
                    : 'bg-card border border-white/[0.07] text-text-secondary'
                }`}
              >
                {stage}
                {count > 0 && (
                  <span className={`rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-white/10 text-text-muted'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Deals list */}
      <div className="px-5 flex flex-col gap-3">
        {dealsInStage(activeStage).map(deal => (
          <div
            key={deal.id}
            onClick={() => setSelectedDeal(deal)}
            className="bg-card border border-white/[0.07] rounded-2xl p-4 cursor-pointer active:bg-card2 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">{deal.name}</p>
                <p className="text-xs text-text-secondary">{deal.owner} · {deal.updated}</p>
              </div>
              <span className="text-sm font-bold text-accent flex-shrink-0">{deal.value}</span>
            </div>
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STAGE_COLOR[deal.stage]}`}>
              {deal.stage}
            </span>
          </div>
        ))}

        {dealsInStage(activeStage).length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">
            Inga deals i {activeStage}
          </div>
        )}
      </div>

      {/* Deal modal */}
      {selectedDeal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setSelectedDeal(null)}
        >
          <div
            className="w-full max-w-[600px] bg-card2 rounded-t-3xl p-6 border-t border-white/[0.07]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary">{selectedDeal.name}</h2>
                <p className="text-sm text-text-secondary">{selectedDeal.company}</p>
              </div>
              <span className="text-xl font-bold text-accent">{selectedDeal.value}</span>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${STAGE_COLOR[selectedDeal.stage]}`}>
                {selectedDeal.stage}
              </span>
              <span className="text-[11px] text-text-muted px-2 py-1 bg-white/5 rounded-full">
                Ansvarig: {selectedDeal.owner}
              </span>
            </div>

            <div className="bg-bg rounded-xl p-3 mb-5">
              <p className="text-xs text-text-muted mb-1 font-medium uppercase tracking-wider">Notering</p>
              <p className="text-sm text-text-primary leading-relaxed">{selectedDeal.note}</p>
            </div>

            {/* Move stage buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => moveStage(selectedDeal, -1)}
                disabled={selectedDeal.stage === STAGES[0]}
                className="flex-1 h-11 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/[0.08] rounded-xl text-sm text-text-secondary font-medium transition-colors active:scale-95"
              >
                ← Föregående stage
              </button>
              <button
                onClick={() => moveStage(selectedDeal, 1)}
                disabled={selectedDeal.stage === STAGES[STAGES.length - 1]}
                className="flex-1 h-11 bg-accent/90 hover:bg-accent disabled:opacity-30 rounded-xl text-sm text-white font-semibold transition-colors active:scale-95"
              >
                Flytta stage →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
