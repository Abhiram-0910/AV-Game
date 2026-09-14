// The palace shell cut and zoning (render/palace-surface.ts carve): what is cut, what is kept, which zone and UV.
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { type CarveOptions, carve, ZONES } from '@render/palace-surface'

const O: CarveOptions = {
  cuts: [{ min: [-1, 0.08, -1], max: [1, 3.56, 1] }],
  gilded: { min: [5, 3, -1], max: [7, 5, 1] },
  floorGuardY: 0.12,
  wallFloorY: 0.1,
  wallTileM: 2.4,
  wallTileH: 3.44,
  tileM: 2.35,
}

type P3 = [number, number, number]
function geometry(tris: P3[][]): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(tris.flat(2), 3))
  g.computeVertexNormals()
  return g
}

const zoneCount = (g: BufferGeometry, zone: (typeof ZONES)[number]) => g.groups.find((gr) => gr.materialIndex === ZONES.indexOf(zone))?.count ?? 0

describe('palace shell carve', () => {
  it('cuts a triangle wholly inside a box and keeps one that crosses its edge or is floor', () => {
    const column: P3[] = [[0, 1, 0.2], [0.2, 1, 0.2], [0, 2, 0.2]] // vertical, all inside
    const platformFace: P3[] = [[0.9, 0, 0.5], [0.9, 0.42, -3], [0.9, 0.42, 0.5]] // crosses the box's z edge
    const floor: P3[] = [[-0.5, 0.1, -0.5], [-0.5, 0.1, 0.5], [0.5, 0.1, 0.5]] // up-facing at y 0.1, inside
    const g = carve(geometry([column, platformFace, floor]), O)
    expect(g.getAttribute('position').count).toBe(6)
    expect(zoneCount(g, 'wall')).toBe(3)
    expect(zoneCount(g, 'floor')).toBe(3)
  })

  it('zones by face normal: up is stone, down is ceiling, down in the gilded box is gilded, vertical is wall', () => {
    const up: P3[] = [[3, 1, 3], [3, 1, 4], [4, 1, 4]]
    const down: P3[] = [[3, 3.5, 3], [4, 3.5, 4], [3, 3.5, 4]]
    const gildedDown: P3[] = [[5.5, 3.5, 0], [6.5, 3.5, 0.5], [5.5, 3.5, 0.5]]
    const wall: P3[] = [[3, 0.1, 3], [5.4, 0.1, 3], [3, 3.54, 3]]
    const g = carve(geometry([up, down, gildedDown, wall]), O)
    for (const zone of ZONES.filter((z) => z !== 'floor')) expect(zoneCount(g, zone)).toBe(3)
    const total = g.groups.reduce((s, gr) => s + gr.count, 0)
    expect(total).toBe(g.getAttribute('position').count)
  })

  it('projects UVs in metres: walls along the wall and floor-to-soffit, flat faces on x/z', () => {
    const wall: P3[] = [[3, 0.1, 3], [5.4, 0.1, 3], [3, 3.54, 3]]
    const up: P3[] = [[2.35, 1, 4.7], [2.35, 1, 7.05], [4.7, 1, 7.05]]
    const g = carve(geometry([wall, up]), O)
    const uv = Array.from(g.getAttribute('uv').array).map((q) => Math.round(q * 1000) / 1000)
    // wall group first: u = x / 2.4, v = (y − 0.1) / 3.44
    expect(uv.slice(0, 6)).toEqual([1.25, 0, 2.25, 0, 1.25, 1])
    // stone: u = x / 2.35, v = z / 2.35
    expect(uv.slice(6, 12)).toEqual([1, 2, 1, 3, 2, 3])
  })
})
