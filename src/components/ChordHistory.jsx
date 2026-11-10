import { Fragment } from 'react'
import { BLOCK_MEASURES } from '../constants'

// 流れていくコード履歴（1行のティッカー）。右端が最新、古いものは左へ流れて消える。
export default function ChordHistory({ history }) {
  const items = [...history].reverse()
  return (
    <section className="ticker" aria-label="コード履歴">
      <span className="label">履歴</span>
      <div className="ticker__track">
        {items.map((c, idx) => {
          const isBlockStart = c.isMeasureStart && c.measureId % BLOCK_MEASURES === 0
          return (
            <Fragment key={c.id}>
              {isBlockStart && idx !== 0 && <span className="ticker__bar" aria-hidden="true" />}
              <span className={'ticker__item' + (idx === items.length - 1 ? ' is-now' : '')}>
                {c.name}
                <span className="ticker__beats">{c.beats}</span>
              </span>
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
