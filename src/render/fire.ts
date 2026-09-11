// Fire shared by the court braziers and the yajna altar: a lathe teardrop whose emissiveMap
// (procedural-textures.ts flameTexture) runs hot yellow at the base to orange at the tip.
import { type BufferGeometry, LatheGeometry, Vector2 } from 'three'

/** Teardrop profile, base to tip: rounded belly low, drawn out to a point. Base at y 0. */
export function flameGeometry(r: number, h: number): BufferGeometry {
  const pts = [[0, 0], [0.7, 0.08], [1, 0.25], [0.85, 0.45], [0.45, 0.72], [0, 1]].map(([x, y]) => new Vector2(x * r, y * h))
  return new LatheGeometry(pts, 10)
}
