// Typewriter speech. Space or click finishes the line, then advances; Escape skips the speech.
import { useCallback, useEffect, useState } from 'react'
import { BALANCE } from '@data/balance'
import { UI, type Speech } from '@data/dialogue'
import { Frame } from './Frame'

interface Props {
  speech: Speech
  onDone(): void
}

interface LineProps {
  text: string
  onNext(): void
  onSkip(): void
}

const PORTRAIT_URLS: Record<string, string> = {
  rama: '/assets/portraits/rama.png',
  dasharatha: '/assets/portraits/dasharatha.png',
  vishwamitra: '/assets/portraits/vishwamitra.png',
  vasishtha: '/assets/portraits/vasishtha.png',
  lakshmana: '/assets/portraits/lakshmana.png',
}

function SpeakerPortrait({ speaker, name }: { speaker: string; name?: string }) {
  const [failed, setFailed] = useState(false)
  const src = PORTRAIT_URLS[speaker]
  if (!src || failed) return null

  return (
    <div className="dialogue-portrait-frame" data-testid="dialogue-portrait">
      <img
        src={src}
        alt={name ?? speaker}
        className="dialogue-portrait-img"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

/** One line; remounted (keyed) per line so the typewriter restarts from zero. */
function Line({ text, onNext, onSkip }: LineProps) {
  const [shown, setShown] = useState(0)
  const complete = shown >= text.length
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const n = Math.min(text.length, Math.floor(((now - start) / 1000) * BALANCE.ui.DIALOGUE_CHARS_PER_SEC))
      setShown((prev) => Math.max(prev, n))
      if (n < text.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text])

  const advance = useCallback(() => {
    if (complete) onNext()
    else setShown(text.length)
  }, [complete, onNext, text.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        advance()
      } else if (e.code === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, onSkip])

  return (
    <p className="dialogue-text" data-testid="dialogue-text" onClick={advance}>
      {text.slice(0, shown)}
    </p>
  )
}

export function DialoguePanel({ speech, onDone }: Props) {
  const [line, setLine] = useState(0)
  const onNext = useCallback(() => {
    if (line + 1 < speech.lines.length) setLine(line + 1)
    else onDone()
  }, [line, speech.lines.length, onDone])
  const name = UI[`name.${speech.speaker}`]
  return (
    <div className="dialogue" data-testid="dialogue">
      <Frame kind="dialogue" />
      <SpeakerPortrait speaker={speech.speaker} name={name} />
      <div className="dialogue-content">
        {name && (
          <div className="dialogue-speaker" data-testid="dialogue-speaker">
            {name}
          </div>
        )}
        <Line key={line} text={speech.lines[line]} onNext={onNext} onSkip={onDone} />
        <div className="dialogue-hint">
          <span>{UI['dialogue.advance']}</span>
          <span>{UI['dialogue.skip']}</span>
          <span className="dialogue-count">
            {line + 1}/{speech.lines.length}
          </span>
        </div>
      </div>
    </div>
  )
}

export const DialogueBox = DialoguePanel
