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
- **`@types/three` (0.185.4) lags `three` (0.186)** by one minor. `three` ships no typings and
  DefinitelyTyped had no 0.186 on 2026-09-09; the 0.185 declarations cover every API we use.
  Bump when it appears, never remove.
- **The zustand store is vanilla** (`zustand/vanilla`). Wrap with `useStore(gameStore, sel)`
  in React; never import React into `src/core`.
- **Tests live in `tests/unit/`**, included in `tsconfig.app.json`. The GLB clip test reads
  `raw/staged/anims/*.glb` and skips when `raw/` is absent (it is gitignored).
- **`rtk` wraps npm/npx.** `npx vitest` may print "parser: All parsing tiers failed" and
  leave a stale `.vitest/json/output.json`. Run `./node_modules/.bin/vitest run` directly
  when you need the real result.
- **`public/assets/high/` is committed.** `raw/` exists only on Abhi's machine; a clone or a
  Cloudflare Pages build has nothing to rebuild from. Regenerate with `npm run assets:build`
  (needs `raw/`, gltf-transform, and Blender on PATH for the palace), then commit the output.
- **One `SkinnedMesh` per character.** The source gltf has three skinned primitives; the
  factory merges them with material groups. Never count primitives against the 12 budget,
  and never add a `SkinnedMesh` outside `render/character-factory.ts`.
- **Hair is a plain `Mesh` on the `Head` bone** (100 % weighted to Head, baked into head
  space). The head bone is capitalised `Head`; every other joint is lower snake case.
- **Scene mount effects run after child effects.** `resetWorld` must not clear the
  registries entities fill on mount (`world.npcs`, `ground`, `hittable`); they clean up
  themselves on unmount.
- **A `useFrame` with priority > 0 turns off R3F's automatic render.** Use ≤ 0.
- **`?debug` shows the perf overlay on a production build** (the e2e reads it);
  `?debug=bow` arms the bow in any level. `window.__bk` exposes the stores read-only for
  tests under the same flag.
- **`playwright-cli` is not global.** Use `./node_modules/.bin/playwright cli --browser=chromium …`
  (the default `chrome` channel is not installed; rtk also mangles `npx playwright`).
- **Headless Chromium on this WSL renders through SwiftShader.** Expect ~5–10 fps and a
  4-minute e2e; that is the environment, not a regression.
- **`playwright.config.ts`'s `webServer` runs `npm run preview`, never `npm run build`.**
  `reuseExistingServer` (default outside CI) means a stale `dist/` — or an already-running
  preview server from an earlier session — silently serves old code to every e2e run with no
  error; the symptom is a level that never finishes loading (0 Skinned meshes, phase stuck at
  `'loading'`) even though the source is correct. Run `npm run build` before `playwright test`
  whenever `src/` changed since the last build.
- **three caches an equirect `scene.background` as a cubemap per texture.** `needsUpdate` on a repainted canvas
  does nothing. Build a new texture and dispose the old one, which frees its cubemap (L3 curse lift,
  `entities/WildsDressing.tsx`).
- **A failed level under e2e looks like a silent reset.** `ResultPanel` autofocuses Retry and the spec's next
  `mouse.down/up` lands on it: objectives reset, arrows do not. Find out why the level failed (L4: `arrowsOut`)
  before debugging the reset.
- **`mergeByMaterial` silently drops a bucket that mixes indexed and non-indexed geometry** (`mergeGeometries`
  returns null). Polyhedron geometries (Dodecahedron, Icosahedron) are non-indexed; give them their own material.
- **No AI attribution trailers in commits**, ever (user rule, overrides tool defaults).
