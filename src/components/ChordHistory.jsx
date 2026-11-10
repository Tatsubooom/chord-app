import { Fragment } from 'react'
import { BLOCK_MEASURES } from '../constants'

// コード履歴（右から左へ流れる）。右端が最新で、古いものほど薄くなる。
export default function ChordHistory({ history }) {
  return (
    <div className="chord-history">
      {history.map((c, i) => {
        // 4小節ごと（measureId が BLOCK_MEASURES の倍数）の小節頭に区切り線を置く
        const isBlockStart = c.isMeasureStart && c.measureId % BLOCK_MEASURES === 0
        return (
          <Fragment key={c.id}>
            <div className={'chord-history__item' + (i === 0 ? ' is-now' : '')} style={{ opacity: Math.max(0.25, 1 - i * 0.06) }}>
              <div className="chord-history__name">{c.name}</div>
              <div className="chord-history__roman">{c.roman}</div>
              <div className="chord-history__beats">{'・'.repeat(c.beats)}</div>
            </div>
            {isBlockStart && i !== history.length - 1 && <div className="chord-history__divider" aria-hidden="true" />}
          </Fragment>
        )
      })}
    </div>
  )
}
