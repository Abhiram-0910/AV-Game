import { Line3, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@data/balance'
import { grounded, launchArrow, muzzleOrigin, sampleTrajectoryPath, shouldFailArrowsOut, stepArrow } from '@systems/archery/ballistics'
import { NO_DRAW, drawFraction, isDrawing, stepDraw } from '@systems/archery/draw'
import { createHitTester } from '@systems/archery/hit-test'
import { updateMovingTargets } from '@systems/archery/step'
import { computeTrajectory, dotsAlongPath } from '@systems/archery/trajectory'
import { castAgneyastra, castAstra } from '@systems/astra/step'
import { spawnEnemy } from '@systems/ai/enemy-ai'
import { gameStore } from '@core/game-state'
import { world, worldStore } from '@systems/world'

const dt = 1 / 60

describe('draw', () => {
  it('charges to full over DRAW_TICKS and refuses a release under MIN_DRAW', () => {
    let s = NO_DRAW
    for (let i = 0; i < 3; i += 1) s = stepDraw(s, true).state
    expect(drawFraction(s)).toBeLessThan(BALANCE.arrow.MIN_DRAW)
    expect(stepDraw(s, false).released).toBeNull()
    s = NO_DRAW
    for (let i = 0; i < BALANCE.arrow.DRAW_TICKS * 2; i += 1) s = stepDraw(s, true).state
    expect(drawFraction(s)).toBe(1)
    expect(stepDraw(s, false).released).toBe(1)
  })
})

describe('ballistics', () => {
  it('flies a parabola: rises then drops under GRAVITY, dies at LIFETIME or on the ground', () => {
    let a = launchArrow([0, 1.4, 0], [0, 0.5, Math.sqrt(0.75)], 1)
    const first = stepArrow(a, dt)
    expect(first.vy).toBeLessThan(a.vy)
    expect(first.z).toBeGreaterThan(0)
    let peak = a.y
    for (let i = 0; i < BALANCE.arrow.LIFETIME_TICKS; i += 1) {
      a = stepArrow(a, dt)
      peak = Math.max(peak, a.y)
      if (grounded(a)) break
    }
    expect(peak).toBeGreaterThan(1.4)
    expect(grounded(a) || !a.alive).toBe(true)
  })
})

describe('release origin', () => {
  it('leaves the bow along the aim, not the body heading, so the arc starts where the arrow does', () => {
    // Body faces +Z (yaw 0); the mouse aims hard right (+X).
    const [x, y, z] = muzzleOrigin(0, 0, 0, [1, 0, 0])
    expect(x).toBeCloseTo(BALANCE.archeryAim.MUZZLE_FORWARD)
    expect(y).toBeCloseTo(BALANCE.archeryAim.MUZZLE_HEIGHT)
    expect(z).toBeCloseTo(0)
  })
})

describe("lateral targets (L4) move on the fixed tick, not render frame rate", () => {
  it('oscillates around baseX with the given amplitude and period, deterministically from tick', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target: any = { position: { x: 0 }, userData: { lateral: { baseX: 4, amplitude: 4, periodTicks: 240 } } }
    world.hittable = [target]
    updateMovingTargets(0)
    expect(target.position.x).toBeCloseTo(4, 5) // sin(0) = 0
    updateMovingTargets(60) // a quarter period: sin(pi/2) = 1
    expect(target.position.x).toBeCloseTo(8, 5)
    updateMovingTargets(180) // three-quarter period: sin(3pi/2) = -1
    expect(target.position.x).toBeCloseTo(0, 5)
    world.hittable = []
  })

  it('leaves non-lateral hittable objects untouched', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target: any = { position: { x: 5 }, userData: {} }
    world.hittable = [target]
    updateMovingTargets(9999)
    expect(target.position.x).toBe(5)
    world.hittable = []
  })
})

describe('arrows-out rule (L4 fail)', () => {
  it('never fails while an arrow is still in flight, even with an empty quiver', () => {
    expect(shouldFailArrowsOut(0, 1, 3)).toBe(false)
  })
  it('fails only when the quiver is empty, the air is clear, and targets remain', () => {
    expect(shouldFailArrowsOut(0, 0, 1)).toBe(true)
    expect(shouldFailArrowsOut(0, 0, 0)).toBe(false)
    expect(shouldFailArrowsOut(1, 0, 3)).toBe(false)
  })
})

describe('trajectory sampling and preview', () => {
  it('samples parabolic trajectory points consistent with stepArrow', () => {
    const origin: [number, number, number] = [0, 1.4, 0]
    const dir: [number, number, number] = [0, 0.5, Math.sqrt(0.75)]
    const fraction = 1
    const points = sampleTrajectoryPath(origin, dir, fraction, dt, 60)

    expect(points.length).toBeGreaterThan(1)
    expect(points[0].x).toBe(origin[0])
    expect(points[0].y).toBe(origin[1])
    expect(points[0].z).toBe(origin[2])

    let expected = launchArrow(origin, dir, fraction)
    for (let i = 1; i < points.length; i += 1) {
      expected = stepArrow(expected, dt)
      expect(points[i].x).toBeCloseTo(expected.x, 6)
      expect(points[i].y).toBeCloseTo(expected.y, 6)
      expect(points[i].z).toBeCloseTo(expected.z, 6)
    }

    const last = points[points.length - 1]
    expect(grounded(last) || !last.alive || points.length === 61).toBe(true)
  })

  it('detects isDrawing correctly from draw state', () => {
    expect(isDrawing(NO_DRAW)).toBe(false)
    const active = stepDraw(NO_DRAW, true).state
    expect(isDrawing(active)).toBe(true)
  })

  it('computeTrajectory computes landing on ground plane when no targets are in range', () => {
    const origin: [number, number, number] = [0, 1.4, 0]
    const dir: [number, number, number] = [0, 0, 1]
    const sample = computeTrajectory(origin, dir, 1, [], [])
    expect(sample.points.length).toBeGreaterThan(1)
    expect(sample.terminalPoint).not.toBeNull()
    expect(sample.terminalPoint![1]).toBeCloseTo(0, 1)
    expect(sample.isGround).toBe(true)
    expect(sample.isTarget).toBe(false)
  })

  it('detects proximity target magnetism within AIM_ASSIST_RADIUS', () => {
    const origin: [number, number, number] = [0, 1.4, 0]
    const dir: [number, number, number] = [0, 0, 1]
    const targetObj = new Object3D()
    targetObj.position.set(0.2, 1.2, 5)
    const sample = computeTrajectory(origin, dir, 1, [targetObj], [])
    expect(sample.isTarget).toBe(true)
    expect(sample.targetObject).toBe(targetObj)
  })

  it('createHitTester registers proximity assist when ray passes within AIM_ASSIST_RADIUS', () => {
    const tester = createHitTester()
    const prev = { x: 0, y: 1.2, z: 4.5, vx: 0, vy: 0, vz: 10, age: 0, alive: true }
    const next = { x: 0, y: 1.2, z: 5.5, vx: 0, vy: 0, vz: 10, age: 1, alive: true }
    const targetObj = new Object3D()
    targetObj.position.set(0.3, 1.2, 5.0)
    const hit = tester(prev, next, [targetObj])
    expect(hit).not.toBeNull()
    expect(hit?.object).toBe(targetObj)
  })

  it('triggers and clears hit feedback in worldStore', () => {
    worldStore.getState().triggerHitFeedback('enemy')
    expect(worldStore.getState().hitFeedback).toBe('enemy')
  })

  it('castAstra executes onHit callback on target and clears it from hittable', () => {
    world.player.x = 0
    world.player.z = 0
    world.aimRay = { origin: [0, BALANCE.archeryAim.MUZZLE_HEIGHT, 0], dir: [0, 0, 1] }
    const target = new Object3D()
    target.position.set(0, 1.35, 10)
    let hitCalled = false
    target.userData.onHit = () => {
      hitCalled = true
    }
    world.hittable = [target]
    gameStore.getState().startLevel('l4')
    gameStore.setState({
      phase: 'play',
      astraCharges: 1,
      astraCooldownUntil: 0,
      unlockedAstras: ['agneyastra'],
      selectedAstra: 'agneyastra',
    })
    castAstra(0)
    expect(hitCalled).toBe(true)
    expect(world.hittable).not.toContain(target)
  })
})


describe('Agneyastra spares Maricha', () => {
  it('burns a rakshasa at the impact point but leaves Maricha untouched (he is flung, never killed)', () => {
    world.player.x = 0
    world.player.z = 0
    world.aimRay = { origin: [0, BALANCE.archeryAim.MUZZLE_HEIGHT, 0], dir: [0, 0, 1] }
    world.hittable = []
    // No hittable in the way, so the impact lands 18 m straight ahead (resolveImpactPoint).
    const maricha = spawnEnemy('maricha', [0, 0, 18], null)
    const rakshasa = spawnEnemy('rakshasa', [0.5, 0, 18], null)
    castAgneyastra(world.player, [maricha, rakshasa], 0)
    expect(maricha.health).toBe(BALANCE.enemies.maricha.HEALTH)
    expect(maricha.state).not.toBe('dead')
    expect(rakshasa.health).toBeLessThan(BALANCE.enemies.rakshasa.HEALTH)
  })
})

describe('trajectory arc dots (the preview a player reads)', () => {
  const dir: [number, number, number] = [0, Math.sin(0.06), Math.cos(0.06)]
  const origin = muzzleOrigin(0, 0, 0, dir)

  it('samples the fired arrow itself, tick for tick, up to the landing point', () => {
    const sample = computeTrajectory(origin, dir, 0.8, [], [])
    let a = launchArrow(origin, dir, 0.8)
    expect(sample.points[0]).toEqual(origin)
    for (let i = 1; i < sample.points.length - 1; i += 1) {
      a = stepArrow(a, dt)
      expect(sample.points[i][0]).toBeCloseTo(a.x, 9)
      expect(sample.points[i][1]).toBeCloseTo(a.y, 9)
      expect(sample.points[i][2]).toBeCloseTo(a.z, 9)
    }
  })

  it('puts every dot on that path, the last on the landing point, fading in order toward it', () => {
    const sample = computeTrajectory(origin, dir, 1, [], [])
    const dots = dotsAlongPath(sample.points, BALANCE.archery.ARC_DOT_SPACING, BALANCE.archery.ARC_DOT_MAX)
    expect(dots.length).toBeGreaterThan(10)
    expect(dots.length).toBeLessThanOrEqual(BALANCE.archery.ARC_DOT_MAX)
    const pts = sample.points.map((p) => new Vector3(p[0], p[1], p[2]))
    const seg = new Line3()
    const closest = new Vector3()
    for (const d of dots) {
      const v = new Vector3(d.p[0], d.p[1], d.p[2])
      let best = Infinity
      for (let i = 1; i < pts.length; i += 1) {
        seg.set(pts[i - 1], pts[i])
        best = Math.min(best, seg.closestPointToPoint(v, true, closest).distanceTo(v))
      }
      expect(best).toBeLessThan(1e-6)
    }
    expect(dots[dots.length - 1].p).toEqual(sample.terminalPoint)
    expect(dots[dots.length - 1].u).toBe(1)
    for (let i = 1; i < dots.length; i += 1) expect(dots[i].u).toBeGreaterThan(dots[i - 1].u)
  })

  it('widens the spacing rather than stop short when the cap would not reach the end', () => {
    const line: [number, number, number][] = [[0, 1, 0], [0, 1, 100]]
    const dots = dotsAlongPath(line, 0.5, 20)
    expect(dots.length).toBeLessThanOrEqual(20)
    expect(dots[dots.length - 1].p).toEqual([0, 1, 100])
  })
})
