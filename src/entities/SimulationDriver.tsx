// The one useFrame that advances the fixed 60 Hz loop. Everything gameplay happens in step();
// entities only read world.* and interpolate with world.alpha.
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { BALANCE } from '@data/balance'
import { gameStore } from '@core/game-state'
import { currentObjectiveIndex } from '@core/objectives'
import { levelDef } from '@core/progression'
import { stepEnemy } from '@systems/ai/enemy-ai'
import { stepAstra } from '@systems/astra/step'
import { checkMeleeHit, swordTargetInReach } from '@systems/combat-rules'
import { createFixedLoop } from '@systems/loop/fixed-loop'
import { IDLE_INPUT, type MoveInput, stepLocomotion, turnToward } from '@systems/locomotion/kinematic'
import { createGroundProbe } from '@systems/locomotion/ground'
import { nearestPickupIndex, reachedWaypoint, type TalkTarget, talkTarget } from '@systems/interaction/interact'
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
  return { forward, turn, run: input.isDown('ShiftLeft') || input.isDown('ShiftRight'), yaw: takeLookYaw() }
}

/** The mouse-look turn gathered since the last tick; the first tick of a frame takes all of it. */
function takeLookYaw(): number {
  const yaw = world.lookYaw
  world.lookYaw = 0
  return yaw
}

/** `bow`: the level arms Rama, so the sword prompt can show when a foe or the straw man is in reach. */
function stepInteraction(bow: boolean): void {
  const s = gameStore.getState()
  const def = levelDef(s.level)
  const i = currentObjectiveIndex(s.objectives)
  const current = def.objectives[i]
  const { x, z } = world.player
  if (current?.kind === 'reach' && reachedWaypoint(x, z, def.waypoints[current.waypoint])) {
    s.progress({ kind: 'reach', waypoint: current.waypoint })
  }
  const talk = talkTarget(def.objectives, gameStore.getState().objectives, world.npcs, x, z)
  if (talk) {
    worldStore.getState().setPrompt(talk.npc.id)
    if (platform.input.pressed(KEY_E)) openTalk(def, talk)
    return
  }
  const pickup = nearestPickupIndex(world.arrowPickups, x, z)
  worldStore.getState().setPrompt(pickup >= 0 ? 'pickup' : bow && swordTargetInReach(world.player) ? 'strike' : null)
  if (pickup >= 0 && platform.input.pressed(KEY_E)) {
    world.arrowPickups.splice(pickup, 1)
    s.pickupArrows()
  }
}

/** Walking up to the next speaker counts as arriving: complete the reach objectives before the talk, then open it. */
function openTalk(def: ReturnType<typeof levelDef>, talk: TalkTarget): void {
  def.objectives.slice(0, talk.index).forEach((o, k) => {
    if (o.kind === 'reach' && !gameStore.getState().objectives[k].done) gameStore.getState().progress({ kind: 'reach', waypoint: o.waypoint })
  })
  world.talkWith = talk.npc
  worldStore.getState().openDialogue(talk.dialogueKey as never)
}

/** While a talk is open Rama turns to the speaker and the speaker to him; every other standing NPC eases back to its
 * authored facing. Seated NPCs stay put. */
function stepFacing(dt: number): void {
  const step = BALANCE.player.TURN_SPEED_RAD * dt
  const p = world.player
  const partner = world.talkWith
  if (partner) p.yaw = turnToward(p.yaw, Math.atan2(partner.x - p.x, partner.z - p.z), step)
  for (const n of world.npcs) {
    if (!n.seated) n.yaw = turnToward(n.yaw, n === partner ? Math.atan2(p.x - n.x, p.z - n.z) : n.homeYaw, step)
  }
}

/** F or the right button: a slash that strikes every enemy and straw man in reach (systems/combat-rules.ts). */
function stepSword(tick: number): void {
  const slash = platform.input.pressed(KEY_SWORD) || platform.input.pressed('MouseRight')
  if (slash && tick >= world.swordSlashUntilTick) {
    world.swordSlashUntilTick = tick + BALANCE.melee.SLASH_TICKS
    checkMeleeHit(world.player, world.enemies, tick)
  }
}

function stepAstraSwitch(): void {
  if (platform.input.pressed('Digit1')) gameStore.getState().selectAstra('agneyastra')
  if (platform.input.pressed('Digit2')) gameStore.getState().selectAstra('manavastra')
}

function stepAstraCombat(tick: number): void {
  stepAstraSwitch()
  const astraHeld =
    platform.input.isDown(KEY_ASTRA) ||
    platform.input.isDown('Space') ||
    world.astraButtonHeld ||
    (world.astraReady && platform.input.isDown(KEY_E) && worldStore.getState().prompt === null)
  stepAstra(astraHeld, tick)
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

  useFrame((_, delta) => {
    const { phase, level } = gameStore.getState()
    const { dialogue, paused } = worldStore.getState()
    const talking = dialogue !== null
    if (!talking) world.talkWith = null
    const def = levelDef(level)
    const bounds = def.id
    const altar = def.waypoints.altar
    const objective = altar ? { x: altar[0], z: altar[2] } : undefined
    world.alpha = loop.advance(delta, (tick) => {
      world.tick = tick
      if (phase === 'play' && !talking && !paused) {
        const query = { bounds: sceneBounds(bounds), obstacles: world.npcs.map((n) => ({ x: n.x, z: n.z, radius: BALANCE.locomotion.NPC_RADIUS })), groundY }
        world.player = stepLocomotion(world.player, readMove(), loop.dt, query)
        stepInteraction(bow)
        stepEnemies(tick, loop.dt, objective)
        gameStore.getState().regenHealth(tick)
        onTick?.(tick)
        if (bow) {
          stepArchery(loop.dt)
          stepSword(tick)
          stepAstraCombat(tick)
        }
      } else {
        takeLookYaw()
        world.player = stepLocomotion(world.player, IDLE_INPUT, loop.dt, { bounds: sceneBounds(bounds), obstacles: [], groundY })
      }
      stepFacing(loop.dt)
      platform.input.endTick()
    })
  }, -1)
  return null
}

function sceneBounds(level: ReturnType<typeof levelDef>['id']) {
  return world.bounds[level] ?? world.bounds.l1
}
