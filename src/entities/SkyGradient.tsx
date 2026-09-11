// Clean 2-stop/3-stop sky gradient background canvas texture with zero download cost.
import { useEffect, useMemo } from 'react'
import { CanvasTexture } from 'three'

interface SkyGradientProps {
  topColor?: string
  horizonColor?: string
  groundColor?: string
}

function createGradientTexture(topColor: string, horizonColor: string, groundColor: string): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, topColor)
  grad.addColorStop(0.65, horizonColor)
  grad.addColorStop(1, groundColor)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 2, 256)
  return new CanvasTexture(canvas)
}

export function SkyGradient({
  topColor = '#4a90e2',
  horizonColor = '#bfe0ff',
  groundColor = '#3a4a2a',
}: SkyGradientProps) {
  const texture = useMemo(
    () => createGradientTexture(topColor, horizonColor, groundColor),
    [topColor, horizonColor, groundColor],
  )

  useEffect(() => {
    return () => {
      texture?.dispose()
    }
  }, [texture])

  return texture ? <primitive object={texture} attach="background" /> : null
}
