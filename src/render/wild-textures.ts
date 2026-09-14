// Canvas textures for the outdoor levels (render/wilds-dressing.ts, render/range-dressing.ts). Same rules as
// procedural-textures.ts: seeded so every screenshot matches, painted at runtime, disposed by the caller.
import { type CanvasTexture, ClampToEdgeWrapping } from 'three'
import { canvasTexture, seeded } from './procedural-textures'

function clamped(t: CanvasTexture): CanvasTexture {
  t.wrapS = t.wrapT = ClampToEdgeWrapping
  return t
}

/** A tuft of curved blades on transparent ground (root at v 0), in greys: instance colour gives the hue. */
export function grassTexture(): CanvasTexture {
  const rand = seeded(21)
  return clamped(
    canvasTexture(128, (ctx, s) => {
      for (let i = 0; i < 28; i += 1) {
        const x = s * (0.15 + rand() * 0.7)
        const lean = (rand() - 0.5) * s * 0.5
        const h = s * (0.4 + rand() * 0.58)
        const w = 2 + rand() * 4
        const v = Math.round(150 + rand() * 105)
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.beginPath()
        ctx.moveTo(x - w, s)
        ctx.quadraticCurveTo(x + lean * 0.3, s - h * 0.6, x + lean, s - h)
        ctx.quadraticCurveTo(x + lean * 0.3 + w * 0.4, s - h * 0.6, x + w, s)
        ctx.fill()
      }
    }),
  )
}

/** Soft white cloud blobs with alpha, wrapped so the tile repeats: ground mist. */
export function mistTexture(): CanvasTexture {
  const rand = seeded(31)
  return canvasTexture(256, (ctx, s) => {
    for (let i = 0; i < 70; i += 1) {
      const x = rand() * s
      const y = rand() * s
      const r = 18 + rand() * 60
      for (const dx of [-s, 0, s])
        for (const dy of [-s, 0, s]) {
          const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
          g.addColorStop(0, 'rgba(255,255,255,0.22)')
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = g
          ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
        }
    }
  })
}

/** Water surface: grey with pale and dark streaks along u, multiplied into the water colour and scrolled. */
export function rippleTexture(): CanvasTexture {
  const rand = seeded(41)
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#c4c4c4'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 160; i += 1) {
      const x = rand() * s
      const y = rand() * s
      ctx.fillStyle = rand() > 0.45 ? 'rgba(255,255,255,0.4)' : 'rgba(70,70,70,0.25)'
      const rx = 6 + rand() * 26
      const ry = 0.8 + rand() * 2.2
      for (const dx of [-s, 0, s]) {
        ctx.beginPath()
        ctx.ellipse(x + dx, y, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

/** Straw or thatch: fibres of two shades over a base, running along v (`alongV`) or u, with tie bands across. */
export function fibreTexture(base: string, dark: string, light: string, alongV: boolean, bands: readonly number[]): CanvasTexture {
  const rand = seeded(51)
  return canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, s, s)
    ctx.lineWidth = 1.5
    for (let i = 0; i < 420; i += 1) {
      const a = rand() * s
      const b = rand() * s
      const len = 10 + rand() * 30
      ctx.strokeStyle = rand() > 0.5 ? dark : light
      ctx.globalAlpha = 0.35 + rand() * 0.4
      ctx.beginPath()
      if (alongV) {
        ctx.moveTo(a, b)
        ctx.lineTo(a + (rand() - 0.5) * 4, b + len)
      } else {
        ctx.moveTo(a, b)
        ctx.lineTo(a + len, b + (rand() - 0.5) * 4)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = dark
    for (const f of bands) {
      if (alongV) ctx.fillRect(0, f * s - 2, s, 4)
      else ctx.fillRect(f * s - 2, 0, 4, s)
    }
  })
}

/** A pennant: saffron cloth with a gold hem along both long edges and a gold sleeve at the hoist (u 0). */
export function pennantTexture(cloth: string, hem: string): CanvasTexture {
  return clamped(
    canvasTexture(128, (ctx, s) => {
      ctx.fillStyle = cloth
      ctx.fillRect(0, 0, s, s)
      ctx.fillStyle = hem
      ctx.fillRect(0, 0, s, s * 0.1)
      ctx.fillRect(0, s * 0.9, s, s * 0.1)
      ctx.fillRect(0, 0, s * 0.1, s)
    }),
  )
}
