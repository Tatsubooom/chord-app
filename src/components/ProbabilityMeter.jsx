const SEGMENTS = 24

// 次の小節の骨格（小節頭の度数）が、どの確率分布から抽選されたかを横向きのセグメントメーターで示す。
// 目標 = フレーズテンプレートが狙った度数 / 決定 = 実際に選ばれた度数
export default function ProbabilityMeter({ distribution }) {
  const empty = !distribution.length
  const entropy = empty ? 0 : -distribution.reduce((a, d) => a + (d.prob > 0 ? d.prob * Math.log2(d.prob) : 0), 0)
  const maxEntropy = empty ? 0 : Math.log2(distribution.length)

  return (
    <section className="meter" aria-label="次の小節の骨格の抽選確率">
      <header className="label-row">
        <span className="label">次の小節 · 骨格の抽選</span>
        {!empty && (
          <span className="label label--dim">
            H {entropy.toFixed(2)}/{maxEntropy.toFixed(2)} bit
          </span>
        )}
      </header>
      {empty ? (
        <p className="meter__empty">再生すると、次の小節頭のコードがどの確率から選ばれたかを表示します。</p>
      ) : (
        <ol className="meter__rows">
          {distribution.map(d => {
            const lit = Math.round(d.prob * SEGMENTS)
            return (
              <li key={d.degree} className={'meter__row' + (d.chosen ? ' is-chosen' : '')}>
                <span className="meter__name">{d.name}</span>
                <span className="meter__bar" aria-hidden="true">
                  {Array.from({ length: SEGMENTS }, (_, i) => (
                    <i key={i} className={i < lit ? 'on' : ''} />
                  ))}
                </span>
                <span className="meter__pct">{(d.prob * 100).toFixed(1)}</span>
                <span className="meter__mark">
                  {d.target ? '目標' : ''}
                  {d.target && d.chosen ? '·' : ''}
                  {d.chosen ? '決定' : ''}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
