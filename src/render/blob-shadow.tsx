// A soft disc under each character. No shadow maps on the low tier, and this reads fine on both.
import { CanvasTexture } from 'three'
import { BALANCE } from '@data/balance'

let texture: CanvasTexture | null = null
const SIZE = 64

function blobTexture(): CanvasTexture {
  if (texture) return texture
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(BALANCE.render.BLOB_SOFTNESS, `rgba(0,0,0,${BALANCE.render.BLOB_SOFTNESS})`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
  texture = new CanvasTexture(canvas)
  return texture
}

export function BlobShadow({ radius = BALANCE.render.BLOB_RADIUS }: { radius?: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={BALANCE.render.BLOB_LIFT} renderOrder={-1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={blobTexture()} transparent opacity={BALANCE.render.BLOB_OPACITY} depthWrite={false} />
    </mesh>
  )
}
