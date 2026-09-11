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
