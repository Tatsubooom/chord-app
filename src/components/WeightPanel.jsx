import { SCALES } from '../engines/chordEngine'
import { KEYS, KEY_LABELS, PLAY_STYLES, RHYTHM_SPEEDS, WAVEFORMS } from '../constants'

// 1行ぶんの設定項目（日本語ラベル + 英字の小見出し + 補足）
function Field({ label, en, hint, children, value }) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        <span className="field__en">{en}</span>
      </span>
      <span className="field__control">{children}</span>
      {value != null && <span className="field__value">{value}</span>}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

function Group({ title, en, children }) {
  return (
    <fieldset className="group">
      <legend className="group__title">
        {title} <span className="group__en">{en}</span>
      </legend>
      {children}
    </fieldset>
  )
}

const pct = v => `${Math.round(v * 100)}%`

// 設定パネル: 曲 / 生成 / 演奏 / 音 の4グループ
export default function WeightPanel({
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
    <div className="weight-panel">
      <Group title="曲" en="SONG">
        <Field label="キー" en="KEY">
          <select value={keyName} onChange={e => onKeyChange(e.target.value)}>
            {KEYS.map(k => (
              <option key={k} value={k}>
                {KEY_LABELS[k] ?? k}
              </option>
            ))}
          </select>
        </Field>
        <Field label="スケール" en="SCALE" hint={tonal ? null : 'ペンタトニックでは仕掛け・終止は無効'}>
          <select value={scale} onChange={e => onScaleChange(e.target.value)}>
            {Object.entries(SCALES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="テンポ" en="TEMPO" value={`${bpm} BPM`}>
          <input type="range" min="50" max="200" value={bpm} onChange={e => onBpmChange(Number(e.target.value))} />
        </Field>
      </Group>

      <Group title="生成" en="GENERATE">
        <Field
          label="ランダム度"
          en="TEMP"
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
        <Field label="スパイス" en="SPICE" value={pct(spice)} hint="クリシェ・イキスギ・セカンダリー等の仕掛けの量（次のセクションから反映）">
          <input type="range" min="0" max="1" step="0.01" value={spice} onChange={e => onSpiceChange(Number(e.target.value))} />
        </Field>
        <Field label="ノンダイア" en="CHROMATIC" hint="OFF でスケール内の音だけ（aug / dim7 / 借用 / 裏コードを使わない）">
          <input type="checkbox" checked={enableSubs} onChange={e => onToggleSubs(e.target.checked)} />
        </Field>
        <Field label="複数コード" en="SPLIT" hint="1小節に複数のコード（経過和音・クリシェ・ツーファイブ）">
          <input type="checkbox" checked={enableMultiChord} onChange={e => onToggleMultiChord(e.target.checked)} />
        </Field>
      </Group>

      <Group title="演奏" en="PLAY">
        <Field label="奏法" en="STYLE">
          <select value={playStyle} onChange={e => onPlayStyleChange(e.target.value)}>
            {PLAY_STYLES.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="速さ" en="RATE" hint={speedActive ? null : 'ブロック奏法では使いません'}>
          <select value={rhythmSpeed} disabled={!speedActive} onChange={e => onRhythmSpeedChange(e.target.value)}>
            {RHYTHM_SPEEDS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </Group>

      <Group title="音" en="SOUND">
        <Field label="音色" en="WAVE" hint="上声の波形。ベースは常に三角波＋サイン波">
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
  )
}
