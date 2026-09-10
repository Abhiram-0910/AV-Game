import { useStore } from 'zustand'
import { gameStore, type GameStore } from '@core/game-state'
import { type WorldUi, worldStore } from '@systems/world'
import { type ScreenState, screenStore } from './screen-store'

export function useGame<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore, selector)
}

export function useWorld<T>(selector: (s: WorldUi) => T): T {
  return useStore(worldStore, selector)
}

export function useScreen<T>(selector: (s: ScreenState) => T): T {
  return useStore(screenStore, selector)
}
