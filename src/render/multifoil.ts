// The cusped (multifoil) arch of Rajput courts, as a 2D outline shared by the painted wall niches
// (render/palace-textures.ts) and the arch screens (render/court-architecture.ts).

/** Outline from the left springing (−half, 0) over the apex to the right springing (half, 0): `lobes`
 * outward-bulging arcs on a half-ellipse of half-span `half` and height `rise`. The cusps between lobes point
 * into the opening. Lobes bulge up to `bulge` × chord past the ellipse, so the apex sits a little above `rise`. */
export function multifoil(half: number, rise: number, lobes: number, perLobe = 6, bulge = 0.3): [number, number][] {
  const at = (t: number): [number, number] => {
    const a = Math.PI * (1 - t)
    return [Math.cos(a) * half, Math.sin(a) * rise]
  }
  const points: [number, number][] = []
  for (let k = 0; k < lobes; k += 1) {
    const [x0, y0] = at(k / lobes)
    const [x1, y1] = at((k + 1) / lobes)
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const len = Math.hypot(x1 - x0, y1 - y0)
    let nx = -(y1 - y0) / len
    let ny = (x1 - x0) / len
    if (nx * cx + ny * cy < 0) {
      nx = -nx
      ny = -ny
    }
    // A quadratic's peak is half its control offset.
    const qx = cx + nx * len * bulge * 2
    const qy = cy + ny * len * bulge * 2
    for (let j = 0; j < perLobe; j += 1) {
      const s = j / perLobe
      const u = 1 - s
      points.push([u * u * x0 + 2 * u * s * qx + s * s * x1, u * u * y0 + 2 * u * s * qy + s * s * y1])
    }
  }
  points.push(at(1))
  return points
}
