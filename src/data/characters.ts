// How every humanoid is assembled from the two base meshes. Zero imports. Nobody adds
// geometry for a new character: texture tint, uniform scale, hairstyle and props only.
// One base texture exists per mesh, so "texture" here is the tint multiplied into it.

export type MeshKind = 'male' | 'female'
export type Hairstyle = 'long' | 'beard' | 'simpleParted' | 'buns' | 'buzzed'
export type PropKind = 'bow' | 'quiver' | 'sword'

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

export const CHARACTER_SPECS: Readonly<Record<CharacterId, CharacterSpec>> = {
  rama: { mesh: 'male', tint: '#8fb4ff', scale: 1.0, hairstyle: 'long', hairTint: '#2a1a12', props: ['bow', 'quiver'] },
  lakshmana: { mesh: 'male', tint: '#f0c987', scale: 0.97, hairstyle: 'simpleParted', hairTint: '#2a1a12', props: ['bow', 'quiver'] },
  vishwamitra: { mesh: 'male', tint: '#ffb066', scale: 1.04, hairstyle: 'beard', hairTint: '#d8d0c0', props: [] },
  dasharatha: { mesh: 'male', tint: '#ffd76a', scale: 1.02, hairstyle: 'beard', hairTint: '#8a8078', props: [] },
  vasishtha: { mesh: 'male', tint: '#f5efe0', scale: 1.0, hairstyle: 'beard', hairTint: '#e8e4da', props: [] },
  rakshasa: { mesh: 'male', tint: '#6d4a3a', scale: 1.1, hairstyle: 'buzzed', hairTint: '#1a1010', props: ['sword'] },
  tataka: { mesh: 'female', tint: '#5f6b4a', scale: 1.6, hairstyle: 'buns', hairTint: '#1a1010', props: [] },
  subahu: { mesh: 'male', tint: '#8a3c3c', scale: 1.25, hairstyle: 'buzzed', hairTint: '#1a1010', props: ['sword'] },
  maricha: { mesh: 'male', tint: '#4f5f8a', scale: 1.15, hairstyle: 'buzzed', hairTint: '#1a1010', props: ['sword'] },
}
