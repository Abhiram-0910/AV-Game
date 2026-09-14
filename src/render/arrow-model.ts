// arrow.glb stands upright: its node rotation (−90° about X) turns the mesh's head, at local −Z, to −Y. The pool
// used to yaw and pitch that upright model with Euler angles as if it lay along +Z, so every arrow flew standing up
// (and XYZ order pitched about world X once yawed). Wrap the model so the head points +Z, then turn the wrapper
// onto the velocity with one quaternion.
import { Group, type Object3D, Vector3 } from 'three'

const FORWARD = new Vector3(0, 0, 1)
const velocity = new Vector3()

export function wrapArrowModel(model: Object3D): Group {
  model.rotation.x = -Math.PI / 2
  const holder = new Group()
  holder.add(model)
  return holder
}

export function orientArrow(holder: Object3D, vx: number, vy: number, vz: number): void {
  velocity.set(vx, vy, vz)
  if (velocity.lengthSq() > 1e-12) holder.quaternion.setFromUnitVectors(FORWARD, velocity.normalize())
}
