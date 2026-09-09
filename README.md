# bala-kanda — Rama: Guardian of the Yajna

A 15-minute 3D action game on Valmiki's Bala Kanda for Classes 6–10. Web build plus
offline Windows/Linux desktop builds. See `ARCHITECTURE.md` for the design and `AGENTS.md`
for the rules every contributor and agent follows.

## Commands

```
npm run dev          # Vite dev server
npm run build        # typecheck + production build (dist/)
npm run preview      # serve dist/
npm run test         # Vitest unit tests (headless core)
npm run e2e          # Playwright against the preview server
npm run typecheck    # tsc -b
npm run lint         # eslint .
npm run assets:build # regenerate public/assets/high from raw/ (needs raw/, gltf-transform, Blender)
npm run electron:dev # desktop dev                           (pass 3)
npm run package:win | package:linux                          (pass 3)
```

## Debug flags

`/?debug` shows the perf overlay (triangles, draw calls, live SkinnedMesh count) on any
build and exposes `window.__bk` for tests. `/?debug=bow` arms the bow in every level so the
procedural draw can be judged. Controls: W/S walk, A/D turn, Shift jog, E talk, Space next
line, Esc skip, hold the mouse button to draw when the bow is armed.

## Layers

`data` ← `core` ← `systems` ← `entities` ← `scenes`. `core` and `data` never import
`three` or React; ESLint enforces it and `tests/unit/lint-boundary.test.ts` proves it.
