// Debug switches. The overlay is on in dev and behind ?debug in a production build, because
// the e2e run drives `vite preview` and reads its numbers. ?debug=bow arms the bow in any
// level so the procedural draw can be judged on screen.
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
const debugParam = params.get('debug')

export const DEBUG = {
  overlay: import.meta.env.DEV || debugParam !== null,
  bow: debugParam === 'bow',
} as const
