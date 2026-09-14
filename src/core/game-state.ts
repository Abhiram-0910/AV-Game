// The zustand store (vanilla — pass 2 wraps it with useStore). Every action lives here.
import { createStore, type StoreApi } from 'zustand/vanilla'
import { BALANCE } from '@data/balance'
import type { CodexId } from '@data/codex'
import type { FailCondition, LevelId } from '@data/levels'
import type { GateId } from '@data/quiz'
import { FAIL_EVENT, transition, type LevelEvent, type Phase } from './level-machine'
import {
  applyObjectiveEvent, checkLevelObjectives, completeObjective, freshProgress,
  type ObjectiveEvent, type ObjectiveProgress,
} from './objectives'
import { checkAnswer, codexUnlockedBy, gateAfter, isLastLevel, levelDef, nextLevel, scoreQuiz } from './progression'
import { DEFAULT_SAVE, type AstraId, type BenchmarkTier, type Save, type Settings } from './save'

export interface QuizState { gate: GateId | null; index: number; answers: number[] }

export interface GameState {
  level: LevelId
  phase: Phase
  /** Retries of this level so far. The scene is keyed on it, so a retry remounts every entity. */
  attempt: number
  health: number
  playerInvulnUntil: number
  arrows: number
  astraCharges: number
  astraCooldownUntil: number
  unlockedAstras: AstraId[]
  selectedAstra: AstraId | null
  yajnaIntegrity: number
  yajnaInvulnUntil: number
  objectives: ObjectiveProgress[]
  completed: LevelId[]
  codex: CodexId[]
  quiz: QuizState
  quizScores: Partial<Record<GateId, number>>
  settings: Settings
  benchmarkTier: BenchmarkTier
  benchmarkRenderer?: string
}

export interface GameActions {
  startLevel(id: LevelId): void
  dispatch(event: LevelEvent): void
  progress(e: ObjectiveEvent): void
  completeObjective(index?: number): void
  checkLevelObjectives(): boolean
  damagePlayer(amount: number, tick: number): void
  damageYajna(amount: number, tick: number): void
  fireArrow(): boolean
  pickupArrows(): void
  useAstra(tick: number): boolean
  castAstra(tick?: number): boolean
  unlockAstra(id: AstraId): void
  selectAstra(id: AstraId): void
  addAstraCharge(): void
  fail(condition: FailCondition): void
  answerQuiz(option: number): { correct: boolean; explanation: string } | null
  setSettings(patch: Partial<Settings>): void
  setBenchmarkTier(tier: BenchmarkTier, renderer: string): void
  hydrate(save: Save): void
  snapshot(): Save
  reset(): void
}

export type GameStore = GameState & GameActions

type BaseState = Omit<GameState, 'completed' | 'codex' | 'quizScores' | 'settings' | 'benchmarkTier' | 'benchmarkRenderer' | 'unlockedAstras' | 'selectedAstra'>

function levelStart(id: LevelId, attempt = 0): BaseState {
  return {
    level: id,
    phase: 'loading',
    attempt,
    health: BALANCE.player.MAX_HEALTH,
    playerInvulnUntil: 0,
    arrows: BALANCE.player.START_ARROWS,
    astraCharges: BALANCE.astra.START_CHARGES,
    astraCooldownUntil: 0,
    yajnaIntegrity: BALANCE.yajna.MAX_INTEGRITY,
    yajnaInvulnUntil: 0,
    objectives: freshProgress(levelDef(id).objectives),
    quiz: { gate: null, index: 0, answers: [] },
  }
}

const initial = (): GameState => ({
  ...levelStart(DEFAULT_SAVE.level),
  completed: [],
  codex: [],
  quizScores: {},
  settings: { ...DEFAULT_SAVE.settings },
  benchmarkTier: DEFAULT_SAVE.benchmarkTier,
  unlockedAstras: [],
  selectedAstra: null,
})

type Set = StoreApi<GameStore>['setState']
type Get = StoreApi<GameStore>['getState']

function flowActions(set: Set, get: Get) {
  return {
    startLevel: (id: LevelId) => set(levelStart(id)),

    dispatch: (event: LevelEvent) => {
      const s = get()
      const ctx = { hasQuiz: gateAfter(s.level) !== null, isLastLevel: isLastLevel(s.level), retry: s.attempt > 0 }
      const phase = transition(s.phase, event, ctx)
      if (phase !== null) set(onEnterPhase(s, phase))
    },

    fail: (condition: FailCondition) => {
      const s = get()
      if (condition !== 'none' && levelDef(s.level).fail.includes(condition)) get().dispatch(FAIL_EVENT[condition])
    },

    answerQuiz: (option: number) => {
      const s = get()
      if (s.phase !== 'quiz' || s.quiz.gate === null) return null
      const result = checkAnswer(s.quiz.gate, s.quiz.index, option)
      const quiz = { ...s.quiz, index: s.quiz.index + 1, answers: [...s.quiz.answers, option] }
      set({ quiz })
      const score = scoreQuiz(s.quiz.gate, quiz.answers)
      if (quiz.index >= score.total) {
        set({ quizScores: { ...s.quizScores, [s.quiz.gate]: score.correct } })
        get().dispatch('QUIZ_DONE')
      }
      return result
    },
  }
}

function objectiveActions(set: Set, get: Get) {
  return {
    progress: (e: ObjectiveEvent) => {
      const s = get()
      if (s.phase !== 'play') return
      const objectives = applyObjectiveEvent(levelDef(s.level).objectives, s.objectives, e)
      set({ objectives })
      if (checkLevelObjectives(objectives)) get().dispatch('OBJECTIVES_MET')
    },

    completeObjective: (index?: number) => {
      const s = get()
      if (s.phase !== 'play') return
      const objectives = completeObjective(levelDef(s.level).objectives, s.objectives, index)
      set({ objectives })
      if (checkLevelObjectives(objectives)) get().dispatch('OBJECTIVES_MET')
    },

    checkLevelObjectives: () => {
      const s = get()
      const done = checkLevelObjectives(s.objectives)
      if (done && s.phase === 'play') get().dispatch('OBJECTIVES_MET')
      return done
    },
  }
}

function resourceActions(set: Set, get: Get) {
  return {
    damagePlayer: (amount: number, tick: number) => {
      const s = get()
      if (s.phase !== 'play' || tick < s.playerInvulnUntil) return
      const health = Math.max(0, s.health - amount)
      set({ health, playerInvulnUntil: tick + BALANCE.player.INVULN_TICKS })
      if (health === 0) get().fail('healthZero')
    },

    // Yajna hit invulnerability window mirrors playerInvulnUntil against multi-attacker drain
    damageYajna: (amount: number, tick: number) => {
      const s = get()
      if (s.phase !== 'play' || tick < s.yajnaInvulnUntil) return
      const yajnaIntegrity = Math.max(0, s.yajnaIntegrity - amount)
      set({ yajnaIntegrity, yajnaInvulnUntil: tick + BALANCE.yajna.HIT_INVULN_TICKS })
      if (yajnaIntegrity === 0) get().fail('yajnaZero')
    },

    fireArrow: () => {
      const s = get()
      if (s.phase !== 'play' || s.arrows <= 0) return false
      set({ arrows: s.arrows - 1 })
      return true
    },

    pickupArrows: () =>
      set((s) => ({ arrows: Math.min(BALANCE.player.MAX_ARROWS, s.arrows + BALANCE.player.ARROW_PICKUP) })),

    useAstra: (tick: number) => {
      const s = get()
      if (s.phase !== 'play' || s.astraCharges <= 0 || tick < s.astraCooldownUntil) return false
      set({ astraCharges: s.astraCharges - 1, astraCooldownUntil: tick + BALANCE.astra.COOLDOWN_TICKS })
      return true
    },

    castAstra: (tick: number = 0) => {
      const s = get()
      if (s.phase !== 'play' || s.astraCharges <= 0 || tick < s.astraCooldownUntil || !s.selectedAstra) return false
      set({ astraCharges: s.astraCharges - 1, astraCooldownUntil: tick + BALANCE.astra.COOLDOWN_TICKS })
      return true
    },

    unlockAstra: (id: AstraId) => {
      const s = get()
      if (!s.unlockedAstras.includes(id)) {
        set({ unlockedAstras: [...s.unlockedAstras, id], selectedAstra: s.selectedAstra ?? id })
      }
    },

    selectAstra: (id: AstraId) => {
      const s = get()
      if (s.unlockedAstras.includes(id)) set({ selectedAstra: id })
    },

    addAstraCharge: () =>
      set((s) => ({ astraCharges: Math.min(BALANCE.astra.MAX_CHARGES, s.astraCharges + 1) })),
  }
}

function persistenceActions(set: Set, get: Get) {
  return {
    setSettings: (patch: Partial<Settings>) => set((s) => ({ settings: { ...s.settings, ...patch } })),

    setBenchmarkTier: (benchmarkTier: BenchmarkTier, benchmarkRenderer: string) => set({ benchmarkTier, benchmarkRenderer }),

    hydrate: (save: Save) =>
      set({
        ...levelStart(save.level),
        completed: [...save.completed],
        codex: [...save.codex],
        quizScores: { ...save.quiz },
        settings: { ...save.settings },
        benchmarkTier: save.benchmarkTier,
        benchmarkRenderer: save.benchmarkRenderer,
        unlockedAstras: [...(save.unlockedAstras ?? [])],
        selectedAstra: save.unlockedAstras?.[0] ?? null,
      }),

    snapshot: (): Save => {
      const s = get()
      return {
        version: 2,
        level: s.level,
        completed: [...s.completed],
        codex: [...s.codex],
        quiz: { ...s.quizScores },
        settings: { ...s.settings },
        benchmarkTier: s.benchmarkTier,
        ...(s.benchmarkRenderer !== undefined ? { benchmarkRenderer: s.benchmarkRenderer } : {}),
        unlockedAstras: [...s.unlockedAstras],
      }
    },

    reset: () => set(initial()),
  }
}

export function createGameStore() {
  return createStore<GameStore>()((set, get) => ({
    ...initial(),
    ...flowActions(set, get),
    ...objectiveActions(set, get),
    ...resourceActions(set, get),
    ...persistenceActions(set, get),
  }))
}

function onEnterPhase(s: GameState, phase: Phase): Partial<GameState> {
  if (phase === 'win') {
    const card = codexUnlockedBy(s.level)
    const completed = s.completed.includes(s.level) ? s.completed : [...s.completed, s.level]
    const codex = s.codex.includes(card) ? s.codex : [...s.codex, card]
    return { phase, completed, codex }
  }
  if (phase === 'quiz') return { phase, quiz: { gate: gateAfter(s.level)?.id ?? null, index: 0, answers: [] } }
  if (phase === 'loading') {
    // RETRY bumps the attempt: App keys the level scene on it, so every entity remounts and re-registers.
    if (s.phase === 'fail') return levelStart(s.level, s.attempt + 1)
    return levelStart(s.phase === 'transition' ? (nextLevel(s.level) ?? s.level) : s.level)
  }
  return { phase }
}

export const gameStore = createGameStore()
