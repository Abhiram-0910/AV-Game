// Versioned save schema. Single path: anything not a valid v1 → DEFAULT_SAVE. Never throws.
import type { CodexId } from '@data/codex'
import { LEVEL_ORDER, type LevelId } from '@data/levels'
import type { GateId } from '@data/quiz'

export const SAVE_VERSION = 1 as const

export type QualityTier = 'auto' | 'low' | 'high'

export interface Settings {
  qualityTier: QualityTier
  /** 0..1 */
  volume: number
  subtitles: boolean
}

export interface SaveV1 {
  version: typeof SAVE_VERSION
  level: LevelId
  completed: LevelId[]
  codex: CodexId[]
  /** Correct answers per gate, informational only. */
  quiz: Partial<Record<GateId, number>>
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = { qualityTier: 'auto', volume: 0.8, subtitles: true }

export const DEFAULT_SAVE: SaveV1 = {
  version: SAVE_VERSION,
  level: 'l1',
  completed: [],
  codex: [],
  quiz: {},
  settings: DEFAULT_SETTINGS,
}

const TIERS: readonly QualityTier[] = ['auto', 'low', 'high']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isLevelId(v: unknown): v is LevelId {
  return typeof v === 'string' && (LEVEL_ORDER as readonly string[]).includes(v)
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function parseSettings(v: unknown): Settings | null {
  if (!isRecord(v)) return null
  const { qualityTier, volume, subtitles } = v
  if (!TIERS.includes(qualityTier as QualityTier)) return null
  if (typeof volume !== 'number' || !(volume >= 0 && volume <= 1)) return null
  if (typeof subtitles !== 'boolean') return null
  return { qualityTier: qualityTier as QualityTier, volume, subtitles }
}

/** Validate an unknown value as a v1 save. Anything else yields a fresh DEFAULT_SAVE copy. */
export function parseSave(raw: unknown): SaveV1 {
  if (!isRecord(raw) || raw.version !== SAVE_VERSION) return structuredClone(DEFAULT_SAVE)
  const settings = parseSettings(raw.settings)
  if (!settings || !isLevelId(raw.level)) return structuredClone(DEFAULT_SAVE)
  if (!isStringArray(raw.completed) || !raw.completed.every(isLevelId)) return structuredClone(DEFAULT_SAVE)
  if (!isStringArray(raw.codex) || !isRecord(raw.quiz)) return structuredClone(DEFAULT_SAVE)
  return {
    version: SAVE_VERSION,
    level: raw.level,
    completed: raw.completed as LevelId[],
    codex: raw.codex as CodexId[],
    quiz: raw.quiz as SaveV1['quiz'],
    settings,
  }
}

export function serializeSave(save: SaveV1): string {
  return JSON.stringify(save)
}

export function deserializeSave(text: string | null | undefined): SaveV1 {
  if (!text) return structuredClone(DEFAULT_SAVE)
  try {
    return parseSave(JSON.parse(text))
  } catch {
    return structuredClone(DEFAULT_SAVE)
  }
}
