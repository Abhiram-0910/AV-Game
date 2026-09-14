// Canvas textures for palace.glb's repainted shell (render/palace-surface.ts), in the language of Rajput court
// interiors: coral plaster under fine white floral stencil, painted multifoil niches, coffered ceilings with a
// stencilled medallion, a gilded ceiling over the throne bay, and sandstone. Seeded; the caller disposes.
import { type CanvasTexture, NoColorSpace } from 'three'
import { COURT } from '@data/scenery'
import { multifoil } from './multifoil'
import { canvasTexture, seeded } from './procedural-textures'
import { normalFromHeight } from './surface-maps'

type Ctx = CanvasRenderingContext2D
const P = COURT.palette
const S = COURT.surface

function flower(ctx: Ctx, x: number, y: number, r: number, petals = 5): void {
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.24, a, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** An S-scroll stem with three leaves and a flower at its tip. */
function vine(ctx: Ctx, x: number, y: number, len: number, ang: number, curl: number): void {
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  const k = len * 0.3 * curl
  const at = (t: number, side: number): [number, number] => [x + dx * len * t - dy * k * side, y + dy * len * t + dx * k * side]
  const [c1x, c1y] = at(0.33, 1)
  const [c2x, c2y] = at(0.66, -1)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x + dx * len, y + dy * len)
  ctx.stroke()
  for (const [t, side] of [[0.3, 1], [0.55, -1], [0.8, 1]]) {
    const [lx, ly] = at(t, side * 0.45)
    ctx.beginPath()
    ctx.ellipse(lx, ly, len * 0.11, len * 0.04, ang + side * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  flower(ctx, x + dx * len, y + dy * len, len * 0.14)
}

/** All-over stencil: a jittered grid of small flowers and scrolls. */
export function stencilField(ctx: Ctx, rand: () => number, x: number, y: number, w: number, h: number, step: number): void {
  ctx.lineWidth = 2
  for (let gy = y + step / 2; gy < y + h + step; gy += step)
    for (let gx = x + step / 2; gx < x + w + step; gx += step) {
      const jx = gx + (rand() - 0.5) * step * 0.4
      const jy = gy + (rand() - 0.5) * step * 0.4
      if (rand() < 0.4) flower(ctx, jx, jy, step * (0.16 + rand() * 0.08))
      else vine(ctx, jx - step * 0.25, jy, step * (0.55 + rand() * 0.25), rand() * Math.PI * 2, rand() > 0.5 ? 1 : -1)
    }
}

export function mottle(ctx: Ctx, rand: () => number, w: number, h: number): void {
  for (let i = 0; i < 160; i += 1) {
    ctx.globalAlpha = 0.03 + rand() * 0.05
    ctx.fillStyle = rand() > 0.5 ? '#000000' : '#ffffff'
    ctx.beginPath()
    ctx.arc(rand() * w, rand() * h, 20 + rand() * 90, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Terracotta dado from the floor to 0.62 m: white rules and a chain of lozenges, eight to a tile. */
function paintDado(ctx: Ctx, w: number, yAt: (m: number) => number, m: number): void {
  ctx.fillStyle = P.terracotta
  ctx.fillRect(0, yAt(0.62), w, 0.62 * m)
  ctx.fillStyle = ctx.strokeStyle = P.stencil
  for (const [y, t] of [[0.62, 6], [0.55, 3], [0.1, 3]]) ctx.fillRect(0, yAt(y), w, t)
  ctx.lineWidth = 3
  for (let i = 0; i < 8; i += 1) {
    const x = (i + 0.5) * (w / 8)
    const y = yAt(0.33)
    ctx.beginPath()
    ctx.moveTo(x, y - 0.17 * m)
    ctx.lineTo(x + 0.1 * m, y)
    ctx.lineTo(x, y + 0.17 * m)
    ctx.lineTo(x - 0.1 * m, y)
    ctx.closePath()
    ctx.stroke()
    flower(ctx, x, y, 0.06 * m, 6)
    flower(ctx, i * (w / 8), y, 0.03 * m, 4)
  }
}

/** A flowering sprig in a vase, standing in the niche. */
function sprig(ctx: Ctx, x: number, base: number, top: number): void {
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x, base - 30)
  ctx.lineTo(x, top)
  ctx.stroke()
  for (let y = base - 70, i = 0; y > top + 40; y -= 58, i += 1) {
    vine(ctx, x, y, 74 - i * 5, -Math.PI / 4, 1)
    vine(ctx, x, y, 74 - i * 5, (-3 * Math.PI) / 4, -1)
  }
  flower(ctx, x, top, 26, 8)
  ctx.beginPath()
  ctx.ellipse(x, base - 12, 34, 22, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Double-ruled panel over the field, a painted multifoil niche in it, stencil everywhere outside the niche. */
function paintPanel(ctx: Ctx, rand: () => number, w: number, yAt: (m: number) => number, m: number): void {
  const [x0, x1, top, bottom] = [0.14 * m, w - 0.14 * m, yAt(3.1), yAt(0.74)]
  ctx.strokeStyle = ctx.fillStyle = P.stencil
  ctx.lineWidth = 7
  ctx.strokeRect(x0, top, x1 - x0, bottom - top)
  ctx.lineWidth = 3
  ctx.strokeRect(x0 + 16, top + 16, x1 - x0 - 32, bottom - top - 32)
  const cx = w / 2
  const [half, spring, base] = [0.6 * m, yAt(2.05), yAt(0.9)]
  const niche = (): void => {
    ctx.moveTo(cx - half, base)
    for (const [x, y] of multifoil(half, 0.66 * m, 7)) ctx.lineTo(cx + x, spring - y)
    ctx.lineTo(cx + half, base)
    ctx.closePath()
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 + 24, top + 24, x1 - x0 - 48, bottom - top - 48)
  niche()
  ctx.clip('evenodd')
  stencilField(ctx, rand, x0, top, x1 - x0, bottom - top, 44)
  ctx.restore()
  ctx.beginPath()
  niche()
  ctx.lineWidth = 12
  ctx.stroke()
  ctx.strokeStyle = P.coral
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.strokeStyle = P.stencil
  sprig(ctx, cx, base, spring - 0.3 * m)
}

/** One wall tile: `wallTileM` wide, floor (v 0) to soffit (v 1). Canvas is non-square so motifs stay round. */
export function wallTexture(): CanvasTexture {
  const rand = seeded(61)
  const width = 1024
  const m = width / S.wallTileM
  const height = Math.round(S.wallTileH * m)
  return canvasTexture(
    width,
    (ctx, w, h) => {
      const yAt = (metres: number) => h - metres * m
      ctx.fillStyle = P.coral
      ctx.fillRect(0, 0, w, h)
      mottle(ctx, rand, w, h)
      paintDado(ctx, w, yAt, m)
      paintPanel(ctx, rand, w, yAt, m)
      ctx.fillStyle = P.stencil
      for (const y of [3.36, 3.18]) ctx.fillRect(0, yAt(y), w, 4)
      for (let i = 0; i < 16; i += 1) flower(ctx, (i + 0.5) * (w / 16), yAt(3.27), 0.045 * m, i % 2 ? 4 : 6)
    },
    height,
  )
}

function medallion(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineWidth = 3
  for (let i = 0; i < 8; i += 1) {
    ctx.rotate(Math.PI / 4)
    vine(ctx, r * 0.22, 0, r * 0.62, -0.35, 1)
    vine(ctx, r * 0.22, 0, r * 0.62, 0.35, -1)
    flower(ctx, r * 0.95, 0, r * 0.12, 6)
  }
  ctx.restore()
  flower(ctx, cx, cy, r * 0.3, 8)
}

/** One coffer, `tileM` square: ruled borders, a stencilled band, a band of rosettes, a medallion in plain coral. */
export function ceilingTexture(): CanvasTexture {
  const rand = seeded(71)
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = P.coral
    ctx.fillRect(0, 0, s, s)
    mottle(ctx, rand, s, s)
    ctx.strokeStyle = ctx.fillStyle = P.stencil
    const rule = (inset: number, lw: number) => {
      ctx.lineWidth = lw
      ctx.strokeRect(inset, inset, s - inset * 2, s - inset * 2)
    }
    rule(8, 6)
    rule(24, 3)
    ctx.save()
    ctx.beginPath()
    ctx.rect(30, 30, s - 60, s - 60)
    ctx.rect(128, 128, s - 256, s - 256)
    ctx.clip('evenodd')
    stencilField(ctx, rand, 0, 0, s, s, 36)
    ctx.restore()
    rule(134, 3)
    rule(148, 6)
    for (let i = 0; i < 12; i += 1) {
      const t = 186 + (i * (s - 372)) / 11
      for (const [x, y] of [[t, 186], [t, s - 186], [186, t], [s - 186, t]]) flower(ctx, x, y, 16, 6)
    }
    rule(226, 3)
    medallion(ctx, s / 2, s / 2, s * 0.2)
  })
}

function paintGilded(ctx: Ctx, s: number, mask: boolean): void {
  const [ground, gold, lapis] = mask ? ['#000000', '#ffffff', '#000000'] : [P.crimsonDeep, P.gold, P.lapis]
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, s, s)
  const step = s / 4
  ctx.strokeStyle = ctx.fillStyle = gold
  ctx.lineWidth = 9
  for (let i = 0; i <= 4; i += 1)
    for (let j = 0; j <= 4; j += 1) {
      ctx.beginPath()
      ctx.arc(i * step, j * step, step * 0.5, 0, Math.PI * 2)
      ctx.stroke()
    }
  ctx.lineWidth = 3
  for (let i = 0; i < 4; i += 1)
    for (let j = 0; j < 4; j += 1) {
      const [cx, cy] = [(i + 0.5) * step, (j + 0.5) * step]
      for (let q = 0; q < 4; q += 1) vine(ctx, cx, cy, step * 0.3, (q * Math.PI) / 2 + Math.PI / 4, q % 2 ? 1 : -1)
      ctx.fillStyle = lapis
      flower(ctx, cx, cy, step * 0.15, 8)
      ctx.fillStyle = gold
      ctx.beginPath()
      ctx.arc(cx, cy, step * 0.04, 0, Math.PI * 2)
      ctx.fill()
    }
}

/** Gold lattice and filigree on deep crimson with lapis rosettes, plus its metalness mask (gold only). */
export function gildedTextures(): { map: CanvasTexture; metalness: CanvasTexture } {
  const metalness = canvasTexture(1024, (ctx, s) => paintGilded(ctx, s, true))
  metalness.colorSpace = NoColorSpace
  return { map: canvasTexture(1024, (ctx, s) => paintGilded(ctx, s, false)), metalness }
}

/** Pale pink-grey sandstone grain and bedding, and a normal map from the same canvas. */
export function sandstoneTextures(): { map: CanvasTexture; normal: CanvasTexture } {
  const rand = seeded(81)
  const map = canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = P.sandstone
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 6000; i += 1) {
      ctx.globalAlpha = 0.12 + rand() * 0.25
      ctx.fillStyle = rand() > 0.5 ? '#fff6ea' : '#7a5c48'
      ctx.fillRect(rand() * s, rand() * s, 1 + rand() * 2, 1 + rand() * 2)
    }
    ctx.globalAlpha = 0.1
    ctx.strokeStyle = '#6e5242'
    for (let i = 0; i < 7; i += 1) {
      const y = rand() * s
      ctx.lineWidth = 1 + rand() * 3
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(s * 0.3, y + rand() * 16 - 8, s * 0.7, y + rand() * 16 - 8, s, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
  return { map, normal: normalFromHeight(map.image as HTMLCanvasElement, 2.5) }
}
