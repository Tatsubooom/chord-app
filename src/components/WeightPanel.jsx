import { SCALES } from '../engines/chordEngine'
import { KEYS, KEY_LABELS, PLAY_STYLES, RHYTHM_SPEEDS, WAVEFORMS } from '../constants'
import Knob, { Pad } from './Knob'

// 1行ぶんの設定項目（罫線で区切った表の1行）。行全体がラベルなので、どこを押しても操作できる。
function Field({ label, hint, children }) {
  return (
    <label className="setting">
      <span className="setting__label">{label}</span>
      <span className="setting__control">{children}</span>
      {hint && <span className="setting__hint">{hint}</span>}
    </label>
  )
}

function Group({ title, children }) {
  return (
    <div className="settings__group" role="group" aria-label={title}>
      <h2 className="label">{title}</h2>
      {children}
    </div>
  )
}

const pct = v => `${Math.round(v * 100)}%`

// 設定パネル: 上段に DJ コントローラー風のノブ（テンポ / ランダム度 / スパイス）と点灯パッド（ノンダイア / 複数コード）、
// 下段にキー・スケール・奏法などの選択を罫線の表で並べる
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
  playStyle,
  onPlayStyleChange,
  rhythmSpeed,
  onRhythmSpeedChange,
  waveform,
  onWaveformChange,
}) {
  // 速さは刻み/アルペジオ/積み上げのときだけ効く
  const speedActive = playStyle === 'comp' || playStyle === 'arpeggio' || playStyle === 'buildup'
  const tonal = SCALES[scale]?.intervals.length === 7

  return (
    <section className="settings" aria-label="設定">
      <button className="settings__toggle" onClick={onToggleOpen} aria-expanded={open} aria-controls="settings-body">
        <span className="settings__title">設定</span>
        <span className="settings__summary">
          {keyName} {SCALES[scale]?.label} · {bpm} BPM · ランダム度 {pct(temperature)} · スパイス {pct(spice)}
        </span>
        <span className="settings__chevron" aria-hidden="true">
          {open ? '▽' : '▷'}
        </span>
      </button>
      {open && (
        <div className="settings__body" id="settings-body">
          <div className="deck" role="group" aria-label="生成のつまみ">
            <Knob
              label="テンポ"
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
              label="ランダム度"
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
              label="スパイス"
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
            <Pad label="ノンダイア" on={enableSubs} onChange={onToggleSubs} hint="aug / dim7 / 借用 / 裏コード" />
            <Pad label="複数コード" on={enableMultiChord} onChange={onToggleMultiChord} hint="経過和音・クリシェ" />
          </div>
          <p className="deck__help">つまみは上下ドラッグ・ホイール・矢印キーで操作、ダブルクリックで初期値に戻ります。</p>

          <div className="settings__rows">
            <Group title="曲">
              <Field label="キー">
                <select value={keyName} onChange={e => onKeyChange(e.target.value)}>
                  {KEYS.map(k => (
                    <option key={k} value={k}>
                      {KEY_LABELS[k] ?? k}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="スケール" hint={tonal ? null : 'ペンタトニックでは仕掛け・終止は無効'}>
                <select value={scale} onChange={e => onScaleChange(e.target.value)}>
                  {Object.entries(SCALES).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </Group>

            <Group title="演奏">
              <Field label="奏法">
                <select value={playStyle} onChange={e => onPlayStyleChange(e.target.value)}>
                  {PLAY_STYLES.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="速さ" hint={speedActive ? null : 'ブロック奏法では使いません'}>
                <select value={rhythmSpeed} disabled={!speedActive} onChange={e => onRhythmSpeedChange(e.target.value)}>
                  {RHYTHM_SPEEDS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="音色" hint="上声の波形。ベースは常に三角波＋サイン波">
                <select value={waveform} onChange={e => onWaveformChange(e.target.value)}>
                  {WAVEFORMS.map(w => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </Field>
            </Group>
          </div>
        </div>
      )}
    </section>
  )
}
