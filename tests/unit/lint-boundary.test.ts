// Proves the ESLint import boundary actually fires. This IS the architecture.
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint({ cwd: process.cwd() })

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return result.messages.map((m) => m.ruleId ?? 'fatal')
}

describe('import boundary', () => {
  it("rejects import 'three' inside src/core", async () => {
    expect(await ruleIds("import 'three'\n", 'src/core/x.ts')).toContain('no-restricted-imports')
  })

  it('rejects @react-three/* and react inside src/core', async () => {
    expect(await ruleIds("import { Canvas } from '@react-three/fiber'\nCanvas\n", 'src/core/x.ts')).toContain('no-restricted-imports')
    expect(await ruleIds("import { useState } from 'react'\nuseState\n", 'src/core/x.ts')).toContain('no-restricted-imports')
  })

  it('rejects upward layer imports inside src/core', async () => {
    expect(await ruleIds("import { a } from '@render/loaders'\na\n", 'src/core/x.ts')).toContain('no-restricted-imports')
  })

  it('rejects every import inside src/data, even relative ones', async () => {
    expect(await ruleIds("import { BALANCE } from './balance'\nBALANCE\n", 'src/data/x.ts')).toContain('no-restricted-imports')
    expect(await ruleIds("import 'three'\n", 'src/data/x.ts')).toContain('no-restricted-imports')
  })

  it("allows import 'three' in src/systems and src/entities (the rule is scoped)", async () => {
    expect(await ruleIds("import 'three'\n", 'src/systems/archery/aim.ts')).not.toContain('no-restricted-imports')
    expect(await ruleIds("import 'three'\n", 'src/entities/Player.tsx')).not.toContain('no-restricted-imports')
  })

  it('rejects default exports under src/', async () => {
    expect(await ruleIds('export default 1\n', 'src/core/x.ts')).toContain('no-restricted-syntax')
  })
})
