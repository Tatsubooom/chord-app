import { SCALES } from '../engines/chordEngine'
import { KEYS } from '../constants'

// key / scale / bpm / temperature など、生成の重み付けを決めるパラメータ群
export default function WeightPanel({
  keyName,
  onKeyChange,
  scale,
  onScaleChange,
  bpm,
  onBpmChange,
  temperature,
  onTemperatureChange,
  enableMultiChord,
  onToggleMultiChord,
}) {
  return (
    <div className="weight-panel">
      <label className="field">
        <span className="field__label">複数コード</span>
        <input
          type="checkbox"
          checked={enableMultiChord}
          onChange={e => onToggleMultiChord(e.target.checked)}
        />
        <span className="field__note">Multi-Chord（小節を分割）</span>
      </label>

      <label className="field">
        <span className="field__label">Key</span>
        <select value={keyName} onChange={e => onKeyChange(e.target.value)}>
          {KEYS.map(k => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Scale</span>
        <select value={scale} onChange={e => onScaleChange(e.target.value)}>
          {Object.entries(SCALES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Tempo</span>
        <input
          type="range"
          min="50"
          max="200"
          value={bpm}
          onChange={e => onBpmChange(Number(e.target.value))}
        />
        <span className="field__value">{bpm} BPM</span>
      </label>

      <label className="field">
        <span className="field__label" title="コード進行の多様性（ランダムさ）">
          多様性
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={temperature}
          onChange={e => onTemperatureChange(Number(e.target.value))}
        />
        <span className="field__value">{Math.round(temperature * 100)}%</span>
      </label>
    </div>
  )
}
