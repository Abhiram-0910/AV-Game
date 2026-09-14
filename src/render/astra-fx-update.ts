// Per-frame placement of the astra's sequence objects (render/astra-fx.ts): clouds gathering over the strike, light and
// sparks building at the bow, the bolt, shockwave, dust ring and Manavastra's gale, and the storm on the sky (exposure,
// fog and, on low, the canvas's CSS sky; on high the post chain's grade and vignette through postStorm).
import { type Camera, Color, Euler, Fog, Matrix4, Quaternion, type Scene, Vector3, type WebGLRenderer } from 'three'
import { BALANCE } from '@data/balance'
import { ASTRA_LOOK as FX, type LevelLook } from '@data/scenery'
import type { StrikeView } from '@systems/astra/sequence'
import { type AstraFx, type AstraKind, astraColor } from './astra-fx'
import { postStorm } from './post-storm'

export interface CastInfo {
  kind: AstraKind
  /** At Rama's bow. */
  origin: Vector3
  /** Agneyastra's strike point; Manavastra's is the origin. */
  impact: Vector3
  yaw: number
}

const RANGE = BALANCE.astra.manavastra.CONE_RANGE * FX.GALE_OVERSHOOT
const HALF_CONE = (BALANCE.astra.manavastra.CONE_ANGLE_DEG * Math.PI) / 360
const m4 = new Matrix4()
const p = new Vector3()
const s = new Vector3()
const q = new Quaternion()
const e = new Euler(0, 0, 0, 'YXZ')
const c1 = new Color()
const c2 = new Color()
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => 1 - (1 - t) ** 3

/** Stable per-instance random in 0..1: instance i, channel k. */
function rnd(i: number, k: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function updateClouds(fx: AstraFx, storm: number, centre: Vector3, camera: Camera): void {
  fx.clouds.visible = storm > 0.001
  if (!fx.clouds.visible) return
  fx.mats.cloud.opacity = 0.92 * storm
  const gather = lerp(FX.CLOUD_GATHER_FROM, 1, easeOut(storm))
  for (let i = 0; i < fx.clouds.count; i += 1) {
    const a = rnd(i, 1) * Math.PI * 2
    const r = lerp(FX.CLOUD_RADIUS[0], FX.CLOUD_RADIUS[1], rnd(i, 2)) * gather
    const size = lerp(FX.CLOUD_SIZE[0], FX.CLOUD_SIZE[1], rnd(i, 3))
    p.set(centre.x + Math.cos(a) * r, lerp(FX.CLOUD_HEIGHT[0], FX.CLOUD_HEIGHT[1], rnd(i, 4)), centre.z + Math.sin(a) * r)
    fx.clouds.setMatrixAt(i, m4.compose(p, camera.quaternion, s.set(size, size * 0.6, 1)))
  }
  fx.clouds.instanceMatrix.needsUpdate = true
}

/** `charge` 0..1 of the hold; sparks stream in toward the bow and the glow (and on high a point light) swells. */
export function updateCharge(fx: AstraFx, charge: number, bow: Vector3, kind: AstraKind, time: number, camera: Camera): void {
  const on = charge > 0
  fx.glow.visible = fx.sparks.visible = on
  if (fx.light) fx.light.intensity = on ? FX.LIGHT.CHARGE * charge : 0
  if (!on) return
  // The first try (scale up to 2.2 m at full HDR) bloomed into a white blob that hid Rama: kept small and under ~2× HDR.
  astraColor(kind, fx.mats.glow.color).multiplyScalar(0.1 + 0.3 * charge)
  fx.mats.spark.color.copy(fx.mats.glow.color)
  fx.glow.position.copy(bow)
  fx.glow.quaternion.copy(camera.quaternion)
  fx.glow.scale.setScalar(0.25 + 0.7 * charge + 0.06 * Math.sin(time * 18))
  if (fx.light) {
    fx.light.position.copy(bow)
    astraColor(kind, fx.light.color).multiplyScalar(0.25)
  }
  for (let i = 0; i < fx.sparks.count; i += 1) {
    const phase = (time * 1.1 + rnd(i, 5)) % 1
    const d = (1 - phase) * (1.2 + 1.6 * charge)
    const theta = rnd(i, 6) * Math.PI * 2
    const y = rnd(i, 7) * 2 - 1
    const h = Math.sqrt(1 - y * y)
    p.set(bow.x + Math.cos(theta) * h * d, bow.y + y * d, bow.z + Math.sin(theta) * h * d)
    fx.sparks.setMatrixAt(i, m4.compose(p, camera.quaternion, s.setScalar(0.6 + phase)))
  }
  fx.sparks.instanceMatrix.needsUpdate = true
}

export function updateStrike(fx: AstraFx, v: StrikeView, cast: CastInfo | null, camera: Camera): void {
  // Agneyastra only: Manavastra's wind column read as two glass slabs on the 4050 (gpu-astra1-l5-manavastra-3-strike-1);
  // its gale carries the strike.
  fx.bolt.visible = v.bolt !== null && cast?.kind === 'agneyastra'
  if (v.bolt !== null) fx.mats.bolt.opacity = (1 - v.bolt) * (Math.sin(v.bolt * 70) > 0 ? 1 : 0.45)
  updateShock(fx, v.shock, cast)
  updateDust(fx, v.dust, cast, camera)
  updateGale(fx, v.gale, cast)
  if (fx.light && cast && v.flash > 0) {
    fx.light.position.copy(cast.impact)
    fx.light.position.y += 2
    fx.light.intensity = Math.max(fx.light.intensity, FX.LIGHT.FLASH * v.flash)
    astraColor(cast.kind, fx.light.color).multiplyScalar(0.25)
  }
}

function updateShock(fx: AstraFx, t: number | null, cast: CastInfo | null): void {
  const agneya = cast?.kind === 'agneyastra'
  fx.shock.visible = t !== null && agneya
  fx.arc.visible = t !== null && cast !== null && !agneya
  if (t === null || !cast) return
  fx.mats.shock.opacity = (1 - t) ** 1.5
  // Full HDR saturated the ring to white under bloom; at 0.4× it keeps the astra's hue.
  astraColor(cast.kind, fx.mats.shock.color).multiplyScalar(0.4)
  if (agneya) {
    fx.shock.position.set(cast.impact.x, 0.08, cast.impact.z)
    fx.shock.scale.setScalar(0.5 + FX.SHOCK_RADIUS * easeOut(t))
  } else {
    fx.arc.position.set(cast.origin.x, 0.08, cast.origin.z)
    fx.arc.rotation.y = cast.yaw
    fx.arc.scale.setScalar(0.5 + RANGE * easeOut(t))
  }
}

/** A ring of dust thrown out from the strike: all round for Agneyastra, along the cone for Manavastra. */
function updateDust(fx: AstraFx, t: number | null, cast: CastInfo | null, camera: Camera): void {
  fx.dust.visible = t !== null && cast !== null
  if (t === null || !cast) return
  fx.mats.dust.opacity = 0.75 * (1 - t)
  const agneya = cast.kind === 'agneyastra'
  const centre = agneya ? cast.impact : cast.origin
  const reach = (agneya ? FX.SHOCK_RADIUS * 0.8 : RANGE) * easeOut(t)
  for (let i = 0; i < fx.dust.count; i += 1) {
    const a = agneya ? rnd(i, 8) * Math.PI * 2 : cast.yaw + (rnd(i, 8) * 2 - 1) * HALF_CONE
    const r = reach * lerp(0.55, 1, rnd(i, 9))
    p.set(centre.x + Math.sin(a) * r, 0.3 + 2.2 * t * rnd(i, 10), centre.z + Math.cos(a) * r)
    fx.dust.setMatrixAt(i, m4.compose(p, camera.quaternion, s.setScalar((0.8 + 3 * t) * lerp(0.6, 1.3, rnd(i, 11)))))
  }
  fx.dust.instanceMatrix.needsUpdate = true
}

/** Manavastra's wind: streaks swirling out through the cone, a little past its reach. */
function updateGale(fx: AstraFx, t: number | null, cast: CastInfo | null): void {
  fx.gale.visible = t !== null && cast?.kind === 'manavastra'
  if (t === null || !cast || !fx.gale.visible) return
  // Streaks born 0.6 m from Rama at full opacity filled the camera with white on the first frame (gpu-astra2-l5-manavastra-
  // 3-strike-0): they start 2 m out, fade in over the first tenth, at half HDR.
  fx.mats.gale.opacity = Math.min(1, t * 10) * (1 - t * t)
  astraColor('manavastra', fx.mats.gale.color).multiplyScalar(0.5)
  for (let i = 0; i < fx.gale.count; i += 1) {
    const u = Math.min(1, t * lerp(0.8, 1.4, rnd(i, 12)))
    const a = cast.yaw + (rnd(i, 13) * 2 - 1) * HALF_CONE + (rnd(i, 14) - 0.5) * 2 * FX.GALE_TURNS * Math.PI * 2 * u
    const r = RANGE * u * lerp(0.35, 1, rnd(i, 15)) + 2
    p.set(cast.origin.x + Math.sin(a) * r, 0.25 + 2.4 * rnd(i, 16) + Math.sin(u * 9 + i) * 0.35, cast.origin.z + Math.cos(a) * r)
    q.setFromEuler(e.set(-1.1, a - Math.PI / 2, 0))
    fx.gale.setMatrixAt(i, m4.compose(p, q, s.set(lerp(0.7, 1.6, rnd(i, 17)) * (1 + u), 1, 1)))
  }
  fx.gale.instanceMatrix.needsUpdate = true
}

/** The storm on the sky. At storm 0 and no flash this puts back exactly what render/Atmosphere set. */
export function applySky(gl: WebGLRenderer, scene: Scene, look: LevelLook, storm: number, flash: number, high: boolean): void {
  gl.toneMappingExposure = look.exposure * (lerp(1, FX.STORM_EXPOSURE, storm) + FX.FLASH_EXPOSURE * flash)
  if (scene.fog instanceof Fog) scene.fog.color.set(look.sky.horizon).lerp(c2.set(FX.STORM_FOG), storm)
  if (high) {
    postStorm.storm = storm
    postStorm.flash = flash
    return
  }
  const zenith = c1.set(look.sky.zenith).lerp(c2.set(FX.STORM_ZENITH), storm).getStyle()
  const horizon = c1.set(look.sky.horizon).lerp(c2.set(FX.STORM_HORIZON), storm).getStyle()
  gl.domElement.style.background = `linear-gradient(${zenith} 0%, ${horizon} 22%)`
}
