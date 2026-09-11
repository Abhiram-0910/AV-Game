// Level complete (with the codex unlock) or try again. Continue drives the level machine.
// Phase 'complete' (after the last level) is EndingScreen instead — level-machine.ts gives it
// no further transition, so a "Continue" button here would be a dead end.
import { CODEX } from '@data/codex'
import { UI } from '@data/dialogue'
import { codexUnlockedBy } from '@core/progression'
import { playAudio } from '@systems/audio'
import { useGame } from './use-game'

export function ResultPanel() {
  const phase = useGame((s) => s.phase)
  const level = useGame((s) => s.level)
  const dispatch = useGame((s) => s.dispatch)
  const won = phase === 'win'
  const card = CODEX.find((c) => c.id === codexUnlockedBy(level))
  return (
    <div className="screen" data-testid="result">
      <h1 data-testid="result-title">{won ? UI['result.win'] : UI['result.fail']}</h1>
      {won && card && (
        <div className="codex-unlock" data-testid="codex-unlock">
          <span className="hud-label">{UI['codex.unlocked']}</span>
          <strong>{card.title}</strong>
        </div>
      )}
      <button
        type="button"
        className="btn"
        data-testid="result-continue"
        onClick={() => {
          playAudio('button_click')
          dispatch(won ? 'NEXT' : 'RETRY')
        }}
        autoFocus
      >
        {won ? UI['result.next'] : UI['result.retry']}
      </button>
    </div>
  )
}
