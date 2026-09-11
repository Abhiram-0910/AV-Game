import { UI } from '@data/dialogue'
import type { AstraId } from '@core/save'
import { castAstra } from '@systems/astra/step'
import { world } from '@systems/world'
import { useGame, useWorld } from './use-game'

interface TabProps {
  id: AstraId
  active: boolean
  label: string
  hotkey: string
  onSelect: (id: AstraId) => void
}

function AstraTabItem({ id, active, label, hotkey, onSelect }: TabProps) {
  return (
    <button
      type="button"
      className={`hud-astra-tab ${active ? 'active' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
    >
      [{hotkey}] {label}
    </button>
  )
}

export function AstraButton() {
  const level = useGame((s) => s.level)
  const astraCharges = useGame((s) => s.astraCharges)
  const astraReady = useWorld((s) => s.astraReady)
  const unlockedAstras = useGame((s) => s.unlockedAstras)
  const selectedAstra = useGame((s) => s.selectedAstra)
  const selectAstra = useGame((s) => s.selectAstra)

  const show = (level === 'l4' && astraReady) || (level === 'l5' && astraCharges > 0)
  if (!show) return null

  const isManava = selectedAstra === 'manavastra'
  const title = isManava ? UI['hud.manavastra'] : (selectedAstra === 'agneyastra' ? UI['hud.agneyastra'] : UI['hud.astra'])
  const icon = isManava ? '💨' : '🔥'

  return (
    <div className="hud-astra-container">
      {unlockedAstras.length > 1 && (
        <div className="hud-astra-tabs">
          <AstraTabItem id="agneyastra" active={selectedAstra === 'agneyastra'} label={UI['hud.agneyastra']} hotkey="1" onSelect={selectAstra} />
          <AstraTabItem id="manavastra" active={selectedAstra === 'manavastra'} label={UI['hud.manavastra']} hotkey="2" onSelect={selectAstra} />
        </div>
      )}
      <button
        type="button"
        className="hud-astra-btn"
        data-testid="hud-astra-btn"
        onPointerDown={() => { world.astraButtonHeld = true }}
        onPointerUp={() => { world.astraButtonHeld = false }}
        onPointerLeave={() => { world.astraButtonHeld = false }}
        onClick={() => {
          world.astraButtonHeld = false
          castAstra(world.tick)
        }}
        aria-label={title}
      >
        <div className="hud-astra-icon">{icon}</div>
        <div className="hud-astra-details">
          <span className="hud-astra-title">{title}</span>
          <span className="hud-astra-key">[Space] / [Q]</span>
        </div>
      </button>
    </div>
  )
}
