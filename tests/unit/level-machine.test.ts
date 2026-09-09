import { describe, expect, it } from 'vitest'
import { transition, type LevelEvent, type Phase } from '@core/level-machine'

const EVENTS: LevelEvent[] = ['LOADED', 'INTRO_DONE', 'OBJECTIVES_MET', 'FAILED', 'RETRY', 'NEXT', 'QUIZ_DONE']
const mid = { hasQuiz: true, isLastLevel: false }
const last = { hasQuiz: false, isLastLevel: true }

describe('level machine', () => {
  it('walks the happy path with a quiz gate', () => {
    const path: [Phase, LevelEvent, Phase][] = [
      ['loading', 'LOADED', 'intro'],
      ['intro', 'INTRO_DONE', 'play'],
      ['play', 'OBJECTIVES_MET', 'win'],
      ['win', 'NEXT', 'quiz'],
      ['quiz', 'QUIZ_DONE', 'transition'],
      ['transition', 'NEXT', 'loading'],
    ]
    for (const [from, ev, to] of path) expect(transition(from, ev, mid)).toBe(to)
  })

  it('skips the quiz when there is no gate and completes on the last level', () => {
    expect(transition('win', 'NEXT', { hasQuiz: false, isLastLevel: false })).toBe('transition')
    expect(transition('win', 'NEXT', last)).toBe('complete')
    expect(transition('quiz', 'QUIZ_DONE', { hasQuiz: true, isLastLevel: true })).toBe('complete')
  })

  it('fail → retry reloads the same level', () => {
    expect(transition('play', 'FAILED', mid)).toBe('fail')
    expect(transition('fail', 'RETRY', mid)).toBe('loading')
  })

  it('returns null on every invalid edge', () => {
    const valid = new Set(['loading:LOADED', 'intro:INTRO_DONE', 'play:OBJECTIVES_MET', 'play:FAILED', 'fail:RETRY', 'win:NEXT', 'quiz:QUIZ_DONE', 'transition:NEXT'])
    const phases: Phase[] = ['loading', 'intro', 'play', 'win', 'fail', 'quiz', 'transition', 'complete']
    for (const p of phases) {
      for (const e of EVENTS) {
        const expected = valid.has(`${p}:${e}`)
        expect(transition(p, e, mid) !== null, `${p} + ${e}`).toBe(expected)
      }
    }
  })
})
