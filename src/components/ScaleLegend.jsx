import { getDefs } from '../engines/chordEngine'

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// 度数 def からローマ数字表記（例: ii, V, vii°）を組み立てる
function toRoman(def, index) {
  const base = ROMAN_NUMERALS[index % 7] || '?'
  const isMinor = def.relThird === 3
  const isDim = isMinor && def.relFifth === 6

  if (isDim) return base.toLowerCase() + '°'
  if (isMinor) return base.toLowerCase() + 'm'
  return base
}

// スケールの各度数がどんなコードになるかの一覧
export default function ScaleLegend({ scale }) {
  return (
    <div className="scale-legend">
      {getDefs(scale).map((def, i) => (
        <div key={i} className="scale-legend__item">
          <span>
            {toRoman(def, i)} (Root: +{def.root})
          </span>
        </div>
      ))}
    </div>
  )
}
