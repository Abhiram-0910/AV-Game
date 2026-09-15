// Every user-visible string in dialogue and UI, keyed for i18n. Zero imports.
// Quiz and codex text live in quiz.ts / codex.ts (also src/data). Nothing outside
// src/data may contain a user-visible string literal.
// Reading level: Classes 6–10. Sanskrit terms glossed on first use in each level.

export type Speaker = 'narrator' | 'rama' | 'lakshmana' | 'vishwamitra' | 'dasharatha' | 'vasishtha' | 'tataka'

export interface Speech {
  speaker: Speaker
  lines: readonly string[]
}

export const UI = {
  'app.title': 'Rama: Guardian of the Yajna',
  'menu.start': 'Begin',
  'menu.continue': 'Continue',
  'menu.newGame': 'New Game',
  'menu.codex': 'Story Scroll',
  'menu.settings': 'Settings',
  'menu.quit': 'Quit',
  'menu.confirmNewGame': 'Start over? Your saved progress will be replaced.',
  'menu.yes': 'Yes',
  'menu.no': 'No',
  'settings.quality': 'Graphics quality',
  'settings.quality.auto': 'Auto',
  'settings.quality.low': 'Low',
  'settings.quality.high': 'High',
  'settings.volume': 'Volume',
  'settings.subtitles': 'Subtitles',
  'settings.back': 'Back',
  'settings.active': 'Running now',
  'settings.restart': 'Restart to apply',
  'settings.mouseMode': 'Mouse',
  'settings.mouseMode.look': 'Look around',
  'settings.mouseMode.aim': 'Aim only',
  'settings.pointer': 'Pointing device',
  'settings.pointer.mouse': 'Mouse',
  'settings.pointer.trackpad': 'Trackpad',
  'settings.mouseSensitivity': 'Mouse sensitivity',
  'settings.trackpadSensitivity': 'Trackpad sensitivity',
  'tier.reason.override': 'chosen in Settings',
  'tier.reason.saved': 'detected on first run',
  'tier.reason.software': 'detected: software renderer, no GPU',
  'tier.reason.weakGpu': 'detected: integrated GPU',
  'tier.reason.slow': 'detected: benchmark too slow',
  'tier.reason.fast': 'detected: benchmark passed',
  'tier.hint.weakGpu': 'Laptop with a second graphics card? In Windows Settings → Display → Graphics, set your browser to High performance, then restart.',
  'hud.health': 'Health',
  'hud.arrows': 'Arrows',
  'hud.astra': 'Astra',
  'hud.agneyastra': 'Agneyastra',
  'hud.manavastra': 'Manavastra',
  'hud.astraSwitch': '[1/2] Switch Astra',
  'hud.swordSlash': 'F or right click: sword',
  'hud.yajna': 'Yajna',
  'hud.objective': 'Objective',
  'hud.timeLeft': 'Time left',
  'hud.interact': 'Press E to talk',
  'hud.pickup': 'Press E to pick up arrows',
  'hud.strike': 'Press F to strike with your sword',
  'hud.charging': 'Hold to charge the astra',
  'hud.targetsHit': 'Targets hit',
  'hud.controls': 'W S walk · A D turn · Shift jog · E talk',
  'hud.bowControls': 'Hold the mouse button to draw, release to shoot',
  'mouse.engage.title': 'Click to look around with the mouse',
  'mouse.engage.hint': '[M] the mouse aims instead · arrow keys always turn',
  'mouse.look': 'Mouse: look around',
  'mouse.aiming': 'Mouse: aiming',
  'mouse.aim': 'Mouse: aim',
  'mouse.key': '[M]',
  'mouse.blocked': 'Mouse look is blocked on this computer. Arrow keys turn; the mouse aims.',
  'astra.cone.in': 'Maricha is in the wind’s path',
  'astra.cone.out': 'Maricha is outside the wind’s path',
  'dialogue.advance': 'Space: next',
  'dialogue.skip': 'Esc: skip',
  'debug.triangles': 'Triangles',
  'debug.calls': 'Draw calls',
  'debug.skinned': 'Skinned',
  'debug.peak': 'peak',
  'debug.renderer': 'Renderer',
  'debug.software': 'software renderer',
  'debug.tier': 'Tier',
  'loading.level': 'Loading',
  'loading.tip.aim': 'Hold the mouse button to draw the bow. A fuller draw flies farther.',
  'loading.tip.astra': 'An astra takes time to call. Find a safe moment first.',
  'loading.tip.yajna': 'Rakshasas go for the altar, not for you. Stand between them and the fire.',
  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart level',
  'pause.menu': 'Main menu',
  'result.win': 'Level complete',
  'result.fail': 'Try again',
  'result.fail.health': 'Rama fell. Vishwamitra calls you back to your feet.',
  'result.fail.yajna': 'The fire was put out. The rishis relight it — stand your ground.',
  'result.fail.arrows': 'Out of arrows. Pick up your quiver and try again.',
  'result.fail.time': 'The sun set before the trial ended. Try again.',
  'result.retry': 'Retry',
  'result.next': 'Continue',
  'result.complete': 'Bala Kanda complete',
  'result.returnToTitle': 'Return to the title',
  'quiz.title': 'Before you go on',
  'quiz.progress': 'Question {n} of {total}',
  'quiz.correct': 'Correct!',
  'quiz.wrong': 'Not quite.',
  'quiz.next': 'Next',
  'quiz.done': 'On to the next chapter',
  'codex.title': 'Story Scroll',
  'codex.unlocked': 'New scroll unlocked',
  'codex.locked': 'Play on to unlock this scroll.',
  'codex.close': 'Close',
  'objective.reach': 'Go to the marked place',
  'objective.talk': 'Speak with {npc}',
  'objective.hitTargets': 'Hit the targets ({done}/{total})',
  'objective.strike': 'Strike the straw man with your sword ({done}/{total})',
  'objective.chargeAstra': 'Call an astra on the great target',
  'objective.defeat': 'Defeat {enemy}',
  'objective.survive': 'Guard the yajna',
  'name.rama': 'Rama',
  'name.lakshmana': 'Lakshmana',
  'name.vishwamitra': 'Vishwamitra',
  'name.dasharatha': 'King Dasharatha',
  'name.vasishtha': 'Sage Vasishtha',
  'name.tataka': 'Tataka',
  'name.subahu': 'Subahu',
  'name.maricha': 'Maricha',
  'name.rakshasa': 'Rakshasa',
  'name.narrator': '',
} as const

export const DIALOGUE = {
  'l1.title': { speaker: 'narrator', lines: ['Chapter 1: The Court of Ayodhya'] },
  'l1.intro': {
    speaker: 'narrator',
    lines: [
      'Ayodhya, the capital of Kosala. King Dasharatha rules with four sons. The eldest is Rama, not yet sixteen.',
      'Today a visitor has come to the palace: the great rishi (a sage) Vishwamitra, once a king, now a master of every secret weapon.',
      'Walk to the throne and listen.',
    ],
  },
  'l1.vishwamitra.request': {
    speaker: 'vishwamitra',
    lines: [
      'O King, you promised me anything I ask. Hear my request.',
      'I am performing a yajna (a sacred fire ritual). Two rakshasas (demons), Maricha and Subahu, wreck it each time. They rain flesh and blood upon the altar.',
      'I cannot curse them, for one who has taken a vow of a yajna must not show anger. Give me your son Rama for ten nights. He will guard my fire.',
    ],
  },
  'l1.dasharatha.hesitates': {
    speaker: 'dasharatha',
    lines: [
      'Rama is a boy. He has not yet seen sixteen years. How can he face rakshasas?',
      'I will come myself, with my whole army. But do not ask me for Rama. I cannot bear to send him.',
    ],
  },
  'l1.vasishtha.counsel': {
    speaker: 'vasishtha',
    lines: [
      'O King, before this sage asked for anything, you said: "Whatever you ask, I will give." That was your word, and you gave it freely.',
      'A king of the Ikshvaku line is bound by his own given word. If you take it back now, you keep your son and lose your dharma (your duty and your truth).',
      'And Vishwamitra knows every astra there is. With him beside your son, Rama is safer than in this palace. Let him go.',
    ],
  },
  'l1.dasharatha.consents': {
    speaker: 'dasharatha',
    lines: [
      'Then go, my son, and take Lakshmana with you. Obey the sage in all things.',
      'May you return to me with your task done.',
    ],
  },
  'l1.outro': {
    speaker: 'narrator',
    lines: ['Rama bowed to his father and his teacher. With Lakshmana at his side, he followed Vishwamitra out of the city gates.'],
  },

  'l2.title': { speaker: 'narrator', lines: ['Chapter 2: The Bank of the Sarayu'] },
  'l2.intro': {
    speaker: 'narrator',
    lines: [
      'The three walked south until they reached the river Sarayu. There Vishwamitra stopped.',
      'Go to the riverbank and speak with the sage.',
    ],
  },
  'l2.vishwamitra.mantras': {
    speaker: 'vishwamitra',
    lines: [
      'Rama, sip this water and receive two mantras (sacred formulas): Bala and Atibala.',
      'With them you will feel no hunger, no thirst, no tiredness, and no fear, even while you sleep.',
      'Now come. There is a bow to learn.',
    ],
  },
  'l2.vishwamitra.bow': {
    speaker: 'vishwamitra',
    lines: [
      'Hold the mouse button to draw. The longer you draw, the farther the arrow flies. Release to shoot.',
      'Three targets stand in the field. Hit them all.',
    ],
  },
  'l2.outro': {
    speaker: 'narrator',
    lines: ['That night they slept on the riverbank. Vishwamitra told the boys how the Ganga came down to earth, and how this land came to be.'],
  },

  'l3.title': { speaker: 'narrator', lines: ['Chapter 3: The Forest of Tataka'] },
  'l3.intro': {
    speaker: 'narrator',
    lines: [
      'They crossed the Ganga and came to a dark, silent forest. No birds sang. No farmer worked the land.',
      'Walk to the forest edge.',
    ],
  },
  'l3.vishwamitra.duty': {
    speaker: 'vishwamitra',
    lines: [
      'This was once rich farmland. Now it belongs to Tataka, a yakshini (a forest spirit) with the strength of a thousand elephants.',
      'She was not born evil. A curse from the sage Agastya made her a rakshasi, and grief made her cruel. She is the mother of Maricha.',
      'You will not want to strike a woman, Rama. But a prince protects his people, and she destroys them. That is your duty. Go.',
    ],
  },
  'l3.rama.resolve': {
    speaker: 'rama',
    lines: ['My father told me to obey you in all things. I will do as you say.'],
  },
  'l3.tataka.appears': {
    speaker: 'tataka',
    lines: ['Who dares walk in my forest?'],
  },
  'l3.vishwamitra.dusk': {
    speaker: 'vishwamitra',
    lines: ['Do not wait, Rama! At dusk the rakshasas grow strong. End it now.'],
  },
  'l3.outro': {
    speaker: 'narrator',
    lines: [
      'Rama\'s arrow struck true. Tataka fell, and she did not rise again. Agastya\'s curse lifted, and the forest was free.',
      'The devas (gods) watching from above praised the prince, and said to Vishwamitra: give him the astras.',
    ],
  },

  'l4.title': { speaker: 'narrator', lines: ['Chapter 4: The Five-Arrow Trial'] },
  'l4.intro': {
    speaker: 'narrator',
    lines: ['At dawn, Vishwamitra faced east, touched the water, and called Rama to him.'],
  },
  'l4.vishwamitra.astras': {
    speaker: 'vishwamitra',
    lines: [
      'Receive the astras (divine weapons called by mantra). The Agneya of fire. The Vayavya of wind. The Manava, which throws but does not kill.',
      'I also teach you how to call each one back. A weapon you cannot recall is a weapon you do not control.',
      'First, a trial of the plain arrow. Five targets. Ten arrows. Hit them all before the sun climbs.',
      'Then hold the astra key to charge, and loose it on the great target.',
    ],
  },
  'l4.outro': {
    speaker: 'narrator',
    lines: ['The astras came to Rama as servants come to a master, and stood before him in the shape of light.'],
  },

  'l5.title': { speaker: 'narrator', lines: ['Chapter 5: Guardian of the Yajna'] },
  'l5.intro': {
    speaker: 'narrator',
    lines: [
      'Siddhashrama, the sage\'s ashrama (hermitage). Here, long ago, Vishnu lived as Vamana the dwarf.',
      'The fire is lit. For six days and nights Vishwamitra will keep silence. Rama and Lakshmana will keep watch.',
      'Rakshasas will come for the altar. Do not let its flame go out.',
    ],
  },
  'l5.lakshmana.watch': {
    speaker: 'lakshmana',
    lines: ['Brother, the sky is turning red. They are coming.'],
  },
  'l5.rama.maricha': {
    speaker: 'rama',
    lines: ['Maricha! I will not take your life. The Manava astra will carry you a hundred yojanas (many hundreds of miles) into the sea. Go, and do not return.'],
  },
  'l5.rama.subahu': {
    speaker: 'rama',
    lines: ['Subahu, you who rain blood on a holy fire: the Agneya astra is for you.'],
  },
  'l5.outro': {
    speaker: 'narrator',
    lines: [
      'The Vayavya astra scattered the last of the rakshasas like leaves. The fire burned clean until the sixth night ended.',
      'The rishis rose and blessed the prince. Vishwamitra said only: "It is done." Rama\'s first task was complete.',
      'Ahead lay the road to Mithila, and a bow that no one could bend.',
    ],
  },
} as const satisfies Record<string, Speech>

export type UiKey = keyof typeof UI
export type DialogueKey = keyof typeof DIALOGUE
