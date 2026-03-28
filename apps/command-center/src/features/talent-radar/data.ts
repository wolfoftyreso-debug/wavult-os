// ─── Talent Radar — OpenClaw Elite ───────────────────────────────────────────
// Tracking the world's top OpenClaw builders for recruitment

export type TalentStatus =
  | 'spotted'       // Found, not yet contacted
  | 'watching'      // Active monitoring
  | 'contacted'     // Outreach sent
  | 'responded'     // Replied
  | 'interested'    // Expressed interest
  | 'in-talks'      // Active conversation
  | 'passed'        // Not interested
  | 'onboarded'     // Joined Wavult

export type TalentSource = 'github' | 'reddit' | 'discord' | 'twitter' | 'linkedin' | 'referral'

export interface TalentSignal {
  date: string
  description: string
}

export interface TalentTarget {
  id: string
  handle: string
  name?: string
  location?: string
  source: TalentSource
  status: TalentStatus
  specialty: string[]
  profileUrl: string
  repoUrl?: string
  repoStars?: number
  repoDescription?: string
  bio?: string
  signals: TalentSignal[]
  notes?: string
  contactEmail?: string
  addedDate: string
  lastActivity?: string
}

export const TALENT_TARGETS: TalentTarget[] = [
  {
    id: 'nanobot-hkuds',
    handle: 'HKUDS / nanobot',
    location: 'Unknown',
    source: 'github',
    status: 'spotted',
    specialty: ['Python', 'Ultra-lightweight agents', 'OpenClaw core'],
    profileUrl: 'https://github.com/HKUDS',
    repoUrl: 'https://github.com/HKUDS/nanobot',
    repoStars: 36600,
    repoDescription: '🐈 nanobot: The Ultra-Lightweight OpenClaw — Python, 36.6k stars, updated 1h ago',
    signals: [
      { date: '2026-03-27', description: 'Repo updated 1h ago — extremely active' },
    ],
    notes: 'Built the most starred ultra-lightweight OpenClaw implementation. Python expert. High priority.',
    addedDate: '2026-03-27',
    lastActivity: '2026-03-27',
  },
  {
    id: 'voltagent-awesome-skills',
    handle: 'VoltAgent',
    location: 'Unknown',
    source: 'github',
    status: 'spotted',
    specialty: ['Skills architecture', 'OpenClaw ecosystem', 'Curation'],
    profileUrl: 'https://github.com/VoltAgent',
    repoUrl: 'https://github.com/VoltAgent/awesome-openclaw-skills',
    repoStars: 42500,
    repoDescription: 'The awesome collection of OpenClaw skills — 5,400+ skills, 42.5k stars',
    signals: [
      { date: '2026-03-27', description: 'Repo updated yesterday — massive community influence' },
    ],
    notes: 'Biggest skills curator in the OpenClaw ecosystem. Community leader. Potential partnership or hire.',
    addedDate: '2026-03-27',
    lastActivity: '2026-03-26',
  },
  {
    id: 'hesamsheikh-usecases',
    handle: 'hesamsheikh',
    location: 'Unknown',
    source: 'github',
    status: 'spotted',
    specialty: ['Use case design', 'Automation', 'OpenClaw productivity'],
    profileUrl: 'https://github.com/hesamsheikh',
    repoUrl: 'https://github.com/hesamsheikh/awesome-openclaw-usecases',
    repoStars: 27600,
    repoDescription: 'Community collection of OpenClaw use cases — 27.6k stars',
    signals: [
      { date: '2026-03-27', description: 'Repo updated 3 days ago' },
    ],
    notes: 'Deep knowledge of real-world OpenClaw applications. Strong community voice.',
    addedDate: '2026-03-27',
    lastActivity: '2026-03-24',
  },
  {
    id: 'abhi1693-mission-control',
    handle: 'abhi1693',
    location: 'Unknown',
    source: 'github',
    status: 'spotted',
    specialty: ['TypeScript', 'Multi-agent orchestration', 'Dashboard/UI'],
    profileUrl: 'https://github.com/abhi1693',
    repoUrl: 'https://github.com/abhi1693/openclaw-mission-control',
    repoStars: 3200,
    repoDescription: 'AI Agent Orchestration Dashboard — manage agents, assign tasks, multi-agent coordination via OpenClaw Gateway',
    signals: [
      { date: '2026-03-27', description: 'Repo updated yesterday' },
    ],
    notes: 'TypeScript builder, exactly our stack. Built a mission control dashboard — highly relevant for Wavult OS architecture.',
    addedDate: '2026-03-27',
    lastActivity: '2026-03-26',
  },
  {
    id: 'linuxhsj-zero-token',
    handle: 'linuxhsj',
    location: 'Unknown',
    source: 'github',
    status: 'spotted',
    specialty: ['TypeScript', 'Multi-model AI', 'OpenClaw integrations'],
    profileUrl: 'https://github.com/linuxhsj',
    repoUrl: 'https://github.com/linuxhsj/openclaw-zero-token',
    repoStars: 3000,
    repoDescription: 'OpenClaw: Use All Major AI Models NO API Token — Claude/ChatGPT/Gemini/DeepSeek/Grok etc',
    signals: [
      { date: '2026-03-27', description: 'Updated 13h ago — very active' },
    ],
    notes: 'Creative hacker who bypassed all API token requirements. TypeScript. Resourceful problem-solver.',
    addedDate: '2026-03-27',
    lastActivity: '2026-03-27',
  },
  {
    id: 'dataelement-clawith',
    handle: 'dataelement / Clawith',
    location: 'Unknown',
    source: 'github',
    status: 'spotted',
    specialty: ['Python', 'Team collaboration', 'Enterprise OpenClaw'],
    profileUrl: 'https://github.com/dataelement',
    repoUrl: 'https://github.com/dataelement/Clawith',
    repoStars: 2500,
    repoDescription: 'OpenClaw for Teams — Python, updated 1h ago',
    signals: [
      { date: '2026-03-27', description: 'Updated 1h ago — extremely active. Enterprise focus aligns with Wavult.' },
    ],
    notes: 'Building enterprise/team version of OpenClaw. Direct overlap with Wavult OS mission.',
    addedDate: '2026-03-27',
    lastActivity: '2026-03-27',
  },
  {
    id: 'mengjian-openclaw101',
    handle: 'mengjian-github',
    location: 'China',
    source: 'github',
    status: 'spotted',
    specialty: ['TypeScript', 'Education', 'Community building', 'Chinese market'],
    profileUrl: 'https://github.com/mengjian-github',
    repoUrl: 'https://github.com/mengjian-github/openclaw101',
    repoStars: 2500,
    repoDescription: 'OpenClaw 101 — 7-day mastery guide, Chinese community hub, 2.5k stars',
    signals: [
      { date: '2026-03-27', description: 'Updated 23h ago' },
    ],
    notes: 'Bridge to the Chinese OpenClaw community. Education-focused. Could be valuable for Asia expansion.',
    addedDate: '2026-03-27',
    lastActivity: '2026-03-27',
  },
]

export const STATUS_LABELS: Record<TalentStatus, string> = {
  spotted: 'Spotted',
  watching: 'Watching',
  contacted: 'Contacted',
  responded: 'Responded',
  interested: 'Interested',
  'in-talks': 'In Talks',
  passed: 'Passed',
  onboarded: 'Onboarded ✅',
}

export const STATUS_COLORS: Record<TalentStatus, string> = {
  spotted: '#6B7280',
  watching: '#3B82F6',
  contacted: '#F59E0B',
  responded: '#8B5CF6',
  interested: '#10B981',
  'in-talks': '#06B6D4',
  passed: '#EF4444',
  onboarded: '#22C55E',
}

export const SOURCE_ICONS: Record<TalentSource, string> = {
  github: '🐙',
  reddit: '🔴',
  discord: '💬',
  twitter: '🐦',
  linkedin: '💼',
  referral: '🤝',
}
