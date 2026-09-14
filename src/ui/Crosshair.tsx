// Draw feedback at the cursor, which is where the bow aims (FollowCamera casts the cursor ray). Nothing sits at the
// screen centre: the follow camera looks at Rama's shoulders, so the old fixed reticle sat on his back all level.
// The lock reticle shows only while the drawn arc lands on a target; the gauge only while drawing. Under pointer lock
// the cursor is FollowCamera's virtual one, so the position comes from the input adapter, not from mouse events.
import { useEffect, useRef, useState } from 'react'
import { BALANCE } from '@data/balance'
import { platform } from '@platform/index'
import { useWorld } from './use-game'

/** Follows the input adapter's cursor every frame (a mouse event only moves the real cursor); a style write only when it moved. */
function useFollowCursor() {
  const ref = useRef<HTMLDivElement>(null)
  const [locked, setLocked] = useState(platform.input.lock.locked())
  useEffect(() => platform.input.lock.onChange(() => setLocked(platform.input.lock.locked())), [])
  useEffect(() => {
    let frame = 0
    let last = ''
    const place = () => {
      const m = platform.input.mouse()
      const at = `${((m.x + 1) / 2) * window.innerWidth}px,${((1 - m.y) / 2) * window.innerHeight}px`
      if (ref.current && at !== last) {
        last = at
        const [left, top] = at.split(',')
        ref.current.style.left = left
        ref.current.style.top = top
      }
      frame = requestAnimationFrame(place)
    }
    place()
    return () => cancelAnimationFrame(frame)
  }, [])
  return { ref, locked }
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
  const { ref, locked } = useFollowCursor()
  const isDrawing = useWorld((s) => s.isDrawing)
  const hasTarget = useWorld((s) => s.hasTarget)
  const drawStrength = useWorld((s) => s.drawStrength)
  const hitFeedback = useWorld((s) => s.hitFeedback)
  const astraCharging = useWorld((s) => s.astraCharging)

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
      {locked && (isDrawing || astraCharging) && !hasTarget && <span className="crosshair-dot" data-testid="crosshair-dot" />}
      <HitMarkerSvg hitFeedback={hitFeedback} />
      <DrawGaugeMeter isDrawing={isDrawing} drawStrength={drawStrength} />
    </div>
  )
}
