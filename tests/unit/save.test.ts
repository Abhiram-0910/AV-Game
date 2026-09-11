import { describe, expect, it } from 'vitest'
import { DEFAULT_SAVE, deserializeSave, parseSave, serializeSave, type Save, type SaveV1 } from '@core/save'

const good: Save = {
  version: 2,
  level: 'l3',
  completed: ['l1', 'l2'],
  codex: ['vishwamitra', 'yajna'],
  quiz: { gate1: 2 },
  settings: { qualityTier: 'low', volume: 0.5, subtitles: false },
  benchmarkTier: 'high',
}

const v1: SaveV1 = {
  version: 1,
  level: 'l3',
  completed: ['l1', 'l2'],
  codex: ['vishwamitra', 'yajna'],
  quiz: { gate1: 2 },
  settings: { qualityTier: 'low', volume: 0.5, subtitles: false },
}

describe('save', () => {
  it('round-trips a valid v2 save', () => {
    expect(deserializeSave(serializeSave(good))).toEqual(good)
  })

  it('round-trips unlockedAstras when present in v2 save', () => {
    const withAstras: Save = { ...good, unlockedAstras: ['agneyastra', 'manavastra'] }
    expect(deserializeSave(serializeSave(withAstras))).toEqual(withAstras)
  })

  it('migrates a v1 save to v2 with no benchmark result', () => {
    expect(parseSave(v1)).toEqual({ ...v1, version: 2, benchmarkTier: null })
  })

  it('accepts null and both tiers as the benchmark result, rejects anything else', () => {
    for (const benchmarkTier of ['low', 'high', null]) expect(parseSave({ ...good, benchmarkTier })).toEqual({ ...good, benchmarkTier })
    expect(parseSave({ ...good, benchmarkTier: 'auto' })).toEqual(DEFAULT_SAVE)
    expect(parseSave({ ...good, benchmarkTier: undefined })).toEqual(DEFAULT_SAVE)
  })

  it('returns a fresh default for garbage, empty, or unversioned input', () => {
    for (const raw of [null, undefined, 42, 'x', [], {}, { level: 'l2' }, { version: 0, level: 'l2' }]) {
      expect(parseSave(raw)).toEqual(DEFAULT_SAVE)
    }
    expect(deserializeSave('{not json')).toEqual(DEFAULT_SAVE)
    expect(deserializeSave('')).toEqual(DEFAULT_SAVE)
  })

  it('returns default for a future version rather than guessing', () => {
    expect(parseSave({ ...good, version: 3 })).toEqual(DEFAULT_SAVE)
  })

  it('rejects a save with bad fields', () => {
    expect(parseSave({ ...good, level: 'l9' })).toEqual(DEFAULT_SAVE)
    expect(parseSave({ ...good, settings: { ...good.settings, volume: 7 } })).toEqual(DEFAULT_SAVE)
    expect(parseSave({ ...good, completed: ['nope'] })).toEqual(DEFAULT_SAVE)
  })

  it('never hands out the shared DEFAULT_SAVE object', () => {
    const a = parseSave(null)
    a.completed.push('l1')
    expect(DEFAULT_SAVE.completed).toEqual([])
  })
})
