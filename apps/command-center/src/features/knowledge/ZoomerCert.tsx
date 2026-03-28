import { useState } from 'react'

type Stage = 'intro' | 'quiz' | 'result' | 'certificate'

interface Question {
  id: number
  text: string
  options: string[]
  correct: number
}

// ─── ZoomerCert Frågor — 10 stycken, pedagogiska och rätt svårighetsgrad ────
// Uppdaterade 2026-03-27 efter Red Team Audit.
// Täcker: plattform, etik, juridik, kvalitet, affärsmodell, nomenklatur.
const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Vad är QuiXzooms primära affärsmodell?',
    options: [
      'Sälja kameror och tillbehör till fotografer',
      'Crowdsourcad kamerainfrastruktur — zoomers tar geo-taggade uppdrag och levererar bilddata mot betalning',
      'B2B videostreamingtjänst för kommuner',
      'Socialt medieplattform för bilddelning',
    ],
    correct: 1,
  },
  {
    id: 2,
    // Testar nomenklatur — ett av de viktigaste att förstå
    text: 'Vad är den korrekta termen för en person som utför uppdrag i QuiXzoom-plattformen?',
    options: ['Fotograf', 'Fältoperatör', 'Zoomer', 'Field Agent'],
    correct: 2,
  },
  {
    id: 3,
    // Testar förståelse av uppdragsflödet — praktisk kunskap
    text: 'Hur länge är ett uppdrag "låst" för en zoomer efter att hen accepterat det?',
    options: ['30 minuter', '1 timme', '2 timmar', '4 timmar'],
    correct: 2,
  },
  {
    id: 4,
    // Testar juridik och struktur — viktigt för EU-zoomers
    text: 'Vilken juridisk enhet är ansvarig för QuiXzoom-verksamheten i EU?',
    options: [
      'QuiXzoom AB (Sverige)',
      'QuiXzoom GmbH (Tyskland)',
      'QuiXzoom UAB (Litauen)',
      'Wavult Group FZCO (Dubai)',
    ],
    correct: 2,
  },
  {
    id: 5,
    // Testar kvalitetskrav — praktisk kunskap
    text: 'Vad händer om ett inlämnat uppdrag underkänns av AI-validering?',
    options: [
      'Zoomer får automatiskt halv betalning',
      'Uppdraget arkiveras utan åtgärd',
      'Zoomer får bildspecifik feedback och kan eventuellt göra om uppdraget',
      'Zoomer stängs av från plattformen',
    ],
    correct: 2,
  },
  {
    id: 6,
    // Testar certifieringsnivåer — motivation att stanna och bli bättre
    text: 'Hur många godkända uppdrag krävs som minimum för att uppnå Pro Zoomer-status?',
    options: ['10 uppdrag', '25 uppdrag', '50 uppdrag', '100 uppdrag'],
    correct: 2,
  },
  {
    id: 7,
    // Testar etik och GDPR — kritisk för praktiken
    text: 'Vilket av följande är INTE tillåtet att fotografera som zoomer?',
    options: [
      'En kommunal brygga i offentlig hamn',
      'En persons ansikte som tydligt syns och är identifierbart',
      'En trasig parkbänk i ett offentligt område',
      'Ett brunnslock på en gata',
    ],
    correct: 1,
  },
  {
    id: 8,
    // Testar betalningsmodellen — viktig för zoomer-motivation
    text: 'Vilken andel av ett uppdragspris får zoomern utbetalt?',
    options: ['50%', '60%', '75%', '90%'],
    correct: 2,
  },
  {
    id: 9,
    // Testar förståelse av värdekedjan — ger helhetsbild
    text: 'Vad är Landvex i relation till QuiXzoom?',
    options: [
      'En konkurrent som samlar in liknande data',
      'Enterprise-plattformen som säljer analyserade larm till kommuner, baserat på QuiXzoom-data',
      'En zoomer-app för äldre målgrupper',
      'QuiXzooms betalningsprocessor',
    ],
    correct: 1,
  },
  {
    id: 10,
    // Testar kärncitatet och positioneringen — viktig för att förstå affärsidén
    text: 'Vad är Landvex kärnvärde — det som skiljer dem från traditionell inspektion?',
    options: [
      '"AI-övervakning dygnet runt, 365 dagar om året"',
      '"Billigaste kameraövervakningen på marknaden"',
      '"Right control. Right cost. Right interval."',
      '"Världens snabbaste drönartjänst"',
    ],
    correct: 2,
  },
]

// 7 av 10 rätt krävs för godkänt
const PASS_THRESHOLD = 7

function CertificateView({ onReset }: { onReset: () => void }) {
  const date = new Date().toLocaleDateString('sv-SE', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <div className="w-full max-w-lg bg-gradient-to-br from-[#0D0F1A] to-[#12151F] border border-amber-400/30 rounded-2xl p-8 text-center relative overflow-hidden">
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 h-16 w-16 border-t-2 border-l-2 border-amber-400/40 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 h-16 w-16 border-t-2 border-r-2 border-amber-400/40 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 h-16 w-16 border-b-2 border-l-2 border-amber-400/40 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 h-16 w-16 border-b-2 border-r-2 border-amber-400/40 rounded-br-2xl" />

        <div className="text-5xl mb-4">🏆</div>

        <p className="text-xs text-amber-400/60 font-mono tracking-[0.3em] mb-2">WAVULT GROUP — QUIXZOOM</p>

        <h1 className="text-2xl font-bold text-white mb-1">Certifikat</h1>
        <h2 className="text-lg text-amber-300 mb-6">Standard Zoomer</h2>

        <p className="text-sm text-gray-400 leading-relaxed mb-6">
          Innehavaren av detta certifikat har genomgått och godkänts i
          QuiXzoom Zoomer-certifieringen och uppfyller samtliga krav
          för att verka som certifierad Zoomer i QuiXzoom-plattformen.
        </p>

        <div className="border-t border-amber-400/20 pt-4 mb-6">
          <p className="text-xs text-gray-600 font-mono">UTFÄRDAT AV</p>
          <p className="text-sm text-white font-semibold mt-0.5">Wavult Group</p>
          <p className="text-xs text-gray-600 mt-0.5">QuiXzoom UAB</p>
        </div>

        <div className="bg-amber-400/5 border border-amber-400/15 rounded-lg px-4 py-2 mb-6">
          <p className="text-xs text-gray-600 font-mono">DATUM</p>
          <p className="text-sm text-amber-300">{date}</p>
        </div>

        <div className="text-xs text-gray-600 font-mono mb-6">
          CERT-ID: ZMR-{Math.random().toString(36).substring(2, 10).toUpperCase()}
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg text-xs text-gray-500 border border-surface-border hover:text-gray-300 transition-colors"
        >
          Ta om certifieringen
        </button>
      </div>
    </div>
  )
}

export function ZoomerCert() {
  const [stage, setStage] = useState<Stage>(() => {
    const saved = localStorage.getItem('wavult_zoomer_cert')
    return saved === 'passed' ? 'certificate' : 'intro'
  })
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const question = QUESTIONS[currentQ]
  const isLastQuestion = currentQ === QUESTIONS.length - 1

  function handleAnswer(optionIndex: number) {
    if (showFeedback) return
    setSelectedOption(optionIndex)
    setAnswers(prev => ({ ...prev, [question.id]: optionIndex }))
    setShowFeedback(true)
  }

  function handleNext() {
    if (isLastQuestion) {
      // Calculate score
      const score = QUESTIONS.reduce((sum, q) => sum + (answers[q.id] === q.correct ? 1 : 0), 0)
      if (score >= PASS_THRESHOLD) {
        localStorage.setItem('wavult_zoomer_cert', 'passed')
        setStage('certificate')
      } else {
        setStage('result')
      }
    } else {
      setCurrentQ(prev => prev + 1)
      setSelectedOption(null)
      setShowFeedback(false)
    }
  }

  function handleReset() {
    localStorage.removeItem('wavult_zoomer_cert')
    setStage('intro')
    setCurrentQ(0)
    setAnswers({})
    setSelectedOption(null)
    setShowFeedback(false)
  }

  const score = QUESTIONS.reduce((sum, q) => sum + (answers[q.id] === q.correct ? 1 : 0), 0)

  if (stage === 'certificate') {
    return <CertificateView onReset={handleReset} />
  }

  if (stage === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📸</div>
            <h1 className="text-2xl font-bold text-white mb-2">Zoomer-certifiering</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Bli en certifierad Zoomer i QuiXzoom-plattformen.
              Certifieringen testar din kunskap om plattformen,
              affärsmodellen och kvalitetskraven.
            </p>
          </div>

          <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">Vad du behöver veta</h3>
            <div className="space-y-3">
              {[
                { icon: '❓', text: '10 frågor om plattform, etik, juridik och kvalitet' },
                { icon: '✅', text: 'Kräver 7 av 10 rätt svar för godkänt (70%)' },
                { icon: '🎓', text: 'Godkänt = Standard Zoomer-certifikat' },
                { icon: '📖', text: 'Tips: Läs kursen "QuiXzoom — Plattformsguide" och dokumentet "GDPR för Zoomers" innan du börjar' },
                { icon: '🔄', text: 'Obegränsat antal försök — feedback visas efter varje fråga' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center flex-shrink-0">{item.icon}</span>
                  <span className="text-sm text-gray-400">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStage('quiz')}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            Starta certifiering →
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'result') {
    const passed = score >= PASS_THRESHOLD
    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">{passed ? '🎉' : '😔'}</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {passed ? 'Godkänt!' : 'Inte godkänt'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Du fick <span className="text-white font-semibold">{score} av {QUESTIONS.length}</span> rätt.
            {!passed && ` Kräver ${PASS_THRESHOLD} av ${QUESTIONS.length} rätt. Läs "QuiXzoom Plattformsguide" och försök igen!`}
          </p>

          <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-4 mb-6">
            {QUESTIONS.map(q => {
              const userAnswer = answers[q.id]
              const isCorrect = userAnswer === q.correct
              return (
                <div key={q.id} className={`flex items-start gap-3 py-2 border-b border-surface-border last:border-0`}>
                  <span className={`text-base flex-shrink-0 mt-0.5 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <div>
                    <p className="text-xs text-gray-300">{q.text}</p>
                    {!isCorrect && (
                      <p className="text-xs text-green-400 mt-0.5">
                        Rätt svar: {q.options[q.correct]}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            Försök igen →
          </button>
        </div>
      </div>
    )
  }

  // Quiz stage
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-6">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < currentQ ? 'bg-amber-400' :
                i === currentQ ? 'bg-amber-400/50' :
                'bg-white/10'
              }`}
            />
          ))}
          <span className="text-xs text-gray-600 font-mono flex-shrink-0">{currentQ + 1}/{QUESTIONS.length}</span>
        </div>

        {/* Question */}
        <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-6 mb-4">
          <p className="text-xs text-amber-400/60 font-mono mb-3">FRÅGA {currentQ + 1}</p>
          <h2 className="text-base font-semibold text-white leading-snug">{question.text}</h2>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-6">
          {question.options.map((option, i) => {
            let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all '
            if (!showFeedback) {
              cls += selectedOption === i
                ? 'bg-amber-500/10 border-amber-400 text-white'
                : 'bg-[#0D0F1A] border-surface-border text-gray-400 hover:text-white hover:border-white/20'
            } else {
              if (i === question.correct) {
                cls += 'bg-green-500/10 border-green-400/50 text-green-300'
              } else if (i === selectedOption && i !== question.correct) {
                cls += 'bg-red-500/10 border-red-400/50 text-red-300'
              } else {
                cls += 'bg-[#0D0F1A] border-surface-border text-gray-600'
              }
            }

            return (
              <button key={i} className={cls} onClick={() => handleAnswer(i)} disabled={showFeedback}>
                <span className="font-mono text-xs mr-2 opacity-50">
                  {String.fromCharCode(65 + i)}.
                </span>
                {option}
                {showFeedback && i === question.correct && (
                  <span className="ml-2 text-green-400 text-xs">✓ Rätt</span>
                )}
                {showFeedback && i === selectedOption && i !== question.correct && (
                  <span className="ml-2 text-red-400 text-xs">✗ Fel</span>
                )}
              </button>
            )
          })}
        </div>

        {showFeedback && (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            {isLastQuestion ? 'Se resultat →' : 'Nästa fråga →'}
          </button>
        )}
      </div>
    </div>
  )
}
