// Which top-level screen App.tsx shows: the title (before a level is mounted, so no assets
// load until the player actually starts) or the game itself. Pure UI navigation, not game
// domain state, so it lives in ui/ rather than core/ or systems/.
import { createStore } from 'zustand/vanilla'

export type Screen = 'title' | 'game'

/** The tier this boot actually runs and why (a tier.reason.* key suffix). Written once by App at boot. */
export interface ActiveTier {
  tier: 'low' | 'high'
  reason: string
}

export interface ScreenState {
  screen: Screen
  activeTier: ActiveTier | null
  setScreen(s: Screen): void
  setActiveTier(t: ActiveTier): void
}

export const screenStore = createStore<ScreenState>()((set) => ({
  screen: 'title',
  activeTier: null,
  setScreen: (screen) => set({ screen }),
  setActiveTier: (activeTier) => set({ activeTier }),
}))
