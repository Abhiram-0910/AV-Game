// Typewriter speech with voice-over. Space or click finishes the line, then advances; Escape skips the speech.
// Each line plays /audio/vo/<key>.<n>.ogg (tools/generate-vo.mjs); a missing or failed file leaves the subtitle alone.
import { useCallback, useEffect, useState } from 'react'
import { BALANCE } from '@data/balance'
import { DIALOGUE, UI, type DialogueKey, type Speech } from '@data/dialogue'
import { platform } from '@platform/index'
import { Frame } from './Frame'

interface Props {
  speech: Speech
  onDone(): void
}

interface LineProps {
  text: string
  voiceUrl: string | null
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

/** Types `text` out and plays its voice. When the voice starts, the remaining characters are re-timed to finish with
 * it; without a voice they type at the default rate. Unmounting stops the voice. */
function useTypewriter(text: string, voiceUrl: string | null) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let start = performance.now()
    let base = 0
    let cps = BALANCE.ui.DIALOGUE_CHARS_PER_SEC
    let typed = 0
    let raf = 0
    const tick = (now: number) => {
      typed = Math.min(text.length, base + Math.floor(((now - start) / 1000) * cps))
      setShown((prev) => Math.max(prev, typed))
      if (typed < text.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onplay = (seconds: number) => {
      if (typed >= text.length || !(seconds > 0)) return
      base = typed
      start = performance.now()
      cps = (text.length - typed) / seconds
    }
    const voice = voiceUrl ? platform.audio.play(voiceUrl, { onplay }) : 0
    return () => {
      cancelAnimationFrame(raf)
      if (voice) platform.audio.stop(voice)
    }
  }, [text, voiceUrl])
  return [shown, setShown] as const
}

/** One line; remounted (keyed) per line so the typewriter and the voice restart. */
function Line({ text, voiceUrl, onNext, onSkip }: LineProps) {
  const [shown, setShown] = useTypewriter(text, voiceUrl)
  const complete = shown >= text.length

  const advance = useCallback(() => {
    if (complete) onNext()
    else setShown(text.length)
  }, [complete, onNext, setShown, text.length])

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
  // Flow passes DIALOGUE[key] itself, so identity finds the key without threading it through.
  const key = Object.keys(DIALOGUE).find((k) => DIALOGUE[k as DialogueKey] === speech)
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
        <Line
          key={line}
          text={speech.lines[line]}
          voiceUrl={key ? `/audio/vo/${key}.${line}.ogg` : null}
          onNext={onNext}
          onSkip={onDone}
        />
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
