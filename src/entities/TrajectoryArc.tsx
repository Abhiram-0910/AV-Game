// Trajectory preview while drawing: a dotted arc that tapers and fades toward where the arrow lands, and a landing
// marker (ring, centre dot, short upright tick). The dots lie on computeTrajectory's path, which is the fired arrow's
// own muzzleOrigin, stepArrow and aim assist, so the preview cannot promise a shot the arrow does not make.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BALANCE } from '@data/balance'
import { muzzleOrigin } from '@systems/archery/ballistics'
import { drawFraction, isDrawing } from '@systems/archery/draw'
import { computeTrajectory, dotsAlongPath } from '@systems/archery/trajectory'
import { world, worldStore } from '@systems/world'

const ARC = BALANCE.archery
const COLOR_TARGET = new Color('#7ee787')
const COLOR_DEFAULT = new Color('#ffd784')
const FORWARD = new Vector3(0, 0, 1)
const normalVec = new Vector3()
const markerQuat = new Quaternion()
const dummy = new Object3D()
const tint = new Color()

function createArc() {
  const glow = { transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false } as const
  const dots = new InstancedMesh(new SphereGeometry(ARC.ARC_DOT_RADIUS, 8, 6), new MeshBasicMaterial(glow), ARC.ARC_DOT_MAX)
  dots.frustumCulled = false // instances move every frame; the base sphere's bounds say nothing about where they are
  dots.count = 0
  dots.visible = false
  // One draw call for the whole landing marker: ring and dot lie in XY facing +Z (the surface normal), the tick stands on +Z.
  const tick = new CylinderGeometry(0.02, 0.02, 0.5, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.25)
  const markerGeo = mergeGeometries([new RingGeometry(0.3, 0.45, 40), new CircleGeometry(0.09, 20), tick])
  // forceSinglePass: a transparent DoubleSide material is otherwise drawn in two passes (measured: the arc added 3 calls, not 2).
  return { dots, markerGeo, markerMat: new MeshBasicMaterial({ ...glow, side: DoubleSide, forceSinglePass: true }) }
}

function placeMarker(marker: Object3D, point: [number, number, number], normal: [number, number, number]): void {
  normalVec.set(normal[0], normal[1], normal[2]).normalize()
  marker.position.set(point[0] + normalVec.x * 0.02, point[1] + normalVec.y * 0.02, point[2] + normalVec.z * 0.02)
  marker.quaternion.copy(markerQuat.setFromUnitVectors(FORWARD, normalVec))
}

function placeDots(dots: InstancedMesh, points: [number, number, number][], color: Color): void {
  const list = dotsAlongPath(points, ARC.ARC_DOT_SPACING, ARC.ARC_DOT_MAX)
  list.forEach((d, i) => {
    dummy.position.set(d.p[0], d.p[1], d.p[2])
    dummy.scale.setScalar(1 + (ARC.ARC_DOT_END_SCALE - 1) * d.u)
    dummy.updateMatrix()
    dots.setMatrixAt(i, dummy.matrix)
    dots.setColorAt(i, tint.copy(color).multiplyScalar(1 + (ARC.ARC_DOT_END_BRIGHTNESS - 1) * d.u))
  })
  dots.count = list.length
  dots.instanceMatrix.needsUpdate = true
  if (dots.instanceColor) dots.instanceColor.needsUpdate = true
}

function muzzle(): [number, number, number] {
  const p = world.player
  const t = world.alpha
  return muzzleOrigin(p.prevX + (p.x - p.prevX) * t, p.prevY + (p.y - p.prevY) * t, p.prevZ + (p.z - p.prevZ) * t, world.aimDir)
}

export function TrajectoryArc() {
  const arc = useMemo(() => createArc(), [])
  const dotsRef = useRef<InstancedMesh>(null)
  const marker = useRef<Mesh>(null)

  useEffect(
    () => () => {
      arc.dots.geometry.dispose()
      ;(arc.dots.material as MeshBasicMaterial).dispose()
      arc.dots.dispose()
      arc.markerGeo.dispose()
      arc.markerMat.dispose()
      worldStore.getState().setAimState(false, false, 0)
    },
    [arc],
  )

  useFrame(() => {
    const dots = dotsRef.current
    if (!marker.current || !dots) return
    if (!isDrawing(world.draw)) {
      dots.visible = false
      marker.current.visible = false
      worldStore.getState().setAimState(false, false, 0)
      return
    }
    const result = computeTrajectory(muzzle(), world.aimDir, Math.max(ARC.MIN_DRAW, drawFraction(world.draw)), world.hittable, world.ground)
    const color = result.isTarget ? COLOR_TARGET : COLOR_DEFAULT
    placeDots(dots, result.points, color)
    dots.visible = true
    marker.current.visible = result.terminalPoint !== null
    if (result.terminalPoint && result.terminalNormal) placeMarker(marker.current, result.terminalPoint, result.terminalNormal)
    ;(marker.current.material as MeshBasicMaterial).color.copy(color)
    worldStore.getState().setAimState(true, result.isTarget, drawFraction(world.draw))
  })

  return (
    <group name="trajectory-preview">
      <primitive ref={dotsRef} object={arc.dots} />
      <mesh ref={marker} name="landing-marker" geometry={arc.markerGeo} material={arc.markerMat} visible={false} />
    </group>
  )
}
