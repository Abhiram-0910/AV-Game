import { deserializeSave, serializeSave, type Save } from '@core/save'
import type { SaveAdapter } from '../platform'

const KEY = 'bala-kanda.save'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const webSave: SaveAdapter = {
  load: () => deserializeSave(storage()?.getItem(KEY)),
  store: (save: Save) => storage()?.setItem(KEY, serializeSave(save)),
  clear: () => storage()?.removeItem(KEY),
}
