import { useState } from 'react'
import { usePayroll } from './hooks/usePayroll'
import { PAYROLL_HISTORY } from './data'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS: Record<Step, string> = {
  1: 'Kontrollera anställda',
  2: 'Beräkna skatter & avgifter',
  3: 'Granska totaler',
  4: 'Godkänn & kör',
}

export function PayrollRun() {
  const [step, setStep] = useState<Step>(1)
  const [ran, setRan] = useState(false)
  const [runComplete, setRunComplete] = useState(false)

  const { activeEmployees: active, loading, error, calcSalary, fmt, fmtPeriod, EMPLOYER_TAX_RATE, createPayrollRun } = usePayroll()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-text-muted">Laddar lönedata...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Fel: {error}</div>
  }

  const totalGross = active.reduce((s, e) => s + e.gross_salary, 0)
  const totalTax = active.reduce((s, e) => s + calcSalary(e.gross_salary).taxDeduction, 0)
  const totalNet = active.reduce((s, e) => s + calcSalary(e.gross_salary).net, 0)
  const totalEmployerTax = Math.round(totalGross * EMPLOYER_TAX_RATE)
  const totalCost = totalGross + totalEmployerTax

  const currentPeriod = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  async function handleRun() {
    setRan(true)

    // Create payroll run in database
    const today = new Date()
    const runDate = today.toISOString().split('T')[0]

    const result = await createPayrollRun({
      id: `pr-${currentPeriod}`,
      period: currentPeriod,
      run_date: runDate,
      total_gross: totalGross,
      total_employer_tax: totalEmployerTax,
      total_net: totalNet,
      total_cost: totalCost,
      status: 'completed',
      approved_by: 'Winston Bjarnemark', // TODO: Get from auth context
    })

    if (result.success) {
      setTimeout(() => setRunComplete(true), 1500)
    } else {
      alert('Fel vid lönekörning: ' + result.error)
      setRan(false)
    }
  }

  function reset() {
    setStep(1)
    setRan(false)
    setRunComplete(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Lönekörning</h2>
        <p className="text-xs text-text-muted mt-0.5">Period: {fmtPeriod(currentPeriod)}</p>
      </div>

      {!ran ? (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-0">
            {([1, 2, 3, 4] as Step[]).map((s, idx) => (
              <div key={s} className="flex items-center flex-1">
                <button
                  onClick={() => s <= step && setStep(s)}
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold border-2 transition-all flex-shrink-0 ${
                    s < step
                      ? 'bg-green-500 border-green-500 text-gray-900'
                      : s === step
                      ? 'border-blue-600 text-blue-700 bg-blue-600/10'
                      : 'border-surface-border text-text-muted bg-transparent'
                  }`}
                >
                  {s < step ? '✓' : s}
                </button>
                {idx < 3 && (
                  <div className={`flex-1 h-0.5 mx-1 ${s < step ? 'bg-green-500' : 'bg-surface-border'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between px-0 -mt-2">
            {([1, 2, 3, 4] as Step[]).map(s => (
              <span key={s} className={`text-xs ${s === step ? 'text-blue-700' : 'text-gray-500'}`}>
                {STEP_LABELS[s]}
              </span>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
            {step === 1 && (
              <div>
                <div className="px-5 py-4 border-b border-surface-border">
                  <h3 className="text-sm font-semibold text-text-primary">Steg 1: Kontrollera anställda</h3>
                  <p className="text-xs text-text-muted mt-0.5">Alla aktiva anställda ingår i körningen</p>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-surface-border text-xs text-text-muted">
                      <th className="text-left px-5 py-3">Namn</th>
                      <th className="text-left px-5 py-3">Roll</th>
                      <th className="text-right px-5 py-3">Bruttolön</th>
                      <th className="text-left px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(emp => (
                      <tr key={emp.id} className="border-b border-gray-200/50">
                        <td className="px-5 py-3 text-xs text-text-primary">{emp.name}</td>
                        <td className="px-5 py-3 text-xs text-text-muted">{emp.role}</td>
                        <td className="px-5 py-3 text-right text-xs text-text-primary tabular-nums">{fmt(emp.gross_salary)}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-700">✓ OK</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>{/* /overflow-x-auto */}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="px-5 py-4 border-b border-surface-border">
                  <h3 className="text-sm font-semibold text-text-primary">Steg 2: Beräkna skatter & avgifter</h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="border-b border-surface-border text-xs text-text-muted">
                      <th className="text-left px-5 py-3">Namn</th>
                      <th className="text-right px-5 py-3">Brutto</th>
                      <th className="text-right px-5 py-3">Skatt</th>
                      <th className="text-right px-5 py-3">Netto</th>
                      <th className="text-right px-5 py-3">Arb.avg.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(emp => {
                      const c = calcSalary(emp.gross_salary)
                      return (
                        <tr key={emp.id} className="border-b border-gray-200/50">
                          <td className="px-5 py-3 text-xs text-text-primary">{emp.name}</td>
                          <td className="px-5 py-3 text-right text-xs text-text-primary tabular-nums">{fmt(c.gross)}</td>
                          <td className="px-5 py-3 text-right text-xs text-red-700 tabular-nums">−{fmt(c.taxDeduction)}</td>
                          <td className="px-5 py-3 text-right text-xs text-green-700 tabular-nums">{fmt(c.net)}</td>
                          <td className="px-5 py-3 text-right text-xs text-amber-700 tabular-nums">{fmt(c.employerTax)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>{/* /overflow-x-auto */}
              </div>
            )}

            {step === 3 && (
              <div className="px-5 py-5 space-y-4">
                <h3 className="text-sm font-semibold text-text-primary">Steg 3: Granska totaler</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Totala bruttolöner', value: fmt(totalGross), color: '#ffffff' },
                    { label: 'Totala skatteavdrag', value: `−${fmt(totalTax)}`, color: '#F87171' },
                    { label: 'Totalt att utbetala (netto)', value: fmt(totalNet), color: '#34D399' },
                    { label: 'Arbetsgivaravgifter (31.42%)', value: fmt(totalEmployerTax), color: '#FBBF24' },
                    { label: 'Total kostnad för bolaget', value: fmt(totalCost), color: '#C084FC' },
                    { label: 'Antal anställda', value: String(active.length), color: '#60A5FA' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50/30 rounded-xl p-4">
                      <div className="text-xs text-text-muted mb-1">{s.label}</div>
                      <div className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="px-5 py-5 space-y-4">
                <h3 className="text-sm font-semibold text-text-primary">Steg 4: Godkänn & kör</h3>
                <p className="text-xs text-text-muted">
                  Bekräfta att du vill köra lönerna för {fmtPeriod(currentPeriod)}.
                  Totalt utbetalas <span className="text-green-700 font-semibold">{fmt(totalNet)}</span> netto
                  till {active.length} anställda. Arbetsgivaravgift på <span className="text-amber-700 font-semibold">{fmt(totalEmployerTax)}</span> deklareras till Skatteverket.
                </p>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700">⚠️ Denna åtgärd markerar lönekörningen som genomförd. Kan ej ångras.</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => step > 1 && setStep((step - 1) as Step)}
              disabled={step === 1}
              className="text-xs px-4 py-2 rounded-lg bg-muted/30 border border-surface-border text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
            >
              ← Föregående
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                className="text-xs px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-text-primary font-semibold transition-colors"
              >
                Nästa →
              </button>
            ) : (
              <button
                onClick={handleRun}
                className="text-xs px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-text-primary font-semibold transition-colors"
              >
                ✓ Kör löner
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white border border-surface-border rounded-xl px-6 py-8 text-center space-y-3">
          {runComplete ? (
            <>
              <div className="text-4xl">✅</div>
              <div className="text-sm font-bold text-text-primary">Lönekörning genomförd!</div>
              <div className="text-xs text-text-muted">
                {fmtPeriod(currentPeriod)} — {fmt(totalNet)} utbetalas till {active.length} anställda
              </div>
              <button onClick={reset} className="mt-4 text-xs px-4 py-2 rounded-lg bg-muted/30 border border-surface-border text-text-muted hover:text-text-primary transition-colors">
                Ny körning
              </button>
            </>
          ) : (
            <>
              <div className="text-2xl animate-pulse">⏳</div>
              <div className="text-sm text-text-muted">Kör löner...</div>
            </>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Historik — körda löner</h3>
        <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-surface-border text-xs text-text-muted">
                <th className="text-left px-5 py-3">Period</th>
                <th className="text-left px-5 py-3">Körd datum</th>
                <th className="text-right px-5 py-3">Brutto</th>
                <th className="text-right px-5 py-3">Netto</th>
                <th className="text-right px-5 py-3">Total kostnad</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Godkänd av</th>
              </tr>
            </thead>
            <tbody>
              {PAYROLL_HISTORY.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-muted text-xs italic">
                    Inga lönekörningar genomförda ännu
                  </td>
                </tr>
              )}
              {PAYROLL_HISTORY.map(run => (
                <tr key={run.id} className="border-b border-gray-200/50">
                  <td className="px-5 py-3 text-xs text-text-primary">{fmtPeriod(run.period)}</td>
                  <td className="px-5 py-3 text-xs text-text-muted">{run.runDate}</td>
                  <td className="px-5 py-3 text-right text-xs text-text-primary tabular-nums">{fmt(run.totalGross)}</td>
                  <td className="px-5 py-3 text-right text-xs text-green-700 tabular-nums">{fmt(run.totalNet)}</td>
                  <td className="px-5 py-3 text-right text-xs text-blue-700 tabular-nums">{fmt(run.totalCost)}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-700">✓ Genomförd</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-text-muted">{run.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>{/* /overflow-x-auto */}
        </div>
      </div>
    </div>
  )
}
