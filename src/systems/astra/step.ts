// Astra charge-and-release on the fixed tick. An astra is summoned by mantra, not thrown —
// release performs a single instant hitscan along the aim direction rather than simulating a
// slow arrow. Charging reuses the exact shape as the bow's draw (systems/archery/draw.ts).
import { type Object3D, Ray, Raycaster, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { resolveHit } from '@core/combat-rules'
import { playAudio } from '../audio'
import { NO_DRAW } from '../archery/draw'
import { resolveHitRoot } from '../archery/hit-test'
import { world, worldStore } from '../world'

const ray = new Raycaster()
const origin = new Vector3()
const dir = new Vector3()
const tempPos = new Vector3()
const tempRay = new Ray()
const tempClosest = new Vector3()

function findProximityHit(rayOrigin: Vector3, rayDir: Vector3, maxDist: number, targets: readonly Object3D[]): Object3D | null {
  tempRay.set(rayOrigin, rayDir)
  let bestTarget: Object3D | null = null
  let bestDist = 2.5

  for (const root of targets) {
    root.getWorldPosition(tempPos)
    tempRay.closestPointToPoint(tempPos, tempClosest)
    const rayDist = rayOrigin.distanceTo(tempClosest)
    if (rayDist > maxDist) continue
    const perpDist = tempClosest.distanceTo(tempPos)
    const scale = root.scale.x || 1.0
    const tolerance = Math.max(bestDist, scale * 1.2)
    if (perpDist < tolerance) {
      bestTarget = root
      bestDist = perpDist
    }
  }
  return bestTarget
}

/** The Manava astra flings, it never kills — that's the story Vishwamitra chose it for
 * Maricha (see codex.ts's 'astra' card). Any other enemy the astra hits takes real damage
 * (Agneya-strength — see BALANCE.astra.DAMAGE), the same "fired at whoever's aimed at" hitscan. */
function hitEnemy(enemy: (typeof world.enemies)[number], root: Object3D): void {
  worldStore.getState().triggerHitFeedback('enemy')
  const distance = Math.hypot(enemy.x - world.player.x, enemy.z - world.player.z)
  const kind = enemy.kind === 'maricha' ? 'astra:manava' : 'astra:agneya'
  const result = resolveHit(enemy, kind, 'player', world.tick, distance)
  enemy.health = result.target.health
  enemy.invulnUntil = result.target.invulnUntil
  const defeated = result.outcome === 'defeated' || result.outcome === 'flung'
  if (defeated) {
    playAudio(enemy.kind === 'tataka' ? 'boss_groan' : 'enemy_death')
    enemy.state = 'dead'
    enemy.stateUntil = world.tick + BALANCE.spawn.DESPAWN_TICKS
    world.hittable = world.hittable.filter((o) => o !== root)
    gameStore.getState().progress({ kind: 'defeat', enemy: enemy.kind })
  } else if (result.outcome === 'hit') {
    playAudio('enemy_hit')
  }
}

function fireHitscan(): void {
  playAudio('astra_cast')
  origin.set(world.player.x, BALANCE.archeryAim.MUZZLE_HEIGHT, world.player.z)
  dir.set(world.aimDir[0], world.aimDir[1], world.aimDir[2])
  ray.set(origin, dir)
  ray.far = BALANCE.combat.MAX_HIT_RANGE
  let hitObj: Object3D | null = ray.intersectObjects(world.hittable as Object3D[], true)[0]?.object ?? null

  if (!hitObj && world.hittable.length > 0) {
    hitObj = findProximityHit(origin, dir, ray.far, world.hittable as Object3D[])
  }

  if (!hitObj) {
    if (worldStore.getState().astraReady && gameStore.getState().astraCharges <= 0) {
      gameStore.getState().addAstraCharge()
    }
    return
  }

  const root = resolveHitRoot(hitObj, world.hittable)
  if (!root) return
  const enemy = world.enemies.find((e) => e.root === root)
  if (enemy) {
    hitEnemy(enemy, root)
    return
  }
  playAudio('arrow_hit_target')
  worldStore.getState().triggerHitFeedback('target')
  world.hittable = world.hittable.filter((o) => o !== root)
  if (typeof root.userData.onHit === 'function') {
    root.userData.onHit(root)
  } else {
    gameStore.getState().progress({ kind: 'hitTargets' })
  }
}

/** Executes an immediate astra cast and hitscan. */
export function castAstra(tick: number = world.tick): void {
  if (!gameStore.getState().useAstra(tick)) return
  gameStore.getState().progress({ kind: 'chargeAstra' })
  fireHitscan()
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
  castAstra(tick)
}
