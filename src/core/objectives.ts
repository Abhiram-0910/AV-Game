// Objective progress: pure functions over a level's objective list.
import type { EnemyKind, Objective } from '@data/levels'

export interface ObjectiveProgress {
  done: boolean
  progress: number
}

export type ObjectiveEvent =
  | { kind: 'talk'; dialogueKey: string }
  | { kind: 'reach'; waypoint: string }
  | { kind: 'hitTargets' }
  | { kind: 'chargeAstra' }
  | { kind: 'defeat'; enemy: EnemyKind }
  | { kind: 'survive'; ticks: number }

export function freshProgress(objectives: readonly Objective[]): ObjectiveProgress[] {
  return objectives.map(() => ({ done: false, progress: 0 }))
}

function matches(o: Objective, e: ObjectiveEvent): boolean {
  if (o.kind !== e.kind) return false
  switch (e.kind) {
    case 'talk':
      return o.kind === 'talk' && o.dialogueKey === e.dialogueKey
    case 'reach':
      return o.kind === 'reach' && o.waypoint === e.waypoint
    case 'defeat':
      return o.kind === 'defeat' && o.enemy === e.enemy
    default:
      return true
  }
}

function requiredFor(o: Objective): number {
  switch (o.kind) {
    case 'hitTargets':
    case 'chargeAstra':
    case 'defeat':
      return o.count
    case 'survive':
      return o.ticks
    default:
      return 1
  }
}

/** Apply an event to the first matching incomplete objective. Returns a new array. */
export function applyObjectiveEvent(
  objectives: readonly Objective[],
  progress: readonly ObjectiveProgress[],
  e: ObjectiveEvent,
): ObjectiveProgress[] {
  const i = objectives.findIndex((o, idx) => !progress[idx].done && matches(o, e))
  if (i < 0) return [...progress]
  const o = objectives[i]
  const step = e.kind === 'survive' ? e.ticks : 1
  const next = Math.min(requiredFor(o), progress[i].progress + step)
  return progress.map((p, idx) => (idx === i ? { done: next >= requiredFor(o), progress: next } : p))
}

export function allDone(progress: readonly ObjectiveProgress[]): boolean {
  return progress.every((p) => p.done)
}

export function currentObjectiveIndex(progress: readonly ObjectiveProgress[]): number {
  return progress.findIndex((p) => !p.done)
}
