// ─── Wavult OS — Database Manager ────────────────────────────────────────────
// SQL editor + table browser for all Wavult databases
// SELECT-only query execution, sortable results, copy output

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react'
import { Database, ChevronRight, ChevronDown, Play, Copy, Check, RefreshCw, AlertCircle, Table } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBTable {
  name: string
  rowCount: number | null
}

interface DBEntry {
  name: string
  tables: DBTable[]
  status: 'online' | 'offline' | 'unknown'
}

interface QueryResult {
  rows: Record<string, unknown>[]
  fields: string[]
  duration_ms: number
  error?: string
}

type SortDir = 'asc' | 'desc'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: DBEntry['status'] }) {
  const color = status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : '#6b7280'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '∅'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

// ─── DatabaseManager ─────────────────────────────────────────────────────────

export function DatabaseManager() {
  const [databases, setDatabases] = useState<DBEntry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedDb, setSelectedDb] = useState<string>('')
  const [query, setQuery] = useState('SELECT * FROM information_schema.tables\nWHERE table_schema = \'public\'\nLIMIT 20;')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [running, setRunning] = useState(false)
  const [loadingDbs, setLoadingDbs] = useState(true)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch databases
  const fetchDbs = useCallback(async () => {
    setLoadingDbs(true)
    try {
      const res = await fetch('/api/admin/databases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDatabases(data.databases ?? [])
      if (!selectedDb && data.databases?.length > 0) {
        setSelectedDb(data.databases[0].name)
        setExpanded(new Set([data.databases[0].name]))
      }
    } catch {
      // leave empty
    } finally {
      setLoadingDbs(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDbs() }, [fetchDbs])

  // Run query
  const runQuery = useCallback(async () => {
    if (!query.trim() || !selectedDb) return
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db: selectedDb, query: query.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ rows: [], fields: [], duration_ms: 0, error: data.error ?? `HTTP ${res.status}` })
      } else {
        setResult(data)
      }
    } catch (e: unknown) {
      setResult({ rows: [], fields: [], duration_ms: 0, error: e instanceof Error ? e.message : 'Nätverksfel' })
    } finally {
      setRunning(false)
    }
  }, [query, selectedDb])

  // Ctrl+Enter to run
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      runQuery()
    }
  }

  // Sort rows
  const sortedRows = (() => {
    if (!result?.rows || !sortCol) return result?.rows ?? []
    return [...result.rows].sort((a, b) => {
      const av = formatCellValue(a[sortCol])
      const bv = formatCellValue(b[sortCol])
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  })()

  // Copy results as TSV
  const copyResults = async () => {
    if (!result?.rows?.length) return
    const header = result.fields.join('\t')
    const body = result.rows.map(r => result.fields.map(f => formatCellValue(r[f])).join('\t')).join('\n')
    await navigator.clipboard.writeText(header + '\n' + body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Toggle table → load table query
  const selectTable = (dbName: string, tableName: string) => {
    setSelectedDb(dbName)
    setQuery(`SELECT *\nFROM ${tableName}\nLIMIT 50;`)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-base">Database</span>
        </div>
        <div className="flex items-center gap-2">
          {/* DB picker */}
          <select
            value={selectedDb}
            onChange={e => setSelectedDb(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer',
            }}
          >
            {databases.map(db => (
              <option key={db.name} value={db.name}>{db.name}</option>
            ))}
          </select>
          <button
            onClick={runQuery}
            disabled={running || !query.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
              background: running ? 'rgba(59,130,246,0.2)' : '#3b82f6', border: 'none', borderRadius: 6,
              fontSize: 12, fontWeight: 600, color: '#fff', cursor: running ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Kör
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left — tree */}
        <div
          className="flex flex-col border-r overflow-y-auto"
          style={{ width: 220, borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
        >
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
              Databaser
            </span>
            <button onClick={fetchDbs} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 2 }}>
              <RefreshCw className={`w-3 h-3 ${loadingDbs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {databases.map(db => {
            const isOpen = expanded.has(db.name)
            const isSelected = selectedDb === db.name
            return (
              <div key={db.name}>
                <button
                  onClick={() => {
                    setSelectedDb(db.name)
                    setExpanded(prev => {
                      const next = new Set(prev)
                      isOpen ? next.delete(db.name) : next.add(db.name)
                      return next
                    })
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                    width: '100%', background: isSelected ? 'rgba(59,130,246,0.12)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                  }}
                >
                  {isOpen ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                           : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />}
                  <StatusDot status={db.status} />
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#93c5fd' : 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {db.name}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ paddingLeft: 20 }}>
                    {db.tables.map(t => (
                      <button
                        key={t.name}
                        onClick={() => selectTable(db.name, t.name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <Table className="w-3 h-3 flex-shrink-0" style={{ color: '#3b82f6', opacity: 0.7 }} />
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.name}
                        </span>
                        {t.rowCount != null && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{t.rowCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right — editor + results */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* SQL Editor */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 12, flex: '0 0 auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
              SQL Editor
            </div>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              rows={5}
              style={{
                width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6, padding: '8px 12px', fontSize: 13, fontFamily: 'ui-monospace, monospace',
                color: '#e2e8f0', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
              }}
              placeholder="SELECT * FROM table LIMIT 10; -- Ctrl+Enter för att köra"
              spellCheck={false}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              Ctrl+Enter för att köra · Endast SELECT (ingen destruktiv SQL)
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto p-3">
            {!result ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Kör en query för att se resultat</div>
            ) : result.error ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f87171' }}>Fel</div>
                  <div style={{ fontSize: 12, color: '#fca5a5', fontFamily: 'monospace', marginTop: 2 }}>{result.error}</div>
                </div>
              </div>
            ) : (
              <div>
                {/* Results meta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {result.rows.length} rader · {result.duration_ms}ms
                  </span>
                  <button
                    onClick={copyResults}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, fontSize: 11, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Kopierat' : 'Kopiera'}
                  </button>
                </div>

                {result.rows.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Inga rader returnerades</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {result.fields.map(f => (
                            <th
                              key={f}
                              onClick={() => {
                                if (sortCol === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                                else { setSortCol(f); setSortDir('asc') }
                              }}
                              style={{
                                padding: '6px 10px', textAlign: 'left', fontWeight: 700, cursor: 'pointer',
                                color: sortCol === f ? '#93c5fd' : 'var(--color-text-tertiary)',
                                userSelect: 'none', whiteSpace: 'nowrap',
                                background: 'rgba(0,0,0,0.2)',
                              }}
                            >
                              {f} {sortCol === f ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, i) => (
                          <tr
                            key={i}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                          >
                            {result.fields.map(f => (
                              <td
                                key={f}
                                style={{
                                  padding: '5px 10px', color: 'var(--color-text-secondary)',
                                  maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}
                                title={formatCellValue(row[f])}
                              >
                                {formatCellValue(row[f])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
