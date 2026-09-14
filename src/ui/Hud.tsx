// Health, arrows, astra, current objective, and the talk prompt. Strings from UI only.
import { BALANCE } from '@data/balance'
import { UI } from '@data/dialogue'
import type { Objective } from '@data/levels'
import { currentObjectiveIndex, type ObjectiveProgress } from '@core/objectives'
import { levelDef } from '@core/progression'
import { fmt } from './format'
import { useGame, useWorld } from './use-game'
import { EnemyHealthBar } from './EnemyHealthBar'
import { Crosshair } from './Crosshair'
import { AstraButton } from './AstraButton'
import { WaypointIndicator } from './WaypointIndicator'
import { Frame } from './Frame'

function objectiveText(o: Objective | undefined, p: ObjectiveProgress | undefined): string {
  if (!o || !p) return ''
  switch (o.kind) {
    case 'reach':
      return UI['objective.reach']
    case 'talk':
      return fmt(UI['objective.talk'], { npc: UI[`name.${o.npc}`] })
    case 'hitTargets':
      return fmt(UI['objective.hitTargets'], { done: p.progress, total: o.count })
    case 'chargeAstra':
      return UI['objective.chargeAstra']
    case 'defeat':
      return fmt(UI['objective.defeat'], { enemy: UI[`name.${o.enemy}`] })
    case 'survive':
      return UI['objective.survive']
  }
}

function secondsLeft(o: Objective | undefined, p: ObjectiveProgress | undefined): number | null {
  if (o?.kind !== 'survive' || !p || p.done) return null
  return Math.ceil((o.ticks - p.progress) / BALANCE.loop.HZ)
}

function TopStats({ bow, guardsYajna, health, arrows, astra, yajnaIntegrity }: { bow: boolean; guardsYajna: boolean; health: number; arrows: number; astra: number; yajnaIntegrity: number }) {
  return (
    <div className="hud-top">
      <div className="hud-stat">
        <span className="hud-label">{UI['hud.health']}</span>
        <div className="bar" role="meter" aria-valuenow={health} aria-valuemin={0} aria-valuemax={BALANCE.player.MAX_HEALTH}>
          <div className="bar-fill" style={{ width: `${(health / BALANCE.player.MAX_HEALTH) * 100}%` }} />
        </div>
      </div>
      {bow && (
        <div className="hud-stat">
          <span className="hud-label">{UI['hud.arrows']}</span>
          <b data-testid="hud-arrows">{arrows}</b>
        </div>
      )}
      {bow && (
        <div className="hud-stat">
          <span className="hud-label">{UI['hud.astra']}</span>
          <b>{astra}</b>
        </div>
      )}
      {guardsYajna && (
        <div className="hud-stat">
          <span className="hud-label">{UI['hud.yajna']}</span>
          <div className="bar" role="meter" aria-valuenow={yajnaIntegrity} aria-valuemin={0} aria-valuemax={BALANCE.yajna.MAX_INTEGRITY} data-testid="hud-yajna">
            <div className="bar-fill" style={{ width: `${(yajnaIntegrity / BALANCE.yajna.MAX_INTEGRITY) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function ObjectiveRow({ text, timeLeft, astraReady }: { text: string; timeLeft: number | null; astraReady?: boolean }) {
  const displayText = astraReady && text ? `${text} · ${UI['objective.chargeAstra']}` : text
  return (
    <div className="hud-objective" data-testid="hud-objective">
      <Frame kind="card" />
      <span className="hud-label">{UI['hud.objective']}</span> {displayText}
      {timeLeft !== null && (
        <span className="hud-timeleft" data-testid="hud-timeleft">
          {' · '}
          {UI['hud.timeLeft']}: {timeLeft}s
        </span>
      )}
    </div>
  )
}

export function Hud({ bow }: { bow: boolean }) {
  const health = useGame((s) => s.health)
  const arrows = useGame((s) => s.arrows)
  const astra = useGame((s) => s.astraCharges)
  const level = useGame((s) => s.level)
  const yajnaIntegrity = useGame((s) => s.yajnaIntegrity)
  const progress = useGame((s) => s.objectives)
  const prompt = useWorld((s) => s.prompt)
  const astraReady = useWorld((s) => s.astraReady)
  const i = currentObjectiveIndex(progress)
  const def = levelDef(level)
  const objective = objectiveText(def.objectives[i], progress[i])
  const guardsYajna = def.fail.includes('yajnaZero')
  const timeLeft = secondsLeft(def.objectives[i], progress[i])
  const controlsText =
    bow && astraReady
      ? `${UI['hud.bowControls']} · [Space/Q] ${UI['hud.astra']}`
      : bow
        ? UI['hud.bowControls']
        : UI['hud.controls']

  return (
    <div className="hud" data-testid="hud">
      <TopStats bow={bow} guardsYajna={guardsYajna} health={health} arrows={arrows} astra={astra} yajnaIntegrity={yajnaIntegrity} />
      <EnemyHealthBar />
      <AstraButton />
      <ObjectiveRow text={objective} timeLeft={timeLeft} astraReady={level === 'l4' && astraReady} />
      {prompt && (
        <div className="hud-prompt" data-testid="hud-prompt">
          {prompt === 'pickup' ? UI['hud.pickup'] : UI['hud.interact']}
        </div>
      )}
      <WaypointIndicator />
      {bow && <Crosshair />}
      <div className="hud-controls">{controlsText}</div>
    </div>
  )
}
