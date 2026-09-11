// Level 5's enclosure (render/yajna-dressing.ts) and the altar fire: teardrop flames sized by the yajna's
// integrity, a warm flickering point light that is the dusk's second source, a red flash while a hit's
// invulnerability lasts, and on high rising embers. Everything reads the stores per frame, so nothing
// here re-renders React.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Mesh, type MeshStandardMaterial, type PointLight, Points, PointsMaterial } from 'three'
import { BALANCE } from '@data/balance'
import { YAJNA } from '@data/scenery'
import { gameStore } from '@core/game-state'
import { flameGeometry } from '@render/fire'
import type { ResolvedTier } from '@render/manifest'
import { authoredMaterial } from '@render/materials'
import { canvasTexture, flameTexture, seeded } from '@render/procedural-textures'
import { buildYajna } from '@render/yajna-dressing'
import { world } from '@systems/world'

const L = YAJNA.light
const WHITE = new Color('#ffffff')
const HIT = new Color(L.hit)

function fireState() {
  const s = gameStore.getState()
  return { hit: world.tick < s.yajnaInvulnUntil, frac: Math.max(0.12, s.yajnaIntegrity / BALANCE.yajna.MAX_INTEGRITY) }
}

function AltarFire({ tier, bedY }: { tier: ResolvedTier; bedY: number }) {
  const flames = useRef<(Mesh | null)[]>([])
  const light = useRef<PointLight>(null)
  const { geometries, material } = useMemo(() => {
    const map = flameTexture(YAJNA.palette.flameCore, YAJNA.palette.flame)
    return {
      geometries: YAJNA.flames.map(([, , r, h]) => flameGeometry(r, h)),
      material: authoredMaterial(tier, { color: '#000000', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: YAJNA.flameEmissive, roughness: 1 }) as MeshStandardMaterial,
    }
  }, [tier])
  useEffect(() => () => {
    geometries.forEach((g) => g.dispose())
    material.emissiveMap?.dispose()
    material.dispose()
  }, [geometries, material])

  useFrame(({ clock }) => {
    const { hit, frac } = fireState()
    const t = clock.elapsedTime * L.flickerHz
    const flicker = 1 + L.flickerAmount * Math.sin(t) * Math.sin(t * 0.43 + 1.3)
    material.emissive.copy(hit ? HIT : WHITE)
    flames.current.forEach((f, i) => {
      if (!f) return
      const w = Math.sin(t * (1.1 + i * 0.17) + i * 2.1) * 0.12
      f.scale.set(frac * (1 - w * 0.5), frac * (1 + w), frac * (1 - w * 0.5))
    })
    if (light.current) {
      light.current.color.set(hit ? L.hit : L.color)
      light.current.intensity = (hit ? L.hitIntensity : L.intensity * (0.4 + 0.6 * frac)) * flicker
    }
  })

  return (
    <group name="altar-fire">
      {YAJNA.flames.map(([x, z], i) => (
        <mesh key={i} ref={(m) => void (flames.current[i] = m)} geometry={geometries[i]} material={material} position={[x, bedY, z]} />
      ))}
      <pointLight ref={light} position={[0, L.y, 0]} color={L.color} intensity={L.intensity} distance={L.distance} decay={2} />
    </group>
  )
}

/** Sparks off the fire: each rises at its own speed, sways, dims with height, and restarts at the bed. */
function Embers({ bedY }: { bedY: number }) {
  const { count, rise, top, size } = YAJNA.embers
  const { points, speed } = useMemo(() => {
    const rand = seeded(9)
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const speed = Float32Array.from({ length: count }, () => rise[0] + rand() * (rise[1] - rise[0]))
    for (let i = 0; i < count; i += 1) pos.set([(rand() - 0.5) * 1.2, bedY + rand() * (top - bedY), (rand() - 0.5) * 1.2], i * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(pos, 3))
    geometry.setAttribute('color', new BufferAttribute(col, 3))
    const glow = canvasTexture(32, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, s, s)
    })
    const material = new PointsMaterial({ size, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending })
    return { points: new Points(geometry, material), speed }
  }, [count, rise, top, size, bedY])
  useEffect(() => () => {
    points.geometry.dispose()
    ;(points.material as PointsMaterial).map?.dispose()
    ;(points.material as PointsMaterial).dispose()
  }, [points])

  const ref = useRef<Points>(null)
  useFrame(({ clock }, delta) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as BufferAttribute
    const col = ref.current.geometry.attributes.color as BufferAttribute
    const t = clock.elapsedTime
    const alive = fireState().frac
    for (let i = 0; i < count; i += 1) {
      let y = pos.getY(i) + speed[i] * delta
      let x = pos.getX(i) + Math.sin(t * 1.7 + i) * 0.25 * delta
      let z = pos.getZ(i) + Math.cos(t * 1.3 + i * 0.7) * 0.25 * delta
      if (y > top) [x, y, z] = [Math.sin(t * 12.9 + i) * 0.55, bedY, Math.cos(t * 7.3 + i) * 0.55]
      const k = Math.max(0, 1 - (y - bedY) / (top - bedY)) * alive
      pos.setXYZ(i, x, y, z)
      col.setXYZ(i, k, k * 0.45, k * 0.1)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
  })
  return <primitive ref={ref} object={points} />
}

export function YajnaDressing({ tier }: { tier: ResolvedTier }) {
  const yajna = useMemo(() => buildYajna(tier), [tier])
  useEffect(() => () => yajna.dispose(), [yajna])
  return (
    <>
      <primitive object={yajna.group} />
      <AltarFire tier={tier} bedY={yajna.bedY} />
      {tier === 'high' && <Embers bedY={yajna.bedY} />}
    </>
  )
}
