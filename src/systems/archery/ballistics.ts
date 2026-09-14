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

/** Where the arrow leaves the bow: MUZZLE_FORWARD along the AIM, not the body's yaw (the aim swings
 * off the body's heading, and an origin on that heading sent arrows off the arc). The release
 * and the preview arc both call this, so the arc cannot start somewhere the arrow does not. */
export function muzzleOrigin(x: number, y: number, z: number, dir: readonly [number, number, number]): [number, number, number] {
  const { MUZZLE_FORWARD: f, MUZZLE_HEIGHT: h } = BALANCE.archeryAim
  return [x + dir[0] * f, y + h, z + dir[2] * f]
}

export interface AimRay {
  origin: readonly [number, number, number]
  dir: readonly [number, number, number]
}

export interface AimLimits {
  /** Metres along the ray: where it has not met the ground by then, aim at that point instead. */
  maxDist: number
  /** Metres ahead of the muzzle the aim point is held to, so a low cursor never aims back or into the feet. */
  minDist: number
  /** Steepest downward and upward launch, radians. */
  maxDown: number
  maxUp: number
}

/**
 * Aim for a cursor ray cast from the camera: the bow points from the muzzle at the spot under the cursor —
 * where the ray meets the ground plane at the player's feet, or `maxDist` along the ray. Gravity still drops
 * the arrow, so far shots need the cursor above the target; the arc shows by how much. Plane-only (targets
 * and props are ignored) keeps the aim continuous as the cursor crosses a silhouette.
 */
export function aimFromRay(ray: AimRay, px: number, py: number, pz: number, limits: AimLimits): [number, number, number] {
  const [ox, oy, oz] = ray.origin
  const [dx, dy, dz] = ray.dir
  const t = Math.min(dy < -1e-6 ? (py - oy) / dy : Infinity, limits.maxDist)
  const h = Math.hypot(dx, dz) || 1
  const [mx, my, mz] = muzzleOrigin(px, py, pz, [dx / h, 0, dz / h])
  const ex = ox + dx * t - mx
  const ez = oz + dz * t - mz
  const ahead = (ex * dx + ez * dz) / h
  const run = ahead >= limits.minDist ? Math.hypot(ex, ez) : limits.minDist
  const pitch = Math.min(limits.maxUp, Math.max(-limits.maxDown, Math.atan2(oy + dy * t - my, run)))
  // Yaw so the arrow crosses the cursor ray where it comes down (full-draw range at this pitch), not at the capped
  // point or the ray's heading. The camera sits 5.5 m behind Rama, so any other yaw misses a far target sideways
  // whenever he is not facing it dead on: 3.9 m at 49 m and 11° off, and L4's 44 m shot at up to 0.5 rad off.
  const range = fullDrawRange(pitch, my - py)
  const wx = ox - mx
  const wz = oz - mz
  const along = (wx * dx + wz * dz) / h
  const s = -along + Math.sqrt(Math.max(0, along * along - (wx * wx + wz * wz) + range * range))
  const yaw = ahead >= limits.minDist ? Math.atan2(wx + (dx / h) * s, wz + (dz / h) * s) : Math.atan2(dx, dz)
  return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
}

/** Horizontal distance a full-draw arrow travels before reaching the ground `height` metres below where it left. */
function fullDrawRange(pitch: number, height: number): number {
  const { SPEED: v, GRAVITY: g } = BALANCE.arrow
  const vy = v * Math.sin(pitch)
  return (v * Math.cos(pitch) * (vy + Math.sqrt(vy * vy + 2 * g * height))) / g
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

