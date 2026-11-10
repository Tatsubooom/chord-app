import { SCALES } from '../engines/chordEngine'
import { KEYS, KEY_LABELS, PLAY_STYLES, RHYTHM_SPEEDS, WAVEFORMS } from '../constants'

// 1行ぶんの設定項目（罫線で区切った表の1行）。行全体がラベルなので、どこを押しても操作できる。
function Field({ label, hint, children, value }) {
  return (
    <label className="setting">
      <span className="setting__label">{label}</span>
      <span className="setting__control">{children}</span>
      <span className="setting__value">{value}</span>
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

// 設定パネル: 曲 / 演奏 / 音 / 生成 の4グループを、罫線の表として2段組に並べる（行数の多い「生成」を右段に）
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
        <Field label="テンポ" value={`${bpm} BPM`}>
          <input type="range" min="50" max="200" value={bpm} onChange={e => onBpmChange(Number(e.target.value))} />
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
      </Group>

      <Group title="音">
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
      <Group title="生成">
        <Field
          label="ランダム度"
         
          value={pct(temperature)}
          hint="骨格がテンプレートから外れる確率と、7th / 9th の色の付きやすさ"
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={temperature}
            onChange={e => onTemperatureChange(Number(e.target.value))}
          />
        </Field>
        <Field label="スパイス" value={pct(spice)} hint="クリシェ・イキスギ・セカンダリー等の仕掛けの量（次のセクションから反映）">
          <input type="range" min="0" max="1" step="0.01" value={spice} onChange={e => onSpiceChange(Number(e.target.value))} />
        </Field>
        <Field label="ノンダイア" value={enableSubs ? 'ON' : 'OFF'} hint="OFF でスケール内の音だけ（aug / dim7 / 借用 / 裏コードを使わない）">
          <input type="checkbox" className="switch" checked={enableSubs} onChange={e => onToggleSubs(e.target.checked)} />
        </Field>
        <Field label="複数コード" value={enableMultiChord ? 'ON' : 'OFF'} hint="1小節に複数のコード（経過和音・クリシェ・ツーファイブ）">
          <input type="checkbox" className="switch" checked={enableMultiChord} onChange={e => onToggleMultiChord(e.target.checked)} />
        </Field>
      </Group>
        </div>
      )}
    </section>
  )
}
