// Keyboard state, the cursor relative to the viewport centre, and pointer lock for mouse look. The lock only ever
// starts from a user gesture the HUD asks for (ui/MouseMode.tsx); the unlocked cursor still aims, so a lab machine that
// blocks pointer lock plays exactly as before.
import type { InputAdapter, LockEvent, MouseState, PointerLock } from '../platform'

interface Listeners {
  onKeyDown: (e: KeyboardEvent) => void
  onKeyUp: (e: KeyboardEvent) => void
  onMove: (e: MouseEvent) => void
  onDown: (e: MouseEvent) => void
  onUp: (e: MouseEvent) => void
  onContextMenu: (e: MouseEvent) => void
  onBlur: () => void
}

function attachListeners(target: Window, l: Listeners): void {
  target.addEventListener('keydown', l.onKeyDown)
  target.addEventListener('keyup', l.onKeyUp)
  target.addEventListener('mousemove', l.onMove)
  target.addEventListener('mousedown', l.onDown)
  target.addEventListener('mouseup', l.onUp)
  target.addEventListener('contextmenu', l.onContextMenu)
  target.addEventListener('blur', l.onBlur)
}

function removeListeners(target: Window, l: Listeners): void {
  target.removeEventListener('keydown', l.onKeyDown)
  target.removeEventListener('keyup', l.onKeyUp)
  target.removeEventListener('mousemove', l.onMove)
  target.removeEventListener('mousedown', l.onDown)
  target.removeEventListener('mouseup', l.onUp)
  target.removeEventListener('contextmenu', l.onContextMenu)
  target.removeEventListener('blur', l.onBlur)
}

/** Pointer lock on the page body. Denial is reported by the pointerlockerror event; the promise some browsers also
 * return is only swallowed, so a denial is never reported twice. */
function createLock(doc: Document): PointerLock & { delta: [number, number]; dispose(): void } {
  const listeners = new Set<(e: LockEvent) => void>()
  const emit = (e: LockEvent) => listeners.forEach((cb) => cb(e))
  const delta: [number, number] = [0, 0]
  let ever = false
  // Truthiness, not `!== null`: the property is undefined where pointer lock is unsupported, which must read as unlocked.
  const onChange = () => {
    const locked = Boolean(doc.pointerLockElement)
    if (locked) ever = true
    delta[0] = delta[1] = 0
    emit(locked ? 'locked' : 'unlocked')
  }
  const onError = () => emit('denied')
  doc.addEventListener('pointerlockchange', onChange)
  doc.addEventListener('pointerlockerror', onError)
  return {
    delta,
    request: () => {
      if (doc.pointerLockElement) return
      try {
        const r = doc.body.requestPointerLock() as unknown as Promise<void> | undefined
        r?.catch?.(() => {})
      } catch {
        emit('denied')
      }
    },
    release: () => {
      if (doc.pointerLockElement) doc.exitPointerLock()
    },
    locked: () => Boolean(doc.pointerLockElement),
    everLocked: () => ever,
    onChange: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    takeDelta: () => {
      const d: [number, number] = [delta[0], delta[1]]
      delta[0] = delta[1] = 0
      return d
    },
    dispose: () => {
      doc.removeEventListener('pointerlockchange', onChange)
      doc.removeEventListener('pointerlockerror', onError)
    },
  }
}

type Lock = ReturnType<typeof createLock>

function createListeners(target: Window, down: Set<string>, pressed: Set<string>, mouse: MouseState, lock: Lock): Listeners {
  return {
    onKeyDown: (e) => {
      if (!e.repeat) {
        down.add(e.code)
        pressed.add(e.code)
      }
    },
    onKeyUp: (e) => down.delete(e.code),
    onMove: (e) => {
      if (lock.locked()) {
        lock.delta[0] += e.movementX
        lock.delta[1] += e.movementY
        return
      }
      mouse.x = (e.clientX / target.innerWidth) * 2 - 1
      mouse.y = 1 - (e.clientY / target.innerHeight) * 2
    },
    onDown: (e) => {
      if (e.button === 0) mouse.down = true
      if (e.button === 2) {
        down.add('MouseRight')
        pressed.add('MouseRight')
      }
    },
    onUp: (e) => {
      if (e.button === 0) mouse.down = false
      if (e.button === 2) down.delete('MouseRight')
    },
    onContextMenu: (e) => e.preventDefault(),
    onBlur: () => {
      down.clear()
      mouse.down = false
    },
  }
}

export function createWebInput(target: Window = window): InputAdapter {
  const down = new Set<string>()
  const pressed = new Set<string>()
  const mouse: MouseState = { x: 0, y: 0, down: false }
  const lock = createLock(target.document)
  const listeners = createListeners(target, down, pressed, mouse, lock)
  attachListeners(target, listeners)

  return {
    isDown: (code) => down.has(code),
    pressed: (code) => pressed.has(code),
    mouse: () => mouse,
    lock,
    endTick: () => pressed.clear(),
    dispose: () => {
      removeListeners(target, listeners)
      lock.dispose()
    },
  }
}
