// Where a locked mouse's movement goes. Free look: sideways turns Rama (and the camera behind him), up/down tilts the
// camera. While the bow is drawn or an astra charges, the same movement steers a virtual cursor instead, so the aim
// works exactly as the unlocked cursor does (FollowCamera casts world.aimRay through it). Pure.
import { BALANCE } from '@data/balance'

const LOOK = BALANCE.mouseLook

export interface LookState {
  /** Camera tilt above (+) or below (−) the follow pose, radians. */
  pitch: number
  /** NDC, −1..1 from the screen centre, +y up. */
  cursor: { x: number; y: number }
  /** Whether the previous call was aiming: a new aim recentres the cursor sideways. */
  aiming: boolean
}

export interface LookResult extends LookState {
  /** Radians to add to Rama's yaw; + turns left, like A. */
  yawDelta: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** `dx`, `dy` in CSS px (movementX/Y, +y down); `radPerPx` already includes the player's sensitivity; the viewport sizes
 * convert px to NDC so the virtual cursor moves as far as the real cursor would. */
export function routeLook(dx: number, dy: number, aiming: boolean, radPerPx: number, s: LookState, width: number, height: number): LookResult {
  if (!aiming) return { yawDelta: -dx * radPerPx, pitch: clamp(s.pitch - dy * radPerPx, -LOOK.PITCH_DOWN_MAX, LOOK.PITCH_UP_MAX), cursor: s.cursor, aiming }
  const start = aiming && !s.aiming ? { x: 0, y: s.cursor.y } : s.cursor
  const cursor = { x: clamp(start.x + (dx * 2) / width, -1, 1), y: clamp(start.y - (dy * 2) / height, -1, 1) }
  return { yawDelta: 0, pitch: s.pitch, cursor, aiming }
}
