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
          // %は出さず、起きやすさを不透明度で淡く表現
          <span className="detail__item" key={r.key} style={{ opacity: 0.35 + r.prob * 0.65 }}>
            {r.key}
          </span>
        ))}
      </div>
    </div>
  )
}
