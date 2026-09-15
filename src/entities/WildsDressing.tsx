// Levels 2–4 outdoors on both tiers (render/wilds-dressing.ts): built once tree.glb and rock.glb are in,
// counted toward the level's load gate, and animated where something moves — the Sarayu flowing, mist
// drifting, and on high the Level 4 fire pit's light and Level 3's curse lifting once Tataka falls. Low skips those
// two: a point light is paid by every lit fragment, and the lift swaps in a textured sky low does not draw.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type CanvasTexture, Color, type DirectionalLight, type Fog, type MeshBasicMaterial, type PointLight } from 'three'
import { RANGE, SCENERY, WILDS } from '@data/scenery'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { DEBUG } from '@platform/debug'
import { loadGltf } from '@render/loaders'
import { skyTexture } from '@render/procedural-textures'
import type { ResolvedTier } from '@render/manifest'
import { isSoftwareRenderer, rendererName } from '@render/quality-tier'
import { buildWilds, type WildsBuild, type WildsLevel } from '@render/wilds-dressing'
import { worldStore } from '@systems/world'

const FIRE = RANGE.firePit.light
const TATAKA_DOWN_AT = levelDef('l3').objectives.findIndex((o) => o.kind === 'defeat')

function FireLight({ at }: { at: readonly [number, number, number] }) {
  const light = useRef<PointLight>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * FIRE.flickerHz
    if (light.current) light.current.intensity = FIRE.intensity * (1 + FIRE.flickerAmount * Math.sin(t) * Math.sin(t * 0.43 + 1.3))
  })
  return <pointLight ref={light} position={[at[0], at[1], at[2]]} color={FIRE.color} intensity={FIRE.intensity} distance={FIRE.distance} decay={2} />
}

interface Lift {
  start: number | null
  done: boolean
  step: number
  sky: CanvasTexture | null
}

/** Sky swaps during the lift. three converts an equirect background to a cubemap once per texture and ignores
 * needsUpdate, so the sky is rebuilt (and the old one disposed, freeing its cubemap) in steps, not repainted. */
const SKY_STEPS = 12

/** Level 3: once Tataka is down, the sky, fog and exposure blend to the lifted look, the mist burns off, and a
 * gold sun comes up. */
function CurseLift({ mist }: { mist: MeshBasicMaterial | null }) {
  const lift = WILDS.l3!.curseLift!
  const look = SCENERY.l3!.look
  const sun = useRef<DirectionalLight>(null)
  const state = useRef<Lift>({ start: null, done: false, step: -1, sky: null })
  const mistRef = useRef(mist)
  const c = useMemo(
    () => ({ z0: new Color(look.sky.zenith), z1: new Color(lift.sky.zenith), h0: new Color(look.sky.horizon), h1: new Color(lift.sky.horizon), fog: new Color(lift.fog), z: new Color(), h: new Color() }),
    [look, lift],
  )
  useEffect(() => {
    mistRef.current = mist
  }, [mist])
  useEffect(() => () => state.current.sky?.dispose(), [])
  useFrame(({ clock, scene, gl }) => {
    const s = state.current
    if (s.done) return
    if (s.start === null) {
      if (!gameStore.getState().objectives[TATAKA_DOWN_AT]?.done) return
      s.start = clock.elapsedTime
    }
    const t = Math.min(1, (clock.elapsedTime - s.start) / lift.seconds)
    const k = t * t * (3 - 2 * t)
    const step = Math.round(k * SKY_STEPS)
    if (step !== s.step) {
      s.step = step
      s.sky?.dispose()
      s.sky = skyTexture(`#${c.z.lerpColors(c.z0, c.z1, step / SKY_STEPS).getHexString()}`, `#${c.h.lerpColors(c.h0, c.h1, step / SKY_STEPS).getHexString()}`)
      scene.background = s.sky
    }
    ;(scene.fog as Fog | null)?.color.lerpColors(c.h0, c.fog, k)
    gl.toneMappingExposure = look.exposure + (lift.exposure - look.exposure) * k
    if (mistRef.current) mistRef.current.opacity = WILDS.l3!.mist!.opacity * (1 - k)
    if (sun.current) sun.current.intensity = lift.sun.intensity * k
    s.done = t >= 1
  })
  return <directionalLight ref={sun} position={[lift.sun.dir[0], lift.sun.dir[1], lift.sun.dir[2]]} color={lift.sun.color} intensity={0} />
}

export function WildsDressing({ level, tier }: { level: WildsLevel; tier: ResolvedTier }) {
  const gl = useThree((s) => s.gl)
  // A software renderer (no GPU: SwiftShader in headless e2e and shoot-levels) keeps the bare low tier. It rasterises the
  // alpha-tested forest on the CPU, which took L2's and L3's e2e past their 15-minute timeouts (2026-09-14). Lab PCs
  // with a real GPU get the dressing.
  const bare = useMemo(() => tier === 'low' && isSoftwareRenderer(rendererName(gl)), [tier, gl])
  const [built, setBuilt] = useState<WildsBuild | null>(null)
  const builtRef = useRef<WildsBuild | null>(null)
  useEffect(() => {
    let live = true
    let mine: WildsBuild | null = null
    Promise.all([loadGltf('tree'), loadGltf('rock')]).then(([tree, rock]) => {
      if (!live) return
      if (!bare) {
        mine = buildWilds(level, tree.scene, rock.scene, tier, DEBUG.density)
        builtRef.current = mine
        setBuilt(mine)
      }
      worldStore.getState().markLoaded()
    })
    return () => {
      live = false
      builtRef.current = null
      mine?.dispose()
    }
  }, [level, tier, bare])
  useFrame((_, delta) => {
    const b = builtRef.current
    const w = WILDS[level]!
    if (b?.water?.map && w.water) b.water.map.offset.x += w.water.flow * delta
    if (b?.mist?.map && w.mist) b.mist.map.offset.set(b.mist.map.offset.x + w.mist.drift * delta, b.mist.map.offset.y + w.mist.drift * 0.6 * delta)
  })
  if (!built) return null
  return (
    <>
      <primitive object={built.group} />
      {tier === 'high' && built.fire && <FireLight at={built.fire} />}
      {tier === 'high' && level === 'l3' && <CurseLift mist={built.mist} />}
    </>
  )
}
