import { useStore } from 'zustand'
import { gameStore, type GameStore } from '@core/game-state'
import { type WorldUi, worldStore } from '@systems/world'

export function useGame<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore, selector)
}

export function useWorld<T>(selector: (s: WorldUi) => T): T {
  return useStore(worldStore, selector)
}
