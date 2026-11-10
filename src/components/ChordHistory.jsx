import { Fragment } from 'react'
import { BLOCK_MEASURES } from '../constants'

// 候補として出す最低確率と最大数
const MIN_PROB = 0.03
const MAX_CANDIDATES = 4

// コード履歴（右から左へ流れる）＋ これから来そうなコード。
//   左: 鳴らし終えたコード（古いほど薄い）  中央: 今のコード  右: 次の小節の候補
// 下線の色は和声機能（T / SD / D / SDm）。過去は実線、未来は破線で、確率が高いほど濃く太く出る。
export default function ChordHistory({ history, distribution = [] }) {
  const [now, ...past] = history
  const candidates = distribution
    .filter(d => d.prob >= MIN_PROB)
    .sort((a, b) => b.prob - a.prob)
    .slice(0, MAX_CANDIDATES)
  const top = candidates[0]?.prob || 1

  return (
    <div className="chord-history">
      <div className="chord-history__past">
        {/* 行は row-reverse なので、DOM の先頭が「今」のすぐ左に来る */}
        {now?.isMeasureStart && now.measureId % BLOCK_MEASURES === 0 && past.length > 0 && (
          <div className="chord-history__divider" aria-hidden="true" />
        )}
        {past.map((c, i) => {
          // 4小節ごと（measureId が BLOCK_MEASURES の倍数）の小節頭に区切り線を置く
          const isBlockStart = c.isMeasureStart && c.measureId % BLOCK_MEASURES === 0
          return (
            <Fragment key={c.id}>
              <div className={item(c.func)} style={{ opacity: Math.max(0.2, 0.85 - i * 0.07) }}>
                {c.name}
              </div>
              {isBlockStart && i !== past.length - 1 && <div className="chord-history__divider" aria-hidden="true" />}
            </Fragment>
          )
        })}
      </div>

      <div className="chord-history__now">{now && <div className={item(now.func) + ' is-now'}>{now.name}</div>}</div>

      <div className="chord-history__next" aria-label="次の小節の候補">
        {candidates.length > 0 && <span className="chord-history__arrow" aria-hidden="true">›</span>}
        {candidates.map(d => {
          const w = d.prob / top
          return (
            <div
              key={d.degree}
              className={item(d.func) + ' is-next'}
              style={{ opacity: 0.25 + 0.6 * w, '--uw': `${1 + Math.round(w * 2)}px` }}
              title={`${d.name} ${(d.prob * 100).toFixed(1)}%`}
            >
              {d.name}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const item = func => 'chord-history__item' + (func ? ` fn-${func}` : '')
