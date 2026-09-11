// Fixed behind the player, no free look. Exponential follow so turns read smoothly. Each level opens
// with an establishing move: wide and high over the scene, easing down into the follow pose.
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { SCENERY } from '@data/scenery'
import { gameStore } from '@core/game-state'
import { lerpAngle } from '@systems/locomotion/kinematic'
import { world } from '@systems/world'

const CAM = BALANCE.camera
const wanted = new Vector3()
const look = new Vector3()

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

export function FollowCamera() {
  const camera = useThree((s) => s.camera)
  const first = useRef(true)
  const elapsed = useRef(0)
  useFrame((_, delta) => {
    // The clock starts when the level is on screen, not while it is still loading behind the curtain.
    if (gameStore.getState().phase !== 'loading') elapsed.current += delta
    const wide = 1 + (CAM.ESTABLISH_SCALE - 1) * establishing(elapsed.current)
    const p = world.player
    const t = world.alpha
    const x = p.prevX + (p.x - p.prevX) * t
    const y = p.prevY + (p.y - p.prevY) * t
    const z = p.prevZ + (p.z - p.prevZ) * t
    const yaw = lerpAngle(p.prevYaw, p.yaw, t)
    wanted.set(x - Math.sin(yaw) * CAM.DISTANCE * wide, y + CAM.HEIGHT * wide, z - Math.cos(yaw) * CAM.DISTANCE * wide)
    clampToBounds(wanted)
    const k = first.current ? 1 : 1 - Math.exp(-CAM.FOLLOW_RATE * delta)
    first.current = false
    camera.position.lerp(wanted, k)
    look.set(x, y + CAM.LOOK_HEIGHT, z)
    camera.lookAt(look)
  })
  return null
}
