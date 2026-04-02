import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
const router = Router()
const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

router.get('/gates', async (_req, res) => {
  try { const {data} = await sb().from('feature_gates').select('*').eq('is_active',true).order('feature_module'); res.json(data??[]) } catch { res.json([]) }
})

router.get('/gates/:key', async (req, res) => {
  try {
    const {data:gate} = await sb().from('feature_gates').select('*').eq('feature_key',req.params.key).single()
    if(!gate) return res.status(404).json({error:'Gate not found'})
    const {data:events} = await sb().from('corporate_events').select('event_type').in('event_type',gate.required_decision_types).not('cascade_completed_at','is',null)
    const done = new Set((events||[]).map((e:any)=>e.event_type))
    const missing = gate.required_decision_types.filter((t:string)=>!done.has(t))
    res.json({...gate, is_unlocked: missing.length===0 && !!gate.unlocked_at, missing_decisions: missing})
  } catch(e:any){res.status(500).json({error:e.message})}
})

router.post('/events', async (req, res) => {
  try {
    const {event_type,payload,actor,actor_role,decision_level,entity_id,entity_type} = req.body
    if(!event_type||!actor||!decision_level) return res.status(400).json({error:'event_type, actor, decision_level required'})
    const {data:event,error} = await sb().from('corporate_events').insert({event_type,payload:payload||{},actor,actor_role,decision_level,entity_id,entity_type,requires_cascade_completion:true}).select().single()
    if(error) throw error
    const {data:rules} = await sb().from('cascade_rules').select('*').eq('trigger_event_type',event_type)
    const cascade = (rules||[]).map((r:any)=>({event_id:event.id,rule_id:r.id,task_id:r.produces_task_type?`${r.produces_task_type}-${event.id.slice(0,8)}`:null,document_id:r.produces_document_type?`${r.produces_document_type}-${event.id.slice(0,8)}`:null,status:'pending',assigned_to:r.assign_to_role,due_at:new Date(Date.now()+(r.deadline_days||7)*86400000).toISOString()}))
    if(cascade.length>0) await sb().from('cascade_executions').insert(cascade)
    // Check gate unlocks
    const {data:gates} = await sb().from('feature_gates').select('*').contains('required_decision_types',[event_type])
    for(const g of (gates||[])){if(!g.unlocked_at){const {data:evts} = await sb().from('corporate_events').select('event_type').in('event_type',g.required_decision_types);const types=new Set((evts||[]).map((e:any)=>e.event_type));if(g.required_decision_types.every((t:string)=>types.has(t)))await sb().from('feature_gates').update({unlocked_at:new Date().toISOString(),unlocked_by_event_id:event.id}).eq('id',g.id)}}
    res.status(201).json({event_id:event.id,cascade_items_created:cascade.length})
  } catch(e:any){res.status(500).json({error:e.message})}
})

router.get('/pending', async (_req, res) => {
  try { const {data} = await sb().from('cascade_executions').select('*,cascade_rules(description,is_blocking,requires_signature_from)').eq('status','pending').order('due_at',{ascending:true}); res.json(data??[]) } catch { res.json([]) }
})

router.patch('/cascade/:id/complete', async (req, res) => {
  try {
    const {signature_by} = req.body
    const {data} = await sb().from('cascade_executions').update({status:signature_by?'signed':'completed',completed_at:new Date().toISOString(),signature_by:signature_by||null,signed_at:signature_by?new Date().toISOString():null}).eq('id',req.params.id).select().single()
    if(data){const {data:all}=await sb().from('cascade_executions').select('status,cascade_rules!inner(is_blocking)').eq('event_id',data.event_id);const blocking=(all||[]).filter((c:any)=>c.cascade_rules?.is_blocking&&c.status==='pending').length;if(blocking===0)await sb().from('corporate_events').update({cascade_completed_at:new Date().toISOString()}).eq('id',data.event_id)}
    res.json({ok:true,data})
  } catch(e:any){res.status(500).json({error:e.message})}
})

export default router
