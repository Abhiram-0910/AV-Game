// Astra charge-and-release on the fixed tick.
// Agneyastra: 120 AOE fire damage in 5.0m explosion radius.
// Manavastra: 40 damage with 8m frontal cone impulse that knocks back 7m, stuns 90 ticks, and flings Maricha.
import { type Object3D, Ray, Raycaster, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { playAudio } from '../audio'
import { NO_DRAW } from '../archery/draw'
import { resolveHitRoot } from '../archery/hit-test'
import { world, worldStore } from '../world'
import { triggerAstraVfx } from './vfx-state'
export { triggerAstraVfx } from './vfx-state'

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

export interface AstraAim {
  point: Vector3
  /** The hittable root the strike will land on, or null for bare ground. */
  target: Object3D | null
}

/** An astra is a hitscan, so it lands on what the cursor is over: cast along the camera's cursor ray (world.aimRay), not
 * the bow's aimDir, which is lifted for an arrow's drop. The aim indicator and the cast both call this. */
export function resolveAstraAim(): AstraAim {
  origin.fromArray(world.aimRay.origin)
  dir.fromArray(world.aimRay.dir)
  ray.set(origin, dir)
  ray.far = BALANCE.combat.MAX_HIT_RANGE

  const hitObj = ray.intersectObjects(world.hittable as Object3D[], true)[0]?.object ??
    (world.hittable.length > 0 ? findProximityHit(origin, dir, ray.far, world.hittable as Object3D[]) : null)

  if (hitObj) {
    hitObj.getWorldPosition(tempPos)
    return { point: tempPos.clone(), target: resolveHitRoot(hitObj, world.hittable) ?? hitObj }
  }
  // Nothing under the cursor: where the ray meets the ground, or 18 m along it.
  const dist = dir.y < -1e-6 ? Math.min(18, -origin.y / dir.y) : 18
  return { point: new Vector3(origin.x + dir.x * dist, Math.max(0, origin.y + dir.y * dist), origin.z + dir.z * dist), target: null }
}

const HALF_CONE_COS = Math.cos((BALANCE.astra.manavastra.CONE_ANGLE_DEG * Math.PI) / 360)

/** Whether a point is inside Manavastra's cone from Rama at (px, pz) facing `yaw`. The cast and the aim fan share it. */
export function inManavaCone(px: number, pz: number, yaw: number, x: number, z: number): boolean {
  const dx = x - px
  const dz = z - pz
  const dist = Math.hypot(dx, dz)
  if (dist > BALANCE.astra.manavastra.CONE_RANGE || dist < 1e-4) return false
  return (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / dist >= HALF_CONE_COS
}

export function canCastAstra(tick: number = world.tick): boolean {
  const s = gameStore.getState()
  return s.phase === 'play' && s.astraCharges > 0 && tick >= s.astraCooldownUntil && s.selectedAstra !== null
}

function applyDamageToEnemy(enemy: (typeof world.enemies)[number], dmg: number, tick: number, stunTicks?: number): void {
  enemy.health = Math.max(0, enemy.health - dmg)
  enemy.invulnUntil = tick + BALANCE.combat.INVULN_TICKS
  worldStore.getState().triggerHitFeedback('enemy')
  if (enemy.health === 0) {
    enemy.state = 'dead'
    enemy.stateUntil = tick + BALANCE.spawn.DESPAWN_TICKS
    playAudio(enemy.kind === 'tataka' ? 'boss_groan' : 'enemy_death')
    if (enemy.root) world.hittable = world.hittable.filter((o) => o !== enemy.root)
    gameStore.getState().progress({ kind: 'defeat', enemy: enemy.kind })
  } else {
    enemy.state = 'stagger'
    enemy.stateUntil = tick + (stunTicks ?? BALANCE.combat.STAGGER_TICKS)
    playAudio('enemy_hit')
  }
}

function hitTargetsAround(center: Vector3, radius: number): void {
  const hitRoots = new Set<Object3D>()
  for (const obj of world.hittable) {
    obj.getWorldPosition(tempPos)
    if (tempPos.distanceTo(center) <= radius) {
      const root = resolveHitRoot(obj, world.hittable)
      if (root && !world.enemies.some((e) => e.root === root)) hitRoots.add(root)
    }
  }
  for (const root of hitRoots) {
    playAudio('arrow_hit_target')
    worldStore.getState().triggerHitFeedback('target')
    world.hittable = world.hittable.filter((o) => o !== root)
    if (typeof root.userData.onHit === 'function') root.userData.onHit(root)
    else gameStore.getState().progress({ kind: 'hitTargets' })
  }
}

export function castAgneyastra(
  player = world.player,
  enemies = world.enemies,
  tick: number = world.tick,
): Vector3 {
  playAudio('astra_cast')
  const impact = resolveAstraAim().point
  triggerAstraVfx('agneyastra', player, impact)

  const radius = BALANCE.astra.agneyastra.RADIUS
  const damage = BALANCE.astra.agneyastra.DAMAGE
  for (const enemy of enemies) {
    // Maricha is flung, never killed (AGENTS.md content rules): fire passes over him, as arrows do.
    if (enemy.state === 'dead' || enemy.kind === 'maricha') continue
    const d = Math.hypot(enemy.x - impact.x, enemy.z - impact.z)
    if (d <= radius) applyDamageToEnemy(enemy, damage, tick)
  }
  hitTargetsAround(impact, radius)
  return impact
}

export function castManavastra(
  player = world.player,
  enemies = world.enemies,
  tick: number = world.tick,
): Vector3 {
  playAudio('whoosh')
  playAudio('astra_cast')
  const px = player.x
  const pz = player.z
  const fx = Math.sin(player.yaw)
  const fz = Math.cos(player.yaw)
  const dirVec: [number, number, number] = [fx, 0, fz]
  triggerAstraVfx('manavastra', player, dirVec)

  for (const enemy of enemies) {
    if (enemy.state === 'dead' || !inManavaCone(px, pz, player.yaw, enemy.x, enemy.z)) continue
    const dx = enemy.x - px
    const dz = enemy.z - pz
    const dist = Math.hypot(dx, dz)

    enemy.x += (dx / dist) * BALANCE.astra.manavastra.KNOCKBACK_DISTANCE
    enemy.z += (dz / dist) * BALANCE.astra.manavastra.KNOCKBACK_DISTANCE
    if (enemy.kind === 'maricha') {
      enemy.flung = { x: dx / dist, z: dz / dist }
      applyDamageToEnemy(enemy, enemy.health, tick)
    } else {
      applyDamageToEnemy(enemy, BALANCE.astra.manavastra.DAMAGE, tick, BALANCE.astra.manavastra.STUN_TICKS)
    }
  }
  hitTargetsAround(new Vector3(px + fx * 4, 1, pz + fz * 4), 4.5)
  return new Vector3(fx, 0, fz)
}

export function castAstra(tick: number = world.tick): boolean {
  const store = gameStore.getState()
  if (!store.castAstra(tick)) return false
  store.progress({ kind: 'chargeAstra' })
  const selected = store.selectedAstra ?? 'agneyastra'
  if (selected === 'manavastra') castManavastra(world.player, world.enemies, tick)
  else castAgneyastra(world.player, world.enemies, tick)
  return true
}

/** What the aim indicators show, every tick: Agneyastra's strike point while charging, and for Manavastra (whenever it
 * could cast, charging or not) who stands in the cone. */
function updateAstraAim(held: boolean, tick: number): void {
  const castable = canCastAstra(tick)
  const manava = gameStore.getState().selectedAstra === 'manavastra'
  const aim = held && castable && !manava ? resolveAstraAim() : null
  world.astraAim = aim && { point: [aim.point.x, aim.point.y, aim.point.z], target: aim.target !== null }
  const p = world.player
  world.astraCone = castable && manava ? world.enemies.filter((e) => e.state !== 'dead' && inManavaCone(p.x, p.z, p.yaw, e.x, e.z)) : []
  const maricha = world.enemies.some((e) => e.kind === 'maricha' && e.state !== 'dead')
  const inCone = world.astraCone.some((e) => e.kind === 'maricha')
  worldStore.getState().setAstraAim(held && castable, held && castable && manava && maricha ? (inCone ? 'in' : 'out') : null)
}

export function stepAstra(held: boolean, tick: number): void {
  updateAstraAim(held, tick)
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
