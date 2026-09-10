// The only way a humanoid is built. One SkinnedMesh per character (the three source
// primitives plus the procedural garments merge with material groups), hair as a plain mesh
// on the Head bone, props on hands, tint + uniform scale from CHARACTER_SPECS. Never new body
// geometry per character — garments are generated, not authored, from render/garments.ts.
import { type Bone, BufferGeometry, FloatType, Group, Matrix4, Mesh, type Object3D, SkinnedMesh, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { BALANCE } from '@data/balance'
import { CHARACTER_SPECS, type CharacterId, type Hairstyle, type MeshKind, type PropKind } from '@data/characters'
import { type AssetId, SKELETON } from '@data/scenery'
import { createAnimationController, type AnimationController } from '@systems/animation/animation-controller'
import { acquireSkinnedSlot, releaseSkinnedSlot } from '@systems/spawner/skinned-budget'
import { disposeTree } from './dispose'
import { buildGarments, type SkinIndexCtor } from './garments'
import { assertSkeleton, loadClips, loadGltf } from './loaders'
import { type ResolvedTier } from './manifest'
import { applyTierMaterials, tierMaterial } from './materials'

export interface BuiltCharacter {
  id: CharacterId
  root: Group
  skinned: SkinnedMesh
  bones: Map<string, Bone>
  /** Holder groups the props hang from, by kind. */
  props: Map<PropKind, Group>
  controller: AnimationController
  dispose(): void
}

export interface BuildOptions {
  tier: ResolvedTier
  /** Attach the spec's props (bow, quiver). Off in levels without the bow. */
  props: boolean
  /** ~5k-tri body for Level 5's 12-concurrent budget. Player and speaking NPCs stay 'high'. */
  detail?: 'high' | 'low'
}

const HAIR_ASSET: Record<Hairstyle, AssetId> = {
  long: 'hairLong',
  beard: 'hairBeard',
  simpleParted: 'hairSimpleParted',
  buns: 'hairBuns',
  buzzed: 'hairBuzzed',
}
const MESH_ASSET: Record<'high' | 'low', Record<MeshKind, AssetId>> = {
  high: { male: 'male', female: 'female' },
  low: { male: 'maleLow', female: 'femaleLow' },
}
const KEEP_ATTRIBUTES = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']

function skinnedMeshes(root: Object3D): SkinnedMesh[] {
  const out: SkinnedMesh[] = []
  root.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) out.push(o as SkinnedMesh)
  })
  return out
}

function stripped(geometry: BufferGeometry): BufferGeometry {
  const g = geometry.clone()
  for (const name of Object.keys(g.attributes)) {
    if (!KEEP_ATTRIBUTES.includes(name)) {
      g.deleteAttribute(name)
      continue
    }
    // GLTFLoader's interleaved attributes carry no gpuType; procedurally-built ones (garments)
    // default to FloatType. mergeGeometries refuses to merge attributes whose gpuType disagrees.
    ;(g.attributes[name] as { gpuType?: number }).gpuType = FloatType
  }
  g.morphAttributes = {}
  return g
}

/**
 * Merge the source primitives into one SkinnedMesh with one material group per primitive.
 * `tint` (CharacterSpec.tint) multiplies into the garment materials only — dhoti, choli, sash,
 * and any future crown. Skin, face, eyes stay on their own base texture, untinted; body-painted
 * sages was a bug (see TODO.md, pass 3 phase D/E fix), not the intended look.
 */
function mergeSkinned(bodyParts: SkinnedMesh[], garmentParts: SkinnedMesh[], tier: ResolvedTier, tint: string): SkinnedMesh {
  const allParts = [...bodyParts, ...garmentParts]
  const body = bodyParts.reduce((a, b) => (a.geometry.index!.count > b.geometry.index!.count ? a : b))
  const geometries = allParts.map((p) => stripped(p.geometry))
  const merged = mergeGeometries(geometries, true)
  geometries.forEach((g) => g.dispose())
  if (!merged) throw new Error('character primitives could not be merged')
  const materials = allParts.map((p) => tierMaterial(p.material as Material, tier, garmentParts.includes(p) ? { tint } : {}))
  const mesh = new SkinnedMesh(merged, materials)
  mesh.name = body.name
  mesh.frustumCulled = false
  mesh.bind(body.skeleton, body.bindMatrix)
  return mesh
}

/** Hair is 100 % weighted to Head: bake bind-space → Head-space and parent a plain Mesh. */
function attachHair(source: SkinnedMesh, head: Bone, tier: ResolvedTier, tint: string): Mesh {
  const headIndex = source.skeleton.bones.findIndex((b) => b.name === SKELETON.HEAD_BONE)
  const toHead = new Matrix4().multiplyMatrices(source.skeleton.boneInverses[headIndex], source.bindMatrix)
  const geometry = stripped(source.geometry).applyMatrix4(toHead)
  geometry.deleteAttribute('skinIndex')
  geometry.deleteAttribute('skinWeight')
  const mesh = new Mesh(geometry, tierMaterial(source.material as Material, tier, { tint }))
  mesh.name = source.name
  head.add(mesh)
  return mesh
}

/** Grip transform: local offset, euler rotation (radians), and uniform scale — the source
 * prop models bake unrelated real-world scales (see balance.ts), never a human hand's. */
interface GripTransform {
  readonly pos: readonly number[]
  readonly rot: readonly number[]
  readonly scale: number
}

function attachProp(prop: Object3D, bone: Bone, grip: GripTransform, tier: ResolvedTier): Group {
  const holder = new Group()
  holder.position.set(grip.pos[0], grip.pos[1], grip.pos[2])
  holder.rotation.set(grip.rot[0], grip.rot[1], grip.rot[2])
  holder.scale.setScalar(grip.scale)
  applyTierMaterials(prop, tier)
  holder.add(prop)
  bone.add(holder)
  return holder
}

async function attachProps(id: CharacterId, bones: Map<string, Bone>, tier: ResolvedTier): Promise<Map<PropKind, Group>> {
  const aim = BALANCE.archeryAim
  const out = new Map<PropKind, Group>()
  for (const kind of CHARACTER_SPECS[id].props) {
    if (kind === 'bow') out.set(kind, attachProp(cloneSkeleton((await loadGltf('bow')).scene), bones.get(SKELETON.LEFT_HAND)!, { pos: aim.BOW_GRIP_POS, rot: aim.BOW_GRIP_ROT, scale: aim.BOW_GRIP_SCALE }, tier))
    // ponytail: no quiver mesh in the pack; the arrow model stands in on the back.
    if (kind === 'quiver') out.set(kind, attachProp(cloneSkeleton((await loadGltf('arrow')).scene), bones.get(SKELETON.SPINE_TOP)!, { pos: aim.QUIVER_POS, rot: aim.QUIVER_ROT, scale: aim.QUIVER_SCALE }, tier))
    if (kind === 'sword') out.set(kind, attachProp(cloneSkeleton((await loadGltf('sword')).scene), bones.get(SKELETON.RIGHT_HAND)!, { pos: BALANCE.melee.SWORD_GRIP_POS, rot: BALANCE.melee.SWORD_GRIP_ROT, scale: BALANCE.melee.SWORD_GRIP_SCALE }, tier))
  }
  return out
}

export async function buildCharacter(id: CharacterId, opts: BuildOptions): Promise<BuiltCharacter> {
  const spec = CHARACTER_SPECS[id]
  const [gltf, clips, hair] = await Promise.all([
    loadGltf(MESH_ASSET[opts.detail ?? 'high'][spec.mesh]),
    loadClips(),
    spec.hairstyle ? loadGltf(HAIR_ASSET[spec.hairstyle]) : null,
  ])
  const rig = cloneSkeleton(gltf.scene)
  const parts = skinnedMeshes(rig)
  const skinIndexCtor = parts[0].geometry.attributes.skinIndex.array.constructor as SkinIndexCtor
  const garments = buildGarments(id, rig, parts[0].skeleton, parts[0].bindMatrix, skinIndexCtor)
  const skinned = mergeSkinned(parts, garments, opts.tier, spec.tint)
  assertSkeleton(skinned, id)
  parts[0].parent!.add(skinned)
  parts.forEach((p) => p.removeFromParent())

  const bones = new Map(skinned.skeleton.bones.map((b) => [b.name, b]))
  const head = bones.get(SKELETON.HEAD_BONE)
  if (!head) throw new Error(`${id}: skeleton has no ${SKELETON.HEAD_BONE} bone`)
  if (hair) attachHair(skinnedMeshes(hair.scene)[0], head, opts.tier, spec.hairTint)
  const props = opts.props ? await attachProps(id, bones, opts.tier) : new Map<PropKind, Group>()

  const root = new Group()
  root.name = id
  root.scale.setScalar(spec.scale)
  root.add(rig)
  const controller = createAnimationController(rig, clips)
  const slot = acquireSkinnedSlot(id)
  return {
    id,
    root,
    skinned,
    bones,
    props,
    controller,
    dispose() {
      releaseSkinnedSlot(slot)
      controller.dispose()
      // Textures are shared with the cached prototype and every other instance.
      disposeTree(root, { textures: false })
    },
  }
}
