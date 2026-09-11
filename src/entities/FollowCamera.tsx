// Fixed behind the player, no free look. Exponential follow so turns read smoothly.
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

export function FollowCamera() {
  const camera = useThree((s) => s.camera)
  const first = useRef(true)
  useFrame((_, delta) => {
    const p = world.player
    const t = world.alpha
    const x = p.prevX + (p.x - p.prevX) * t
    const y = p.prevY + (p.y - p.prevY) * t
    const z = p.prevZ + (p.z - p.prevZ) * t
    const yaw = lerpAngle(p.prevYaw, p.yaw, t)
    wanted.set(x - Math.sin(yaw) * CAM.DISTANCE, y + CAM.HEIGHT, z - Math.cos(yaw) * CAM.DISTANCE)
    clampToBounds(wanted)
    const k = first.current ? 1 : 1 - Math.exp(-CAM.FOLLOW_RATE * delta)
    first.current = false
    camera.position.lerp(wanted, k)
    look.set(x, y + CAM.LOOK_HEIGHT, z)
    camera.lookAt(look)
  })
  return null
}
