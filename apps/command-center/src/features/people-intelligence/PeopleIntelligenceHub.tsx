// ─── People Intelligence Hub ───────────────────────────────────────────────
// DISC-profiler, energitracking, beslutsarkitektur & rollrekommendationer
// Baserad på certified-spark-engine/DISCPlus + Wavult OS teamdata

import { useState } from 'react'

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function BrainIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
}
function ZapIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function TargetIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
function ShieldIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscType = 'D' | 'I' | 'S' | 'C' | 'D/I' | 'C/S' | 'I/S' | 'D/C'

interface DiscScore {
  D: number
  I: number
  S: number
  C: number
}

interface TeamMember {
  id: string
  name: string
  initials: string
  role: string
  discType: DiscType
  discScore: DiscScore
  color: string
  archetypeLabel: string
  archetypeEmoji: string
  description: string
  strengths: string[]
  watchouts: string[]
  decisionStyle: string
  decisionAuthority: string[]
  idealTasks: string[]
  energyLevel: number   // 0-100 (mock)
  focusScore: number    // 0-100 (mock)
  currentPriority: string
}

// ─── Team Data (DISC baserad på riktiga profiler) ─────────────────────────────

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'erik',
    name: 'Erik Svensson',
    initials: 'ES',
    role: 'Group CEO & Chairman',
    discType: 'D',
    discScore: { D: 92, I: 65, S: 20, C: 38 },
    color: '#8B5CF6',
    archetypeLabel: 'Dominant — Visionären',
    archetypeEmoji: '⚡',
    description:
      'Hög D-profil — drivs av resultat, fattar snabba beslut och trivs med utmaningar. Visionär ledare som sätter riktning med hög hastighet. Risk: kan underinformera teamet vid snabba vändningar.',
    strengths: [
      'Strategisk riktning & vision',
      'Snabba beslut under tryck',
      'Kapitalallokering & prioritering',
      'Motiverar team mot mål',
    ],
    watchouts: [
      'Kan gå för snabbt utan att involvera teamet',
      'Lyssnar inte alltid på detaljer (C-perspektiv)',
      'Riskerar att skifta fokus för ofta',
    ],
    decisionStyle: 'Fattar snabbt, delegerar gärna genomförande. Vill ha slutsatser — inte process.',
    decisionAuthority: [
      'Bolagsstruktur (Dubai/EU/US)',
      'Kapitalallokering & funding',
      'Produktvision & strategisk riktning',
      'Partnerships & externa relationer',
      'Go/no-go på nya ventures',
    ],
    idealTasks: [
      'Strategimöten & pitches',
      'Investerarrelationer',
      'Produktriktning & roadmap',
      'Godkänna stora beslut',
      'Teamvision & inspiration',
    ],
    energyLevel: 88,
    focusScore: 82,
    currentPriority: 'Thailand workcamp + Dubai-struktur',
  },
  {
    id: 'leon',
    name: 'Leon Russo De Cerame',
    initials: 'LR',
    role: 'CEO – Wavult Operations',
    discType: 'I',
    discScore: { D: 55, I: 88, S: 45, C: 30 },
    color: '#F59E0B',
    archetypeLabel: 'Influential — Säljaren',
    archetypeEmoji: '🔥',
    description:
      'Hög I-profil — drivs av relationer, entusiasm och att påverka andra. Naturlig säljare och kulturbärare. Excellent på att skapa energi och öppna dörrar. Risk: kan missa uppföljning och detaljer.',
    strengths: [
      'Relationsbyggande & nätverk',
      'Sälja in idéer och produkter',
      'Skapa teamenergi & motivation',
      'Externa möten & representera bolaget',
    ],
    watchouts: [
      'Uppföljning och dokumentation kan falla bort',
      'Kan lova för mycket i stunden',
      'Strukturerade processer är inte naturliga',
    ],
    decisionStyle: 'Intuitiv och relationsdriven. Konsulterar folk verbalt, fattar beslut snabbt i rätt social energi.',
    decisionAuthority: [
      'Operativ teamkoordination',
      'Säljstrategi & leads',
      'Externa partnerskap (operativt)',
      'Rekrytering av säljprofiler',
      'Daglig drift & leverans',
    ],
    idealTasks: [
      'Kundmöten & demos',
      'Sales pipeline management',
      'Teambuilding & event',
      'Partnerdialoger',
      'Rekrytering & onboarding',
    ],
    energyLevel: 91,
    focusScore: 68,
    currentPriority: 'QuiXzoom GTM & leads',
  },
  {
    id: 'dennis',
    name: 'Dennis Bjarnemark',
    initials: 'DB',
    role: 'Chief Legal & Operations (Interim)',
    discType: 'C',
    discScore: { D: 40, I: 35, S: 55, C: 85 },
    color: '#10B981',
    archetypeLabel: 'Conscientious — Analytikern',
    archetypeEmoji: '⚖️',
    description:
      'Hög C-profil — noggrann, systematisk och kvalitetsfokuserad. Legal-hjärnan i teamet. Funderar igenom konsekvenser och undviker risker. Risk: kan bli för försiktig och långsam i tidskritiska situationer.',
    strengths: [
      'Legal precision & compliance',
      'Riskanalys & due diligence',
      'Process- och systemdesign',
      'Dokumentation & avtal',
    ],
    watchouts: [
      'Kan dra ut på beslut pga perfektionism',
      'Diskomfort med otydlighet',
      'Kan underskatta timing i affärer',
    ],
    decisionStyle: 'Datadrivet och metodiskt. Vill ha alla fakta innan beslut. Bra bollplank för komplexa juridiska frågor.',
    decisionAuthority: [
      'Legal granskning & avtal',
      'Compliance & bolagsformaliteter',
      'Operativa processer & SOP:er',
      'Riskbedömningar',
      'Styrelsedokument',
    ],
    idealTasks: [
      'Avtalsgenomgång & förhandling',
      'Bolagsadmin (Dubai/SE/US)',
      'Process-dokumentation',
      'Legal due diligence',
      'Compliance-checklistor',
    ],
    energyLevel: 72,
    focusScore: 88,
    currentPriority: 'Bolagsstruktur Dubai + FZCO',
  },
  {
    id: 'winston',
    name: 'Winston Bjarnemark',
    initials: 'WB',
    role: 'CFO',
    discType: 'C/S',
    discScore: { D: 25, I: 30, S: 72, C: 80 },
    color: '#3B82F6',
    archetypeLabel: 'Conscientious/Steady — Analytisk Stabilisator',
    archetypeEmoji: '📊',
    description:
      'Hög C/S-kombination — extrem pålitlighet, precision i siffror och stabilt lugn. CFO-arketypen: vill förstå helheten, skyddar bolaget från finansiella risker. Risk: kan dra i handbromsen när snabb expansion behövs.',
    strengths: [
      'Finansiell precision & modellering',
      'Budgetuppföljning & prognos',
      'Riskminimering i ekonomi',
      'Stabil, förutsägbar leverans',
    ],
    watchouts: [
      'Kan bromsa tillväxt-investeringar',
      'Föredrar konservativa estimat',
      'Tar lång tid på sig vid snabba finansbeslut',
    ],
    decisionStyle: 'Sifferdrivet och systematiskt. Vill ha underlag och historik. Fattar välgrundade men inte snabba beslut.',
    decisionAuthority: [
      'Finansiell rapportering & bokslut',
      'Budgetar & forecasts',
      'Löner & utbetalningar',
      'Intercompany cash flow',
      'Skatteplanering (operativt)',
    ],
    idealTasks: [
      'Månadsrapporter & P&L',
      'Budgetuppföljning',
      'Ekonomisk prognos & scenario',
      'Invoice & procurement review',
      'Likviditethantering',
    ],
    energyLevel: 78,
    focusScore: 90,
    currentPriority: 'Intercompany cashflow + löner',
  },
  {
    id: 'johan',
    name: 'Johan Berglund',
    initials: 'JB',
    role: 'Group CTO',
    discType: 'C',
    discScore: { D: 42, I: 28, S: 50, C: 88 },
    color: '#EC4899',
    archetypeLabel: 'Conscientious — Arkitekten',
    archetypeEmoji: '🏗',
    description:
      'Hög C-profil med teknisk expertis. Djupanalytisk och systemorienterad. Bygger rätt — inte snabbt. Föredrar genomtänkta arkitekturlösningar framför snabba workarounds. Risk: kan bli en flaskhals om all teknisk riktning går igenom honom.',
    strengths: [
      'Systemarkitektur & teknisk vision',
      'Kodkvalitet & best practices',
      'Teknisk due diligence',
      'Integration & API-design',
    ],
    watchouts: [
      'Kan fastna i perfekta lösningar istf fungerande',
      'Kommunicerar tekniskt — inte alltid affärsmässigt',
      'Risk för single-point-of-failure i teknik',
    ],
    decisionStyle: 'Analytisk och metodisk. Vill förstå teknisk konsekvens fullt ut. Fattar välgrundade arkitekturval.',
    decisionAuthority: [
      'Teknisk stack & arkitektur',
      'Plattformsval & infrastruktur',
      'Säkerhet & data compliance',
      'Developer onboarding & kodstandard',
      'API & integration decisions',
    ],
    idealTasks: [
      'System- och API-design',
      'Tech debt review',
      'Developer hiring & mentoring',
      'CI/CD & deployment pipeline',
      'Säkerhetsgranskningar',
    ],
    energyLevel: 75,
    focusScore: 92,
    currentPriority: 'Wavult OS arkitektur + QuiXzoom backend',
  },
]

// ─── DISC Bar ─────────────────────────────────────────────────────────────────

function DiscBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 font-bold" style={{ color }}>{label}</span>
      <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right text-gray-400">{value}</span>
    </div>
  )
}

// ─── Energy Ring ──────────────────────────────────────────────────────────────

function EnergyRing({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} stroke="#ffffff10" strokeWidth="4" fill="none" />
        <circle
          cx="28" cy="28" r={r}
          stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text
          x="28" y="28"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
          fontWeight="bold"
          transform="rotate(90 28 28)"
        >
          {value}
        </text>
      </svg>
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
  )
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({ member, selected, onClick }: {
  member: TeamMember
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-4 border transition-all duration-200 ${
        selected
          ? 'border-white/30 bg-white/10'
          : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
          style={{ backgroundColor: member.color + '33', border: `2px solid ${member.color}66` }}
        >
          <span style={{ color: member.color }}>{member.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{member.name}</div>
          <div className="text-xs text-gray-400 truncate">{member.role}</div>
        </div>
        <div
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: member.color + '22', color: member.color }}
        >
          {member.discType}
        </div>
      </div>
      {selected && (
        <div className="mt-3 text-xs text-gray-400 italic truncate">
          {member.archetypeEmoji} {member.archetypeLabel}
        </div>
      )}
    </button>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

type DetailTab = 'profil' | 'beslut' | 'uppgifter'

function DetailPanel({ member }: { member: TeamMember }) {
  const [tab, setTab] = useState<DetailTab>('profil')

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'profil', label: 'DISC Profil' },
    { id: 'beslut', label: 'Beslut' },
    { id: 'uppgifter', label: 'Uppgifter' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: member.color + '22', border: `2px solid ${member.color}55` }}
        >
          <span style={{ color: member.color }}>{member.initials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white">{member.name}</h2>
            <span
              className="text-sm font-bold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: member.color + '22', color: member.color }}
            >
              {member.discType}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-0.5">{member.role}</div>
          <div className="text-xs mt-1 font-medium" style={{ color: member.color }}>
            {member.archetypeEmoji} {member.archetypeLabel}
          </div>
        </div>
        {/* Energy rings */}
        <div className="flex gap-3 flex-shrink-0">
          <EnergyRing value={member.energyLevel} color={member.color} label="Energi" />
          <EnergyRing value={member.focusScore} color="#6EE7B7" label="Fokus" />
        </div>
      </div>

      {/* Current priority */}
      <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 flex items-center gap-2">
        <TargetIcon />
        <span className="text-xs text-gray-400">Aktuellt fokus:</span>
        <span className="text-sm text-white font-medium">{member.currentPriority}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
              tab === t.id ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profil' && (
        <div className="flex flex-col gap-5">
          {/* DISC bars */}
          <div className="flex flex-col gap-2.5">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">DISC-poäng</div>
            <DiscBar label="D" value={member.discScore.D} color="#EF4444" />
            <DiscBar label="I" value={member.discScore.I} color="#F59E0B" />
            <DiscBar label="S" value={member.discScore.S} color="#10B981" />
            <DiscBar label="C" value={member.discScore.C} color="#3B82F6" />
          </div>

          {/* Description */}
          <p className="text-sm text-gray-300 leading-relaxed">{member.description}</p>

          {/* Strengths */}
          <div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Styrkor</div>
            <div className="flex flex-col gap-1.5">
              {member.strengths.map(s => (
                <div key={s} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5 flex-shrink-0"><CheckIcon /></span>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Watch-outs */}
          <div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Risker att bevaka</div>
            <div className="flex flex-col gap-1.5">
              {member.watchouts.map(w => (
                <div key={w} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0"><AlertIcon /></span>
                  {w}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'beslut' && (
        <div className="flex flex-col gap-5">
          {/* Decision style */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Beslutsstil</div>
            <p className="text-sm text-gray-300 leading-relaxed">{member.decisionStyle}</p>
          </div>

          {/* Decision authority */}
          <div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Beslutsbefogenhet</div>
            <div className="flex flex-col gap-1.5">
              {member.decisionAuthority.map(a => (
                <div key={a} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0"><ShieldIcon /></span>
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* How to communicate with this person */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Kommunicera rätt med {member.name.split(' ')[0]}
            </div>
            <CommunicationTips discType={member.discType} />
          </div>
        </div>
      )}

      {tab === 'uppgifter' && (
        <div className="flex flex-col gap-5">
          <div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Optimala arbetsuppgifter</div>
            <div className="flex flex-col gap-2">
              {member.idealTasks.map((task, i) => (
                <div
                  key={task}
                  className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: member.color + '22', color: member.color }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-300">{task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Communication Tips ───────────────────────────────────────────────────────

function CommunicationTips({ discType }: { discType: DiscType }) {
  const tips: Record<string, string[]> = {
    D: [
      'Kom till poängen snabbt — skippa bakgrunden',
      'Presentera alternativ, inte bara ett val',
      'Visa vad resultatet är, inte hur det gjordes',
      'Utmana gärna, men ha argument klara',
    ],
    I: [
      'Börja med relation och energi, inte agenda',
      'Håll det kortfattat — de tappar fokus på detaljer',
      'Koppla till det stora, inspirerande målet',
      'Följ upp skriftligt — de glömmer verbala detaljer',
    ],
    S: [
      'Bygg förtroende innan förändring',
      'Ge tid att processa — inte beslut i stunden',
      'Visa hur det påverkar teamet positivt',
      'Undvik konfrontation — använd dialog',
    ],
    C: [
      'Ge komplett information och data',
      'Ge tid att tänka — boka in uppföljning',
      'Var exakt och precis — undvik vagt',
      'Respektera deras processer och standarder',
    ],
    'D/I': [
      'Snabb & entusiastisk kommunikation',
      'Resultat + energi är nyckeln',
      'Undvik för mycket detaljer',
    ],
    'C/S': [
      'Systematisk och lugn kommunikation',
      'Ge data och tid att reflektera',
      'Undvik hastig förändring utan förklaring',
    ],
    'I/S': ['Relation och samarbete är nyckeln', 'Visa omtanke om teamet', 'Undvik hård konfrontation'],
    'D/C': ['Data + resultat', 'Direkt och faktabaserat', 'Respektera deras standarder'],
  }

  const list = tips[discType] || tips['D']

  return (
    <ul className="flex flex-col gap-1.5">
      {list.map(tip => (
        <li key={tip} className="flex items-start gap-2 text-sm text-gray-300">
          <span className="text-blue-400 mt-0.5 flex-shrink-0"><ZapIcon /></span>
          {tip}
        </li>
      ))}
    </ul>
  )
}

// ─── Team Overview Grid ───────────────────────────────────────────────────────

function TeamOverview() {
  const discColors: Record<string, string> = { D: '#EF4444', I: '#F59E0B', S: '#10B981', C: '#3B82F6' }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teamöversikt — DISC-fördelning</div>

      {/* DISC matrix visual */}
      <div className="grid grid-cols-2 gap-3">
        {(['D', 'I', 'S', 'C'] as const).map(type => {
          const members = TEAM_MEMBERS.filter(m => m.discType.startsWith(type) || m.discType.endsWith(type))
          const descriptions: Record<string, string> = {
            D: 'Resultat & beslut',
            I: 'Relation & inflytande',
            S: 'Stabilitet & samarbete',
            C: 'Kvalitet & analys',
          }
          return (
            <div
              key={type}
              className="rounded-xl p-3 border"
              style={{ backgroundColor: discColors[type] + '11', borderColor: discColors[type] + '33' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg" style={{ color: discColors[type] }}>{type}</div>
                <div className="text-xs text-gray-400">{descriptions[type]}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <div
                    key={m.id}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: m.color + '22', color: m.color }}
                  >
                    {m.initials}
                  </div>
                ))}
                {members.length === 0 && (
                  <span className="text-xs text-gray-500">Ingen</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Balance insight */}
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <div className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
          <AlertIcon /> Teambalans-analys
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          Teamet är <strong className="text-white">C-tungt</strong> (Johan, Dennis, Winston = 3×C) med stark D-top (Erik) och I-kanal (Leon). 
          Saknar S-stabilitet i mitten — risk för överanalys utan action. 
          Rekommendation: sätt tydliga deadlines och ha Erik som beslutbrytare.
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PeopleIntelligenceHub() {
  const [selectedId, setSelectedId] = useState<string>('erik')
  const [showOverview, setShowOverview] = useState(false)

  const selectedMember = TEAM_MEMBERS.find(m => m.id === selectedId) || TEAM_MEMBERS[0]

  return (
    <div className="h-full flex flex-col gap-0 bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BrainIcon />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">People Intelligence</h1>
            <p className="text-xs text-gray-400">DISC-profiler · Beslutsarkitektur · Rolloptimering</p>
          </div>
        </div>
        <button
          onClick={() => setShowOverview(!showOverview)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
            showOverview
              ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
              : 'border-white/20 bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          {showOverview ? '← Individuell vy' : '👥 Teamöversikt'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {showOverview ? (
          /* Overview mode */
          <div className="flex-1 overflow-auto p-6">
            <TeamOverview />
          </div>
        ) : (
          /* Detail mode: sidebar + panel */
          <>
            {/* Sidebar */}
            <div className="w-72 border-r border-white/10 flex flex-col overflow-hidden flex-shrink-0">
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</div>
              </div>
              <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
                {TEAM_MEMBERS.map(member => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    selected={selectedId === member.id}
                    onClick={() => setSelectedId(member.id)}
                  />
                ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="flex-1 overflow-auto p-6">
              <DetailPanel member={selectedMember} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
