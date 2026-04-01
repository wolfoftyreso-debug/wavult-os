// ─── Git Routes ────────────────────────────────────────────────────────────────
// GET /api/git/repos                         — GitHub + Gitea repos
// GET /api/git/repos/:fullName/commits       — commits for a repo
// GET /api/git/actions/:fullName             — GitHub Actions runs
// Source is specified via ?source=github|gitea query param

import { Router, Request, Response } from 'express'

const router = Router()

const GITHUB_API = 'https://api.github.com'
const GITEA_API = process.env.GITEA_URL ? `${process.env.GITEA_URL}/api/v1` : 'https://git.wavult.com/api/v1'

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'wavult-os/1.0',
  }
  if (process.env.GITHUB_TOKEN) h['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

function giteaHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'wavult-os/1.0',
  }
  if (process.env.GITEA_TOKEN) h['Authorization'] = `token ${process.env.GITEA_TOKEN}`
  return h
}

// ─── GET /api/git/repos ───────────────────────────────────────────────────────

router.get('/api/git/repos', async (req: Request, res: Response) => {
  const source = (req.query.source as string) ?? 'github'

  try {
    if (source === 'github') {
      const response = await fetch(`${GITHUB_API}/user/repos?sort=pushed&per_page=50&type=all`, {
        headers: githubHeaders(),
      })
      if (!response.ok) {
        return res.status(response.status).json({ error: `GitHub API: ${response.statusText}` })
      }
      const data = await response.json() as Array<{
        id: number; name: string; full_name: string; html_url: string;
        default_branch: string; pushed_at: string; private: boolean;
      }>
      const repos = data.map(r => ({
        id: String(r.id),
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        defaultBranch: r.default_branch,
        pushedAt: r.pushed_at,
        source: 'github',
        private: r.private,
      }))
      return res.json({ repos })
    }

    if (source === 'gitea') {
      const response = await fetch(`${GITEA_API}/repos/search?limit=50&sort=newest`, {
        headers: giteaHeaders(),
      })
      if (!response.ok) {
        return res.status(response.status).json({ error: `Gitea API: ${response.statusText}` })
      }
      const data = await response.json() as { data: Array<{
        id: number; name: string; full_name: string; html_url: string;
        default_branch: string; updated: string; private: boolean;
      }> }
      const repos = (data.data ?? []).map(r => ({
        id: String(r.id),
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        defaultBranch: r.default_branch,
        pushedAt: r.updated,
        source: 'gitea',
        private: r.private,
      }))
      return res.json({ repos })
    }

    return res.status(400).json({ error: 'Ogiltig source — använd github eller gitea' })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Serverfel' })
  }
})

// ─── GET /api/git/repos/:owner/:repo/commits ─────────────────────────────────

router.get('/api/git/repos/:owner/:repo/commits', async (req: Request, res: Response) => {
  const { owner, repo } = req.params
  const source = (req.query.source as string) ?? 'github'
  const fullName = `${owner}/${repo}`

  try {
    if (source === 'github') {
      const response = await fetch(`${GITHUB_API}/repos/${fullName}/commits?per_page=20`, {
        headers: githubHeaders(),
      })
      if (!response.ok) return res.status(response.status).json({ error: `GitHub: ${response.statusText}` })
      const data = await response.json() as Array<{
        sha: string;
        commit: { message: string; author: { name: string; date: string } };
      }>
      const commits = data.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
      }))
      return res.json({ commits })
    }

    if (source === 'gitea') {
      const response = await fetch(`${GITEA_API}/repos/${fullName}/git/commits?limit=20`, {
        headers: giteaHeaders(),
      })
      if (!response.ok) return res.status(response.status).json({ error: `Gitea: ${response.statusText}` })
      const data = await response.json() as Array<{
        sha: string; RepoCommit: { message: string; author: { name: string; date: string } }
      }>
      const commits = (Array.isArray(data) ? data : []).map(c => ({
        sha: c.sha ?? '',
        message: c.RepoCommit?.message ?? '',
        author: c.RepoCommit?.author?.name ?? '',
        date: c.RepoCommit?.author?.date ?? '',
      }))
      return res.json({ commits })
    }

    return res.status(400).json({ error: 'Ogiltig source' })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Serverfel' })
  }
})

// ─── GET /api/git/actions/:owner/:repo ───────────────────────────────────────

router.get('/api/git/actions/:owner/:repo', async (req: Request, res: Response) => {
  const { owner, repo } = req.params
  const fullName = `${owner}/${repo}`

  if (!process.env.GITHUB_TOKEN) {
    return res.json({ runs: [] })
  }

  try {
    const response = await fetch(`${GITHUB_API}/repos/${fullName}/actions/runs?per_page=10`, {
      headers: githubHeaders(),
    })
    if (!response.ok) {
      if (response.status === 404) return res.json({ runs: [] })
      return res.status(response.status).json({ error: `GitHub Actions: ${response.statusText}` })
    }
    const data = await response.json() as {
      workflow_runs: Array<{
        id: number; name: string; status: string; conclusion: string | null;
        created_at: string; html_url: string;
      }>
    }
    const runs = (data.workflow_runs ?? []).map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      createdAt: r.created_at,
      htmlUrl: r.html_url,
    }))
    return res.json({ runs })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Serverfel' })
  }
})

export default router
