// Transient visual event dispatcher for Astra visual effects.
export interface AstraVfxEvent {
  id: number
  type: 'agneyastra' | 'manavastra'
  origin: [number, number, number]
  target: [number, number, number]
  yaw: number
  startTick: number
}

type VfxListener = (event: AstraVfxEvent) => void
const listeners = new Set<VfxListener>()

/** Render-side state of the staged sequence other views read: FollowCamera's shake (metres), written by AstraVfx. */
export const astraView = { shake: 0 }

let lastCastAt = -Infinity
/** performance.now() of the last astra cast; ui/Flow holds the result panel back until the strike has been seen. */
export function lastAstraCastAt(): number {
  return lastCastAt
}

let nextVfxId = 1
export function emitAstraVfx(vfx: Omit<AstraVfxEvent, 'id'>): void {
  lastCastAt = performance.now()
  const event: AstraVfxEvent = { ...vfx, id: nextVfxId++ }
  listeners.forEach((l) => l(event))
}

export function triggerAstraVfx(
  type: 'agneyastra' | 'manavastra',
  player: { x: number; y?: number; z: number; yaw?: number },
  targetOrDir: readonly [number, number, number] | { x: number; y: number; z: number } | number,
): void {
  const px = player.x
  const py = (player.y ?? 0) + (type === 'agneyastra' ? 1.35 : 1.2)
  const pz = player.z
  const yaw = player.yaw ?? 0

  const [tx, ty, tz]: [number, number, number] =
    typeof targetOrDir === 'number'
      ? [px + Math.sin(targetOrDir) * 8, py, pz + Math.cos(targetOrDir) * 8]
      : 'x' in targetOrDir
        ? [targetOrDir.x, targetOrDir.y, targetOrDir.z]
        : [targetOrDir[0], targetOrDir[1], targetOrDir[2]]

  emitAstraVfx({ type, origin: [px, py, pz], target: [tx, ty, tz], yaw, startTick: 0 })
}

export function subscribeAstraVfx(fn: VfxListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
