import { DIALOGUE, UI } from '@data/dialogue'
import { levelDef } from '@core/progression'
import { useGame, useWorld } from './use-game'

export function LoadingScreen() {
  const level = useGame((s) => s.level)
  const loaded = useWorld((s) => s.loaded)
  const expected = useWorld((s) => s.expected)
  const title = DIALOGUE[levelDef(level).titleKey as keyof typeof DIALOGUE].lines[0]
  const pct = expected > 0 ? Math.round((loaded / expected) * 100) : 0
  return (
    <div className="screen" data-testid="loading">
      <h1 data-testid="loading-title">{title}</h1>
      <p>
        {UI['loading.level']} {expected > 0 ? `${pct}%` : ''}
      </p>
      <div className="bar bar-wide">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
