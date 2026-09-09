// Three-question gates between levels. Non-punishing: a wrong answer shows the
// explanation and continues. Zero imports. Text lives here, not in dialogue.ts.

export type GateId = 'gate1' | 'gate2' | 'gate3' | 'gate4'

export interface Question {
  prompt: string
  options: readonly [string, string, string, string]
  /** Index into options. */
  correct: 0 | 1 | 2 | 3
  /** Shown on a wrong answer. Teaches, never scolds. */
  explanation: string
}

export interface QuizGate {
  id: GateId
  /** Level whose completion unlocks this gate. */
  afterLevel: 'l1' | 'l2' | 'l3' | 'l4'
  questions: readonly [Question, Question, Question]
}

export const QUIZ_GATES: readonly QuizGate[] = [
  {
    id: 'gate1',
    afterLevel: 'l1',
    questions: [
      {
        prompt: 'Why did Vishwamitra come to Ayodhya?',
        options: [
          'To ask Dasharatha for gold',
          'To ask for Rama to guard his yajna',
          'To challenge Rama to a duel',
          'To crown Rama as king',
        ],
        correct: 1,
        explanation: 'Vishwamitra asked for Rama to protect his yajna, a sacred fire ritual, from the rakshasas Maricha and Subahu.',
      },
      {
        prompt: 'Why could Vishwamitra not simply curse the rakshasas himself?',
        options: [
          'He had lost his powers',
          'He did not know their names',
          'One performing a yajna must not show anger',
          'The rakshasas were his cousins',
        ],
        correct: 2,
        explanation: 'A person who has taken the vow of a yajna must stay calm. Anger would break the vow, so Vishwamitra needed a guardian.',
      },
      {
        prompt: 'Who persuaded Dasharatha to let Rama go?',
        options: ['Sage Vasishtha', 'Queen Kausalya', 'Lakshmana', 'Bharata'],
        correct: 0,
        explanation: 'Vasishtha, the royal teacher, reminded the king that a promise must be kept and that Rama would be safe with Vishwamitra.',
      },
    ],
  },
  {
    id: 'gate2',
    afterLevel: 'l2',
    questions: [
      {
        prompt: 'What did the mantras Bala and Atibala give Rama?',
        options: [
          'The power to fly',
          'Freedom from hunger, thirst and tiredness',
          'The ability to speak with animals',
          'A magic bow',
        ],
        correct: 1,
        explanation: 'Bala and Atibala are mantras, sacred formulas, that keep away hunger, thirst, tiredness and fear.',
      },
      {
        prompt: 'On the bank of which river did Vishwamitra teach these mantras?',
        options: ['Ganga', 'Yamuna', 'Sarayu', 'Godavari'],
        correct: 2,
        explanation: 'They stopped at the Sarayu, the river that flows past Ayodhya, before crossing the Ganga later.',
      },
      {
        prompt: 'Who went with Rama on the journey?',
        options: ['Bharata', 'Shatrughna', 'Lakshmana', 'Hanuman'],
        correct: 2,
        explanation: 'Lakshmana, Rama\'s devoted younger brother, went with him. Hanuman appears much later in the Ramayana.',
      },
    ],
  },
  {
    id: 'gate3',
    afterLevel: 'l3',
    questions: [
      {
        prompt: 'Why was Tataka so cruel?',
        options: [
          'She was born a rakshasi',
          'A curse from the sage Agastya changed her',
          'Ravana ordered her',
          'She wanted the throne of Ayodhya',
        ],
        correct: 1,
        explanation: 'Tataka was born a yakshini, a forest spirit. Agastya\'s curse turned her into a rakshasi, and grief made her cruel.',
      },
      {
        prompt: 'Why did Rama hesitate before facing Tataka?',
        options: [
          'He was afraid of the dark',
          'He did not want to strike a woman',
          'He had no arrows',
          'Lakshmana told him to wait',
        ],
        correct: 1,
        explanation: 'Rama did not wish to harm a woman. Vishwamitra explained that a prince must protect his people from whoever harms them.',
      },
      {
        prompt: 'What was Tataka\'s relationship to Maricha?',
        options: ['His sister', 'His wife', 'His mother', 'His teacher'],
        correct: 2,
        explanation: 'Tataka was the mother of Maricha, one of the two rakshasas who attacked Vishwamitra\'s yajna.',
      },
    ],
  },
  {
    id: 'gate4',
    afterLevel: 'l4',
    questions: [
      {
        prompt: 'What is an astra?',
        options: [
          'A kind of chariot',
          'A divine weapon called by a mantra',
          'A sacred fire',
          'A type of bow',
        ],
        correct: 1,
        explanation: 'An astra is a divine weapon summoned with a mantra. Vishwamitra gave Rama many astras after Tataka was defeated.',
      },
      {
        prompt: 'What else did Vishwamitra teach Rama along with the astras?',
        options: [
          'How to call the weapons back',
          'How to build a chariot',
          'How to swim the Ganga',
          'How to rule Ayodhya',
        ],
        correct: 0,
        explanation: 'Vishwamitra taught the samhara, the way to recall each astra. A weapon you cannot recall is not under your control.',
      },
      {
        prompt: 'Which astra throws an enemy far away without killing him?',
        options: ['Agneya', 'Vayavya', 'Manava', 'Brahma'],
        correct: 2,
        explanation: 'The Manava astra hurls its target away. Rama would soon use it on Maricha, choosing to spare his life.',
      },
    ],
  },
]
