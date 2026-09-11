// How every humanoid is assembled from the two base meshes. Zero imports. No character gets
// new body geometry: texture tint, uniform scale, hairstyle, props, and a procedural garment
// (render/garments.ts) driven by this data only. One base texture exists per mesh, so
// "texture" here is the tint multiplied into it.

export type MeshKind = 'male' | 'female'
export type Hairstyle = 'long' | 'beard' | 'simpleParted' | 'buns' | 'buzzed'
export type PropKind = 'bow' | 'quiver' | 'sword'
/** Gold crown and shoulder collar: a king's crown is tall, a prince's three points at the brow. */
export type Regalia = 'king' | 'prince'

export interface CharacterSpec {
  mesh: MeshKind
  /** Multiplied into the base colour; hex string. */
  tint: string
  /** Uniform scale on the whole rig. */
  scale: number
  /** Attached to the Head bone as a plain mesh; nothing merges into the body. */
  hairstyle: Hairstyle | null
  /** Multiplied into the hair base colour (the source texture is pale). */
  hairTint: string
  /** Attached to hand_l (bow) or the back (quiver) / hand_r (sword). */
  props: readonly PropKind[]
  /** Procedural dhoti/wrap: hex tint and length in metres hanging from the waist. */
  garmentColor: string
  garmentLength: number
  /** Angavastram sash from a clavicle to spine_03; off for the rakshasas. */
  sash: boolean
  sashColor: string
  /** Fitted upper garment colour, or none (bare-chested). */
  upper: string | null
  regalia: Regalia | null
}

export type CharacterId =
  | 'rama'
  | 'lakshmana'
  | 'vishwamitra'
  | 'dasharatha'
  | 'vasishtha'
  | 'rakshasa'
  | 'tataka'
  | 'subahu'
  | 'maricha'

// Rama and Dasharatha keep a white tint: the factory multiplies tint into every garment (and would
// turn their gold regalia green-grey), so royal colours are authored directly.
export const CHARACTER_SPECS: Readonly<Record<CharacterId, CharacterSpec>> = {
  rama: { mesh: 'male', tint: '#ffffff', scale: 1.0, hairstyle: 'long', hairTint: '#2a1a12', props: ['bow', 'quiver', 'sword'], garmentColor: '#e0ad3c', garmentLength: 0.5, sash: true, sashColor: '#b8321f', upper: '#2c5a86', regalia: 'prince' },
  lakshmana: { mesh: 'male', tint: '#f0c987', scale: 0.97, hairstyle: 'simpleParted', hairTint: '#2a1a12', props: ['bow', 'quiver'], garmentColor: '#e8dcc0', garmentLength: 0.5, sash: true, sashColor: '#3c6ea5', upper: null, regalia: null },
  vishwamitra: { mesh: 'male', tint: '#ffb066', scale: 1.04, hairstyle: 'beard', hairTint: '#d8d0c0', props: [], garmentColor: '#c9793a', garmentLength: 0.75, sash: true, sashColor: '#8a5a2a', upper: null, regalia: null },
  dasharatha: { mesh: 'male', tint: '#ffffff', scale: 1.02, hairstyle: 'beard', hairTint: '#8a8078', props: [], garmentColor: '#c9962c', garmentLength: 0.7, sash: true, sashColor: '#7a1620', upper: '#f1e6cc', regalia: 'king' },
  vasishtha: { mesh: 'male', tint: '#f5efe0', scale: 1.0, hairstyle: 'beard', hairTint: '#e8e4da', props: [], garmentColor: '#efe8d4', garmentLength: 0.75, sash: true, sashColor: '#c9a33a', upper: null, regalia: null },
  rakshasa: { mesh: 'male', tint: '#6d4a3a', scale: 1.1, hairstyle: 'buzzed', hairTint: '#1a1010', props: ['sword'], garmentColor: '#3c342a', garmentLength: 0.55, sash: false, sashColor: '#000000', upper: null, regalia: null },
  tataka: { mesh: 'female', tint: '#5f6b4a', scale: 1.6, hairstyle: 'buns', hairTint: '#1a1010', props: [], garmentColor: '#2e2a1f', garmentLength: 0.9, sash: false, sashColor: '#000000', upper: null, regalia: null },
  subahu: { mesh: 'male', tint: '#8a3c3c', scale: 1.25, hairstyle: 'buzzed', hairTint: '#1a1010', props: ['sword'], garmentColor: '#402020', garmentLength: 0.55, sash: false, sashColor: '#000000', upper: null, regalia: null },
  maricha: { mesh: 'male', tint: '#4f5f8a', scale: 1.15, hairstyle: 'buzzed', hairTint: '#1a1010', props: ['sword'], garmentColor: '#252a3a', garmentLength: 0.55, sash: false, sashColor: '#000000', upper: null, regalia: null },
}
