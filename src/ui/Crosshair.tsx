// Screen-center aiming crosshair and draw strength gauge feedback for archery.
import { BALANCE } from '@data/balance'
import { useWorld } from './use-game'

function ReticleSvg({ hasTarget }: { hasTarget: boolean }) {
  const bracketPath = hasTarget
    ? 'M 20,24 L 20,20 L 24,20 M 44,20 L 44,24 L 40,24 M 20,40 L 20,44 L 24,44 M 44,44 L 44,40 L 40,40'
    : 'M 18,26 L 18,18 L 26,18 M 46,18 L 46,26 L 38,26 M 18,38 L 18,46 L 26,46 M 46,46 L 46,38 L 38,38'

  return (
    <svg className="crosshair-reticle" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="2.5" fill="currentColor" />
      <line x1="32" y1="12" x2="32" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="42" x2="32" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="32" x2="22" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="32" x2="52" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d={bracketPath}
        stroke="currentColor"
        strokeWidth={hasTarget ? 2.5 : 1.5}
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
  const isDrawing = useWorld((s) => s.isDrawing)
  const hasTarget = useWorld((s) => s.hasTarget)
  const drawStrength = useWorld((s) => s.drawStrength)
  const hitFeedback = useWorld((s) => s.hitFeedback)

  const hitClass =
    hitFeedback === 'enemy' ? 'crosshair--hit-enemy' : hitFeedback === 'target' ? 'crosshair--hit-target' : ''

  return (
    <div
      className={`crosshair ${isDrawing ? 'crosshair--drawing' : ''} ${hasTarget ? 'crosshair--target' : ''} ${hitClass}`}
      data-testid="crosshair"
      data-state={hasTarget ? 'target' : isDrawing ? 'drawing' : 'idle'}
      data-target-locked={hasTarget ? 'true' : 'false'}
      data-drawing={isDrawing ? 'true' : 'false'}
      data-hit-feedback={hitFeedback ?? 'none'}
    >
      <ReticleSvg hasTarget={hasTarget} />
      <HitMarkerSvg hitFeedback={hitFeedback} />
      <DrawGaugeMeter isDrawing={isDrawing} drawStrength={drawStrength} />
    </div>
  )
}
