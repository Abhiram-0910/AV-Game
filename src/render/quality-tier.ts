// Manual override → persisted benchmark → renderer string + a 60-frame benchmark, once per machine.
import { BALANCE } from '@data/balance'
import type { BenchmarkTier, Save } from '@core/save'
import { DirectionalLight, DoubleSide, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, TorusKnotGeometry, Vector2, type WebGLRenderer } from 'three'
import type { ResolvedTier } from './manifest'

const SOFTWARE = /swiftshader|llvmpipe|software|mesa offscreen/i
const WEAK_GPU = /intel\(r\) (hd|uhd) graphics/i

/** Unmasked renderer string when the extension exists, else the masked one. */
export function rendererName(renderer: WebGLRenderer): string {
  const gl = renderer.getContext()
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
}

export function isSoftwareRenderer(name: string): boolean {
  return SOFTWARE.test(name)
}

/** The high tier's load in miniature: a BENCH_TRIANGLES Standard-shaded knot behind BENCH_LAYERS full-screen translucent
 * Standard quads (overdraw), at the high tier's pixel ratio on the real canvas. */
function benchScene(renderer: WebGLRenderer) {
  const { BENCH_KNOT: knot, BENCH_CAMERA: cam, BENCH_TRIANGLES, BENCH_LAYERS } = BALANCE.render
  const size = renderer.getSize(new Vector2())
  const scene = new Scene()
  const camera = new PerspectiveCamera(cam.FOV, size.x / Math.max(1, size.y), cam.NEAR, cam.FAR)
  camera.position.z = cam.DISTANCE
  scene.add(new DirectionalLight('#ffffff', 2))
  // TorusKnotGeometry triangles = tubular × radial × 2, so tubular = target / (radial × 2).
  const knotGeo = new TorusKnotGeometry(knot.RADIUS, knot.TUBE, Math.round(BENCH_TRIANGLES / (knot.RADIAL * 2)), knot.RADIAL)
  const quad = new PlaneGeometry(cam.DISTANCE * 4, cam.DISTANCE * 4)
  const solid = new MeshStandardMaterial({ roughness: 0.5 })
  const veil = new MeshStandardMaterial({ transparent: true, opacity: 0.2, depthWrite: false, side: DoubleSide })
  const spin = new Mesh(knotGeo, solid)
  scene.add(spin)
  for (let i = 0; i < BENCH_LAYERS; i += 1) scene.add(new Mesh(quad, veil).translateZ(cam.DISTANCE * 0.5 - i * 0.01))
  const dispose = () => [knotGeo, quad, solid, veil].forEach((d) => d.dispose())
  return { scene, camera, spin, dispose }
}

/** Mean interval between delivered frames (rAF timestamps) while rendering the bench scene, after BENCH_WARMUP untimed
 * frames (shader compile). Chrome paces rAF to GPU completion, so a GPU that cannot keep up falls off vsync; the load is
 * heavy enough that a weak GPU does even on a 60 Hz screen. gl.finish() timing does not see GPU time on ANGLE/D3D11
 * (measured 2026-09-14: 0.6 ms on an Intel UHD delivering 13 fps), so it is not used. */
export function benchmark(renderer: WebGLRenderer): Promise<number> {
  const { BENCH_WARMUP, BENCH_FRAMES, BENCH_KNOT, PIXEL_RATIO_HIGH_MAX } = BALANCE.render
  const ratio = renderer.getPixelRatio()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_HIGH_MAX))
  const bench = benchScene(renderer)
  return new Promise((resolve) => {
    let frames = 0
    let start = 0
    const frame = (now: number) => {
      if (frames === BENCH_WARMUP) start = now
      bench.spin.rotation.y += BENCH_KNOT.SPIN_RAD_PER_FRAME
      renderer.render(bench.scene, bench.camera)
      frames += 1
      if (frames <= BENCH_WARMUP + BENCH_FRAMES) return requestAnimationFrame(frame)
      bench.dispose()
      renderer.setPixelRatio(ratio)
      resolve((now - start) / BENCH_FRAMES)
    }
    requestAnimationFrame(frame)
  })
}

/** Why the tier is what it is — shown in the perf overlay and Settings, so nobody judges the wrong renderer again. */
export type TierReason = 'override' | 'saved' | 'software' | 'weakGpu' | 'slow' | 'fast'

export interface TierDecision {
  tier: ResolvedTier
  reason: TierReason
  /** Non-null only when the benchmark ran this boot; the caller persists it. */
  benchmarked: BenchmarkTier
  renderer: string
  /** Mean benchmark frame cost when it ran this boot (ms), for the overlay and tools/bench-gpu.mjs. */
  benchMs?: number
}

export async function resolveTier(save: Save, renderer: WebGLRenderer): Promise<TierDecision> {
  const name = rendererName(renderer)
  if (save.settings.qualityTier !== 'auto') return { tier: save.settings.qualityTier, reason: 'override', benchmarked: null, renderer: name }
  // A saved result holds only on the renderer it was measured on: an Optimus laptop's browser can move from the iGPU to the dGPU.
  if (save.benchmarkTier && save.benchmarkRenderer === name) return { tier: save.benchmarkTier, reason: 'saved', benchmarked: null, renderer: name }
  if (isSoftwareRenderer(name)) return { tier: 'low', reason: 'software', benchmarked: 'low', renderer: name }
  if (WEAK_GPU.test(name)) return { tier: 'low', reason: 'weakGpu', benchmarked: 'low', renderer: name }
  const benchMs = await benchmark(renderer)
  const fast = benchMs <= BALANCE.render.BENCH_LOW_MS
  return { tier: fast ? 'high' : 'low', reason: fast ? 'fast' : 'slow', benchmarked: fast ? 'high' : 'low', renderer: name, benchMs }
}
