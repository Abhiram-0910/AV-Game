// Pass 3 Phase B verification only: male/female × high/low body LOD walking side by side, so
// the decimated skinned mesh can be judged against the source at the hips/knees/shoulders.
// Behind ?debug=lod; never mounted in a real level, never wired into any scene's asset list.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import type { CharacterId } from '@data/characters'
import { buildCharacter, type BuildOptions, type BuiltCharacter } from '@render/character-factory'
import type { ResolvedTier } from '@render/manifest'

const RIG: { id: CharacterId; detail: BuildOptions['detail']; x: number }[] = [
  { id: 'rama', detail: 'high', x: -1.8 },
  { id: 'rama', detail: 'low', x: -0.6 },
  { id: 'tataka', detail: 'high', x: 0.6 },
  { id: 'tataka', detail: 'low', x: 1.8 },
]

function LodRig({ id, detail, x, tier }: { id: CharacterId; detail: BuildOptions['detail']; x: number; tier: ResolvedTier }) {
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  useEffect(() => {
    let live = true
    let instance: BuiltCharacter | null = null
    buildCharacter(id, { tier, props: false, detail }).then((b) => {
      if (!live) return b.dispose()
      instance = b
      b.controller.play('WALK')
      setBuilt(b)
    })
    return () => {
      live = false
      instance?.dispose()
    }
  }, [id, detail, tier])
  useFrame((_, delta) => built?.controller.update(delta))
  return built ? <primitive object={built.root} position={[x, 0, 0]} /> : null
}

export function LodDebug({ tier }: { tier: ResolvedTier }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 1.6, 5)
    camera.lookAt(0, 1.0, 0)
  }, [camera])
  return (
    <group name="lod-debug">
      <color attach="background" args={['#3a3a3a']} />
      <hemisphereLight args={['#ffffff', '#404040', 1.2]} />
      <directionalLight position={[3, 5, 3]} intensity={1.5} />
      {RIG.map((r) => (
        <LodRig key={`${r.id}-${r.detail}`} {...r} tier={tier} />
      ))}
    </group>
  )
}
