import { Fragment } from 'react'
import { BLOCK_MEASURES } from '../constants'

// 流れていくコード履歴。右端が最新で、古いものほど左へ流れて薄くなる。
export default function ChordHistory({ history }) {
  const items = [...history].reverse()
  const n = items.length
  return (
    <div className="chord-history" aria-label="コード履歴">
      {items.map((c, idx) => {
        const age = n - 1 - idx // 0 = 最新
        // 4小節ごと（measureId が BLOCK_MEASURES の倍数）の小節頭に区切り線を置く
        const isBlockStart = c.isMeasureStart && c.measureId % BLOCK_MEASURES === 0
        return (
          <Fragment key={c.id}>
            {isBlockStart && idx !== 0 && <div className="chord-history__divider" aria-hidden="true" />}
            <div
              className={'chord-history__item' + (c.func ? ` chord-history__item--fn-${c.func}` : '') + (age === 0 ? ' is-now' : '')}
              style={{ opacity: Math.max(0.2, 1 - age * 0.06) }}
            >
              <div className="chord-history__name">{c.name}</div>
              <div className="chord-history__roman">{c.roman}</div>
              <div className="chord-history__beats">{'●'.repeat(c.beats)}</div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
