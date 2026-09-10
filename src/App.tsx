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
import { isSoftwareRenderer, resolveTier } from '@render/quality-tier'
import { L1Court } from '@scenes/L1Court'
import { L2Forest } from '@scenes/L2Forest'
import { L3Forest } from '@scenes/L3Forest'
import { L4Range } from '@scenes/L4Range'
import { LodDebug } from '@scenes/LodDebug'
import { Flow } from '@ui/Flow'
import { useGame } from '@ui/use-game'
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
  setTier(decision.tier)
}

function Level({ tier }: { tier: ResolvedTier }) {
  const level = useGame((s) => s.level)
  const bow = levelDef(level).bow || DEBUG.bow
  if (DEBUG.lod) return <LodDebug tier={tier} />
  // ponytail: L5 is a later phase; it shows its loading screen until built.
  if (level === 'l1') return <L1Court tier={tier} bow={bow} />
  if (level === 'l2') return <L2Forest tier={tier} bow={bow} />
  if (level === 'l3') return <L3Forest tier={tier} bow={bow} />
  if (level === 'l4') return <L4Range tier={tier} bow={bow} />
  return null
}

export function App() {
  const [tier, setTier] = useState<ResolvedTier | null>(null)
  useEffect(() => persistOnChange(), [])
  useEffect(() => {
    if (DEBUG.overlay) Object.assign(window, { __bk: { game: gameStore, world, worldStore, perf: perfStats } })
  }, [])
  return (
    <>
      <Canvas
        camera={{ fov: CAM.FOV, near: CAM.NEAR, far: CAM.FAR, position: [0, CAM.HEIGHT, CAM.DISTANCE] }}
        dpr={BALANCE.render.PIXEL_RATIO_LOW}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={(state) => void boot(state, setTier)}
      >
        {tier && <Level tier={tier} />}
        {DEBUG.overlay && <PerfProbe />}
      </Canvas>
      <div className="overlay">
        {tier && !DEBUG.lod && <Flow />}
        {DEBUG.overlay && <PerfOverlay />}
      </div>
    </>
  )
}
