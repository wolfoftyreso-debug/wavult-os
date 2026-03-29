import { useState, useEffect } from 'react'
import { Vote, Plus, CheckSquare } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  role: string
  joinedAt: string
  isPresent: boolean
  hasVoted?: boolean
}

interface VoteItem {
  id: string
  question: string
  votes: Record<string, 'yes' | 'no' | 'abstain'>
  status: 'open' | 'closed'
  result?: 'approved' | 'rejected' | 'tied'
  openedAt: string
  closedAt?: string
}

interface AgendaItem {
  id: string
  title: string
  duration: number
  type: 'discussion' | 'vote' | 'info' | 'decision'
  status: 'pending' | 'active' | 'done'
  notes?: string
}

interface ActionItem {
  id: string
  title: string
  ownerId: string
  ownerName: string
  deadline: string
  status: 'open' | 'done'
  signedBy: string[]
}

interface Meeting {
  id: string
  title: string
  type: string
  startedAt: string
  participants: Participant[]
  agenda: AgendaItem[]
  votes: VoteItem[]
  actions: ActionItem[]
  notes: string
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_PARTICIPANTS: Participant[] = [
  { id: 'erik-svensson', name: 'Erik Svensson', role: 'Chairman', joinedAt: new Date().toISOString(), isPresent: true },
  { id: 'leon-russo', name: 'Leon Russo', role: 'CEO Ops', joinedAt: new Date().toISOString(), isPresent: true },
  { id: 'dennis-bjarnemark', name: 'Dennis Bjarnemark', role: 'CLO', joinedAt: new Date().toISOString(), isPresent: false },
  { id: 'winston-bjarnemark', name: 'Winston Bjarnemark', role: 'CFO', joinedAt: new Date().toISOString(), isPresent: true },
  { id: 'johan-berglund', name: 'Johan Berglund', role: 'CTO', joinedAt: new Date().toISOString(), isPresent: false },
]

const DEMO_AGENDA: AgendaItem[] = [
  { id: 'a1', title: 'Öppning & Närvaro', duration: 5, type: 'info', status: 'done' },
  { id: 'a2', title: 'Q2 OKR Review — Wavult Group', duration: 20, type: 'discussion', status: 'active' },
  { id: 'a3', title: 'Beslut: Thailand Workcamp Budget', duration: 10, type: 'vote', status: 'pending' },
  { id: 'a4', title: 'Landvex — Pipeline Update (Leon)', duration: 15, type: 'discussion', status: 'pending' },
  { id: 'a5', title: 'Teknisk status (Johan)', duration: 10, type: 'info', status: 'pending' },
  { id: 'a6', title: 'Åtgärdspunkter & Stängning', duration: 10, type: 'decision', status: 'pending' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveMeetingRoom({ meetingId = 'meeting-001' }: { meetingId?: string }) {
  const [meeting, setMeeting] = useState<Meeting>({
    id: meetingId,
    title: 'QBR — Wavult Group Q2 2026',
    type: 'QBR',
    startedAt: new Date().toISOString(),
    participants: DEMO_PARTICIPANTS,
    agenda: DEMO_AGENDA,
    votes: [],
    actions: [],
    notes: '',
  })

  const [activeTab, setActiveTab] = useState<'agenda' | 'vote' | 'actions' | 'notes'>('agenda')
  const [elapsed, setElapsed] = useState(0)
  const [currentUser] = useState({ id: 'erik-svensson', name: 'Erik Svensson' })
  const [newAction, setNewAction] = useState({ title: '', ownerId: '', deadline: '' })
  const [newVoteQuestion, setNewVoteQuestion] = useState('')
  const [showAddVote, setShowAddVote] = useState(false)
  const [showAddAction, setShowAddAction] = useState(false)

  // Elapsed timer (increments every minute)
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 60000)
    return () => clearInterval(t)
  }, [])

  function formatElapsed(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}t ${m}m` : `${m}m`
  }

  function togglePresence(participantId: string) {
    setMeeting(m => ({
      ...m,
      participants: m.participants.map(p =>
        p.id === participantId ? { ...p, isPresent: !p.isPresent } : p
      ),
    }))
  }

  function advanceAgenda(itemId: string) {
    setMeeting(m => ({
      ...m,
      agenda: m.agenda.map((item, i, arr) => {
        if (item.id === itemId) return { ...item, status: 'done' }
        if (i > 0 && arr[i - 1].id === itemId && item.status === 'pending') return { ...item, status: 'active' }
        return item
      }),
    }))
  }

  function openVote(question: string) {
    const vote: VoteItem = {
      id: `vote-${Date.now()}`,
      question,
      votes: {},
      status: 'open',
      openedAt: new Date().toISOString(),
    }
    setMeeting(m => ({ ...m, votes: [...m.votes, vote] }))
    setNewVoteQuestion('')
    setShowAddVote(false)
    setActiveTab('vote')
  }

  function castVote(voteId: string, choice: 'yes' | 'no' | 'abstain') {
    setMeeting(m => ({
      ...m,
      votes: m.votes.map(v =>
        v.id === voteId ? { ...v, votes: { ...v.votes, [currentUser.id]: choice } } : v
      ),
    }))
  }

  function closeVote(voteId: string) {
    setMeeting(m => ({
      ...m,
      votes: m.votes.map(v => {
        if (v.id !== voteId) return v
        const yes = Object.values(v.votes).filter(x => x === 'yes').length
        const no = Object.values(v.votes).filter(x => x === 'no').length
        const result: VoteItem['result'] = yes > no ? 'approved' : no > yes ? 'rejected' : 'tied'
        return { ...v, status: 'closed', closedAt: new Date().toISOString(), result }
      }),
    }))
  }

  function addAction() {
    if (!newAction.title || !newAction.ownerId) return
    const owner = meeting.participants.find(p => p.id === newAction.ownerId)
    const action: ActionItem = {
      id: `action-${Date.now()}`,
      title: newAction.title,
      ownerId: newAction.ownerId,
      ownerName: owner?.name || newAction.ownerId,
      deadline: newAction.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'open',
      signedBy: [],
    }
    setMeeting(m => ({ ...m, actions: [...m.actions, action] }))
    setNewAction({ title: '', ownerId: '', deadline: '' })
    setShowAddAction(false)
  }

  function signAction(actionId: string) {
    setMeeting(m => ({
      ...m,
      actions: m.actions.map(a =>
        a.id === actionId && !a.signedBy.includes(currentUser.id)
          ? { ...a, signedBy: [...a.signedBy, currentUser.id] }
          : a
      ),
    }))
  }

  const presentCount = meeting.participants.filter(p => p.isPresent).length
  const totalMinutes = meeting.agenda.reduce((sum, a) => sum + a.duration, 0)
  const openVotes = meeting.votes.filter(v => v.status === 'open')

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    background: activeTab === tab ? '#5856D6' : 'transparent',
    color: activeTab === tab ? '#FFFFFF' : '#6B7280',
    position: 'relative',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2F2F7' }}>
      {/* ── Meeting Header ── */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34C759', display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#34C759' }}>LIVE</span>
              <span style={{ fontSize: 13, color: '#8E8E93', fontFamily: 'monospace' }}>{formatElapsed(elapsed)}</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', margin: '2px 0' }}>{meeting.title}</h2>
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              {presentCount}/{meeting.participants.length} deltagare närvarande
              {openVotes.length > 0 && (
                <span style={{ marginLeft: 12, color: '#FF9500', fontWeight: 600 }}>
                  ⚡ {openVotes.length} öppen röstning
                </span>
              )}
            </div>
          </div>

          {/* Participant avatars */}
          <div style={{ display: 'flex' }}>
            {meeting.participants.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => togglePresence(p.id)}
                title={`${p.name} — ${p.isPresent ? 'Koppla bort' : 'Koppla upp'}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `3px solid ${p.isPresent ? '#34C759' : '#E5E7EB'}`,
                  background: p.isPresent ? '#34C75920' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: p.isPresent ? '#065F46' : '#9CA3AF',
                  cursor: 'pointer',
                  marginLeft: idx === 0 ? 0 : -8,
                  position: 'relative',
                  zIndex: meeting.participants.length - idx,
                }}
              >
                {p.name.split(' ').map(n => n[0]).join('')}
                {p.isPresent && (
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    background: '#34C759',
                    borderRadius: '50%',
                    border: '2px solid white',
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {[
            { id: 'agenda', label: 'Agenda' },
            { id: 'vote', label: `Röstning${openVotes.length > 0 ? ` (${openVotes.length})` : ''}` },
            { id: 'actions', label: `Åtgärder (${meeting.actions.length})` },
            { id: 'notes', label: 'Anteckningar' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} style={tabStyle(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* AGENDA */}
        {activeTab === 'agenda' && (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
              Total mötestid: {totalMinutes} min
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {meeting.agenda.map((item, i) => (
                <div key={item.id} style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  padding: '16px 20px',
                  border: `2px solid ${item.status === 'active' ? '#5856D6' : item.status === 'done' ? '#34C75930' : 'rgba(0,0,0,0.06)'}`,
                  opacity: item.status === 'done' ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        background: item.status === 'done' ? '#34C75920' : item.status === 'active' ? '#5856D620' : '#F3F4F6',
                        color: item.status === 'done' ? '#065F46' : item.status === 'active' ? '#5856D6' : '#9CA3AF',
                      }}>
                        {item.status === 'done' ? '✓' : i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: item.status === 'active' ? 700 : 500, color: '#1C1C1E' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#8E8E93' }}>
                          {item.duration} min ·{' '}
                          {item.type === 'vote' ? '🗳️ Röstning' : item.type === 'decision' ? '✅ Beslut' : item.type === 'discussion' ? '💬 Diskussion' : 'ℹ️ Info'}
                        </div>
                      </div>
                    </div>
                    {item.status === 'active' && (
                      <button onClick={() => advanceAgenda(item.id)} style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        background: '#5856D6',
                        color: '#FFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}>
                        Klar →
                      </button>
                    )}
                    {item.status === 'pending' && i > 0 && meeting.agenda[i - 1].status === 'active' && (
                      <div style={{ fontSize: 11, color: '#8E8E93' }}>Nästa</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VOTE */}
        {activeTab === 'vote' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {!showAddVote ? (
              <button onClick={() => setShowAddVote(true)} style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: '2px dashed rgba(0,0,0,0.15)',
                background: 'transparent',
                color: '#5856D6',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
                <Plus style={{ width: 16, height: 16 }} /> Öppna ny omröstning
              </button>
            ) : (
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 20, marginBottom: 16, border: '1px solid rgba(0,0,0,0.08)' }}>
                <input
                  value={newVoteQuestion}
                  onChange={e => setNewVoteQuestion(e.target.value)}
                  placeholder="Beslutsfråga — t.ex. 'Godkänner vi Thailand Workcamp budget?'"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openVote(newVoteQuestion)} disabled={!newVoteQuestion} style={{
                    flex: 2, padding: '10px', background: '#5856D6', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>Starta omröstning</button>
                  <button onClick={() => setShowAddVote(false)} style={{
                    flex: 1, padding: '10px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer',
                  }}>Avbryt</button>
                </div>
              </div>
            )}

            {meeting.votes.length === 0 && !showAddVote && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <Vote style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} />
                <div>Inga omröstningar ännu</div>
              </div>
            )}

            {meeting.votes.map(vote => {
              const yes = Object.values(vote.votes).filter(v => v === 'yes').length
              const no = Object.values(vote.votes).filter(v => v === 'no').length
              const abstain = Object.values(vote.votes).filter(v => v === 'abstain').length
              const total = Object.keys(vote.votes).length
              const myVote = vote.votes[currentUser.id]

              return (
                <div key={vote.id} style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 12,
                  border: `2px solid ${vote.status === 'open' ? '#5856D6' : vote.result === 'approved' ? '#34C759' : vote.result === 'rejected' ? '#FF3B30' : '#FF9500'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>{vote.question}</div>
                      <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
                        {vote.status === 'open'
                          ? `${total} av ${presentCount} har röstat`
                          : `Stängd · ${vote.result === 'approved' ? '✅ Godkänd' : vote.result === 'rejected' ? '❌ Avslag' : '⚖️ Lika'}`}
                      </div>
                    </div>
                    {vote.status === 'open' && total > 0 && (
                      <button onClick={() => closeVote(vote.id)} style={{
                        padding: '6px 14px',
                        background: '#FF3B3015',
                        color: '#FF3B30',
                        border: '1px solid #FF3B3030',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}>Stäng</button>
                    )}
                  </div>

                  {/* Vote bars */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, height: 8 }}>
                    {total > 0 ? (
                      <>
                        <div style={{ flex: yes, background: '#34C759', borderRadius: 4 }} title={`Ja: ${yes}`} />
                        <div style={{ flex: no, background: '#FF3B30', borderRadius: 4 }} title={`Nej: ${no}`} />
                        <div style={{ flex: abstain, background: '#FF9500', borderRadius: 4 }} title={`Avstår: ${abstain}`} />
                      </>
                    ) : (
                      <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 4 }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                    <span style={{ color: '#34C759' }}>✓ Ja: {yes}</span>
                    <span style={{ color: '#FF3B30' }}>✗ Nej: {no}</span>
                    <span style={{ color: '#FF9500' }}>– Avstår: {abstain}</span>
                  </div>

                  {vote.status === 'open' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { choice: 'yes' as const, label: 'Ja', color: '#34C759', bg: '#34C75915' },
                        { choice: 'no' as const, label: 'Nej', color: '#FF3B30', bg: '#FF3B3015' },
                        { choice: 'abstain' as const, label: 'Avstår', color: '#FF9500', bg: '#FF950015' },
                      ].map(btn => (
                        <button key={btn.choice} onClick={() => castVote(vote.id, btn.choice)} style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: 10,
                          border: `2px solid ${myVote === btn.choice ? btn.color : 'transparent'}`,
                          background: btn.bg,
                          color: btn.color,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transform: myVote === btn.choice ? 'scale(1.03)' : 'scale(1)',
                          transition: 'transform 0.1s',
                        }}>
                          {btn.label} {myVote === btn.choice ? '✓' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ACTIONS */}
        {activeTab === 'actions' && (
          <div style={{ maxWidth: 650, margin: '0 auto' }}>
            {!showAddAction ? (
              <button onClick={() => setShowAddAction(true)} style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: '2px dashed rgba(0,0,0,0.15)',
                background: 'transparent',
                color: '#5856D6',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
                <Plus style={{ width: 16, height: 16 }} /> Lägg till åtgärdspunkt
              </button>
            ) : (
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 20, marginBottom: 16, border: '1px solid rgba(0,0,0,0.08)' }}>
                <input
                  value={newAction.title}
                  onChange={e => setNewAction(a => ({ ...a, title: e.target.value }))}
                  placeholder="Vad ska göras?"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select
                    value={newAction.ownerId}
                    onChange={e => setNewAction(a => ({ ...a, ownerId: e.target.value }))}
                    style={{ flex: 2, padding: '10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14 }}
                  >
                    <option value="">Välj ansvarig</option>
                    {meeting.participants.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={newAction.deadline}
                    onChange={e => setNewAction(a => ({ ...a, deadline: e.target.value }))}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addAction} disabled={!newAction.title || !newAction.ownerId} style={{
                    flex: 2, padding: '10px', background: '#5856D6', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>Lägg till</button>
                  <button onClick={() => setShowAddAction(false)} style={{
                    flex: 1, padding: '10px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer',
                  }}>Avbryt</button>
                </div>
              </div>
            )}

            {meeting.actions.length === 0 && !showAddAction && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <CheckSquare style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} />
                <div>Inga åtgärdspunkter ännu</div>
              </div>
            )}

            {meeting.actions.map(action => {
              const signed = action.signedBy.includes(currentUser.id)
              return (
                <div key={action.id} style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  padding: '16px 20px',
                  marginBottom: 10,
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderLeft: `4px solid ${action.signedBy.length >= 2 ? '#34C759' : '#5856D6'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{action.title}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                        Ansvarig: <strong>{action.ownerName}</strong> · Deadline: {action.deadline}
                      </div>
                      <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>
                        Signerat av {action.signedBy.length}/{meeting.participants.filter(p => p.isPresent).length} deltagare
                      </div>
                    </div>
                    <button onClick={() => signAction(action.id)} disabled={signed} style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      background: signed ? '#34C75915' : '#5856D620',
                      color: signed ? '#34C759' : '#5856D6',
                      border: `1px solid ${signed ? '#34C75930' : '#5856D630'}`,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: signed ? 'not-allowed' : 'pointer',
                    }}>
                      {signed ? '✓ Signerad' : 'Signera'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div style={{ maxWidth: 650, margin: '0 auto' }}>
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 20, border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Mötesanteckningar — {meeting.title}
              </div>
              <textarea
                value={meeting.notes}
                onChange={e => setMeeting(m => ({ ...m, notes: e.target.value }))}
                placeholder="Skriv anteckningar här... Alla deltagare kan se och redigera."
                style={{
                  width: '100%',
                  minHeight: 400,
                  padding: '14px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: 14,
                  fontFamily: 'system-ui',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: 10, fontSize: 12, color: '#8E8E93' }}>
                {meeting.notes.length} tecken · Autosparas
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
