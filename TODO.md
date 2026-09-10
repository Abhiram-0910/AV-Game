# TODO

## RESOLVED — L2 e2e aimed the mouse without turning the body first (pass 3 phase C, 2026-09-10)

`tests/e2e/l2.spec.ts`'s `shootTarget` missed all 3 targets on every pitch trim. Not a game
bug: `archeryAim.MOUSE_YAW_RAD` clamps mouse aim to about +-34 degrees from the body's current
facing (correct — a real player turns with A/D, then fine-aims with the mouse), but the test
never turned the body toward the target, and the yaw error after walking to the range talk
point was ~53 degrees, outside the mouse's reach. Fixed by calling the existing `face()`
helper before each shot. A prior run hit the identical failure and chased an unrelated
sword-grip-rotation fix instead — if `l2.spec.ts` starts missing shots again, check this first
before re-deriving the projectile math.

## RESOLVED — skinned decimation blocker (pass 3 phase B, 2026-09-09)

`tools/decimate-skinned.py` (Blender headless, armature untouched, decimates only the body
primitive, then `vertex_group_limit_total(limit=4)`) produces `characters/male-low.glb`
(4,702 tris) and `female-low.glb` (4,697 tris) — 12 concurrent low-detail bodies is 56,424
skinned triangles, under the 60k budget. Joint count verified unchanged (65) by the build
script itself (throws otherwise). `character-factory.ts`'s `BuildOptions.detail` selects
`'high' | 'low'`; nothing calls it with `'low'` yet — that's Level 5's spawner (Phase G),
not attempted here. Visual comparison: `docs/screenshots/lod-comparison.png` (male and
female, high vs low, mid-walk-cycle) — no weight artefacts visible at hips/knees/shoulders.

## NEW — Tataka (female mesh) is not actually covered above the waist

Found while taking the LOD comparison screenshot above: the female base mesh's baked-in
bikini top/bottom (the "Superhero" costume) is fully exposed above the dhoti — the Phase A
garment only wraps waist-to-calf, and Tataka's spec has `sash: false`. This is the same
"cannot ship" modesty problem Phase A was supposed to close, still open for the one female
character. Not fixed here — out of Phase B's scope (asset decimation, not garments) and
Tataka has no scene yet (she's Level 3, Phase D). Whoever builds Phase D should extend
`render/garments.ts` with a torso wrap for the female mesh, or turn `sash: true` on for
Tataka with a wider drape, before L3 ships.

## Pass 3

- Electron: `electron/main.ts` + `preload.ts`, `"main"` in package.json, electron-builder
  config, `--ozone-platform=x11` on Linux, `platform/electron/` save (userData file) and
  fullscreen adapters behind the existing `Platform` interface.
- Menus, codex (Story Scroll) UI, quiz UI. Until the quiz UI exists `ui/Flow.tsx`
  auto-passes each gate (`QuizAutoPass`, records no score).
- Level 2 shipped (pass 3 phase C). Levels 3–5 scenes and the enemy AI (`systems/ai/`) remain.
  Spawner pieces exist: the skinned budget registry and the pure wave scheduler are built and
  tested, nothing spawns yet.
- Crown for Rama and Dasharatha, jata/topknot hair for the rishis (pass 3 phase A mentioned
  both; only the dhoti/sash modesty fix shipped). No new hairstyle asset needed for jata — the
  rishis already use the existing `beard` hairstyle. A crown would be new prop geometry parented
  to `Head`, same pattern as `attachProp` in `character-factory.ts`.
- Confirm the angavastram sash (`src/render/garments.ts`) is actually visible on characters
  other than Rama — see SESSION-LOG.md pass 3 phase A. Suspect pose occlusion or a colour too
  close to the body tint, not a skinning bug (weights are unit-tested). A `?debug=cast` view
  that lines up every `CHARACTER_SPECS` id facing the camera would let this be judged directly
  instead of depending on whatever pose an L1 NPC happens to be in.
- Dialogue portraits from the Meshy renders (1024px PNGs) in the dialogue panel.
- Audio: `platform/audio` (Howler) is built and unused. No sound assets exist in `raw/`.
- Assets: `public/assets/low/` is unbuilt; `render/manifest.ts` serves the high tier to
  both tiers. `tools/build-assets.mjs --full` calls the documented KTX2 (ETC1S base colour,
  UASTC normal/ORM) and low-tier stubs, which throw. Character normal/roughness maps are
  still embedded at 1024px (Lambert ignores them; they cost download only).
- Loader cache: characters, hair, and clips stay cached across levels by design; the
  environment prototypes are evicted on scene unmount (`evictAssets`). Audit VRAM after a
  five-level run once L2–L5 exist.
- Bump `@types/three` to 0.186 when DefinitelyTyped publishes it.

## Known rough edges on screen (pass 2)

- The eyebrow mesh floats slightly off the face at some angles (source asset).
- Dasharatha's seated clip is in place; he sits where the throne waypoint is, not on a
  specific chair mesh in `props_royal_room.glb` (the room's chairs are unnamed).
- Procedural bow draw: see SESSION-LOG.md for the honest verdict.

## Open questions

- Tataka's on-screen defeat wording is now explicit ("fell and did not rise"). Confirm
  with a teacher reviewer that it is acceptable for Class 6.
