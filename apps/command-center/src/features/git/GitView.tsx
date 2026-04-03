/**
 * Git View — Repo + Version Thumbnails
 * ARKIV (left) → LIVE 🟢🔒 (center, largest) → DEV (right)
 * Sortable by status. All subsites included.
 * Click thumbnail → Cockpit
 */
import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../../shared/auth/useApi'

type RepoStatus = 'live' | 'dev' | 'offline' | 'archive'
type SortKey = 'status' | 'name' | 'updated'

interface Version {
  id: string
  slot: 'archive' | 'live' | 'dev'
  version: string
  url: string
  label?: string
}

interface Repo {
  id: string
  name: string
  domain: string
  repo_url: string
  status: RepoStatus
  description: string
  versions: Version[]
  tags?: string[]
}

// ── Lock SVG ──────────────────────────────────────────────────────────────────
const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{display:'inline',flexShrink:0}}>
    <rect x="3" y="11" width="18" height="11" rx="2" fill="#0A3D62" stroke="#E8B84B" strokeWidth="1.5"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#0A3D62" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1.5" fill="#E8B84B"/>
  </svg>
)

// ── Viewports ─────────────────────────────────────────────────────────────────
const VIEWPORTS = [
  { id: 'desktop', label: '🖥 Desktop', width: '100%',  height: '100%' },
  { id: 'ipad',    label: '⬜ iPad',    width: '768px',  height: '1024px' },
  { id: 'mobile',  label: '📱 Mobile',  width: '390px',  height: '844px' },
]

// ── Cockpit overlay ───────────────────────────────────────────────────────────
function CockpitOverlay({ url, label, isLive, onClose, allPages = [] }: { url: string; label: string; isLive: boolean; onClose: () => void; allPages?: {label:string;url:string}[] }) {
  const [viewport, setViewport] = useState('desktop')
  const [currentUrl, setCurrentUrl] = useState(url)
  const [showPages, setShowPages] = useState(false)
  const [iframeBlocked, setIframeBlocked] = useState(false)
  const vp = VIEWPORTS.find(v=>v.id===viewport) || VIEWPORTS[0]
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#050510', display:'flex', flexDirection:'column', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', background:'#0A0A1A', borderBottom:'1px solid rgba(232,184,75,.2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:isLive?'#00FF88':'#FFB800' }} />
          <span style={{ color:'#E8B84B', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>COCKPIT — {label.toUpperCase()}</span>
          {!isLive && <span style={{ background:'#332200', color:'#FFB800', padding:'2px 8px', borderRadius:3, fontSize:9, fontFamily:'monospace', fontWeight:700 }}>SANDBOX</span>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {/* Viewport switcher */}
          {VIEWPORTS.map(v=>(
            <button key={v.id} onClick={()=>setViewport(v.id)} style={{ background:viewport===v.id?'rgba(232,184,75,.2)':'rgba(255,255,255,.06)', border:`1px solid ${viewport===v.id?'#E8B84B':'rgba(255,255,255,.1)'}`, color:viewport===v.id?'#E8B84B':'rgba(255,255,255,.5)', padding:'4px 10px', borderRadius:4, cursor:'pointer', fontSize:12, transition:'all .15s' }}>
              {v.label}
            </button>
          ))}
          {/* Page dropdown */}
          {allPages.length > 0 && (
            <div style={{position:'relative'}}>
              <button onClick={()=>setShowPages(s=>!s)} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', padding:'4px 12px', borderRadius:4, cursor:'pointer', fontSize:11, fontFamily:'monospace' }}>
                Pages ▾
              </button>
              {showPages && (
                <div style={{ position:'absolute', top:'100%', right:0, marginTop:4, background:'#0A0A1A', border:'1px solid rgba(232,184,75,.2)', borderRadius:6, minWidth:220, zIndex:1 }}>
                  {allPages.map(p=>(
                    <div key={p.url} onClick={()=>{setCurrentUrl(p.url);setShowPages(false)}} style={{ padding:'8px 14px', cursor:'pointer', fontSize:12, color:'rgba(245,240,232,.7)', borderBottom:'1px solid rgba(255,255,255,.05)', fontFamily:'monospace' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(232,184,75,.08)'}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}
                    >
                      {p.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={onClose} style={{ background:'#E8B84B', border:'none', color:'#050510', padding:'5px 14px', borderRadius:4, cursor:'pointer', fontSize:12, fontWeight:700 }}>✕</button>
        </div>
      </div>
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 320px', overflow:'hidden' }}>
        <div style={{ position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'#080818' }}>
          <div style={{ width:vp.width, height:vp.height, border:viewport!=='desktop'?'2px solid rgba(255,255,255,.1)':'none', borderRadius:viewport==='mobile'?'20px':viewport==='ipad'?'12px':'0', overflow:'hidden', transition:'all .3s', position:'relative', flexShrink:0 }}>
          {currentUrl && !iframeBlocked ? (
            <iframe
              src={currentUrl}
              style={{ width:'100%', height:'100%', border:'none' }}
              sandbox={isLive?'allow-scripts allow-same-origin allow-forms':'allow-scripts'}
              onError={() => setIframeBlocked(true)}
            />
          ) : iframeBlocked ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:16, background:'#0A0A1A' }}>
              <span style={{ fontSize:36 }}>🔒</span>
              <span style={{ color:'rgba(255,255,255,.4)', fontFamily:'monospace', fontSize:12, textAlign:'center' }}>
                Sajten blockerar inbäddning<br/>
                <span style={{ opacity:.5, fontSize:10 }}>X-Frame-Options / CSP</span>
              </span>
              <a href={currentUrl} target="_blank" rel="noopener noreferrer"
                 style={{ padding:'8px 20px', background:'#E8B84B', color:'#050510', borderRadius:6, textDecoration:'none', fontSize:12, fontWeight:700, fontFamily:'monospace' }}>
                Öppna i nytt fönster ↗
              </a>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12 }}>
              <span style={{ fontSize:48 }}>🚧</span>
              <span style={{ color:'rgba(255,255,255,.3)', fontFamily:'monospace', fontSize:13 }}>No URL configured</span>
            </div>
          )}
          {!isLive && <div style={{ position:'absolute', bottom:16, left:0, right:0, textAlign:'center', pointerEvents:'none' }}>
            <span style={{ background:'rgba(51,34,0,.9)', color:'#FFB800', padding:'6px 16px', borderRadius:6, fontFamily:'monospace', fontSize:11, fontWeight:700 }}>⚠ SANDBOX</span>
          </div>}
          </div>
        </div>
        <div style={{ background:'#080818', borderLeft:'1px solid rgba(232,184,75,.12)', padding:16, overflow:'auto' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:8 }}>Site</div>
          <div style={{ background:'#0A0A1A', borderRadius:6, padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:'rgba(245,240,232,.7)', lineHeight:1.8, marginBottom:16 }}>
            <div><span style={{color:'rgba(255,255,255,.3)'}}>URL: </span>{url||'—'}</div>
            <div><span style={{color:'rgba(255,255,255,.3)'}}>STATUS: </span><span style={{color:isLive?'#00FF88':'#FFB800'}}>{isLive?'● LIVE':'○ SANDBOX'}</span></div>
          </div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:8 }}>Controls</div>
          {['🚀 Deploy','🗄 Database','🌐 CDN','🔐 Auth','📊 Stats'].map(c=>(
            <button key={c} style={{ width:'100%', background:'#0D0D28', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', padding:'7px 12px', borderRadius:5, cursor:'pointer', fontSize:11, fontFamily:'monospace', textAlign:'left', marginBottom:6, transition:'all .15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#E8B84B';(e.currentTarget as HTMLElement).style.color='#E8B84B'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,.1)';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,.6)'}}
            >{c}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Version Thumbnail ──────────────────────────────────────────────────────────
function Thumb({ v, repoName, onClick }: { v: Version; repoName: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  // Sizes depend on type and slot
  const isLive = v.slot === 'live'
  // Mobile app: portrait phone shape
  const isApp = !!repoName.match(/mobile|app|ios|android/i) || !!v.label?.toLowerCase().includes('app')
  const W = isApp ? (isLive ? 130 : 100) : (isLive ? 240 : 180)
  const H = isApp ? (isLive ? 240 : 185) : (isLive ? 150 : 115)
  const SCALE = isApp ? (W / 375) : (W / 1200)

  const colors = {
    archive: { border:'rgba(10,61,98,.2)',  bg:'rgba(10,61,98,.04)', tag:'ARKIV',  tagColor:'rgba(10,61,98,.45)' },
    live:    { border:'rgba(45,122,79,.55)', bg:'rgba(45,122,79,.05)',tag:'LIVE',   tagColor:'#1A5C3A' },
    dev:     { border:'rgba(232,184,75,.4)', bg:'rgba(232,184,75,.07)',tag:'DEV',   tagColor:'#8B6914' },
  }[v.slot]

  return (
    <div
      onClick={onClick}
      style={{ width:W, cursor:'pointer', borderRadius: isApp ? 20 : 10, overflow:'hidden', border:`1.5px solid ${colors.border}`, background:colors.bg, transition:'transform .15s, box-shadow .15s', flexShrink:0, boxShadow: isApp ? 'inset 0 0 0 3px rgba(10,61,98,.08)' : 'none' }}
      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-4px)';(e.currentTarget as HTMLElement).style.boxShadow='0 10px 28px rgba(10,61,98,.14)'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow=''}}
    >
      {/* iFrame preview */}
      <div style={{ width:'100%', height:H, overflow:'hidden', position:'relative', background:'#F5F0E8' }}>
        {!loaded && !errored && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#F5F0E8' }}>
            <span style={{ fontSize:isLive?24:18, opacity:.4 }}>{v.slot==='live'?'🌐':v.slot==='dev'?'🔧':'📦'}</span>
          </div>
        )}
        {v.url && !errored && (
          <iframe
            src={v.url}
            style={{ width:`${Math.round(100/SCALE)}%`, height:`${Math.round(H/SCALE)}px`, transform:`scale(${SCALE})`, transformOrigin:'top left', pointerEvents:'none', border:'none', display:loaded?'block':'none' }}
            onLoad={()=>setLoaded(true)}
            onError={()=>setErrored(true)}
            sandbox="allow-scripts allow-same-origin"
            title={`${repoName} ${v.version}`}
          />
        )}
        {/* Phone notch for apps */}
        {isApp && loaded && (
          <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:40, height:14, background:colors.bg, borderRadius:'0 0 10px 10px', zIndex:2 }} />
        )}
        {/* Live badge */}
        {isLive && (
          <div style={{ position:'absolute', top:7, right:7, background:'#2D7A4F', borderRadius:20, padding:'2px 8px', display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#7AE0A6' }} />
            <span style={{ fontSize:8, fontWeight:700, color:'white', fontFamily:'monospace' }}>LIVE</span>
          </div>
        )}
        {/* Hover overlay */}
        <div style={{ position:'absolute', inset:0, background:'rgba(10,61,98,0)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s' }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(10,61,98,.45)'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='rgba(10,61,98,0)'}
        >
          <span style={{ fontSize:isLive?12:10, fontFamily:'monospace', fontWeight:700, color:'#E8B84B', opacity:0, transition:'opacity .2s', pointerEvents:'none' }}>⬡ Cockpit</span>
        </div>
      </div>
      {/* Footer */}
      <div style={{ padding:`${isLive?10:7}px ${isLive?14:10}px`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:isLive?13:11, fontWeight:700, fontFamily:'monospace', color:'#0A3D62' }}>{v.version}</div>
          {v.label && <div style={{ fontSize:9, color:'rgba(10,61,98,.45)', marginTop:1 }}>{v.label}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {isLive && <LockIcon />}
          <span style={{ fontSize:9, fontFamily:'monospace', fontWeight:700, color:colors.tagColor }}>{colors.tag}</span>
        </div>
      </div>
    </div>
  )
}

const Arrow = () => (
  <div style={{ display:'flex', alignItems:'center', padding:'0 8px', paddingTop:55, color:'rgba(10,61,98,.2)', fontSize:18, flexShrink:0 }}>→</div>
)

// ── Repo Row ──────────────────────────────────────────────────────────────────
function RepoRow({ repo }: { repo: Repo }) {
  const [cockpit, setCockpit] = useState<Version|null>(null)
  const [open, setOpen] = useState(true)

  const archive = repo.versions.filter(v=>v.slot==='archive')
  const live    = repo.versions.filter(v=>v.slot==='live')
  const dev     = repo.versions.filter(v=>v.slot==='dev')

  const statusColors: Record<RepoStatus,string> = { live:'#2D7A4F', dev:'#2C3E6B', offline:'#B8760A', archive:'rgba(10,61,98,.3)' }
  const statusLabels: Record<RepoStatus,string> = { live:'live', dev:'dev', offline:'offline', archive:'archive' }

  return (
    <div style={{ marginBottom:20, background:'#FDFAF5', border:'1px solid rgba(10,61,98,.1)', borderRadius:12, overflow:'hidden' }}>
      {/* Header */}
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 20px', cursor:'pointer', borderBottom:open?'1px solid rgba(10,61,98,.07)':'none' }}>
        <span style={{ fontSize:12, color:'rgba(10,61,98,.3)', fontFamily:'monospace' }}>📁</span>
        <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:'#0A3D62' }}>{repo.domain}/</span>
        <span style={{ fontSize:11, color:'rgba(10,61,98,.4)', fontFamily:'monospace' }}>{repo.name}</span>
        <a href={repo.repo_url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
           style={{ fontSize:9, color:'#E8B84B', fontFamily:'monospace', textDecoration:'none', marginLeft:4 }}>git ↗</a>
        <div style={{ width:7, height:7, borderRadius:'50%', background:statusColors[repo.status], marginLeft:4 }} />
        <span style={{ fontSize:9, fontFamily:'monospace', color:statusColors[repo.status], textTransform:'uppercase' }}>{statusLabels[repo.status]}</span>
        {repo.description && <span style={{ fontSize:11, color:'rgba(10,61,98,.35)', marginLeft:8 }}>{repo.description}</span>}
        <span style={{ marginLeft:'auto', fontSize:12, color:'rgba(10,61,98,.25)' }}>{open?'▲':'▼'}</span>
      </div>

      {open && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:0, padding:'16px 20px', overflow:'auto', paddingBottom:20 }}>
          {/* ARCHIVE */}
          {archive.length > 0 && <>
            {archive.map((v,i)=>(
              <div key={v.id} style={{display:'flex',alignItems:'center'}}>
                {i>0&&<Arrow/>}
                <Thumb v={v} repoName={repo.name} onClick={()=>setCockpit(v)} />
              </div>
            ))}
            <Arrow />
          </>}
          {archive.length === 0 && (
            <div style={{ width:40, display:'flex', alignItems:'center', justifyContent:'center', paddingTop:55, color:'rgba(10,61,98,.15)', fontSize:16 }}>—</div>
          )}

          {/* LIVE */}
          {live.length > 0 ? live.map(v=><Thumb key={v.id} v={v} repoName={repo.name} onClick={()=>setCockpit(v)} />) : (
            <div style={{ width:240, height:150, border:'1.5px dashed rgba(10,61,98,.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(10,61,98,.02)', flexShrink:0 }}>
              <span style={{ fontSize:11, color:'rgba(10,61,98,.25)', fontFamily:'monospace' }}>No live version</span>
            </div>
          )}

          {/* DEV */}
          {dev.length > 0 && <>
            <Arrow />
            {dev.map((v,i)=>(
              <div key={v.id} style={{display:'flex',alignItems:'center'}}>
                {i>0&&<Arrow/>}
                <Thumb v={v} repoName={repo.name} onClick={()=>setCockpit(v)} />
              </div>
            ))}
          </>}
        </div>
      )}

      {cockpit && (
        <CockpitOverlay url={cockpit.url} label={`${repo.domain} ${cockpit.version}`} isLive={cockpit.slot==='live'} onClose={()=>setCockpit(null)} />
      )}
    </div>
  )
}

// ── STATUS FILTER ─────────────────────────────────────────────────────────────
const STATUS_FILTERS: { key: RepoStatus|'all', label: string, color: string }[] = [
  { key:'all',     label:'All',        color:'rgba(10,61,98,.5)' },
  { key:'live',    label:'🟢 Live',    color:'#2D7A4F' },
  { key:'dev',     label:'🔵 Dev',     color:'#2C3E6B' },
  { key:'offline', label:'🟡 Offline', color:'#B8760A' },
  { key:'archive', label:'⚪ Archive', color:'rgba(10,61,98,.3)' },
]

// ── ALL REPOS + SUBSITES ──────────────────────────────────────────────────────
const ALL_REPOS: Repo[] = [
  // ── Wavult OS
  { id:'wavult-os', name:'Wavult OS', domain:'os.wavult.com', status:'live', description:'Command center', repo_url:'https://git.wavult.com/wavult/wavult-os',
    versions:[
      { id:'os-prev', slot:'archive', version:'v2.x', url:'', label:'Previous' },
      { id:'os-live', slot:'live',    version:'v3.0', url:'https://os.wavult.com', label:'Production' },
      { id:'os-dev',  slot:'dev',     version:'v3.1', url:'https://wavult-os-dev.pages.dev', label:'Staging' },
    ]},

  // ── Wavult Group
  { id:'wavult-com', name:'Wavult Group', domain:'wavult.com', status:'live', description:'Main site', repo_url:'https://git.wavult.com/wavult/wavult.com',
    versions:[
      { id:'wv-live', slot:'live', version:'v1.0', url:'https://wavult.com', label:'Production' },
    ]},

  // ── quiXzoom — main + all markets
  { id:'quixzoom', name:'quiXzoom', domain:'quixzoom.com', status:'live', description:'Visual intelligence network', repo_url:'https://git.wavult.com/wavult/quixzoom.com',
    versions:[
      { id:'qz-live', slot:'live', version:'v1.0', url:'https://quixzoom.com', label:'Global' },
      { id:'qz-dev',  slot:'dev',  version:'v1.1', url:'https://quixzoom-landing-prod.pages.dev', label:'Next' },
    ]},
  { id:'quixzoom-se', name:'quiXzoom Sverige', domain:'quixzoom.com/markets/se', status:'live', description:'🇸🇪 Swedish market', repo_url:'https://git.wavult.com/wavult/quixzoom.com',
    versions:[
      { id:'qz-se', slot:'live', version:'v1.0', url:'https://quixzoom-landing-prod.cloudflare.net/markets/se/', label:'Live' },
    ]},
  { id:'quixzoom-en', name:'quiXzoom International', domain:'quixzoom.com/markets/en', status:'live', description:'🇬🇧 English', repo_url:'https://git.wavult.com/wavult/quixzoom.com',
    versions:[
      { id:'qz-en', slot:'live', version:'v1.0', url:'https://quixzoom-landing-prod.pages.dev/markets/en/', label:'Live' },
    ]},
  { id:'quixzoom-th', name:'quiXzoom Thailand', domain:'quixzoom.com/markets/th', status:'dev', description:'🇹🇭 Thai market', repo_url:'https://git.wavult.com/wavult/quixzoom.com',
    versions:[
      { id:'qz-th', slot:'dev', version:'v1.0', url:'', label:'Staging' },
    ]},
  { id:'quixzoom-ke', name:'quiXzoom Kenya', domain:'quixzoom.com/markets/ke', status:'dev', description:'🇰🇪 Kenya', repo_url:'https://git.wavult.com/wavult/quixzoom.com',
    versions:[
      { id:'qz-ke', slot:'dev', version:'v1.0', url:'', label:'Staging' },
    ]},

  // ── LandveX — main + all markets
  { id:'landvex', name:'LandveX', domain:'landvex.com', status:'live', description:'Infrastructure intelligence', repo_url:'https://git.wavult.com/wavult/landvex.com',
    versions:[
      { id:'lv-live', slot:'live', version:'v1.0', url:'https://landvex.com', label:'Global' },
    ]},
  { id:'landvex-eu', name:'LandveX EU', domain:'landvex.com/eu', status:'live', description:'🇪🇺 European market', repo_url:'https://git.wavult.com/wavult/landvex.com',
    versions:[
      { id:'lv-eu', slot:'live', version:'v1.0', url:'https://landvex-prod.s3.eu-north-1.amazonaws.com/eu/index.html', label:'Live' },
    ]},
  { id:'landvex-se', name:'LandveX Sverige', domain:'landvex.com/se', status:'live', description:'🇸🇪 Sweden', repo_url:'https://git.wavult.com/wavult/landvex.com',
    versions:[
      { id:'lv-se', slot:'live', version:'v1.0', url:'https://landvex-prod.s3.eu-north-1.amazonaws.com/se/index.html', label:'Live' },
    ]},
  { id:'landvex-nl', name:'LandveX Netherlands', domain:'landvex.com/nl', status:'live', description:'🇳🇱 Netherlands', repo_url:'https://git.wavult.com/wavult/landvex.com',
    versions:[
      { id:'lv-nl', slot:'live', version:'v1.0', url:'https://landvex-prod.s3.eu-north-1.amazonaws.com/nl/index.html', label:'Live' },
    ]},
  { id:'landvex-de', name:'LandveX Deutschland', domain:'landvex.com/de', status:'live', description:'🇩🇪 Germany', repo_url:'https://git.wavult.com/wavult/landvex.com',
    versions:[
      { id:'lv-de', slot:'live', version:'v1.0', url:'https://landvex-prod.s3.eu-north-1.amazonaws.com/de/index.html', label:'Live' },
    ]},
  { id:'landvex-fr', name:'LandveX France', domain:'landvex.com/fr', status:'live', description:'🇫🇷 France', repo_url:'https://git.wavult.com/wavult/landvex.com',
    versions:[
      { id:'lv-fr', slot:'live', version:'v1.0', url:'https://landvex-prod.s3.eu-north-1.amazonaws.com/fr/index.html', label:'Live' },
    ]},
  { id:'landvex-us', name:'LandveX USA', domain:'landvex.com/us', status:'live', description:'🇺🇸 United States', repo_url:'https://git.wavult.com/wavult/landvex.com',
    versions:[
      { id:'lv-us', slot:'live', version:'v1.0', url:'https://landvex-prod.s3.eu-north-1.amazonaws.com/us/index.html', label:'Live' },
    ]},

  // ── SupportFounds
  { id:'supportfounds', name:'SupportFounds', domain:'supportfounds.com', status:'dev', description:'Venture engine', repo_url:'https://git.wavult.com/wavult/wavult.com',
    versions:[
      { id:'sf-dev', slot:'dev', version:'v1.0', url:'https://d14gf6x22fx96q.cloudfront.net/supportfounds/index.html', label:'Preview' },
    ]},

  // ── Lunina Foundation
  { id:'lunina', name:'Lunina Foundation', domain:'luninafoundation.pages.dev', status:'live', description:'Education NGO', repo_url:'https://git.wavult.com/wavult/luninafoundation.org',
    versions:[
      { id:'lf-live', slot:'live', version:'v1.0', url:'https://lunina-foundation.pages.dev', label:'Live' },
    ]},

  // ── CorpFitt
  { id:'corpfitt', name:'CorpFitt', domain:'corpfitt.com', status:'dev', description:'Global fitness access', repo_url:'https://git.wavult.com/wavult/corpfitt-app',
    versions:[
      { id:'cf-dev', slot:'dev', version:'v1.0', url:'https://d14gf6x22fx96q.cloudfront.net/corpfitt/index.html', label:'Preview' },
    ]},

  // ── MLCS
  { id:'mlcs', name:'MLCS Protocol', domain:'mlcs.com', status:'offline', description:'Clinical knowledge platform', repo_url:'https://git.wavult.com/wavult/mlcs.com',
    versions:[
      { id:'ml-dev', slot:'dev', version:'v1.0-enterprise', url:'', label:'Building' },
    ]},

  // ── Cert Integrity
  { id:'cert', name:'Cert Integrity Engine', domain:'certintegrity.com', status:'offline', description:'Lab certification', repo_url:'https://git.wavult.com/wavult/cert-integrity-engine',
    versions:[
      { id:'ci-dev', slot:'dev', version:'v1.0-enterprise', url:'', label:'Building' },
    ]},

  // ── Wavult Mobile
  { id:'wavult-mobile', name:'Wavult Mobile', domain:'app.quixzoom.com', status:'dev', description:'iOS/Android app', repo_url:'https://git.wavult.com/wavult/quixzoom-mobile',
    versions:[
      { id:'wm-dev', slot:'dev', version:'v0.9', url:'https://dewrtqzc20flx.cloudfront.net', label:'TestFlight' },
    ]},

  // ── Gitea
  { id:'gitea', name:'Gitea', domain:'git.wavult.com', status:'live', description:'Internal Git', repo_url:'https://git.wavult.com/wavult',
    versions:[
      { id:'gt-live', slot:'live', version:'v1.25.5', url:'https://git.wavult.com', label:'Self-hosted' },
    ]},
]

// ── Main View ─────────────────────────────────────────────────────────────────
export function GitView() {
  const [filter, setFilter] = useState<RepoStatus|'all'>('all')
  const [sort, setSort] = useState<SortKey>('status')
  const [search, setSearch] = useState('')

  const filtered = ALL_REPOS
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => !search || r.domain.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'status') {
        const order = { live:0, dev:1, offline:2, archive:3 }
        return order[a.status] - order[b.status]
      }
      return a.domain.localeCompare(b.domain)
    })

  const counts = {
    all:     ALL_REPOS.length,
    live:    ALL_REPOS.filter(r=>r.status==='live').length,
    dev:     ALL_REPOS.filter(r=>r.status==='dev').length,
    offline: ALL_REPOS.filter(r=>r.status==='offline').length,
    archive: ALL_REPOS.filter(r=>r.status==='archive').length,
  }

  return (
    <div style={{ padding:'0 0 40px', fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0A3D62,#0d4d78)', borderRadius:12, padding:'20px 24px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:9, fontFamily:'monospace', color:'rgba(232,184,75,.7)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:6 }}>Repositories & Deployments</div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#F5F0E8', margin:0 }}>
            {counts.live} live · {counts.dev} dev · {counts.offline} offline
          </h2>
          <p style={{ fontSize:11, color:'rgba(245,240,232,.4)', margin:'4px 0 0', fontFamily:'monospace' }}>
            ARKIV → LIVE 🟢🔒 → DEV · Click thumbnail → Cockpit
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search domains..."
            style={{ padding:'7px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#F5F0E8', fontSize:12, outline:'none', width:180 }}
          />
          <a href="https://git.wavult.com/wavult" target="_blank" rel="noopener noreferrer"
             style={{ padding:'7px 14px', borderRadius:6, background:'rgba(232,184,75,.15)', border:'1px solid rgba(232,184,75,.3)', color:'#E8B84B', fontSize:11, fontFamily:'monospace', textDecoration:'none', fontWeight:700 }}>
            Gitea ↗
          </a>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {STATUS_FILTERS.map(f=>(
          <button key={f.key} onClick={()=>setFilter(f.key)}
            style={{ padding:'6px 14px', borderRadius:6, border:`1.5px solid ${filter===f.key?f.color:'rgba(10,61,98,.12)'}`, background:filter===f.key?`${f.color}12`:'transparent', color:filter===f.key?f.color:'rgba(10,61,98,.5)', cursor:'pointer', fontSize:12, fontWeight:filter===f.key?700:400, transition:'all .15s', fontFamily:'inherit' }}>
            {f.label} <span style={{ fontSize:10, opacity:.7 }}>({counts[f.key as keyof typeof counts]??counts.all})</span>
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {(['status','name'] as SortKey[]).map(s=>(
            <button key={s} onClick={()=>setSort(s)}
              style={{ padding:'6px 12px', borderRadius:6, border:`1.5px solid ${sort===s?'rgba(10,61,98,.4)':'rgba(10,61,98,.1)'}`, background:sort===s?'rgba(10,61,98,.08)':'transparent', color:sort===s?'#0A3D62':'rgba(10,61,98,.4)', cursor:'pointer', fontSize:11, fontFamily:'monospace', transition:'all .15s' }}>
              Sort: {s}
            </button>
          ))}
        </div>
      </div>

      {/* Repos */}
      {filtered.map(repo => <RepoRow key={repo.id} repo={repo} />)}

      {filtered.length === 0 && (
        <div style={{ padding:48, textAlign:'center', color:'rgba(10,61,98,.3)', fontSize:14 }}>No repos match this filter</div>
      )}
    </div>
  )
}
