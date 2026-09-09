// Level lifecycle as a pure transition table. The store owns the current phase and
// calls transition(); null means "invalid edge, ignore".
import type { FailCondition } from '@data/levels'

export type Phase = 'loading' | 'intro' | 'play' | 'win' | 'fail' | 'quiz' | 'transition' | 'complete'

export type LevelEvent =
  | 'LOADED'
  | 'INTRO_DONE'
  | 'OBJECTIVES_MET'
  | 'FAILED'
  | 'RETRY'
  | 'NEXT'
  | 'QUIZ_DONE'

export interface TransitionContext {
  hasQuiz: boolean
  isLastLevel: boolean
}

export const FAIL_EVENT: Record<Exclude<FailCondition, 'none'>, LevelEvent> = {
  healthZero: 'FAILED',
  yajnaZero: 'FAILED',
  arrowsOut: 'FAILED',
  timeOut: 'FAILED',
}

export function transition(phase: Phase, event: LevelEvent, ctx: TransitionContext): Phase | null {
  switch (phase) {
    case 'loading':
      return event === 'LOADED' ? 'intro' : null
    case 'intro':
      return event === 'INTRO_DONE' ? 'play' : null
    case 'play':
      if (event === 'OBJECTIVES_MET') return 'win'
      if (event === 'FAILED') return 'fail'
      return null
    case 'fail':
      return event === 'RETRY' ? 'loading' : null
    case 'win':
      if (event !== 'NEXT') return null
      if (ctx.hasQuiz) return 'quiz'
      return ctx.isLastLevel ? 'complete' : 'transition'
    case 'quiz':
      if (event !== 'QUIZ_DONE') return null
      return ctx.isLastLevel ? 'complete' : 'transition'
    case 'transition':
      return event === 'NEXT' ? 'loading' : null
    case 'complete':
      return null
  }
}

/** Phases during which gameplay simulation ticks. */
export function isSimulating(phase: Phase): boolean {
  return phase === 'play'
}
