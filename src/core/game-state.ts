// The zustand store (vanilla — pass 2 wraps it with useStore). Every action lives here.
import { createStore, type StoreApi } from 'zustand/vanilla'
import { BALANCE } from '@data/balance'
import type { CodexId } from '@data/codex'
import type { FailCondition, LevelId } from '@data/levels'
import type { GateId } from '@data/quiz'
import { FAIL_EVENT, transition, type LevelEvent, type Phase } from './level-machine'
import {
  applyObjectiveEvent,
  checkLevelObjectives,
  completeObjective,
  freshProgress,
  type ObjectiveEvent,
  type ObjectiveProgress,
} from './objectives'
import { checkAnswer, codexUnlockedBy, gateAfter, isLastLevel, levelDef, nextLevel, scoreQuiz } from './progression'
import { DEFAULT_SAVE, type BenchmarkTier, type Save, type Settings } from './save'

export interface QuizState {
  gate: GateId | null
  index: number
  answers: number[]
}

export interface GameState {
  level: LevelId
  phase: Phase
  health: number
  playerInvulnUntil: number
  arrows: number
  astraCharges: number
  astraCooldownUntil: number
  yajnaIntegrity: number
  yajnaInvulnUntil: number
  objectives: ObjectiveProgress[]
  completed: LevelId[]
  codex: CodexId[]
  quiz: QuizState
  quizScores: Partial<Record<GateId, number>>
  settings: Settings
  benchmarkTier: BenchmarkTier
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
  addAstraCharge(): void
  fail(condition: FailCondition): void
  answerQuiz(option: number): { correct: boolean; explanation: string } | null
  setSettings(patch: Partial<Settings>): void
  setBenchmarkTier(tier: BenchmarkTier): void
  hydrate(save: Save): void
  snapshot(): Save
  reset(): void
}

export type GameStore = GameState & GameActions

function levelStart(id: LevelId): Omit<GameState, 'completed' | 'codex' | 'quizScores' | 'settings' | 'benchmarkTier'> {
  return {
    level: id,
    phase: 'loading',
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
})

type Set = StoreApi<GameStore>['setState']
type Get = StoreApi<GameStore>['getState']

function flowActions(set: Set, get: Get) {
  return {
    startLevel: (id: LevelId) => set(levelStart(id)),

    dispatch: (event: LevelEvent) => {
      const s = get()
      const ctx = { hasQuiz: gateAfter(s.level) !== null, isLastLevel: isLastLevel(s.level) }
      const phase = transition(s.phase, event, ctx)
      if (phase === null) return
      set(onEnterPhase(s, phase))
    },

    fail: (condition: FailCondition) => {
      const s = get()
      if (condition === 'none' || !levelDef(s.level).fail.includes(condition)) return
      get().dispatch(FAIL_EVENT[condition])
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

    // Mirrors damagePlayer's invuln window: without it, several rakshasas landing attacks on
    // the fire in the same tick each apply YAJNA_DAMAGE independently and drain it in a couple
    // of seconds regardless of concurrent-attacker count — the player enjoys exactly this
    // protection already (playerInvulnUntil), the yajna had none (pass 3 phase G playtesting).
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

    addAstraCharge: () =>
      set((s) => ({ astraCharges: Math.min(BALANCE.astra.MAX_CHARGES, s.astraCharges + 1) })),
  }
}

function persistenceActions(set: Set, get: Get) {
  return {
    setSettings: (patch: Partial<Settings>) => set((s) => ({ settings: { ...s.settings, ...patch } })),

    setBenchmarkTier: (benchmarkTier: BenchmarkTier) => set({ benchmarkTier }),

    hydrate: (save: Save) =>
      set({
        ...levelStart(save.level),
        completed: [...save.completed],
        codex: [...save.codex],
        quizScores: { ...save.quiz },
        settings: { ...save.settings },
        benchmarkTier: save.benchmarkTier,
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

/** Side effects of entering a phase: unlocks on win, quiz setup, level advance. */
function onEnterPhase(s: GameState, phase: Phase): Partial<GameState> {
  switch (phase) {
    case 'win': {
      const card = codexUnlockedBy(s.level)
      return {
        phase,
        completed: s.completed.includes(s.level) ? s.completed : [...s.completed, s.level],
        codex: s.codex.includes(card) ? s.codex : [...s.codex, card],
      }
    }
    case 'quiz':
      return { phase, quiz: { gate: gateAfter(s.level)?.id ?? null, index: 0, answers: [] } }
    case 'loading': {
      // From 'transition' we advance; from 'fail' we retry the same level.
      const id = s.phase === 'transition' ? (nextLevel(s.level) ?? s.level) : s.level
      return levelStart(id)
    }
    default:
      return { phase }
  }
}

export const gameStore = createGameStore()
