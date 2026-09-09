// One GLTFLoader with Draco + KTX2, one promise per asset id, one shared clip library.
import type { AnimationClip, SkinnedMesh, WebGLRenderer } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { type AssetId, SKELETON } from '@data/scenery'
import { assetUrl } from './manifest'
import { disposeTree } from './dispose'

let loader: GLTFLoader | null = null
const cache = new Map<AssetId, Promise<GLTF>>()
let clipLibrary: Promise<AnimationClip[]> | null = null

export class SkeletonMismatchError extends Error {
  constructor(name: string, joints: number) {
    super(`${name}: expected ${SKELETON.JOINT_COUNT} joints, got ${joints}. Every humanoid must share the one skeleton.`)
    this.name = 'SkeletonMismatchError'
  }
}

/** Call once with the live renderer so KTX2 can pick a transcode target. */
export function initLoaders(renderer: WebGLRenderer): void {
  if (loader) return
  const draco = new DRACOLoader().setDecoderPath('/vendor/draco/')
  const ktx2 = new KTX2Loader().setTranscoderPath('/vendor/basis/').detectSupport(renderer)
  loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2)
}

export function loadGltf(id: AssetId): Promise<GLTF> {
  if (!loader) throw new Error('initLoaders(renderer) must run before loadGltf')
  const hit = cache.get(id)
  if (hit) return hit
  const p = loader.loadAsync(assetUrl(id))
  cache.set(id, p)
  return p
}

/** UAL1 + UAL2 merged by clip name. Duplicates (A_TPose) are skipped, never thrown on. */
export function loadClips(): Promise<AnimationClip[]> {
  if (clipLibrary) return clipLibrary
  clipLibrary = Promise.all([loadGltf('ual1'), loadGltf('ual2')]).then((gltfs) => {
    const seen = new Set<string>()
    const clips: AnimationClip[] = []
    for (const g of gltfs) {
      for (const clip of g.animations) {
        if (seen.has(clip.name)) continue
        seen.add(clip.name)
        clips.push(clip)
      }
      // The mannequin that carries the clips is never rendered.
      disposeTree(g.scene)
    }
    return clips
  })
  return clipLibrary
}

export function assertSkeleton(mesh: SkinnedMesh, name: string): void {
  const joints = mesh.skeleton.bones.length
  if (joints !== SKELETON.JOINT_COUNT) throw new SkeletonMismatchError(name, joints)
}

/** Drop cached prototypes (scene tree, materials, textures). Characters and clips stay cached across levels. */
export function evictAssets(ids: readonly AssetId[]): void {
  for (const id of ids) {
    const p = cache.get(id)
    if (!p) continue
    cache.delete(id)
    p.then((g) => disposeTree(g.scene)).catch(() => undefined)
  }
}

/** Tests only. */
export function resetLoaders(): void {
  loader = null
  cache.clear()
  clipLibrary = null
}
