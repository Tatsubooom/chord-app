import { getDecorationChances } from '../engines/chordEngine'
import { MEASURE_SPLIT_SCALE } from '../constants'

// テンション/装飾/分割の発生確率を、横書きで淡々と一列に並べるパネル
export default function DecorationInfo({ temperature, enableMultiChord }) {
  const splitProb = enableMultiChord
    ? Math.min(Math.pow(temperature, 2) * MEASURE_SPLIT_SCALE, 1)
    : 0

  const rows = [
    ...getDecorationChances(temperature),
    { key: '分割', prob: splitProb },
  ]

  return (
    <div className="detail">
      <div className="detail__caption">
        装飾の発生確率 · 多様性 {Math.round(temperature * 100)}%
      </div>
      <div className="detail__row">
        {rows.map(r => (
          <span className="detail__item" key={r.key}>
            <span className="detail__label">{r.key}</span>
            <span className="detail__val">{Math.round(r.prob * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}
