// Arrow flight on the fixed tick and the arrows-out rule. Pure.
import { BALANCE } from '@data/balance'

export interface ArrowState {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  age: number
  alive: boolean
}

/** Where the arrow leaves the bow: MUZZLE_FORWARD along the AIM, not the body's yaw (mouse aim swings
 * ±MOUSE_YAW_RAD off the body, and an origin on the body's heading sent arrows off the arc). The release
 * and the preview arc both call this, so the arc cannot start somewhere the arrow does not. */
export function muzzleOrigin(x: number, y: number, z: number, dir: readonly [number, number, number]): [number, number, number] {
  const { MUZZLE_FORWARD: f, MUZZLE_HEIGHT: h } = BALANCE.archeryAim
  return [x + dir[0] * f, y + h, z + dir[2] * f]
}

export function launchArrow(origin: readonly [number, number, number], dir: readonly [number, number, number], fraction: number): ArrowState {
  const speed = BALANCE.arrow.SPEED * fraction
  const pitch = Math.asin(Math.max(-1, Math.min(1, dir[1])))
  const vHorizontal = speed * Math.cos(pitch)
  const yaw = Math.atan2(dir[0], dir[2])
  const vx = vHorizontal * Math.sin(yaw)
  const vz = vHorizontal * Math.cos(yaw)
  const vy = speed * Math.sin(pitch)
  return { x: origin[0], y: origin[1], z: origin[2], vx, vy, vz, age: 0, alive: true }
}

export function stepArrow(a: ArrowState, dt: number): ArrowState {
  if (!a.alive) return a
  const vy = a.vy - BALANCE.arrow.GRAVITY * dt
  const age = a.age + 1
  const alive = age < BALANCE.arrow.LIFETIME_TICKS
  return { ...a, x: a.x + a.vx * dt, y: a.y + vy * dt, z: a.z + a.vz * dt, vy, age, alive }
}

/** Arrow below the ground plane is spent. */
export function grounded(a: ArrowState): boolean {
  return a.y <= 0
}

/**
 * The L4 fail rule: only once the quiver is empty AND nothing is still in the air AND a
 * target remains. Never on the shot that empties the quiver — that arrow may still hit.
 */
export function shouldFailArrowsOut(quiver: number, liveArrows: number, targetsRemaining: number): boolean {
  return quiver <= 0 && liveArrows === 0 && targetsRemaining > 0
}

/**
 * Samples sequential flight states along the arrow's parabolic trajectory using the exact same
 * ballistics equation until it is grounded, dies, or reaches maxSteps. Pure.
 */
export function sampleTrajectoryPath(
  origin: readonly [number, number, number],
  dir: readonly [number, number, number],
  fraction: number,
  dt: number,
  maxSteps: number = BALANCE.arrow.LIFETIME_TICKS,
): ArrowState[] {
  const points: ArrowState[] = []
  let current = launchArrow(origin, dir, fraction)
  points.push(current)
  for (let i = 0; i < maxSteps; i += 1) {
    current = stepArrow(current, dt)
    points.push(current)
    if (grounded(current) || !current.alive) break
  }
  return points
}

