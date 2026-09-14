// Escape during play pauses without touching the level phase machine (see systems/world.ts's
// `paused` flag and SimulationDriver's gate). Resume, restart the level, or back to the title.
import { useState } from 'react'
import { UI } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { worldStore } from '@systems/world'
import { CodexPanel } from './CodexPanel'
import { SettingsPanel } from './SettingsPanel'
import { screenStore } from './screen-store'
import { useGame } from './use-game'
import { Panel } from './Frame'

type View = 'menu' | 'settings' | 'codex'

function resume() {
  worldStore.getState().setPaused(false)
}

export function PauseMenu() {
  const [view, setView] = useState<View>('menu')
  const level = useGame((s) => s.level)

  if (view === 'settings') return <SettingsPanel onBack={() => setView('menu')} />
  if (view === 'codex') return <CodexPanel onBack={() => setView('menu')} />
  return (
    <div className="screen" data-testid="pause">
      <Panel>
        <h1>{UI['pause.title']}</h1>
        <div className="title-actions">
          <button type="button" className="btn" data-testid="pause-resume" onClick={resume} autoFocus>
            {UI['pause.resume']}
          </button>
          <button
            type="button"
            className="btn"
            data-testid="pause-restart"
            onClick={() => {
              resume()
              gameStore.getState().startLevel(level)
            }}
          >
            {UI['pause.restart']}
          </button>
          <button type="button" className="btn" onClick={() => setView('codex')}>
            {UI['menu.codex']}
          </button>
          <button type="button" className="btn" onClick={() => setView('settings')}>
            {UI['menu.settings']}
          </button>
          <button
            type="button"
            className="btn"
            data-testid="pause-menu"
            onClick={() => {
              resume()
              screenStore.getState().setScreen('title')
            }}
          >
            {UI['pause.menu']}
          </button>
        </div>
      </Panel>
    </div>
  )
}
