// Which overlay each level phase shows, and the events that move the machine along.
import { useCallback, useEffect } from 'react'
import { DIALOGUE, type DialogueKey } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { worldStore } from '@systems/world'
import { DialoguePanel } from './DialoguePanel'
import { EndingScreen } from './EndingScreen'
import { Hud } from './Hud'
import { LoadingScreen } from './LoadingScreen'
import { PauseMenu } from './PauseMenu'
import { QuizPanel } from './QuizPanel'
import { ResultPanel } from './ResultPanel'
import { useGame, useWorld } from './use-game'

function Narration({ dialogueKey, event }: { dialogueKey: string; event: 'INTRO_DONE' | 'NEXT' }) {
  const onDone = useCallback(() => gameStore.getState().dispatch(event), [event])
  return <DialoguePanel key={dialogueKey} speech={DIALOGUE[dialogueKey as DialogueKey]} onDone={onDone} />
}

function TalkOverlay({ dialogueKey }: { dialogueKey: DialogueKey }) {
  const onDone = useCallback(() => {
    worldStore.getState().openDialogue(null)
    gameStore.getState().progress({ kind: 'talk', dialogueKey })
  }, [dialogueKey])
  return <DialoguePanel key={dialogueKey} speech={DIALOGUE[dialogueKey]} onDone={onDone} />
}

/** Escape opens/closes the pause menu — only while actually playing with no dialogue open, so
 * it never fights DialoguePanel's own Escape-to-skip handler. */
function usePauseToggle(active: boolean) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') worldStore.getState().setPaused(!worldStore.getState().paused)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}

export function Flow() {
  const phase = useGame((s) => s.phase)
  const level = useGame((s) => s.level)
  const talk = useWorld((s) => s.dialogue)
  const paused = useWorld((s) => s.paused)
  const def = levelDef(level)
  usePauseToggle(phase === 'play' && !talk)
  switch (phase) {
    case 'loading':
      return <LoadingScreen />
    case 'intro':
      return <Narration dialogueKey={def.introKey} event="INTRO_DONE" />
    case 'play':
      return (
        <>
          <Hud bow={def.bow} />
          {talk && <TalkOverlay dialogueKey={talk} />}
          {paused && <PauseMenu />}
        </>
      )
    case 'quiz':
      return <QuizPanel />
    case 'transition':
      return <Narration dialogueKey={def.outroKey} event="NEXT" />
    case 'complete':
      return <EndingScreen />
    default:
      return <ResultPanel />
  }
}
