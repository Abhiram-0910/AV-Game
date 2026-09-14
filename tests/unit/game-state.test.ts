import { beforeEach, describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { createGameStore } from '@core/game-state'
import { worldStore } from '@systems/world'

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

  it('regenerates health only after REGEN_DELAY_TICKS without a hit, never past max', () => {
    enterPlay('l3')
    const { INVULN_TICKS, REGEN_DELAY_TICKS, REGEN_PER_TICK, MAX_HEALTH } = BALANCE.player
    s().damagePlayer(10, 1000)
    const hurt = s().health
    s().regenHealth(1000 + REGEN_DELAY_TICKS - 1)
    expect(s().health).toBe(hurt)
    s().regenHealth(1000 + REGEN_DELAY_TICKS)
    expect(s().health).toBeCloseTo(hurt + REGEN_PER_TICK)
    s().damagePlayer(5, 1000 + INVULN_TICKS + 1) // a new hit restarts the delay
    const again = s().health
    s().regenHealth(1000 + REGEN_DELAY_TICKS + 10)
    expect(s().health).toBe(again)
    for (let t = 0; t < 1000; t += 1) s().regenHealth(5000 + t)
    expect(s().health).toBe(MAX_HEALTH)
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

  it('yajna damage respects its own invulnerability window, mirroring the player', () => {
    enterPlay('l5')
    s().damageYajna(20, 0)
    s().damageYajna(20, 1)
    expect(s().yajnaIntegrity).toBe(BALANCE.yajna.MAX_INTEGRITY - 20)
    s().damageYajna(999, BALANCE.yajna.HIT_INVULN_TICKS)
    expect(s().yajnaIntegrity).toBe(0)
    expect(s().phase).toBe('fail')
  })

  it('yajna damage fails l5 at zero', () => {
    enterPlay('l5')
    s().damageYajna(BALANCE.yajna.MAX_INTEGRITY, 0)
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

  it('Level 2: shooting down all 3 targets cleanly completes the level and opens gate2 quiz', () => {
    s().startLevel('l2')
    s().dispatch('LOADED')
    s().dispatch('INTRO_DONE')
    expect(s().phase).toBe('play')
    s().progress({ kind: 'reach', waypoint: 'riverbank' })
    s().progress({ kind: 'talk', dialogueKey: 'l2.vishwamitra.mantras' })
    s().progress({ kind: 'reach', waypoint: 'range' })
    s().progress({ kind: 'talk', dialogueKey: 'l2.vishwamitra.bow' })
    expect(s().phase).toBe('play')

    // First two targets
    s().progress({ kind: 'hitTargets' })
    s().progress({ kind: 'hitTargets' })
    expect(s().phase).toBe('play')

    // Third target eliminates the final objective
    s().progress({ kind: 'hitTargets' })
    expect(s().phase).toBe('win')
    expect(s().completed).toContain('l2')
    expect(s().codex).toContain('yajna')

    // Level transition screen / quiz
    s().dispatch('NEXT')
    expect(s().phase).toBe('quiz')
    expect(s().quiz.gate).toBe('gate2')
  })

  it('completeObjective and checkLevelObjectives helper actions transition phase to win', () => {
    enterPlay('l1')
    expect(s().checkLevelObjectives()).toBe(false)
    for (let i = 0; i < 5; i += 1) s().completeObjective(i)
    expect(s().checkLevelObjectives()).toBe(true)
    expect(s().phase).toBe('win')
  })

  it('registers Tataka boss health in worldStore and tracks HP', () => {
    worldStore.getState().setBoss({
      kind: 'tataka',
      health: BALANCE.enemies.tataka.HEALTH,
      max: BALANCE.enemies.tataka.HEALTH,
    })
    const boss = worldStore.getState().boss
    expect(boss).not.toBeNull()
    expect(boss?.kind).toBe('tataka')
    expect(boss?.health).toBe(BALANCE.enemies.tataka.HEALTH)
    expect(boss?.max).toBe(BALANCE.enemies.tataka.HEALTH)

    worldStore.getState().setBoss({
      kind: 'tataka',
      health: 120,
      max: BALANCE.enemies.tataka.HEALTH,
    })
    expect(worldStore.getState().boss?.health).toBe(120)
    worldStore.getState().setBoss(null)
    expect(worldStore.getState().boss).toBeNull()
  })

  it('tracks astraReady state in worldStore', () => {
    expect(worldStore.getState().astraReady).toBe(false)
    worldStore.getState().setAstraReady(true)
    expect(worldStore.getState().astraReady).toBe(true)
    worldStore.getState().setAstraReady(false)
    expect(worldStore.getState().astraReady).toBe(false)
  })

  it('RETRY reloads the level as a new attempt: fresh objectives and resources, no intro', () => {
    enterPlay('l4')
    s().progress({ kind: 'talk', dialogueKey: 'l4.vishwamitra.astras' })
    s().progress({ kind: 'reach', waypoint: 'firingLine' })
    s().progress({ kind: 'hitTargets' })
    s().fireArrow()
    s().fail('arrowsOut')
    expect(s().phase).toBe('fail')
    expect(s().attempt).toBe(0)
    s().dispatch('RETRY')
    // The attempt change is what remounts the scene (App.tsx keys it), so targets re-register.
    expect(s().attempt).toBe(1)
    expect(s().phase).toBe('loading')
    expect(s().objectives.every((o) => !o.done && o.progress === 0)).toBe(true)
    expect(s().arrows).toBe(BALANCE.player.START_ARROWS)
    s().dispatch('LOADED')
    expect(s().phase).toBe('play')
    // A new level starts back at attempt 0 with its intro.
    store.setState({ phase: 'transition' })
    s().dispatch('NEXT')
    expect(s().attempt).toBe(0)
    s().dispatch('LOADED')
    expect(s().phase).toBe('intro')
  })

  it('dual astra: unlock, select, cast, and persistence', () => {
    enterPlay('l4')
    expect(s().unlockedAstras).toEqual([])
    expect(s().selectedAstra).toBeNull()
    s().unlockAstra('manavastra')
    expect(s().unlockedAstras).toEqual(['manavastra'])
    expect(s().selectedAstra).toBe('manavastra')
    s().unlockAstra('agneyastra')
    expect(s().unlockedAstras).toEqual(['manavastra', 'agneyastra'])
    s().selectAstra('agneyastra')
    expect(s().selectedAstra).toBe('agneyastra')

    expect(s().castAstra(0)).toBe(true)
    expect(s().astraCharges).toBe(0)
    expect(s().castAstra(1)).toBe(false)

    const snap = s().snapshot()
    expect(snap.unlockedAstras).toEqual(['manavastra', 'agneyastra'])
    const fresh = createGameStore()
    fresh.getState().hydrate(snap)
    expect(fresh.getState().unlockedAstras).toEqual(['manavastra', 'agneyastra'])
    expect(fresh.getState().selectedAstra).toBe('manavastra')
  })
})

