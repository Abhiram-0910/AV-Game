// The astra's staged sequence and its aim, driven every frame from world state and the cast event. While a castable
// charge is held the sky darkens and clouds gather and light builds at the bow; on release the strike lands
// (Agneyastra: a bolt at the aim point; Manavastra: a gale swirling out through the cone), a shockwave and
// dust ring spread, and the sky clears. Timing: systems/astra/sequence.ts. Objects: render/astra-fx*.ts, astra-aim.ts.
import { type RootState, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { BALANCE } from '@data/balance'
import { ASTRA_LOOK as FX, type LevelLook } from '@data/scenery'
import { gameStore } from '@core/game-state'
import { playAudio, stopAudio } from '@systems/audio'
import { stepStorm, strikeView } from '@systems/astra/sequence'
import { canCastAstra } from '@systems/astra/step'
import { type AstraVfxEvent, astraView, subscribeAstraVfx } from '@systems/astra/vfx-state'
import { lerpAngle } from '@systems/locomotion/kinematic'
import { world } from '@systems/world'
import { type AimInput, type AstraAimMarks, createAstraAim, updateAstraAim } from '@render/astra-aim'
import { type AstraFx, astraColor, createAstraFx, rebuildBolt } from '@render/astra-fx'
import { applySky, type CastInfo, updateCharge, updateClouds, updateStrike } from '@render/astra-fx-update'
import type { ResolvedTier } from '@render/manifest'

interface Sequence {
  clock: number
  storm: number
  cast: (CastInfo & { at: number }) | null
  chargeSound: number
  /** The sky has been changed and must be put back once the storm is over. */
  dirty: boolean
}

/** Seconds after a strike when nothing of it is left to draw. */
const CAST_END_SEC = FX.HOLD_SEC + FX.CLEAR_SEC + 0.5
const bow = new Vector3()
const centre = new Vector3()

function stopCharge(s: Sequence): void {
  if (s.chargeSound) stopAudio(s.chargeSound)
  s.chargeSound = 0
}

function onCast(e: AstraVfxEvent, fx: AstraFx, s: Sequence): void {
  const origin = new Vector3(...e.origin)
  const agneya = e.type === 'agneyastra'
  const impact = agneya ? new Vector3(e.target[0], Math.max(0, e.target[1]), e.target[2]) : origin.clone()
  s.cast = { kind: e.type, origin, impact, yaw: e.yaw, at: s.clock }
  // Agneyastra's bolt falls from the clouds onto the strike (gold at 0.6× HDR so bloom keeps the hue); Manavastra has none.
  if (agneya) {
    const from = new Vector3(impact.x + (((e.id * 37) % 11) - 5), FX.BOLT_HEIGHT, impact.z + (((e.id * 53) % 11) - 5))
    rebuildBolt(fx, from, impact, FX.BOLT_WIDTH, e.id * 7919 + 11)
    astraColor(e.type, fx.mats.bolt.color).multiplyScalar(0.6)
  }
  stopCharge(s)
  playAudio(agneya ? 'thunder' : 'gale')
}

/** Rama's bow, interpolated like the player model. */
function bowPosition(out: Vector3): number {
  const p = world.player
  const t = world.alpha
  const yaw = lerpAngle(p.prevYaw, p.yaw, t)
  const { MUZZLE_FORWARD: f, MUZZLE_HEIGHT: h } = BALANCE.archeryAim
  out.set(p.prevX + (p.x - p.prevX) * t + Math.sin(yaw) * f, p.prevY + (p.y - p.prevY) * t + h, p.prevZ + (p.z - p.prevZ) * t + Math.cos(yaw) * f)
  return yaw
}

/** The clouds gather over where the strike will land: the cast's, the aim's, or ahead of Rama. */
function cloudCentre(s: Sequence, yaw: number, out: Vector3): void {
  const aheadBy = BALANCE.astra.manavastra.CONE_RANGE * 0.7
  if (s.cast?.kind === 'agneyastra') out.copy(s.cast.impact)
  else if (s.cast) out.set(s.cast.origin.x + Math.sin(s.cast.yaw) * aheadBy, 0, s.cast.origin.z + Math.cos(s.cast.yaw) * aheadBy)
  else if (world.astraAim) out.fromArray(world.astraAim.point)
  else out.set(bow.x + Math.sin(yaw) * aheadBy * 2, 0, bow.z + Math.cos(yaw) * aheadBy * 2)
}

function aimInput(manava: boolean, castable: boolean, charging: boolean, yaw: number, time: number): AimInput {
  const p = world.player
  return {
    agneya: !manava && charging ? world.astraAim : null,
    manava: manava && castable && world.astraReady ? { x: bow.x, y: p.y, z: bow.z, yaw, charging, enemies: world.astraCone } : null,
    time,
  }
}

function frame(st: RootState, delta: number, fx: AstraFx, marks: AstraAimMarks, s: Sequence, look: LevelLook, high: boolean): void {
  s.clock += delta
  const manava = gameStore.getState().selectedAstra === 'manavastra'
  const castable = canCastAstra()
  const charging = world.astraCharge.drawing && castable
  if (charging && !s.chargeSound) s.chargeSound = playAudio('astra_charge')
  if (!charging) stopCharge(s)
  const sinceCast = s.cast ? s.clock - s.cast.at : null
  s.storm = stepStorm(s.storm, delta, charging, sinceCast)
  const view = strikeView(sinceCast)
  const yaw = bowPosition(bow)
  cloudCentre(s, yaw, centre)
  updateClouds(fx, s.storm, centre, st.camera)
  updateCharge(fx, charging ? Math.min(1, world.astraCharge.ticks / BALANCE.astra.CHARGE_TICKS) : 0, bow, manava ? 'manavastra' : 'agneyastra', s.clock, st.camera)
  updateStrike(fx, view, s.cast, st.camera)
  updateAstraAim(marks, aimInput(manava, castable, charging, yaw, s.clock))
  const active = s.storm > 0 || view.flash > 0
  if (active || s.dirty) applySky(st.gl, st.scene, look, s.storm, view.flash, high)
  s.dirty = active
  astraView.shake = view.shake
  if (sinceCast !== null && sinceCast > CAST_END_SEC) s.cast = null
}

export function AstraVfx({ tier, look }: { tier: ResolvedTier; look: LevelLook }) {
  const get = useThree((st) => st.get)
  const fx = useMemo(() => createAstraFx(tier), [tier])
  const marks = useMemo(() => createAstraAim(), [])
  const seq = useRef<Sequence>({ clock: 0, storm: 0, cast: null, chargeSound: 0, dirty: false })

  useEffect(() => subscribeAstraVfx((e) => onCast(e, fx, seq.current)), [fx])
  useEffect(
    () => () => {
      const s = seq.current
      stopCharge(s)
      astraView.shake = 0
      if (s.dirty) applySky(get().gl, get().scene, look, 0, 0, tier === 'high')
      fx.dispose()
    },
    [fx, get, look, tier],
  )
  useEffect(() => () => marks.dispose(), [marks])
  useFrame((st, delta) => frame(st, delta, fx, marks, seq.current, look, tier === 'high'))

  return (
    <>
      <primitive object={fx.group} />
      <primitive object={marks.group} />
    </>
  )
}
