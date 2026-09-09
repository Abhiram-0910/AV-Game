// Reach and talk rules. Pure. Only the current objective's NPC is talkable, so the court
// scene plays in the authored order even though the store accepts events in any order.
import { BALANCE } from '@data/balance'
import type { NpcId, Objective } from '@data/levels'

export interface NpcPoint {
  id: NpcId
  x: number
  z: number
}

export function reachedWaypoint(px: number, pz: number, wp: readonly [number, number, number]): boolean {
  return Math.hypot(px - wp[0], pz - wp[2]) <= BALANCE.interaction.REACH_RADIUS
}

export function talkTarget(current: Objective | undefined, npcs: readonly NpcPoint[], px: number, pz: number): NpcPoint | null {
  if (!current || current.kind !== 'talk') return null
  const npc = npcs.find((n) => n.id === current.npc)
  if (!npc) return null
  return Math.hypot(px - npc.x, pz - npc.z) <= BALANCE.interaction.TALK_RADIUS ? npc : null
}
