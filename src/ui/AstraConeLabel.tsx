// While Manavastra charges with Maricha on the field: whether he stands in the wind's path. A wasted charge on L5 cannot
// be recovered, so the answer is in words as well as the green cone on the ground (render/astra-aim.ts).
import { CONTROLS_TEXT as T } from '@data/controls-text'
import { useWorld } from './use-game'

export function AstraConeLabel() {
  const maricha = useWorld((s) => s.astraMaricha)
  if (!maricha) return null
  return (
    <div className={`astra-cone-label astra-cone-label--${maricha}`} data-testid="astra-cone-label" data-state={maricha} role="status">
      {T[maricha === 'in' ? 'astra.cone.in' : 'astra.cone.out']}
    </div>
  )
}
