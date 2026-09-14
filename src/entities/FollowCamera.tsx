// Behind the player, exponential follow so turns read smoothly. With the pointer locked (ui/MouseMode.tsx) the mouse turns
// Rama and tilts the camera, or steers a virtual aim cursor while the bow is drawn or an astra charges
// (systems/camera/mouse-look.ts); unlocked, the keys turn and the real cursor aims, as before. Each level opens with an
// establishing move: wide and high over the scene, easing down into the follow pose.
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Raycaster, Vector2, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { SCENERY } from '@data/scenery'
import { gameStore } from '@core/game-state'
import { astraView } from '@systems/astra/vfx-state'
import { type LookState, routeLook } from '@systems/camera/mouse-look'
import { lerpAngle } from '@systems/locomotion/kinematic'
import { world } from '@systems/world'
import { platform } from '@platform/index'

const CAM = BALANCE.camera
const LOOK = BALANCE.mouseLook
/** The follow pose as an orbit about the look point: elevation and radius. */
const BASE_ELEVATION = Math.atan2(CAM.HEIGHT - CAM.LOOK_HEIGHT, CAM.DISTANCE)
const ORBIT_RADIUS = Math.hypot(CAM.HEIGHT - CAM.LOOK_HEIGHT, CAM.DISTANCE)
/** Per-second rate the tilt eases back to the follow pose once the mouse is no longer looking, and the faster rate while
 * aiming: the aim limits and AIM_CURSOR_START_Y were measured from the follow pose, so a draw must not start tilted. */
const PITCH_RETURN_RATE = 4
const AIM_PITCH_RETURN_RATE = 12
const wanted = new Vector3()
const look = new Vector3()
const cursor = new Vector2()
const ray = new Raycaster()
const lookState: LookState = { pitch: 0, cursor: { x: 0, y: LOOK.AIM_CURSOR_START_Y }, aiming: false }

/** Enclosed levels keep the camera inside their walls, so no wall stands between it and the player. */
function clampToBounds(v: Vector3) {
  const b = SCENERY[gameStore.getState().level]?.cameraBounds
  if (!b) return
  v.x = Math.min(b.maxX, Math.max(b.minX, v.x))
  v.z = Math.min(b.maxZ, Math.max(b.minZ, v.z))
}

/** 1 at the start of the establishing move, 0 once it has landed (smoothstep). */
function establishing(elapsed: number): number {
  const t = Math.min(1, elapsed / CAM.ESTABLISH_SECONDS)
  return 1 - t * t * (3 - 2 * t)
}

/** Locked mouse movement → turn, tilt, or the virtual cursor, which is written where the cursor ray reads it. */
function routeMouse(delta: number, width: number, height: number): void {
  const { lock } = platform.input
  const [dx, dy] = lock.takeDelta()
  if (!lock.locked()) {
    lookState.aiming = false
    lookState.pitch *= Math.exp(-PITCH_RETURN_RATE * delta)
    world.cameraPitch = lookState.pitch
    return
  }
  const aiming = world.draw.drawing || world.astraCharge.drawing
  const s = gameStore.getState().settings
  const radPerPx = s.pointer === 'trackpad' ? LOOK.RAD_PER_PX_TRACKPAD * s.trackpadSensitivity : LOOK.RAD_PER_PX_MOUSE * s.mouseSensitivity
  const r = routeLook(dx, dy, aiming, radPerPx, lookState, width, height)
  world.lookYaw += r.yawDelta
  lookState.pitch = world.cameraPitch = aiming ? r.pitch * Math.exp(-AIM_PITCH_RETURN_RATE * delta) : r.pitch
  lookState.cursor = r.cursor
  lookState.aiming = aiming
  const m = platform.input.mouse()
  m.x = aiming ? r.cursor.x : 0
  m.y = r.cursor.y
}

export function FollowCamera() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const first = useRef(true)
  const elapsed = useRef(0)
  useFrame((_, delta) => {
    // The clock starts when the level is on screen, not while it is still loading behind the curtain.
    if (gameStore.getState().phase !== 'loading') elapsed.current += delta
    routeMouse(delta, size.width, size.height)
    const wide = 1 + (CAM.ESTABLISH_SCALE - 1) * establishing(elapsed.current)
    const p = world.player
    const t = world.alpha
    const x = p.prevX + (p.x - p.prevX) * t
    const y = p.prevY + (p.y - p.prevY) * t
    const z = p.prevZ + (p.z - p.prevZ) * t
    const yaw = lerpAngle(p.prevYaw, p.yaw, t)
    // Tilting up lowers the camera on its orbit; at pitch 0 this is exactly DISTANCE back and HEIGHT up.
    const elevation = BASE_ELEVATION - world.cameraPitch
    const back = ORBIT_RADIUS * Math.cos(elevation) * wide
    const up = (CAM.LOOK_HEIGHT + ORBIT_RADIUS * Math.sin(elevation)) * wide
    wanted.set(x - Math.sin(yaw) * back, y + up, z - Math.cos(yaw) * back)
    clampToBounds(wanted)
    const k = first.current ? 1 : 1 - Math.exp(-CAM.FOLLOW_RATE * delta)
    first.current = false
    camera.position.lerp(wanted, k)
    // The astra's strike shakes the view (render only; the follow lerp pulls it straight back).
    if (astraView.shake > 0) camera.position.add(look.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).multiplyScalar(astraView.shake))
    look.set(x, y + CAM.LOOK_HEIGHT, z)
    camera.lookAt(look)
    camera.updateMatrixWorld()
    // The cursor (already NDC) cast from this camera: systems/archery aims the bow along it on the next tick.
    const m = platform.input.mouse()
    ray.setFromCamera(cursor.set(m.x, m.y), camera)
    const { origin: o, direction: d } = ray.ray
    world.aimRay = { origin: [o.x, o.y, o.z], dir: [d.x, d.y, d.z] }
  })
  return null
}
