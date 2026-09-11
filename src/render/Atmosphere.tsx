// Per-level look from scenery.ts: tone mapping, exposure, reflections and the three-point rig
// (warm key, hemisphere fill, cool rim). The key casts the one shadow map on high; low keeps key + fill
// and its blob shadows. One mount per scene.
import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, Object3D, PCFShadowMap, PMREMGenerator, SRGBColorSpace, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { type LevelScenery, LOW_AMBIENT_FROM_ENV, SHADOW } from '@data/scenery'
import type { ResolvedTier } from './manifest'

type Bounds = LevelScenery['bounds']

/** Centre and half-diagonal of the playable rectangle: the shadow frustum covers it at any light angle. */
function fit(bounds: Bounds) {
  const center = new Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2)
  const radius = Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2
  return { center, radius }
}

function KeyLight({ scenery, shadows }: { scenery: LevelScenery; shadows: boolean }) {
  const { key } = scenery.look
  const { center, radius } = useMemo(() => fit(scenery.bounds), [scenery.bounds])
  const target = useMemo(() => new Object3D(), [])
  const pos = useMemo(() => new Vector3(...key.dir).normalize().multiplyScalar(radius * 2).add(center), [key.dir, radius, center])
  return (
    <>
      <primitive object={target} position={center} />
      <directionalLight
        position={pos}
        target={target}
        color={key.color}
        intensity={key.intensity}
        castShadow={shadows}
        shadow-mapSize={[SHADOW.MAP_SIZE, SHADOW.MAP_SIZE]}
        shadow-bias={SHADOW.BIAS}
        shadow-normalBias={SHADOW.NORMAL_BIAS}
        shadow-radius={SHADOW.RADIUS}
        shadow-camera-left={-radius}
        shadow-camera-right={radius}
        shadow-camera-top={radius}
        shadow-camera-bottom={-radius}
        shadow-camera-near={SHADOW.NEAR}
        shadow-camera-far={radius * 4}
      />
    </>
  )
}

/** High tier: a prefiltered RoomEnvironment so metal has something to reflect (built once per level). */
function useReflections(enabled: boolean, intensity: number) {
  const get = useThree((s) => s.get)
  useLayoutEffect(() => {
    if (!enabled) return
    const { gl, scene } = get()
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04).texture
    room.dispose()
    pmrem.dispose()
    scene.environment = env
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [get, enabled, intensity])
}

export function Atmosphere({ scenery, tier }: { scenery: LevelScenery; tier: ResolvedTier }) {
  const get = useThree((s) => s.get)
  const { look } = scenery
  const high = tier === 'high'
  useReflections(high, look.envIntensity)

  // Layout effect: the shadow-map switch must land before any material compiles.
  useLayoutEffect(() => {
    const { gl } = get()
    gl.toneMapping = ACESFilmicToneMapping
    gl.outputColorSpace = SRGBColorSpace
    gl.toneMappingExposure = look.exposure
    gl.shadowMap.enabled = high
    gl.shadowMap.type = PCFShadowMap
  }, [get, look, high])

  return (
    <>
      <hemisphereLight args={[look.fill.sky, look.fill.ground, look.fill.intensity]} />
      {!high && <ambientLight intensity={look.envIntensity * LOW_AMBIENT_FROM_ENV} />}
      <KeyLight scenery={scenery} shadows={high} />
      {high && <directionalLight position={look.rim.dir} color={look.rim.color} intensity={look.rim.intensity} />}
    </>
  )
}
