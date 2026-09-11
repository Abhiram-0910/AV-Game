// Prominent enemy / boss health bar overlay for Tataka, Subahu, and Maricha.
import { useEffect, useRef, useState } from 'react'
import { UI } from '@data/dialogue'
import type { BossHealth } from '@systems/world'
import { useWorld } from './use-game'

export function EnemyHealthBar({ customBoss }: { customBoss?: BossHealth | null }) {
  const storeBoss = useWorld((s) => s.boss)
  const boss = customBoss ?? storeBoss
  const [isHit, setIsHit] = useState(false)
  const prevHealthRef = useRef<number | null>(null)

  useEffect(() => {
    if (!boss) {
      prevHealthRef.current = null
      return
    }
    if (prevHealthRef.current !== null && boss.health < prevHealthRef.current) {
      setIsHit(true)
      const timer = setTimeout(() => setIsHit(false), 280)
      prevHealthRef.current = boss.health
      return () => clearTimeout(timer)
    }
    prevHealthRef.current = boss.health
  }, [boss?.health, boss])

  if (!boss || boss.health <= 0) return null

  const pct = Math.max(0, Math.min(100, (boss.health / boss.max) * 100))
  const isCritical = pct < 25

  return (
    <div
      className={`hud-boss enemy-health-bar ${isHit ? 'enemy-health-bar--damaged' : ''}`}
      data-testid="hud-boss"
      data-boss={boss.kind}
      data-critical={isCritical}
    >
      <div className="enemy-health-header">
        <span className="hud-label enemy-health-name">{UI[`name.${boss.kind}`]}</span>
        <span className="enemy-health-numeric">
          {boss.health} / {boss.max}
        </span>
      </div>
      <div className="bar enemy-health-track" role="meter" aria-valuenow={boss.health} aria-valuemin={0} aria-valuemax={boss.max}>
        <div
          className={`bar-fill enemy-health-fill ${isCritical ? 'enemy-health-fill--critical' : ''} ${isHit ? 'enemy-health-fill--flash' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
