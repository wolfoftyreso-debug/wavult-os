/**
 * Code — Lovable-liknande AI-kodredigerare inbyggd i Wavult OS
 * 3-kolumns layout: Chat | Editor | Preview
 * Kopplad mot Gitea repos med topics status-dev / in-development
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Terminal, GitBranch, RefreshCw, ChevronRight, ChevronDown,
  File, Folder, Send, Check, GitCommit, Play, AlertCircle, Loader2,
  Download, Upload, Rocket,
} from 'lucide-react'
import JSZip from 'jszip'
import { useGiteaRepos, GiteaRepo } from '../git/useGiteaRepos'
import { useReleaseFlow } from './useReleaseFlow'
import { ReleasePipeline } from './ReleasePipeline'

// ─── Constants ────────────────────────────────────────────────────────────────

const GITEA_URL = import.meta.env.VITE_GITEA_URL ?? 'https://git.wavult.com'
const GITEA_TOKEN = import.meta.env.VITE_GITEA_TOKEN ?? ''
const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CodeContext {
  repoFullName: string
  currentFile: string | null
  currentContent: string | null
  fileTree: string[]
}

interface CodeResponse {
  message: string
  changes?: Array<{
    path: string
    content: string
    action: 'create' | 'update' | 'delete'
  }>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  changes?: CodeResponse['changes']
}

interface GiteaTreeEntry {
  path: string
  type: 'blob' | 'tree'
  mode: string
  sha: string
  size?: number
  url: string
}

// ─── Gitea API helpers ────────────────────────────────────────────────────────

async function getTreeRecursive(repoFullName: string): Promise<string[]> {
  const res = await fetch(
    `${GITEA_URL}/api/v1/repos/${repoFullName}/git/trees/HEAD?recursive=true`,
    { headers: { Authorization: `token ${GITEA_TOKEN}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.tree as GiteaTreeEntry[])
    .filter(e => e.type === 'blob')
    .map(e => e.path)
    .slice(0, 200)
}

async function getFileContent(repoFullName: string, filePath: string): Promise<string> {
  const res = await fetch(
    `${GITEA_URL}/api/v1/repos/${repoFullName}/raw/${filePath}?token=${GITEA_TOKEN}`
  )
  if (!res.ok) throw new Error(`Gitea ${res.status}`)
  return res.text()
}

async function sendCodeChat(message: string, context: CodeContext): Promise<CodeResponse> {
  const res = await fetch(`${API}/api/code/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bypass' },
    body: JSON.stringify({
      message,
      repo: context.repoFullName,
      currentFile: context.currentFile,
      currentContent: context.currentContent,
      fileTree: context.fileTree,
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

async function commitFiles(
  repoFullName: string,
  changes: NonNullable<CodeResponse['changes']>,
  message: string
) {
  for (const change of changes) {
    const existing = await fetch(
      `${GITEA_URL}/api/v1/repos/${repoFullName}/contents/${change.path}`,
      { headers: { Authorization: `token ${GITEA_TOKEN}` } }
    )
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)

    const payload: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(change.content ?? ''))),
    }
    if (existing?.sha) payload.sha = existing.sha

    await fetch(`${GITEA_URL}/api/v1/repos/${repoFullName}/contents/${change.path}`, {
      method: existing ? 'PUT' : 'POST',
      headers: {
        Authorization: `token ${GITEA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  }
}

// ─── Syntax tokenizer (reuse from FileViewer logic) ──────────────────────────

interface Token { type: 'kw' | 'str' | 'num' | 'cmt' | 'punc' | 'plain'; value: string }

const KEYWORDS = new Set([
  'const','let','var','function','class','interface','type','enum',
  'import','export','from','return','if','else','for','while','do',
  'switch','case','break','continue','new','delete','typeof','instanceof',
  'async','await','try','catch','finally','throw','extends','implements',
  'public','private','protected','static','readonly','abstract','override',
  'default','null','undefined','true','false','void','never','any',
  'string','number','boolean','object','symbol','bigint',
])

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '/' && line[i + 1] === '/') { tokens.push({ type: 'cmt', value: line.slice(i) }); break }
    if (line[i] === '#') { tokens.push({ type: 'cmt', value: line.slice(i) }); break }
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const q = line[i]; let j = i + 1
      while (j < line.length && (line[j] !== q || line[j - 1] === '\\')) j++
      tokens.push({ type: 'str', value: line.slice(i, j + 1) }); i = j + 1; continue
    }
    if (/[0-9]/.test(line[i])) {
      let j = i
      while (j < line.length && /[0-9._]/.test(line[j])) j++
      tokens.push({ type: 'num', value: line.slice(i, j) }); i = j; continue
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i
      while (j < line.length && /[\w$]/.test(line[j])) j++
      const word = line.slice(i, j)
      tokens.push({ type: KEYWORDS.has(word) ? 'kw' : 'plain', value: word }); i = j; continue
    }
    if (/[{}()[\],;:<>=!&|+\-*/^%~?.@]/.test(line[i])) {
      tokens.push({ type: 'punc', value: line[i] }); i++; continue
    }
    tokens.push({ type: 'plain', value: line[i] }); i++
  }
  return tokens
}

const TOKEN_COLORS: Record<Token['type'], string> = {
  kw: '#0A3D62',
  str: '#2E7D32',
  num: '#E65100',
  cmt: '#9E9E9E',
  punc: '#795548',
  plain: '#212121',
}

function SyntaxLine({ line }: { line: string }) {
  const tokens = tokenizeLine(line)
  return (
    <span>
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.value}</span>
      ))}
    </span>
  )
}

// ─── File tree node ───────────────────────────────────────────────────────────

function buildTree(paths: string[]): Record<string, unknown> {
  const tree: Record<string, unknown> = {}
  for (const p of paths) {
    const parts = p.split('/')
    let node: Record<string, unknown> = tree
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = {}
      node = node[parts[i]] as Record<string, unknown>
    }
    node[parts[parts.length - 1]] = p // leaf = full path
  }
  return tree
}

function FileTreeNode({
  name,
  node,
  depth,
  onSelect,
  selectedPath,
}: {
  name: string
  node: unknown
  depth: number
  onSelect: (path: string) => void
  selectedPath: string | null
}) {
  const [open, setOpen] = useState(depth === 0)
  const isFile = typeof node === 'string'

  if (isFile) {
    return (
      <button
        onClick={() => onSelect(node as string)}
        className={`flex items-center gap-1 w-full text-left py-[2px] px-2 rounded text-xs font-mono truncate transition-colors ${
          selectedPath === node
            ? 'bg-[#0A3D62] text-white'
            : 'text-[#444] hover:bg-[#E8E0D4] hover:text-[#0A3D62]'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <File size={10} className="shrink-0 opacity-60" />
        <span className="truncate">{name}</span>
      </button>
    )
  }

  const children = node as Record<string, unknown>
  const entries = Object.entries(children).sort(([a, av], [b, bv]) => {
    const aIsDir = typeof av !== 'string'
    const bIsDir = typeof bv !== 'string'
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
    return a.localeCompare(b)
  })

  return (
    <div>
      {depth >= 0 && (
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 w-full text-left py-[2px] text-xs font-mono text-[#555] hover:text-[#0A3D62] transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {open ? <ChevronDown size={10} className="shrink-0" /> : <ChevronRight size={10} className="shrink-0" />}
          <Folder size={10} className="shrink-0 text-[#E8B84B]" />
          <span className="truncate">{name}</span>
        </button>
      )}
      {(open || depth < 0) && entries.map(([k, v]) => (
        <FileTreeNode key={k} name={k} node={v} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />
      ))}
    </div>
  )
}

// ─── ZIP helpers ─────────────────────────────────────────────────────────────

async function downloadRepoAsZip(
  repoFullName: string,
  repoName: string,
  onProgress: (msg: string) => void
) {
  onProgress('Hämtar filträd…')
  const treeRes = await fetch(
    `${GITEA_URL}/api/v1/repos/${repoFullName}/git/trees/HEAD?recursive=true`,
    { headers: { Authorization: `token ${GITEA_TOKEN}` } }
  )
  const tree = await treeRes.json()
  const zip = new JSZip()
  const folder = zip.folder(repoName)!
  const files = ((tree.tree ?? []) as { path: string; type: string }[]).filter(f => f.type === 'blob')

  let done = 0
  for (let i = 0; i < files.length; i += 10) {
    const chunk = files.slice(i, i + 10)
    await Promise.all(chunk.map(async file => {
      try {
        const res = await fetch(
          `${GITEA_URL}/api/v1/repos/${repoFullName}/raw/${file.path}`,
          { headers: { Authorization: `token ${GITEA_TOKEN}` } }
        )
        if (res.ok) {
          const content = await res.arrayBuffer()
          const pathParts = file.path.split('/')
          if (pathParts.length > 1) {
            let currentFolder = folder
            for (let j = 0; j < pathParts.length - 1; j++) {
              currentFolder = currentFolder.folder(pathParts[j])!
            }
            currentFolder.file(pathParts[pathParts.length - 1], content)
          } else {
            folder.file(file.path, content)
          }
        }
      } catch { /* skippa filer som inte kan laddas */ }
      done++
      onProgress(`Laddar filer… ${done}/${files.length}`)
    }))
  }

  onProgress('Genererar ZIP…')
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${repoName}-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
  onProgress('Klar!')
  setTimeout(() => onProgress(''), 2000)
}

// ─── Main CodeView ────────────────────────────────────────────────────────────

export function CodeView() {
  const { repoId } = useParams<{ repoId?: string }>()
  const navigate = useNavigate()

  const { data: repos = [], isLoading: reposLoading } = useGiteaRepos()
  const devRepos = repos.filter(r =>
    r.topics?.includes('status-dev') || r.topics?.includes('in-development')
  )

  const [selectedRepo, setSelectedRepo] = useState<GiteaRepo | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [appliedChanges, setAppliedChanges] = useState<NonNullable<CodeResponse['changes']>>([])
  const [committing, setCommitting] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [showCommitModal, setShowCommitModal] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)

  // View state: 'editor' | 'pipeline'
  const [view, setView] = useState<'editor' | 'pipeline'>('editor')

  // Release flow
  const {
    releases,
    activeRelease,
    setActiveRelease,
    createRelease,
    updateChecklist,
    submitForApproval,
    approveRelease,
    rejectRelease,
    deployLive,
  } = useReleaseFlow()

  // ZIP state
  const [zipProgress, setZipProgress] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-0',
      role: 'system',
      content: 'Välj ett repo för att börja. Sedan kan du beskriva vad du vill ändra så redigerar AI:n filerna.',
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // File tree
  const { data: fileTree = [], isLoading: treeLoading, refetch: refetchFileTree } = useQuery({
    queryKey: ['code-tree', selectedRepo?.full_name],
    queryFn: () => getTreeRecursive(selectedRepo!.full_name),
    enabled: !!selectedRepo,
    staleTime: 1000 * 60 * 2,
  })

  const treeData = buildTree(fileTree)

  // Auto-select repo from URL param
  useEffect(() => {
    if (repoId && repos.length > 0) {
      const found = repos.find(r => String(r.id) === repoId || r.name === repoId)
      if (found) setSelectedRepo(found)
    }
  }, [repoId, repos])

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectRepo = useCallback((repo: GiteaRepo) => {
    setSelectedRepo(repo)
    setSelectedFile(null)
    setFileContent(null)
    setAppliedChanges([])
    navigate(`/code/${repo.name}`, { replace: true })
  }, [navigate])

  const handleSelectFile = useCallback(async (path: string) => {
    if (!selectedRepo) return
    setSelectedFile(path)
    setLoadingFile(true)
    try {
      const content = await getFileContent(selectedRepo.full_name, path)
      setFileContent(content)
    } catch {
      setFileContent('// Kunde inte ladda fil')
    } finally {
      setLoadingFile(false)
    }
  }, [selectedRepo])

  const applyChange = useCallback((change: NonNullable<CodeResponse['changes']>[number]) => {
    setAppliedChanges(prev => {
      const idx = prev.findIndex(c => c.path === change.path)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = change
        return updated
      }
      return [...prev, change]
    })
    // Om den aktiva filen matchar, uppdatera editor
    if (change.path === selectedFile) {
      setFileContent(change.content)
    }
  }, [selectedFile])

  const applyAllAndCommit = useCallback(async (changes: NonNullable<CodeResponse['changes']>) => {
    changes.forEach(applyChange)
    setShowCommitModal(true)
  }, [applyChange])

  const handleCommit = useCallback(async () => {
    if (!selectedRepo || appliedChanges.length === 0) return
    setCommitting(true)
    try {
      const msg = commitMsg.trim() || 'feat: AI-generated changes via Wavult Code'
      await commitFiles(selectedRepo.full_name, appliedChanges, msg)
      setAppliedChanges([])
      setCommitMsg('')
      setShowCommitModal(false)
      setMessages(prev => [...prev, {
        id: `sys-commit-${Date.now()}`,
        role: 'system',
        content: `✅ ${appliedChanges.length} fil(er) committade till ${selectedRepo.full_name}`,
        timestamp: new Date().toISOString(),
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `sys-err-${Date.now()}`,
        role: 'system',
        content: `❌ Commit misslyckades: ${e instanceof Error ? e.message : 'okänt fel'}`,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setCommitting(false)
    }
  }, [selectedRepo, appliedChanges, commitMsg])

  const handleZipExport = useCallback(async () => {
    if (!selectedRepo) return
    try {
      await downloadRepoAsZip(selectedRepo.full_name, selectedRepo.name, msg => setZipProgress(msg || null))
    } catch (e) {
      setZipProgress(`❌ ${e instanceof Error ? e.message : 'Fel vid ZIP-export'}`)
      setTimeout(() => setZipProgress(null), 3000)
    }
  }, [selectedRepo])

  const handleZipImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedRepo) return

    setImportStatus('Läser ZIP…')
    try {
      const zip = await JSZip.loadAsync(file)
      const files: Array<{ path: string; content: string }> = []

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue
        const cleanPath = relativePath.includes('/')
          ? relativePath.split('/').slice(1).join('/')
          : relativePath
        if (!cleanPath) continue
        const content = await zipEntry.async('text')
        files.push({ path: cleanPath, content })
      }

      setImportStatus(`Laddar upp ${files.length} filer till Gitea…`)
      let uploaded = 0

      for (const f of files) {
        try {
          const existing = await fetch(
            `${GITEA_URL}/api/v1/repos/${selectedRepo.full_name}/contents/${f.path}`,
            { headers: { Authorization: `token ${GITEA_TOKEN}` } }
          ).then(r => r.json()).catch(() => null)

          const payload: Record<string, unknown> = {
            message: `Upload from ZIP: ${f.path}`,
            content: btoa(unescape(encodeURIComponent(f.content))),
            committer: { name: 'Wavult OS', email: 'os@wavult.com' },
          }
          if (existing?.sha) payload.sha = existing.sha

          await fetch(
            `${GITEA_URL}/api/v1/repos/${selectedRepo.full_name}/contents/${f.path}`,
            {
              method: existing?.sha ? 'PUT' : 'POST',
              headers: {
                Authorization: `token ${GITEA_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          )
          uploaded++
          setImportStatus(`Laddar upp ${uploaded}/${files.length}…`)
        } catch { /* skippa filer med problem */ }
      }

      setImportStatus(`✅ ${uploaded} filer uppladdade till ${selectedRepo.name}`)
      setTimeout(() => {
        setImportStatus(null)
        refetchFileTree()
      }, 2000)
    } catch (err) {
      setImportStatus(`❌ ${err instanceof Error ? err.message : 'Fel vid import'}`)
      setTimeout(() => setImportStatus(null), 3000)
    }

    e.target.value = ''
  }, [selectedRepo, refetchFileTree])

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    if (!selectedRepo) {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Välj ett repo först innan du chattar.',
        timestamp: new Date().toISOString(),
      }])
      setSending(false)
      return
    }

    try {
      const ctx: CodeContext = {
        repoFullName: selectedRepo.full_name,
        currentFile: selectedFile,
        currentContent: fileContent,
        fileTree,
      }
      const response = await sendCodeChat(userMsg.content, ctx)
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        changes: response.changes,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ AI offline — kunde inte nå API. Kontrollera anslutningen och försök igen.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }, [input, sending, selectedRepo, selectedFile, fileContent, fileTree])

  const previewUrl = selectedRepo?.website || null

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#F5F0E8]">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#D8CFC4] bg-[#EDE8DF] shrink-0">
        <Terminal size={16} className="text-[#0A3D62]" />
        <span className="text-sm font-bold text-[#0A3D62] tracking-wide">Code</span>
        <span className="text-xs text-gray-400 hidden sm:block">AI-driven kodredigerare</span>

        <div className="flex-1" />

        {/* Repo selector */}
        <div className="relative">
          <select
            value={selectedRepo?.id ?? ''}
            onChange={e => {
              const repo = devRepos.find(r => String(r.id) === e.target.value)
              if (repo) handleSelectRepo(repo)
            }}
            className="text-xs border border-[#C8BFB4] rounded-md px-3 py-1.5 bg-white text-[#0A3D62] font-medium focus:outline-none focus:ring-2 focus:ring-[#0A3D62] appearance-none pr-7 cursor-pointer"
            style={{ minWidth: 180 }}
          >
            <option value="">
              {reposLoading ? 'Laddar repos...' : devRepos.length === 0 ? 'Inga dev-repos' : 'Välj repo…'}
            </option>
            {devRepos.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
            {!reposLoading && devRepos.length === 0 && repos.length > 0 && (
              <optgroup label="Alla repos">
                {repos.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* ZIP Export */}
        {selectedRepo && (
          <button
            onClick={handleZipExport}
            disabled={!!zipProgress}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#EDE8DF] text-[#0A3D62] border border-[#C8BFB4] hover:bg-[#D8CFC4] disabled:opacity-50 transition-colors"
            title="Ladda ned projekt som ZIP"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Ladda ned projekt</span>
          </button>
        )}

        {/* ZIP Import */}
        {selectedRepo && (
          <>
            <input
              type="file"
              accept=".zip"
              className="hidden"
              ref={importInputRef}
              onChange={handleZipImport}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={!!importStatus}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#EDE8DF] text-[#0A3D62] border border-[#C8BFB4] hover:bg-[#D8CFC4] disabled:opacity-50 transition-colors"
              title="Ladda upp projekt från ZIP"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">Ladda upp projekt</span>
            </button>
          </>
        )}

        {/* Commit button */}
        {appliedChanges.length > 0 && (
          <button
            onClick={() => setShowCommitModal(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#E8B84B] text-[#0A3D62] font-bold hover:bg-[#D4A53A] transition-colors"
          >
            <GitCommit size={13} />
            Commit {appliedChanges.length} fil{appliedChanges.length !== 1 ? 'er' : ''}
          </button>
        )}

        {/* Publicera button */}
        {selectedRepo && (
          <button
            onClick={() => {
              const lastMsg = commitMsg.trim() || `feat: release ${selectedRepo.name}`
              const release = createRelease(selectedRepo.name, 'main', lastMsg)
              setActiveRelease(release)
              setView('pipeline')
            }}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-md bg-[#E8B84B] text-[#0A3D62] font-bold hover:bg-[#D4A53A] transition-colors"
          >
            <Rocket size={13} />
            Publicera
          </button>
        )}
      </div>

      {/* Pipeline view overlay */}
      {view === 'pipeline' && activeRelease && (
        <div className="absolute inset-0 z-20 bg-[#F5F0E8]">
          <ReleasePipeline
            release={activeRelease}
            releases={releases}
            onBack={() => setView('editor')}
            onUpdateChecklist={updateChecklist}
            onSubmitForApproval={submitForApproval}
            onApprove={approveRelease}
            onReject={rejectRelease}
            onDeployLive={deployLive}
          />
        </div>
      )}

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Chat ── */}
        <div className="w-80 flex flex-col border-r border-[#D8CFC4] bg-[#F5F0E8] shrink-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[92%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0A3D62] text-white rounded-br-sm'
                      : msg.role === 'system'
                      ? 'bg-[#EDE8DF] text-gray-600 italic rounded-bl-sm border border-[#D8CFC4]'
                      : 'bg-white text-[#212121] rounded-bl-sm border border-[#D8CFC4] shadow-sm'
                  }`}>
                    {msg.content}
                  </div>

                  {/* AI change proposals */}
                  {msg.changes && msg.changes.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.changes.map(change => (
                        <div key={change.path} className="flex items-center justify-between p-2 rounded-lg bg-[#F5F0E8] border border-[#D8CFC4]">
                          <div className="min-w-0 flex-1">
                            <span className={`text-[9px] font-mono uppercase font-bold mr-1.5 ${
                              change.action === 'create' ? 'text-green-600' :
                              change.action === 'delete' ? 'text-red-600' : 'text-[#E8B84B]'
                            }`}>{change.action}</span>
                            <span className="text-[10px] font-mono text-[#0A3D62] truncate block">{change.path}</span>
                          </div>
                          <button
                            onClick={() => applyChange(change)}
                            disabled={appliedChanges.some(c => c.path === change.path && c.content === change.content)}
                            className="shrink-0 text-[10px] px-2 py-1 rounded bg-[#0A3D62] text-white hover:bg-[#072E4A] disabled:opacity-50 disabled:cursor-default transition-colors ml-2"
                          >
                            {appliedChanges.some(c => c.path === change.path) ? <Check size={10} /> : 'Applicera'}
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => applyAllAndCommit(msg.changes!)}
                        className="w-full text-xs py-1.5 rounded-lg bg-[#E8B84B] text-[#0A3D62] font-bold hover:bg-[#D4A53A] transition-colors"
                      >
                        Applicera alla + commit
                      </button>
                    </div>
                  )}

                  <div className="text-[9px] text-gray-400 mt-0.5 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#D8CFC4] rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-[#0A3D62]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#D8CFC4] p-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder={selectedRepo ? 'Beskriv vad du vill ändra…' : 'Välj ett repo först…'}
                disabled={!selectedRepo || sending}
                rows={2}
                className="flex-1 text-xs resize-none border border-[#C8BFB4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0A3D62] placeholder:text-gray-400 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !selectedRepo || sending}
                className="shrink-0 p-2 rounded-lg bg-[#0A3D62] text-white hover:bg-[#072E4A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── MIDDLE: Editor ── */}
        <div className="flex flex-1 min-w-0 border-r border-[#D8CFC4]">
          {/* File tree */}
          <div className="w-52 border-r border-[#E8E0D4] bg-[#FAFAF8] flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-[#E8E0D4] flex items-center gap-1.5">
              <GitBranch size={12} className="text-[#0A3D62]" />
              <span className="text-[10px] font-bold text-[#0A3D62] uppercase tracking-wide">Filer</span>
              {treeLoading && <Loader2 size={10} className="animate-spin text-gray-400 ml-auto" />}
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {!selectedRepo && (
                <p className="text-[10px] text-gray-400 px-3 py-4 text-center">Välj ett repo</p>
              )}
              {selectedRepo && treeLoading && (
                <p className="text-[10px] text-gray-400 px-3 py-4 text-center">Laddar filträd…</p>
              )}
              {selectedRepo && !treeLoading && fileTree.length === 0 && (
                <p className="text-[10px] text-gray-400 px-3 py-4 text-center">Inga filer hittades</p>
              )}
              {selectedRepo && !treeLoading && fileTree.length > 0 && (
                <FileTreeNode
                  name={selectedRepo.name}
                  node={treeData}
                  depth={-1}
                  onSelect={handleSelectFile}
                  selectedPath={selectedFile}
                />
              )}
            </div>
          </div>

          {/* Code editor panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* File tab */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E8E0D4] bg-[#FAFAF8] shrink-0">
              <File size={12} className="text-[#0A3D62] shrink-0" />
              <span className="text-xs font-mono text-[#444] truncate flex-1">
                {selectedFile ?? 'Ingen fil vald'}
              </span>
              {loadingFile && <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />}
              {selectedFile && appliedChanges.some(c => c.path === selectedFile) && (
                <span className="text-[9px] bg-[#E8B84B] text-[#0A3D62] px-1.5 py-0.5 rounded font-bold shrink-0">Ändrad</span>
              )}
            </div>

            {/* Code content */}
            <div className="flex-1 overflow-auto">
              {!selectedFile && (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <Terminal size={32} className="text-[#D8CFC4] mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Välj en fil i trädet</p>
                  <p className="text-xs text-gray-300 mt-1">Eller beskriv i chatten vad du vill bygga</p>
                </div>
              )}
              {selectedFile && loadingFile && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={24} className="animate-spin text-[#0A3D62]" />
                </div>
              )}
              {selectedFile && !loadingFile && fileContent !== null && (
                <pre className="text-[11px] font-mono leading-5 p-4 min-h-full">
                  {fileContent.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="select-none text-[#C8BFB4] w-8 shrink-0 text-right mr-4 leading-5">
                        {i + 1}
                      </span>
                      <SyntaxLine line={line} />
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Preview ── */}
        <div className="w-96 flex flex-col bg-[#F0EDE8] shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#D8CFC4] bg-[#EDE8DF] shrink-0">
            <Play size={12} className="text-[#0A3D62]" />
            <span className="text-[10px] font-bold text-[#0A3D62] uppercase tracking-wide flex-1">Preview</span>
            {previewUrl && (
              <button
                onClick={() => setPreviewKey(k => k + 1)}
                className="p-1 rounded hover:bg-[#D8CFC4] transition-colors"
                title="Uppdatera preview"
              >
                <RefreshCw size={12} className="text-[#0A3D62]" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {!selectedRepo && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Play size={28} className="text-[#D8CFC4] mb-3" />
                <p className="text-xs text-gray-400">Välj ett repo för att se preview</p>
              </div>
            )}
            {selectedRepo && !previewUrl && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <AlertCircle size={28} className="text-[#D8CFC4] mb-3" />
                <p className="text-sm text-gray-400 font-medium">Ingen live-URL</p>
                <p className="text-xs text-gray-300 mt-1">Sätt en website-URL i Gitea-repot för att se preview här</p>
                <a
                  href={`${GITEA_URL}/${selectedRepo.full_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs text-[#0A3D62] underline hover:text-[#072E4A]"
                >
                  Öppna repo i Gitea →
                </a>
              </div>
            )}
            {selectedRepo && previewUrl && (
              <iframe
                key={previewKey}
                src={previewUrl.startsWith('http') ? previewUrl : `https://${previewUrl}`}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}
          </div>
        </div>
      </div>

      {/* ZIP progress toast */}
      {(zipProgress || importStatus) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0A3D62] text-[#F5F0E8] text-xs px-5 py-3 rounded-xl shadow-floating flex items-center gap-3">
          <span className="animate-pulse">⚙️</span>
          <span>{zipProgress || importStatus}</span>
        </div>
      )}

      {/* Commit modal */}
      {showCommitModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-sm font-bold text-[#0A3D62] mb-1">Commit till Gitea</h3>
            <p className="text-xs text-gray-500 mb-4">
              {appliedChanges.length} fil{appliedChanges.length !== 1 ? 'er' : ''} kommer att committas
            </p>

            <div className="space-y-1.5 mb-4 max-h-32 overflow-y-auto">
              {appliedChanges.map(c => (
                <div key={c.path} className="flex items-center gap-2 text-[10px] font-mono bg-[#F5F0E8] px-2 py-1 rounded">
                  <span className={`uppercase font-bold ${
                    c.action === 'create' ? 'text-green-600' :
                    c.action === 'delete' ? 'text-red-600' : 'text-[#E8B84B]'
                  }`}>{c.action}</span>
                  <span className="text-[#0A3D62] truncate">{c.path}</span>
                </div>
              ))}
            </div>

            <input
              type="text"
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              placeholder="feat: AI-generated changes via Wavult Code"
              className="w-full text-xs border border-[#C8BFB4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0A3D62] mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowCommitModal(false)}
                className="flex-1 text-xs py-2 rounded-lg border border-[#C8BFB4] text-gray-600 hover:bg-[#F5F0E8] transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleCommit}
                disabled={committing}
                className="flex-1 text-xs py-2 rounded-lg bg-[#0A3D62] text-white font-bold hover:bg-[#072E4A] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {committing ? <Loader2 size={13} className="animate-spin" /> : <GitCommit size={13} />}
                {committing ? 'Committar…' : 'Commit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
