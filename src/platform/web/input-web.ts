// Keyboard state plus mouse position relative to the viewport centre. No pointer lock:
// lab trackpads and a click-to-capture cursor are a classroom support problem.
import type { InputAdapter, MouseState } from '../platform'

export function createWebInput(target: Window = window): InputAdapter {
  const down = new Set<string>()
  const pressed = new Set<string>()
  const mouse: MouseState = { x: 0, y: 0, down: false }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return
    down.add(e.code)
    pressed.add(e.code)
  }
  const onKeyUp = (e: KeyboardEvent) => down.delete(e.code)
  const onMove = (e: MouseEvent) => {
    mouse.x = (e.clientX / target.innerWidth) * 2 - 1
    mouse.y = 1 - (e.clientY / target.innerHeight) * 2
  }
  const onDown = (e: MouseEvent) => {
    if (e.button === 0) mouse.down = true
  }
  const onUp = (e: MouseEvent) => {
    if (e.button === 0) mouse.down = false
  }
  const onBlur = () => {
    down.clear()
    mouse.down = false
  }
  target.addEventListener('keydown', onKeyDown)
  target.addEventListener('keyup', onKeyUp)
  target.addEventListener('mousemove', onMove)
  target.addEventListener('mousedown', onDown)
  target.addEventListener('mouseup', onUp)
  target.addEventListener('blur', onBlur)

  return {
    isDown: (code) => down.has(code),
    pressed: (code) => pressed.has(code),
    mouse: () => mouse,
    endTick: () => pressed.clear(),
    dispose() {
      target.removeEventListener('keydown', onKeyDown)
      target.removeEventListener('keyup', onKeyUp)
      target.removeEventListener('mousemove', onMove)
      target.removeEventListener('mousedown', onDown)
      target.removeEventListener('mouseup', onUp)
      target.removeEventListener('blur', onBlur)
    },
  }
}
