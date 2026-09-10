// Which top-level screen App.tsx shows: the title (before a level is mounted, so no assets
// load until the player actually starts) or the game itself. Pure UI navigation, not game
// domain state, so it lives in ui/ rather than core/ or systems/.
import { createStore } from 'zustand/vanilla'

export type Screen = 'title' | 'game'

export interface ScreenState {
  screen: Screen
  setScreen(s: Screen): void
}

export const screenStore = createStore<ScreenState>()((set) => ({
  screen: 'title',
  setScreen: (screen) => set({ screen }),
}))
