// Quality tier override, volume, subtitles. Reused from the title screen and the pause menu.
// The quality tier is applied on the next load (resolveTier runs once at boot) — changing it
// here sets the saved preference; the note under it says what is running now and offers a restart.
import type { QualityTier, Settings } from '@core/save'
import { BALANCE } from '@data/balance'
import { CONTROLS_TEXT as T, type ControlsTextKey } from '@data/controls-text'
import { UI } from '@data/dialogue'
import { gameStore } from '@core/game-state'
import { platform } from '@platform/index'
import { useStore } from 'zustand'
import { screenStore } from './screen-store'
import { useGame } from './use-game'
import { Panel } from './Frame'

const TIERS: readonly QualityTier[] = ['auto', 'low', 'high']

/** Which tier this boot runs and why; a changed choice only takes effect after a restart. */
function ActiveTierNote({ current }: { current: QualityTier }) {
  const active = useStore(screenStore, (s) => s.activeTier)
  if (!active) return null
  const pending = current !== 'auto' && current !== active.tier
  return (
    <p className="hud-label" data-testid="settings-active-tier">
      {UI['settings.active']}: {UI[`settings.quality.${active.tier}`]} · {UI[`tier.reason.${active.reason}` as keyof typeof UI]}
      {pending && (
        <button type="button" className="btn btn-choice" data-testid="settings-restart" onClick={() => window.location.reload()}>
          {UI['settings.restart']}
        </button>
      )}
      {active.reason === 'weakGpu' && <small data-testid="settings-gpu-hint">{UI['tier.hint.weakGpu']}</small>}
    </p>
  )
}

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

function ChoiceRow<K extends keyof Settings>({ field, label, options }: { field: K; label: ControlsTextKey; options: readonly Settings[K][] }) {
  const current = useGame((s) => s.settings[field])
  return (
    <div className="settings-row">
      <span className="hud-label">{T[label]}</span>
      <div className="settings-options">
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            className="btn btn-choice"
            aria-pressed={current === o}
            data-testid={`settings-${field}-${String(o)}`}
            onClick={() => gameStore.getState().setSettings({ [field]: o } as Partial<Settings>)}
          >
            {T[`${label}.${String(o)}` as ControlsTextKey]}
          </button>
        ))}
      </div>
    </div>
  )
}

function SensitivityRow({ field }: { field: 'mouseSensitivity' | 'trackpadSensitivity' }) {
  const value = useGame((s) => s.settings[field])
  return (
    <div className="settings-row">
      <label className="hud-label" htmlFor={`settings-${field}`}>
        {T[`settings.${field}`]}
      </label>
      <input
        id={`settings-${field}`}
        type="range"
        min={BALANCE.mouseLook.SENS_MIN}
        max={BALANCE.mouseLook.SENS_MAX}
        step={0.05}
        value={value}
        data-testid={`settings-${field}`}
        onChange={(e) => gameStore.getState().setSettings({ [field]: Number(e.target.value) })}
      />
    </div>
  )
}

export function SettingsPanel({ onBack }: { onBack: () => void }) {
  const settings: Settings = useGame((s) => s.settings)
  return (
    <div className="settings" data-testid="settings">
      <Panel>
        <h2>{UI['menu.settings']}</h2>
        <QualityRow current={settings.qualityTier} />
        <ActiveTierNote current={settings.qualityTier} />
        <VolumeRow volume={settings.volume} />
        <SubtitlesRow subtitles={settings.subtitles} />
        <ChoiceRow field="cameraMode" label="settings.mouseMode" options={['look', 'aim']} />
        <ChoiceRow field="pointer" label="settings.pointer" options={['mouse', 'trackpad']} />
        <SensitivityRow field="mouseSensitivity" />
        <SensitivityRow field="trackpadSensitivity" />
        <button type="button" className="btn" data-testid="settings-back" onClick={onBack}>
          {UI['settings.back']}
        </button>
      </Panel>
    </div>
  )
}
