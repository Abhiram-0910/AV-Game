# TODO

## Pass 2 — rendering, systems, platform (not started)

- `src/render/` — GLTF loader with `DRACOLoader.setDecoderPath('/vendor/draco/')` and
  `KTX2Loader.setTranscoderPath('/vendor/basis/')`; quality-tier detection; instancing;
  blob shadows; disposal helper called by scene unmount.
- `src/systems/` — locomotion (kinematic capsule), archery (procedural aim over
  `BALANCE.archery.AIM_BONES`, no bow clip exists), astra, enemy AI, spawner honouring
  `Wave.maxAlive` as a global cap and `BALANCE.spawn.MAX_SKINNED`.
- `src/entities/` — Player, Rakshasa, Tataka, Arrow, Yajna, NPC (shared skeleton, one
  clip library loaded once, `CLIPS` only).
- `src/scenes/` — L1Court … L5Yajna, each disposing on unmount.
- `src/ui/` — HUD, dialogue, quiz, codex, menus; strings via `UI` / `DIALOGUE` keys only.
- `src/platform/` — save (localStorage vs Electron userData) using `core/save`; audio
  (Howler); input; fullscreen.
- `useFrame` driver calling `createFixedLoop().advance()` and interpolating with alpha.
- `electron/main.ts` + `preload.ts`, `"main"` field in package.json, electron-builder
  config, `--ozone-platform=x11` on Linux. Scripts `electron:dev`, `package:win`,
  `package:linux` already exist and point at these missing files.
- `tools/build-assets.mjs` (gltf-transform + toktx + Blender). `assets:build` script exists.
- `tests/e2e/` smoke test (Playwright config is ready; `npm run e2e` has no specs yet).
- Bump `@types/three` to match `three` 0.186.

## Assets

- **`public/assets/` is unbuilt.** Nothing is compressed, atlased, or tiered yet. Character
  source textures are 2–4k PNGs and must go through `assets:build` before use.

## Open questions from pass 1

- L4 fail on `arrowsOut` is triggered by systems (after the last arrow lands), not by the
  store — see `fail()` in `src/core/game-state.ts`.
- Tataka's on-screen defeat wording ("fell") is faithful but implicit; confirm with a
  teacher reviewer.
