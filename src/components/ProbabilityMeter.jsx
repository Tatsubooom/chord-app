const SEGMENTS = 18

// 次の小節の骨格（小節頭の度数）が、どの確率から選ばれたかを示す segmented VU メーター。
// ◆ = フレーズテンプレートの目標 / ▲ = 実際に選ばれた度数
export default function ProbabilityMeter({ distribution }) {
  if (!distribution.length) {
    return (
      <div className="meter">
        <div className="readout__caption">
          <span>Next bar ▸ 骨格の抽選確率</span>
        </div>
        <p className="readout__hint">再生すると、次の小節頭のコードがどの確率で選ばれたかを表示します</p>
      </div>
    )
  }

  const max = Math.max(...distribution.map(d => d.prob), 0.0001)
  const entropy = -distribution.reduce((a, d) => a + (d.prob > 0 ? d.prob * Math.log2(d.prob) : 0), 0)

  return (
    <div className="meter" role="img" aria-label="次の小節の骨格の抽選確率">
      <div className="readout__caption">
        <span>Next bar ▸ 骨格の抽選確率</span>
        <span className="readout__dim">
          ◆ 目標 ▲ 決定 · H {entropy.toFixed(2)}/{Math.log2(distribution.length).toFixed(2)} bit
        </span>
      </div>
      <div className="meter__cols">
        {distribution.map(d => {
          const lit = Math.round((d.prob / max) * SEGMENTS)
          return (
            <div key={d.degree} className={'meter__col' + (d.chosen ? ' is-chosen' : '')}>
              <div className="meter__marks" aria-hidden="true">
                {d.target ? '◆' : ''}
                {d.chosen ? '▲' : ''}
              </div>
              <div className="meter__bar">
                {Array.from({ length: SEGMENTS }).map((_, i) => {
                  const level = SEGMENTS - i // 上から下へ。下から積み上がる
                  return <span key={i} className={'meter__seg' + (level <= lit ? ' is-on' : '')} />
                })}
              </div>
              <div className="meter__pct">{(d.prob * 100).toFixed(1)}%</div>
              <div className="meter__name">{d.name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
