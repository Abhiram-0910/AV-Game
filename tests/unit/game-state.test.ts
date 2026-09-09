import { beforeEach, describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { createGameStore } from '@core/game-state'

let store: ReturnType<typeof createGameStore>
const s = () => store.getState()

function enterPlay(level: 'l1' | 'l3' | 'l4' | 'l5' = 'l1') {
  s().startLevel(level)
  s().dispatch('LOADED')
  s().dispatch('INTRO_DONE')
}

beforeEach(() => {
  store = createGameStore()
})

describe('game state', () => {
  it('starts on l1 in loading with full resources', () => {
    expect(s().level).toBe('l1')
    expect(s().phase).toBe('loading')
    expect(s().health).toBe(BALANCE.player.MAX_HEALTH)
    expect(s().arrows).toBe(BALANCE.player.START_ARROWS)
  })

  it('ignores invalid phase events', () => {
    s().dispatch('QUIZ_DONE')
    expect(s().phase).toBe('loading')
  })

  it('completing every objective wins, unlocks the codex card, and opens the quiz', () => {
    enterPlay('l1')
    s().progress({ kind: 'reach', waypoint: 'throne' })
    s().progress({ kind: 'talk', dialogueKey: 'l1.vishwamitra.request' })
    s().progress({ kind: 'talk', dialogueKey: 'l1.dasharatha.hesitates' })
    s().progress({ kind: 'talk', dialogueKey: 'l1.vasishtha.counsel' })
    expect(s().phase).toBe('play')
    s().progress({ kind: 'talk', dialogueKey: 'l1.dasharatha.consents' })
    expect(s().phase).toBe('win')
    expect(s().completed).toEqual(['l1'])
    expect(s().codex).toEqual(['vishwamitra'])
    s().dispatch('NEXT')
    expect(s().phase).toBe('quiz')
    expect(s().quiz.gate).toBe('gate1')
  })

  it('quiz: three answers finish the gate regardless of correctness, then the next level loads', () => {
    enterPlay('l1')
    store.setState({ phase: 'win' })
    s().dispatch('NEXT')
    expect(s().answerQuiz(3)).not.toBeNull()
    s().answerQuiz(3)
    s().answerQuiz(3)
    expect(s().phase).toBe('transition')
    s().dispatch('NEXT')
    expect(s().level).toBe('l2')
    expect(s().phase).toBe('loading')
    expect(s().answerQuiz(0)).toBeNull()
  })

  it('damage respects the invulnerability window and fails the level at zero when allowed', () => {
    enterPlay('l3')
    s().damagePlayer(30, 0)
    s().damagePlayer(30, 1)
    expect(s().health).toBe(70)
    s().damagePlayer(999, BALANCE.player.INVULN_TICKS)
    expect(s().health).toBe(0)
    expect(s().phase).toBe('fail')
    s().dispatch('RETRY')
    expect(s().level).toBe('l3')
    expect(s().health).toBe(BALANCE.player.MAX_HEALTH)
  })

  it('healthZero on a level that lists fail: none does not fail', () => {
    enterPlay('l1')
    s().damagePlayer(999, 0)
    expect(s().health).toBe(0)
    expect(s().phase).toBe('play')
  })

  it('yajna damage fails l5 at zero', () => {
    enterPlay('l5')
    s().damageYajna(BALANCE.yajna.MAX_INTEGRITY)
    expect(s().phase).toBe('fail')
  })

  it('arrows and astra charges clamp at their limits', () => {
    enterPlay('l4')
    store.setState({ arrows: 1 })
    expect(s().fireArrow()).toBe(true)
    expect(s().fireArrow()).toBe(false)
    for (let i = 0; i < 10; i += 1) s().pickupArrows()
    expect(s().arrows).toBe(BALANCE.player.MAX_ARROWS)
    for (let i = 0; i < 10; i += 1) s().addAstraCharge()
    expect(s().astraCharges).toBe(BALANCE.astra.MAX_CHARGES)
    expect(s().useAstra(0)).toBe(true)
    expect(s().useAstra(1)).toBe(false)
    expect(s().useAstra(BALANCE.astra.COOLDOWN_TICKS)).toBe(true)
  })

  it('L5 survive objective accumulates ticks and defeats are order-independent', () => {
    enterPlay('l5')
    s().progress({ kind: 'defeat', enemy: 'maricha' })
    s().progress({ kind: 'defeat', enemy: 'subahu' })
    s().progress({ kind: 'survive', ticks: 5399 })
    expect(s().phase).toBe('play')
    s().progress({ kind: 'survive', ticks: 1 })
    expect(s().phase).toBe('win')
    s().dispatch('NEXT')
    expect(s().phase).toBe('complete')
  })

  it('snapshot and hydrate round-trip progress and settings', () => {
    enterPlay('l1')
    store.setState({ completed: ['l1'], codex: ['vishwamitra'], quizScores: { gate1: 3 } })
    s().setSettings({ qualityTier: 'high' })
    const snap = s().snapshot()
    const fresh = createGameStore()
    fresh.getState().hydrate(snap)
    expect(fresh.getState().snapshot()).toEqual(snap)
    expect(fresh.getState().settings.qualityTier).toBe('high')
  })
})
