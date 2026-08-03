const SEGMENTS = 12

// 次に来るコードの確率をライブ表示する、棒が積み上がる segmented メーター
export default function ProbabilityMeter({ distribution }) {
  if (!distribution.length) return null

  const max = Math.max(...distribution.map(d => d.prob), 0.0001)
  const topDegree = distribution.reduce((a, b) => (b.prob > a.prob ? b : a)).degree

  return (
    <div className="meter" role="img" aria-label="次のコードの確率">
      <div className="meter__caption">Next chord ▸ 確率</div>
      <div className="meter__cols">
        {distribution.map(d => {
          const lit = Math.round((d.prob / max) * SEGMENTS)
          return (
            <div
              key={d.degree}
              className={'meter__col' + (d.degree === topDegree ? ' meter__col--top' : '')}
            >
              <div className="meter__bar">
                {Array.from({ length: SEGMENTS }).map((_, i) => {
                  const level = SEGMENTS - i // 上から下へ。下から積み上がる
                  return (
                    <span
                      key={i}
                      className={'meter__seg' + (level <= lit ? ' is-on' : '')}
                    />
                  )
                })}
              </div>
              <div className="meter__pct">{Math.round(d.prob * 100)}%</div>
              <div className="meter__name">{d.name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
