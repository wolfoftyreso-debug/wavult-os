/**
 * useAcademyData — hook som hämtar från /v1/academy/*
 * Hanterar kurser, personliga framsteg, team-dashboard och kompetens-gaps.
 */

import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

export interface AcademyCourse {
  id: string
  course_code: string
  title: string
  description: string | null
  category: 'iso_9001' | 'iso_27001' | 'gdpr' | 'nis2' | 'system' | 'product'
  level: 'awareness' | 'practitioner' | 'expert'
  duration_hours: number
  competency_codes: string[]
  iso_clauses: string[]
  mandatory_for: string[]
  status: string
  created_at: string
}

export interface CourseCompletion {
  id: string
  person_id: string
  course_id: string
  started_at: string
  completed_at: string | null
  score: number | null
  passed: boolean
}

export interface PersonProgress {
  person_id: string
  stats: {
    total_required: number
    completed: number
    in_progress: number
    not_started: number
    compliance_percent: number
  }
  progress: Array<{
    course: AcademyCourse
    status: 'completed' | 'in_progress' | 'not_started'
    completion: CourseCompletion | null
  }>
  all_completions: CourseCompletion[]
}

export interface TeamDashboard {
  team: Array<{
    person_id: string
    required: number
    completed: number
    pending: number
    compliance_percent: number
    pending_courses: Array<{ code: string; title: string; category: string }>
    completed_courses: Array<{ code: string; title: string; category: string }>
  }>
  category_summary: Array<{
    category: string
    total_possible: number
    total_completed: number
  }>
}

export interface GapEntry {
  person_id: string
  competency_code: string
  competency_title: string
  competency_category: string | null
  current_level: number
  target_level: number
  gap: number
  recommended_courses: Array<{
    code: string
    title: string
    category: string
    level: string
    duration_hours: number
  }>
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

// ─── Hook: kurslista ─────────────────────────────────────────────────────────
export function useAcademyCourses(category?: string) {
  const [courses, setCourses] = useState<AcademyCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = category ? `?category=${category}` : ''
    apiFetch<AcademyCourse[]>(`/v1/academy/courses${params}`)
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [category])

  return { courses, loading, error }
}

// ─── Hook: personlig progress ─────────────────────────────────────────────────
export function usePersonProgress(personId: string | null) {
  const [data, setData] = useState<PersonProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!personId) return
    setLoading(true)
    apiFetch<PersonProgress>(`/v1/academy/person/${personId}/progress`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [personId])

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload }
}

// ─── Hook: team-dashboard ─────────────────────────────────────────────────────
export function useAcademyDashboard() {
  const [data, setData] = useState<TeamDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<TeamDashboard>('/v1/academy/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

// ─── Hook: kompetens-gaps ─────────────────────────────────────────────────────
export function useAcademyGaps() {
  const [gaps, setGaps] = useState<GapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<GapEntry[]>('/v1/academy/gaps')
      .then(setGaps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { gaps, loading, error }
}

// ─── Action: markera kurs avklarad ────────────────────────────────────────────
export async function completeCourse(
  courseCode: string,
  personId: string,
  score: number
): Promise<{ success: boolean; passed: boolean; competency_updates: any[] }> {
  const res = await fetch(`${API_BASE}/v1/academy/courses/${courseCode}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: personId, score }),
  })
  if (!res.ok) throw new Error(`Failed to complete course: ${res.status}`)
  return res.json()
}
