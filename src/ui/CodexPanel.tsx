// The Story Scroll: every codex card, locked ones shown as silhouettes. Reused from the
// title screen (review between sessions) and the pause menu.
import { useState } from 'react'
import { CODEX, type CodexId } from '@data/codex'
import { UI } from '@data/dialogue'
import { useGame } from './use-game'
import { Panel } from './Frame'

export function CodexPanel({ onBack }: { onBack: () => void }) {
  const unlocked = useGame((s) => s.codex)
  const [open, setOpen] = useState<CodexId | null>(null)
  const card = CODEX.find((c) => c.id === open)
  if (card) {
    return (
      <div className="codex" data-testid="codex-card">
        <Panel>
          <h2>{card.title}</h2>
          {card.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <button type="button" className="btn" onClick={() => setOpen(null)}>
            {UI['codex.close']}
          </button>
        </Panel>
      </div>
    )
  }
  return (
    <div className="codex" data-testid="codex">
      <Panel>
        <h2>{UI['codex.title']}</h2>
        <ul className="codex-list">
          {CODEX.map((c) => {
            const isUnlocked = unlocked.includes(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="btn btn-choice codex-entry"
                  disabled={!isUnlocked}
                  data-testid={`codex-entry-${c.id}`}
                  onClick={() => setOpen(c.id)}
                >
                  {isUnlocked ? c.title : UI['codex.locked']}
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn" data-testid="codex-back" onClick={onBack}>
          {UI['codex.close']}
        </button>
      </Panel>
    </div>
  )
}
