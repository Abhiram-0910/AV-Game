// An arrow on the screen edge pointing at the active waypoint while it is off camera. Moved by writing style from a
// store subscription, not by re-rendering every frame; entities/WaypointMarker.tsx does the projection.
import { useEffect, useRef } from 'react'
import { type WaypointScreen, worldStore } from '@systems/world'

function place(el: HTMLDivElement, w: WaypointScreen | null): void {
  el.dataset.state = w === null ? 'none' : w.onScreen ? 'onscreen' : 'offscreen'
  if (w) el.style.transform = `translate(${w.x}px, ${w.y}px) rotate(${w.angle}rad)`
}

export function WaypointIndicator() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) place(ref.current, worldStore.getState().waypoint)
    return worldStore.subscribe((s, prev) => {
      if (ref.current && s.waypoint !== prev.waypoint) place(ref.current, s.waypoint)
    })
  }, [])
  return (
    <div ref={ref} className="waypoint-indicator" data-testid="waypoint-indicator" data-state="none" aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <path d="M 9,7 L 35,20 L 9,33 L 15,20 Z" fill="currentColor" />
      </svg>
    </div>
  )
}
