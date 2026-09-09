# AGENTS.md

Cross-tool rules for **bala-kanda** (Rama: Guardian of the Yajna). Read by Antigravity,
OpenCode, and other AGENTS.md-aware agents at session start.

**This file holds standing rules, not session history.** Session history lives in
`SESSION-LOG.md`.

---

## What this is

A 15-minute 3D action game on Bala Kanda for Classes 6–10 in Indian schools. Real
deployment, not a demo. Ships as a web build plus offline Windows and Linux Electron
builds that must behave identically.

Hard target: **60fps in a browser on an integrated-graphics lab PC.** The web build is
the binding constraint — if it's fast enough there, the desktop builds are fine.

## Stack

Node 22 · TypeScript (strict) · Vite 7 · React 19.2.0 (pinned exactly) · three.js 0.186 ·
@react-three/fiber 9.7 + drei 10.7 · Zustand 5 · Howler · Electron + electron-builder ·
Vitest + Playwright · gltf-transform + KTX-Software 4.4.2 (`toktx`) + Blender 4.2.5.

No physics engine. No backend. No accounts. No telemetry.

**React is pinned to exactly 19.2.0** — `@react-three/fiber@9.7` declares
`peer react ">=19 <19.3"`. Do not add a caret, do not upgrade React, do not resolve the
peer conflict with `--legacy-peer-deps`.

## Commands

```
dev:        npm run dev
build:      npm run build
preview:    npm run preview
test:       npm run test
e2e:        npm run e2e
typecheck:  npm run typecheck
lint:       npm run lint
assets:     npm run assets:build      # regenerates public/assets/{low,high}
desktop:    npm run electron:dev
package:    npm run package:win  |  npm run package:linux
```

## Conventions

- **Dependency direction is one-way:** `data` ← `core` ← `systems` ← `entities` ←
  `scenes`. `ui` imports `core` and `data` only. Never import upward.
- **`src/core/` and `src/data/` must not import `three` or `@react-three/*`.** Enforced
  by ESLint `no-restricted-imports`. This is the boundary that keeps game logic testable
  and the engine swappable. If a change seems to require breaking it, the design is wrong.
- All gameplay simulation runs on the **fixed 60Hz timestep** in `systems/loop`. Never
  multiply a gameplay value by frame delta in a component. Rendering interpolates.
- All user-visible text lives in `src/data/dialogue.ts` behind a key. No string literals
  in components.
- All tunable numbers live in `src/data/balance.ts`. No magic numbers in systems.
- Props appearing more than ~8 times use `InstancedMesh`.
- Every level scene must dispose its geometries, materials, and textures on unmount.
  three.js does not do this for you and the leak is invisible until minute 10.
- Materials: `MeshLambertMaterial` or unlit by default. `MeshStandardMaterial` only on
  the high tier and only where it earns its cost.
- Limits: files ≤ 300 lines, functions ≤ 50, components ≤ 200. Named exports only.
  `PascalCase.tsx` for components, `kebab-case.ts` for everything else.
- Branching: `main` + `feat/*`, squash merge. Conventional commits.

## Performance budgets (low tier — non-negotiable)

Intel UHD is unified-memory and **CPU-bound, not fill-rate-bound**. The governing cost is
`AnimationMixer.update()` and `updateMatrixWorld()` on the JS main thread — measured at
up to 75% of frame time on low-end CPUs even with heavily decimated meshes. Skinned
character count matters more than triangle count.

- **≤ 12 concurrent SkinnedMesh instances.** The hardest limit here. Level 5's waves and
  Maricha's clones must respect it — stagger spawns, despawn aggressively, use static
  meshes or billboards for distant and decorative figures.
- ≤ 120k total triangles visible, of which ≤ 60k skinned
- ≤ 80 draw calls · ≤ 200MB texture memory · ≤ 60MB total downloaded assets
- **Exactly 4 skin weights per vertex.** A WebGL shader limit. Blender must export with
  the influence cap set to 4 — exceeding it truncates the buffer and produces geometry
  spikes when a clip plays.
- Static geometry sharing a material must be merged with `BufferGeometryUtils`.
- No realtime shadows (blob decals) · no post-processing · `pixelRatio` capped at 1.0
- Every level fully preloads behind a progress bar. Nothing streams mid-level.

Textures: **ETC1S for base colour only.** Normal and ORM maps require **UASTC** — ETC1S
cross-pollinates RGB channels and destroys non-visual channel data.

High tier lifts these: real shadows (1 directional, 1024 map), bloom + vignette,
uncapped pixel ratio, 1024px textures, ~300k triangles. **Same code, same build — only
the `QualityTier` and the asset directory change.** Never fork the codebase for quality.

## Character system — settled, do not redesign

Every humanoid in the game is the **same 65-joint skeleton** (Unreal Mannequin naming:
`root`, `pelvis`, `spine_01..03`, `clavicle_l`, `upperarm_l`, …). Verified identical
between the Quaternius Universal Base Characters and the Universal Animation Library
Unreal-Godot exports, so clips play with **zero retargeting**.

- Two meshes only: `Superhero_Male_FullBody` (~14.3k tris) and
  `Superhero_Female_FullBody` (~15.1k tris)
- Rama, Lakshmana, Vishwamitra and both rakshasas are the male mesh, differentiated by
  **texture, uniform scale, hairstyle attachment, and held props** — never by new geometry
- Tataka is the female mesh, scaled up
- One clip library loaded once and shared across every character instance. Never load a
  second copy of the animation GLB.
- Hairstyles are separate meshes rigged to the head bone — attach, don't merge
- Use the non-`_RM` animation GLB (in-place). `_RM` is root-motion and we drive movement
  from the kinematic controller, not from the clip.

If a character needs a clip the library lacks, the order of preference is: reuse an
existing clip, then edit an existing clip in Blender, then source a new one. Never
introduce a second skeleton.

## Content rules

- Story stays faithful to Valmiki's Bala Kanda. No invented theology, no invented
  characters, no altered outcomes.
- No blood, no gore, no dwelling on death animations. Defeated enemies dissolve.
- Maricha is flung away, not killed — that is the text and it is the teaching moment.
- Reading level: Classes 6–10. Sanskrit terms glossed inline on first use.
- Anything a teacher could object to does not ship.

## Deny rules

- Never commit anything under `raw/` — it is ~700MB of source assets and it is gitignored.
- Never commit `.env` or any file containing a secret.
- Never add AI-attribution trailers to commit messages.
- Never add a runtime network dependency. The game must run with the network unplugged.
- Never add an account system, analytics, or any collection of user data.
- Never introduce a physics engine, a backend, or a cloud service without an explicit
  decision recorded in `ARCHITECTURE.md`.
- Never regenerate `public/assets/` by hand — only via `npm run assets:build`.
- Never change the React version or add a caret to it.

## Files not to touch

- `public/assets/` — generated by `tools/`, regenerate rather than edit
- `raw/` — read-only source material
- `src/data/balance.ts` — change only with a stated reason in `SESSION-LOG.md`

## Multi-agent

More than one agent may work this project. Before starting:

1. `git pull`
2. Read `SESSION-LOG.md` to see what's in progress and which agent is doing it
3. Work on a **separate git worktree or branch** — never share a working tree
4. Record what you did in `SESSION-LOG.md`, including which agent you are

Git and the session log are the entire coordination mechanism. No orchestrator.

## Skills and tools

- Skills: `.agents/skills/` (workspace) and the global skills directory
- Knowledge graph: `code-review-graph build` once per project, then query it to narrow
  scope before reading files
- Browser verification: Playwright CLI, not Playwright MCP
- Spec layer: OpenSpec (`/opsx:explore` → `propose` → `apply` → `verify` → `archive`)
