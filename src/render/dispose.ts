// three.js frees nothing on unmount. Every scene calls this on its root in its cleanup.
import type { Material, Object3D, Texture } from 'three'

export interface DisposeOptions {
  /** False when textures are shared with a cached prototype (characters). Default true. */
  textures?: boolean
}

function disposeMaterial(material: Material, textures: boolean): void {
  if (textures) {
    for (const value of Object.values(material)) {
      if (value && typeof value === 'object' && 'isTexture' in value && (value as Texture).isTexture) {
        ;(value as Texture).dispose()
      }
    }
  }
  material.dispose()
}

/** Dispose geometries, materials, and (by default) textures under root, then detach it. */
export function disposeTree(root: Object3D, opts: DisposeOptions = {}): void {
  const textures = opts.textures ?? true
  root.traverse((node) => {
    const mesh = node as { geometry?: { dispose(): void }; material?: Material | Material[]; skeleton?: { dispose(): void } }
    mesh.geometry?.dispose()
    mesh.skeleton?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach((m) => disposeMaterial(m, textures))
    else if (mesh.material) disposeMaterial(mesh.material, textures)
  })
  root.removeFromParent()
}
