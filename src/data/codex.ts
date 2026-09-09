// Story Scroll cards, one unlocked per level. Zero imports. Text lives here.

export type CodexId = 'vishwamitra' | 'yajna' | 'tataka' | 'astra' | 'maricha-subahu'

export interface CodexCard {
  id: CodexId
  unlockLevel: 'l1' | 'l2' | 'l3' | 'l4' | 'l5'
  title: string
  paragraphs: readonly string[]
}

export const CODEX: readonly CodexCard[] = [
  {
    id: 'vishwamitra',
    unlockLevel: 'l1',
    title: 'Vishwamitra, the King Who Became a Rishi',
    paragraphs: [
      'Vishwamitra was born a king of the Kusha line. After a quarrel with the sage Vasishtha over the wish-giving cow Shabala, he saw that a sage\'s power was greater than a king\'s. He gave up his throne and practised tapas (deep discipline) for thousands of years.',
      'At last Brahma named him a brahmarishi, the highest rank of sage. He knew every astra there is, and he was the one who asked for Rama to protect his yajna.',
      'In the game he is the teacher who gives Rama the mantras, the bow lessons, and the astras.',
    ],
  },
  {
    id: 'yajna',
    unlockLevel: 'l2',
    title: 'The Yajna',
    paragraphs: [
      'A yajna is a fire ritual. Offerings of ghee, grain and wood are placed into a sacred fire while priests chant. In the Ramayana, a yajna binds the one who performs it to a vow of calm and purity.',
      'That is why Vishwamitra could not fight the rakshasas himself. To show anger would break the vow and ruin the ritual. He needed a guardian who was free to act: Rama.',
      'The rakshasas attacked the yajna by throwing flesh and blood on the altar, which made the fire impure.',
    ],
  },
  {
    id: 'tataka',
    unlockLevel: 'l3',
    title: 'Tataka',
    paragraphs: [
      'Tataka was the daughter of the yaksha Suketu, born with the strength of a thousand elephants. She married Sunda and became the mother of Maricha.',
      'When her husband died, she and her son attacked the sage Agastya. He cursed them both to become rakshasas. Her grief turned to cruelty, and she laid waste to the rich lands of Malada and Karusha.',
      'Rama hesitated to strike a woman. Vishwamitra taught him that protecting the innocent comes first. After Tataka fell, the forest became fertile again.',
    ],
  },
  {
    id: 'astra',
    unlockLevel: 'l4',
    title: 'Astras, the Divine Weapons',
    paragraphs: [
      'An astra is a weapon summoned by a mantra rather than held in the hand. Each is tied to a power of nature or a deity: the Agneya to fire, the Vayavya to wind, the Varuna to water.',
      'Vishwamitra gave Rama dozens of astras after the defeat of Tataka, and, just as important, taught him the samhara: the mantras that recall each weapon.',
      'The Manava astra is special. It throws an enemy far away without killing him. Rama chose it for Maricha.',
    ],
  },
  {
    id: 'maricha-subahu',
    unlockLevel: 'l5',
    title: 'Maricha and Subahu',
    paragraphs: [
      'Maricha, son of Tataka, and Subahu were the two rakshasas who spoiled Vishwamitra\'s yajna year after year, urged on by Ravana.',
      'On the sixth night of the ritual they came with a horde. Rama struck Maricha with the Manava astra and flung him a hundred yojanas into the ocean, alive. He killed Subahu with the Agneya astra and scattered the rest with the Vayavya.',
      'Maricha lived. He was carried alive across a hundred yojanas and fell into the ocean, far from the yajna. Rama chose the weapon that throws over the weapon that kills, and the fire burned clean to the end of the sixth night.',
    ],
  },
]
