// Which overlay each level phase shows, and the events that move the machine along.
import { useCallback, useEffect, useState } from 'react'
import { BALANCE } from '@data/balance'
import { DIALOGUE, type DialogueKey } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { lastAstraCastAt } from '@systems/astra/vfx-state'
import { worldStore } from '@systems/world'
import { DialoguePanel } from './DialoguePanel'
import { EndingScreen } from './EndingScreen'
import { Hud } from './Hud'
import { LoadingScreen } from './LoadingScreen'
import { PauseMenu } from './PauseMenu'
import { QuizPanel } from './QuizPanel'
import { ResultPanel } from './ResultPanel'
import { useGame, useWorld } from './use-game'
import { pausedByLockLoss } from './use-mouse-look'

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
      // A browser that drops the lock on Escape and also delivers the key would otherwise pause and resume at once.
      if (e.code === 'Escape' && !pausedByLockLoss(performance.now())) worldStore.getState().setPaused(!worldStore.getState().paused)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}

/** L4 is won in the astra's cast tick: keep the HUD (and the strike) on screen until the sky has mostly cleared. */
function ResultAfterAstra({ bow }: { bow: boolean }) {
  const wait = () => BALANCE.ui.RESULT_AFTER_ASTRA_MS - (performance.now() - lastAstraCastAt())
  const [ready, setReady] = useState(() => wait() <= 0)
  useEffect(() => {
    if (ready) return
    const id = setTimeout(() => setReady(true), wait())
    return () => clearTimeout(id)
  }, [ready])
  return ready ? <ResultPanel /> : <Hud bow={bow} />
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
      return <ResultAfterAstra bow={def.bow} />
  }
}
