// Draw charge on the fixed tick. Pure.
import { BALANCE } from '@data/balance'

export interface DrawState {
  drawing: boolean
  ticks: number
}

export const NO_DRAW: DrawState = { drawing: false, ticks: 0 }

export function isDrawing(s: DrawState): boolean {
  return s.drawing
}

export function drawFraction(s: DrawState): number {
  return Math.min(1, s.ticks / BALANCE.arrow.DRAW_TICKS)
}

/** Advance one tick with the button held (held=true) or released. Returns the state and, on release, the shot fraction or null if too weak. */
export function stepDraw(s: DrawState, held: boolean): { state: DrawState; released: number | null } {
  if (held) return { state: { drawing: true, ticks: s.drawing ? s.ticks + 1 : 1 }, released: null }
  if (!s.drawing) return { state: NO_DRAW, released: null }
  const f = drawFraction(s)
  return { state: NO_DRAW, released: f >= BALANCE.arrow.MIN_DRAW ? f : null }
}
