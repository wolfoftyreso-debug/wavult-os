/**
 * Academy API — ISO/compliance-kurser + kompetensmatris-koppling
 *
 * Tables: qms_courses, qms_course_modules, qms_course_completions
 * Koppling: qms_person_competencies (uppdateras vid kursavklarande)
 *
 * GET  /v1/academy/courses                   — lista kurser (filter: category, mandatory_for)
 * GET  /v1/academy/courses/:code             — kursdetalj med moduler
 * GET  /v1/academy/person/:personId/progress — personens avklarade kurser + gaps
 * GET  /v1/academy/person/:personId/required — obligatoriska kurser ej avklarade
 * POST /v1/academy/courses/:code/complete    — markera kurs som avklarad (body: {score, person_id})
 * GET  /v1/academy/dashboard                 — team-översikt: vem har klarat vad
 * GET  /v1/academy/gaps                      — persons med kompetens-gap + rekommenderade kurser
 */

import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

// ─── GET /v1/academy/courses ──────────────────────────────────────────────────
// Lista kurser med valfritt filter på category och mandatory_for
router.get('/v1/academy/courses', async (req: Request, res: Response) => {
  try {
    const { category, mandatory_for } = req.query as Record<string, string>

    let query = sb()
      .from('qms_courses')
      .select('*')
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('level', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) throw error

    let courses = data ?? []

    // Filter mandatory_for clientside (jsonb-contains)
    if (mandatory_for) {
      courses = courses.filter((c) => {
        const mf: string[] = c.mandatory_for ?? []
        return mf.includes('all') || mf.includes(mandatory_for)
      })
    }

    res.json(courses)
  } catch (err: any) {
    console.error('[academy] GET /courses error:', err)
    res.status(500).json({ error: 'Failed to fetch courses', detail: err?.message })
  }
})

// ─── GET /v1/academy/courses/:code ────────────────────────────────────────────
// Kursdetalj inkl. moduler
router.get('/v1/academy/courses/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params

    const { data: course, error: ce } = await sb()
      .from('qms_courses')
      .select('*')
      .eq('course_code', code)
      .single()

    if (ce || !course) {
      return res.status(404).json({ error: 'Course not found', code })
    }

    const { data: modules, error: me } = await sb()
      .from('qms_course_modules')
      .select('*')
      .eq('course_id', course.id)
      .order('module_order', { ascending: true })

    if (me) throw me

    res.json({ ...course, modules: modules ?? [] })
  } catch (err: any) {
    console.error('[academy] GET /courses/:code error:', err)
    res.status(500).json({ error: 'Failed to fetch course', detail: err?.message })
  }
})

// ─── GET /v1/academy/person/:personId/progress ────────────────────────────────
// Personens avklarade kurser + alla obligatoriska kurser med status
router.get('/v1/academy/person/:personId/progress', async (req: Request, res: Response) => {
  try {
    const { personId } = req.params

    // Hämta completions för personen
    const { data: completions, error: ce } = await sb()
      .from('qms_course_completions')
      .select('*, qms_courses(*)')
      .eq('person_id', personId)

    if (ce) throw ce

    // Hämta alla kurser som är obligatoriska för denna person
    const { data: allCourses, error: ae } = await sb()
      .from('qms_courses')
      .select('*')
      .eq('status', 'active')

    if (ae) throw ae

    const requiredCourses = (allCourses ?? []).filter((c) => {
      const mf: string[] = c.mandatory_for ?? []
      return mf.includes('all') || mf.includes(personId)
    })

    const completedIds = new Set((completions ?? []).map((c: any) => c.course_id))

    const progress = requiredCourses.map((course) => {
      const completion = (completions ?? []).find((c: any) => c.course_id === course.id)
      return {
        course,
        status: completion?.completed_at
          ? 'completed'
          : completion
          ? 'in_progress'
          : 'not_started',
        completion: completion ?? null,
      }
    })

    const stats = {
      total_required: requiredCourses.length,
      completed: progress.filter((p) => p.status === 'completed').length,
      in_progress: progress.filter((p) => p.status === 'in_progress').length,
      not_started: progress.filter((p) => p.status === 'not_started').length,
      compliance_percent:
        requiredCourses.length > 0
          ? Math.round(
              (progress.filter((p) => p.status === 'completed').length / requiredCourses.length) * 100
            )
          : 100,
    }

    res.json({ person_id: personId, stats, progress, all_completions: completions ?? [] })
  } catch (err: any) {
    console.error('[academy] GET /person/:personId/progress error:', err)
    res.status(500).json({ error: 'Failed to fetch progress', detail: err?.message })
  }
})

// ─── GET /v1/academy/person/:personId/required ────────────────────────────────
// Obligatoriska kurser ej avklarade
router.get('/v1/academy/person/:personId/required', async (req: Request, res: Response) => {
  try {
    const { personId } = req.params

    const { data: completions, error: ce } = await sb()
      .from('qms_course_completions')
      .select('course_id, completed_at')
      .eq('person_id', personId)
      .not('completed_at', 'is', null)

    if (ce) throw ce

    const completedIds = new Set((completions ?? []).map((c: any) => c.course_id))

    const { data: allCourses, error: ae } = await sb()
      .from('qms_courses')
      .select('*')
      .eq('status', 'active')

    if (ae) throw ae

    const required = (allCourses ?? []).filter((c) => {
      const mf: string[] = c.mandatory_for ?? []
      const isMandatory = mf.includes('all') || mf.includes(personId)
      return isMandatory && !completedIds.has(c.id)
    })

    res.json(required)
  } catch (err: any) {
    console.error('[academy] GET /person/:personId/required error:', err)
    res.status(500).json({ error: 'Failed to fetch required courses', detail: err?.message })
  }
})

// ─── POST /v1/academy/courses/:code/complete ──────────────────────────────────
// Markera kurs som avklarad. Body: { person_id, score }
// Om score >= 70: uppdatera qms_person_competencies.current_level +1 (max 5)
router.post('/v1/academy/courses/:code/complete', async (req: Request, res: Response) => {
  try {
    const { code } = req.params
    const { person_id, score = 0 } = req.body

    if (!person_id) {
      return res.status(400).json({ error: 'person_id is required' })
    }

    // Hämta kurs
    const { data: course, error: ce } = await sb()
      .from('qms_courses')
      .select('*')
      .eq('course_code', code)
      .single()

    if (ce || !course) {
      return res.status(404).json({ error: 'Course not found', code })
    }

    const passed = score >= 70

    // Upsert completion
    const { data: completion, error: ue } = await sb()
      .from('qms_course_completions')
      .upsert(
        {
          person_id,
          course_id: course.id,
          completed_at: new Date().toISOString(),
          score,
          passed,
        },
        { onConflict: 'person_id,course_id' }
      )
      .select()
      .single()

    if (ue) throw ue

    // Kompetensmatris-koppling: om score >= 70, uppdatera current_level +1 (max 5)
    const competencyCodes: string[] = course.competency_codes ?? []
    const competencyUpdates: { code: string; updated: boolean; error?: string }[] = []

    if (passed && competencyCodes.length > 0) {
      for (const compCode of competencyCodes) {
        try {
          // Hämta befintlig competency-rad
          const { data: existing, error: fe } = await sb()
            .from('qms_person_competencies')
            .select('id, current_level')
            .eq('person_id', person_id)
            .eq('competency_code', compCode)
            .maybeSingle()

          if (fe) {
            competencyUpdates.push({ code: compCode, updated: false, error: fe.message })
            continue
          }

          if (existing) {
            const newLevel = Math.min((existing.current_level ?? 0) + 1, 5)
            const { error: upErr } = await sb()
              .from('qms_person_competencies')
              .update({
                current_level: newLevel,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)

            competencyUpdates.push({ code: compCode, updated: !upErr, error: upErr?.message })
          } else {
            // Skapa ny rad
            const { error: insErr } = await sb()
              .from('qms_person_competencies')
              .insert({
                person_id,
                competency_code: compCode,
                current_level: 1,
                target_level: 3,
              })

            competencyUpdates.push({ code: compCode, updated: !insErr, error: insErr?.message })
          }
        } catch (compErr: any) {
          competencyUpdates.push({ code: compCode, updated: false, error: compErr?.message })
        }
      }
    }

    res.json({
      success: true,
      completion,
      passed,
      score,
      competency_updates: competencyUpdates,
    })
  } catch (err: any) {
    console.error('[academy] POST /courses/:code/complete error:', err)
    res.status(500).json({ error: 'Failed to complete course', detail: err?.message })
  }
})

// ─── GET /v1/academy/dashboard ────────────────────────────────────────────────
// Team-översikt: vem har klarat vad, compliance-status per person
router.get('/v1/academy/dashboard', async (_req: Request, res: Response) => {
  try {
    const teamMembers = ['erik', 'dennis', 'johan', 'winston', 'leon']

    // Hämta alla kurser
    const { data: allCourses, error: ce } = await sb()
      .from('qms_courses')
      .select('*')
      .eq('status', 'active')

    if (ce) throw ce

    // Hämta alla completions
    const { data: allCompletions, error: ae } = await sb()
      .from('qms_course_completions')
      .select('*')
      .not('completed_at', 'is', null)

    if (ae) throw ae

    const dashboard = teamMembers.map((personId) => {
      const requiredCourses = (allCourses ?? []).filter((c) => {
        const mf: string[] = c.mandatory_for ?? []
        return mf.includes('all') || mf.includes(personId)
      })

      const myCompletions = (allCompletions ?? []).filter((c: any) => c.person_id === personId)
      const completedIds = new Set(myCompletions.map((c: any) => c.course_id))

      const completed = requiredCourses.filter((c) => completedIds.has(c.id))
      const pending = requiredCourses.filter((c) => !completedIds.has(c.id))

      return {
        person_id: personId,
        required: requiredCourses.length,
        completed: completed.length,
        pending: pending.length,
        compliance_percent:
          requiredCourses.length > 0
            ? Math.round((completed.length / requiredCourses.length) * 100)
            : 100,
        pending_courses: pending.map((c) => ({ code: c.course_code, title: c.title, category: c.category })),
        completed_courses: completed.map((c) => ({ code: c.course_code, title: c.title, category: c.category })),
      }
    })

    // Compliance summary per kategori
    const categories = [...new Set((allCourses ?? []).map((c) => c.category))]
    const categorySummary = categories.map((cat) => {
      const catCourses = (allCourses ?? []).filter((c) => c.category === cat)
      const catCompletions = (allCompletions ?? []).filter((comp: any) =>
        catCourses.find((c) => c.id === comp.course_id)
      )
      return {
        category: cat,
        total_possible: catCourses.length * teamMembers.length,
        total_completed: catCompletions.length,
      }
    })

    res.json({ team: dashboard, category_summary: categorySummary })
  } catch (err: any) {
    console.error('[academy] GET /dashboard error:', err)
    res.status(500).json({ error: 'Failed to fetch dashboard', detail: err?.message })
  }
})

// ─── GET /v1/academy/gaps ─────────────────────────────────────────────────────
// Persons med kompetens-gap + rekommenderade kurser
router.get('/v1/academy/gaps', async (_req: Request, res: Response) => {
  try {
    // Hämta alla person_competencies med gap (current_level < target_level)
    const { data: gaps, error: ge } = await sb()
      .from('qms_person_competencies')
      .select('*, qms_competencies(competency_code, title, category)')
      .filter('current_level', 'lt', 'target_level')

    if (ge) throw ge

    // Hämta alla kurser
    const { data: courses, error: ce } = await sb()
      .from('qms_courses')
      .select('id, course_code, title, category, level, duration_hours, competency_codes')
      .eq('status', 'active')

    if (ce) throw ce

    // För varje gap: hitta kurser som täcker kompetensen
    const gapReport = (gaps ?? []).map((gap: any) => {
      const compCode = gap.competency_code
      const recommendedCourses = (courses ?? []).filter((c) => {
        const codes: string[] = c.competency_codes ?? []
        return codes.includes(compCode)
      })

      return {
        person_id: gap.person_id,
        competency_code: compCode,
        competency_title: gap.qms_competencies?.title ?? compCode,
        competency_category: gap.qms_competencies?.category ?? null,
        current_level: gap.current_level,
        target_level: gap.target_level,
        gap: (gap.target_level ?? 0) - (gap.current_level ?? 0),
        recommended_courses: recommendedCourses.map((c) => ({
          code: c.course_code,
          title: c.title,
          category: c.category,
          level: c.level,
          duration_hours: c.duration_hours,
        })),
      }
    })

    res.json(gapReport)
  } catch (err: any) {
    console.error('[academy] GET /gaps error:', err)
    res.status(500).json({ error: 'Failed to fetch gaps', detail: err?.message })
  }
})

export default router
