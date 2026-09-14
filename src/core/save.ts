// Versioned save schema. v1 migrates to v2; anything else → DEFAULT_SAVE. Never throws.
import type { CodexId } from '@data/codex'
import { LEVEL_ORDER, type LevelId } from '@data/levels'
import type { GateId } from '@data/quiz'

export const SAVE_VERSION = 2 as const

export type QualityTier = 'auto' | 'low' | 'high'
/** What the one-time hardware benchmark decided; null until it has run on this machine. */
export type BenchmarkTier = Exclude<QualityTier, 'auto'> | null

export interface Settings {
  qualityTier: QualityTier
  /** 0..1 */
  volume: number
  subtitles: boolean
}

export type AstraId = 'agneyastra' | 'manavastra'

interface SaveBody {
  level: LevelId
  completed: LevelId[]
  codex: CodexId[]
  /** Correct answers per gate, informational only. */
  quiz: Partial<Record<GateId, number>>
  settings: Settings
  unlockedAstras?: AstraId[]
  /** The renderer the benchmark ran on. A saved tier is reused only on the same renderer, so moving the browser
   * from an iGPU to a dGPU re-detects. Optional: older saves and the e2e seeds omit it, which re-detects once. */
  benchmarkRenderer?: string
}

/** Shipped in pass 1; still accepted and migrated. */
export interface SaveV1 extends SaveBody {
  version: 1
}

export interface Save extends SaveBody {
  version: typeof SAVE_VERSION
  /** Persisted so the benchmark runs once per machine, not once per boot. */
  benchmarkTier: BenchmarkTier
}

export const DEFAULT_SETTINGS: Settings = { qualityTier: 'auto', volume: 0.8, subtitles: true }

export const DEFAULT_SAVE: Save = {
  version: SAVE_VERSION,
  level: 'l1',
  completed: [],
  codex: [],
  quiz: {},
  settings: DEFAULT_SETTINGS,
  benchmarkTier: null,
  unlockedAstras: [],
}

const TIERS: readonly QualityTier[] = ['auto', 'low', 'high']
const BENCH_TIERS: readonly BenchmarkTier[] = ['low', 'high', null]

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

function parseBody(raw: Record<string, unknown>): SaveBody | null {
  const settings = parseSettings(raw.settings)
  if (!settings || !isLevelId(raw.level)) return null
  if (!isStringArray(raw.completed) || !raw.completed.every(isLevelId)) return null
  if (!isStringArray(raw.codex) || !isRecord(raw.quiz)) return null
  const unlockedAstras = Array.isArray(raw.unlockedAstras)
    ? (raw.unlockedAstras.filter((a) => a === 'agneyastra' || a === 'manavastra') as AstraId[])
    : undefined
  return {
    level: raw.level,
    completed: raw.completed as LevelId[],
    codex: raw.codex as CodexId[],
    quiz: raw.quiz as SaveBody['quiz'],
    settings,
    ...(unlockedAstras !== undefined ? { unlockedAstras } : {}),
    ...(typeof raw.benchmarkRenderer === 'string' ? { benchmarkRenderer: raw.benchmarkRenderer } : {}),
  }
}

/** v1 → v2: the benchmark has never run for a v1 save. */
function migrateV1(body: SaveBody): Save {
  return { version: SAVE_VERSION, ...body, benchmarkTier: null }
}

/** Validate an unknown value as a v1 or v2 save. Anything else yields a fresh DEFAULT_SAVE copy. */
export function parseSave(raw: unknown): Save {
  if (!isRecord(raw)) return structuredClone(DEFAULT_SAVE)
  const body = raw.version === 1 || raw.version === SAVE_VERSION ? parseBody(raw) : null
  if (!body) return structuredClone(DEFAULT_SAVE)
  if (raw.version === 1) return migrateV1(body)
  if (!BENCH_TIERS.includes(raw.benchmarkTier as BenchmarkTier)) return structuredClone(DEFAULT_SAVE)
  return { version: SAVE_VERSION, ...body, benchmarkTier: raw.benchmarkTier as BenchmarkTier }
}

export function serializeSave(save: Save): string {
  return JSON.stringify(save)
}

export function deserializeSave(text: string | null | undefined): Save {
  if (!text) return structuredClone(DEFAULT_SAVE)
  try {
    return parseSave(JSON.parse(text))
  } catch {
    return structuredClone(DEFAULT_SAVE)
  }
}
