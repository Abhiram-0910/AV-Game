// Rama. Built by the factory, moved by the fixed loop, interpolated here, aimed procedurally.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { applyAimPose, collectAimBones } from '@systems/archery/aim-pose'
import { drawFraction } from '@systems/archery/draw'
import { lerpAngle } from '@systems/locomotion/kinematic'
import { world, worldStore } from '@systems/world'
import { BlobShadow } from '@render/blob-shadow'
import { buildCharacter, type BuiltCharacter } from '@render/character-factory'
import type { ResolvedTier } from '@render/manifest'

const aim = new Vector3()
const LOCO = BALANCE.locomotion

function useBuilt(tier: ResolvedTier, bow: boolean): BuiltCharacter | null {
  const [built, setBuilt] = useState<BuiltCharacter | null>(null)
  useEffect(() => {
    let live = true
    let instance: BuiltCharacter | null = null
    buildCharacter('rama', { tier, props: bow }).then((b) => {
      if (!live) return b.dispose()
      instance = b
      setBuilt(b)
      worldStore.getState().markLoaded()
    })
    return () => {
      live = false
      instance?.dispose()
    }
  }, [tier, bow])
  return built
}

function clipFor(speed: number): 'IDLE' | 'WALK' | 'JOG' {
  const s = Math.abs(speed)
  if (s < LOCO.IDLE_THRESHOLD) return 'IDLE'
  return s >= LOCO.JOG_THRESHOLD ? 'JOG' : 'WALK'
}

export function Player({ tier, bow }: { tier: ResolvedTier; bow: boolean }) {
  const built = useBuilt(tier, bow)
  const wrapper = useRef<Group>(null)
  const aimBones = useMemo(() => (built && bow ? collectAimBones(built.bones) : null), [built, bow])

  useFrame((_, delta) => {
    if (!built || !wrapper.current) return
    const p = world.player
    const t = world.alpha
    wrapper.current.position.set(p.prevX + (p.x - p.prevX) * t, p.prevY + (p.y - p.prevY) * t, p.prevZ + (p.z - p.prevZ) * t)
    wrapper.current.rotation.y = lerpAngle(p.prevYaw, p.yaw, t) + LOCO.MODEL_YAW_OFFSET
    if (world.tick < world.swordSlashUntilTick) built.controller.play('SWORD_A', { loop: false })
    else if (world.astraCharge.drawing) built.controller.play('CAST_LOOP')
    else built.controller.play(clipFor(p.speed), { speed: p.speed < 0 ? -1 : 1 })
    built.controller.update(delta)
    if (aimBones && world.aimBlend > 0) {
      wrapper.current.updateMatrixWorld(true)
      aim.set(world.aimDir[0], world.aimDir[1], world.aimDir[2])
      applyAimPose(aimBones, aim, drawFraction(world.draw), world.aimBlend, built.props.get('bow'))
    }
  })

  return (
    <group ref={wrapper} name="player">
      {built && <primitive object={built.root} />}
      <BlobShadow />
    </group>
  )
}
