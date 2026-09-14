// Kinematic capsule on a fixed tick: tank controls, acceleration, bounds clamp, NPC push-out,
// ground snap. Pure — the world is queried through callbacks so tests need no three.js.
import { BALANCE } from '@data/balance'

export interface LocomotionState {
  x: number
  y: number
  z: number
  yaw: number
  /** Signed speed along facing, m/s. */
  speed: number
  prevX: number
  prevY: number
  prevZ: number
  prevYaw: number
}

export interface MoveInput {
  /** 1 forward, −1 back, 0 none. */
  forward: -1 | 0 | 1
  /** 1 turns left (counter-clockwise from above), −1 right. */
  turn: -1 | 0 | 1
  run: boolean
  /** Radians added to the yaw this tick from mouse look (+ turns left, like A). Absent for keyboard-only input. */
  yaw?: number
}

export interface Obstacle {
  x: number
  z: number
  radius: number
}

export interface WorldQuery {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  obstacles: readonly Obstacle[]
  groundY(x: number, z: number, lastY: number): number
}

export const IDLE_INPUT: MoveInput = { forward: 0, turn: 0, run: false }

export function spawnState(pos: readonly [number, number, number], yaw: number): LocomotionState {
  const [x, y, z] = pos
  return { x, y, z, yaw, speed: 0, prevX: x, prevY: y, prevZ: z, prevYaw: yaw }
}

function targetSpeed(input: MoveInput): number {
  const { WALK_SPEED, JOG_SPEED } = BALANCE.player
  if (input.forward > 0) return input.run ? JOG_SPEED : WALK_SPEED
  if (input.forward < 0) return -WALK_SPEED * BALANCE.locomotion.BACK_SPEED_FACTOR
  return 0
}

function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current
  return Math.abs(d) <= maxDelta ? target : current + Math.sign(d) * maxDelta
}

function pushOut(x: number, z: number, obstacles: readonly Obstacle[]): [number, number] {
  let px = x
  let pz = z
  for (const o of obstacles) {
    const dx = px - o.x
    const dz = pz - o.z
    const minDist = o.radius + BALANCE.locomotion.CAPSULE_RADIUS
    const dist = Math.hypot(dx, dz)
    if (dist >= minDist) continue
    const nx = dist > 1e-6 ? dx / dist : 1
    const nz = dist > 1e-6 ? dz / dist : 0
    px = o.x + nx * minDist
    pz = o.z + nz * minDist
  }
  return [px, pz]
}

export function stepLocomotion(s: LocomotionState, input: MoveInput, dt: number, world: WorldQuery): LocomotionState {
  const yaw = s.yaw + input.turn * BALANCE.player.TURN_SPEED_RAD * dt + (input.yaw ?? 0)
  const speed = approach(s.speed, targetSpeed(input), BALANCE.locomotion.ACCEL * dt)
  const r = BALANCE.locomotion.CAPSULE_RADIUS
  const { minX, maxX, minZ, maxZ } = world.bounds
  let x = Math.min(maxX - r, Math.max(minX + r, s.x + Math.sin(yaw) * speed * dt))
  let z = Math.min(maxZ - r, Math.max(minZ + r, s.z + Math.cos(yaw) * speed * dt))
  ;[x, z] = pushOut(x, z, world.obstacles)
  const ground = world.groundY(x, z, s.y)
  const y = Math.abs(ground - s.y) <= BALANCE.locomotion.GROUND_SNAP_MAX ? ground : s.y
  return { x, y, z, yaw, speed, prevX: s.x, prevY: s.y, prevZ: s.z, prevYaw: s.yaw }
}

/** Shortest signed angle from a to b. */
export function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a))
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + angleDelta(a, b) * t
}

/** Turn `yaw` toward `target` by at most `maxStep`, the short way round, never past it. */
export function turnToward(yaw: number, target: number, maxStep: number): number {
  const d = angleDelta(yaw, target)
  return Math.abs(d) <= maxStep ? yaw + d : yaw + Math.sign(d) * maxStep
}
