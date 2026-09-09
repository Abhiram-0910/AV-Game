# TODO

## BLOCKER for Level 5 — skinned decimation (pass 3, before any L5 work)

The character bodies are ~14.3k triangles each. Level 5 runs the full 12-character budget:
**12 × 14.3k ≈ 172k skinned triangles against a 60k skinned budget** (and a 120k frame
budget). L5 cannot be started until the bodies are decimated. This is a deliberate,
visual job, not a pipeline flag: `gltf-transform simplify` on a skinned mesh risks weight
artefacts at the joints, so it must be done with the original and the decimated body on
screen side by side (`?debug` overlay), animating, and compared before it lands. Blender
`Decimate` with the armature intact is the first thing to try; `tools/decimate.py` already
exists for static meshes but must not be pointed at a skinned mesh as-is.

## Pass 3

- Electron: `electron/main.ts` + `preload.ts`, `"main"` in package.json, electron-builder
  config, `--ozone-platform=x11` on Linux, `platform/electron/` save (userData file) and
  fullscreen adapters behind the existing `Platform` interface.
- Menus, codex (Story Scroll) UI, quiz UI. Until the quiz UI exists `ui/Flow.tsx`
  auto-passes each gate (`QuizAutoPass`, records no score).
- Levels 2–5 scenes and the enemy AI (`systems/ai/`). Spawner pieces exist: the skinned
  budget registry and the pure wave scheduler are built and tested, nothing spawns yet.
- Costume textures. Both base bodies ship with the Quaternius "superhero" skin, which reads
  on screen as a bodybuilder in briefs. Rama, Dasharatha, and the rishis need a dhoti /
  angavastra base-colour texture (one per character is enough; the factory already tints).
  Highest-impact visual fix in the project.
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
