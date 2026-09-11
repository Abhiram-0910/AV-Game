import { UI } from '@data/dialogue'
import { castAstra } from '@systems/astra/step'
import { world } from '@systems/world'
import { useGame, useWorld } from './use-game'

export function AstraButton() {
  const level = useGame((s) => s.level)
  const astraCharges = useGame((s) => s.astraCharges)
  const astraReady = useWorld((s) => s.astraReady)

  const show = (level === 'l4' && astraReady) || (level === 'l5' && astraCharges > 0)
  if (!show) return null

  const handlePointerDown = () => {
    world.astraButtonHeld = true
  }

  const handlePointerUp = () => {
    world.astraButtonHeld = false
  }

  const handleClick = () => {
    castAstra()
  }

  return (
    <button
      type="button"
      className="hud-astra-btn"
      data-testid="hud-astra-btn"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
      aria-label={UI['hud.astra']}
    >
      <div className="hud-astra-icon">🔥</div>
      <div className="hud-astra-details">
        <span className="hud-astra-title">{UI['hud.astra']}</span>
        <span className="hud-astra-key">[Space] / [Q]</span>
      </div>
    </button>
  )
}
