# CLAUDE.md — bala-kanda

Read `ARCHITECTURE.md` and `AGENTS.md` first; they are the contract. This file is only
the gotchas that are not derivable from the tree.

## Gotchas

- **Installed versions beat the docs.** Vite 8, Vitest 5, TypeScript 6, ESLint 10 (flat
  config only). ARCHITECTURE.md says Vite 7; treat the lockfile as truth.
- **`erasableSyntaxOnly` is on.** No `enum`, no `namespace`, no constructor parameter
  properties. Use `as const` objects and union types (see `src/data/clips.ts`).
- **`src/data/**` has zero imports, lint-enforced** (even relative and `import type`).
  Cross-file references are plain strings; `tests/unit/content.test.ts` checks that every
  level → dialogue key / waypoint / gate / codex id resolves. Add to that test when you add
  a new cross-reference, not an import.
- **`src/core/**` bans `three`, `@react-three/*`, `react`, and every upward alias.**
  `tests/unit/lint-boundary.test.ts` runs ESLint programmatically to prove the rule fires.
  `src/systems/**` may import `three` (procedural archery needs its math).
- **Data files are exempt from `max-lines`** (300 is a code rule). Functions ≤ 50 lines
  is enforced by ESLint on `src/**`; long store factories must be split into slices.
- **Path aliases live in two places**: `vite.config.ts` `resolve.alias` and
  `tsconfig.app.json` `paths`. TS 6 deprecates `baseUrl`; paths are tsconfig-relative.
- **`vite-plugin-static-copy` writes to `dist/vendor/`**, not `public/`, and serves the same
  URLs in dev. Loaders must use `/vendor/draco/` and `/vendor/basis/`.
- **`@types/three` (0.185) lags `three` (0.186)** by one minor. Bump both together in pass 2.
- **The zustand store is vanilla** (`zustand/vanilla`). Wrap with `useStore(gameStore, sel)`
  in React; never import React into `src/core`.
- **Tests live in `tests/unit/`**, included in `tsconfig.app.json`. The GLB clip test reads
  `raw/staged/anims/*.glb` and skips when `raw/` is absent (it is gitignored).
- **`rtk` wraps npm/npx.** `npx vitest` may print "parser: All parsing tiers failed" and
  leave a stale `.vitest/json/output.json`. Run `./node_modules/.bin/vitest run` directly
  when you need the real result.
- **No AI attribution trailers in commits**, ever (user rule, overrides tool defaults).
