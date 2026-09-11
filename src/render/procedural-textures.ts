// Canvas textures painted at runtime: no download, no asset pipeline. The caller owns and
// disposes what it gets back. A seeded generator keeps every run (and every screenshot) identical.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

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
