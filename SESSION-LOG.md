# SESSION-LOG

Newest first. Note which agent did the work.

## 2026-09-09 — Claude Code (Fable 5.1) — pass 2 of 3: vertical slice, Level 1 on real assets

Branch `feat/vertical-slice` from `feat/foundation-core`. One real character animating,
Level 1 playable end to end in a real browser, verified by Playwright against the
production build. Screenshot: `docs/screenshots/l1-court.png`.

**Verified numbers (Playwright, `vite preview`, headless Chromium on WSL)**

| Measure | Value | Budget |
|---|---|---|
| Live SkinnedMesh (L1) | 4 (peak 4) | ≤ 12 |
| Triangles at the throne | ~112k | ≤ 120k |
| Draw calls | ~29 | ≤ 80 |
| Renderer | SwiftShader (software) — that is WSL, not the code | — |

**Built**
- `tools/build-assets.mjs` + `tools/decimate.py`: `raw/` → `public/assets/high/` (14 files,
  35 MB, `manifest.json`). Characters and hair via gltf-transform (prune, 1024/512 textures);
  animation GLBs verbatim; palace decimated in Blender 4.2 headless (333k → 39.7k tris, one
  mesh); props welded and joined. KTX2 and the low tier are documented stubs behind
  `--full`. **Built assets are committed** — `raw/` exists only on one machine.
- `src/render/`: loaders (one GLTFLoader + Draco + KTX2, per-id promise cache, one shared
  clip library merged by name, 65-joint skeleton assertion), manifest/tier URL resolution,
  quality tier (override → persisted benchmark → renderer string + 60-frame benchmark),
  character factory, tier materials, merge, instancing, blob shadow, dispose, perf overlay.
- `src/systems/`: animation controller, kinematic locomotion, ground probe, archery (draw,
  ballistics, hit test, procedural aim pose, tick step), interaction rules, skinned budget
  registry, wave scheduler, transient world state.
- `src/entities/`, `src/scenes/L1Court.tsx`, `src/ui/` (HUD, dialogue with typewriter and
  skip, loading, result, flow), `src/platform/` (interface + web adapters), `App.tsx`.
- Save v2 with a persisted benchmark tier and a tested v1 migration.
- Content: L4 targets are five distinct kinds; Maricha card stays in Bala Kanda; Vasishtha
  argues the given word; Tataka's fall is stated plainly. Lakshmana moved out of L1.
- Tests: 71 unit (12 files) + 1 Playwright e2e that drives the real game through L1.

**Decisions**
- `@types/three` stays at 0.185.4: `three` ships no typings and DefinitelyTyped has no
  0.186. Recorded as debt in ARCHITECTURE.md.
- One `SkinnedMesh` per character: the source is three skinned primitives (body, eyes,
  eyebrows); merged with material groups so the budget counts characters.
- Hair is a plain `Mesh` on the `Head` bone (verified 100 % weighted to Head).
- Palace decimated in Blender, not substituted: meshoptimizer floors at ~74k on its
  disconnected shells regardless of settings.
- No pointer lock: A/D turn, W/S move, camera fixed behind. Mouse only aims while drawing.
- Quiz auto-passes (`ui/Flow.tsx`) until the quiz UI exists in pass 3.
- Level 5 is blocked on skinned decimation (see TODO.md). Not attempted here.
- `?debug` shows the perf overlay on a production build (the e2e reads it);
  `?debug=bow` arms the bow in any level to judge the procedural draw.

**Balance changes (reasons)**
- `player.TURN_SPEED_RAD` 6.0 → 3.0: a full spin per second is uncontrollable on a keyboard.
- `archery.AIM_WEIGHTS` raised (arms 0.8–0.9): at the pass-1 values the draw hand barely
  left the chest.
- New blocks `archeryAim`, `interaction`, `locomotion`, `camera`, `render`, and extra `ui`
  entries: every pass-2 tunable, none of which existed before.

**Procedural bow draw — honest verdict** (`docs/screenshots/bow-draw-debug.png`, `?debug=bow`)
Three iterations. The first read as "holding a stick forward": the bow prop was mounted
along the forearm axis and the string hand stayed at the chest. Fixes: grip mounted
perpendicular to the hand (`BOW_GRIP_ROT`), a world-up roll on the bow holder during the
aim (`rollBow` in `aim-pose.ts`), and arm weights raised to 0.8–0.9. As shipped: the bow
arm extends down the aim vector, the bow stands upright, the bow tracks the mouse, and the
string hand rises to head height. It reads as *an archer aiming a bow*. It does not yet
read as a *draw*: there is no nocked arrow, no string deflection, and the string hand
hovers beside the head rather than anchoring at the cheek with the elbow pulled back. Not
broken; unfinished. Next: anchor the hand with a two-bone reach that respects arm length,
add the nocked arrow and a bent string, and drive the draw with an easing curve instead of
the linear fraction.

**Not done**: Electron, menus/codex/quiz UI, levels 2–5, enemy AI, audio content, low tier,
KTX2, costume textures (both bodies still wear the Quaternius superhero skin and read as a
bodybuilder in briefs), dialogue portraits, skinned decimation (L5 blocker).

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
