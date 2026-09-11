import { useEffect, useRef } from 'react'
import type { Mesh } from 'three'
import { getToonRamp } from '@render/materials'
import { world } from '@systems/world'

export function GroundPlane({ center, size, color }: { center: readonly [number, number]; size: readonly [number, number]; color: string }) {
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

  return (
    <mesh ref={ref} position={[center[0], 0, center[1]]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshToonMaterial color={color} gradientMap={getToonRamp()} />
    </mesh>
  )
}
