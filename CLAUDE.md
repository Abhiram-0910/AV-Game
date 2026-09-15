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
- **Chrome on this Optimus laptop renders WebGL on the Intel UHD, not the RTX 4050**, even with
  `powerPreference: 'high-performance'`. That is why the human saw the low tier (reason `weakGpu`). Only
  `--force_high_performance_gpu` (Electron sets it) or the Windows Graphics "High performance" setting moves it. A saved
  tier is reused only on the renderer it was measured on (`save.benchmarkRenderer`).
- **Real-GPU numbers come from `tools/bench-gpu.mjs`, run by Windows `node.exe`** through the `\\wsl.localhost` path. It
  drives Windows Chrome against the WSL preview. WSL's Chromium is SwiftShader and says nothing about a GPU. Measure
  delivered frame intervals: `gl.finish()` timing does not include GPU time on ANGLE/D3D11 (it read 5 ms on a UHD
  running at 13 fps). `?density=K` scales the wilds for sweeps.
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
  `mouse.down/up` or Enter can land on it, starting a new attempt (the scene remounts, everything resets). Find out why
  the level failed (L4: `arrowsOut`) before debugging the reset.
- **`mergeByMaterial` de-indexes a bucket that mixes indexed and non-indexed geometry** (Extrude, RoundedBox and the
  polyhedra have no index) and `console.warn`s if a merge still fails. An `InstancedMesh` must be added after the
  merge: the merge would flatten it to one copy of its geometry (`court-ornaments.ts` torans).
- **palace.glb's columns and chairs are cut at runtime** (`render/palace-surface.ts`) by world-space boxes in `COURT`
  (a triangle goes only when all three vertices are inside one box; floor triangles always stay for the ground probe),
  and `render/court-architecture.ts` rebuilds the columns at the measured centres. Moving or rescaling the palace
  placement invalidates every box and column: re-measure (`docs/screenshots/palace-measure-*.png`, SESSION-LOG
  2026-09-14).
- **A cut box may carry `keepFlatBelow`** (`render/palace-surface.ts`): flat faces with every vertex below it survive.
  The right platform's rug-disc rims share their footprint and height (y 0.42) with separate deck fans, so only that
  rule removes them without holes (`COURT.platformCuts`, `palace-measure-platform-rims.png`).
- **Rama's L1 shadow is real but hidden from the follow camera.** The key light sits behind the camera; five key
  directions and a lighter carpet were tried on the 4050 and none reads (TODO, SESSION-LOG 2026-09-14). A side view
  shows it. Do not chase it as a `castShadow` or frustum bug.
- **GTAO runs on L1 only (`LevelLook.ao`) and wraps GTAOPass's private `_overrideVisibility`/`_restoreVisibility`**
  to hide transparent and additive meshes and pause shadow-map updates during its normal pass. `@types/three` names
  them without the underscore; re-check on every three bump. The normal pass re-renders the scene, so the overlay's
  L1 triangle count includes it: `?ao=0` gives the scene alone.
- **rtk routes `grep` through ripgrep:** an unescaped `{` in a pattern errors, and in an `&&` chain it silently skips
  what follows (it skipped a `pkill`, so the old preview kept port 4173). Use `/usr/bin/grep -F`. `pkill -f` matches the command line of the
  shell running it: stop the preview with `pkill -f "[v]ite preview"` in a command that does not itself start
  `vite preview` (otherwise it kills itself, exit 143/144, and nothing is left listening).
- **No AI attribution trailers in commits**, ever (user rule, overrides tool defaults).
- **The bow aims along the cursor ray, not the cursor's offset from the screen centre.** `FollowCamera` writes
  `world.aimRay` every frame; `aimFromRay` (ballistics.ts) turns it into `world.aimDir`. The four `AIM_*` limits in
  `balance.ts` were measured against the real target ranges (SESSION-LOG 2026-09-13); re-run that sweep before changing
  them. Astra hitscans use `world.aimRay` directly.
- **e2e specs aim like a player: `tests/e2e/play.ts`.** Project the target with `window.__bk.camera`, raise the cursor
  until `crosshair[data-target-locked]` flips, release. Never reintroduce a pitch solver in a spec: it hid the vertical
  launch for a whole release.
- **`steerTo` tap-walks near its target.** Under a traced SwiftShader run one poll with W held carries the bot ~1.8 m, wider
  than an arrival circle, so arrival came down to timing: a 10–20 % slower frame made L1's approach miss every time
  (SESSION-LOG 2026-09-14). Never go back to holding W through the poll near the target.
- **Retry is a remount.** `RETRY` bumps `gameStore.attempt` and `App.tsx` keys the scene on it, so every entity
  re-registers. Never reset level state in place; entities that register on mount (targets, enemies) will not come back.
- **`arrow.glb` stands upright** (head at −Y). Orient arrows only through `render/arrow-model.ts`.
- **The low tier's outdoor dressing depends on the renderer.** On a real GPU, low mounts `WILDS.<level>.low` (L2–L4 at
  80–105k tris). On a software renderer (SwiftShader: every e2e and `shoot-levels` run in WSL) `WildsDressing` builds
  nothing. With it, L2's and L3's e2e ran past their 15-minute timeouts. Measure low on the Intel UHD with
  `tools/bench-gpu.mjs`, never from a SwiftShader count.
- **A sword slash has a cooldown** (`melee.SLASH_TICKS`), and a strike counts at its first tick. A spec that presses F
  again as soon as a count rises is ignored: wait for `world.tick >= world.swordSlashUntilTick`.
