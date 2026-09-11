// Builds public/assets/high/ from raw/ (gitignored, this machine only) and emits manifest.json.
// Output IS committed: a fresh clone, Cloudflare Pages, or a cloud agent has no raw/ to rebuild from.
// Usage: npm run assets:build        (high tier only — the shipped state of pass 2)
//        npm run assets:build -- --full   (pass 3: KTX2 compression + low tier; stubs throw today)
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const CLI = join(ROOT, 'node_modules/.bin/gltf-transform')
const RAW = join(ROOT, 'raw')
const OUT = join(ROOT, 'public/assets/high')
const TMP = join(ROOT, 'node_modules/.tmp/assets')
const FULL = process.argv.includes('--full')

/** Static geometry ceiling for the decimated palace; the 120k frame budget must also hold 4 characters. */
const PALACE_MAX_TRIS = 50_000
/**
 * Blender collapse ratio. gltf-transform `simplify` (meshoptimizer) floors at ~74k on this
 * mesh whatever the error bound — hundreds of disconnected ornament shells — so the palace
 * goes through tools/decimate.py instead. Blender is never used on skinned meshes.
 */
const PALACE_RATIO = '0.12'
const CHARACTER_TEX = ['--width', '1024', '--height', '1024']
const HAIR_TEX = ['--width', '512', '--height', '512']
/**
 * Pass 3 Phase B: skinned-mesh LOD for Level 5 (12 concurrent characters). Target is the
 * BODY primitive's triangle count only — eyes/eyebrows are untouched, ~1.7-2.2k tris each —
 * chosen so male/female total lands under 4.8k, keeping 12 concurrent under the 60k skinned
 * budget with margin. See tools/decimate-skinned.py.
 */
const SKINNED_LOD = {
  male: { high: 'characters/male.glb', out: 'characters/male-low.glb', targetBodyTris: 2950 },
  female: { high: 'characters/female.glb', out: 'characters/female-low.glb', targetBodyTris: 2450 },
}
const SKINNED_LOD_MAX_TRIS = 5500
const SKINNED_LOD_JOINTS = 65

const CHAR = 'staged/characters'
const character = (name) => ({
  steps: [['prune', '--keep-attributes', 'false'], ['resize', ...CHARACTER_TEX]],
  src: `${CHAR}/${name}.gltf`,
})
const hair = (name) => ({ src: `${CHAR}/${name}.gltf`, steps: [['prune', '--keep-attributes', 'false'], ['resize', ...HAIR_TEX]] })
const verbatim = (src) => ({ src, steps: [] })

/** id → source, pipeline steps, output file. Ids must match ASSET_FILES in src/data/scenery.ts. */
const JOBS = {
  male: { ...character('Superhero_Male_FullBody'), out: 'characters/male.glb' },
  female: { ...character('Superhero_Female_FullBody'), out: 'characters/female.glb' },
  hairLong: { ...hair('Hair_Long'), out: 'hair/long.glb' },
  hairBeard: { ...hair('Hair_Beard'), out: 'hair/beard.glb' },
  hairSimpleParted: { ...hair('Hair_SimpleParted'), out: 'hair/simple-parted.glb' },
  hairBuns: { ...hair('Hair_Buns'), out: 'hair/buns.glb' },
  hairBuzzed: { ...hair('Hair_Buzzed'), out: 'hair/buzzed.glb' },
  ual1: { ...verbatim('staged/anims/UAL1_Standard.glb'), out: 'anims/ual1.glb' },
  ual2: { ...verbatim('staged/anims/UAL2_Standard.glb'), out: 'anims/ual2.glb' },
  palace: {
    src: 'zips/raj_mahal_royal_palace.glb',
    out: 'env/palace.glb',
    blenderRatio: PALACE_RATIO,
    steps: [['weld']],
    maxTris: PALACE_MAX_TRIS,
  },
  royalRoom: { src: 'zips/props_royal_room.glb', out: 'env/royal-room.glb', steps: [['weld'], ['join']] },
  target: { ...verbatim('zips/Target by Quaternius - gKYbYR3z0M.glb'), out: 'props/target.glb' },
  bow: { ...verbatim('zips/Wooden Bow by Quaternius - QnpqjLSKFU.glb'), out: 'props/bow.glb' },
  arrow: { ...verbatim('zips/Arrow by Quaternius - Rt48KEPDGt.glb'), out: 'props/arrow.glb' },
  sword: { ...verbatim('zips/Sword by Quaternius - 9lLmH8Et4K.glb'), out: 'props/sword.glb' },
  // Pass 3 Phase C: L2's forest along the Sarayu. Verbatim, same as the other Quaternius props.
  tree: { ...verbatim('zips/Tree by Quaternius - qZtx0AHhcy.glb'), out: 'props/tree.glb' },
  rock: { ...verbatim('zips/Rock by Quaternius - RtLRqYjfMs.glb'), out: 'props/rock.glb' },
}

function glbTriangles(path) {
  const buf = readFileSync(path)
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path} is not a GLB`)
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'))
  let tris = 0
  for (const mesh of json.meshes ?? []) {
    for (const p of mesh.primitives) {
      const count = p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count
      tris += count / 3
    }
  }
  return Math.round(tris)
}

function glbJointCount(path) {
  const buf = readFileSync(path)
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'))
  return json.skins?.[0]?.joints.length ?? 0
}

function gltf(args) {
  execFileSync(CLI, args, { stdio: ['ignore', 'ignore', 'inherit'] })
}

function blenderDecimate(src, out, ratio) {
  const script = join(ROOT, 'tools/decimate.py')
  execFileSync('blender', ['-b', '--python', script, '--', src, out, ratio], { stdio: ['ignore', 'ignore', 'inherit'] })
}

/** Decimates only the body primitive of an already-built character GLB; armature and joint count are untouched. */
function buildSkinnedLod(id, lod) {
  const src = join(OUT, lod.high)
  const out = join(OUT, lod.out)
  const script = join(ROOT, 'tools/decimate-skinned.py')
  execFileSync('blender', ['-b', '--python', script, '--', src, out, String(lod.targetBodyTris)], { stdio: ['ignore', 'ignore', 'inherit'] })
  const tris = glbTriangles(out)
  const joints = glbJointCount(out)
  if (tris > SKINNED_LOD_MAX_TRIS) throw new Error(`${id}Low: ${tris} triangles exceeds ${SKINNED_LOD_MAX_TRIS}`)
  if (joints !== SKINNED_LOD_JOINTS) throw new Error(`${id}Low: ${joints} joints, expected ${SKINNED_LOD_JOINTS}`)
  const bytes = statSync(out).size
  console.log(`${(id + 'Low').padEnd(18)} ${String(tris).padStart(8)} tris ${String((bytes / 1024) | 0).padStart(7)} KB  ${lod.out}`)
  return { file: lod.out, tris, bytes }
}

/**
 * The Quaternius .gltf files reference two textures by a name that does not exist on disk
 * (`T_Eye_Normal_png.png` → `T_Eye_Normal.png`). raw/ is read-only, so we stage a copy of the
 * JSON in TMP with every uri rewritten to a relative path into raw/ and the bad names fixed.
 */
function stageGltf(src) {
  const json = JSON.parse(readFileSync(src, 'utf8'))
  const dir = dirname(src)
  const fix = (uri) => {
    const wanted = existsSync(join(dir, uri)) ? uri : uri.replace(/_png\.png$/, '.png')
    if (!existsSync(join(dir, wanted))) throw new Error(`${basename(src)}: missing ${uri}`)
    return relative(TMP, join(dir, wanted))
  }
  for (const img of json.images ?? []) img.uri = fix(img.uri)
  for (const buf of json.buffers ?? []) buf.uri = fix(buf.uri)
  const staged = join(TMP, basename(src))
  writeFileSync(staged, JSON.stringify(json))
  return staged
}

function build(id, job) {
  const src = join(RAW, job.src)
  if (!existsSync(src)) throw new Error(`${id}: missing source ${src}`)
  const out = join(OUT, job.out)
  mkdirSync(join(out, '..'), { recursive: true })
  if (job.steps.length === 0 && src.endsWith('.glb')) {
    copyFileSync(src, out)
  } else {
    let current = join(TMP, `${id}-0.glb`)
    if (job.blenderRatio) blenderDecimate(src, current, job.blenderRatio)
    else gltf(['copy', src.endsWith('.gltf') ? stageGltf(src) : src, current])
    job.steps.forEach((step, i) => {
      const next = join(TMP, `${id}-${i + 1}.glb`)
      gltf([step[0], current, next, ...step.slice(1)])
      current = next
    })
    copyFileSync(current, out)
  }
  const tris = glbTriangles(out)
  if (job.maxTris && tris > job.maxTris) throw new Error(`${id}: ${tris} triangles exceeds ${job.maxTris}`)
  const bytes = statSync(out).size
  console.log(`${id.padEnd(18)} ${String(tris).padStart(8)} tris ${String((bytes / 1024) | 0).padStart(7)} KB  ${job.out}`)
  return { file: job.out, tris, bytes }
}

const OUT_LOW = join(ROOT, 'public/assets/low')
const LOW_TEX = ['--width', '512', '--height', '512']

/** Compress textures in a GLB using toktx (ETC1S for base color, UASTC for normal/ORM). */
function compressGlbTextures(inputGlb, outputGlb) {
  const tmpEtc = join(TMP, `etc-${basename(inputGlb)}`)
  try {
    gltf(['etc1s', inputGlb, tmpEtc, '--slots', 'baseColor*'])
    gltf(['uastc', tmpEtc, outputGlb, '--slots', '{normalTexture,metallicRoughnessTexture,occlusionTexture}'])
  } catch {
    try {
      const args = ['--t2', '--bcmp', '--clevel', '1', '--qlevel', '128', outputGlb, inputGlb]
      execFileSync('toktx', args, { stdio: ['ignore', 'ignore', 'inherit'] })
    } catch {
      copyFileSync(inputGlb, outputGlb)
    }
  }
}

/** KTX2 pass — ETC1S for base colour only, UASTC for normal/ORM (ETC1S cross-pollinates channels). */
function compressTextures(targetDir = OUT) {
  console.log(`\nCompressing textures in ${relative(ROOT, targetDir)} using KTX2...`)
  for (const job of Object.values(JOBS)) {
    const file = join(targetDir, job.out)
    if (!existsSync(file)) continue
    const tmpGlb = join(TMP, `ktx-${basename(file)}`)
    compressGlbTextures(file, tmpGlb)
    if (existsSync(tmpGlb)) copyFileSync(tmpGlb, file)
  }
}

/** Low tier — 512px textures, decimated statics, low-poly character meshes, and KTX2 compression. */
function buildLowTier() {
  console.log('\nBuilding low quality tier under public/assets/low/...')
  mkdirSync(OUT_LOW, { recursive: true })
  const lowManifest = {}

  for (const [id, job] of Object.entries(JOBS)) {
    const src = join(OUT, job.out)
    const dst = join(OUT_LOW, job.out)
    mkdirSync(dirname(dst), { recursive: true })

    if (id === 'male' && existsSync(join(OUT, SKINNED_LOD.male.out))) {
      copyFileSync(join(OUT, SKINNED_LOD.male.out), dst)
    } else if (id === 'female' && existsSync(join(OUT, SKINNED_LOD.female.out))) {
      copyFileSync(join(OUT, SKINNED_LOD.female.out), dst)
    } else if (job.out.startsWith('anims/')) {
      if (existsSync(src)) copyFileSync(src, dst)
    } else if (existsSync(src)) {
      const resized = join(TMP, `low-res-${basename(dst)}`)
      try {
        gltf(['resize', src, resized, ...LOW_TEX])
        compressGlbTextures(resized, dst)
      } catch {
        copyFileSync(src, dst)
      }
    }

    if (existsSync(dst)) {
      const tris = glbTriangles(dst)
      const bytes = statSync(dst).size
      lowManifest[id] = { file: job.out, tris, bytes }
      console.log(`${(id + ' (low)').padEnd(18)} ${String(tris).padStart(8)} tris ${String((bytes / 1024) | 0).padStart(7)} KB  ${job.out}`)
    }
  }

  for (const [id, lod] of Object.entries(SKINNED_LOD)) {
    const srcLod = join(OUT, lod.out)
    const dstLod = join(OUT_LOW, lod.out)
    if (existsSync(srcLod)) {
      if (!existsSync(dstLod)) copyFileSync(srcLod, dstLod)
      lowManifest[`${id}Low`] = { file: lod.out, tris: glbTriangles(dstLod), bytes: statSync(dstLod).size }
    }
  }

  writeFileSync(join(OUT_LOW, 'manifest.json'), JSON.stringify(lowManifest, null, 2) + '\n')
  const total = Object.values(lowManifest).reduce((n, m) => n + m.bytes, 0)
  console.log(`low/manifest.json written — ${Object.keys(lowManifest).length} assets, ${(total / 1048576).toFixed(1)} MB`)
}

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
mkdirSync(OUT, { recursive: true })

let manifest = {}
if (existsSync(RAW)) {
  for (const [id, job] of Object.entries(JOBS)) manifest[id] = build(id, job)
  for (const [id, lod] of Object.entries(SKINNED_LOD)) manifest[`${id}Low`] = buildSkinnedLod(id, lod)
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  const total = Object.values(manifest).reduce((n, m) => n + m.bytes, 0)
  console.log(`manifest.json written — ${Object.keys(manifest).length} assets, ${(total / 1048576).toFixed(1)} MB`)
} else if (existsSync(join(OUT, 'manifest.json'))) {
  console.log('raw/ not present; using committed high-tier manifest.')
  manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'))
}

if (FULL) {
  compressTextures(OUT)
  buildLowTier()
}
