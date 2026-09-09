// Which overlay each level phase shows, and the events that move the machine along.
import { useCallback, useEffect } from 'react'
import { DIALOGUE, type DialogueKey } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { worldStore } from '@systems/world'
import { DialoguePanel } from './DialoguePanel'
import { Hud } from './Hud'
import { LoadingScreen } from './LoadingScreen'
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

function QuizAutoPass() {
  // ponytail: quiz UI is pass 3; the gate auto-passes and records no score.
  useEffect(() => {
    gameStore.getState().dispatch('QUIZ_DONE')
  }, [])
  return null
}

export function Flow() {
  const phase = useGame((s) => s.phase)
  const level = useGame((s) => s.level)
  const talk = useWorld((s) => s.dialogue)
  const def = levelDef(level)
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
        </>
      )
    case 'quiz':
      return <QuizAutoPass />
    case 'transition':
      return <Narration dialogueKey={def.outroKey} event="NEXT" />
    default:
      return <ResultPanel />
  }
}
