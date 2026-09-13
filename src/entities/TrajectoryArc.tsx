// Trajectory preview arc and terminal landing marker for the archery system.
import { useFrame } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Group,
  Line,
  LineBasicMaterial,
  type Mesh,
  type MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { BALANCE } from '@data/balance'
import { muzzleOrigin } from '@systems/archery/ballistics'
import { isDrawing, drawFraction } from '@systems/archery/draw'
import { computeTrajectory } from '@systems/archery/trajectory'
import { world, worldStore } from '@systems/world'

const MAX_POINTS = BALANCE.archery.TRAJECTORY_MAX_STEPS + 2
const COLOR_TARGET = new Color('#7ee787')
const COLOR_DEFAULT = new Color('#ffd784')
const FORWARD = new Vector3(0, 0, 1)
const normalVec = new Vector3()
const markerQuat = new Quaternion()

function updateMarkerTransform(
  marker: Group,
  point: [number, number, number],
  normal: [number, number, number],
): void {
  normalVec.set(normal[0], normal[1], normal[2]).normalize()
  marker.position.set(point[0] + normalVec.x * 0.02, point[1] + normalVec.y * 0.02, point[2] + normalVec.z * 0.02)
  if (Math.abs(normalVec.y - 1) < 0.05) {
    marker.rotation.set(-Math.PI / 2, 0, 0)
  } else {
    markerQuat.setFromUnitVectors(FORWARD, normalVec)
    marker.quaternion.copy(markerQuat)
  }
}

function updateMaterials(
  isTarget: boolean,
  lineMat: LineBasicMaterial | null,
  ringMat: MeshBasicMaterial | null,
  dotMat: MeshBasicMaterial | null,
): void {
  const col = isTarget ? COLOR_TARGET : COLOR_DEFAULT
  lineMat?.color.copy(col)
  ringMat?.color.copy(col)
  dotMat?.color.copy(col)
}

function updateGeometry(line: Line, points: [number, number, number][]): void {
  const geo = line.geometry
  const posAttr = geo.getAttribute('position') as BufferAttribute
  const positions = posAttr.array as Float32Array
  const count = Math.min(points.length, MAX_POINTS)
  for (let i = 0; i < count; i += 1) {
    const pt = points[i]
    positions[i * 3] = pt[0]
    positions[i * 3 + 1] = pt[1]
    positions[i * 3 + 2] = pt[2]
  }
  geo.setDrawRange(0, count)
  posAttr.needsUpdate = true
}

function getMuzzleOrigin(): [number, number, number] {
  const p = world.player
  const t = world.alpha
  const px = p.prevX + (p.x - p.prevX) * t
  const py = p.prevY + (p.y - p.prevY) * t
  const pz = p.prevZ + (p.z - p.prevZ) * t
  return muzzleOrigin(px, py, pz, world.aimDir)
}

function useTrajectoryUpdate(
  lineRef: RefObject<Line | null>,
  markerRef: RefObject<Group | null>,
  ringRef: RefObject<Mesh | null>,
  dotRef: RefObject<Mesh | null>,
): void {
  useFrame(() => {
    const line = lineRef.current
    if (!line) return
    const marker = markerRef.current
    if (!marker) return

    if (!isDrawing(world.draw)) {
      line.visible = false
      marker.visible = false
      worldStore.getState().setAimState(false, false, 0)
      return
    }

    const fraction = Math.max(BALANCE.archery.MIN_DRAW, drawFraction(world.draw))
    const result = computeTrajectory(getMuzzleOrigin(), world.aimDir, fraction, world.hittable, world.ground)

    updateGeometry(line, result.points)
    line.visible = true

    if (result.terminalPoint && result.terminalNormal) {
      updateMarkerTransform(marker, result.terminalPoint, result.terminalNormal)
      marker.visible = true
    } else {
      marker.visible = false
    }

    updateMaterials(
      result.isTarget,
      line.material as LineBasicMaterial,
      ringRef.current?.material as MeshBasicMaterial,
      dotRef.current?.material as MeshBasicMaterial,
    )
    worldStore.getState().setAimState(true, result.isTarget, drawFraction(world.draw))
  })
}

export function TrajectoryArc() {
  const lineRef = useRef<Line>(null)
  const markerRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const dotRef = useRef<Mesh>(null)

  const lineInstance = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(MAX_POINTS * 3), 3))
    const mat = new LineBasicMaterial({ color: COLOR_DEFAULT, transparent: true, opacity: 0.75, linewidth: 2 })
    const line = new Line(geo, mat)
    line.visible = false
    return line
  }, [])

  useEffect(() => {
    return () => {
      lineInstance.geometry.dispose()
      ;(lineInstance.material as LineBasicMaterial).dispose()
      worldStore.getState().setAimState(false, false, 0)
    }
  }, [lineInstance])

  useTrajectoryUpdate(lineRef, markerRef, ringRef, dotRef)

  return (
    <group name="trajectory-preview">
      <primitive object={lineInstance} ref={lineRef} />
      <group ref={markerRef} name="landing-marker" visible={false}>
        <mesh ref={ringRef}>
          <ringGeometry args={[0.22, 0.35, 32]} />
          <meshBasicMaterial color={COLOR_DEFAULT} side={DoubleSide} transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh ref={dotRef}>
          <circleGeometry args={[0.07, 16]} />
          <meshBasicMaterial color={COLOR_DEFAULT} side={DoubleSide} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
