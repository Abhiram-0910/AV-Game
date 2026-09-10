// A flat walkable floor for levels with no modeled ground prop (no artist, no asset — same
// call as the procedural garments). Registers as ground so the locomotion raycast finds it.
import { useEffect, useRef } from 'react'
import type { Mesh } from 'three'
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
  return (
    <mesh ref={ref} position={[center[0], 0, center[1]]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[size[0], size[1]]} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}
