// The one useFrame that advances the fixed 60 Hz loop. Everything gameplay happens in step();
// entities only read world.* and interpolate with world.alpha.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { currentObjectiveIndex } from '@core/objectives'
import { levelDef } from '@core/progression'
import { stepEnemy } from '@systems/ai/enemy-ai'
import { stepAstra } from '@systems/astra/step'
import { createFixedLoop } from '@systems/loop/fixed-loop'
import { IDLE_INPUT, type MoveInput, stepLocomotion } from '@systems/locomotion/kinematic'
import { createGroundProbe } from '@systems/locomotion/ground'
import { nearestPickupIndex, reachedWaypoint, talkTarget } from '@systems/interaction/interact'
import { stepArchery } from '@systems/archery/step'
import { world, worldStore } from '@systems/world'
import { platform } from '@platform/index'

const KEY_E = 'KeyE'
const KEY_SWORD = 'KeyF'
const KEY_ASTRA = 'KeyQ'

function readMove(): MoveInput {
  const { input } = platform
  const forward = input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : input.isDown('KeyS') || input.isDown('ArrowDown') ? -1 : 0
  const turn = input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : input.isDown('KeyD') || input.isDown('ArrowRight') ? -1 : 0
  return { forward, turn, run: input.isDown('ShiftLeft') || input.isDown('ShiftRight') }
}

function stepInteraction(): void {
  const s = gameStore.getState()
  const def = levelDef(s.level)
  const i = currentObjectiveIndex(s.objectives)
  const current = def.objectives[i]
  const { x, z } = world.player
  if (current?.kind === 'reach' && reachedWaypoint(x, z, def.waypoints[current.waypoint])) {
    s.progress({ kind: 'reach', waypoint: current.waypoint })
  }
  const npc = talkTarget(current, world.npcs, x, z)
  if (npc) {
    worldStore.getState().setPrompt(npc.id)
    if (current?.kind === 'talk' && platform.input.pressed(KEY_E)) {
      worldStore.getState().openDialogue(current.dialogueKey as never)
    }
    return
  }
  const pickup = nearestPickupIndex(world.arrowPickups, x, z)
  worldStore.getState().setPrompt(pickup >= 0 ? 'pickup' : null)
  if (pickup >= 0 && platform.input.pressed(KEY_E)) {
    world.arrowPickups.splice(pickup, 1)
    s.pickupArrows()
  }
}

/** Cosmetic secondary action — no target, no damage; the sword doesn't fight until Level 3. */
function stepSword(tick: number): void {
  if (platform.input.pressed(KEY_SWORD) && tick >= world.swordSlashUntilTick) {
    world.swordSlashUntilTick = tick + BALANCE.melee.SLASH_TICKS
  }
}

/** `objective` is Level 5's altar — "rakshasas go for the altar, not for you" (AGENTS.md).
 * Every other level has none, so enemies fall back to the plain player-chase from Phase D. */
function stepEnemies(tick: number, dt: number, objective?: { x: number; z: number }): void {
  for (const e of world.enemies) {
    stepEnemy(e, world.player, tick, dt, objective)
    const stats = BALANCE.enemies[e.kind]
    if (e.didAttack) gameStore.getState().damagePlayer(stats.DAMAGE, tick)
    if (e.attackedObjective) gameStore.getState().damageYajna(stats.YAJNA_DAMAGE, tick)
  }
}

export function SimulationDriver({ bow, onTick }: { bow: boolean; onTick?: (tick: number) => void }) {
  const loop = useMemo(() => createFixedLoop(), [])
  const groundY = useMemo(() => createGroundProbe(() => world.ground), [])
  useEffect(() => () => loop.reset(), [loop])

  useFrame((_, delta) => {
    const { phase, level } = gameStore.getState()
    const { dialogue, paused } = worldStore.getState()
    const talking = dialogue !== null
    const def = levelDef(level)
    const bounds = def.id
    const altar = def.waypoints.altar
    const objective = altar ? { x: altar[0], z: altar[2] } : undefined
    world.alpha = loop.advance(delta, (tick) => {
      world.tick = tick
      if (phase === 'play' && !talking && !paused) {
        const query = { bounds: sceneBounds(bounds), obstacles: world.npcs.map((n) => ({ x: n.x, z: n.z, radius: BALANCE.locomotion.NPC_RADIUS })), groundY }
        world.player = stepLocomotion(world.player, readMove(), loop.dt, query)
        stepInteraction()
        stepEnemies(tick, loop.dt, objective)
        onTick?.(tick)
        if (bow) {
          stepArchery(loop.dt)
          stepSword(tick)
          const astraHeld =
            platform.input.isDown(KEY_ASTRA) ||
            platform.input.isDown('Space') ||
            world.astraButtonHeld ||
            (world.astraReady && platform.input.isDown(KEY_E) && worldStore.getState().prompt === null)
          stepAstra(astraHeld, tick)
        }
      } else {
        world.player = stepLocomotion(world.player, IDLE_INPUT, loop.dt, { bounds: sceneBounds(bounds), obstacles: [], groundY })
      }
      platform.input.endTick()
    })
  }, -1)
  return null
}

function sceneBounds(level: ReturnType<typeof levelDef>['id']) {
  return world.bounds[level] ?? world.bounds.l1
}
