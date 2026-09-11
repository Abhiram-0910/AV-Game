// Dev/debug overlay from renderer.info. Live SkinnedMesh count is the biggest number and
// turns red above the budget: it is the one figure that decides whether a lab PC copes.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { BALANCE } from '@data/balance'
import { UI } from '@data/dialogue'
import { liveSkinned, peakSkinned } from '@systems/spawner/skinned-budget'
import { type PerfStats, perfStats } from './perf-stats'

/** Mount inside the Canvas. Reads the previous frame's renderer.info (info resets when render() starts). */
export function PerfProbe() {
  const gl = useThree((s) => s.gl)
  useFrame(() => {
    perfStats.triangles = gl.info.render.triangles
    perfStats.calls = gl.info.render.calls
    perfStats.skinned = liveSkinned()
    perfStats.peakSkinned = peakSkinned()
  })
  return null
}

/** Mount in the DOM overlay. */
export function PerfOverlay() {
  const [stats, setStats] = useState<PerfStats>({ ...perfStats })
  useEffect(() => {
    const id = setInterval(() => setStats({ ...perfStats }), 1000 / BALANCE.ui.OVERLAY_HZ)
    return () => clearInterval(id)
  }, [])
  const over = stats.skinned > BALANCE.spawn.MAX_SKINNED
  return (
    <div className="perf" data-testid="perf">
      <div className={over ? 'perf-skinned perf-over' : 'perf-skinned'}>
        <span data-testid="perf-skinned">{stats.skinned}</span>
        <small>
          {UI['debug.skinned']} · {UI['debug.peak']} <span data-testid="perf-skinned-peak">{stats.peakSkinned}</span> / {BALANCE.spawn.MAX_SKINNED}
        </small>
      </div>
      <div>
        {UI['debug.triangles']} <b data-testid="perf-triangles">{stats.triangles}</b>
      </div>
      <div>
        {UI['debug.calls']} <b data-testid="perf-calls">{stats.calls}</b>
      </div>
      <div data-testid="perf-tier">
        {UI['debug.tier']} <b>{stats.tier.toUpperCase()}</b> · {stats.tierReason && UI[`tier.reason.${stats.tierReason}` as keyof typeof UI]}
      </div>
      <div className="perf-renderer" data-testid="perf-renderer">
        {UI['debug.renderer']}: {stats.renderer} {stats.software ? `(${UI['debug.software']})` : ''}
      </div>
    </div>
  )
}
