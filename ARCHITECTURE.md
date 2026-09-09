# ARCHITECTURE.md — Rama: Guardian of the Yajna (bala-kanda)

A 15-minute 3D action game covering Bala Kanda (Vishwamitra's request → protecting the
yajna) for Classes 6–10 in Indian schools. Ships as a web build and as offline Windows
and Linux desktop builds with identical behaviour.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Renderer | three.js 0.186 (WebGL2) | Native GLB, runs on integrated GPUs, no WebGPU dependency |
| Scene layer | React Three Fiber 9.7 + drei 10.7 | Entire game is TypeScript text files — agent-authorable, no editor |
| Language/Build | TypeScript strict + Vite 8 | Fast HMR, trivial multi-target config |
| React | 19.2.0, pinned exactly | R3F 9.7 declares `peer react ">=19 <19.3"` |
| State | Zustand 5 | Single store, selector subscriptions, no re-render cascades |
| Physics | None — custom kinematic + raycast | Ballistics and capsule overlaps are ~200 lines; a physics engine buys nothing here |
| Animation | three AnimationMixer, one shared 65-joint skeleton | One clip library, zero retargeting |
| Audio | Howler.js | Reliable cross-browser autoplay/unlock handling |
| Desktop | Electron + electron-builder | Bundles Chromium+ANGLE → Windows and Linux render identically to web |
| Assets | gltf-transform + KTX-Software 4.4.2 (`toktx`) + Blender 4.2.5 headless | Scriptable pipeline, no GUI step |
| Tests | Vitest (core) + Playwright (browser) | Core is engine-free, tests headless in ms |
| Hosting | Cloudflare Pages | Free, correct headers for KTX2/wasm |

Rejected: Unity 6 (editor-bound, weakest exactly on the WebGL target), Godot 4
(scene-file-centric, weaker agent fluency), Tauri (WebKitGTK WebGL is the most variable
thing in the target environment), Rapier (payload and perf variable for zero gain),
Google Cloud (no server exists; a cloud dependency in an offline lab is a liability).

## Structure

```
src/
  data/      PURE DATA, zero imports — levels, dialogue, quiz, codex, balance
  core/      DOMAIN, zero three.js — store, level machine, combat rules, progression, save
  systems/   GAMEPLAY — archery, astra, locomotion, ai, spawner, loop
  entities/  R3F components — Player, Rakshasa, Tataka, Arrow, Yajna
  scenes/    one per level — L1Court … L5Yajna
  render/    loaders, KTX2/Draco, materials, instancing, tier config, blob shadows, post-fx
  ui/        React DOM overlay — hud, dialogue, quiz, codex, menus
  platform/  save/audio/input/fullscreen — web vs electron adapters
electron/    main.ts, preload.ts (contextIsolation on, nodeIntegration off)
public/assets/{low,high}/   BUILT assets only
tools/       pipeline scripts — blender .py, gltf-transform runners
raw/         gitignored — source zips, unitypackage, staged character/animation source
```

**Dependency direction is one-way:** `data` ← `core` ← `systems` ← `entities` ←
`scenes`. `ui` imports `core` and `data` only. `render` is never imported by `core`.

**The boundary that must not break:** `core/` and `data/` may not import `three` or
`@react-three/*`. Enforced by an ESLint `no-restricted-imports` rule.

**Characters (pass 2):** `render/character-factory.ts` is the only way a humanoid is built.
The source mesh is three skinned primitives (body, eyes, eyebrows); the factory merges them
into **one `SkinnedMesh`** with three material groups so the 12-instance budget counts
characters, not primitives. Hairstyles are 100 % weighted to `Head`, so they attach as plain
meshes on that bone. Both animation GLBs load once and the clip array is shared.

## Data flow

Boot detects a quality tier (`WEBGL_debug_renderer_info` + a 60-frame benchmark), stores
it, and the loader picks `assets/low` or `assets/high`. Each level fully preloads behind
a progress bar — nothing streams mid-level, because a hitch at a boss spawn on a lab PC
loses the player.

Zustand holds all game state (level, phase, health, arrows, astras, quiz, codex). Scenes
and entities subscribe with narrow selectors. Input feeds the locomotion and archery
systems, which mutate state through actions only.

All combat, ballistics, and AI run on a **fixed 60Hz timestep with an accumulator**
inside one `useFrame`, rendering interpolated between steps. A 144fps dev machine and a
28fps lab machine must play identically.

Saves are a versioned JSON blob via `platform/save` — `localStorage` on web, userData
file under Electron. `level-machine` explicitly disposes geometry, materials, and
textures on transition; three.js does not free GPU resources on unmount and a five-scene
session will VRAM-starve an integrated GPU without it.

## Decisions

- **R3F over Unity/Godot** — the only stack where the entire game is agent-authorable
  text. Scenes and prefabs in the alternatives are editor artefacts.
- **One shared 65-joint skeleton for every humanoid.** Verified: the Quaternius Universal
  Base Characters and the Universal Animation Library Unreal-Godot exports have byte-
  identical joint lists (`root`, `pelvis`, `spine_01…`), so clips play with zero
  retargeting and zero Blender in the character path. A second skeleton would multiply
  the animation payload and the CPU skinning cost for no gain.
- **Fixed timestep from day one** — retrofitting means retuning all balance values.
- **No physics engine** — nothing in the design needs stacking, joints, or ragdolls.
- **KTX2 + Draco, two-tier manifest** — the difference between a 40MB and a 200MB build,
  and between compressed and uncompressed textures on a GPU sharing system RAM.
- **Electron over Tauri** — ~120MB per platform buys identical Chromium/ANGLE rendering
  on Windows and Linux. Ubuntu 24.04 defaults to Wayland, where Electron's native WebGL
  init frequently yields a black canvas; `--ozone-platform=x11` is mandatory.
- **All user-visible strings live in `src/data/`** (`dialogue.ts`, `quiz.ts`, `codex.ts`) —
  English only ships, but Hindi/Telugu becomes a translation job rather than archaeology.
- **Quality tiers are one build** — a runtime `QualityTier` plus two asset directories.
- **No backend, no accounts, no telemetry** — children's data is a liability with no
  offsetting benefit, and the game must work with the network unplugged.

### Performance model (corrected after research)

Intel UHD is unified-memory and **CPU-bound**, not fill-rate-bound. `AnimationMixer` and
`updateMatrixWorld` on the JS main thread dominate, measured at up to 75% of frame time
on low-end CPUs. The governing budget is therefore **≤ 12 concurrent SkinnedMesh
instances**, not a triangle count. Secondary budgets: ≤ 120k triangles (≤ 60k skinned),
≤ 80 draw calls, ≤ 200MB texture memory, ≤ 60MB downloaded. Exactly 4 skin weights per
vertex — a hard WebGL shader limit; exceeding it silently truncates the buffer.

### Asset decisions

- **Characters (settled).** Two meshes: `Superhero_Male_FullBody` (14.3k tris) and
  `Superhero_Female_FullBody` (15.1k tris), CC0, plus 8 hairstyle meshes rigged to the
  head bone. Rama, Lakshmana, Vishwamitra and both rakshasas are the male mesh
  differentiated by texture, scale, hair and props. Tataka is the female mesh scaled up.
- **Animation (settled).** Universal Animation Library Standard, 86 clips across two GLBs
  (`UAL1_Standard.glb`, `UAL2_Standard.glb`; 85 unique, `A_TPose` in both) on the matching
  skeleton, loaded once, merged by clip name, and shared. Covers idle, walk, jog, sprint, sword attack/idle,
  spell enter/idle/shoot (→ astras), hit chest/head, death, sitting idle/talking
  (→ Dasharatha enthroned), idle-talking (→ every dialogue NPC), interact, and A_TPose as
  the rig reference. Use the in-place export, not `_RM`.
- **Archery is the one open gap.** No bow clips in the free tier. Options in order of
  preference: a clip set from Universal Animation Library 2 if the free tier includes one,
  editing the three `Pistol_Aim_*` poses in Blender, or a third-party archery pack with a
  one-time Blender retarget. Not blocking — no other system depends on it.
- **Discarded**: `jatayu_-_nusantara.glb` (1.50M tris, wrong kanda), `lord_hanuman.glb`
  (668k, wrong kanda), `68b15ad….glb` (1.26M, unidentified). 190MB of dead weight.
- **Meshy characters → 2D portraits.** All four are unrigged and 120–197k tris. Rendered
  once in Blender to 1024px PNGs for the dialogue UI. Full visual value, zero runtime cost.
- **Quaternius/Poly props are the art direction.** 224–6,265 tris, CC0. Trees, grass and
  rocks render through `InstancedMesh`.
- **DemonLord2** (from the .unitypackage, 15 clips, its own rig) → held in reserve for
  Subahu only if a distinct boss silhouette proves necessary. Prefer the shared skeleton;
  introducing a second rig costs CPU budget we don't have.
- **`monster.glb`** is skinned with zero clips — rig donor, low priority.

### Design decisions

- **Five levels, three mechanics.** The source doc proposed 12 levels and 8 systems in
  10 minutes — 45 seconds per system, all shallow. Cut to move-and-interact, bow archery,
  and astras, reused with escalating pressure.
- **Built for ~8 minutes of ideal play** to land inside a 15-minute real session.
  Playtests with kids run 1.5–2x the designer's estimate.
- **Learning payload is a Story Scroll codex plus non-punishing 3-question quiz gates**,
  not a quiz bolted on the end.

## Technical debt

- [ ] Quality tier auto-detection is heuristic; needs validation on real lab hardware.
- [ ] Level unload disposal is manual — a leak here shows up only after ~10 minutes.
- [ ] Blob shadows instead of real shadows on low tier; acceptable, but noticeable.
- [ ] Archery animation unresolved (see above).
- [ ] Character source textures are 2–4k PNGs; resized to 1024 by the pipeline, not yet
      atlased or KTX2-compressed.
- [ ] `@types/three` lags `three` by one minor (0.185.4 against 0.186.0). `three` ships no
      typings of its own and DefinitelyTyped had not published 0.186 as of 2026-09-09; the
      0.185 declarations typecheck against every 0.186 API we use. Bump when it appears.
- [ ] `public/assets/low/` is unbuilt; `render/manifest.ts` serves the high tier to both.
- [x] Skinned decimation for Level 5 — resolved pass 3 phase B. `characters/male-low.glb` /
      `female-low.glb` (~4.7k tris each) via `tools/decimate-skinned.py`; 12 concurrent stays
      under the 60k skinned budget. See `TODO.md` for the spawn-time policy still needed.

---

## Standards

Follows the full `engineering-standards` skill: repository structure, layer boundaries,
dependency direction, file/function limits, naming, branching, SemVer, deployment gates,
logging.

**Overrides for this project:**

- Solo build — `main` + `feat/*` with squash merge, not the four-branch chain.
- No CODEOWNERS, single maintainer.
- Version stays `0.x` until the first real school pilot; `1.0.0` on first install.
- Limits: files ≤ 300 lines, functions ≤ 50, React components ≤ 200.
- Named exports only. `PascalCase.tsx` for components, `kebab-case.ts` for the rest.
