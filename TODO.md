# TODO

## Open after voice-over (2026-09-14, Claude Code)

All 52 lines are voiced (SESSION-LOG 2026-09-14, "Voice-over"). Open:
- **Human ear on the cast.** Vasishtha (Umbriel) and Dasharatha (Alnilam) are 0.9 st apart in the same L1 scene, inside
  Chirp 3's run-to-run noise. Recast = one line in `CAST` (`tools/generate-vo.mjs`) + re-run.
- **Title-screen volume is reset by Begin.** `TitleScreen.newGame()` → `gameStore.reset()` → default settings (0.8).
  It needs a reset that keeps `settings`, in `core/` or the title screen, which the voice branch does not own.
- **Is per-line fetching a real problem on a lab connection?** Largest single file 53,275 B
  (`l4.vishwamitra.astras.0`), L1 total 428,921 B over 15 files. Voice start lead on a local preview (Windows Chrome):
  ~25–300 ms, once 1.25 s on the first line after level load. Measure on a throttled or school link before deciding to
  preload a level's VO behind the progress bar.
- `electron/main.ts` MIME map has no `.ogg` (harmless with Howler's XHR decode; confirm in a packaged build).
- Safari gets subtitles only (Howler's `.ogg` probe checks Vorbis). Fine for Chrome labs and Electron.
- The `subtitles` setting does nothing yet.
## Open after the royal UI pass (2026-09-14, Claude Code)

Every panel, button, dialogue box, HUD card, quiz and result screen is framed (SESSION-LOG 2026-09-14, "Royal UI";
system in DESIGN.md; before|after sheets `docs/screenshots/ui-royal-*.png`). Observed but not changed:
- **The talk prompt and the controls line sit behind the dialogue box** during a conversation (`hud-prompt` at
  `bottom: 160px` pokes out above the dialogue crest; `hud-controls` is covered). Same at HEAD before this pass
  (`ui-royal-dialogue-talk.png`, left). HUD positions were out of scope; hiding both while `dialogue` is open is the
  likely fix.
- **The astra button (L4/L5) was not captured.** Its CSS moved to the tokens (crimson lacquer, 48px tabs, 16px text),
  but the screenshot script only visits L1. Shoot it on L4 with `astraReady`.
- **The astra icons are emoji** (💨/🔥), which render differently per OS and clash with the gold filigree. Inline SVG
  glyphs in `AstraButton.tsx` would match.
- **The captures are the low tier under SwiftShader.** A real-GPU pass (`tools/bench-gpu.mjs` pattern) on the high
  tier should confirm the panel `drop-shadow` costs nothing on the Intel UHD while a menu is open.
- **Rama needs a real quiver (not started: it is a render change).** The arrow that reads as "through his back" is
  the quiver stand-in: `render/character-factory.ts:132-133` attaches a bare `arrow.glb` to `spine_03`
  (`BALANCE.archery.QUIVER_POS/ROT/SCALE`) because the pack has no quiver mesh. The fix is a procedural quiver
  built where the stand-in is now: a tapered gold-and-crimson leather tube with gold bands and a few fletched shafts
  showing, in the DESIGN.md palette, merged into one mesh and parented to `spine_03`. Its offsets have to be
  re-measured so it clears the body through the bow draw and the sword slash (shoot both poses from the side), and
  it applies to Lakshmana too (`props: ['bow', 'quiver']`). Budget it: tris and draw calls on the low and high tiers.
  Coordinate with the rendering agent; the royal UI pass (src/ui only) did not touch it.
- **`tests/unit/lint-boundary.test.ts` timed out once** in the full Vitest run at load average ~94 (four agents
  running). It passes alone (6/6). Not a code change; worth a longer timeout if it recurs.
## Open after the L5 interception work (2026-09-14, Claude Code)

SESSION-LOG 2026-09-14, "L5: interception, dead regen wired". Observed, not changed:
- **A human has not played L5** with interception or regen. The bot's margins say nothing about a child on a trackpad.
- **`play.ts` `face()` / `steerTo` cannot converge under SwiftShader.** A key held for any part of a slow frame turns the
  whole frame (0.7–0.8 rad), so `face()` swings past its 0.5 rad tolerance and loops. It froze the first L5 rule-run
  bot for ~1400 ticks and made the L3 regen-on bot fire nothing at Tataka (yaw 2.7 ↔ 4.5 through her whole fight):
  the likeliest cause of the L3 "melee race" flake. `l5.spec.ts` now turns by holding A/D and watching the heading;
  `play.ts` is shared and was left alone.
- **The sword can kill Maricha.** `systems/combat-rules.ts` `checkMeleeHit` has no Maricha guard (arrows and
  Agneyastra skip him), so 3 slashes (35 × 3 > 90) kill him, against the content rule "flung, never killed". Not in
  this task's files; the L5 bot keeps the sword off him.
- **Regen was dead code** (`player.REGEN_PER_TICK`, `REGEN_DELAY_TICKS`): now wired, lines in the SESSION-LOG entry.
  Tataka's cadence (198 ticks) is under the 240-tick delay, so it does nothing during her fight.

## Open after the court defects pass (2026-09-14, Claude Code)

Glass, platform and stencil are done (SESSION-LOG 2026-09-14, "L1 court defects"). Open, observed but not changed:
- **Rama casts no visible shadow on L1 from the follow camera. Not fixable by moving the key light.** The shadow is
  real (visible from any side view), but the key (`dir [3,5,10]`) sits behind the camera, so it falls behind his body
  onto the dark carpet. Evidence, all shot on the 4050 from spawn and the throne approach (`gpu-key12-*.png`):

  | candidate | key dir | Rama's shadow | cost to the room |
  |---|---|---|---|
  | A (current) | [3, 5, 10] | not readable | — |
  | B right 35° | [7, 5, 10] | not readable | column shadows turn |
  | C left 35° | [−7, 5, 10] | not readable | column shadows swing to the other side |
  | D low sun | [3, 3, 10] | not readable | columns and walls darken |
  | E right 55° | [10, 6, 6] | not readable | arcade darker and flatter |

  A lighter carpet field (#b43540) was tried and reverted: no shadow from spawn, and the corridor lost its royal
  crimson. Light and carpet stay as they are. Do not reopen without a new idea that costs the room nothing.
- **Wall stencil** is less regular but still one 2.4 m tile; a second panel variant (a two-tile canvas, ~8 MB more on
  both tiers) is the next step if it still reads as repeated.
- **Glass** has no coloured light on the floor (unchanged from the entry below).
- **L3 e2e** still loses the melee race (below). ~~L5 e2e is a known failure~~: winnable, the bot wins 2 of 3 (see
  "WINNABLE — L5" below).


## Open after phases 4–6 (2026-09-14, Claude Code)

Phases 4, 5 and 6 are done (SESSION-LOG 2026-09-14, "L1 reads as a Rajput court"). What is still open, observed but not
changed:
- ~~A human has not yet judged L1~~: judged a large improvement (2026-09-14); the front columns read as framing.
- ~~The right-side platform's crumpled ornament~~: cut, deck and steps kept (2026-09-14).
- **GTAO is subtle** at radius 1.6. Its frame cost could not be resolved on the 4050 because the 144 Hz display caps the
  metric, and full-resolution AO was not measured. A GPU timer query, or a 60 Hz run with vsync off, would give the
  real cost.
- **Coloured light on the floor from the glass.** Additive pools were invisible on lit marble and were deleted. A real
  attempt needs the key light through the window (a projected gobo or a spotlight with a colour map), not a decal.
- **L2's hill ring is mostly hidden** by the forest from the bank and spawn views. It reads on L4.
- **The waypoint beam** still runs up through the back-row arch and the frieze from the L1 entrance.
- **L3 e2e loses the melee race again.** It failed in three runs on 2026-09-14: in the suite, alone, and on baseline
  4a3ea76 with the same spec, reaching Tataka 150 → 15 at best. L3's code did not change. It passed in the previous
  session's final suite, so it is timing-dependent. It needs the TODO's melee-pacing work, not a spec loosening.
- The Electron `force_high_performance_gpu` switch is not yet confirmed on Windows (`[gpu]` log line).

## Playtest follow-ups (2026-09-13, Claude Code)

Observed or measured while fixing the six playtest failures (SESSION-LOG 2026-09-13), not changed:
- **Arrow length.** The arrow model is 1.46 m long in flight (`arrow.glb` bakes ×100 like the other props, and
  `ArrowPool` applies no scale). A real arrow is ~0.75 m. Now that arrows fly head first, the length is easy to see.
- **Dead band at the bottom of the screen.** The lower ~40 % of the screen clamps to `AIM_MAX_DOWN`, so every cursor
  position there launches the same −0.25 rad. Nothing a player needs lies there (rakshasas at 1.6–4 m still lock), but
  moving the mouse in that region changes nothing, which may read as broken.
- **Sweep proxies.** The aim-limit sweep used boxes for `target.glb` and a rakshasa, not the real meshes, and only the
  full-draw arc. Partial-draw shots were not measured.
- **Cursor gauge overlap.** The draw gauge and lock reticle now sit at the cursor, which is on the target while aiming.
  Not yet judged by a human for whether they hide a small far target (L4 long is 13 px tall).
- **Talk objectives have no marker.** Only `reach` objectives get the ring, beam and edge arrow, as asked.
- **Ring and edge arrow at once.** The edge arrow aims at a point 1.5 m above the waypoint's centre, so with the
  waypoint just behind the camera (L4 right after the talk) the arrow shows while the ring's near edge is already on
  screen. Harmless, but the indicator could test the ring's edge instead.
- **Beam inside the palace.** The waypoint beam is 16 m tall; inside the L1 palace it runs through the ceiling. Unchecked
  from outside angles.

## Visual follow-ups (2026-09-13, Claude Code)

- Rama holds the sword upright behind his head while drawing the bow (seen from the L4 firing line on low). The
  melee PR's sword prop stays attached during archery.
- L2 light shafts, second attempt (2026-09-14): additive crossed cards along a side-front sun ([10, 5, −4]). They read as
  faint haze in the canopy and as two thin diagonal streaks in the sky, not as beams, so the sun went back to the front
  and the shafts were deleted (screenshots `gpu-uhd-l2-{bank,east}.png` against `gpu-before10-l2-*`). A real attempt needs
  volumetric depth (a god-ray post pass masked by the canopy), not cards.
- Dressing does not collide and is not in `world.hittable` or `world.ground`: the player walks through trees and
  arrows fly through bales. Registering bales as ground would make the arc stop where the fired arrow does not.
- The six static `tree.glb` props in L2 (full model, `StaticProp`) still have the orange-red bark; only the instanced
  forest trunks got the grey-brown tint and root flare. A placement tint would tint the leaves as well.
- The L3 curse lift is high only; low keeps the cursed look through the outro.
- `vite.config.ts` `syncPortraits()` reads `/home/yashwanth/...`, so it is dead on every other machine.

## RESOLVED — L5 exceeded the 12 SkinnedMesh budget (16 / 12) (2026-09-13)

The wave spawner budgeted from built characters only, so spawns still loading their GLB went uncounted.
`committedSkinned()` in `systems/spawner/wave-scheduler.ts` counts requested spawns too. Measured peak after the
fix: 11 / 12.

## RESOLVED — vite.config.ts recreated the fake low tier on every Vite start (2026-09-13)

`syncLowTier()` deleted and the untracked `public/assets/low/` (49 MB) removed. `render/manifest.ts` still serves
`high/` to both tiers; the KTX2 entry below still stands.

## WINNABLE — L5, not yet played by a human (2026-09-14, Claude Code)

Three changes, SESSION-LOG 2026-09-14 "L5: interception, dead regen wired":
- **Interception:** a rakshasa turns on Rama when he is nearer to it than the fire and within `yajna.ENGAGE_RADIUS` 4 m.
- **Player regen wired:** it was dead code.
- **`subahu.ATTACK_COOLDOWN` 90 → 150.**

The bot won 2 of 3 instrumented runs: Rama at 33 % and 15 % health, the yajna at 70 % and 58 %. Its first wins ever.
The third run lost with Subahu at 15 / 120. The committed `l5.spec.ts` then passed once, in 1.9 min: the first full
L5 e2e pass. `l5.spec.ts` still asserts the real win title, the ending and the codex
count. Open:
- **Play it by hand.** Is 2 of 3 with a thin health margin right for a Class 6–10 child? The bot is slower than a human
  and aims better.
- **The bot wins about two runs in three,** so a single e2e run of `l5.spec.ts` can fail on a correct build. Read the
  failure before retrying (CLAUDE.md's L4 note on silent resets applies).
- **Low-tier draw calls mid-fight are 104–106** (80 budget), down from 161.

The four numbered points below are answered: 1 and 2 did not reproduce, and the cause was the bot's speed under
SwiftShader. 3 is interception. 4 still stands.

## (history) BROKEN — L5 e2e still loses; L4 fixed (2026-09-13, Claude Code)

L4 passes again: release origin back on the aim, aim assist 0.75 m / 0.3, and three stale spec assumptions fixed
(see SESSION-LOG 2026-09-13). L5 still ends "Try again" after the budget, Maricha and Manava-key fixes. Next, in order:

1. Why the bot's arrows stop firing mid-fight (the quiver sat at 3 for ~2300 ticks while the loop kept drawing).
2. Whether the sword (F) ever lands in L5: scripted presses dealt no damage in the one instrumented run.
3. The guard design. Rakshasas halt at REACH 1.6 from the altar centre, so a player standing on the altar is ~2 m
   from them and blocks nothing. "Stand between them and the fire" (l5.intro) is not something the rules allow.
4. Play it by hand before touching balance. `l5.spec.ts` should keep asserting a real win.

## Visual pass follow-ups (2026-09-11, Claude Code)

- Dasharatha's dhoti collapses into gold slivers at the knees in SIT_TALK (pre-existing: the tapered tube is
  skinned pelvis→thigh by height). A seated dhoti could use `garment-fit.ts` weight copying.
- The sash on Rama and Dasharatha mostly disappears under the collar; decide whether royals keep it.
- Vishwamitra and Vasishtha are still bare-chested; the `upper` spec field now makes that a data change.

## KNOWN — real KTX2 compression and a real low tier are still unbuilt (2026-09-11)

Commit 3c28ccf added `public/assets/low/` claiming KTX2 compression. It held zero `.ktx2`
textures: every GLB was byte-identical to `high/` except `characters/{male,female}.glb`, which
were copies of the `-low` LODs already in `high/`. It doubled committed assets (50MB → 103MB)
for nothing. Deleted; `render/manifest.ts` serves `high/` to both tiers again. Cause:
`buildLowTier()` in `tools/build-assets.mjs` silently falls back to `copyFileSync` whenever
`gltf-transform etc1s/uastc` or `toktx` fails. Before re-running it, make that fallback throw,
and check the output actually contains KTX2 (`KHR_texture_basisu` in the GLB JSON).

## KNOWN — Electron shows a blank/crashed window in a GPU-less sandbox; not verified on a real target machine (pass 3 phase H, 2026-09-10)

`electron/main.ts` launches, serves `dist/` over a local static server, and loads correctly —
confirmed via `electron .` in this session's dev container. But that container (unlike the
user's own WSL machine, where the web build's SwiftShader path is already documented as
normal/expected in this file's CLAUDE.md) has no GPU device at all, and this Chromium version
no longer silently falls back to software WebGL:

```
[.WebGL] ContextResult::kFatalFailure: WebGL2 blocklisted
Automatic fallback to software WebGL has been deprecated. Please use the
--enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content.
```

Adding `--enable-unsafe-swiftshader` to the launch command made the GPU process initialize and
start producing the exact SwiftShader driver messages seen throughout this session's Playwright
runs — confirms the rest of the wiring (window creation, the static server, the preload/IPC save
bridge, `--ozone-platform=x11`) is correct; the remaining gap is purely GPU availability in this
one sandbox, not the Electron code. **Not baked into `main.ts`**: forcing unsafe software
rendering on every machine would silently degrade real hardware-accelerated installs (Windows,
a real Linux desktop) without them knowing — exactly the failure mode `logGpuInfo()`'s loud
console warning exists to catch instead.

**If `npm run electron:dev`'s window is blank or the process crashes with the same
`WebGL2 blocklisted` message** on a machine with no working GPU passthrough: add
`app.commandLine.appendSwitch('enable-unsafe-swiftshader')` next to the existing
`ozone-platform` switch in `main.ts`, or pass `--enable-unsafe-swiftshader` to the `electron .`
invocation in the `electron:dev` script, for local testing only.

**Not yet done**: an actual visual screenshot of the Electron window (every screenshot capture
tool available crashed the GPU process on a second concurrent launch in this same sandbox) and
a real test on a Windows machine or a real Linux desktop, which is the only way to confirm
`--ozone-platform=x11` actually fixes the black-canvas-on-Wayland issue it targets — that issue
never reproduces in a container with no GPU either way.

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

**Update (pass 3 phase G, 2026-09-10)**: the same symptom now also hit `l2.spec.ts`'s
`shootTarget` (`target at ... was never hit`) under an even higher load average (5.7/10.1/13.2)
than previously observed — once running the full suite as `--workers=5` (5 SwiftShader
Chromium instances competing at once), once rerun `--workers=1` right after. Neither
`l2.spec.ts` nor `l4.spec.ts`'s targeting code changed in phase G (only their shared
`declare global` type block gained two fields — type-only, no runtime effect); `l1.spec.ts`
and `l3.spec.ts` passed clean in the same `--workers=5` run despite the load, which is the
existing hit-test/timing logic behaving correctly under a heavier version of the same known
condition, not a new regression. Always pass `--workers=1` for a real signal on this repo's
e2e suite — the default `--workers=5` self-inflicts exactly the contention this entry is about.

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
`'high' | 'low'`; Level 5's wave spawner (phase G) now calls it with `'low'` for every
rakshasa/subahu/maricha it spawns. Visual comparison: `docs/screenshots/lod-comparison.png`
(male and female, high vs low, mid-walk-cycle) — no weight artefacts visible at hips/knees/
shoulders.

## KNOWN — L5's e2e does not yet win; balance improved substantially but not fully cleared (pass 3 phase G, 2026-09-10)

`tests/e2e/l5.spec.ts` scripts a bow-only guard bot (stand at the altar, snipe the nearest
enemy, recover spent arrows on foot when the quiver runs dry, save the single Manava astra
charge for Maricha) and asserts a real win. As committed, it still fails — the bot survives
longer with each round of tuning below but has not reached `result.win` in six full runs.
Investigated at length, with real fixes found along the way, before accepting this open:

- **Root-caused why the bot never took damage at guard positions 1-3m from the altar**: a
  rakshasa's pathing goal is always the altar's exact coordinate (`stepEnemy`'s `objective`),
  and it only ever redirects onto the player if the player is *currently* within its `REACH`
  (1.6m) — which never happens from a few metres back, since the enemy stops advancing the
  moment it's within its own `REACH` of the altar, well short of the player's position. Moved
  the guard position to right on top of the altar waypoint (`GUARD_POS` in `l5.spec.ts`); the
  bot then started taking real melee damage, confirming "stand between them and the fire"
  (`l5.intro`) only works standing *at* the fire, not near it.
- **Found and fixed a real asymmetry**: the player has a shared hit-invulnerability window
  (`playerInvulnUntil`) so several attackers landing hits in the same moment don't stack
  unmitigated damage — the yajna had no equivalent, so a few concurrent rakshasas could drain
  it from full in well under 15 seconds regardless of `YAJNA_DAMAGE`. Added
  `yajnaInvulnUntil`/`BALANCE.yajna.HIT_INVULN_TICKS` to `damageYajna()` in `game-state.ts`,
  mirroring `damagePlayer()` exactly. Covered by a new test in `tests/unit/game-state.test.ts`.
- **Found and wired up a dead mechanic**: `gameStore.pickupArrows()` and the `hud.pickup`
  string already existed from pass 1 but nothing ever called the action or showed the prompt —
  Level 5 is the first level where the quiver can actually run dry mid-fight. Added
  `world.arrowPickups` (populated when a missed arrow grounds, `systems/archery/step.ts`),
  `nearestPickupIndex()` (`systems/interaction/interact.ts`, unit-tested), and wired proximity
  + the `E` key into `SimulationDriver.tsx`'s `stepInteraction()`.
- Retuned from the pass-1 draft, each recorded with its reasoning in `balance.ts`/`levels.ts`:
  `rakshasa.DAMAGE` 10→6, `ATTACK_COOLDOWN` 60→90, `YAJNA_DAMAGE` 5→4; `yajna.MAX_INTEGRITY`
  100→140; `player.ARROW_PICKUP` 5→8; wave 1/2 `spawnIntervalTicks` widened; wave 1 `maxAlive`
  4→3.
- Each round measurably extended survival time (38s → 47s → 66s → 66s → 126s across six runs)
  and the bot now reaches the full skinned-mesh budget (12/12) mid-fight — real, measured
  progress, not noise — but still eventually loses to `yajnaZero`, not `healthZero`.

**Next to try** (didn't fit the time budget this session): a bot that actively repositions
toward whichever spawn direction currently has the nearest live threat instead of holding one
spot (true multi-directional blocking, which the code supports — the bot's script doesn't);
softening wave 3/4 (`startTick: 3000`/`4500`) the same way waves 1/2 were; or accepting that
this fight wants a real human player's reflexes and judgement more than a scripted one's, and
confirming via manual play before touching the numbers further. `l5.spec.ts` deliberately
asserts a real win rather than being loosened to "make progress" — a green check here should
mean the level is actually winnable.

## GOTCHA — e2e against a stale build looks exactly like a broken level (2026-09-10)

`playwright.config.ts`'s `webServer` runs `npm run preview`, which serves whatever is already
in `dist/` — it never runs `npm run build`. Burned real debugging time on `l5.spec.ts`: the
level appeared to never load at all (loading screen stuck, 0 Skinned meshes forever) because a
stale `dist/` from before Level 5 existed was still being served. Symptom looks identical to
a genuine load-gate bug; check `dist/`'s age against the last source change first. Now noted
in `CLAUDE.md`'s gotchas.

## Pass 3

- Electron shipped (pass 3 phase H) — see the KNOWN entry above for its verification status.
  Fullscreen reuses the web adapter unchanged (Electron's renderer supports the DOM Fullscreen
  API natively); only save needed an Electron-specific implementation.
- Title screen, settings, pause menu, Story Scroll, real quiz UI, and an ending screen all
  shipped (pass 3 phase F). Quality tier changed in Settings takes effect on the next load, not
  live — `resolveTier` only runs once at boot; hot-swapping the asset tier mid-session is real
  scope, not attempted.
- Levels 2, 3, 4, and 5 shipped (pass 3 phases C, D, E, G). Level 5's wave spawner
  (`entities/wave-spawner.ts`) is the first thing to actually use the wave scheduler and the
  global skinned-mesh budget from pass 1/phase B — see the KNOWN entry above for its balance
  status.
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
