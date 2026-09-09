// Unlocks, quiz scoring, codex. Pure lookups over src/data.
import { CODEX, type CodexId } from '@data/codex'
import { LEVELS, LEVEL_ORDER, type LevelId } from '@data/levels'
import { QUIZ_GATES, type GateId, type QuizGate } from '@data/quiz'

export function levelDef(id: LevelId) {
  const def = LEVELS.find((l) => l.id === id)
  if (!def) throw new Error(`unknown level ${id}`)
  return def
}

export function nextLevel(id: LevelId): LevelId | null {
  const i = LEVEL_ORDER.indexOf(id)
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null
}

export function isLastLevel(id: LevelId): boolean {
  return nextLevel(id) === null
}

export function gateAfter(id: LevelId): QuizGate | null {
  return QUIZ_GATES.find((g) => g.afterLevel === id) ?? null
}

export function gateById(id: GateId): QuizGate {
  const gate = QUIZ_GATES.find((g) => g.id === id)
  if (!gate) throw new Error(`unknown gate ${id}`)
  return gate
}

export function codexUnlockedBy(id: LevelId): CodexId {
  const card = CODEX.find((c) => c.unlockLevel === id)
  if (!card) throw new Error(`no codex card for ${id}`)
  return card.id
}

/** A level is enterable if it is the first, or the one before it was completed. */
export function canEnterLevel(id: LevelId, completed: readonly LevelId[]): boolean {
  const i = LEVEL_ORDER.indexOf(id)
  if (i <= 0) return i === 0
  return completed.includes(LEVEL_ORDER[i - 1])
}

export interface AnswerResult {
  correct: boolean
  explanation: string
}

export function checkAnswer(gate: GateId, index: number, option: number): AnswerResult {
  const q = gateById(gate).questions[index]
  if (!q) throw new Error(`question ${index} out of range for ${gate}`)
  return { correct: q.correct === option, explanation: q.explanation }
}

export interface QuizScore {
  correct: number
  total: number
  /** Always true: gates teach, they do not block. */
  passed: true
}

export function scoreQuiz(gate: GateId, answers: readonly number[]): QuizScore {
  const questions = gateById(gate).questions
  const correct = questions.filter((q, i) => q.correct === answers[i]).length
  return { correct, total: questions.length, passed: true }
}
