# SESSION-LOG

Newest first. Note which agent did the work.

## 2026-09-10 — Claude Code (Sonnet 5) — pass 3 phase E: Level 4, five-arrow trial

Branch `feat/pass-3-overnight`, on top of `b687214` (the prop-scale/tint fix commit).

**Built**
- `src/entities/Target.tsx`: `scale` support (baked pre-merge) for `occluded`/`astraOnly`;
  `astraOnly` tags `userData.requiresAstra`; `lateral` tags `userData.lateral` instead of
  moving itself (see the bug below).
- `src/systems/archery/step.ts`: `updateMovingTargets(tick)` moves any tagged lateral target
  once per fixed tick, before that tick's hit-test. A plain arrow hitting a `requiresAstra`
  target now bounces off (no score, stays hittable) instead of counting.
- `src/systems/astra/step.ts` (new): the astra charge-and-release, same shape as the bow's draw
  (`systems/archery/draw.ts`) reused for the hold-to-charge state. Release performs an instant
  hitscan along the aim direction — astras are summoned by mantra, not thrown, so no projectile
  simulation — against `world.hittable`, scoring a target hit exactly like an arrow. Enemy astra
  combat is explicitly left as Level 5's concern (Phase G), commented at the one line that
  matters.
- `src/entities/Player.tsx` / `SimulationDriver.tsx`: `CAST_LOOP` clip while charging (`KeyQ`),
  same cosmetic-clip pattern as the sword slash — no change to the bow draw pose.
- `src/scenes/L4Range.tsx` + `SCENERY.l4`: the firing line, five targets from the pre-existing
  `levels.ts` data, a rock placed at the `occluded` target's `coverPos` for partial visual
  cover, Vishwamitra positioned near spawn for the astras dialogue (`l4.vishwamitra.astras`,
  pass-1 content, already written).

**Bug found and fixed (architectural, not just a test problem)**
- `Target.tsx`'s `lateral` motion updated position in a render-frame `useFrame`, but the
  hit-test runs inside the fixed-tick loop, which processes several ticks per rendered frame
  under SwiftShader's low frame rate (`BALANCE.loop.MAX_SUBSTEPS`) — so the collision position
  used by a given tick's raycast could be several ticks stale, worse the heavier the frame is.
  This is the same "fixed tick is authoritative, render interpolates" principle the rest of the
  codebase already follows (`AGENTS.md`) — `lateral` motion just wasn't following it. Fixed by
  moving the position update into `updateMovingTargets()`, called from `stepArchery` once per
  tick. Covered by a new deterministic unit test (`tests/unit/archery.test.ts`).
- Also replaced the L4 e2e's fixed-`waitForTimeout` draw/flight timing with polling actual game
  state (`world.draw.ticks`, `world.arrows.length`) instead of assuming a wall-clock-ms to
  game-tick ratio that isn't constant under variable system load.

**Verified**
- 80 unit tests green (2 new, covering the tick-driven oscillation formula), `typecheck` and
  `lint` clean.
- `docs/screenshots/l4-firing-line.png`: all five targets visible at their correct positions
  and (for `occluded`/`astraOnly`) scale, the range's rock/tree dressing, Rama's bow correctly
  proportioned (confirms the earlier prop-scale fix still holds) and blue-tinted dhoti (confirms
  the tint fix), HUD showing 0/5 targets and 1 astra charge.
- Full L4 e2e (`tests/e2e/l4.spec.ts`) passed completely multiple times during this phase —
  all five targets, the astra bounce-then-hit sequence, win, `astra` codex unlock, transition
  into L5's intro. It is currently flaky specifically under the heavy concurrent system load
  this session is under right now (verified via an isolated fresh-page test that hits the
  hardest target, `lateral`, on the first attempt with exactly the expected tick count — see
  TODO.md's "KNOWN" entry for the full investigation). Not chased further; it is a session
  environment problem, not a game or test-logic bug.

**Next**: Phase F (full UI: quiz, pause, settings, codex, ending screen) per `OVERNIGHT.md`.

## 2026-09-10 — Claude Code (Sonnet 5) — fix: prop grip scale, tint on garments not skin

Branch `feat/pass-3-overnight`, on top of `397edaf` (phase D). Two user-reported bugs from
reviewing `docs/screenshots/*`, fixed before starting Phase E as instructed.

**Bug 1 — props at the wrong scale.** Confirmed first with fresh L1/L2 screenshots rather than
trusting the committed ones. The Quaternius bow/arrow/sword GLBs each bake a node-level
`scale: [100,100,100]` (centimetre-authored, exporter-compensated) that resolves to ~2.0m
(bow), ~1.5m (the arrow standing in for a quiver), and ~2.3m (sword) — correctly-sized
*environment* props, never corrected for being hand-held. `character-factory.ts`'s
`attachProp()` had no scale parameter at all. Fixed: a `GripTransform` (`pos`, `rot`, `scale`)
per prop, the scale values held in `balance.ts` (`BOW_GRIP_SCALE: 0.65`, `QUIVER_SCALE: 0.45`,
`SWORD_GRIP_SCALE: 0.4`), applied via `holder.scale.setScalar()` in `attachProp()`.

The L1 court screenshot's "giant pillar" and "oversized mace" turned out to be a **different,
pre-existing** bug: L1 equips no props at all (`bow: false`), confirmed by a fresh screenshot
showing them still present with zero character props in the scene. They're baked into
`palace.glb`'s own geometry (a single merged mesh after pass-2 Blender decimation — no longer
a separable sub-object), most likely a decimation spike on the original Sketchfab model. Not
fixed — logged under "Visual pass" in TODO.md, out of scope (environment asset defect, not a
prop-attachment one, and the user asked for a dedicated visual pass later, not opportunistic
fixes now).

**Bug 2 — tint painted skin instead of cloth.** `CharacterSpec.tint` (never a plausible skin
tone — Rama's is light blue) was being multiplied into the body material in `mergeSkinned()`,
left over from before Phase A's garments existed, when tinting the body was the only way to
tell characters apart. Fixed by splitting `mergeSkinned()`'s parameters into body parts and
garment parts, multiplying `tint` into garment materials only (dhoti, choli, sash). Skin,
face, and eyes keep their base texture for every character; hair was already independent
(`hairTint`, never `tint`), unaffected either way.

**Verified**
- 78 unit tests green, `typecheck` and `lint` clean (no test exercises `mergeSkinned`'s
  material split directly — it needs a real WebGL-loaded body mesh — so this was verified
  visually, per the user's explicit ask).
- `docs/screenshots/bugfix-props-scale.png`: Rama with all three props (bow, quiver, sword)
  at believable human scale, one clean shot showing all of them together.
- `docs/screenshots/bugfix-tint-sages.png` plus fresh `l1-court.png` / `l2-range.png` (full
  real e2e runs, not just debug screenshots): Vishwamitra and Vasishtha both show natural skin
  with their garment carrying the distinct colour.
- Full L1 and L2 e2e both re-run and pass after both fixes (L2 solo — running both L1 and L2
  concurrently this time starved L2 of CPU under SwiftShader and it hit the 900s timeout at
  15.5 minutes; alone it passed in 14.0 minutes, slower than the ~5.5–8.7 min seen earlier in
  this session, environmental load rather than a regression — L1 passed either way).

**Next**: Phase E (Level 4, five-arrow challenge) per `OVERNIGHT.md`.

## 2026-09-10 — Claude Code (Sonnet 5) — pass 3 phase D: combat, enemy AI, Level 3 Tataka

Branch `feat/pass-3-overnight`, on top of `5ce4ff8` (phase C). Also closes the Tataka modesty
blocker recorded in `TODO.md` since pass 3 phase B, as a ship blocker for this phase rather
than a follow-up, per instruction.

**Built**
- `src/systems/ai/enemy-ai.ts`: pure FSM (`idle → chase → attack → stagger/dead`) on the fixed
  tick. `stepEnemy()` moves toward the player, faces them, and telegraphs an attack
  (`ATTACK_WINDUP_TICKS`) once in `REACH`; `applyArrowHit()` routes through the existing
  `core/combat-rules.resolveHit` (built pass 1, never previously wired to anything) to apply
  arrow damage and transition to stagger or dead. `EnemyRuntime` carries a `root: Object3D`
  purely so archery's hit-test can match a raycast hit back to a runtime by identity — the FSM
  math itself never touches it.
- `src/systems/world.ts`: `enemies: EnemyRuntime[]` (registered/unregistered by `Enemy.tsx`,
  excluded from `resetWorld` for the same reason `npcs`/`ground`/`hittable` already are — mount
  order) and a `boss: BossHealth | null` reactive slice for the HUD bar.
- `src/systems/archery/step.ts`: a struck `world.hittable` object is now looked up against
  `world.enemies` by root identity; an enemy takes repeated `applyArrowHit` calls and only
  leaves `hittable` once actually dead (a static `Target` still leaves on the first hit, per
  Phase C). Defeat dispatches `progress({kind:'defeat', enemy: ...})`, reusing the objective
  system exactly as `hitTargets` already did.
- `src/entities/Enemy.tsx`: one generic component for every `EnemyKind` — builds via the
  existing `character-factory.buildCharacter` (no per-creature component; a future rakshasa is
  the same component with a different `kind`), plays the FSM state's clip, dissolves
  (opacity fade) over `DESPAWN_TICKS` on death — the AGENTS.md "defeated enemies dissolve"
  content rule — non-gory outcome.
- `src/scenes/L3Forest.tsx`: the forest edge (talk with Vishwamitra) and the clearing (Tataka).
  The hesitation beat — Vishwamitra's case for duty, then Rama's resolve — is the existing
  pass-1 dialogue content (`l3.vishwamitra.duty`, `l3.rama.resolve`), auto-chained by a small
  `useNarrativeBeat` hook (opens a dialogue key once an objective/condition flips true; no
  gating objective needed since dismissing an unlisted key is a harmless no-op for
  `progress()`). `l3.tataka.appears` auto-fires the same way once the clearing is reached.
- `src/ui/Hud.tsx` + `ui.css`: boss health bar (`BossBar`), gated on `world.boss`, shown only
  once `clearingDone` (not from level load — she isn't narratively revealed yet) and hidden the
  instant she dies. Only pushes to the store when health actually changes, not every frame —
  `world.enemies` is hot-path mutable state, and `useWorld` re-renders the whole HUD tree on any
  new object reference.
- `src/render/garments.ts`: `buildCholi()`, the Tataka modesty fix. A torso wrap from the pelvis
  to the **clavicle** (not spine_03 — see bugs below), skinned pelvis→spine_03 by height, same
  pattern as the dhoti's pelvis→thigh blend. Added automatically for `spec.mesh === 'female'` in
  `buildGarments()` — no new `CharacterSpec` field, since Tataka is the only female character
  and the constraint is mesh-inherent, not a per-character style choice.

**Bugs found and fixed (all three only showed up once actually played, not from a static read)**
- **Enemy never respected `ATTACK_COOLDOWN`.** The first FSM draft returned from `attack` to
  `chase` and re-entered `attack` on the very next tick if still in reach — landing a hit every
  `ATTACK_WINDUP_TICKS` (0.3s) instead of the `enemies.tataka.ATTACK_COOLDOWN` (1.5s) already
  authored in pass 1's `balance.ts` but never actually read anywhere. Fixed by adding
  `EnemyRuntime.attackCooldownUntil`, set on every landed-or-missed attack, gating the
  chase→attack transition. Caught by playing the real fight in the L3 e2e, not by static review.
- **Even with the cooldown fixed, the fight still killed the player before he could land Tataka's
  10 required hits.** `enemies.tataka.DAMAGE` (15, pass 1 draft) let her kill a 100-health player
  in under 7 hits, faster than a bow-only fight could land the 10 arrow hits her 150 health
  needs. Raised `ATTACK_COOLDOWN` 90→180 and lowered `DAMAGE` 15→10 (both in `balance.ts`, with
  the reason recorded there) after three actual playthroughs of the e2e fight — the first two
  still ended in the player dying (traced via a `console.log` per shot the e2e now keeps, since
  a dead player silently freezes the whole simulation — `SimulationDriver` only steps
  archery/enemies in the `'play'` phase — and the failure originally looked like the enemy or
  the aim being broken, not a health race).
- **The choli wasn't actually covering anything.** `buildCholi()`'s first version spanned
  pelvis→spine_03, which is real torso height (0.36m on the unscaled rig, verified by logging
  the bone world positions) but ends well below the collarbone — the exposed area was the bra,
  which sits *above* spine_03. Confirmed by screenshotting `?debug=lod` (which already includes
  Tataka high/low side by side) before and after: the first version was invisible at a normal
  radius and, blown up for diagnosis, clearly sat at hip height, nowhere near the chest. Fixed
  by extending the geometry to the **clavicle**'s height instead — still skinned to spine_03
  (a torso garment has no business rigged to an arm bone), just taller.

**Decisions**
- One generic `Enemy.tsx`, not a per-creature `Tataka.tsx`/`Rakshasa.tsx` as ARCHITECTURE.md's
  original structure sketch implied — the AI wiring and character-factory build are identical
  per `EnemyKind`; only the data (`CHARACTER_SPECS`, `BALANCE.enemies`) differs. Saves
  duplicating this file for every future enemy in Phases E/G.
- No enemy position interpolation (no prev/alpha blend like `world.player` has) — renders at the
  current tick position directly. A visible simplification for a single slow-moving boss, not
  worth the complexity here; revisit if L4/L5's faster enemies show visible jitter.
- Astra unlock (OVERNIGHT.md's Phase D line) needed no code: `astraCharges` has been live since
  pass 1/2 (`Hud.tsx` already showed it in L2's screenshot) and no L3 objective requires firing
  one — "unlock" is the `l3.outro` narrative beat, already written, not a new gate.
- Did not wire `l3.vishwamitra.dusk` (a "hurry up" nudge if the fight drags on) — not required
  by OVERNIGHT.md's Phase D text (only the hesitation beat was), and adding a timing trigger for
  it would need a new tuning constant for marginal value. The dialogue content exists, unused;
  noted in TODO.md rather than built speculatively.

**Verified**
- 78 unit tests green (5 new in `enemy-ai.test.ts`, covering aggro range, chase→attack, the
  cooldown gate, and arrow hits staggering vs. killing), `typecheck` and `lint` clean.
- Full L3 e2e passes end to end (~55s–1m): forest edge, the hesitation chain, the clearing,
  Tataka's appearance, a real 10-arrow fight against the live AI (10/10 hits, player survives,
  logged per shot), win, `tataka` codex unlock, transition into L4's intro.
- `docs/screenshots/l3-clearing.png`: the boss bar, dark forest lighting, Rama with bow and
  sword both visible, no floating or clipped geometry.
- Garment fix verified visually via `?debug=lod` (Tataka high/low side by side, full torso
  coverage, no exposed base-mesh texture) in addition to the extended `garments.test.ts` (now
  checks the choli's weight sums and its own tri budget, not just the dhoti/sash).

**Least confident**
- The fight's balance (`ATTACK_COOLDOWN` 180, `DAMAGE` 10) was tuned against the e2e's own
  shooting cadence, which is deliberately cautious (full draws, generous flight-time waits) —
  slower than a keyboard-and-mouse player who leads shots and keeps drawing. A real player
  should find this easier than the e2e's own margin (10/10 hits, no damage taken in the final
  run) suggests, not harder — but it hasn't been played by an actual human yet.
- Enemy chase movement has no obstacle avoidance or ground snapping (she moves in a straight
  line at a fixed y=0) — fine for L3's flat clearing, would need work before an enemy has to
  navigate around scenery.

**Next**: Phase E (Level 4, five-arrow challenge) per `OVERNIGHT.md`.

## 2026-09-10 — Claude Code (Sonnet 5) — pass 3 phase C: Level 2, Vishwamitra's training

Branch `feat/pass-3-overnight`, on top of `7b8b77f` (phase B). Continued from a WIP commit
(`972c474`) left by a prior run that hit a session limit mid-phase; this run audited what was
there, finished it, and replaces that WIP with this commit.

**Found already built (from the WIP)**
- `L2Forest.tsx`, `Target.tsx`, `GroundPlane.tsx`, tree/rock/sword assets (already built into
  `public/assets/high/props/`, `target.glb` itself predates this phase from pass 2), the l2 e2e
  spec, sword prop attachment (`hand_r`, no conflict with the bow on `hand_l`), the cosmetic
  `SWORD_A` slash on `KeyF` (`SimulationDriver.tsx` / `world.swordSlashUntilTick`), and
  `resolveHitRoot` so a struck target leaves `world.hittable` correctly. Lakshmana and the
  quiz gate (`gate2`) / codex card (`yajna`) needed no new code — Lakshmana is placed as an
  NPC for the whole level (his joining is carried by `l1.outro`'s "With Lakshmana at his
  side" plus his physical presence throughout L2), and the quiz/codex data has existed since
  pass 1. All of this was already typecheck/lint/test-clean as committed.

**Bug found and fixed (in the test, not the game)**
- The L2 e2e (`tests/e2e/l2.spec.ts`) failed every one of 5 pitch-trim attempts on the first
  target: `target at 8,-42 was never hit`. Root cause: `shootTarget`/`aimAndFire` aimed using
  only the mouse (`archeryAim.MOUSE_YAW_RAD` clamps the cone to about +-34 degrees from the
  body's current facing), but the player's yaw after walking to the range talk point was never
  turned to face the targets — the actual yaw error to the first target worked out to about 53
  degrees, outside the mouse's reach entirely. This is correct game behaviour (a real player
  turns with A/D, then fine-aims with the mouse); the test was missing the turn. Fixed by
  calling the existing `face()` helper (already used for walking) before each shot in
  `shootTarget`. A prior run hit the same failure and chased an unrelated sword-grip-rotation
  fix instead (see the phase B/A history) — recorded here so it isn't rediscovered a third time.

**Verified**
- 73 unit tests green, `typecheck` and `lint` clean.
- Full L2 e2e passes end to end (5.5 min under SwiftShader): riverbank mantras, walk to the
  range, bow lesson, three real aimed shots (computed with the same projectile formula as
  `ballistics.ts`), win, `yajna` codex card unlock, transition into L3's intro.
- `docs/screenshots/l2-range.png` (regenerated by the e2e): Vishwamitra and Rama at the range,
  bow in the left hand, sword slung across the back from the right-hand grip — reads as a
  training ground, no floating or clipped geometry.
- Removed `tests/e2e/_debug.spec.ts` — a throwaway spec from phase B/C debugging (its own
  header said so), superseded by the real l2 spec now passing.

**Least confident**
- The sword's rest pose (visible slung on the back in the idle screenshot) was tuned for the
  `SWORD_A` swing clip and the L1 grip-check debug test, not for how it looks hanging during
  ordinary locomotion — acceptable for a cosmetic secondary, not verified further.
- If a player draws the bow and presses the sword key in the same instant, the archery aim-pose
  bone override in `Player.tsx` runs after `SWORD_A` is selected each frame regardless, so both
  would visually layer. No gameplay consequence (the sword deals no damage yet) — left as is.

**Next**: Phase D (combat/enemy AI, then Level 3 Tataka) per `OVERNIGHT.md`, including the
Tataka modesty fix noted below as a ship blocker for this phase, not a follow-up.

## 2026-09-09 — Claude Code (Sonnet 5, overnight loop) — pass 3 phase B: skinned decimation

Branch `feat/pass-3-overnight`, on top of `c74542e` (phase A). Resolves the Level 5 blocker
recorded in `TODO.md` / `ARCHITECTURE.md`.

**Built**
- `tools/decimate-skinned.py`: Blender headless. Unlike `tools/decimate.py` (static meshes,
  joins everything into one object), this touches only the largest mesh primitive — the body —
  and leaves the eyes/eyebrows primitives and the 65-joint armature alone. Decimate modifier
  moved to the front of the stack and applied (armature modifier is never applied, so skin
  binding survives); `vertex_group_limit_total(limit=4)` afterward enforces the hard WebGL
  4-weights-per-vertex limit (it fired: "131 vertex weights limited" on the male mesh).
- `tools/build-assets.mjs`: `buildSkinnedLod()` runs the script against the already-built
  `characters/male.glb` / `female.glb` (not raw/, so no texture re-staging needed), asserts the
  triangle ceiling and that the joint count is still 65, and writes `maleLow` / `femaleLow`
  into the manifest. Ran `npm run assets:build` in full (14s) — output: `male-low.glb` 4,702
  tris, `female-low.glb` 4,697 tris (target was body-triangle count, ~2.9k/2.5k, tuned so
  12 × either total stays under 60k with margin: 56,424).
- `src/data/scenery.ts`: `maleLow` / `femaleLow` asset ids.
- `src/render/character-factory.ts`: `BuildOptions.detail?: 'high' | 'low'` (default `'high'`)
  resolves which body asset a character loads. Nothing calls it with `'low'` yet — no caller
  needs it until Level 5's spawner (Phase G) picks distant/enemy detail level; the plumbing is
  what Phase B asked for, not the spawn-time policy.
- `src/scenes/LodDebug.tsx` + `DEBUG.lod` (`?debug=lod`): four characters side by side — Rama
  and Tataka, each high and low detail, playing `WALK` — for the required on-screen comparison.
  Not part of any real level; only reachable behind the debug flag, same pattern as `?debug=bow`.
- `tests/unit/content.test.ts`: extended the existing manifest test with the 12×low-tris ≤ 60k
  assertion (the joint-count and per-asset triangle ceiling are asserted inside the build script
  itself — the test only checks the shipped manifest, matching how `male`/`female`/`palace` are
  already checked here).

**Verified**
- `docs/screenshots/lod-comparison.png` (`?debug=lod`, mid-walk-cycle): high vs low read as
  the same character at a normal viewing distance — no spikes, no collapsed geometry, no visible
  seam at hips/knees/shoulders on either mesh.
- 73 unit tests green, `typecheck` and `lint` clean.
- Full L1 e2e passes: 112,516 triangles / 37 draw calls / 4 skinned (peak 4) — unaffected, since
  L1 only ever requests `'high'` detail (the default).

**Found, not fixed (out of Phase B's scope)**
- The `?debug=lod` screenshot exposed that Tataka (the female mesh) is not actually covered
  above the waist: the base mesh's baked-in bikini is fully visible, the Phase A dhoti only
  wraps waist-to-calf, and her spec has `sash: false`. Same "cannot ship" problem Phase A
  closed for the male mesh, still open for the one female character — Tataka has no scene yet
  (Level 3, Phase D), so this doesn't block anything shipped so far. Recorded in `TODO.md` for
  whoever builds Phase D.

**Next**: Phase C (Level 2, Vishwamitra's training) per `OVERNIGHT.md`.

## 2026-09-09 — Claude Code (Sonnet 5, overnight loop) — pass 3 phase A: modesty and costume

Branch `feat/pass-3-overnight` from `feat/vertical-slice`. Commit `c74542e`. Followed
`OVERNIGHT.md`'s phase order; this is the first phase of pass 3 (nothing had landed on this
branch before this run — `SESSION-LOG.md`'s last entry was still pass 2).

**Built**
- `src/render/garments.ts`: procedural dhoti (tapered `CylinderGeometry`, open-ended, skinned
  to pelvis with a blend toward thigh_l/thigh_r near the hem by proximity) and an angavastram
  sash (`BoxGeometry` from a clavicle to spine_03, pushed outward off the spine centerline so
  it drapes on the chest instead of sitting embedded in the torso). Both are extra `SkinnedMesh`
  "parts" fed into `character-factory.ts`'s existing merge step — no new `SkinnedMesh`
  instances, same pattern as the source body/eyes/eyebrows primitives.
- `src/data/characters.ts`: `garmentColor`, `garmentLength`, `sash`, `sashColor` added to
  `CharacterSpec`, values authored for all 9 characters. Every character gets a dhoti,
  including Tataka (the female mesh has the same unclothed problem); sash is on for the
  royal/sage cast and off for the three rakshasas.
- `src/data/scenery.ts`: `SKELETON.PELVIS`, `THIGH_L`, `THIGH_R`, `CLAVICLE_L` added (verified
  against the real bone names in `public/assets/high/characters/male.glb`).
- `src/data/balance.ts`: new `garments` block (waist radius, hem flare, radial segments, sash
  dimensions, surface offset) — no magic numbers in `garments.ts`.
- `tests/unit/garments.test.ts`: 2 tests — every character's garments carry exactly-summing
  skin weights and valid bone indices, and both parts stay far under the 400/200 tri budget.

**Bugs found and fixed (both in `BufferGeometryUtils.mergeGeometries`, which the character
merge step depends on)**
- `gpuType` mismatch: GLTFLoader's body/eyes/eyebrows geometries carry `InterleavedBufferAttribute`s
  with no `gpuType` at all; a plain `BufferAttribute` (what the garment geometry uses) defaults
  to `FloatType`. Merge silently refused with "failed while trying to merge the position
  attribute." Fixed by forcing every kept attribute to `FloatType` in `stripped()`
  (`character-factory.ts`), the one place all parts — real and procedural — already funnel
  through.
- `skinIndex` array type: had to match the body mesh's actual `JOINTS_0` TypedArray exactly
  (turned out to be `Uint8Array`, not the `Uint16Array` I assumed first). Rather than guess
  again, threaded the real constructor through from `parts[0].geometry.attributes.skinIndex.array.constructor`
  into `buildGarments()`.
- Neither bug was visible from a static read of `character-factory.ts` — both only showed up
  as a caught `Error('character primitives could not be merged')` with the real cause logged
  to the browser console, found via a throwaway Playwright console-listener script (not
  committed) rather than the Playwright test's own error output, which just reports the
  downstream symptom (loading stuck at a fixed percent, no dialogue-text element ever
  appearing).

**Verified**
- 73 unit tests green (was 71; the 2 new are `garments.test.ts`), `typecheck` and `lint` clean.
- Full L1 e2e (`tests/e2e/l1.spec.ts`) passes end to end: 112,516 triangles / 37 draw calls / 4
  skinned (peak 4), all within budget — draw calls went from ~29 to 37 (extra material groups
  per character), still well under the 80 budget.
- `docs/screenshots/l1-court.png` (regenerated by the e2e run) and a copy at
  `docs/screenshots/costume-l1-court.png`: Vishwamitra (cream dhoti), Dasharatha (gold-brown
  dhoti), and Rama (cream dhoti, back view, thin orange sash sliver visible at the right
  shoulder) all show the dhoti clearly, tapered correctly at the hem, no visible spikes or
  weight artefacts at the pelvis/thigh seam.

**Least confident, and known rough edges**
- The angavastram sash is only clearly visible on Rama in the court screenshot. Vishwamitra
  (arms-folded idle) and Dasharatha (seated) may have it occluded by pose, or its colour may be
  blending into the skin tint — not confirmed which. The dhoti (the actual "cannot ship" fix)
  is unambiguously working; the sash is a secondary decorative layer and its visibility is
  unverified beyond Rama. Next: a dedicated front-on screenshot per character (a `?debug=cast`
  view that lines up all `CHARACTER_SPECS` ids facing the camera, none exists yet) would settle
  this without relying on whatever pose each L1 NPC happens to be in.
- OVERNIGHT.md's phase A text says "screenshots of all five L1 characters" — L1 actually has
  four (Rama the player + Dasharatha, Vishwamitra, Vasishtha as NPCs; Lakshmana was moved out
  in pass 2). Treated as a plan-doc inaccuracy, not a missed character; all four are covered by
  the dhoti fix (all `CHARACTER_SPECS` entries got one), only three are visible in the one
  screenshot taken since Vasishtha wasn't on screen at the throne waypoint.
- Crown for Rama/Dasharatha and jata/topknot hair for the rishis, both mentioned in
  `OVERNIGHT.md` phase A, were not attempted — the rishis already reuse the existing `beard`
  hairstyle (no new asset needed there), and a crown is new prop geometry with no immediate
  modesty stakes. Deferred to `TODO.md` rather than expanding this phase.
- Did not touch the procedural bow draw pose, per the standing overnight rule.

**Next**: Phase B (skinned decimation, blocks Level 5) per `OVERNIGHT.md`.

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
