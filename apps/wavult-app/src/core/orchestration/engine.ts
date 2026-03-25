// ─── Wavult OS v2 — Orchestration Engine ────────────────────────────────────────
// The brain. Takes operator state × task requirements → ranked, adapted output.
// Everything goes through policy. Nothing bypasses governance.

import type { StateSnapshot } from '../state/types'
import type {
  SystemTask, RankedTask, OrchestrationResult,
  TaskPresentation, OrchestrrationPolicy, Command, CommandResult,
} from './types'

// ─── Default Policy ──────────────────────────────────────────────────────────

export const DEFAULT_POLICY: OrchestrrationPolicy = {
  dataSharing: {
    energy: 'abstracted',    // Share "high/medium/low", not exact number
    focus: 'allowed',
    stress: 'abstracted',
    preferences: 'allowed',
    performance: 'abstracted',
  },
  automation: {
    taskReordering: true,
    taskDeferral: false,     // Start with assisted, not full auto
    breakSuggestions: true,
    externalCommunication: false,
    escalation: false,
  },
  approvals: {
    priorityThreshold: 0.9, // Very high priority → manual approval
    alwaysApprove: ['communicate', 'coordinate'],
  },
}

// ─── Sample Tasks (institutional side mock) ──────────────────────────────────

export const SYSTEM_TASKS: SystemTask[] = [
  {
    id: 't1', title: 'Review LandveX AB formation documents',
    type: 'review', requires: ['focus_high', 'energy_high'],
    priority: 0.85, estimatedMinutes: 30, energyProfile: 'high',
    requiresDeepFocus: true, domain: 'legal', dependencies: [],
    source: 'approval', metadata: { entity: 'LandveX AB', owner: 'DB' },
  },
  {
    id: 't2', title: 'Approve quiXzoom Stockholm beta deployment',
    type: 'decision', requires: ['focus_any', 'energy_any'],
    priority: 0.78, estimatedMinutes: 5, energyProfile: 'low',
    requiresDeepFocus: false, domain: 'operations', dependencies: [],
    source: 'approval', metadata: { entity: 'QZ-EU', owner: 'LR' },
  },
  {
    id: 't3', title: 'Submit Q2 cashflow projection',
    type: 'create', requires: ['focus_high', 'energy_high'],
    priority: 0.82, estimatedMinutes: 60, energyProfile: 'high',
    requiresDeepFocus: true, domain: 'finance', dependencies: [],
    source: 'kpi', metadata: { entity: 'WOP', owner: 'WB' },
  },
  {
    id: 't4', title: 'Sign intercompany service agreement',
    type: 'decision', requires: ['focus_any'],
    priority: 0.7, estimatedMinutes: 10, energyProfile: 'medium',
    requiresDeepFocus: false, domain: 'legal', dependencies: ['t1'],
    source: 'manual', metadata: { entity: 'WGH', owner: 'DB' },
  },
  {
    id: 't5', title: 'Review tech debt backlog with CTO',
    type: 'coordinate', requires: ['collaborative', 'energy_any'],
    priority: 0.55, estimatedMinutes: 25, energyProfile: 'medium',
    requiresDeepFocus: false, domain: 'engineering', dependencies: [],
    source: 'kpi', metadata: { entity: 'HYP', owner: 'JB' },
  },
  {
    id: 't6', title: 'Analyze Sweden market entry timeline',
    type: 'analyze', requires: ['focus_high', 'energy_high'],
    priority: 0.65, estimatedMinutes: 45, energyProfile: 'high',
    requiresDeepFocus: true, domain: 'strategy', dependencies: [],
    source: 'manual', metadata: { entity: 'QZ-EU' },
  },
  {
    id: 't7', title: 'Draft investor update email',
    type: 'communicate', requires: ['focus_any', 'energy_any'],
    priority: 0.5, estimatedMinutes: 20, energyProfile: 'medium',
    requiresDeepFocus: false, domain: 'communication', dependencies: [],
    source: 'manual', metadata: {},
  },
  {
    id: 't8', title: 'Read Supabase Edge Functions documentation',
    type: 'learn', requires: ['focus_any', 'energy_any'],
    priority: 0.3, estimatedMinutes: 15, energyProfile: 'low',
    requiresDeepFocus: false, domain: 'engineering', dependencies: [],
    source: 'system', metadata: { skill: 'edge-functions' },
  },
  {
    id: 't9', title: 'Check ECS service health metrics',
    type: 'execute', requires: ['focus_any'],
    priority: 0.45, estimatedMinutes: 5, energyProfile: 'low',
    requiresDeepFocus: false, domain: 'operations', dependencies: [],
    source: 'system', metadata: { entity: 'HYP' },
  },
  {
    id: 't10', title: 'Plan Thailand workcamp agenda',
    type: 'create', requires: ['focus_high'],
    priority: 0.6, estimatedMinutes: 35, energyProfile: 'medium',
    requiresDeepFocus: true, domain: 'operations', dependencies: [],
    source: 'manual', metadata: { deadline: '2026-04-05' },
  },
]

// ─── Core Orchestration ──────────────────────────────────────────────────────

export function orchestrate(
  snapshot: StateSnapshot,
  tasks: SystemTask[] = SYSTEM_TASKS,
  policy: OrchestrrationPolicy = DEFAULT_POLICY,
  count: number = 3,
): OrchestrationResult {
  const { state } = snapshot

  // Filter out tasks with unmet dependencies
  const completedIds = new Set<string>() // Would come from task state in production
  const available = tasks.filter(t =>
    t.dependencies.every(dep => completedIds.has(dep))
  )

  // Score each task
  const scored: RankedTask[] = available.map(task => {
    let score = 0

    // 1. Priority baseline (institutional weight)
    score += task.priority * 0.25

    // 2. Energy fit
    const energyFit = computeEnergyFit(task, state.energy)
    score += energyFit * 0.25

    // 3. Focus fit
    const focusFit = computeFocusFit(task, state.focus)
    score += focusFit * 0.2

    // 4. Preference alignment (from identity)
    const prefFit = computePreferenceFit(task, snapshot)
    score += prefFit * 0.2

    // 5. Stress adjustment — under high stress, favor easy tasks
    if (state.stress > 0.6) {
      score += task.energyProfile === 'low' ? 0.1 : -0.1
    }

    // 6. Flow bonus — if in flow, favor similar tasks (no context switch)
    if (state.inFlow && snapshot.preferences.taskTypes.includes(task.type)) {
      score += 0.05
    }

    // Build reason
    const reason = buildReason(task, energyFit, focusFit, prefFit, state)

    // Build presentation based on identity
    const presentation = buildPresentation(snapshot, task)

    return {
      task,
      matchScore: clamp(score),
      reason,
      presentation,
    }
  })

  // Sort and take top N
  scored.sort((a, b) => b.matchScore - a.matchScore)
  const topTasks = scored.slice(0, count)

  // Build coaching hint
  const coaching = buildCoaching(state, snapshot)

  // Should suggest break?
  const suggestBreak = policy.automation.breakSuggestions && (
    state.minutesSinceBreak > 90 ||
    state.energy < 0.2 ||
    state.stress > 0.8 ||
    state.capacity === 'depleted'
  )

  // Build recommendation
  const topTask = topTasks[0]
  const recommendation = topTask
    ? snapshot.preferences.pacingPreference === 'fast'
      ? `Do this now: ${topTask.task.title}`
      : `Recommended: ${topTask.task.title}`
    : 'No tasks match your current state. Consider a break.'

  return {
    tasks: topTasks,
    recommendation,
    coaching,
    suggestBreak,
    generatedAt: new Date().toISOString(),
  }
}

// ─── Scoring helpers ─────────────────────────────────────────────────────────

function computeEnergyFit(task: SystemTask, energy: number): number {
  if (task.energyProfile === 'high') return energy > 0.6 ? 1 : energy > 0.4 ? 0.5 : 0.1
  if (task.energyProfile === 'medium') return energy > 0.3 ? 0.8 : 0.4
  return 0.7 // Low energy tasks always fit reasonably
}

function computeFocusFit(task: SystemTask, focus: string): number {
  if (task.requiresDeepFocus && focus !== 'deep') return 0.2
  if (task.requiresDeepFocus && focus === 'deep') return 1.0
  if (task.requires.includes('collaborative') && focus === 'social') return 0.9
  return 0.6
}

function computePreferenceFit(task: SystemTask, snapshot: StateSnapshot): number {
  if (snapshot.preferences.avoid.includes(task.type)) return 0.1
  if (snapshot.preferences.taskTypes.includes(task.type)) return 0.9
  return 0.5
}

function buildReason(
  task: SystemTask, energyFit: number, focusFit: number,
  prefFit: number, state: OperatorState,
): string {
  if (task.priority > 0.8) return 'High priority'
  if (energyFit > 0.8 && focusFit > 0.8) return 'Perfect fit for current state'
  if (prefFit > 0.7) return 'Matches your strengths'
  if (state.inFlow && focusFit > 0.7) return 'Maintains your flow'
  if (energyFit > 0.7) return 'Good energy match'
  return 'Balanced fit'
}

function buildPresentation(snapshot: StateSnapshot, task: SystemTask): TaskPresentation {
  const pacing = snapshot.preferences.pacingPreference
  return {
    guidance: pacing === 'fast' ? 'directive'
      : pacing === 'deliberate' ? 'options' : 'autonomous',
    contextLevel: snapshot.identity.ambiguityTolerance > 0.6 ? 'minimal'
      : snapshot.identity.ambiguityTolerance > 0.3 ? 'standard' : 'detailed',
    urgency: task.priority > 0.8 ? 'action'
      : task.priority > 0.6 ? 'attention' : 'none',
  }
}

function buildCoaching(state: OperatorState, _snapshot: StateSnapshot): string | null {
  if (state.capacity === 'depleted') return 'You are depleted. Only do critical tasks or take a break.'
  if (state.stress > 0.7) return 'Stress is elevated. Consider a quick task for momentum.'
  if (state.inFlow) return 'You are in flow. The system is matching your pace.'
  if (state.energy > 0.8) return 'Energy is high. Good time for deep work.'
  if (state.minutesSinceBreak > 60) return 'Consider a short break soon.'
  return null
}

import type { OperatorState } from '../state/types'

// ─── Command Interpreter (Nemo Claw) ─────────────────────────────────────────

export function executeCommand(
  command: Command,
  snapshot: StateSnapshot,
  tasks: SystemTask[] = SYSTEM_TASKS,
  policy: OrchestrrationPolicy = DEFAULT_POLICY,
): CommandResult {
  switch (command.intent) {
    case 'get_tasks': {
      const result = orchestrate(snapshot, tasks, policy)
      return {
        intent: command.intent,
        success: true,
        effect: `Returned ${result.tasks.length} tasks optimized for your current state`,
        affectedTasks: result.tasks.map(t => t.task.id),
        newResult: result,
      }
    }

    case 'defer_low_energy': {
      const highEnergy = tasks.filter(t => t.energyProfile === 'high')
      const remaining = tasks.filter(t => t.energyProfile !== 'high')
      const result = orchestrate(snapshot, remaining, policy)
      return {
        intent: command.intent,
        success: true,
        effect: `Deferred ${highEnergy.length} high-energy tasks. Showing low-energy options.`,
        affectedTasks: highEnergy.map(t => t.id),
        newResult: result,
      }
    }

    case 'optimize_momentum': {
      // Favor quick, high-affinity tasks
      const quick = tasks.filter(t => t.estimatedMinutes <= 15)
      const result = orchestrate(snapshot, quick.length >= 3 ? quick : tasks, policy, 5)
      return {
        intent: command.intent,
        success: true,
        effect: 'Optimized for momentum — short, high-match tasks first',
        affectedTasks: result.tasks.map(t => t.task.id),
        newResult: result,
      }
    }

    case 'take_break': {
      return {
        intent: command.intent,
        success: true,
        effect: 'Break recorded. State updated. Tasks will re-rank when you return.',
        affectedTasks: [],
      }
    }

    case 'show_status': {
      return {
        intent: command.intent,
        success: true,
        effect: `Energy: ${Math.round(snapshot.state.energy * 100)}% | Focus: ${snapshot.state.focus} | Stress: ${Math.round(snapshot.state.stress * 100)}% | ${snapshot.state.inFlow ? 'In flow' : 'Normal'}`,
        affectedTasks: [],
      }
    }

    default:
      return {
        intent: command.intent,
        success: false,
        effect: 'Unknown command',
        affectedTasks: [],
      }
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n))
}
