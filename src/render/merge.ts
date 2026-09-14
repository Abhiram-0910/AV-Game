// Static geometry that shares a material becomes one mesh: one draw call instead of dozens.
import { type BufferGeometry, Group, type Material, Matrix4, Mesh, type Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

interface Bucket {
  material: Material
  geometries: BufferGeometry[]
}

/** Replace root's static meshes with one merged Mesh per material. Skinned meshes are left alone. */
export function mergeByMaterial(root: Object3D): Group {
  root.updateMatrixWorld(true)
  const buckets = new Map<string, Bucket>()
  const consumed: Mesh[] = []
  root.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh || (mesh as { isSkinnedMesh?: boolean }).isSkinnedMesh || Array.isArray(mesh.material)) return
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
    const bucket = buckets.get(mesh.material.uuid) ?? { material: mesh.material, geometries: [] }
    bucket.geometries.push(geometry)
    buckets.set(mesh.material.uuid, bucket)
    consumed.push(mesh)
  })
  const group = new Group()
  group.name = `${root.name}-merged`
  for (const { material, geometries } of buckets.values()) {
    const merged = mergeGeometries(stripToCommon(matchIndexing(geometries)), false)
    if (!merged) {
      console.warn(`mergeByMaterial: could not merge ${geometries.length} geometries for material "${material.name}"`)
      continue
    }
    geometries.forEach((g) => g.dispose())
    const mesh = new Mesh(merged, material)
    mesh.matrixAutoUpdate = false
    mesh.matrix.copy(new Matrix4())
    group.add(mesh)
  }
  consumed.forEach((m) => {
    m.geometry.dispose()
    m.removeFromParent()
  })
  return group
}

/** mergeGeometries refuses a mix of indexed and non-indexed geometry (Extrude, RoundedBox and the polyhedra have no
 * index); de-index the rest of the bucket when any lacks one. */
function matchIndexing(geometries: BufferGeometry[]): BufferGeometry[] {
  if (geometries.every((g) => g.index) || geometries.every((g) => !g.index)) return geometries
  return geometries.map((g) => {
    if (!g.index) return g
    const flat = g.toNonIndexed()
    g.dispose()
    return flat
  })
}

/** mergeGeometries refuses mismatched attribute sets; keep only what every geometry has. */
function stripToCommon(geometries: BufferGeometry[]): BufferGeometry[] {
  const names = geometries.map((g) => new Set(Object.keys(g.attributes)))
  const common = [...names[0]].filter((n) => names.every((s) => s.has(n)))
  for (const g of geometries) {
    for (const name of Object.keys(g.attributes)) if (!common.includes(name)) g.deleteAttribute(name)
  }
  return geometries
}
