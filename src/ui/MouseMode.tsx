// What the mouse is doing, always on screen in play: a chip that toggles look/aim ([M] does the same), the click-to-look
// overlay while look mode waits for its lock, and a one-time note when the computer blocks pointer lock.
import type { MouseEvent } from 'react'
import { UI as T } from '@data/dialogue'
import { platform } from '@platform/index'
import { type MouseModeView, toggleMouseMode, useMouseLook } from './use-mouse-look'

const LABEL: Record<MouseModeView, string> = {
  look: T['mouse.look'],
  'aim-auto': T['mouse.aiming'],
  aim: T['mouse.aim'],
  engage: T['mouse.look'],
  blocked: T['mouse.aim'],
}
const ICON: Record<MouseModeView, string> = { look: '🖱', 'aim-auto': '🎯', aim: '🎯', engage: '🖱', blocked: '🎯' }

/** A press on HUD controls must not also reach the window's listener, where it would draw the bow. */
const swallow = (e: MouseEvent) => e.stopPropagation()

export function MouseMode() {
  const { view, note, showOverlay } = useMouseLook()
  return (
    <>
      {showOverlay && (
        <div
          className="mouse-engage"
          data-testid="mouse-engage"
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            platform.input.lock.request()
          }}
        >
          <div className="mouse-engage-card">
            <span className="mouse-engage-icon" aria-hidden="true">
              🖱
            </span>
            <b>{T['mouse.engage.title']}</b>
            <small>{T['mouse.engage.hint']}</small>
          </div>
        </div>
      )}
      <button
        type="button"
        className={`mouse-mode mouse-mode--${view}`}
        data-testid="mouse-mode"
        data-mode={view}
        onMouseDown={swallow}
        onClick={(e) => {
          // Keep focus off the chip: Space is the astra key, and a focused button would toggle the mode instead.
          e.currentTarget.blur()
          toggleMouseMode()
        }}
      >
        <span aria-hidden="true">{ICON[view]}</span> {LABEL[view]} {view !== 'aim-auto' && <kbd>{T['mouse.key']}</kbd>}
      </button>
      {note && (
        <div className="mouse-blocked-note" data-testid="mouse-blocked-note" role="status">
          {T['mouse.blocked']}
        </div>
      )}
    </>
  )
}
