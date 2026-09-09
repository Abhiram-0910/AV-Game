// Semantic clip names → real clip strings in UAL1_Standard.glb / UAL2_Standard.glb.
// This is the ONLY file allowed to contain a clip name string. 86 clips exist; we map
// what the game uses. There is NO bow clip — archery aims procedurally (pass 2).

export const CLIPS = {
  IDLE: 'Idle_Loop',
  WALK: 'Walk_Loop',
  JOG: 'Jog_Fwd_Loop',
  SPRINT: 'Sprint_Loop',
  TALK: 'Idle_Talking_Loop',
  SIT_ENTER: 'Sitting_Enter',
  SIT_IDLE: 'Sitting_Idle_Loop',
  SIT_TALK: 'Sitting_Talking_Loop',
  SIT_EXIT: 'Sitting_Exit',
  ARMS_FOLDED: 'Idle_FoldArms_Loop',
  AGREE: 'Yes',
  REFUSE: 'Idle_No_Loop',
  SWORD_IDLE: 'Sword_Idle',
  SWORD_ATTACK: 'Sword_Attack',
  SWORD_A: 'Sword_Regular_A',
  SWORD_A_REC: 'Sword_Regular_A_Rec',
  SWORD_B: 'Sword_Regular_B',
  SWORD_COMBO: 'Sword_Regular_Combo',
  CAST_ENTER: 'Spell_Simple_Enter',
  CAST_LOOP: 'Spell_Simple_Idle_Loop',
  CAST_SHOOT: 'Spell_Simple_Shoot',
  CAST_EXIT: 'Spell_Simple_Exit',
  THROW: 'OverhandThrow',
  HIT: 'Hit_Chest',
  HIT_HEAD: 'Hit_Head',
  KNOCKBACK: 'Hit_Knockback',
  DEATH: 'Death01',
  INTERACT: 'Interact',
  TPOSE: 'A_TPose',
} as const

export type ClipKey = keyof typeof CLIPS
export type ClipName = (typeof CLIPS)[ClipKey]

/** Which GLB a clip lives in. Both are loaded once and merged (pass 2). */
export const CLIP_SOURCES = {
  UAL1: 'UAL1_Standard.glb',
  UAL2: 'UAL2_Standard.glb',
} as const
