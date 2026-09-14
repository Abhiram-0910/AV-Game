// Howler handles autoplay unlock; nothing plays until the first gesture. A sound that fails to load or play is dropped
// silently. Finished one-shots are unloaded, or Howler keeps every decoded buffer cached for the whole session.
import { Howl, Howler } from 'howler'
import type { AudioAdapter } from '../platform'

const live = new Map<number, Howl>()
let next = 1

export const webAudio: AudioAdapter = {
  play(url, opts = {}) {
    const id = next++
    // Howler emits events on a timeout, so `howl` is always assigned by the time these run.
    const done = () => {
      howl.unload()
      live.delete(id)
    }
    const howl = new Howl({
      src: [url],
      loop: opts.loop ?? false,
      volume: opts.volume ?? 1,
      onplay: () => opts.onplay?.(howl.duration()),
      onend: () => {
        if (!opts.loop) done()
      },
      onloaderror: done,
      onplayerror: done,
    })
    live.set(id, howl)
    howl.play()
    return id
  },
  stop(id) {
    live.get(id)?.unload()
    live.delete(id)
  },
  setMasterVolume(v) {
    Howler.volume(v)
  },
}
