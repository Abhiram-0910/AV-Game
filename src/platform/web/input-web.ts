// Keyboard state plus mouse position relative to the viewport centre. No pointer lock:
// lab trackpads and a click-to-capture cursor are a classroom support problem.
import type { InputAdapter, MouseState } from '../platform'

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

export function createWebInput(target: Window = window): InputAdapter {
  const down = new Set<string>()
  const pressed = new Set<string>()
  const mouse: MouseState = { x: 0, y: 0, down: false }

  const listeners: Listeners = {
    onKeyDown: (e) => {
      if (!e.repeat) {
        down.add(e.code)
        pressed.add(e.code)
      }
    },
    onKeyUp: (e) => down.delete(e.code),
    onMove: (e) => {
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

  attachListeners(target, listeners)

  return {
    isDown: (code) => down.has(code),
    pressed: (code) => pressed.has(code),
    mouse: () => mouse,
    endTick: () => pressed.clear(),
    dispose: () => removeListeners(target, listeners),
  }
}
