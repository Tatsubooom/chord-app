import { BEATS_PER_MEASURE } from '../constants'

const SECTION_BARS = 8

// 再生ボタン + 現在位置（セクション / 小節 / 拍）のカウンター
export default function TransportControls({ playing, onToggle, showSettings, onToggleSettings, beatPos, bpm }) {
  const bar = beatPos ? beatPos.bar + 1 : null
  const beat = beatPos ? beatPos.beat : null
  const sec = beatPos ? beatPos.sectionIndex + 1 : null
  const pad = n => (n == null ? '––' : String(n).padStart(2, '0'))

  return (
    <div className="transport">
      <button className={'btn btn--primary' + (playing ? ' is-on' : '')} onClick={onToggle} aria-pressed={playing}>
        {playing ? '停止' : '再生'}
      </button>

      <dl className="counter" aria-label="再生位置">
        <div>
          <dt>Sec</dt>
          <dd>{pad(sec)}</dd>
        </div>
        <div>
          <dt>Bar</dt>
          <dd>
            {bar ?? '–'}
            <span className="counter__of">/{SECTION_BARS}</span>
          </dd>
        </div>
        <div>
          <dt>Beat</dt>
          <dd className="counter__beats" aria-label={beat == null ? '' : `${beat + 1}拍目`}>
            {Array.from({ length: BEATS_PER_MEASURE }, (_, i) => (
              <i key={i} className={beat === i ? 'on' : ''} />
            ))}
          </dd>
        </div>
        <div>
          <dt>Tempo</dt>
          <dd>{bpm}</dd>
        </div>
      </dl>

      <button className="btn" onClick={onToggleSettings} aria-expanded={showSettings}>
        {showSettings ? '設定を隠す' : '設定を表示'}
      </button>
    </div>
  )
}
