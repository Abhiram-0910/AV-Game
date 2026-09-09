// The hardest budget in the game: concurrent SkinnedMesh instances. Every character the
// factory builds registers here; the perf overlay reads live() and peak(); anything above
// BALANCE.spawn.MAX_SKINNED is a console.error, on every acquire, until it is released.
import { BALANCE } from '@data/balance'

const live = new Set<string>()
let peakCount = 0
let serial = 0

export function acquireSkinnedSlot(label: string): string {
  const key = `${label}#${(serial += 1)}`
  live.add(key)
  peakCount = Math.max(peakCount, live.size)
  if (live.size > BALANCE.spawn.MAX_SKINNED) {
    console.error(`skinned budget exceeded: ${live.size} > ${BALANCE.spawn.MAX_SKINNED} (${[...live].join(', ')})`)
  }
  return key
}

export function releaseSkinnedSlot(key: string): void {
  live.delete(key)
}

export function liveSkinned(): number {
  return live.size
}

export function peakSkinned(): number {
  return peakCount
}

export function hasSkinnedSlot(): boolean {
  return live.size < BALANCE.spawn.MAX_SKINNED
}

/** Tests only. */
export function resetSkinnedBudget(): void {
  live.clear()
  peakCount = 0
}
