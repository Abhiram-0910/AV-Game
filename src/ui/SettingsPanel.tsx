// Quality tier override, volume, subtitles. Reused from the title screen and the pause menu.
// The quality tier is applied on the next load (resolveTier runs once at boot) — changing it
// here only sets the saved preference, it doesn't hot-swap the live asset tier mid-session.
import type { QualityTier, Settings } from '@core/save'
import { UI } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { platform } from '@platform/index'
import { useGame } from './use-game'

const TIERS: readonly QualityTier[] = ['auto', 'low', 'high']

function QualityRow({ current }: { current: QualityTier }) {
  return (
    <div className="settings-row">
      <span className="hud-label">{UI['settings.quality']}</span>
      <div className="settings-options">
        {TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            className="btn btn-choice"
            aria-pressed={current === tier}
            data-testid={`settings-quality-${tier}`}
            onClick={() => gameStore.getState().setSettings({ qualityTier: tier })}
          >
            {UI[`settings.quality.${tier}`]}
          </button>
        ))}
      </div>
    </div>
  )
}

function VolumeRow({ volume }: { volume: number }) {
  return (
    <div className="settings-row">
      <label className="hud-label" htmlFor="settings-volume">
        {UI['settings.volume']}
      </label>
      <input
        id="settings-volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        data-testid="settings-volume"
        onChange={(e) => {
          const next = Number(e.target.value)
          gameStore.getState().setSettings({ volume: next })
          platform.audio.setMasterVolume(next)
        }}
      />
    </div>
  )
}

function SubtitlesRow({ subtitles }: { subtitles: boolean }) {
  return (
    <div className="settings-row">
      <label className="hud-label" htmlFor="settings-subtitles">
        {UI['settings.subtitles']}
      </label>
      <input
        id="settings-subtitles"
        type="checkbox"
        checked={subtitles}
        data-testid="settings-subtitles"
        onChange={(e) => gameStore.getState().setSettings({ subtitles: e.target.checked })}
      />
    </div>
  )
}

export function SettingsPanel({ onBack }: { onBack: () => void }) {
  const settings: Settings = useGame((s) => s.settings)
  return (
    <div className="settings" data-testid="settings">
      <h2>{UI['menu.settings']}</h2>
      <QualityRow current={settings.qualityTier} />
      <VolumeRow volume={settings.volume} />
      <SubtitlesRow subtitles={settings.subtitles} />
      <button type="button" className="btn" data-testid="settings-back" onClick={onBack}>
        {UI['settings.back']}
      </button>
    </div>
  )
}
