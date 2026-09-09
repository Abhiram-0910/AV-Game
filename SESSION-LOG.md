# SESSION-LOG

Newest first. Note which agent did the work.

## 2026-09-09 — Claude Code (Fable 5.1) — pass 1 of 2: config, data, domain

Branch `feat/foundation-core`. Headless only; no three.js, no React components.

**Built**
- Config: Vite aliases + static copy of Draco/Basis decoders to `/vendor/`; strict TS with
  matching `paths`; ESLint boundary (`core`/`data` cannot import `three`, `@react-three/*`,
  React, or upward layers; `data` cannot import at all); named-exports-only and
  file/function limits as lint rules; Vitest (jsdom) inline in `vite.config.ts`;
  Playwright against `vite preview`; all package scripts; Vite demo deleted.
- `src/data/`: `balance.ts`, `clips.ts` (29 mappings, verified against the 86 clips in
  the two GLBs), `levels.ts` (5 levels, L5 waves ≤ 12 SkinnedMesh), `dialogue.ts`
  (UI + speeches), `quiz.ts` (4 gates × 3), `codex.ts` (5 cards).
- `src/core/`: `game-state.ts` (vanilla zustand), `level-machine.ts`, `objectives.ts`,
  `combat-rules.ts`, `progression.ts`, `save.ts` (v1 only, invalid → default).
- `src/systems/loop/fixed-loop.ts`: 60 Hz accumulator, alpha output, substep clamp.
- 8 test files, 50 tests, all green. `typecheck`, `lint`, `build` green.

**Decisions**
- Quiz and codex text live in their own data files (rule intent: all strings in `src/data`).
- No save v0 migration — nothing shipped. Single fallback path.
- `src/systems` may import `three`; only `core` and `data` are banned.
- Level target times trimmed to 440 s total so 2× lands inside 15 minutes.

**Balance changes**: initial values authored; no prior values existed.

**Next**: pass 2 per `TODO.md`.
