// High tier post-processing: UnrealBloom, a warm grade and Vignette via EffectComposer.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { HalfFloatType, Vector2, WebGLRenderTarget, type Camera, type Scene, type WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js'
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js'
import { POST } from '@data/scenery'

/** MSAA samples on the composer's scene target. */
const MSAA_SAMPLES = 4

interface ComposerBundle {
  composer: EffectComposer
  bloom: UnrealBloomPass
  vignette: ShaderPass
  grade: ShaderPass
  output: OutputPass
}

function createComposer(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  width: number,
  height: number,
): ComposerBundle {
  // The composer's default targets have no MSAA, so the canvas's antialias never reached the screen and every edge on
  // high was aliased. HalfFloat keeps the linear HDR the bloom threshold reads.
  const pr = gl.getPixelRatio()
  const composer = new EffectComposer(gl, new WebGLRenderTarget(width * pr, height * pr, { type: HalfFloatType, samples: MSAA_SAMPLES }))
  const renderPass = new RenderPass(scene, camera)
  const bloom = new UnrealBloomPass(
    new Vector2(width, height),
    POST.BLOOM_STRENGTH,
    POST.BLOOM_RADIUS,
    POST.BLOOM_THRESHOLD,
  )
  const vignette = new ShaderPass(VignetteShader)
  vignette.uniforms['offset'].value = POST.VIGNETTE_OFFSET
  vignette.uniforms['darkness'].value = POST.VIGNETTE_DARKNESS
  const output = new OutputPass()
  const grade = new ShaderPass(ColorCorrectionShader)
  grade.uniforms['mulRGB'].value.set(...POST.GRADE_MUL)
  grade.uniforms['powRGB'].value.set(...POST.GRADE_POW)

  // Bloom reads the linear HDR target, so a threshold above 1 catches emissives only. The
  // vignette runs after OutputPass on display colours: before it, darkening happened in linear
  // light and a darkness above 1 went negative (purple/teal fringes under ACES).
  composer.addPass(renderPass)
  composer.addPass(bloom)
  composer.addPass(output)
  composer.addPass(grade)
  composer.addPass(vignette)
  return { composer, bloom, vignette, grade, output }
}

export function PostProcessing() {
  const { gl, scene, camera, size } = useThree()

  const bundle = useMemo(
    () => createComposer(gl, scene, camera, size.width, size.height),
    [gl, scene, camera, size.width, size.height],
  )

  useEffect(() => {
    bundle.composer.setPixelRatio(gl.getPixelRatio())
    bundle.composer.setSize(size.width, size.height)
  }, [bundle, gl, size.width, size.height])

  useEffect(() => {
    return () => {
      bundle.bloom.dispose()
      bundle.vignette.dispose()
      bundle.grade.dispose()
      bundle.output.dispose()
      bundle.composer.dispose()
    }
  }, [bundle])

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
    bundle.composer.render(delta)
  }, 1)

  return null
}
