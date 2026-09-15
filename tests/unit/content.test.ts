// Cross-file integrity of src/data (which has zero imports by rule) plus the
// performance budget on the L5 wave schedule.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { CLIPS, CLIP_SOURCES } from '@data/clips'
import { CODEX } from '@data/codex'
import { DIALOGUE, UI } from '@data/dialogue'
import { LEVELS, LEVEL_ORDER, type Wave } from '@data/levels'
import { QUIZ_GATES } from '@data/quiz'
import { ASSET_FILES, SCENERY, WILDS } from '@data/scenery'
import { inCapsule } from '@render/wilds-dressing'

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
        if (o.kind === 'strike') expect(l.strikeDummy, `${l.id} asks for a strike with no straw man`).toBeDefined()
      }
      if (l.quizGate) expect(gates.has(l.quizGate)).toBe(true)
      expect(cards.has(l.codexCard as never)).toBe(true)
    }
  })

  it('L5 waves respect the 12 concurrent SkinnedMesh budget, staggered not burst', () => {
    const l5 = LEVELS[4]
    // A wave may have enemies up from its start to its last spawn; a lone boss stays until he is beaten.
    const end = (w: Wave) => (w.count === 1 ? Infinity : w.startTick + w.count * w.spawnIntervalTicks)
    const alongside = (w: Wave) => l5.waves.filter((v) => v.startTick <= w.startTick && end(v) >= w.startTick)
    const peak = Math.max(...l5.waves.map((w) => alongside(w).reduce((n, v) => n + v.maxAlive, 0)))
    expect(l5.persistentSkinned.length + peak).toBeLessThanOrEqual(BALANCE.spawn.MAX_SKINNED)
    for (const w of l5.waves) {
      if (w.count > 1) expect(w.spawnIntervalTicks, `${w.kind}@${w.startTick}`).toBeGreaterThanOrEqual(60)
      expect(w.maxAlive).toBeLessThanOrEqual(w.count)
    }
  })

  it('L2 and L4 target lists match their hitTargets count; L4 is five different shots', () => {
    for (const l of LEVELS) {
      const hit = l.objectives.find((o) => o.kind === 'hitTargets')
      if (hit?.kind === 'hitTargets') expect(l.targets, l.id).toHaveLength(hit.count)
      if (l.targets.length > 0) expect(l.bow, `${l.id} has targets but no bow`).toBe(true)
    }
    const l4 = LEVELS[3]
    const kinds = l4.targets.map((t) => t.kind)
    expect(new Set(kinds).size).toBe(5)
    expect(kinds.filter((k) => k === 'astraOnly')).toHaveLength(1)
    expect(l4.objectives.some((o) => o.kind === 'chargeAstra')).toBe(true)
    expect(LEVELS[0].bow).toBe(false)
  })

  it('L1 casts four skinned characters and every level stays inside the skinned budget', () => {
    expect(LEVELS[0].persistentSkinned).not.toContain('lakshmana')
    expect(LEVELS[1].persistentSkinned).toContain('lakshmana')
    for (const l of LEVELS) expect(l.persistentSkinned.length).toBeLessThanOrEqual(BALANCE.spawn.MAX_SKINNED)
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

  it('one codex card per level and the Maricha card says flung, not killed, and stays in Bala Kanda', () => {
    expect(CODEX.map((c) => c.unlockLevel)).toEqual(LEVEL_ORDER)
    const maricha = CODEX.find((c) => c.id === 'maricha-subahu')!
    const text = maricha.paragraphs.join(' ')
    expect(text).toMatch(/flung .* alive/)
    expect(text).not.toMatch(/golden deer|Sita/)
  })

  it('Vasishtha argues the given word; Tataka plainly falls and the forest is freed', () => {
    const vasishtha = DIALOGUE['l1.vasishtha.counsel'].lines.join(' ')
    expect(vasishtha).toMatch(/your word/)
    expect(vasishtha).toMatch(/bound by/)
    expect(vasishtha).not.toMatch(/glory/)
    const tataka = DIALOGUE['l3.outro'].lines[0]
    expect(tataka).toMatch(/Tataka fell/)
    expect(tataka).toMatch(/did not rise/)
    expect(tataka).toMatch(/forest was free/)
  })
})

describe('built assets', () => {
  const MANIFEST = 'public/assets/high/manifest.json'
  it.skipIf(!existsSync(MANIFEST))('manifest covers every ASSET_FILES entry and the palace is under its ceiling', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, { file: string; tris: number }>
    for (const [id, file] of Object.entries(ASSET_FILES)) {
      expect(manifest[id]?.file, id).toBe(file)
      expect(existsSync(`public/assets/high/${file}`), file).toBe(true)
    }
    expect(manifest.palace.tris).toBeLessThanOrEqual(50_000)
    for (const id of ['male', 'female']) expect(manifest[id].tris).toBeLessThan(16_000)
    // Level 5's 12-concurrent budget (pass 3 Phase B blocker): 12 low-detail bodies must fit the 60k skinned ceiling.
    for (const id of ['maleLow', 'femaleLow']) expect(manifest[id].tris * 12).toBeLessThanOrEqual(60_000)
  })

  const LOW_MANIFEST = 'public/assets/low/manifest.json'
  it.skipIf(!existsSync(LOW_MANIFEST))('low tier manifest covers every ASSET_FILES entry and uses decimated characters', () => {
    const manifest = JSON.parse(readFileSync(LOW_MANIFEST, 'utf8')) as Record<string, { file: string; tris: number }>
    for (const [id, file] of Object.entries(ASSET_FILES)) {
      expect(manifest[id]?.file, id).toBe(file)
    }
    expect(manifest.male.tris).toBeLessThanOrEqual(5500)
    expect(manifest.female.tris).toBeLessThanOrEqual(5500)
  })
})

describe('balance and strings', () => {
  it('every balance number is finite; scalars are non-negative (offset vectors may be signed)', () => {
    const walk = (v: unknown, path: string, signed: boolean) => {
      if (typeof v === 'number') expect(Number.isFinite(v) && (signed || v >= 0), path).toBe(true)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, Array.isArray(v))
    }
    walk(BALANCE, 'BALANCE', false)
  })

  it('UI strings are non-empty except the narrator name', () => {
    for (const [k, v] of Object.entries(UI)) if (k !== 'name.narrator') expect(v.length, k).toBeGreaterThan(0)
  })
})

describe('outdoor dressing', () => {
  it('keeps every spawn, waypoint, NPC, enemy and target in L2–L4 inside a WILDS keep-clear capsule', () => {
    for (const [id, wilds] of Object.entries(WILDS)) {
      const def = LEVELS.find((l) => l.id === id)!
      const npcs = SCENERY[id as keyof typeof WILDS]!.npcs.map((n) => n.pos)
      const points = [def.playerSpawn.pos, ...Object.values(def.waypoints), ...def.targets.map((t) => t.pos), ...def.enemies.map((e) => e.pos), ...npcs]
      for (const [x, , z] of points) expect(wilds!.clear.some((c) => inCapsule(c, x, z)), `${id} (${x}, ${z})`).toBe(true)
    }
  })
})
