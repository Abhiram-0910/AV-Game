// Garments fitted to the body instead of guessed: sample the body mesh's bind-pose vertices, lay a
// shell a few millimetres outside them, and give every shell vertex the skin weights of the body
// vertex it was fitted to, so the cloth moves exactly like the skin under it.
import { BufferAttribute, BufferGeometry, type Object3D, type Skeleton, type SkinnedMesh, Vector3 } from 'three'

export interface Sample {
  p: Vector3
  idx: readonly number[]
  w: readonly number[]
}

export interface Fit {
  /** rings × sectors points, ring-major. */
  points: Vector3[]
  /** The sample each point copies its skin from. */
  skin: Sample[]
  rings: number
  sectors: number
}

function largestSkinnedMesh(rig: Object3D): SkinnedMesh | null {
  let body: SkinnedMesh | null = null
  rig.traverse((o) => {
    const m = o as SkinnedMesh
    if (m.isSkinnedMesh && (!body || m.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = m
  })
  return body
}

/** Bind-pose vertices of the body whose heaviest bone is one of `bones`, indices mapped into `skeleton`. */
export function bodySamples(rig: Object3D, skeleton: Skeleton, bones: readonly string[]): Sample[] {
  const body = largestSkinnedMesh(rig)
  if (!body) throw new Error('garment-fit: rig has no skinned body to fit to')
  const map = body.skeleton.bones.map((b) => skeleton.bones.indexOf(b))
  const keep = new Set(bones.map((n) => skeleton.bones.findIndex((b) => b.name === n)))
  const { position, skinIndex, skinWeight } = body.geometry.attributes
  const out: Sample[] = []
  for (let i = 0; i < position.count; i += 1) {
    const idx = [skinIndex.getX(i), skinIndex.getY(i), skinIndex.getZ(i), skinIndex.getW(i)].map((j) => map[j])
    const w = [skinWeight.getX(i), skinWeight.getY(i), skinWeight.getZ(i), skinWeight.getW(i)]
    if (!keep.has(idx[w.indexOf(Math.max(...w))])) continue
    const sum = w[0] + w[1] + w[2] + w[3]
    out.push({ p: new Vector3().fromBufferAttribute(position, i).applyMatrix4(body.bindMatrix), idx, w: w.map((x) => x / sum) })
  }
  return out
}

function angleGap(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2)
  return Math.min(d, Math.PI * 2 - d)
}

/** One ring at height h: per sector, the farthest sample in the band and that angle, pushed out by `gap`. */
function fitRing(band: Sample[], h: number, sectors: number, gap: number, fit: Fit) {
  const cx = band.reduce((a, s) => a + s.p.x, 0) / band.length
  const cz = band.reduce((a, s) => a + s.p.z, 0) / band.length
  const best: (Sample | null)[] = []
  const radius: number[] = []
  for (let k = 0; k < sectors; k += 1) {
    const theta = (k / sectors) * Math.PI * 2
    let pick: Sample | null = null
    let r = 0
    for (const s of band) {
      const d = Math.hypot(s.p.x - cx, s.p.z - cz)
      if (d > r && angleGap(Math.atan2(s.p.z - cz, s.p.x - cx), theta) < (1.5 * Math.PI) / sectors) [pick, r] = [s, d]
    }
    best.push(pick)
    radius.push(r)
  }
  const fallback = band.reduce((a, s) => (Math.hypot(s.p.x - cx, s.p.z - cz) > Math.hypot(a.p.x - cx, a.p.z - cz) ? s : a))
  for (let k = 0; k < sectors; k += 1) {
    // Raise dips (between ribs, the navel) to the neighbours' mean so the cloth bridges them.
    const r = Math.max(radius[k], (radius[(k + sectors - 1) % sectors] + radius[(k + 1) % sectors]) / 2) + gap
    const theta = (k / sectors) * Math.PI * 2
    fit.points.push(new Vector3(cx + Math.cos(theta) * r, h, cz + Math.sin(theta) * r))
    fit.skin.push(best[k] ?? fallback)
  }
}

/** Vertical shell from y0 to y1 wrapped round the samples. */
export function ringShell(samples: Sample[], y0: number, y1: number, rings: number, sectors: number, gap: number): Fit {
  const fit: Fit = { points: [], skin: [], rings, sectors }
  const half = ((y1 - y0) / (rings - 1)) * 0.6
  for (let r = 0; r < rings; r += 1) {
    const h = y0 + ((y1 - y0) * r) / (rings - 1)
    const band = samples.filter((s) => Math.abs(s.p.y - h) < half)
    if (band.length === 0) throw new Error(`garment-fit: no body vertices near y ${h.toFixed(2)}`)
    fitRing(band, h, sectors, gap, fit)
  }
  return fit
}

/** Mantle laid over the shoulders from above: an elliptical polar grid round `center`, each point dropped
 * onto the highest sample within `reach` of it. */
export function drape(samples: Sample[], center: Vector3, inner: number, outer: readonly [number, number], rings: number, sectors: number, gap: number, reach: number): Fit {
  const fit: Fit = { points: [], skin: [], rings, sectors }
  for (let r = 0; r < rings; r += 1) {
    const t = r / (rings - 1)
    for (let k = 0; k < sectors; k += 1) {
      const theta = (k / sectors) * Math.PI * 2
      const x = center.x + Math.cos(theta) * (inner + (outer[0] - inner) * t)
      const z = center.z + Math.sin(theta) * (inner + (outer[1] - inner) * t)
      let top: Sample | null = null
      let near = samples[0]
      for (const s of samples) {
        const d = Math.hypot(s.p.x - x, s.p.z - z)
        if (d < reach && (!top || s.p.y > top.p.y)) top = s
        if (d < Math.hypot(near.p.x - x, near.p.z - z)) near = s
      }
      // Sparse skin (the ~5k LOD) can leave no vertex within reach: sit on the nearest one instead.
      const on = top ?? near
      fit.points.push(new Vector3(x, on.p.y + gap, z))
      fit.skin.push(on)
    }
  }
  return fit
}

/** Triangulated, closed round the sectors, open at both ends; faces turned so `outward(normal, point)` holds.
 * With `skinIndexCtor`, each vertex also gets its fitted sample's skin (the array type must match the body's). */
export function fitGeometry(fit: Fit, outward: (n: Vector3, p: Vector3) => boolean, skinIndexCtor?: Uint8ArrayConstructor | Uint16ArrayConstructor): BufferGeometry {
  const { rings, sectors, points } = fit
  const index: number[] = []
  for (let r = 0; r < rings - 1; r += 1)
    for (let k = 0; k < sectors; k += 1) {
      const a = r * sectors + k
      const b = r * sectors + ((k + 1) % sectors)
      index.push(a, a + sectors, b, b, a + sectors, b + sectors)
    }
  const [p0, p1, p2] = index.slice(0, 3).map((i) => points[i])
  const n = new Vector3().crossVectors(p1.clone().sub(p0), p2.clone().sub(p0))
  if (!outward(n, p0)) for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]]
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(points.length * 2), 2))
  g.setIndex(index)
  g.computeVertexNormals()
  if (skinIndexCtor) {
    g.setAttribute('skinIndex', new BufferAttribute(new skinIndexCtor(fit.skin.flatMap((s) => s.idx)), 4))
    g.setAttribute('skinWeight', new BufferAttribute(new Float32Array(fit.skin.flatMap((s) => s.w)), 4))
  }
  return g
}
