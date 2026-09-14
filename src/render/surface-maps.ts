// Non-colour maps derived from a painted canvas. The strength is baked into the pixels: tierMaterial does not
// carry normalScale through.
import { CanvasTexture, NoColorSpace, RepeatWrapping } from 'three'

/** Tangent-space normal map from a canvas's luminance (Sobel, wrapped so a tiling source tiles). */
export function normalFromHeight(source: HTMLCanvasElement, strength: number): CanvasTexture {
  const w = source.width
  const h = source.height
  const px = source.getContext('2d')!.getImageData(0, 0, w, h).data
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i += 1) lum[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255
  const L = (x: number, y: number) => lum[((y + h) % h) * w + ((x + w) % w)]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const out = ctx.createImageData(w, h)
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const dx = L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1)
      const dy = L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1)
      // Canvas rows run down, texture v runs up (flipY), so the v gradient is −dy.
      const nx = -dx * strength
      const ny = dy * strength
      const len = Math.hypot(nx, ny, 1)
      const o = (y * w + x) * 4
      out.data[o] = (nx / len) * 127.5 + 127.5
      out.data[o + 1] = (ny / len) * 127.5 + 127.5
      out.data[o + 2] = (1 / len) * 127.5 + 127.5
      out.data[o + 3] = 255
    }
  ctx.putImageData(out, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = NoColorSpace
  return texture
}
