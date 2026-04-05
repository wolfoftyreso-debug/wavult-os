import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

interface Agent {
  role: string
  name: string
  title: string
  emoji: string
  domain: string
  expertise: string[]
  permissions: string[]
}

const AGENT_COLORS: Record<string, string> = {
  planner:        '#8B5CF6',
  architect:      '#3B82F6',
  coder_frontend: '#10B981',
  coder_backend:  '#F59E0B',
  reviewer:       '#0A3D62',
  security:       '#EF4444',
  devops:         '#6B7280',
  debugger:       '#EC4899',
}

export function DynastyAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [invoking, setInvoking] = useState<string | null>(null)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState<Record<string, string>>({})
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  React.useEffect(() => {
    fetch(`${API}/api/dynasty/agents`, {
      headers: { Authorization: 'Bearer bypass' },
    })
      .then(r => r.json())
      .then((d: { agents?: Agent[] }) => setAgents(d.agents ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }, [])

  async function invokeAgent(role: string, message: string) {
    setInvoking(role)
    try {
      const res = await fetch(`${API}/api/dynasty/agents/${role}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer bypass',
        },
        body: JSON.stringify({ message }),
      })
      const data = await res.json() as { output?: string; error?: string }
      setTestOutput(prev => ({ ...prev, [role]: data.output ?? data.error ?? 'No response' }))
    } catch {
      setTestOutput(prev => ({ ...prev, [role]: 'Agent offline' }))
    }
    setInvoking(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-gray-400">
        Laddar Dynasty agents...
      </div>
    )
  }

  const selected = agents.find(a => a.role === selectedAgent)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#0A3D62]">Dynasty Agents</h2>
          <p className="text-xs text-gray-400">
            {agents.length} dedikerade experter · Varje agent är en djup specialist
          </p>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map(agent => {
          const color = AGENT_COLORS[agent.role] ?? '#6B7280'
          const isSelected = selectedAgent === agent.role
          return (
            <div
              key={agent.role}
              onClick={() => setSelectedAgent(isSelected ? null : agent.role)}
              className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2' : ''
              }`}
              style={{
                borderColor: color + '40',
                background: color + '08',
                ...(isSelected ? { outline: `2px solid ${color}` } : {}),
              }}
            >
              <div className="text-2xl mb-2">{agent.emoji}</div>
              <div className="font-bold text-sm text-gray-800">{agent.name}</div>
              <div className="text-[10px] font-semibold mt-0.5" style={{ color }}>
                {agent.title}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{agent.domain}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {agent.expertise.slice(0, 3).map(e => (
                  <span
                    key={e}
                    className="text-[8px] px-1.5 py-0.5 rounded-full"
                    style={{ background: color + '15', color }}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Test panel */}
      {selectedAgent && selected && (
        <div className="rounded-xl border border-[#E8E0D0] bg-[#FDFAF5] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{selected.emoji}</span>
            <div className="font-bold text-sm text-[#0A3D62]">Testa {selected.name}</div>
          </div>
          <textarea
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            rows={3}
            className="w-full text-xs border border-[#E8E0D0] rounded-lg px-3 py-2 bg-white resize-none mb-2 focus:outline-none focus:ring-1 focus:ring-[#0A3D62]"
            placeholder={`Skriv ett meddelande till ${selected.name}...`}
          />
          <button
            onClick={() => invokeAgent(selectedAgent, testInput)}
            disabled={invoking === selectedAgent || !testInput.trim()}
            className="px-4 py-2 bg-[#0A3D62] text-[#F5F0E8] text-xs font-bold rounded-lg hover:bg-[#072E4A] disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {invoking === selectedAgent ? (
              <span className="animate-spin inline-block">⟳</span>
            ) : (
              '▶'
            )}
            {invoking === selectedAgent ? 'Agenten tänker...' : 'Skicka'}
          </button>
          {testOutput[selectedAgent] && (
            <pre className="mt-3 text-[11px] bg-white border border-[#E8E0D0] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono text-gray-700">
              {testOutput[selectedAgent]}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
