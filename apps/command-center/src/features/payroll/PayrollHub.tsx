import { useState } from 'react'
import { useEntityScope } from '../../shared/scope/EntityScopeContext'
import { PayrollOverview } from './PayrollOverview'
import { EmployeeList } from './EmployeeList'
import { PayslipView } from './PayslipView'
import { PayrollRun } from './PayrollRun'
import { TaxComplianceView } from './TaxComplianceView'
import { LeaveView } from './LeaveView'

type Tab = 'overview' | 'employees' | 'payslips' | 'run' | 'tax' | 'leave'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Översikt',                icon: '📊' },
  { id: 'employees',  label: 'Anställda',               icon: '👤' },
  { id: 'payslips',   label: 'Lönespecar',              icon: '📄' },
  { id: 'run',        label: 'Lönekörning',             icon: '▶' },
  { id: 'tax',        label: 'Skatt & Arbetsgivaravg.', icon: '🏛' },
  { id: 'leave',      label: 'Semester & Ledighet',     icon: '🌴' },
]

export function PayrollHub() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const { activeEntity } = useEntityScope()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="px-6 pt-6 pb-0 flex-shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Lön & Personal</h1>
        <p className="text-sm text-gray-600 mt-1">{activeEntity.shortName} — 5 anställda · Skattetabell 33 · Arbetsgivaravgift 31.42%</p>

        {/* Tab bar */}
        <div className="flex gap-1 mt-4 border-b border-surface-border overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-9000 hover:text-gray-600 hover:border-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'overview'  && <PayrollOverview />}
        {activeTab === 'employees' && <EmployeeList />}
        {activeTab === 'payslips'  && <PayslipView />}
        {activeTab === 'run'       && <PayrollRun />}
        {activeTab === 'tax'       && <TaxComplianceView />}
        {activeTab === 'leave'     && <LeaveView />}
      </div>
    </div>
  )
}
