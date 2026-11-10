import { BEATS_PER_MEASURE } from '../constants'

// 再生ボタン + 現在位置（小節 / 拍）のカウンター
export default function TransportControls({ playing, onToggle, beatPos, bpm }) {
  const beat = beatPos ? beatPos.beat : null
  return (
    <div className="transport">
      <button className={'transport__play' + (playing ? ' is-on' : '')} onClick={onToggle} aria-pressed={playing}>
        {playing ? 'Stop' : 'Play'}
      </button>
      <div className="transport__pos" aria-label="再生位置">
        <span>
          bar <b>{beatPos ? beatPos.bar + 1 : '–'}</b>/8
        </span>
        <span className="transport__beats" aria-label={beat == null ? '' : `${beat + 1}拍目`}>
          {Array.from({ length: BEATS_PER_MEASURE }, (_, i) => (
            <i key={i} className={beat === i ? 'on' : ''} />
          ))}
        </span>
        <span>
          <b>{bpm}</b> bpm
        </span>
      </div>
    </div>
  )
}
