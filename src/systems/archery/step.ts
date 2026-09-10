// Archery on the fixed tick: draw, release, flight, hit, and the arrows-out rule.
import { Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { platform } from '@platform/index'
import { grounded, launchArrow, shouldFailArrowsOut, stepArrow } from './ballistics'
import { drawFraction, stepDraw } from './draw'
import { createHitTester, resolveHitRoot } from './hit-test'
import { world } from '../world'

const AIM = BALANCE.archeryAim
const hitTest = createHitTester()
const dir = new Vector3()

function updateAimDir(): void {
  const m = platform.input.mouse()
  const yaw = world.player.yaw + m.x * AIM.MOUSE_YAW_RAD
  const pitch = m.y * AIM.MOUSE_PITCH_RAD
  dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).normalize()
  world.aimDir = [dir.x, dir.y, dir.z]
}

function updateBlend(dt: number): void {
  const rate = world.draw.drawing ? dt / BALANCE.archery.AIM_BLEND_IN_SEC : -dt / BALANCE.archery.AIM_BLEND_OUT_SEC
  world.aimBlend = Math.max(0, Math.min(1, world.aimBlend + rate))
}

function fire(fraction: number): void {
  const store = gameStore.getState()
  if (!store.fireArrow()) return
  const p = world.player
  const [dx, dy, dz] = world.aimDir
  const origin: [number, number, number] = [p.x + dx * AIM.MUZZLE_FORWARD, p.y + AIM.MUZZLE_HEIGHT, p.z + dz * AIM.MUZZLE_FORWARD]
  world.arrows.push(launchArrow(origin, [dx, dy, dz], fraction))
}

function targetsRemaining(): number {
  const s = gameStore.getState()
  const def = levelDef(s.level)
  return def.objectives.reduce((n, o, i) => (o.kind === 'hitTargets' ? n + (o.count - s.objectives[i].progress) : n), 0)
}

export function stepArchery(dt: number): void {
  updateAimDir()
  const { state, released } = stepDraw(world.draw, platform.input.mouse().down)
  world.draw = state
  updateBlend(dt)
  if (released !== null) fire(released)
  const next = []
  for (const a of world.arrows) {
    const moved = stepArrow(a, dt)
    const hit = hitTest(a, moved, world.hittable)
    if (hit) {
      // A struck target stops being hittable so the same one can't be counted twice.
      const root = resolveHitRoot(hit.object, world.hittable)
      if (root) world.hittable = world.hittable.filter((o) => o !== root)
      gameStore.getState().progress({ kind: 'hitTargets' })
    } else if (moved.alive && !grounded(moved)) next.push(moved)
  }
  world.arrows = next
  const s = gameStore.getState()
  if (shouldFailArrowsOut(s.arrows, world.arrows.length, targetsRemaining())) s.fail('arrowsOut')
}

export { drawFraction }
