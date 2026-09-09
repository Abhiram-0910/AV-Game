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

function gltf(args) {
  execFileSync(CLI, args, { stdio: ['ignore', 'ignore', 'inherit'] })
}

function blenderDecimate(src, out, ratio) {
  const script = join(ROOT, 'tools/decimate.py')
  execFileSync('blender', ['-b', '--python', script, '--', src, out, ratio], { stdio: ['ignore', 'ignore', 'inherit'] })
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

/** KTX2 pass — ETC1S for base colour only, UASTC for normal/ORM (ETC1S cross-pollinates channels). */
function compressTextures() {
  throw new Error('KTX2 compression is pass 3: gltf-transform etc1s/uastc via toktx, see ARCHITECTURE.md')
}

/** Low tier — 512px textures, decimated statics. Until it exists the runtime falls back to high. */
function buildLowTier() {
  throw new Error('assets/low is pass 3; render/manifest.ts falls back to the high tier')
}

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
mkdirSync(OUT, { recursive: true })
const manifest = {}
for (const [id, job] of Object.entries(JOBS)) manifest[id] = build(id, job)
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const total = Object.values(manifest).reduce((n, m) => n + m.bytes, 0)
console.log(`manifest.json written — ${Object.keys(manifest).length} assets, ${(total / 1048576).toFixed(1)} MB`)
if (FULL) {
  compressTextures()
  buildLowTier()
}
