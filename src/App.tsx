// Boot: load the save, mount the canvas, resolve the quality tier once, then run the level.
import { Canvas, type RootState } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { levelDef } from '@core/progression'
import { platform } from '@platform/index'
import { DEBUG } from '@platform/debug'
import { initLoaders } from '@render/loaders'
import { type ResolvedTier, setAssetTier } from '@render/manifest'
import { PerfOverlay, PerfProbe } from '@render/perf-overlay'
import { perfStats } from '@render/perf-stats'
import { PostProcessing } from '@render/PostProcessing'
import { isSoftwareRenderer, resolveTier } from '@render/quality-tier'
import { WaypointMarker } from '@entities/WaypointMarker'
import { L1Court } from '@scenes/L1Court'
import { L2Forest } from '@scenes/L2Forest'
import { L3Forest } from '@scenes/L3Forest'
import { L4Range } from '@scenes/L4Range'
import { L5Yajna } from '@scenes/L5Yajna'
import { LodDebug } from '@scenes/LodDebug'
import { Flow } from '@ui/Flow'
import { screenStore } from '@ui/screen-store'
import { TitleScreen } from '@ui/TitleScreen'
import { useGame, useScreen } from '@ui/use-game'
import { initAudioDispatcher } from '@systems/audio'
import { world, worldStore } from '@systems/world'
import './ui/ui.css'

const CAM = BALANCE.camera

/** Write the save whenever progress or settings change. */
function persistOnChange(): () => void {
  let last = gameStore.getState()
  return gameStore.subscribe((s) => {
    const changed = s.completed !== last.completed || s.codex !== last.codex || s.settings !== last.settings || s.benchmarkTier !== last.benchmarkTier
    last = s
    if (changed) platform.save.store(s.snapshot())
  })
}

async function boot(state: RootState, setTier: (t: ResolvedTier) => void): Promise<void> {
  initLoaders(state.gl)
  const save = platform.save.load()
  gameStore.getState().hydrate(save)
  const decision = await resolveTier(save, state.gl)
  if (decision.benchmarked) gameStore.getState().setBenchmarkTier(decision.benchmarked)
  setAssetTier(decision.tier)
  state.gl.setPixelRatio(decision.tier === 'low' ? BALANCE.render.PIXEL_RATIO_LOW : Math.min(window.devicePixelRatio, BALANCE.render.PIXEL_RATIO_HIGH_MAX))
  perfStats.renderer = decision.renderer
  perfStats.software = isSoftwareRenderer(decision.renderer)
  perfStats.tier = decision.tier
  perfStats.tierReason = decision.reason
  screenStore.getState().setActiveTier({ tier: decision.tier, reason: decision.reason })
  setTier(decision.tier)
}

const SCENES = { l1: L1Court, l2: L2Forest, l3: L3Forest, l4: L4Range, l5: L5Yajna } as const

function Level({ tier }: { tier: ResolvedTier }) {
  const level = useGame((s) => s.level)
  // A retry remounts the scene, so every target, enemy and lesson re-registers from scratch.
  const attempt = useGame((s) => s.attempt)
  const bow = levelDef(level).bow || DEBUG.bow
  if (DEBUG.lod) return <LodDebug tier={tier} />
  const Scene = SCENES[level]
  return (
    <>
      <Scene key={attempt} tier={tier} bow={bow} />
      <WaypointMarker />
    </>
  )
}

export function App() {
  const [tier, setTier] = useState<ResolvedTier | null>(null)
  const screen = useScreen((s) => s.screen)
  useEffect(() => persistOnChange(), [])
  useEffect(() => initAudioDispatcher(), [])
  // The title screen shows before any level mounts, so no level assets load until the player
  // actually starts (DEBUG.lod bypasses it entirely — that view has no title of its own).
  const showLevel = tier && (screen === 'game' || DEBUG.lod)
  return (
    <>
      <Canvas
        camera={{ fov: CAM.FOV, near: CAM.NEAR, far: CAM.FAR, position: [0, CAM.HEIGHT, CAM.DISTANCE] }}
        dpr={BALANCE.render.PIXEL_RATIO_LOW}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={(state) => {
          // Read-only handles for the e2e; the camera lets a spec project a target to the pixels a player sees.
          if (DEBUG.overlay) Object.assign(window, { __bk: { game: gameStore, world, worldStore, perf: perfStats, camera: state.camera } })
          void boot(state, setTier)
        }}
      >
        {showLevel && <Level tier={tier} />}
        {tier === 'high' && showLevel && <PostProcessing />}
        {DEBUG.overlay && <PerfProbe />}
      </Canvas>
      <div className="overlay">
        {tier && !DEBUG.lod && (screen === 'game' ? <Flow /> : <TitleScreen />)}
        {DEBUG.overlay && <PerfOverlay />}
      </div>
    </>
  )
}
