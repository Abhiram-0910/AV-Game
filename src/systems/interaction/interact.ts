// Reach and talk rules. Pure. Only the next talk objective's NPC is talkable, so the court
// scene plays in the authored order even though the store accepts events in any order.
import { BALANCE } from '@data/balance'
import type { NpcId, Objective } from '@data/levels'
import type { ObjectiveProgress } from '@core/objectives'

export interface NpcPoint {
  id: NpcId
  x: number
  z: number
  /** Facing, turned on the fixed tick: toward the player while talking, back to `homeYaw` after. */
  yaw: number
  homeYaw: number
  /** Seated NPCs (Dasharatha on the throne) never turn. */
  seated: boolean
}

export interface TalkTarget {
  npc: NpcPoint
  /** Index of the talk objective; every incomplete objective before it is a 'reach'. */
  index: number
  dialogueKey: string
}

export function reachedWaypoint(px: number, pz: number, wp: readonly [number, number, number]): boolean {
  return Math.hypot(px - wp[0], pz - wp[2]) <= BALANCE.interaction.REACH_RADIUS
}

/**
 * Who the player can talk to now: the NPC of the first incomplete talk objective, while only 'reach' objectives stand
 * before it. Walking up to the next speaker counts as arriving: L1's throne waypoint lies behind Vishwamitra, and the
 * strict order hid his prompt until the player had walked past him. A circle around the NPC, blind to facing.
 */
export function talkTarget(
  objectives: readonly Objective[],
  progress: readonly ObjectiveProgress[],
  npcs: readonly NpcPoint[],
  px: number,
  pz: number,
): TalkTarget | null {
  const index = progress.findIndex((p, k) => !p.done && objectives[k].kind !== 'reach')
  const o = objectives[index]
  if (o?.kind !== 'talk') return null
  const npc = npcs.find((n) => n.id === o.npc)
  if (!npc || Math.hypot(px - npc.x, pz - npc.z) > BALANCE.interaction.TALK_RADIUS) return null
  return { npc, index, dialogueKey: o.dialogueKey }
}

/** Index of the nearest spent-arrow pile in range, or -1. Nearest (not first) so a player
 * standing between two piles always gets a consistent, sensible pickup. */
export function nearestPickupIndex(pickups: readonly { x: number; z: number }[], px: number, pz: number): number {
  let best = -1
  let bestDist: number = BALANCE.interaction.PICKUP_RADIUS
  pickups.forEach((p, i) => {
    const d = Math.hypot(px - p.x, pz - p.z)
    if (d <= bestDist) {
      best = i
      bestDist = d
    }
  })
  return best
}
