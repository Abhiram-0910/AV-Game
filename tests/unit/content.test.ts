// Cross-file integrity of src/data (which has zero imports by rule) plus the
// performance budget on the L5 wave schedule.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { CLIPS, CLIP_SOURCES } from '@data/clips'
import { CODEX } from '@data/codex'
import { DIALOGUE, UI } from '@data/dialogue'
import { LEVELS, LEVEL_ORDER } from '@data/levels'
import { QUIZ_GATES } from '@data/quiz'

const RAW_ANIMS = 'raw/staged/anims'

/** Clip names from a .glb: 12-byte header, then the first (JSON) chunk. Zero deps. */
function glbClipNames(path: string): string[] {
  const buf = readFileSync(path)
  expect(buf.readUInt32LE(0)).toBe(0x46546c67) // 'glTF'
  const chunkLength = buf.readUInt32LE(12)
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a) // 'JSON'
  const json = JSON.parse(buf.subarray(20, 20 + chunkLength).toString('utf8'))
  return (json.animations ?? []).map((a: { name: string }) => a.name)
}

describe('clips', () => {
  it('maps to unique, well-formed clip names and has no bow clip', () => {
    const names = Object.values(CLIPS)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(n).toMatch(/^[A-Za-z0-9_]+$/)
    expect(names.some((n) => /bow/i.test(n))).toBe(false)
  })

  it.skipIf(!existsSync(RAW_ANIMS))('every clip exists in the two animation GLBs (86 total)', () => {
    const all = Object.values(CLIP_SOURCES).flatMap((f) => glbClipNames(`${RAW_ANIMS}/${f}`))
    expect(all).toHaveLength(86) // A_TPose is in both files, so 85 unique
    const real = new Set(all)
    for (const [key, name] of Object.entries(CLIPS)) expect(real.has(name), `${key} → ${name}`).toBe(true)
  })
})

describe('levels', () => {
  it('has five levels in order, each with a unique codex card and a gate except the last', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVEL_ORDER)
    expect(new Set(LEVELS.map((l) => l.codexCard)).size).toBe(5)
    expect(LEVELS.slice(0, -1).every((l) => l.quizGate !== null)).toBe(true)
    expect(LEVELS[4].quizGate).toBeNull()
  })

  it('every dialogue key, waypoint, gate, and codex id resolves', () => {
    const gates = new Set<string>(QUIZ_GATES.map((g) => g.id))
    const cards = new Set(CODEX.map((c) => c.id))
    for (const l of LEVELS) {
      for (const k of [l.titleKey, l.introKey, l.outroKey]) expect(k in DIALOGUE, k).toBe(true)
      for (const o of l.objectives) {
        if (o.kind === 'talk') expect(o.dialogueKey in DIALOGUE, o.dialogueKey).toBe(true)
        if (o.kind === 'reach') expect(o.waypoint in l.waypoints, `${l.id}:${o.waypoint}`).toBe(true)
      }
      if (l.quizGate) expect(gates.has(l.quizGate)).toBe(true)
      expect(cards.has(l.codexCard as never)).toBe(true)
    }
  })

  it('L5 waves respect the 12 concurrent SkinnedMesh budget, staggered not burst', () => {
    const l5 = LEVELS[4]
    const peak = Math.max(...l5.waves.map((w) => w.maxAlive))
    const overlapping = l5.waves
      .filter((w) => w.startTick >= 4500)
      .reduce((n, w) => n + w.maxAlive, 0)
    expect(l5.persistentSkinned.length + Math.max(peak, overlapping)).toBeLessThanOrEqual(BALANCE.spawn.MAX_SKINNED)
    for (const w of l5.waves) {
      if (w.count > 1) expect(w.spawnIntervalTicks, `${w.kind}@${w.startTick}`).toBeGreaterThanOrEqual(60)
      expect(w.maxAlive).toBeLessThanOrEqual(w.count)
    }
  })

  it('ideal play time lands under the 15-minute session at 2x', () => {
    const total = LEVELS.reduce((n, l) => n + l.targetSeconds, 0)
    expect(total * 2).toBeLessThanOrEqual(15 * 60)
  })
})

describe('quiz and codex', () => {
  it('four gates × three questions, one correct option each, with explanations', () => {
    expect(QUIZ_GATES).toHaveLength(4)
    for (const g of QUIZ_GATES) {
      expect(g.questions).toHaveLength(3)
      for (const q of g.questions) {
        expect(q.options).toHaveLength(4)
        expect(q.options[q.correct]).toBeDefined()
        expect(q.explanation.length).toBeGreaterThan(20)
      }
    }
  })

  it('one codex card per level and the Maricha card says flung, not killed', () => {
    expect(CODEX.map((c) => c.unlockLevel)).toEqual(LEVEL_ORDER)
    const maricha = CODEX.find((c) => c.id === 'maricha-subahu')!
    expect(maricha.paragraphs.join(' ')).toMatch(/flung .* alive/)
  })
})

describe('balance and strings', () => {
  it('every balance number is finite and non-negative', () => {
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'number') expect(v >= 0 && Number.isFinite(v), path).toBe(true)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`)
    }
    walk(BALANCE, 'BALANCE')
  })

  it('UI strings are non-empty except the narrator name', () => {
    for (const [k, v] of Object.entries(UI)) if (k !== 'name.narrator') expect(v.length, k).toBeGreaterThan(0)
  })
})
