// ─── Wavult OS — Git Hub (GitHub + Gitea unified) ────────────────────────────
// Unified repository browser with Actions status, commit history, branch view

import { useState, useEffect, useCallback } from 'react'
import {
  GitBranch, GitCommit, GitMerge, RefreshCw, ExternalLink,
  Plus, CheckCircle, Clock, XCircle, AlertCircle, Zap,
  ChevronRight, Activity,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type RepoSource = 'github' | 'gitea'

interface Repo {
  id: string
  name: string
  fullName: string
  url: string
  defaultBranch: string
  pushedAt: string | null
  source: RepoSource
  private: boolean
}

interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

interface ActionRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  createdAt: string
  htmlUrl: string
}

interface RepoDetail {
  repo: Repo
  commits: Commit[]
  runs: ActionRun[]
  loading: boolean
  error: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (h < 1) return 'just nu'
  if (h < 24) return `${h}h sedan`
  if (d < 7) return `${d}d sedan`
  return new Date(dateStr).toLocaleDateString('sv-SE')
}

function repoStatus(pushedAt: string | null): 'green' | 'yellow' | 'gray' {
  if (!pushedAt) return 'gray'
  const days = (Date.now() - new Date(pushedAt).getTime()) / 86_400_000
  if (days <= 7) return 'green'
  if (days <= 30) return 'yellow'
  return 'gray'
}

function statusDot(color: 'green' | 'yellow' | 'gray' | 'red') {
  const map = { green: '#22c55e', yellow: '#eab308', gray: '#6b7280', red: '#ef4444' }
  return (
    <span
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: map[color], flexShrink: 0,
      }}
    />
  )
}

function conclusionIcon(conclusion: string | null, status: string) {
  if (status === 'in_progress' || status === 'queued') return <Activity className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
  if (conclusion === 'success') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />
  if (conclusion === 'failure') return <XCircle className="w-3.5 h-3.5 text-red-400" />
  return <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
}

// ─── GitHub ──────────────────────────────────────────────────────────────────

export function GitHub() {
  const [source, setSource] = useState<RepoSource>('github')
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [detail, setDetail] = useState<RepoDetail | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  // Fetch repo list
  const fetchRepos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/git/repos?source=${source}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRepos(data.repos ?? [])
      if (!selectedRepo && data.repos?.length > 0) {
        setSelectedRepo(data.repos[0].name)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [source]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch repo detail (commits + Actions)
  const fetchDetail = useCallback(async (repoName: string) => {
    const repo = repos.find(r => r.name === repoName)
    if (!repo) return
    setDetail({ repo, commits: [], runs: [], loading: true, error: null })
    try {
      const [commitsRes, actionsRes] = await Promise.all([
        fetch(`/api/git/repos/${encodeURIComponent(repo.fullName)}/commits?source=${source}`),
        fetch(`/api/git/actions/${encodeURIComponent(repo.fullName)}?source=${source}`),
      ])
      const commits = commitsRes.ok ? (await commitsRes.json()).commits ?? [] : []
      const runs = actionsRes.ok ? (await actionsRes.json()).runs ?? [] : []
      setDetail({ repo, commits, runs, loading: false, error: null })
    } catch (e: unknown) {
      setDetail(d => d ? { ...d, loading: false, error: e instanceof Error ? e.message : 'Error' } : null)
    }
  }, [repos, source])

  useEffect(() => { fetchRepos() }, [fetchRepos, lastRefresh])

  useEffect(() => {
    if (selectedRepo && repos.length > 0) fetchDetail(selectedRepo)
  }, [selectedRepo, repos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 30s
  useEffect(() => {
    const t = setInterval(() => setLastRefresh(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const selectedRepoData = repos.find(r => r.name === selectedRepo)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <GitMerge className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-base">Git</span>
          <div className="flex gap-1">
            {(['github', 'gitea'] as RepoSource[]).map(s => (
              <button
                key={s}
                onClick={() => { setSource(s); setSelectedRepo(null) }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background: source === s ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)',
                  color: source === s ? '#fff' : 'var(--color-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {s === 'github' ? 'GitHub' : 'Gitea'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLastRefresh(Date.now())}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {source === 'github' && (
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none', cursor: 'pointer',
              }}
            >
              <Plus className="w-3 h-3" /> Nytt repo
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left — repo list */}
        <div
          className="flex flex-col border-r overflow-y-auto"
          style={{ width: 220, borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
        >
          <div className="px-3 pt-3 pb-1" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
            Repos
          </div>
          {error && (
            <div className="px-3 py-2" style={{ fontSize: 12, color: '#ef4444' }}>
              {error}
            </div>
          )}
          {loading && !repos.length && (
            <div className="px-3 py-2" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Hämtar…
            </div>
          )}
          {repos.map(repo => {
            const st = repoStatus(repo.pushedAt)
            const isActive = selectedRepo === repo.name
            return (
              <button
                key={repo.id}
                onClick={() => setSelectedRepo(repo.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                  background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                {statusDot(st)}
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#c4b5fd' : 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {repo.name}
                </span>
                <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)', opacity: isActive ? 1 : 0 }} />
              </button>
            )
          })}
        </div>

        {/* Right — detail */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedRepo || !detail ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Välj ett repo</div>
          ) : (
            <>
              {/* Repo header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-violet-400" />
                  <span className="font-semibold" style={{ fontSize: 15 }}>{detail.repo.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-tertiary)' }}>
                    {detail.repo.defaultBranch}
                  </span>
                </div>
                <a
                  href={detail.repo.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-tertiary)', textDecoration: 'none' }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Öppna
                </a>
              </div>

              {/* Commits */}
              <div>
                <div
                  className="px-3 py-1.5 rounded-t"
                  style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  Commits — {detail.repo.defaultBranch}
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                  {detail.loading ? (
                    <div className="px-3 py-3" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Hämtar…</div>
                  ) : detail.commits.length === 0 ? (
                    <div className="px-3 py-3" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Inga commits</div>
                  ) : detail.commits.slice(0, 8).map((c, i) => (
                    <div
                      key={c.sha}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        background: 'rgba(0,0,0,0.15)',
                      }}
                    >
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-tertiary)', flexShrink: 0, width: 52 }}>
                        {c.sha.slice(0, 7)}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.message.split('\n')[0]}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                        {relativeTime(c.date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GitHub Actions */}
              {source === 'github' && (
                <div>
                  <div
                    className="px-3 py-1.5 rounded-t"
                    style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    GitHub Actions
                  </div>
                  <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                    {detail.loading ? (
                      <div className="px-3 py-3" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Hämtar…</div>
                    ) : detail.runs.length === 0 ? (
                      <div className="px-3 py-3" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Inga Actions-körningar</div>
                    ) : detail.runs.slice(0, 6).map((run, i) => (
                      <div
                        key={run.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                          borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          background: 'rgba(0,0,0,0.15)',
                        }}
                      >
                        {conclusionIcon(run.conclusion, run.status)}
                        <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {run.name}
                        </span>
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                          background: run.conclusion === 'success' ? 'rgba(34,197,94,0.15)' : run.conclusion === 'failure' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                          color: run.conclusion === 'success' ? '#22c55e' : run.conclusion === 'failure' ? '#ef4444' : '#eab308',
                        }}>
                          {run.conclusion ?? run.status}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                          {relativeTime(run.createdAt)}
                        </span>
                        <a href={run.htmlUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-tertiary)' }}>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last push */}
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock className="w-3.5 h-3.5" />
                Senaste push: {relativeTime(selectedRepoData?.pushedAt ?? null)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
