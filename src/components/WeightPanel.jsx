import { SCALES } from '../engines/chordEngine'
import { KEYS, KEY_LABELS } from '../constants'
import Knob, { Pad, SlideSwitch } from './Knob'

// スケールのスライドスイッチ: LCD に出す表示
const SCALE_SWITCH = [
  { value: 'major', lcd: 'MAJOR' },
  { value: 'minor', lcd: 'MINOR' },
  { value: 'majorPenta', lcd: 'MAJ PENTA' },
  { value: 'minorPenta', lcd: 'MIN PENTA' },
]

const pct = v => `${Math.round(v * 100)}%`

// 設定パネル: 上段に DJ コントローラー風のスイッチ類（キー: ロータリースイッチ / スケール: 縦スライドスイッチ /
// テンポ・ランダム度・スパイス: ノブ / ノンダイア・複数コード: 点灯パッド）。奏法・速さ・音色は再生ボタンの横（PlayControls）
export default function WeightPanel({
  open,
  onToggleOpen,
  keyName,
  onKeyChange,
  scale,
  onScaleChange,
  bpm,
  onBpmChange,
  temperature,
  onTemperatureChange,
  spice,
  onSpiceChange,
  enableMultiChord,
  onToggleMultiChord,
  enableSubs,
  onToggleSubs,
}) {
  const tonal = SCALES[scale]?.intervals.length === 7

  return (
    <section className="settings" aria-label="設定">
      <button className="settings__toggle" onClick={onToggleOpen} aria-expanded={open} aria-controls="settings-body">
        <span className="settings__title">SETTINGS</span>
        <span className="settings__summary">
          {keyName} {SCALES[scale]?.label} · {bpm} BPM · RANDOM {pct(temperature)} · SPICE {pct(spice)}
        </span>
        <span className="settings__chevron" aria-hidden="true">
          {open ? '▽' : '▷'}
        </span>
      </button>
      {open && (
        <div className="settings__body" id="settings-body">
          <div className="deck" role="group" aria-label="つまみとスイッチ">
            <Knob
              label="KEY"
              value={Math.max(0, KEYS.indexOf(keyName))}
              min={0}
              max={KEYS.length - 1}
              step={1}
              ticks={KEYS.length}
              led={false}
              lcd
              defaultValue={0}
              onChange={i => onKeyChange(KEYS[i])}
              format={i => KEY_LABELS[KEYS[i]] ?? KEYS[i]}
            />
            <SlideSwitch
              label="SCALE"
              options={SCALE_SWITCH}
              value={scale}
              onChange={onScaleChange}
              hint={tonal ? undefined : 'ペンタトニックでは仕掛け・終止は無効'}
            />
            <span className="deck__sep" aria-hidden="true" />
            <Knob
              label="TEMPO"
              value={bpm}
              min={50}
              max={200}
              step={1}
              defaultValue={90}
              onChange={onBpmChange}
              format={v => `${v}`}
              hint="BPM"
            />
            <Knob
              label="RANDOM"
              value={temperature}
              min={0}
              max={1}
              step={0.01}
              defaultValue={0.3}
              onChange={onTemperatureChange}
              format={pct}
              hint="骨格の外れやすさ・7th/9th"
            />
            <Knob
              label="SPICE"
              value={spice}
              min={0}
              max={1}
              step={0.01}
              defaultValue={0.5}
              onChange={onSpiceChange}
              format={pct}
              hint="クリシェ等の仕掛けの量"
            />
            <span className="deck__sep" aria-hidden="true" />
            <Pad label="NON-DIATONIC" on={enableSubs} onChange={onToggleSubs} hint="aug / dim7 / 借用 / 裏コード" />
            <Pad label="MULTI-CHORD" on={enableMultiChord} onChange={onToggleMultiChord} hint="経過和音・クリシェ" />
          </div>

        </div>
      )}
    </section>
  )
}
