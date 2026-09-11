// Manual override → persisted benchmark → renderer string + a 60-frame benchmark, once per machine.
import { BALANCE } from '@data/balance'
import type { BenchmarkTier, Save } from '@core/save'
import { Mesh, MeshLambertMaterial, PerspectiveCamera, Scene, TorusKnotGeometry, type WebGLRenderer } from 'three'
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

/** Mean frame time rendering a BENCH_TRIANGLES mesh for BENCH_FRAMES frames. */
export function benchmark(renderer: WebGLRenderer): Promise<number> {
  const { BENCH_KNOT: knot, BENCH_CAMERA: cam } = BALANCE.render
  const scene = new Scene()
  const camera = new PerspectiveCamera(cam.FOV, 1, cam.NEAR, cam.FAR)
  camera.position.z = cam.DISTANCE
  // TorusKnotGeometry triangles = tubular × radial × 2, so tubular = target / (radial × 2).
  const geometry = new TorusKnotGeometry(knot.RADIUS, knot.TUBE, Math.round(BALANCE.render.BENCH_TRIANGLES / (knot.RADIAL * 2)), knot.RADIAL)
  const material = new MeshLambertMaterial()
  const mesh = new Mesh(geometry, material)
  scene.add(mesh)
  return new Promise((resolve) => {
    let frames = 0
    let start = 0
    const frame = (now: number) => {
      if (frames === 0) start = now
      mesh.rotation.y += knot.SPIN_RAD_PER_FRAME
      renderer.render(scene, camera)
      frames += 1
      if (frames <= BALANCE.render.BENCH_FRAMES) return requestAnimationFrame(frame)
      geometry.dispose()
      material.dispose()
      resolve((now - start) / BALANCE.render.BENCH_FRAMES)
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
}

export async function resolveTier(save: Save, renderer: WebGLRenderer): Promise<TierDecision> {
  const name = rendererName(renderer)
  if (save.settings.qualityTier !== 'auto') return { tier: save.settings.qualityTier, reason: 'override', benchmarked: null, renderer: name }
  if (save.benchmarkTier) return { tier: save.benchmarkTier, reason: 'saved', benchmarked: null, renderer: name }
  const reason: TierReason = isSoftwareRenderer(name) ? 'software' : WEAK_GPU.test(name) ? 'weakGpu' : (await benchmark(renderer)) > BALANCE.render.BENCH_LOW_MS ? 'slow' : 'fast'
  const tier: ResolvedTier = reason === 'fast' ? 'high' : 'low'
  return { tier, reason, benchmarked: tier, renderer: name }
}
