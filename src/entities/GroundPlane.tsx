// A flat walkable floor for levels with no modeled ground prop. Registers as ground so the
// locomotion raycast finds it. High tier: a tiled, dappled canvas texture; low: flat Lambert (a toon ramp
// drops the whole floor into its shadow step under a low sun).
import { useEffect, useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import type { LevelLook } from '@data/scenery'
import { assetTier } from '@render/manifest'
import { dappleTexture } from '@render/procedural-textures'
import { world } from '@systems/world'

/** Metres per repeat of the dapple tile. */
const TILE_M = 6

export function GroundPlane({ center, size, ground }: { center: readonly [number, number]; size: readonly [number, number]; ground: LevelLook['ground'] }) {
  const ref = useRef<Mesh>(null)
  useEffect(() => {
    const mesh = ref.current!
    world.ground.push(mesh)
    return () => {
      world.ground = world.ground.filter((g) => g !== mesh)
    }
  }, [])

  // Extend visual ground to horizon to eliminate hard void/sky borders at level edges
  const width = Math.max(size[0] * 3, 280)
  const depth = Math.max(size[1] * 3, 280)
  const high = assetTier() === 'high'
  const texture = useMemo(() => {
    if (!high) return null
    const t = dappleTexture(ground.base, ground.dapple)
    t.repeat.set(width / TILE_M, depth / TILE_M)
    return t
  }, [high, ground, width, depth])
  useEffect(() => () => texture?.dispose(), [texture])

  return (
    <mesh ref={ref} position={[center[0], 0, center[1]]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[width, depth]} />
      {texture ? <meshStandardMaterial map={texture} roughness={0.95} /> : <meshLambertMaterial color={ground.base} />}
    </mesh>
  )
}
