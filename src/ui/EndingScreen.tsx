// Shown once, after Level 5's win — phase 'complete' has no further transition in
// level-machine.ts, so unlike ResultPanel there is no "Continue"; only a way back to the title.
import { CODEX } from '@data/codex'
import { UI } from '@data/dialogue'
import { screenStore } from './screen-store'
import { useGame } from './use-game'
import { Panel } from './Frame'

export function EndingScreen() {
  const codex = useGame((s) => s.codex)
  return (
    <div className="screen" data-testid="ending">
      <Panel>
        <h1 data-testid="ending-title">{UI['result.complete']}</h1>
        <div className="codex-unlock" data-testid="ending-codex-count">
          <span className="hud-label">{UI['codex.title']}</span>
          <strong>
            {codex.length}/{CODEX.length}
          </strong>
        </div>
        <button type="button" className="btn" data-testid="ending-return" onClick={() => screenStore.getState().setScreen('title')} autoFocus>
          {UI['result.returnToTitle']}
        </button>
      </Panel>
    </div>
  )
}
