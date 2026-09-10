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
import { reachedWaypoint, talkTarget } from '@systems/interaction/interact'
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
  worldStore.getState().setPrompt(npc?.id ?? null)
  if (npc && current?.kind === 'talk' && platform.input.pressed(KEY_E)) {
    worldStore.getState().openDialogue(current.dialogueKey as never)
  }
}

/** Cosmetic secondary action — no target, no damage; the sword doesn't fight until Level 3. */
function stepSword(tick: number): void {
  if (platform.input.pressed(KEY_SWORD) && tick >= world.swordSlashUntilTick) {
    world.swordSlashUntilTick = tick + BALANCE.melee.SLASH_TICKS
  }
}

function stepEnemies(tick: number, dt: number): void {
  for (const e of world.enemies) {
    stepEnemy(e, world.player, tick, dt)
    if (e.didAttack) gameStore.getState().damagePlayer(BALANCE.enemies[e.kind].DAMAGE, tick)
  }
}

export function SimulationDriver({ bow }: { bow: boolean }) {
  const loop = useMemo(() => createFixedLoop(), [])
  const groundY = useMemo(() => createGroundProbe(() => world.ground), [])
  useEffect(() => () => loop.reset(), [loop])

  useFrame((_, delta) => {
    const { phase, level } = gameStore.getState()
    const talking = worldStore.getState().dialogue !== null
    const bounds = levelDef(level).id
    world.alpha = loop.advance(delta, (tick) => {
      world.tick = tick
      if (phase === 'play' && !talking) {
        const query = { bounds: sceneBounds(bounds), obstacles: world.npcs.map((n) => ({ x: n.x, z: n.z, radius: BALANCE.locomotion.NPC_RADIUS })), groundY }
        world.player = stepLocomotion(world.player, readMove(), loop.dt, query)
        stepInteraction()
        stepEnemies(tick, loop.dt)
        if (bow) {
          stepArchery(loop.dt)
          stepSword(tick)
          stepAstra(platform.input.isDown(KEY_ASTRA), tick)
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
