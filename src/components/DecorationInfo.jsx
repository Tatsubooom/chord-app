import { colorChances, gestureChances, splitChance } from '../engines/planner'

const SEGMENTS = 10

// 仕掛け / 色 / 分割の起きやすさの一覧（今の設定での目安）。名前・小さなメーター・数値を並べる。
export default function DecorationInfo({ scale, temperature, spice, enableMultiChord, enableSubs }) {
  const color = colorChances(temperature)
  const rows = [
    { key: '7th 色', prob: color.seventh, note: 'セクション' },
    { key: '9th 色', prob: color.rich, note: 'セクション' },
    { key: '経過和音', prob: splitChance(temperature, enableMultiChord), note: '小節' },
    ...gestureChances({ spice, enableSubs, enableMultiChord, scale }).map(g => ({ ...g, note: g.key === '終止' ? 'セクション末' : '箇所' })),
  ]

  return (
    <section className="odds" aria-label="仕掛けの起きやすさ">
      <div className="readout__caption">
        <span>仕掛けの起きやすさ</span>
        <span className="readout__dim">
          ランダム度 {Math.round(temperature * 100)} · スパイス {Math.round(spice * 100)} · 単位あたりの目安 %
        </span>
      </div>
      <ul className="odds__list">
        {rows.map(r => {
          const lit = Math.round(Math.min(1, r.prob) * SEGMENTS)
          return (
            <li key={r.key} className={'odds__row' + (r.prob <= 0 ? ' is-off' : '')}>
              <span className="odds__name">{r.key}</span>
              <span className="odds__bar" aria-hidden="true">
                {Array.from({ length: SEGMENTS }, (_, i) => (
                  <i key={i} className={i < lit ? 'on' : ''} />
                ))}
              </span>
              <span className="odds__pct">{(Math.min(1, r.prob) * 100).toFixed(0)}</span>
              <span className="odds__unit">/{r.note}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
