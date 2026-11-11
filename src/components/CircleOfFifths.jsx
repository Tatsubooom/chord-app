import { keyPrefersFlat, spellPc } from '../engines/theory'
import { KEYS } from '../constants'

// 五度圏の上でコードを記号的に表示する。
//   ・今鳴っている音のノードを塗り、ノードの丸同士を細い線ですべて直接結ぶ（ベース音は紫）
//   ・直前まで鳴っていた音のノードは、しばらく灰色の余韻として残る
//   ・外周の薄い弧は、今のキーのダイアトニック範囲（五度圏で隣り合う7音）
const SIZE = 300
const C = SIZE / 2
const R_NODE = 122 // ノードを並べる半径
const NODE_R = 20 // 小さく表示しても音名が読めるよう、表示サイズに対して大きめ

// 五度圏の並び（真上の C から時計回り）での位置。pc → 0..11
const circleIndex = pc => (pc * 7) % 12
const angleOf = idx => ((idx * 30 - 90) * Math.PI) / 180
const point = (idx, r) => [C + r * Math.cos(angleOf(idx)), C + r * Math.sin(angleOf(idx))]

const pcsOf = chord => [...new Set((chord?.midis || []).map(m => m % 12))]

// 五度圏の並び順に結んだ閉じた多角形（音が1〜2個なら点・線になる）
function polygonPath(pcs, r) {
  const pts = pcs
    .map(circleIndex)
    .sort((a, b) => a - b)
    .map(i => point(i, r))
  if (!pts.length) return ''
  return pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + (pts.length > 2 ? ' Z' : '')
}

function arcPath(fromIdx, toIdx, r) {
  const a1 = ((fromIdx * 30 - 90) * Math.PI) / 180
  const a2 = ((toIdx * 30 - 90) * Math.PI) / 180
  const [x1, y1] = [C + r * Math.cos(a1), C + r * Math.sin(a1)]
  const [x2, y2] = [C + r * Math.cos(a2), C + r * Math.sin(a2)]
  const large = toIdx - fromIdx > 6 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

export default function CircleOfFifths({ history, keyName, scale }) {
  const now = history[0]
  const nowPcs = pcsOf(now)
  const bassPc = now?.voicing ? now.voicing.bass % 12 : null

  // 余韻: 直近のコードで鳴っていた音ほど濃い灰色
  const recent = new Map()
  history.slice(1, 4).forEach((c, k) => {
    for (const pc of pcsOf(c)) if (!recent.has(pc)) recent.set(pc, k)
  })

  // キーのダイアトニック範囲（メジャー基準。マイナーは平行長調で数える）
  const keyPc = KEYS.indexOf(keyName)
  const minor = scale === 'minor' || scale === 'minorPenta'
  const majorTonicIdx = circleIndex(minor ? (keyPc + 3) % 12 : keyPc)
  const keyFlat = keyPrefersFlat(keyPc, minor ? 'minor' : 'major')
  const tonicIdx = circleIndex(keyPc)

  // 全ペアを結ぶ線（今のコード）
  // 線はノードの中心同士を結び、上に重なるノードの丸で端が隠れて「丸から丸へ」繋がって見える
  const nowPts = nowPcs.map(pc => point(circleIndex(pc), R_NODE))
  const links = []
  for (let a = 0; a < nowPts.length; a++) for (let b = a + 1; b < nowPts.length; b++) links.push([nowPts[a], nowPts[b]])

  return (
    <div className="cof" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={C} cy={C} r={C - 1} className="cof__plate" />
        <circle cx={C} cy={C} r={R_NODE} className="cof__orbit" />
        <path d={arcPath(majorTonicIdx - 1.5, majorTonicIdx + 5.5, R_NODE + 25)} className="cof__key" />

        {/* 今のコード: 鳴っている音同士を細い線で結ぶ */}
        <g className="cof__now" key={now?.id ?? 'none'}>
          <path d={polygonPath(nowPcs, R_NODE)} className="cof__poly" />
          {links.map(([[x1, y1], [x2, y2]], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="cof__link" />
          ))}
        </g>

        {/* 12音のノード */}
        {Array.from({ length: 12 }, (_, idx) => {
          const pc = (idx * 7) % 12
          const [x, y] = point(idx, R_NODE)
          const sounding = nowPcs.includes(pc)
          const isBass = pc === bassPc
          const echo = !sounding && recent.has(pc) ? recent.get(pc) : null
          const cls =
            'cof__node' +
            (isBass ? ' is-bass' : sounding ? ' is-on' : echo != null ? ` is-echo-${echo}` : '') +
            (idx === tonicIdx ? ' is-tonic' : '')
          return (
            <g key={idx} className={cls}>
              <circle cx={x} cy={y} r={NODE_R} />
              <text x={x} y={y} dy="0.36em" textAnchor="middle">
                {spellPc(pc, { keyFlat })}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
