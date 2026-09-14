// Draw feedback at the cursor, which is where the bow aims (FollowCamera casts the cursor ray). Nothing sits at the
// screen centre: the follow camera looks at Rama's shoulders, so the old fixed reticle sat on his back all level.
// The lock reticle shows only while the drawn arc lands on a target; the gauge only while drawing.
import { useEffect, useRef } from 'react'
import { BALANCE } from '@data/balance'
import { useWorld } from './use-game'

/** Tracked from load, not from mount, so the first draw after a dialogue already knows where the cursor is. */
const cursor = { x: 0, y: 0 }
if (typeof window !== 'undefined') {
  cursor.x = window.innerWidth / 2
  cursor.y = window.innerHeight / 2
  window.addEventListener('mousemove', (e) => {
    cursor.x = e.clientX
    cursor.y = e.clientY
  })
}

function useFollowCursor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const place = () => {
      if (!ref.current) return
      ref.current.style.left = `${cursor.x}px`
      ref.current.style.top = `${cursor.y}px`
    }
    place()
    window.addEventListener('mousemove', place)
    return () => window.removeEventListener('mousemove', place)
  }, [])
  return ref
}

function LockReticle() {
  return (
    <svg className="crosshair-reticle" data-testid="crosshair-reticle" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="2.5" fill="currentColor" />
      <path
        d="M 20,24 L 20,20 L 24,20 M 44,20 L 44,24 L 40,24 M 20,40 L 20,44 L 24,44 M 44,44 L 44,40 L 40,40"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HitMarkerSvg({ hitFeedback }: { hitFeedback: 'enemy' | 'target' | null }) {
  if (!hitFeedback) return null
  return (
    <svg
      className={`crosshair-hitmarker crosshair-hitmarker--${hitFeedback}`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-testid="crosshair-hitmarker"
    >
      <line x1="22" y1="22" x2="27" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="22" x2="37" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="42" x2="27" y2="37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="42" x2="37" y2="37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function DrawGaugeMeter({ isDrawing, drawStrength }: { isDrawing: boolean; drawStrength: number }) {
  const pct = Math.min(100, Math.round(drawStrength * 100))
  const isReady = drawStrength >= BALANCE.archery.MIN_DRAW
  const isFull = drawStrength >= 1

  return (
    <div
      className={`draw-gauge ${isDrawing ? 'draw-gauge--active' : ''}`}
      data-testid="draw-gauge"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="draw-gauge-bar" style={{ width: BALANCE.archery.GAUGE_WIDTH }}>
        <div
          className={`draw-gauge-fill ${isFull ? 'draw-gauge-fill--full' : isReady ? 'draw-gauge-fill--ready' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Crosshair() {
  const ref = useFollowCursor()
  const isDrawing = useWorld((s) => s.isDrawing)
  const hasTarget = useWorld((s) => s.hasTarget)
  const drawStrength = useWorld((s) => s.drawStrength)
  const hitFeedback = useWorld((s) => s.hitFeedback)

  const hitClass =
    hitFeedback === 'enemy' ? 'crosshair--hit-enemy' : hitFeedback === 'target' ? 'crosshair--hit-target' : ''

  return (
    <div
      ref={ref}
      className={`crosshair ${isDrawing ? 'crosshair--drawing' : ''} ${hasTarget ? 'crosshair--target' : ''} ${hitClass}`}
      data-testid="crosshair"
      data-state={hasTarget ? 'target' : isDrawing ? 'drawing' : 'idle'}
      data-target-locked={hasTarget ? 'true' : 'false'}
      data-drawing={isDrawing ? 'true' : 'false'}
      data-hit-feedback={hitFeedback ?? 'none'}
    >
      {isDrawing && hasTarget && <LockReticle />}
      <HitMarkerSvg hitFeedback={hitFeedback} />
      <DrawGaugeMeter isDrawing={isDrawing} drawStrength={drawStrength} />
    </div>
  )
}
