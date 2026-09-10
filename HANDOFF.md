# AV-Game — Handoff

**Repo:** https://github.com/Abhiram-0910/AV-Game.git
**Branch:** `main` (all work merged, 9 commits)
**Companion archive:** `AV-Game-raw-assets.zip` — gitignored source assets, unzip to `raw/` at the repo root

You are taking this from a working prototype to production. Everything below is what was
built, what was decided and why, and what is still wrong. Read the "What is wrong" section
first — it is the actual job.

---

## 1. What the game is

**Rama: Guardian of the Yajna** — a 15-minute single-player 3D action game covering the
Bala Kanda of the Ramayana, from Vishwamitra's request at Dasharatha's court to the
protection of the yajna. Built for Classes 6–10 in Indian schools.

Five levels, three mechanics (move-and-interact, bow archery, astra specials), reused with
escalating pressure. An educational payload of quiz gates between levels and an unlockable
"Story Scroll" codex.

**This is intended for real deployment in schools, not a demo.** That drives several
constraints that are not negotiable:

- Must hold 60fps in a browser on an integrated-graphics lab PC (Intel UHD class)
- Must also ship as offline Windows and Linux desktop builds that behave identically
- No accounts, no login, no analytics, no collection of any user data — children's data
  under India's DPDP Act is a liability with no offsetting benefit
- Must work with the network unplugged
- Content must be defensible to a teacher: faithful to Valmiki, no invented theology,
  no gore, nothing that could offend

---

## 2. Current state — honest summary

Mechanically the game is complete end to end. All five levels are playable, the flow works,
saves persist, the UI is wired, and there is a full test suite. **Visually and in terms of
game feel, it is a prototype.** The original author's own assessment after playing it:
graphics are poor, archery does not land, controls are not good, there is no audio at all,
and the characters are not appropriate for the subject matter.

None of that is a broken build. It is unfinished work, and it is your work.

| Area | State |
|---|---|
| Five levels, playable start to finish | Done |
| Story, dialogue, quizzes, codex content | Done, written, reviewed |
| Domain logic, save/load, progression | Done, unit tested |
| Full UI (title, settings, pause, quiz, codex, ending) | Done |
| Enemy AI, combat, boss fight | Done |
| Electron desktop shell | Built, **never rendered on a real GPU** |
| Audio | **Nothing exists.** Zero sound files. |
| Archery aiming | **Broken in practice.** See §6. |
| Character appearance | **Not acceptable for the subject.** See §6. |
| Visual quality (lighting, shading, sky) | **Prototype grade.** See §6. |
| Level 5 balance | **Unverified.** No human has cleared it. |
| Low quality tier / texture compression | **Not built.** Falls back to high. |

---

## 3. Setup

Requires Node 22, and for the asset pipeline, Blender 4.2+ and KTX-Software.

```bash
git clone https://github.com/Abhiram-0910/AV-Game.git
cd AV-Game
npm install
npm run dev            # http://localhost:5173
```

**React is pinned to exactly 19.2.0.** `@react-three/fiber@9.7` declares
`peer react ">=19 <19.3"`. Do not add a caret, do not upgrade React, and do not resolve the
peer conflict with `--legacy-peer-deps` — R3F's reconciler tracks React internals.

Unzip `AV-Game-raw-assets.zip` so its contents sit at `raw/` in the repo root. You only need
this if you want to regenerate `public/assets/` — the built assets are committed, so the game
runs without it.

To regenerate assets you also need:

```bash
# Blender 4.2 LTS (the apt build is too old)
wget https://download.blender.org/release/Blender4.2/blender-4.2.5-linux-x64.tar.xz
tar xf blender-4.2.5-linux-x64.tar.xz && sudo mv blender-4.2.5-linux-x64 /opt/blender
sudo ln -sf /opt/blender/blender /usr/local/bin/blender

# KTX-Software 4.4.x — needed for toktx. Do NOT use 5.x, it drops toktx.
curl -sL "https://api.github.com/repos/KhronosGroup/KTX-Software/releases?per_page=30" \
  | grep -o 'https://[^"]*KTX-Software-4\.[0-9.]*-Linux-x86_64\.deb' | head -1 > /tmp/ktxurl
wget -O /tmp/ktx.deb "$(cat /tmp/ktxurl)" && sudo apt install -y /tmp/ktx.deb
```

### Commands

```
npm run dev            vite dev server
npm run build          tsc -b && vite build
npm run preview        serve the production build
npm run test           vitest, unit tests
npm run e2e            playwright, full level playthroughs
npm run typecheck      tsc -b
npm run lint           eslint
npm run assets:build   regenerate public/assets/high from raw/
npm run electron:dev   run the desktop shell
npm run package:win    electron-builder, Windows
npm run package:linux  electron-builder, Linux
```

### Debug flags

Append to the URL: `?debug` shows the perf overlay, `?debug=bow` puts a bow in Rama's hands
in Level 1 so the draw pose can be inspected, `?debug=lod` opens a side-by-side comparison
of high and low detail meshes.

---

## 4. Architecture

The single most important rule in this codebase:

**`src/core/` and `src/data/` must never import `three` or `@react-three/*`.** This is
enforced by an ESLint `no-restricted-imports` rule and there is a unit test
(`tests/unit/lint-boundary.test.ts`) that proves the rule fires. It exists so all game logic
is testable headless in milliseconds and so the rendering layer can be replaced without
touching the game. If a change appears to require breaking it, the design is wrong.

Dependency direction is one-way: `data` ← `core` ← `systems` ← `entities` ← `scenes`.
`ui` imports `core` and `data` only. Nothing imports upward.

```
src/
  data/      PURE DATA, zero imports of any kind
             balance.ts    every tunable number in the game
             levels.ts     all five level definitions, spawns, objectives, waves
             dialogue.ts   every user-visible string, keyed for i18n
             quiz.ts       the four quiz gates
             codex.ts      Story Scroll cards
             clips.ts      semantic clip name -> Quaternius clip string registry
             characters.ts per-character mesh, tint, scale, hair, props
             scenery.ts    per-level static placements, NPC positions, lighting
  core/      DOMAIN, no three.js, unit tested
             game-state.ts zustand store and every action
             level-machine.ts phase transitions
             combat-rules.ts damage, hit validity, invulnerability
             objectives.ts, progression.ts, save.ts
  systems/   GAMEPLAY — archery, astra, locomotion, ai, spawner, interaction, loop
  entities/  R3F components — Player, Enemy, NpcCharacter, ArrowPool, Target, camera
  scenes/    one per level — L1Court, L2Forest, L3Forest, L4Range, L5Yajna
  render/    loaders, materials, character-factory, garments, instancing, tier config
  ui/        React DOM overlay — HUD, dialogue, quiz, codex, menus
  platform/  save/audio/input/fullscreen adapters — web and electron
electron/    main.ts, preload.ts
public/assets/high/   built assets, committed
tools/       asset pipeline — build-assets.mjs, blender decimation scripts
raw/         gitignored, comes from the companion zip
```

### Conventions

- Files under 300 lines (`src/data` exempt), functions under 50, components under 200
- Named exports only. `PascalCase.tsx` for components, `kebab-case.ts` for everything else
- **No magic numbers outside `data/balance.ts`**
- **No user-visible strings outside `src/data/`** — this is what makes Hindi/Telugu a
  translation job rather than an archaeology project
- **No animation clip name string outside `data/clips.ts`**
- Every scene disposes its geometries, materials and textures on unmount — three.js does not
  do this for you and the leak is invisible until roughly minute 10 of play

---

## 5. Decisions already made, and why

Do not re-litigate these without a reason. Each cost real time to arrive at.

**three.js / React Three Fiber, not Unity or Godot.** The entire game had to be text files an
AI agent could write, run, screenshot and fix autonomously. Unity and Godot projects are
scenes and prefabs authored by clicking in an editor. Also, Unity WebGL is its weakest target
and the browser is this project's binding constraint.

**One shared 65-joint skeleton for every humanoid.** The Quaternius Universal Base Characters
and the Universal Animation Library use byte-identical joint lists (Unreal Mannequin naming:
`root`, `pelvis`, `spine_01..03`, `clavicle_l`, …), verified by parsing the GLB JSON chunks.
All 86 clips play on both meshes with **zero retargeting**. Every character in the game is one
of two meshes differentiated by texture tint, scale, hairstyle and props. Introducing a second
skeleton would multiply the animation payload and the CPU skinning cost.

**Fixed 60Hz timestep with an accumulator, rendering interpolated.** In
`systems/loop/fixed-loop.ts`, with a unit test proving identical simulation at 30fps and
144fps. Never multiply a gameplay value by frame delta. A 144fps dev machine and a 28fps lab
machine must play identically.

**No physics engine.** Arrow ballistics are a parabola plus a raycast; collision is capsule
overlap and push-out. Nothing in the design needs stacking, joints or ragdolls, and Rapier is
a WASM payload and a performance variable for no gain.

**The performance budget is CPU-bound, not triangle-bound.** Intel UHD is unified-memory;
`AnimationMixer.update()` and `updateMatrixWorld()` on the JS main thread dominate, measured
at up to 75% of frame time on low-end CPUs. So the governing limit is **12 concurrent
SkinnedMesh instances**, enforced in code with a console error. Secondary: 120k triangles
(60k skinned), 80 draw calls, 200MB texture memory, 60MB downloaded. Exactly 4 skin weights
per vertex — a hard WebGL shader limit; exceeding it silently truncates the buffer and
produces geometry spikes mid-animation.

**Quality tiers are one build, not two.** A runtime `QualityTier` plus two asset directories.
Never fork the codebase for quality.

**Electron over Tauri.** Electron bundles Chromium and ANGLE, so Windows and Linux render
identically to the web build. Tauri uses the system webview, which on Linux is WebKitGTK,
whose WebGL support is the most variable thing in a school lab. `--ozone-platform=x11` is
mandatory in `electron/main.ts` — Ubuntu 24.04 defaults to Wayland and native Wayland WebGL
initialisation frequently produces a black canvas. Never set `MESA_GL_VERSION_OVERRIDE`; it
crashes the GPU process with `GLXBadFBConfig`.

**Cut from the original design.** The source design document proposed 12 levels and 8 distinct
gameplay systems inside 10 minutes of play — 45 seconds per system, all of them shallow. Cut
to five levels and three mechanics. Levels are built for ~8 minutes of ideal play to land
inside a 15-minute real session, because playtests with children run 1.5–2x the designer's
estimate.

**Assets discarded.** `jatayu_-_nusantara.glb` (1.50M triangles), `lord_hanuman.glb` (668k)
— both from a different kanda entirely and irrelevant to this story. An unidentified 1.26M
triangle model. The four Meshy-generated characters (Rama, sages, throned Dasharatha) are
unrigged, un-posed and 120–197k triangles each — **they were intended to be rendered once in
Blender to 1024px PNG dialogue portraits, which was never done.** That is still a good idea
and is listed in §6.

---

## 6. What is wrong — this is the job

Ordered by how much it matters. The first four are the difference between a prototype and a
product.

### 6.1 There is no audio at all

Zero sound files exist in the repository. Not music, not a bowstring, not a footstep, not a
voice line. `platform/web/audio-web.ts` wraps Howler and is wired into the settings volume
control, but it has nothing to play and no callers.

Needed at minimum: ambient beds per level (court, forest, night), bow draw and release,
arrow impact on target and on flesh, footsteps, enemy vocalisations, hit and death, astra
cast, UI clicks, quiz correct/incorrect, level win and fail stings, and a title theme.

Strongly worth considering: **narrated dialogue.** The target audience is Classes 6–10 with
mixed English reading ability. Voice-over would do more for comprehension than any visual
change. The dialogue is already fully keyed in `src/data/dialogue.ts`, so this is a recording
and scheduling job, not a refactor.

### 6.2 Archery does not work in practice

This is the single worst gameplay problem. Arrows fly somewhere the player did not intend and
the player has no way to predict where.

The root cause is a design omission, not a bug: the arrow is a **ballistic projectile with
gravity** and there is **no crosshair, no trajectory preview, and no landing indicator**. A
parabolic projectile is unguessable without a visual aid. Angry Birds shows the arc for
exactly this reason.

What is needed:

- A trajectory arc rendered while drawing, sampling the same ballistics function the arrow
  actually uses (`systems/archery/ballistics.ts`) so the preview cannot drift from reality
- A landing-point indicator on the ground or target
- A crosshair, with clear feedback when a valid target is under it
- Draw strength shown on the HUD, not just implied
- Retune arrow speed, gravity and draw time in `data/balance.ts` once the arc is visible —
  the current numbers were tuned blind

The aiming pose is separate and also unfinished. There is **no bow-draw animation clip** in
the Quaternius library, so aiming is procedural: after the animation mixer updates each frame,
`systems/archery/aim-pose.ts` overrides the arm and spine bone quaternions. It reads as "an
archer aiming" but not as "pulling a bow" — no nocked arrow, no string deflection, and the
string hand hovers beside the head rather than anchoring at the cheek with the elbow back.
See `docs/screenshots/bow-draw-debug.png`, reproducible at `?debug=bow`.

Two routes: finish the procedural pose (blend weights and the bone list are data-driven in
`BALANCE.archery`, so it is tunable without code changes), or source real archery animation
clips and retarget them onto the 65-joint skeleton in Blender. The second gives a better
result and costs a retargeting pipeline.

### 6.3 The characters are not appropriate for the subject

Every character is the Quaternius "Superhero" base mesh — a heavily muscled body with a
baked-in bikini and briefs texture. Procedural garments were generated in code
(`src/render/garments.ts`): a dhoti for the male mesh, a choli for the female. They cover the
body and the geometry drapes convincingly. **They are not sufficient.**

Remaining problems:

- Rama and the rishis still read as bodybuilders. Vishwamitra and Vasishtha in particular
  should be lean, aged ascetics
- There is one skin texture, so characters are differentiated only by garment tint
- Faces are generic mannequin faces with no character
- No crowns, no jewellery, no ornament — Rama is a prince and Dasharatha is a king
- The eyebrow mesh floats slightly off the face at some angles (source asset issue)
- These are revered figures. Getting them right is not a polish item, it is a requirement
  for the game to be usable in an Indian classroom

**The project owner has commissioned or acquired character models here:**
https://sketchfab.com/xlphastudiosco — **you should evaluate these yourself.** The questions
that decide everything: are they rigged, do they ship with animations, and what format? If
they are rigged to a compatible or retargetable skeleton, they replace the Quaternius bodies
entirely and this whole problem disappears. If they are static, they are still valuable as
dialogue portraits. The existing character pipeline (`render/character-factory.ts`) assumes
the 65-joint skeleton, so a different rig means either retargeting in Blender or reworking
the factory.

An alternative or complement: **generate character textures with an image model**, painting
costume, skin tone and facial features onto the existing UV layout at 1024px. This is how the
Meshy assets in `raw/source-models/` were made. It is fiddly — UV seams and layout — but it is
the only route to characters that look designed rather than default without a character artist.

### 6.4 Visual quality is prototype grade

Every surface is a flat colour under a single directional light. There is no sky in some
levels — Level 2 shows a hard diagonal ground edge against pure black. Characters are
underlit. Nothing has texture beyond a tint.

None of this is a three.js limitation. The gap between the current look and a genuinely good
stylised game is entirely work that was deliberately deferred:

- **Toon/cel shading with two-tone ramp lighting** instead of `MeshLambertMaterial`. This
  alone stops it looking flat.
- **Rim lighting** to separate characters from the background
- **Outlines** on characters
- **A proper sky** — gradient or solid, no HDRI, there is no texture budget — plus hemisphere
  fill so faces and garments are readable
- **Colour grading and a warm key light** for mood
- **Contact shadows** to ground characters (currently blob shadows only)
- **Bloom and vignette** — already scaffolded for the high tier, not tuned
- **Real textures.** Everything is untextured. This is the biggest single lever.

Photorealism is off the table and always was, because of the integrated-graphics target, not
because of the engine. A polished stylised look is entirely achievable.

There is a "Visual pass" section in `TODO.md` with specific artefacts logged during
development — a palace pillar/mace artifact in Level 1, a floating figure between columns.

### 6.5 Controls

Currently tank-style: A/D turn the body, W/S move, mouse aims only while the bow is drawn.
There is deliberately no pointer lock — the reasoning was that a mouse-look camera needing
click-to-capture is a support problem for a teacher with 40 children on trackpads.

That reasoning still holds for the school build, but the controls are not good as they stand.
Turning is slow, the camera is fixed behind the player with no free look, and there is no
controller support. Worth revisiting with real playtesting rather than assumption.

### 6.6 Level 5 balance is unverified

No human has ever cleared Level 5. It was balanced against a scripted test bot that holds one
position and shoots with deliberate pacing — slower and less mobile than a real player. Four
genuine fixes were made during development (rakshasa damage and cooldown, a real yajna
invulnerability bug, wiring up the arrow-pickup mechanic which had been dead code, and wave
pacing), and survival time roughly tripled across six playtests, but the bot never reached a
win.

**Play it yourself before changing any numbers.** It may be fine. If it is not, the balance
values are all in `BALANCE.enemies` in `data/balance.ts`, and the note in `TODO.md` suggests
either a repositioning bot or softening waves 3 and 4.

Related: `rakshasa`, `subahu` and `maricha` damage values other than Tataka's were never
tuned against real play at all.

### 6.7 Electron has never rendered

The desktop shell is built and the window/static-server/save-IPC pipeline is verified correct,
but it was developed in a GPU-less sandbox and **nobody has ever seen the window draw
anything.** Run `npm run electron:dev` on a real Windows or Linux desktop and look at it. If
you get a black canvas on Linux, that is the Wayland bug `--ozone-platform=x11` targets —
check that the flag is actually being applied and read the `GL_RENDERER` line the app logs at
startup.

### 6.8 The low quality tier does not exist

`public/assets/low/` was never built. The tier system detects a low-end machine correctly and
then falls back to the high assets. `tools/build-assets.mjs` has documented stubs for
`compressTextures()` (KTX2: ETC1S for base colour, UASTC for normal/ORM — ETC1S cross-
pollinates RGB channels and destroys non-visual channel data) and `buildLowTier()`, both
behind a `--full` flag that is off.

This matters for the stated target hardware. Without it the game downloads and holds far more
texture memory than an Intel UHD machine should be asked for.

### 8.9 Other open items

- **Dialogue portraits.** The four high-detail Meshy character models in
  `raw/source-models/` should be rendered once in Blender to 1024px PNGs with alpha and used
  in the dialogue panel. Full visual richness at zero runtime cost. Never done.
- **Hindi and Telugu.** Not built, but every string is keyed in `data/dialogue.ts` so this is
  a translation job. Devanagari and Telugu font subsetting is the only real work.
- **Crowns and jata/topknot hair** for Rama, Dasharatha and the rishis — mentioned in the
  garment work, never built.
- **Enemy movement has no obstacle avoidance or ground snapping.** Enemies move in straight
  lines at y=0. Fine on the flat clearings they currently fight in, not fine anywhere else.
- **Enemy positions are not interpolated** between fixed-timestep ticks the way the player's
  is. Invisible on a slow boss, may show as jitter on faster enemies.
- **`l3.vishwamitra.dusk`** — a written but unused "hurry up" dialogue line, deferred.
- **Android.** Out of scope but the input layer is abstracted, so it is mostly a touch
  control problem.

---

## 7. Environment gotchas found the hard way

These are in `CLAUDE.md` too, but they cost hours to find:

- **`playwright.config.ts`'s `webServer` never rebuilds.** A stale `dist/` looks exactly like
  a broken level. Run `npm run build` before `npm run e2e` when debugging.
- **Software rendering** needs `--enable-unsafe-swiftshader` on recent Chromium for e2e to run
  at all on a GPU-less machine. Not baked into `electron/main.ts` deliberately — see `TODO.md`.
- **E2E is slow under software rendering** — 2 to 4 minutes per level spec. Budget for it.
- **`@types/three` lags `three` by a minor version.** `three@0.186` ships no typings and
  DefinitelyTyped has no 0.186. Pinned at `@types/three@0.185.4`. Recheck periodically.
- **In WSL, Playwright reports SwiftShader**, a software renderer. That is WSL, not the code.
  Do not weaken tests to make them pass under it.
- **KTX-Software 5.x drops `toktx`**, which `@gltf-transform/cli` shells out to. Stay on 4.4.x.

---

## 8. Suggested order of work

1. **Play the whole game.** Time it start to finish. That is the pass condition — a class of
   40 finishing inside one period without a crash, a soft-lock, or a moment of not knowing
   what to do.
2. **Fix archery** (§6.2). It is the core mechanic of three of the five levels and it does not
   currently work. Trajectory arc first.
3. **Evaluate the Sketchfab characters** (§6.3) and decide the character pipeline. Everything
   about how the game looks depends on this answer.
4. **Add audio** (§6.1). Ambient and effects first; narration is the highest-value stretch.
5. **The visual pass** (§6.4) as one deliberate block — shader, lighting, sky, grading,
   textures together. Doing it piecemeal wastes work.
6. **Verify Level 5 by playing it** (§6.6), and Electron on a real GPU (§6.7).
7. **Build the low tier** (§6.8) and test on an actual lab machine before calling it done.

---

## 9. Reference material in the repo

- `ARCHITECTURE.md` — stack, structure, decisions, technical debt
- `AGENTS.md` — standing rules, budgets, conventions, content rules, deny rules
- `CLAUDE.md` — project-specific gotchas
- `TODO.md` — the running list, including a "Visual pass" section and resolved-issue history
- `SESSION-LOG.md` — 659 lines of development history: what was built each session, what was
  decided and why, what broke and how it was fixed. **Read this before changing anything that
  looks arbitrary — most of it is not.**
- `docs/screenshots/` — every level, the costume work, the bow draw pose, the LOD comparison

---

## 10. Licensing

The character meshes and all 86 animation clips are **Quaternius, CC0** — Universal Base
Characters and Universal Animation Library 1 and 2, free Standard tiers. The environment and
prop models are a mix of CC0 Quaternius/Poly assets and Sketchfab downloads whose individual
licences were **not individually verified** and should be before any public release. The
Meshy-generated models in `raw/source-models/` were generated for this project.

Verify licences before shipping to schools.
