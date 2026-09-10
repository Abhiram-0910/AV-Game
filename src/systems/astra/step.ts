// Astra charge-and-release on the fixed tick. An astra is summoned by mantra, not thrown —
// release performs a single instant hitscan along the aim direction rather than simulating a
// slow arrow. Charging reuses the exact shape as the bow's draw (systems/archery/draw.ts).
import { type Object3D, Raycaster, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { resolveHit } from '@core/combat-rules'
import { NO_DRAW } from '../archery/draw'
import { resolveHitRoot } from '../archery/hit-test'
import { world } from '../world'

const ray = new Raycaster()
const origin = new Vector3()
const dir = new Vector3()

/** The Manava astra flings, it never kills — that's the story Vishwamitra chose it for
 * Maricha (see codex.ts's 'astra' card). Any other enemy the astra hits takes real damage
 * (Agneya-strength — see BALANCE.astra.DAMAGE), the same "fired at whoever's aimed at" hitscan. */
function hitEnemy(enemy: (typeof world.enemies)[number], root: Object3D): void {
  const distance = Math.hypot(enemy.x - world.player.x, enemy.z - world.player.z)
  const kind = enemy.kind === 'maricha' ? 'astra:manava' : 'astra:agneya'
  const result = resolveHit(enemy, kind, 'player', world.tick, distance)
  enemy.health = result.target.health
  enemy.invulnUntil = result.target.invulnUntil
  const defeated = result.outcome === 'defeated' || result.outcome === 'flung'
  if (!defeated) return
  enemy.state = 'dead'
  enemy.stateUntil = world.tick + BALANCE.spawn.DESPAWN_TICKS
  world.hittable = world.hittable.filter((o) => o !== root)
  gameStore.getState().progress({ kind: 'defeat', enemy: enemy.kind })
}

function fireHitscan(): void {
  origin.set(world.player.x, BALANCE.archeryAim.MUZZLE_HEIGHT, world.player.z)
  dir.set(world.aimDir[0], world.aimDir[1], world.aimDir[2])
  ray.set(origin, dir)
  ray.far = BALANCE.combat.MAX_HIT_RANGE
  const hit = ray.intersectObjects(world.hittable as Object3D[], true)[0]
  if (!hit) return
  const root = resolveHitRoot(hit.object, world.hittable)
  if (!root) return
  const enemy = world.enemies.find((e) => e.root === root)
  if (enemy) {
    hitEnemy(enemy, root)
    return
  }
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
