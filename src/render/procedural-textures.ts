// Canvas textures painted at runtime: no download, no asset pipeline. The caller owns and
// disposes what it gets back. A seeded generator keeps every run (and every screenshot) identical.
import { CanvasTexture, ClampToEdgeWrapping, EquirectangularReflectionMapping, RepeatWrapping, SRGBColorSpace } from 'three'

const SIZE = 256

export function seeded(seed: number): () => number {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  paint(canvas.getContext('2d')!, size)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Equirectangular sky for scene.background: row 0 is the zenith, the middle row the horizon. Everything
 * below the horizon is the horizon colour, which is also the fog colour, so the ground's far edge melts
 * into it. The follow camera only ever sees ~0–15° of elevation, so the gradient is packed into that band. */
export function skyTexture(zenith: string, horizon: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, zenith)
  grad.addColorStop(0.41, zenith) // 16° up
  grad.addColorStop(0.5, horizon)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 2, 512)
  const texture = new CanvasTexture(canvas)
  texture.mapping = EquirectangularReflectionMapping
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Vertical flame ramp for an emissiveMap on a lathe (v 0 at the base): hot yellow core fading to orange at the tip. */
export function flameTexture(core: string, tip: string): CanvasTexture {
  const texture = canvasTexture(64, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, 0, size)
    grad.addColorStop(0, tip)
    grad.addColorStop(0.55, tip)
    grad.addColorStop(1, core)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  })
  texture.wrapT = ClampToEdgeWrapping // repeat would blend the yellow base into the tip at v = 1
  return texture
}

/** Soft blotches of two colours over a base, drawn wrapped so the tile repeats seamlessly. */
export function dappleTexture(base: string, dapple: readonly [string, string]): CanvasTexture {
  const rand = seeded(7)
  return canvasTexture(SIZE, (ctx, size) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 700; i += 1) {
      const r = 3 + rand() * 20
      const x = rand() * size
      const y = rand() * size
      ctx.globalAlpha = 0.12 + rand() * 0.22
      ctx.fillStyle = dapple[i % 2]
      for (const dx of [-size, 0, size])
        for (const dy of [-size, 0, size]) {
          ctx.beginPath()
          ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
          ctx.fill()
        }
    }
    ctx.globalAlpha = 1
  })
}

export interface CourtColors {
  crimson: string
  crimsonDeep: string
  gold: string
  marble: string
  vein: string
  inlay: string
}

/** Cream marble tiles with thin veining, dark grout and a crimson-and-gold inlay at each corner. */
export function marbleTexture(c: CourtColors): CanvasTexture {
  const rand = seeded(11)
  return canvasTexture(512, (ctx, size) => {
    const tile = size / 2
    ctx.fillStyle = c.marble
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = c.vein
    for (let i = 0; i < 60; i += 1) {
      ctx.globalAlpha = 0.08 + rand() * 0.18
      ctx.lineWidth = 0.6 + rand() * 1.6
      ctx.beginPath()
      const x = rand() * size
      const y = rand() * size
      ctx.moveTo(x, y)
      ctx.bezierCurveTo(x + rand() * 120 - 60, y + rand() * 120 - 60, x + rand() * 160 - 80, y + rand() * 160 - 80, x + rand() * 200 - 100, y + rand() * 200 - 100)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = c.inlay
    for (let k = 0; k <= size; k += tile) {
      ctx.fillRect(k - 2, 0, 4, size)
      ctx.fillRect(0, k - 2, size, 4)
    }
    for (let x = 0; x <= size; x += tile)
      for (let y = 0; y <= size; y += tile) {
        diamond(ctx, x, y, 22, c.gold)
        diamond(ctx, x, y, 14, c.crimson)
      }
  })
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
  ctx.fill()
}

/** Carpet runner, one repeat: crimson field, gold borders, a gold lozenge down the centre. U spans the width. */
export function carpetTexture(c: CourtColors): CanvasTexture {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = c.crimson
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = c.crimsonDeep
    ctx.fillRect(0, 0, size * 0.14, size)
    ctx.fillRect(size * 0.86, 0, size * 0.14, size)
    ctx.fillStyle = c.gold
    for (const x of [0.04, 0.12, 0.86, 0.94]) ctx.fillRect(size * x, 0, size * 0.025, size)
    diamond(ctx, size / 2, size / 2, size * 0.22, c.gold)
    diamond(ctx, size / 2, size / 2, size * 0.15, c.crimsonDeep)
    diamond(ctx, size / 2, size / 2, size * 0.06, c.gold)
    for (const y of [0, size]) diamond(ctx, size / 2, y, size * 0.08, c.gold)
  })
}

/** Architrave frieze, one square tile: deep crimson, gold rules top and bottom, an eight-petal gold lotus. */
export function friezeTexture(c: CourtColors): CanvasTexture {
  return canvasTexture(128, (ctx, size) => {
    ctx.fillStyle = c.crimsonDeep
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = c.gold
    for (const y of [6, size - 14]) ctx.fillRect(0, y, size, 8)
    const cx = size / 2
    const cy = size / 2
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath()
      ctx.ellipse(cx, cy, 30, 9, (i / 8) * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = c.crimson
    ctx.beginPath()
    ctx.arc(cx, cy, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = c.gold
    for (const x of [0, size]) diamond(ctx, x, cy, 9, c.gold)
  })
}

/** Yajna ground, one tile over the whole enclosure: smoothed plaster with a chalk kolam — a double
 * border, dot grids in the corners, nested squares and diamonds, and an eight-petal lotus round the altar. */
export function kolamTexture(plaster: string, chalk: string): CanvasTexture {
  const rand = seeded(5)
  return canvasTexture(1024, (ctx, size) => {
    ctx.fillStyle = plaster
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 400; i += 1) {
      ctx.globalAlpha = 0.05 + rand() * 0.07
      ctx.fillStyle = rand() > 0.5 ? '#000000' : '#ffffff'
      ctx.beginPath()
      ctx.arc(rand() * size, rand() * size, 8 + rand() * 40, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = chalk
    ctx.fillStyle = chalk
    ctx.lineWidth = 6
    const c = size / 2
    for (const inset of [24, 44]) ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2)
    for (const [cx, cy] of [[140, 140], [size - 140, 140], [140, size - 140], [size - 140, size - 140]])
      for (let i = -2; i <= 2; i += 1)
        for (let j = -2; j <= 2; j += 1) {
          ctx.beginPath()
          ctx.arc(cx + i * 22, cy + j * 22, 4, 0, Math.PI * 2)
          ctx.fill()
        }
    for (const r of [330, 250]) ctx.strokeRect(c - r, c - r, r * 2, r * 2)
    for (const r of [300, 200]) {
      ctx.beginPath()
      ctx.moveTo(c, c - r)
      ctx.lineTo(c + r, c)
      ctx.lineTo(c, c + r)
      ctx.lineTo(c - r, c)
      ctx.closePath()
      ctx.stroke()
    }
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath()
      ctx.ellipse(c + Math.cos((i / 8) * Math.PI * 2) * 150, c + Math.sin((i / 8) * Math.PI * 2) * 150, 42, 18, (i / 8) * Math.PI * 2, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
}

/** Fired brick in running bond: brick faces in two shades over a darker mortar. */
export function brickTexture(brick: string, mortar: string): CanvasTexture {
  const rand = seeded(3)
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = mortar
    ctx.fillRect(0, 0, size, size)
    const h = size / 8
    const w = size / 4
    for (let row = 0; row < 8; row += 1)
      for (let col = -1; col < 4; col += 1) {
        ctx.fillStyle = brick
        ctx.globalAlpha = 0.75 + rand() * 0.25
        ctx.fillRect(col * w + (row % 2) * (w / 2) + 3, row * h + 3, w - 6, h - 6)
      }
    ctx.globalAlpha = 1
  })
}

/** Hanging banner: crimson cloth, gold border, a gold sun (Surya, the Ikshvaku line's emblem). */
export function bannerTexture(c: CourtColors): CanvasTexture {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = c.crimson
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = c.gold
    ctx.lineWidth = 10
    ctx.strokeRect(12, 12, size - 24, size - 24)
    const cx = size / 2
    const cy = size * 0.42
    ctx.fillStyle = c.gold
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a - 0.12) * 34, cy + Math.sin(a - 0.12) * 34)
      ctx.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62)
      ctx.lineTo(cx + Math.cos(a + 0.12) * 34, cy + Math.sin(a + 0.12) * 34)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(cx, cy, 32, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = c.crimsonDeep
    ctx.fillRect(40, size * 0.8, size - 80, 8)
  })
}
