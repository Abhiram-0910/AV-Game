// Mounts the court's primitive dressing (render/court-dressing.ts). High tier adds a warm,
// flickering point light over each brazier; low shows the emissive flames only.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { PointLight } from 'three'
import { COURT } from '@data/scenery'
import { buildCourt } from '@render/court-dressing'
import type { ResolvedTier } from '@render/manifest'

const T = COURT.torch

function TorchLights({ tips }: { tips: readonly [number, number, number][] }) {
  const lights = useRef<(PointLight | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * T.flickerHz
    lights.current.forEach((l, i) => {
      if (l) l.intensity = T.intensity * (1 + T.flickerAmount * Math.sin(t + i * 1.7) * Math.sin(t * 0.37 + i))
    })
  })
  return (
    <>
      {tips.map((p, i) => (
        <pointLight key={i} ref={(l) => void (lights.current[i] = l)} position={p} color={T.color} intensity={T.intensity} distance={T.distance} decay={T.decay} />
      ))}
    </>
  )
}

export function CourtDressing({ tier }: { tier: ResolvedTier }) {
  const court = useMemo(() => buildCourt(tier), [tier])
  useEffect(() => () => court.dispose(), [court])
  return (
    <>
      <primitive object={court.group} />
      {tier === 'high' && <TorchLights tips={court.torches} />}
    </>
  )
}
