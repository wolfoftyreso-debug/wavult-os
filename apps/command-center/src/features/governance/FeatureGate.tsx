import { useState, useEffect } from 'react'
import { useApi } from '../../shared/auth/useApi'

interface GateStatus { is_unlocked:boolean; missing_decisions:string[]; required_documents:string[]; required_signatures:string[]; feature_name:string }

export function FeatureGate({ featureKey, children, fallback }: { featureKey:string; children:React.ReactNode; fallback?:React.ReactNode }) {
  const { apiFetch } = useApi()
  const [status, setStatus] = useState<GateStatus|null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { apiFetch(`/api/dgs/gates/${featureKey}`).then(r=>r.ok?r.json():null).then(setStatus).catch(()=>null).finally(()=>setLoading(false)) }, [apiFetch, featureKey])
  if(loading) return null
  if(status?.is_unlocked) return <>{children}</>
  if(fallback) return <>{fallback}</>
  return (
    <div style={{background:'#FAF7F2',border:'1.5px solid rgba(10,61,98,.15)',borderRadius:12,padding:'24px 28px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" fill="#0A3D62" stroke="#E8B84B" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#0A3D62" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#E8B84B"/></svg>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'#0A3D62'}}>{status?.feature_name||featureKey} — Requires Decision</div>
          <div style={{fontSize:12,color:'rgba(10,61,98,.5)',marginTop:2}}>Locked until required governance decisions have been made and documented.</div>
        </div>
      </div>
      {status?.missing_decisions && status.missing_decisions.length > 0 && (
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(10,61,98,.5)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Required Decisions</div>
          {status.missing_decisions.map(d=><div key={d} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'rgba(232,184,75,.08)',borderRadius:6,border:'1px solid rgba(232,184,75,.2)',marginBottom:4,fontSize:12,color:'#0A3D62'}}><span style={{color:'#E8B84B'}}>◎</span>{d.replace(/_/g,' ')}</div>)}
        </div>
      )}
      {status?.required_signatures && status.required_signatures.length > 0 && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {status.required_signatures.map(s=><span key={s} style={{padding:'3px 10px',background:'rgba(10,61,98,.08)',borderRadius:20,fontSize:11,color:'#0A3D62',fontWeight:600}}>✍ {s}</span>)}
        </div>
      )}
    </div>
  )
}
