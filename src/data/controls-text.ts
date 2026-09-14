// Strings for mouse look and the astra aim. Kept out of dialogue.ts while the voice agent owns that file
// (2026-09-14); fold into UI there on merge.
export const CONTROLS_TEXT = {
  'mouse.engage.title': 'Click to look around with the mouse',
  'mouse.engage.hint': '[M] the mouse aims instead · arrow keys always turn',
  'mouse.look': 'Mouse: look around',
  'mouse.aiming': 'Mouse: aiming',
  'mouse.aim': 'Mouse: aim',
  'mouse.key': '[M]',
  'mouse.blocked': 'Mouse look is blocked on this computer. Arrow keys turn; the mouse aims.',
  'settings.mouseMode': 'Mouse',
  'settings.mouseMode.look': 'Look around',
  'settings.mouseMode.aim': 'Aim only',
  'settings.pointer': 'Pointing device',
  'settings.pointer.mouse': 'Mouse',
  'settings.pointer.trackpad': 'Trackpad',
  'settings.mouseSensitivity': 'Mouse sensitivity',
  'settings.trackpadSensitivity': 'Trackpad sensitivity',
  'astra.cone.in': 'Maricha is in the wind’s path',
  'astra.cone.out': 'Maricha is outside the wind’s path',
} as const

export type ControlsTextKey = keyof typeof CONTROLS_TEXT
