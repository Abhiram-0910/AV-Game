// Howler handles autoplay unlock; nothing plays until the first gesture. No sounds ship yet.
import { Howl, Howler } from 'howler'
import type { AudioAdapter } from '../platform'

const live = new Map<number, Howl>()
let next = 1

export const webAudio: AudioAdapter = {
  play(url, opts = {}) {
    const id = next++
    const howl = new Howl({ src: [url], loop: opts.loop ?? false, volume: opts.volume ?? 1, onend: () => live.delete(id) })
    live.set(id, howl)
    howl.play()
    return id
  },
  stop(id) {
    live.get(id)?.stop()
    live.delete(id)
  },
  setMasterVolume(v) {
    Howler.volume(v)
  },
}
