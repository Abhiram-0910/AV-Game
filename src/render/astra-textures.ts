// Canvas textures for the astra's sequence: a soft cloud puff for the gathering storm and a round soft dot for glow,
// sparks, dust and gale streaks. Seeded, so every run and screenshot matches. The caller disposes them.
import type { CanvasTexture } from 'three'
import { canvasTexture, seeded } from './procedural-textures'

export function cloudTexture(): CanvasTexture {
  return canvasTexture(256, (ctx, w, h) => {
    const rand = seeded(7)
    for (let i = 0; i < 26; i += 1) {
      const x = w * (0.18 + 0.64 * rand())
      const y = h * (0.35 + 0.32 * rand())
      const r = w * (0.08 + 0.13 * rand())
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(255,255,255,0.5)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  })
}

export function softDotTexture(): CanvasTexture {
  return canvasTexture(64, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, w)
  })
}
