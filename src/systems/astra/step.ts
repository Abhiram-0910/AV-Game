// Astra charge-and-release on the fixed tick. An astra is summoned by mantra, not thrown —
// release performs a single instant hitscan along the aim direction rather than simulating a
// slow arrow. Charging reuses the exact shape as the bow's draw (systems/archery/draw.ts).
import { type Object3D, Raycaster, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { NO_DRAW } from '../archery/draw'
import { resolveHitRoot } from '../archery/hit-test'
import { world } from '../world'

const ray = new Raycaster()
const origin = new Vector3()
const dir = new Vector3()

function fireHitscan(): void {
  origin.set(world.player.x, BALANCE.archeryAim.MUZZLE_HEIGHT, world.player.z)
  dir.set(world.aimDir[0], world.aimDir[1], world.aimDir[2])
  ray.set(origin, dir)
  ray.far = BALANCE.combat.MAX_HIT_RANGE
  const hit = ray.intersectObjects(world.hittable as Object3D[], true)[0]
  if (!hit) return
  const root = resolveHitRoot(hit.object, world.hittable)
  // Enemy astra combat is Level 5's concern (Phase G) — L4 has no enemies to hit here.
  if (!root || world.enemies.some((e) => e.root === root)) return
  world.hittable = world.hittable.filter((o) => o !== root)
  gameStore.getState().progress({ kind: 'hitTargets' })
}

/** One fixed tick of the astra charge. `held` is the cast key's current state this tick. */
export function stepAstra(held: boolean, tick: number): void {
  const s = world.astraCharge
  if (held) {
    world.astraCharge = { drawing: true, ticks: s.drawing ? s.ticks + 1 : 1 }
    return
  }
  if (!s.drawing) return
  world.astraCharge = NO_DRAW
  if (s.ticks < BALANCE.astra.CHARGE_TICKS) return
  if (!gameStore.getState().useAstra(tick)) return
  gameStore.getState().progress({ kind: 'chargeAstra' })
  fireHitscan()
}
