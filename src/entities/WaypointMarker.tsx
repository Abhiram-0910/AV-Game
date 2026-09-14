// The active 'reach' objective marked in the world: a pulsing ground ring the size of the arrival radius and a tall
// beam, additive and unfogged so both read from the follow camera across a level. Driven only by the objective data
// (core/objectives activeWaypoint) and mounted once for every level in App.tsx. It also projects the spot each frame
// for the HUD's screen-edge arrow (ui/WaypointIndicator.tsx).
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { useStore } from 'zustand'
import {
  AdditiveBlending,
  BufferAttribute,
  type Camera,
  Color,
  CylinderGeometry,
  DoubleSide,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
} from 'three'
import { BALANCE } from '@data/balance'
import type { Vec3 } from '@data/levels'
import { gameStore } from '@core/game-state'
import { activeWaypoint } from '@core/objectives'
import { levelDef } from '@core/progression'
import { type WaypointScreen, worldStore } from '@systems/world'

const WP = BALANCE.waypoint
const REACH = BALANCE.interaction.REACH_RADIUS
const COLOR = new Color('#ffcf6e')
const projected = new Vector3()

function createParts() {
  // forceSinglePass: a transparent DoubleSide material is otherwise drawn twice (back faces, then front). Additive
  // blending does not care about order, and the second pass doubled the marker's draw calls (measured 4, not 2).
  const glow = { color: COLOR, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide, forceSinglePass: true } as const
  const ring = new RingGeometry(REACH - WP.RING_WIDTH, REACH, 48)
  const beam = new CylinderGeometry(WP.BEAM_RADIUS, WP.BEAM_RADIUS, WP.BEAM_HEIGHT, 16, 8, true)
  // Additive black adds nothing, so vertex colour falling to black up the beam fades it out toward the top.
  const position = beam.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i += 1) colors.fill((0.5 - position.getY(i) / WP.BEAM_HEIGHT) ** 1.5, i * 3, i * 3 + 3)
  beam.setAttribute('color', new BufferAttribute(colors, 3))
  return {
    ring,
    beam,
    ringMat: new MeshBasicMaterial({ ...glow, opacity: WP.RING_OPACITY }),
    beamMat: new MeshBasicMaterial({ ...glow, opacity: WP.BEAM_OPACITY, vertexColors: true }),
  }
}

/** The spot in viewport pixels, or, when it is off camera or behind it, the point on the screen edge in its direction. */
function screenSpot(camera: Camera, spot: Vec3, width: number, height: number): WaypointScreen {
  projected.set(spot[0], spot[1] + WP.INDICATOR_HEIGHT, spot[2]).project(camera)
  const behind = projected.z > 1
  let nx = behind ? -projected.x : projected.x
  let ny = behind ? -projected.y : projected.y
  const toPx = (onScreen: boolean, angle: number) => ({ onScreen, x: ((nx + 1) / 2) * width, y: ((1 - ny) / 2) * height, angle })
  if (!behind && Math.abs(nx) <= 1 && Math.abs(ny) <= 1) return toPx(true, 0)
  if (Math.hypot(nx, ny) < 1e-6) ny = -1 // straight behind: point down, toward "turn around"
  const k = Math.min((1 - (2 * WP.EDGE_MARGIN_PX) / width) / Math.abs(nx || 1e-9), (1 - (2 * WP.EDGE_MARGIN_PX) / height) / Math.abs(ny || 1e-9))
  nx *= k
  ny *= k
  return toPx(false, Math.atan2(-ny * height, nx * width))
}

export function WaypointMarker() {
  const spot = useStore(gameStore, (s) => activeWaypoint(levelDef(s.level), s.objectives))
  const camera = useThree((s) => s.camera)
  const parts = useMemo(() => createParts(), [])
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)

  useEffect(
    () => () => {
      parts.ring.dispose()
      parts.beam.dispose()
      parts.ringMat.dispose()
      parts.beamMat.dispose()
      worldStore.getState().setWaypoint(null)
    },
    [parts],
  )

  useFrame(({ clock, size }) => {
    if (!group.current) return
    const show = spot !== null && gameStore.getState().phase === 'play'
    group.current.visible = show
    if (!spot || !show) return worldStore.getState().setWaypoint(null)
    group.current.position.set(spot[0], spot[1], spot[2])
    ring.current?.scale.setScalar(1 - WP.PULSE * (0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2 * WP.PULSE_HZ)))
    worldStore.getState().setWaypoint(screenSpot(camera, spot, size.width, size.height))
  })

  return (
    <group ref={group} name="waypoint-marker" visible={false}>
      <mesh ref={ring} geometry={parts.ring} material={parts.ringMat} rotation-x={-Math.PI / 2} position-y={WP.RING_LIFT} />
      <mesh geometry={parts.beam} material={parts.beamMat} position-y={WP.BEAM_HEIGHT / 2} />
    </group>
  )
}
