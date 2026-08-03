import { Fragment } from 'react'
import { BLOCK_MEASURES } from '../constants'

export default function ChordHistory({ history }) {
  return (
    <div className="chord-history">
      {history.map((c, i) => {
        // 4小節ごと（measureId が BLOCK_MEASURES の倍数）の小節頭に区切り線を置く
        const isBlockStart = c.isMeasureStart && c.measureId % BLOCK_MEASURES === 0

        return (
          <Fragment key={c.id}>
            <div className="chord-history__item" style={{ opacity: 1 - i * 0.05 }}>
              <div className="chord-history__name">{c.name}</div>
              <div className="chord-history__beats">{'・'.repeat(c.beats)}</div>
            </div>
            {isBlockStart && i !== history.length - 1 && (
              <div className="chord-history__divider">|</div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
