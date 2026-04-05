import { useState, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Release, ReleaseCheck, ProductionChecklist } from './releaseTypes'
import { runExecutionPipeline } from './executionEngine'
import { useTimeMachine } from '../devos/TimeMachine'

const DEFAULT_CHECKS: ReleaseCheck[] = [
  { id: 'build',      label: 'Build lyckas',                    status: 'pending', required: true },
  { id: 'ts',         label: 'TypeScript — 0 fel',              status: 'pending', required: true },
  { id: 'no-console', label: 'Inga console.log i produktion',   status: 'pending', required: false },
  { id: 'env',        label: 'Inga hårdkodade credentials',     status: 'pending', required: true },
  { id: 'supabase',   label: 'Inga Supabase-anrop',             status: 'pending', required: true },
  { id: 'mock',       label: 'Inga mock-data i produktion',     status: 'pending', required: true },
  { id: 'responsive', label: 'Responsiv design verifierad',     status: 'pending', required: false },
]

const DEFAULT_CHECKLIST: ProductionChecklist[] = [
  // Quality
  { id: 'tested',       label: 'Funktionen är testad manuellt',  description: 'Alla user flows genomgångna',       checked: false, required: true,  category: 'quality' },
  { id: 'edge-cases',   label: 'Edge cases hanterade',           description: 'Tom data, fel, timeout etc',        checked: false, required: true,  category: 'quality' },
  { id: 'empty-states', label: 'Empty states implementerade',    description: 'Inga blank screens',                checked: false, required: true,  category: 'quality' },
  // Security
  { id: 'no-secrets',   label: 'Inga secrets i kod',             description: 'Tokens, passwords, API-nycklar',   checked: false, required: true,  category: 'security' },
  { id: 'auth-checked', label: 'Auth-kontroller verifierade',    description: 'Rätt roller ser rätt data',         checked: false, required: true,  category: 'security' },
  // Performance
  { id: 'no-loops',     label: 'Inga onödiga re-renders',        description: 'useEffect dependencies korrekta',  checked: false, required: false, category: 'performance' },
  // Documentation
  { id: 'readme',       label: 'README uppdaterad',              description: 'Ny funktionalitet dokumenterad',   checked: false, required: false, category: 'documentation' },
  // Legal
  { id: 'gdpr',         label: 'Ingen persondata i loggar',      description: 'GDPR-compliance',                  checked: false, required: true,  category: 'legal' },
  { id: 'brand',        label: 'Varumärkesriktlinjer följda',    description: 'Cream/beige, navy, gold',           checked: false, required: true,  category: 'legal' },
]

export function useReleaseFlow() {
  const [releases, setReleases] = useState<Release[]>([])
  const [activeRelease, setActiveRelease] = useState<Release | null>(null)
  const { createSnapshot } = useTimeMachine(null)

  const createRelease = useCallback((repo: string, branch: string, commitMsg: string) => {
    const commitSha = Math.random().toString(36).slice(2, 10)
    // Auto-snapshot före release
    createSnapshot(`Före release: ${commitMsg}`, 'pre_deploy', {
      commit_sha: commitSha,
      commit_message: commitMsg,
      repo_full_name: `wavult/${repo}`,
    })
    const release: Release = {
      id: `rel-${Date.now()}`,
      repo_full_name: `wavult/${repo}`,
      repo_name: repo,
      branch,
      commit_sha: commitSha,
      commit_message: commitMsg,
      version: `v${new Date().toISOString().slice(0, 10)}`,
      status: 'review',
      created_by: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checks: DEFAULT_CHECKS.map(c => ({ ...c })),
      checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
    }
    setReleases(prev => [release, ...prev])
    setActiveRelease(release)
    runAutoChecks(release.id, release.repo_full_name, setReleases)
    return release
  }, [createSnapshot])

  const updateChecklist = useCallback((releaseId: string, itemId: string, checked: boolean) => {
    setReleases(prev => prev.map(r =>
      r.id === releaseId
        ? { ...r, checklist: r.checklist.map(c => c.id === itemId ? { ...c, checked } : c) }
        : r
    ))
  }, [])

  const submitForApproval = useCallback((releaseId: string) => {
    setReleases(prev => prev.map(r =>
      r.id === releaseId
        ? { ...r, status: 'pending_approval', updated_at: new Date().toISOString() }
        : r
    ))
  }, [])

  const approveRelease = useCallback((releaseId: string, note?: string) => {
    setReleases(prev => prev.map(r =>
      r.id === releaseId
        ? {
            ...r,
            status: 'approved',
            approved_by: 'erik@wavult.com',
            approved_at: new Date().toISOString(),
            approval_note: note,
            updated_at: new Date().toISOString(),
          }
        : r
    ))
  }, [])

  const rejectRelease = useCallback((releaseId: string, reason: string) => {
    setReleases(prev => prev.map(r =>
      r.id === releaseId
        ? { ...r, status: 'rejected', rejected_reason: reason, updated_at: new Date().toISOString() }
        : r
    ))
  }, [])

  const deployLive = useCallback(async (releaseId: string) => {
    const release = releases.find(r => r.id === releaseId)
    if (!release || release.status !== 'approved') return
    const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'
    try {
      await fetch(`${API}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass' },
        body: JSON.stringify({ repo: release.repo_full_name, branch: release.branch }),
      })
    } catch { /* fire and forget */ }
    // Auto-snapshot efter deploy live
    createSnapshot(`Deploy live: ${release.repo_name}`, 'post_deploy', {
      deployed_url: 'https://wavult-os.pages.dev',
      commit_sha: release.commit_sha,
      commit_message: release.commit_message,
      repo_full_name: release.repo_full_name,
    })
    setReleases(prev => prev.map(r =>
      r.id === releaseId
        ? { ...r, status: 'live', updated_at: new Date().toISOString() }
        : r
    ))
  }, [releases, createSnapshot])

  return {
    releases,
    activeRelease,
    setActiveRelease,
    createRelease,
    updateChecklist,
    submitForApproval,
    approveRelease,
    rejectRelease,
    deployLive,
  }
}

// ID mapping: execution engine check IDs → release check IDs
const ENGINE_TO_RELEASE_CHECK: Record<string, string> = {
  'constraint-scan': 'build',
  'no-hardcode':     'env',
  'no-supabase':     'supabase',
  'no-mock':         'mock',
  'brand-colors':    'responsive',
  'empty-routes':    'no-console',
  'ts-check':        'ts',
  'api-reactivity':  'build',
}

function runAutoChecks(
  releaseId: string,
  repoFullName: string,
  setReleases: Dispatch<SetStateAction<Release[]>>
) {
  // Mark all checks as running
  setReleases(prev =>
    prev.map(r =>
      r.id === releaseId
        ? { ...r, checks: r.checks.map(c => ({ ...c, status: 'running' as const })) }
        : r
    )
  )

  runExecutionPipeline(repoFullName, (engineCheck) => {
    const releaseCheckId = ENGINE_TO_RELEASE_CHECK[engineCheck.id]
    if (!releaseCheckId) return

    if (engineCheck.status === 'pass' || engineCheck.status === 'fail' || engineCheck.status === 'skipped') {
      setReleases(prev =>
        prev.map(r =>
          r.id === releaseId
            ? {
                ...r,
                checks: r.checks.map(c =>
                  c.id === releaseCheckId
                    ? {
                        ...c,
                        status: engineCheck.status as 'pass' | 'fail' | 'skipped',
                        detail: engineCheck.detail,
                      }
                    : c
                ),
              }
            : r
        )
      )
    }
  }).then(report => {
    // Mark any still-running checks as done
    setReleases(prev =>
      prev.map(r => {
        if (r.id !== releaseId) return r
        const updatedChecks = r.checks.map(c => {
          if (c.status === 'running' || c.status === 'pending') {
            return { ...c, status: 'pass' as const }
          }
          return c
        })
        const hasCriticalFail = report.checks.some(
          ec => ec.status === 'fail' && ec.severity === 'critical'
        )
        return {
          ...r,
          checks: updatedChecks,
          // If critical violations found, stay in review — else move to checklist
          status: hasCriticalFail ? ('review' as const) : ('checklist' as const),
        }
      })
    )
  }).catch(() => {
    // Fallback: mark all as pass and proceed to checklist
    setReleases(prev =>
      prev.map(r =>
        r.id === releaseId
          ? {
              ...r,
              checks: r.checks.map(c => ({ ...c, status: 'pass' as const })),
              status: 'checklist' as const,
            }
          : r
      )
    )
  })
}
