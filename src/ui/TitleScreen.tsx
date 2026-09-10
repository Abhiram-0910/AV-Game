// Shown before a level mounts, so no assets load until the player actually starts.
// Begin (fresh save) or Continue/New Game (existing progress), Story Scroll, Settings.
import { useState } from 'react'
import { UI } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { CodexPanel } from './CodexPanel'
import { SettingsPanel } from './SettingsPanel'
import { screenStore } from './screen-store'
import { useGame } from './use-game'

type View = 'menu' | 'settings' | 'codex' | 'confirmNewGame'

function newGame() {
  gameStore.getState().reset()
  screenStore.getState().setScreen('game')
}

export function TitleScreen() {
  const [view, setView] = useState<View>('menu')
  const completed = useGame((s) => s.completed)
  const hasProgress = completed.length > 0

  if (view === 'settings') return <SettingsPanel onBack={() => setView('menu')} />
  if (view === 'codex') return <CodexPanel onBack={() => setView('menu')} />
  if (view === 'confirmNewGame') {
    return (
      <div className="screen" data-testid="title">
        <p>{UI['menu.confirmNewGame']}</p>
        <div className="title-actions">
          <button type="button" className="btn" data-testid="title-confirm-yes" onClick={newGame} autoFocus>
            {UI['menu.yes']}
          </button>
          <button type="button" className="btn" onClick={() => setView('menu')}>
            {UI['menu.no']}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="screen" data-testid="title">
      <h1>{UI['app.title']}</h1>
      <div className="title-actions">
        {hasProgress ? (
          <>
            <button type="button" className="btn" data-testid="title-continue" onClick={() => screenStore.getState().setScreen('game')} autoFocus>
              {UI['menu.continue']}
            </button>
            <button type="button" className="btn" data-testid="title-new-game" onClick={() => setView('confirmNewGame')}>
              {UI['menu.newGame']}
            </button>
          </>
        ) : (
          <button type="button" className="btn" data-testid="title-start" onClick={newGame} autoFocus>
            {UI['menu.start']}
          </button>
        )}
        <button type="button" className="btn" data-testid="title-codex" onClick={() => setView('codex')}>
          {UI['menu.codex']}
        </button>
        <button type="button" className="btn" data-testid="title-settings" onClick={() => setView('settings')}>
          {UI['menu.settings']}
        </button>
      </div>
    </div>
  )
}
