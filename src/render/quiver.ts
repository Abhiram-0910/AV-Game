// The quiver on Rama's and Lakshmana's backs (CharacterSpec props 'quiver'). The asset pack has none, and the bare
// arrow.glb that stood in read as an arrow through the back. A tapered crimson leather tube with gold bands and a few
// fletched shafts at the mouth (scenery.ts QUIVER), merged into one mesh with a material group each for leather, gold and
// fletching. Authored in metres along +Y from its base; balance.ts archeryAim.QUIVER_* hang it on spine_03, and
// character-factory.ts puts its materials on the tier path.
import { type BufferGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BALANCE } from '@data/balance'
import { QUIVER as Q } from '@data/scenery'

const radiusAt = (f: number) => Q.radius[0] + (Q.radius[1] - Q.radius[0]) * f

function merged(parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!g) throw new Error('quiver: parts could not be merged')
  return g
}

/** Shafts standing in the mouth at staggered heights, each with two crossed fletching vanes at its nock. */
function shafts(): BufferGeometry[] {
  const out: BufferGeometry[] = []
  const shaft = Q.shaftShow + 0.12
  for (let i = 0; i < Q.shafts; i += 1) {
    const a = (i / Q.shafts) * Math.PI * 2 + 0.4
    const d = radiusAt(1) * (i % 2 ? 0.5 : 0.28)
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    const top = Q.length + Q.shaftShow - (i % 3) * 0.02
    out.push(new CylinderGeometry(Q.shaftRadius, Q.shaftRadius, shaft, 5).translate(x, top - shaft / 2, z))
    for (const turn of [0, Math.PI / 2]) {
      out.push(new PlaneGeometry(Q.fletch[0], Q.fletch[1]).rotateY(a + turn).translate(x, top - Q.fletch[1] / 2 - 0.008, z))
    }
  }
  return out
}

export function buildQuiver(): Mesh {
  const leather = merged([
    new CylinderGeometry(Q.radius[1], Q.radius[0], Q.length, Q.sides, 1, true).translate(0, Q.length / 2, 0),
    new CircleGeometry(Q.radius[0], Q.sides).rotateX(Math.PI / 2),
    // The bed the arrows stand in, just inside the mouth, so the open tube never shows its inside.
    new CircleGeometry(radiusAt(0.93), Q.sides).rotateX(-Math.PI / 2).translate(0, Q.length * 0.93, 0),
  ])
  const gold = merged(
    Q.bands.map((f) => {
      const r = radiusAt(f) + Q.bandLift
      return new CylinderGeometry(r, r, Q.bandHeight, Q.sides, 1, true).translate(0, f * Q.length, 0)
    }),
  )
  const fletching = merged(shafts())
  const geometry = mergeGeometries([leather, gold, fletching], true)
  if (!geometry) throw new Error('quiver: groups could not be merged')
  ;[leather, gold, fletching].forEach((g) => g.dispose())
  const mesh = new Mesh(geometry, [
    new MeshStandardMaterial({ name: 'quiver-leather', color: Q.leather, roughness: 0.7 }),
    new MeshStandardMaterial({ name: 'quiver-gold', color: Q.gold, ...BALANCE.garments.REGALIA_PBR }),
    new MeshStandardMaterial({ name: 'quiver-fletching', color: Q.fletching, roughness: 0.9, side: DoubleSide }),
  ])
  mesh.name = 'quiver'
  return mesh
}
