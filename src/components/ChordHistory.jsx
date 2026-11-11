import { Fragment } from 'react'
import { BLOCK_MEASURES } from '../constants'

// 演奏済みコードの履歴。ピアノロールの右端から入り、新しいコードが来るたびに左へ流れていく。
// 下線の色は和声機能（T / SD / D / SDm）。古いものほど薄くなって左端で消える。
export default function ChordHistory({ history }) {
  const newest = history[0]
  return (
    <div className="chord-history">
      {/* 新しいコードごとに再マウントして、行全体が右から左へスライドするアニメーションを再生する */}
      <div className="chord-history__track" key={newest?.id ?? 'empty'}>
        {history.map((c, i) => {
          // 4小節ごと（measureId が BLOCK_MEASURES の倍数）の小節頭に区切り線を置く
          const isBlockStart = c.isMeasureStart && c.measureId % BLOCK_MEASURES === 0
          return (
            <Fragment key={c.id}>
              <div
                className={'chord-history__item' + (c.func ? ` fn-${c.func}` : '') + (i === 0 ? ' is-now' : '')}
                style={{ opacity: Math.max(0.2, 1 - i * 0.07) }}
              >
                {c.name}
              </div>
              {isBlockStart && i !== history.length - 1 && <div className="chord-history__divider" aria-hidden="true" />}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
