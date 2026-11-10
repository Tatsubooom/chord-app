import { colorChances, gestureChances, splitChance } from '../engines/planner'

// 仕掛け / 色 / 分割の起きやすさを、横書きで淡々と一列に並べるパネル
export default function DecorationInfo({ scale, temperature, spice, enableMultiChord, enableSubs }) {
  const color = colorChances(temperature)
  const rows = [
    { key: '7th色', prob: color.seventh },
    { key: '9th色', prob: color.rich },
    { key: '経過和音', prob: splitChance(temperature, enableMultiChord) },
    ...gestureChances({ spice, enableSubs, enableMultiChord, scale }),
  ]

  return (
    <div className="detail">
      <div className="detail__caption">
        仕掛けの起きやすさ · ランダム度 {Math.round(temperature * 100)}% · スパイス {Math.round(spice * 100)}%
      </div>
      <div className="detail__row">
        {rows.map(r => (
          // %は出さず、起きやすさを不透明度で淡く表現
          <span className="detail__item" key={r.key} style={{ opacity: 0.3 + Math.min(1, r.prob * 1.4) * 0.7 }}>
            {r.key}
          </span>
        ))}
      </div>
    </div>
  )
}
