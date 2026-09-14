// High tier post-processing: GTAO (levels that ask for it), UnrealBloom, a warm grade and Vignette via EffectComposer.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, HalfFloatType, type Material, type Mesh, type Object3D, Vector2, WebGLRenderTarget, type Camera, type Scene, type WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js'
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js'
import { POST } from '@data/scenery'
import { postStorm } from './post-storm'

/** MSAA samples on the composer's scene target. */
const MSAA_SAMPLES = 4
const AO = POST.AO

function applyStorm(b: ComposerBundle): void {
  const s = postStorm.storm
  const [r, g, bl] = POST.GRADE_MUL
  const [sr, sg, sb] = POST.STORM.GRADE_MUL
  b.grade.uniforms['mulRGB'].value.set(r + (sr - r) * s, g + (sg - g) * s, bl + (sb - bl) * s)
  b.vignette.uniforms['darkness'].value = POST.VIGNETTE_DARKNESS + POST.STORM.VIGNETTE_ADD * s
  b.bloom.strength = POST.BLOOM_STRENGTH + POST.STORM.BLOOM_FLASH * postStorm.flash
}

interface ComposerBundle {
  composer: EffectComposer
  bloom: UnrealBloomPass
  vignette: ShaderPass
  grade: ShaderPass
  output: OutputPass
  gtao: GTAOPass | null
}

const skipsAo = (m: Material) => m.transparent || m.blending === AdditiveBlending || !m.depthWrite

/** GTAO's normal pass draws every mesh with an opaque override material and re-renders the shadow map.
 * ponytail: wraps GTAOPass's private _overrideVisibility/_restoreVisibility (three 0.186's runtime names; @types
 * spells them without the underscore). If an upgrade renames them, additive beams and arcs cast AO again and the
 * 4096 shadow map renders twice a frame: re-check on every three bump. */
function hideFromAo(gtao: GTAOPass, gl: WebGLRenderer): void {
  const pass = gtao as unknown as { _overrideVisibility(): void; _restoreVisibility(): void; _visibilityCache: Object3D[]; scene: Scene }
  const override = pass._overrideVisibility.bind(pass)
  const restore = pass._restoreVisibility.bind(pass)
  let autoUpdate = true
  pass._overrideVisibility = () => {
    override()
    pass.scene.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || !mesh.visible || ![mesh.material].flat().some(skipsAo)) return
      mesh.visible = false
      pass._visibilityCache.push(mesh)
    })
    autoUpdate = gl.shadowMap.autoUpdate
    gl.shadowMap.autoUpdate = false
  }
  pass._restoreVisibility = () => {
    restore()
    gl.shadowMap.autoUpdate = autoUpdate
  }
}

function createAo(gl: WebGLRenderer, scene: Scene, camera: Camera): GTAOPass {
  const gtao = new GTAOPass(scene, camera)
  gtao.output = GTAOPass.OUTPUT.Default
  gtao.blendIntensity = AO.BLEND
  gtao.updateGtaoMaterial({ radius: AO.RADIUS, distanceExponent: AO.DISTANCE_EXPONENT, thickness: AO.THICKNESS, scale: AO.SCALE, samples: AO.SAMPLES })
  // The composer sizes every pass to the full target; AO renders at a fraction of it. Wrapped before addPass,
  // which already calls setSize.
  const setSize = gtao.setSize.bind(gtao)
  gtao.setSize = (w: number, h: number) => setSize(Math.max(1, Math.round(w * AO.RESOLUTION)), Math.max(1, Math.round(h * AO.RESOLUTION)))
  hideFromAo(gtao, gl)
  return gtao
}

function createComposer(gl: WebGLRenderer, scene: Scene, camera: Camera, width: number, height: number, ao: boolean): ComposerBundle {
  // The composer's default targets have no MSAA, so the canvas's antialias never reached the screen and every edge on
  // high was aliased. HalfFloat keeps the linear HDR the bloom threshold reads.
  const pr = gl.getPixelRatio()
  const composer = new EffectComposer(gl, new WebGLRenderTarget(width * pr, height * pr, { type: HalfFloatType, samples: MSAA_SAMPLES }))
  const bloom = new UnrealBloomPass(new Vector2(width, height), POST.BLOOM_STRENGTH, POST.BLOOM_RADIUS, POST.BLOOM_THRESHOLD)
  const vignette = new ShaderPass(VignetteShader)
  vignette.uniforms['offset'].value = POST.VIGNETTE_OFFSET
  vignette.uniforms['darkness'].value = POST.VIGNETTE_DARKNESS
  const output = new OutputPass()
  const grade = new ShaderPass(ColorCorrectionShader)
  grade.uniforms['mulRGB'].value.set(...POST.GRADE_MUL)
  grade.uniforms['powRGB'].value.set(...POST.GRADE_POW)

  // AO darkens the linear scene before bloom. Bloom reads the linear HDR target, so a threshold above 1 catches
  // emissives only. The vignette runs after OutputPass on display colours: before it, darkening happened in linear
  // light and a darkness above 1 went negative (purple/teal fringes under ACES).
  composer.addPass(new RenderPass(scene, camera))
  const gtao = ao ? createAo(gl, scene, camera) : null
  if (gtao) composer.addPass(gtao)
  composer.addPass(bloom)
  composer.addPass(output)
  composer.addPass(grade)
  composer.addPass(vignette)
  return { composer, bloom, vignette, grade, output, gtao }
}

function disposeBundle(b: ComposerBundle): void {
  b.bloom.dispose()
  b.vignette.dispose()
  b.grade.dispose()
  b.output.dispose()
  // GTAOPass.dispose leaves these two materials behind; the composer is rebuilt on every resize.
  b.gtao?.dispose()
  b.gtao?.gtaoMaterial.dispose()
  b.gtao?.blendMaterial.dispose()
  b.composer.dispose()
}

/** `ao`: ground-truth ambient occlusion for this level (LevelLook.ao). */
export function PostProcessing({ ao }: { ao: boolean }) {
  const { gl, scene, camera, size } = useThree()

  const bundle = useMemo(() => createComposer(gl, scene, camera, size.width, size.height, ao), [gl, scene, camera, size.width, size.height, ao])

  useEffect(() => {
    bundle.composer.setPixelRatio(gl.getPixelRatio())
    bundle.composer.setSize(size.width, size.height)
  }, [bundle, gl, size.width, size.height])

  useEffect(() => () => disposeBundle(bundle), [bundle])

  // Each pass is its own renderer.render(); with autoReset the perf overlay would only ever see
  // the last fullscreen quad. Count the whole composed frame instead (post passes included).
  const get = useThree((s) => s.get)
  useEffect(() => {
    const { info } = get().gl
    info.autoReset = false
    return () => {
      info.autoReset = true
    }
  }, [get])

  useFrame((state, delta) => {
    state.gl.info.reset()
    applyStorm(bundle)
    bundle.composer.render(delta)
  }, 1)

  return null
}
