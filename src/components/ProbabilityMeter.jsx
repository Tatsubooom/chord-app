const SEGMENTS = 12

// セグメントの色帯（下=緑, 中=黄, 上=赤）— 昔のWindowsボリュームメーター風
function segColor(level) {
  const ratio = level / SEGMENTS
  if (ratio >= 0.83) return 'r'
  if (ratio >= 0.58) return 'y'
  return 'g'
}

// 次に来るコードの確率をライブ表示するサウンドヴィジュアライザー風メーター
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
                  const level = SEGMENTS - i // 上から下へ: 上ほど高レベル
                  const on = level <= lit
                  return (
                    <span
                      key={i}
                      className={
                        'meter__seg meter__seg--' + segColor(level) + (on ? ' is-on' : '')
                      }
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
