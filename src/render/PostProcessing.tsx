// High tier post-processing: UnrealBloom and Vignette via EffectComposer.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Vector2, type Camera, type Scene, type WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js'
import { BALANCE } from '@data/balance'

interface ComposerBundle {
  composer: EffectComposer
  bloom: UnrealBloomPass
  vignette: ShaderPass
  output: OutputPass
}

function createComposer(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  width: number,
  height: number,
): ComposerBundle {
  const composer = new EffectComposer(gl)
  const renderPass = new RenderPass(scene, camera)
  const bloom = new UnrealBloomPass(
    new Vector2(width, height),
    BALANCE.render.BLOOM_STRENGTH,
    BALANCE.render.BLOOM_RADIUS,
    BALANCE.render.BLOOM_THRESHOLD,
  )
  const vignette = new ShaderPass(VignetteShader)
  vignette.uniforms['offset'].value = BALANCE.render.VIGNETTE_OFFSET
  vignette.uniforms['darkness'].value = BALANCE.render.VIGNETTE_DARKNESS
  const output = new OutputPass()

  composer.addPass(renderPass)
  composer.addPass(bloom)
  composer.addPass(vignette)
  composer.addPass(output)
  return { composer, bloom, vignette, output }
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
      bundle.output.dispose()
      bundle.composer.dispose()
    }
  }, [bundle])

  useFrame((_, delta) => {
    bundle.composer.render(delta)
  }, 1)

  return null
}
