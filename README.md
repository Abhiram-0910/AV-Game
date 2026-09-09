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
npm run assets:build # regenerate public/assets/{low,high}   (pass 2)
npm run electron:dev # desktop dev                           (pass 2)
npm run package:win | package:linux                          (pass 2)
```

## Layers

`data` ← `core` ← `systems` ← `entities` ← `scenes`. `core` and `data` never import
`three` or React; ESLint enforces it and `tests/unit/lint-boundary.test.ts` proves it.
