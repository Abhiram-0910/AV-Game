// Archery on the fixed tick: draw, release, flight, hit, and the arrows-out rule.
import { type Object3D, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { platform } from '@platform/index'
import { applyArrowHit } from '../ai/enemy-ai'
import { aimFromRay, grounded, launchArrow, muzzleOrigin, shouldFailArrowsOut, stepArrow } from './ballistics'
import { stepDraw } from './draw'
import { createHitTester, resolveHitRoot } from './hit-test'
import { playAudio } from '../audio'
import { world, worldStore } from '../world'

const AIM = BALANCE.archeryAim
const AIM_LIMITS = { maxDist: AIM.AIM_MAX_DIST, minDist: AIM.AIM_MIN_DIST, maxDown: AIM.AIM_MAX_DOWN, maxUp: AIM.AIM_MAX_UP }
const hitTest = createHitTester()
const targetDir = new Vector3()
const currentDir = new Vector3()

/** A 'lateral' target (entities/Target.tsx tags it in userData) is moved here, once per fixed
 * tick, right before this tick's hit-test — not in a render-frame useFrame. Under SwiftShader's
 * low frame rate the fixed loop can process several ticks per rendered frame
 * (BALANCE.loop.MAX_SUBSTEPS), so a render-frame-driven position would still be stale for the
 * hit-test on those ticks; the target's collision position must track world.tick exactly. */
export function updateMovingTargets(tick: number): void {
  for (const o of world.hittable as (Object3D & { userData: { lateral?: { baseX: number; amplitude: number; periodTicks: number } } })[]) {
    const lateral = o.userData.lateral
    if (!lateral) continue
    const phase = (tick / lateral.periodTicks) * Math.PI * 2
    o.position.x = lateral.baseX + Math.sin(phase) * lateral.amplitude
  }
}

function updateAimDir(): void {
  const { x, y, z } = world.player
  targetDir.fromArray(aimFromRay(world.aimRay, x, y, z, AIM_LIMITS))
  currentDir.set(world.aimDir[0], world.aimDir[1], world.aimDir[2])
  currentDir.lerp(targetDir, AIM.SMOOTH_FACTOR).normalize()
  world.aimDir = [currentDir.x, currentDir.y, currentDir.z]
}

function updateBlend(dt: number): void {
  const rate = world.draw.drawing ? dt / BALANCE.archery.AIM_BLEND_IN_SEC : -dt / BALANCE.archery.AIM_BLEND_OUT_SEC
  world.aimBlend = Math.max(0, Math.min(1, world.aimBlend + rate))
}

function fire(fraction: number): void {
  const store = gameStore.getState()
  if (!store.fireArrow()) return
  const { x, y, z } = world.player
  world.arrows.push(launchArrow(muzzleOrigin(x, y, z, world.aimDir), world.aimDir, fraction))
}

function targetsRemaining(): number {
  const s = gameStore.getState()
  const def = levelDef(s.level)
  return def.objectives.reduce((n, o, i) => (o.kind === 'hitTargets' ? n + (o.count - s.objectives[i].progress) : n), 0)
}

function handleArrowHit(hit: NonNullable<ReturnType<typeof hitTest>>): void {
  const root = resolveHitRoot(hit.object, world.hittable)
  const enemy = root && world.enemies.find((e) => e.root === root)
  if (enemy?.kind === 'maricha') {
    // Maricha is never killed by an arrow — only the Manava astra touches him.
  } else if (enemy) {
    playAudio('arrow_hit_flesh')
    worldStore.getState().triggerHitFeedback('enemy')
    const distance = Math.hypot(enemy.x - world.player.x, enemy.z - world.player.z)
    applyArrowHit(enemy, world.tick, distance)
    if (enemy.state === 'dead') {
      world.hittable = world.hittable.filter((o) => o !== root)
      gameStore.getState().progress({ kind: 'defeat', enemy: enemy.kind })
    }
  } else if (root?.userData.requiresAstra) {
    // A plain arrow bounces off — target stays hittable for astra.
    playAudio('arrow_hit_target')
  } else if (root) {
    playAudio('arrow_hit_target')
    worldStore.getState().triggerHitFeedback('target')
    world.hittable = world.hittable.filter((o) => o !== root)
    if (typeof root.userData.onHit === 'function') {
      root.userData.onHit(root)
    } else {
      gameStore.getState().progress({ kind: 'hitTargets' })
    }
    const store = gameStore.getState()
    if (store.level === 'l4' && targetsRemaining() <= 1) {
      worldStore.getState().setAstraReady(true)
      world.astraReady = true
      if (store.astraCharges <= 0) store.addAstraCharge()
    }
  }
}

export function stepArchery(dt: number): void {
  updateMovingTargets(world.tick)
  updateAimDir()
  const { state, released } = stepDraw(world.draw, platform.input.mouse().down)
  if (state.drawing && !world.draw.drawing) playAudio('bow_draw')
  world.draw = state
  updateBlend(dt)
  if (released !== null) {
    playAudio('bow_release')
    fire(released)
  }
  const next = []
  for (const a of world.arrows) {
    const moved = stepArrow(a, dt)
    const hit = hitTest(a, moved, world.hittable)
    if (hit) {
      handleArrowHit(hit)
    } else if (moved.alive && !grounded(moved)) {
      next.push(moved)
    } else if (moved.alive) {
      world.arrowPickups.push({ x: moved.x, z: moved.z })
      if (world.arrowPickups.length > BALANCE.interaction.MAX_ARROW_PICKUPS) world.arrowPickups.shift()
    }
  }
  world.arrows = next
  const s = gameStore.getState()
  if (shouldFailArrowsOut(s.arrows, world.arrows.length, targetsRemaining())) s.fail('arrowsOut')
}
