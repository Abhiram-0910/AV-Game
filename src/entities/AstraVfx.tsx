// Dynamic 3D visual effects for Astra summons: Agneya flaming beam + shockwave, and Manava gale rings.
import { useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Quaternion, Vector3 } from 'three'
import { subscribeAstraVfx, type AstraVfxEvent } from '@systems/astra/vfx-state'

interface ActiveVfxItem extends AstraVfxEvent {
  frame: number
  maxFrames: number
}

const tempVec = new Vector3()
const upVec = new Vector3(0, 1, 0)
const GALE_INDICES = [0, 1, 2] as const

function computeBeamQuat(dx: number, dy: number, dz: number): Quaternion {
  tempVec.set(dx, dy, dz).normalize()
  return new Quaternion().setFromUnitVectors(upVec, tempVec)
}

function AgneyaBurst({ item }: { item: ActiveVfxItem }) {
  const t = Math.min(1, item.frame / item.maxFrames)
  const [ox, oy, oz] = item.origin
  const [tx, ty, tz] = item.target
  const dx = tx - ox
  const dy = ty - oy
  const dz = tz - oz
  const length = Math.hypot(dx, dy, dz)
  const mx = (ox + tx) / 2
  const my = (oy + ty) / 2
  const mz = (oz + tz) / 2

  const sphereScale = 0.5 + t * 4.5
  const opacity = Math.max(0, (1 - t) * 0.85)
  const beamProgress = Math.min(1, t * 2.5)

  return (
    <group>
      {t < 0.75 && (
        <mesh position={[mx, my, mz]} scale={[0.08, length * beamProgress, 0.08]} quaternion={computeBeamQuat(dx, dy, dz)}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshBasicMaterial color="#ffaa22" transparent opacity={opacity * 0.9} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[tx, ty, tz]} scale={[sphereScale, sphereScale, sphereScale]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff4500" transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[tx, ty, tz]} scale={[sphereScale * 0.5, sphereScale * 0.5, sphereScale * 0.5]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={opacity * 1.1} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ManavaGale({ item }: { item: ActiveVfxItem }) {
  const t = Math.min(1, item.frame / item.maxFrames)
  const fx = Math.sin(item.yaw)
  const fz = Math.cos(item.yaw)
  const opacity = Math.max(0, (1 - t) * 0.8)

  return (
    <group>
      {GALE_INDICES.map((i) => {
        const travel = t * 7.0 + i * 0.7
        const px = item.origin[0] + fx * travel
        const pz = item.origin[2] + fz * travel
        const ringRadius = 1.0 + t * 3.2 + i * 0.5
        const spin = (i % 2 === 0 ? 1 : -1) * t * Math.PI * 2
        const color = i % 2 === 0 ? '#00e5ff' : '#ffffff'

        return (
          <mesh key={i} position={[px, item.origin[1], pz]} rotation={[Math.PI / 2, 0, item.yaw + spin]}>
            <torusGeometry args={[ringRadius, 0.07, 8, 24]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}

export function AstraVfx() {
  const [items, setItems] = useState<ActiveVfxItem[]>([])

  useEffect(() => {
    return subscribeAstraVfx((e) => {
      setItems((prev) => [...prev, { ...e, frame: 0, maxFrames: e.type === 'agneyastra' ? 30 : 40 }])
    })
  }, [])

  useFrame(() => {
    setItems((prev) => {
      if (prev.length === 0) return prev
      const next: ActiveVfxItem[] = []
      let changed = false
      for (const it of prev) {
        const nextFrame = it.frame + 1
        if (nextFrame < it.maxFrames) {
          next.push({ ...it, frame: nextFrame })
          changed = true
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  })

  return (
    <group name="astra-vfx">
      {items.map((it) => (it.type === 'agneyastra' ? <AgneyaBurst key={it.id} item={it} /> : <ManavaGale key={it.id} item={it} />))}
    </group>
  )
}
