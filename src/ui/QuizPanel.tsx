// The real quiz gate, replacing the pass-2 auto-pass. Non-punishing: picking an option shows
// whether it was right and the explanation, never blocks progress — "Next"/"Finish" always
// advances. Grading happens locally before calling answerQuiz(), which advances the store's
// quiz.index (or ends the gate on the last question) — calling it only on confirm keeps the
// last question's feedback on screen instead of getting swept away by the phase change.
import { useState } from 'react'
import { UI } from '@data/dialogue'
import type { Question } from '@data/quiz'
import { gameStore } from '@core/game-state'
import { gateById } from '@core/progression'
import { playAudio } from '@systems/audio'
import { fmt } from './format'
import { useGame } from './use-game'
import { Panel } from './Frame'

function Options({ question, selected, onPick }: { question: Question; selected: number | null; onPick: (i: number) => void }) {
  return (
    <div className="title-actions">
      {question.options.map((opt, i) => (
        <button
          key={i}
          type="button"
          className="btn btn-choice"
          disabled={selected !== null}
          aria-pressed={selected === i}
          data-testid={`quiz-option-${i}`}
          onClick={() => onPick(i)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function Feedback({ question, selected, isLast, onNext }: { question: Question; selected: number; isLast: boolean; onNext: () => void }) {
  const isCorrect = selected === question.correct
  return (
    <div className="quiz-feedback" data-testid="quiz-feedback">
      <p className={isCorrect ? 'quiz-correct' : 'quiz-wrong'}>{isCorrect ? UI['quiz.correct'] : UI['quiz.wrong']}</p>
      <p>{question.explanation}</p>
      <button
        type="button"
        className="btn"
        data-testid="quiz-next"
        autoFocus
        onClick={() => {
          playAudio('button_click')
          onNext()
        }}
      >
        {isLast ? UI['quiz.done'] : UI['quiz.next']}
      </button>
    </div>
  )
}

export function QuizPanel() {
  const quiz = useGame((s) => s.quiz)
  const [selected, setSelected] = useState<number | null>(null)
  if (!quiz.gate) return null
  const gate = gateById(quiz.gate)
  const question = gate.questions[quiz.index]
  const total = gate.questions.length

  const onPick = (i: number) => {
    setSelected(i)
    playAudio(i === question.correct ? 'quiz_correct' : 'quiz_incorrect')
  }

  return (
    <div className="screen quiz" data-testid="quiz">
      <Panel>
        <h1>{UI['quiz.title']}</h1>
        <p data-testid="quiz-progress">{fmt(UI['quiz.progress'], { n: quiz.index + 1, total })}</p>
        <p className="quiz-prompt">{question.prompt}</p>
        <Options question={question} selected={selected} onPick={onPick} />
        {selected !== null && (
          <Feedback
            question={question}
            selected={selected}
            isLast={quiz.index === total - 1}
            onNext={() => {
              gameStore.getState().answerQuiz(selected)
              setSelected(null)
            }}
          />
        )}
      </Panel>
    </div>
  )
}

export const QuizModal = QuizPanel

