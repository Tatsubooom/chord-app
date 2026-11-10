import { BEATS_PER_MEASURE } from '../constants'

const SECTION_BARS = 8

// 再生ボタン + 現在位置（セクション / 小節 / 拍）のカウンター
export default function TransportControls({ playing, onToggle, showSettings, onToggleSettings, beatPos, bpm }) {
  const bar = beatPos ? beatPos.bar : null
  const beat = beatPos ? beatPos.beat : null
  const sec = beatPos ? beatPos.sectionIndex + 1 : null
  const pad = (n, w = 2) => (n == null ? '--' : String(n).padStart(w, '0'))

  return (
    <div className="transport">
      <button className={'transport__play' + (playing ? ' is-on' : '')} onClick={onToggle} aria-pressed={playing}>
        <span aria-hidden="true">{playing ? '■' : '▶'}</span> {playing ? 'Stop' : 'Play'}
      </button>

      <div className="counter" aria-label="再生位置">
        <div className="counter__cell">
          <span className="counter__k">SEC</span>
          <span className="counter__v">{pad(sec)}</span>
        </div>
        <div className="counter__cell">
          <span className="counter__k">BAR</span>
          <span className="counter__v">
            {bar == null ? '-' : bar + 1}
            <small>/{SECTION_BARS}</small>
          </span>
        </div>
        <div className="counter__cell">
          <span className="counter__k">BEAT</span>
          <span className="counter__beats">
            {Array.from({ length: BEATS_PER_MEASURE }, (_, i) => (
              <i key={i} className={'counter__dot' + (beat === i ? ' is-on' : '') + (i === 0 ? ' is-down' : '')} />
            ))}
          </span>
        </div>
        <div className="counter__cell">
          <span className="counter__k">BPM</span>
          <span className="counter__v">{bpm}</span>
        </div>
      </div>

      <button className="transport__settings" onClick={onToggleSettings} aria-expanded={showSettings}>
        設定 {showSettings ? '▲' : '▼'}
      </button>
    </div>
  )
}
