// Level 4's straw man (levels.ts strikeDummy). Registers in world.dummies so a sword slash can strike it
// (systems/combat-rules.ts), and rocks on its post when struck, leaning away from Rama first.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { Vec3 } from '@data/levels'
import { RANGE } from '@data/scenery'
import { disposeTree } from '@render/dispose'
import type { ResolvedTier } from '@render/manifest'
import { buildStrawDummy } from '@render/straw-dummy'
import { world } from '@systems/world'

const ROCK = RANGE.dummy

export function StrikeDummy({ at, tier }: { at: Vec3; tier: ResolvedTier }) {
  const built = useMemo(() => buildStrawDummy(tier), [tier])
  const pivot = useRef<Group>(null)
  const dummy = useMemo(() => ({ x: at[0], z: at[2], struckTick: -1 }), [at])
  const rock = useRef({ tick: -1, t: 0, ax: 0, az: 0 })

  useEffect(() => {
    world.dummies.push(dummy)
    return () => {
      world.dummies = world.dummies.filter((d) => d !== dummy)
    }
  }, [dummy])
  useEffect(
    () => () => {
      disposeTree(built.group, { textures: false })
      built.textures.forEach((t) => t.dispose())
    },
    [built],
  )

  useFrame((_, delta) => {
    const r = rock.current
    const g = pivot.current
    if (!g) return
    if (dummy.struckTick !== r.tick) {
      // Tip the top along the blow: rotate about the ground axis perpendicular to Rama → dummy.
      const dx = dummy.x - world.player.x
      const dz = dummy.z - world.player.z
      const len = Math.hypot(dx, dz) || 1
      Object.assign(r, { tick: dummy.struckTick, t: 0, ax: dz / len, az: -dx / len })
    }
    if (r.tick < 0 || r.t > ROCK.decay * 8) return
    r.t += delta
    const lean = ROCK.lean * Math.exp(-r.t / ROCK.decay) * Math.sin(r.t * ROCK.rate)
    g.rotation.set(lean * r.ax, 0, lean * r.az)
  })

  return (
    <group ref={pivot} position={[at[0], at[1], at[2]]}>
      <primitive object={built.group} />
    </group>
  )
}
