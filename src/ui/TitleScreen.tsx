// Shown before a level mounts, so no assets load until the player actually starts.
// Begin (fresh save) or Continue/New Game (existing progress), Story Scroll, Settings.
import { useState } from 'react'
import { UI } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { playAudio } from '@systems/audio'
import { CodexPanel } from './CodexPanel'
import { SettingsPanel } from './SettingsPanel'
import { screenStore } from './screen-store'
import { useGame } from './use-game'
import { Panel } from './Frame'

type View = 'menu' | 'settings' | 'codex' | 'confirmNewGame'

function newGame() {
  playAudio('button_click')
  gameStore.getState().reset()
  screenStore.getState().setScreen('game')
}

function ConfirmNewGameModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="screen" data-testid="title">
      <Panel>
        <p>{UI['menu.confirmNewGame']}</p>
        <div className="title-actions">
          <button type="button" className="btn" data-testid="title-confirm-yes" onClick={onConfirm} autoFocus>
            {UI['menu.yes']}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            {UI['menu.no']}
          </button>
        </div>
      </Panel>
    </div>
  )
}

function TitleMenuActions({
  hasProgress,
  onStart,
  onContinue,
  onNewGame,
  onCodex,
  onSettings,
}: {
  hasProgress: boolean
  onStart: () => void
  onContinue: () => void
  onNewGame: () => void
  onCodex: () => void
  onSettings: () => void
}) {
  return (
    <div className="title-actions">
      {hasProgress ? (
        <>
          <button type="button" className="btn" data-testid="title-continue" onClick={onContinue} autoFocus>
            {UI['menu.continue']}
          </button>
          <button type="button" className="btn" data-testid="title-new-game" onClick={onNewGame}>
            {UI['menu.newGame']}
          </button>
        </>
      ) : (
        <button type="button" className="btn" data-testid="title-start" onClick={onStart} autoFocus>
          {UI['menu.start']}
        </button>
      )}
      <button type="button" className="btn" data-testid="title-codex" onClick={onCodex}>
        {UI['menu.codex']}
      </button>
      <button type="button" className="btn" data-testid="title-settings" onClick={onSettings}>
        {UI['menu.settings']}
      </button>
    </div>
  )
}

export function TitleScreen() {
  const [view, setView] = useState<View>('menu')
  const completed = useGame((s) => s.completed)
  const hasProgress = completed.length > 0

  const nav = (v: View) => {
    playAudio('button_click')
    setView(v)
  }

  const continueGame = () => {
    playAudio('button_click')
    screenStore.getState().setScreen('game')
  }

  if (view === 'settings') return <SettingsPanel onBack={() => nav('menu')} />
  if (view === 'codex') return <CodexPanel onBack={() => nav('menu')} />
  if (view === 'confirmNewGame') return <ConfirmNewGameModal onConfirm={newGame} onCancel={() => nav('menu')} />

  return (
    <div className="screen" data-testid="title">
      <Panel>
        <h1>{UI['app.title']}</h1>
        <TitleMenuActions
          hasProgress={hasProgress}
          onStart={newGame}
          onContinue={continueGame}
          onNewGame={() => nav('confirmNewGame')}
          onCodex={() => nav('codex')}
          onSettings={() => nav('settings')}
        />
      </Panel>
    </div>
  )
}
