# TODO

## KNOWN — L4 e2e is flaky under heavy session load (not a game bug, verified independently)

`tests/e2e/l4.spec.ts` occasionally fails to hit the `longRange` or `lateral` target
(`target near ... was never hit`) when the host machine is under heavy concurrent load
(observed with `uptime` load average 6-8, multiple other Claude sessions/agents running).
Investigated at length before accepting this:

- Found and fixed a real bug along the way: `entities/Target.tsx`'s `lateral` target moved in
  a render-frame `useFrame`, but the hit-test runs inside the fixed-tick loop, which processes
  several ticks per rendered frame under SwiftShader's low frame rate
  (`BALANCE.loop.MAX_SUBSTEPS`) — so the collision position could be several ticks stale. Moved
  to `systems/archery/step.ts`'s `updateMovingTargets()`, called once per fixed tick before that
  tick's hit-test, tagged via `userData.lateral` on the target object. Covered by a new
  deterministic unit test (`tests/unit/archery.test.ts`).
- Replaced the e2e's fixed-`waitForTimeout` draw/flight timing with polling actual game state
  (`world.draw.ticks`, `world.arrows.length`) — fixed-ms waits assume a ticks-per-wall-clock-ms
  ratio that isn't constant under variable system load.
- Confirmed independently: an isolated test that skips straight to the firing line (no walk/
  talk overhead, run on a freshly-loaded page) hits the lateral target on the very first
  attempt with `drawTicks=30` — *exactly* `BALANCE.arrow.DRAW_TICKS`, no drift at all. The
  formula and the timing logic are both correct; what fails intermittently in the full run is
  keeping pace with wall-clock while five other processes compete for the CPU.

Not a regression to chase further — the full `l4.spec.ts` uses a 900s timeout and 13 retries
per target specifically to absorb this, and passes cleanly on a quieter system (confirmed
multiple times during phase E). If it's flaky in CI, rerun on a less loaded machine before
suspecting the game code.

## RESOLVED — held props (bow/quiver/sword) rendered at 2–2.3m, not human scale (2026-09-10)

User-reported bug, confirmed with fresh L1/L2 screenshots before assuming: the Quaternius
bow/arrow/sword source models each bake a node-level `scale: [100,100,100]` (authored in
centimetres, exporter-compensated) that resolves to real sizes of ~2.0m (bow), ~1.5m (the
arrow model standing in for a quiver), and ~2.3m (sword) — human-scale environment props, not
hand-held-scale. `attachProp()` in `character-factory.ts` never corrected for this. Fixed with
a `scale` field on each prop's grip transform, held as data in `balance.ts`
(`BOW_GRIP_SCALE: 0.65`, `QUIVER_SCALE: 0.45`, `SWORD_GRIP_SCALE: 0.4`) alongside the existing
position/rotation fields, applied in `attachProp()` via `holder.scale.setScalar()`. Verified
with `docs/screenshots/bugfix-props-scale.png` (all three props on Rama, correctly
proportioned) and fresh `l1-court.png` / `l2-range.png`.

Turned out the L1 court screenshot's "giant pillar" and "oversized mace" the user also flagged
are **not** this bug — L1 has `bow: false`, so Rama carries no props there at all. Confirmed by
regenerating a fresh L1 screenshot: the objects are still there with zero character props in
the scene, so they're baked into the palace's own decimated static mesh (`palace.glb`, a single
merged Blender-decimated mesh — likely a decimation spike artifact on the original Sketchfab
model's chandelier/banner-pole geometry). Logged under "Visual pass" below, not fixed — it's an
environment asset defect, not a prop-attachment one, and out of this session's scope.

## RESOLVED — CharacterSpec.tint painted skin, not cloth (2026-09-10)

User-reported bug: Vishwamitra rendered fully orange and Vasishtha chalk-white, head to toe —
`tint` (never a plausible skin tone in the data: Rama's is light blue) was being multiplied
into the **body** material in `mergeSkinned()`, a leftover from before Phase A's garments
existed and skin was the only way to tell characters apart. Fixed by splitting the material
assignment: `mergeSkinned()` now takes body parts and garment parts separately and only
multiplies `tint` into the garment materials (dhoti, choli, sash). Skin, face, and eyes render
at their untouched base texture for every character; hair is unaffected either way (it was
already on its own `hairTint`, never `tint`). Verified with
`docs/screenshots/bugfix-tint-sages.png` and fresh `l1-court.png` / `l2-range.png` — both sages
now show natural skin with their garment carrying the distinct colour.

## Visual pass (deferred — a dedicated pass happens after all five levels are playable)

- **Palace giant pillar/mace artifact.** A very tall, very thin vertical shape (gold) and a
  separate rod-with-bulb shape (beige) stand fixed in the L1 throne room regardless of camera
  angle — visible in `l1-court.png`. Confirmed not a character-prop bug (L1 equips no props).
  `palace.glb` is a single merged mesh after Blender decimation (pass 2), so there's no
  separable sub-object to fix via a transform; likely a decimation spike on the original
  Sketchfab model's thin geometry (a chandelier chain, banner pole, or similar). Would need
  re-decimating with different settings or manual cleanup in Blender.
- **A small floating/hanging figure** appears between two throne-room columns in some L1
  camera angles (seen while chasing the tint bug, `sage-check-vasishtha.png`, not committed).
  Not investigated — possibly an NPC clipping through geometry or a stray prop instance.
- The angavastram sash's exact drape/visibility across all characters is still only spot-
  checked (see the phase A entry below) — a `?debug=cast` view remains unbuilt.

## RESOLVED — Tataka not covered above the waist (pass 3 phase D, 2026-09-10)

`render/garments.ts` now builds a choli (torso wrap, pelvis→clavicle height, skinned to
spine_03) for every `mesh: 'female'` character automatically — no new `CharacterSpec` field,
since Tataka is the only female character and the constraint is mesh-inherent. First version
spanned pelvis→spine_03 (real torso height) but that ends below the collarbone, well short of
the exposed area; fixed by reaching the clavicle's height instead. Verified visually via
`?debug=lod` (Tataka high/low side by side) and in `tests/unit/garments.test.ts`.

## RESOLVED — enemy combat balance from the pass-1 draft was lethal before it was winnable (pass 3 phase D, 2026-09-10)

The L3 e2e's fight against Tataka killed the player before he could land the 10 arrow hits her
150 health needs, twice, even after fixing an `ATTACK_COOLDOWN` FSM bug (see below). Raised
`enemies.tataka.ATTACK_COOLDOWN` 90→180 and lowered `DAMAGE` 15→10 in `balance.ts` (reason
recorded there). Only Tataka's numbers were touched — `rakshasa`/`subahu`/`maricha` are
untested until Phases E/G and were left at their pass-1 draft values.

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

## Pass 3

- Electron: `electron/main.ts` + `preload.ts`, `"main"` in package.json, electron-builder
  config, `--ozone-platform=x11` on Linux, `platform/electron/` save (userData file) and
  fullscreen adapters behind the existing `Platform` interface.
- Menus, codex (Story Scroll) UI, quiz UI. Until the quiz UI exists `ui/Flow.tsx`
  auto-passes each gate (`QuizAutoPass`, records no score).
- Levels 2 and 3 shipped (pass 3 phases C, D). Enemy AI (`systems/ai/enemy-ai.ts`) and the
  generic `entities/Enemy.tsx` exist and are wired for single static spawns (`LevelDef.enemies`);
  nothing has used the wave scheduler yet — that's L4/L5's spawner (Phases E/G). The skinned
  budget registry and the pure wave scheduler are built and tested, nothing spawns from them yet.
- `l3.vishwamitra.dusk` ("hurry up, Rama") is written but unused — not required by OVERNIGHT.md's
  Phase D text, only the hesitation beat was. Would need a new tick-elapsed-since-aggro trigger
  in `L3Forest.tsx` and a tuning constant for the threshold; low value for the cost, deferred.
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
