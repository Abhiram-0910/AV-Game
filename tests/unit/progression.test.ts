import { describe, expect, it } from 'vitest'
import { canEnterLevel, checkAnswer, codexUnlockedBy, gateAfter, nextLevel, scoreQuiz } from '@core/progression'
import { QUIZ_GATES } from '@data/quiz'

describe('progression', () => {
  it('orders levels and ends after l5', () => {
    expect(nextLevel('l1')).toBe('l2')
    expect(nextLevel('l5')).toBeNull()
  })

  it('has a quiz gate after every level except the last', () => {
    expect(gateAfter('l1')?.id).toBe('gate1')
    expect(gateAfter('l4')?.id).toBe('gate4')
    expect(gateAfter('l5')).toBeNull()
  })

  it('unlocks exactly one codex card per level', () => {
    expect(codexUnlockedBy('l1')).toBe('vishwamitra')
    expect(codexUnlockedBy('l5')).toBe('maricha-subahu')
  })

  it('gates entry on the previous level being completed', () => {
    expect(canEnterLevel('l1', [])).toBe(true)
    expect(canEnterLevel('l3', ['l1'])).toBe(false)
    expect(canEnterLevel('l3', ['l1', 'l2'])).toBe(true)
  })

  it('a wrong answer explains and still passes (non-punishing)', () => {
    const wrongs = QUIZ_GATES[0].questions.map((q) => (q.correct + 1) % 4)
    const r = checkAnswer('gate1', 0, wrongs[0])
    expect(r.correct).toBe(false)
    expect(r.explanation.length).toBeGreaterThan(20)
    const score = scoreQuiz('gate1', wrongs)
    expect(score).toEqual({ correct: 0, total: 3, passed: true })
  })

  it('scores correct answers', () => {
    const gate = QUIZ_GATES[1]
    expect(scoreQuiz(gate.id, gate.questions.map((q) => q.correct)).correct).toBe(3)
  })
})
