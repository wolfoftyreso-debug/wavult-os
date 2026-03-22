import { useState, useEffect, useRef } from 'react';

// PixCopilot.tsx
// Persistent AI sidebar — available on every screen

const GEMINI_KEY = 'AIzaSyANqIFz2EaIBlAzHa1j8rvhP62aLnrvR8M';
const API = 'https://api.bc.pixdrift.com';

// Pre-built quick queries (instant, no AI needed)
const QUICK_QUERIES = [
  { id: 'overloaded', label: 'Vem är överbelastad?', icon: '🔴', endpoint: '/api/intelligence/overloaded-technicians' },
  { id: 'parts-risk', label: 'Vilka delar håller på att ta slut?', icon: '📦', endpoint: '/api/intelligence/at-risk-parts' },
  { id: 'delays', label: 'Vad orsakar förseningar?', icon: '⚠️', endpoint: '/api/intelligence/delay-patterns' },
  { id: 'churn', label: 'Vilka kunder riskerar att lämna?', icon: '👤', endpoint: '/api/intelligence/customer-churn-risk' },
  { id: 'sla', label: 'Vilka löften riskeras idag?', icon: '⏰', endpoint: '/api/intelligence/sla-at-risk' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'intelligence' | 'gemini';
}

export default function PixCopilot({ currentView, orgId }: { currentView: string; orgId?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant',
    content: 'Hej! Jag är PIX Copilot. Jag kan svara på frågor om er verksamhet — beläggning, förseningar, delar, kunder. Vad vill du veta?',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('pixdrift_token') || '';

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleQuickQuery(query: typeof QUICK_QUERIES[0]) {
    addMessage('user', query.label);
    setLoading(true);
    try {
      const res = await fetch(`${API}${query.endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : null;

      if (data) {
        const response = formatIntelligenceResponse(query.id, data);
        addMessage('assistant', response, 'intelligence');
      } else {
        addMessage('assistant', 'Ingen data hittades för den frågan just nu.', 'intelligence');
      }
    } catch {
      // Fallback to demo response
      addMessage('assistant', getDemoResponse(query.id), 'intelligence');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    addMessage('user', question);
    setLoading(true);

    try {
      const contextPrompt = `Du är PIX Copilot — en operativ AI-assistent för pixdrift verkstadssystem.
Aktuell vy: ${currentView}
Organisation: ${orgId || 'Demo'}

Svara kort, precist och på svenska. Max 3-4 meningar.
Om det handlar om specifika siffror, säg "Baserat på demo-data..." om du inte har riktiga värden.
Fokusera på operativa insikter: beläggning, förseningar, delar, kunder, flöde.

Fråga: ${question}`;

      const body = JSON.stringify({
        contents: [{ parts: [{ text: contextPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 256 }
      });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Kunde inte svara just nu.';
      addMessage('assistant', text, 'gemini');
    } catch {
      addMessage('assistant', 'Anslutningsproblem. Försök igen.', 'gemini');
    } finally {
      setLoading(false);
    }
  }

  function addMessage(role: 'user' | 'assistant', content: string, source?: 'intelligence' | 'gemini') {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role, content, timestamp: new Date(), source
    }]);
  }

  function formatIntelligenceResponse(id: string, data: unknown): string {
    switch (id) {
      case 'overloaded': {
        const arr = Array.isArray(data) ? data : [];
        const over = arr.filter((t: { load_pct: number }) => t.load_pct > 85);
        if (over.length === 0) return '✅ Ingen mekaniker är överbelastad just nu.';
        return over.map((t: { name: string; load_pct: number }) => `🔴 ${t.name}: ${t.load_pct}% belagd`).join('\n');
      }
      case 'parts-risk': {
        const parts = Array.isArray(data) ? data.slice(0, 3) : [];
        if (parts.length === 0) return '✅ Inga delar är kritiskt låga.';
        return '⚠️ Lågt lager:\n' + parts.map((p: { part_name: string; stock_qty: number }) => `• ${p.part_name}: ${p.stock_qty} kvar`).join('\n');
      }
      default:
        return JSON.stringify(data).substring(0, 200);
    }
  }

  function getDemoResponse(id: string): string {
    const demos: Record<string, string> = {
      'overloaded': '🔴 Robin Björk: 120% belagd\n🟡 Jonas Lindström: 90% belagd\n🟢 Eric Karlsson: 75% — har kapacitet',
      'parts-risk': '⚠️ Bromsskiva fram (VW Golf): 2 st kvar\n⚠️ Oljefilter 5W-30: 3 st kvar\n✅ Övriga delar OK',
      'delays': '3 av 5 förseningar orsakas av saknade delar.\n2 av 5 beror på underskattad jobbtid (bromsarbeten +40 min i snitt).',
      'churn': '👤 3 kunder har inte besökt på >12 månader.\nHögst risk: Lars Nilsson (senaste besök sept 2024)',
      'sla': '⏰ Volvo XC60 (DEF 456): utlovad 11:00, risk för +45 min\n✅ Övriga jobb i tid',
    };
    return demos[id] || 'Ingen data tillgänglig.';
  }

  const C = {
    bg: '#0A0A0F', surface: '#111118', surface2: '#18181F',
    border: 'rgba(255,255,255,0.08)', text: '#FFFFFF', text2: '#A1A1AA',
    text3: '#52525B', accent: '#6366F1',
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          width: 48, height: 48, borderRadius: '50%',
          background: C.accent, color: '#fff', border: 'none',
          fontSize: 20, cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit', transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        title="PIX Copilot"
      >
        ✦
      </button>

      {/* Sidebar panel */}
      {open && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, zIndex: 800,
          background: C.surface, borderLeft: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          animation: 'pixCopilotSlideIn 0.2s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>✦</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>PIX Copilot</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: C.text3, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Powered by pixdrift intelligence</div>
          </div>

          {/* Quick queries */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Snabba frågor</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_QUERIES.map(q => (
                <button
                  key={q.id}
                  onClick={() => handleQuickQuery(q)}
                  disabled={loading}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                    background: C.surface2, color: C.text2, fontSize: 13,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.1s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#1E1E2E'; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.surface2}
                >
                  <span>{q.icon}</span>{q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user' ? C.accent : C.surface2,
                  color: C.text, fontSize: 13, lineHeight: 1.55,
                  border: msg.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                  whiteSpace: 'pre-line',
                }}>
                  {msg.content}
                  {msg.source === 'intelligence' && (
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>via PIX Intelligence</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '12px 12px 12px 2px',
                  background: C.surface2, border: `1px solid ${C.border}`,
                  color: C.text3, fontSize: 13,
                }}>
                  ✦ Analyserar...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Skriv en fråga..."
                style={{
                  flex: 1, height: 40, padding: '0 12px', borderRadius: 8,
                  border: `1px solid ${C.border}`, background: C.surface2,
                  color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 8, border: 'none',
                  background: C.accent, color: '#fff',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 16, fontFamily: 'inherit',
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >→</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pixCopilotSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
