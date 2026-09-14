// The astra's staged sequence as numbers the renderer reads each frame: how dark the storm is, and where the strike is
// in its bolt, flash, shockwave, dust and shake. Render time, not ticks (ASTRA_LOOK). Pure.
import { ASTRA_LOOK as FX } from '@data/scenery'

/** Storm 0..1 for the next frame. It gathers while a castable charge is held and through the hold after a strike, then
 * clears after a strike or eases back from a charge let go early. `sinceCast` is null when there has been no strike. */
export function stepStorm(level: number, dt: number, charging: boolean, sinceCast: number | null): number {
  const holding = sinceCast !== null && sinceCast < FX.HOLD_SEC
  if (charging || holding) return Math.min(1, level + dt / FX.GATHER_SEC)
  const afterStrike = sinceCast !== null && sinceCast < FX.HOLD_SEC + FX.CLEAR_SEC
  return Math.max(0, level - dt / (afterStrike ? FX.CLEAR_SEC : FX.CANCEL_SEC))
}

export interface StrikeView {
  /** 0..1 progress of each stage, null once it (or the whole strike) is over. */
  bolt: number | null
  shock: number | null
  dust: number | null
  gale: number | null
  /** 1 at the strike, fading to 0. */
  flash: number
  /** Camera shake amplitude, metres. */
  shake: number
}

const progress = (since: number, sec: number) => (since >= 0 && since < sec ? since / sec : null)

export function strikeView(sinceCast: number | null): StrikeView {
  if (sinceCast === null) return { bolt: null, shock: null, dust: null, gale: null, flash: 0, shake: 0 }
  const shake = progress(sinceCast, FX.SHAKE_SEC)
  const flash = progress(sinceCast, FX.FLASH_SEC)
  return {
    bolt: progress(sinceCast, FX.BOLT_SEC),
    shock: progress(sinceCast, FX.SHOCK_SEC),
    dust: progress(sinceCast, FX.DUST_SEC),
    gale: progress(sinceCast, FX.GALE_SEC),
    flash: flash === null ? 0 : 1 - flash,
    shake: shake === null ? 0 : FX.SHAKE_M * (1 - shake) ** 2,
  }
}
