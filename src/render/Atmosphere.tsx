// Per-level look from scenery.ts: tone mapping and exposure. One mount per scene.
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import type { LevelScenery } from '@data/scenery'
import type { ResolvedTier } from './manifest'

export function Atmosphere({ scenery }: { scenery: LevelScenery; tier: ResolvedTier }) {
  const get = useThree((s) => s.get)
  const { look } = scenery

  useEffect(() => {
    const { gl } = get()
    gl.toneMapping = ACESFilmicToneMapping
    gl.outputColorSpace = SRGBColorSpace
    gl.toneMappingExposure = look.exposure
  }, [get, look])

  return null
}
