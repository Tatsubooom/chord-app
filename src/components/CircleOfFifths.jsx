import { useState } from 'react'
import { keyPrefersFlat, spellPc } from '../engines/theory'
import { circleIndex, connection } from '../engines/connection'
import { KEYS } from '../constants'

// 五度圏の上でコードを記号的に表示する。
//   ・今鳴っている音のノードを塗り、ノードの丸同士を細い線で直接結ぶ（ベース音は紫）
//   ・ノードの輪の内側には、ほんのり透ける台座。輪と外側のキーの弧の間はピアノロールが透けて見える
//   ・前のコードから鳴り続けている音（共通音）のノードには外側のリング
//   ・前のコードのルート → 今のルートへの曲線の矢印。つながりが強いほど太く濃い
//   ・内側の小さな点は、直前数コードのルートの足跡
//   ・中央: 五度圏上のルートの動き（←1 = 5度下行）、つながりの強さ（5段）、共通音の数
//   ・外側の紫の弧は、今のキーのダイアトニック範囲（五度圏で隣り合う7音）
//   キーを変えると主音が真上に来るよう円全体がシリンダーのように回り、
//   スケールを変えたときは（主音が同じでも）ひと回り転がって新しいスケールに切り替わる。
const SIZE = 300
const C = SIZE / 2
const R_NODE = 112 // ノードを並べる半径
const NODE_R = 19
const R_KEY = 145 // キーの弧（ノードの外側に、間を空けて沿わせる）
const R_TRAIL = 70 // ルートの足跡の半径
const TRAIL = 4 // 足跡として残すコード数
const PIPS = 5

const rad = deg => ((deg - 90) * Math.PI) / 180
const point = (idx, r) => [C + r * Math.cos(rad(idx * 30)), C + r * Math.sin(rad(idx * 30))]
const pcsOf = chord => [...new Set((chord?.midis || []).map(m => m % 12))]
const rootOf = chord => (chord ? (chord.kind === 'blk' ? chord.voicing.bass % 12 : chord.rootPc) : null)
// -180〜180 に正規化（最短方向に回すため）
const shortest = d => ((((d + 180) % 360) + 360) % 360) - 180
// スケールの並び（スライドスイッチと同じ順）。下へ動かすと時計回り、上へ動かすと反時計回りに転がる
const SCALE_ORDER = ['major', 'minor', 'majorPenta', 'minorPenta']

function polygonPath(pcs, r) {
  const pts = pcs
    .map(circleIndex)
    .sort((a, b) => a - b)
    .map(i => point(i, r))
  if (pts.length < 2) return ''
  return pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + (pts.length > 2 ? ' Z' : '')
}

function arcPath(fromIdx, toIdx, r) {
  const [x1, y1] = point(fromIdx, r)
  const [x2, y2] = point(toIdx, r)
  const large = toIdx - fromIdx > 6 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

// 前のルート → 今のルートへの曲線（円の内側を通る）。同じルートなら null
function motionPath(fromIdx, toIdx) {
  if (fromIdx === toIdx) return null
  const r = R_NODE - NODE_R - 5
  const [x1, y1] = point(fromIdx, r)
  const [x2, y2] = point(toIdx, r)
  // 制御点は2点の中点を中心側へ引き寄せた位置（隣どうしは浅く、遠いほど深く曲がる）
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const k = 0.45
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${(mx + (C - mx) * k).toFixed(1)} ${(my + (C - my) * k).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

export default function CircleOfFifths({ history, keyName, scale }) {
  const keyPc = Math.max(0, KEYS.indexOf(keyName))
  const minor = scale === 'minor' || scale === 'minorPenta'
  const keyFlat = keyPrefersFlat(keyPc, minor ? 'minor' : 'major')
  const tonicIdx = circleIndex(keyPc)
  const majorTonicIdx = circleIndex(minor ? (keyPc + 3) % 12 : keyPc)

  // 主音が真上に来る回転角。直前の角度から最短方向に回るよう累積で持つ
  // （前回のレンダー結果から状態を導く、React 推奨のパターン）
  const target = -tonicIdx * 30
  const [rot, setRot] = useState({ target, scale, angle: target })
  if (rot.target !== target || rot.scale !== scale) {
    let next = rot.angle + shortest(target - rot.angle)
    if (rot.scale !== scale) {
      // スケール変更: 主音の位置は保ったまま、ひと回り転がす
      next += SCALE_ORDER.indexOf(scale) > SCALE_ORDER.indexOf(rot.scale) ? 360 : -360
    }
    setRot({ target, scale, angle: next })
  }
  const angle = rot.angle

  const now = history[0]
  const prev = history[1]
  const nowPcs = pcsOf(now)
  const bassPc = now?.voicing ? now.voicing.bass % 12 : null
  const conn =
    now && prev
      ? connection(
          { rootPc: rootOf(prev), pcs: pcsOf(prev), func: prev.func },
          { rootPc: rootOf(now), pcs: pcsOf(now), func: now.func },
        )
      : null
  const held = new Set(conn?.common ?? [])

  // 余韻: 直近のコードで鳴っていた音ほど濃い灰色
  const recent = new Map()
  history.slice(1, 4).forEach((c, k) => {
    for (const pc of pcsOf(c)) if (!recent.has(pc)) recent.set(pc, k)
  })

  const nowPts = nowPcs.map(pc => point(circleIndex(pc), R_NODE))
  const links = []
  for (let a = 0; a < nowPts.length; a++) for (let b = a + 1; b < nowPts.length; b++) links.push([nowPts[a], nowPts[b]])

  const motion = conn ? motionPath(circleIndex(rootOf(prev)), circleIndex(rootOf(now))) : null
  const trail = history.slice(1, TRAIL + 1).map(c => circleIndex(rootOf(c)))
  const lit = conn ? Math.round(conn.strength * PIPS) : 0
  const stepsLabel = !conn ? '—' : conn.steps === 0 ? '±0' : conn.steps < 0 ? `←${-conn.steps}` : `→${conn.steps}`

  // 円の回転と、文字を正立させる逆回転（同じイージングで同時に動かす）
  const spin = { transform: `rotate(${angle}deg)` }
  const upright = (x, y) => ({ transform: `rotate(${-angle}deg)`, transformOrigin: `${x}px ${y}px` })

  return (
    <div className="cof" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <marker id="cof-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="cof__arrowhead" />
          </marker>
        </defs>


        <circle cx={C} cy={C} r={R_NODE + NODE_R + 3} className="cof__plate" />

        <g className="cof__drum" style={spin}>
          <circle cx={C} cy={C} r={R_NODE} className="cof__orbit" />
          <path d={arcPath(majorTonicIdx - 1.5, majorTonicIdx + 5.5, R_KEY)} className="cof__key" />

          {/* ルートの足跡（古いほど小さく薄い） */}
          {trail.map((idx, k) => {
            const [x, y] = point(idx, R_TRAIL)
            return <circle key={k} cx={x} cy={y} r={3.4 - k * 0.6} className="cof__trail" style={{ opacity: 0.75 - k * 0.15 }} />
          })}

          {/* 今のコード: 鳴っている音同士を細い線で結ぶ */}
          <g className="cof__now" key={now?.id ?? 'none'}>
            <path d={polygonPath(nowPcs, R_NODE)} className="cof__poly" />
            {links.map(([[x1, y1], [x2, y2]], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="cof__link" />
            ))}
            {/* 前のルート → 今のルート。つながりが強いほど太く濃い */}
            {motion && (
              <path
                d={motion}
                className="cof__motion"
                markerEnd="url(#cof-arrow)"
                style={{ strokeWidth: 1.2 + conn.strength * 3.3, opacity: 0.35 + conn.strength * 0.6 }}
              />
            )}
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
                {sounding && held.has(pc) && <circle cx={x} cy={y} r={NODE_R + 4.5} className="cof__held" />}
                <circle cx={x} cy={y} r={NODE_R} />
                <text x={x} y={y} dy="0.36em" textAnchor="middle" style={upright(x, y)}>
                  {spellPc(pc, { keyFlat })}
                </text>
              </g>
            )
          })}
        </g>

        {/* 中央の読み取り表示（回転しない） */}
        <g className="cof__readout">
          <text x={C} y={C - 6} textAnchor="middle" className="cof__steps">
            {stepsLabel}
          </text>
          {Array.from({ length: PIPS }, (_, i) => (
            <rect key={i} x={C - 23 + i * 9.5} y={C + 6} width="7" height="7" className={'cof__pip' + (i < lit ? ' is-on' : '')} />
          ))}
          <text x={C} y={C + 32} textAnchor="middle" className="cof__common">
            {conn ? `◎ ${conn.common.length}` : ''}
          </text>
        </g>
      </svg>
    </div>
  )
}
