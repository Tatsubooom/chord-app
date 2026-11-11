import { useState } from 'react'
import { keyPrefersFlat, spellPc } from '../engines/theory'
import { circleIndex, connection } from '../engines/connection'
import { KEYS } from '../constants'

// 五度圏の上でコードを記号的に表示する。
//   ・今鳴っている音のノードを塗り、ノードの丸同士を細い線で直接結ぶ（ベース音は紫）
//   ・隣り合うノードの中心を結んだ12角形の内側だけに、ほんのり透ける台座を敷く
//     （ノードの外側半分・ノード同士の隙間・外側のキーの弧の周りはピアノロールが透けて見える）
//   ・前のコードから鳴り続けている音（共通音）のノードには外側のリング
//   ・前のコードのルート → 今のルートへの曲線の矢印。つながりが強いほど太く濃い
//   ・内側の小さな点は、直前数コードのルートの足跡（細い線で軌跡として繋ぐ）
//   ・前のコードの各声部 → 今の音へのボイスリーディング（紫の細い線。ベースは太め）
//   ・直前数コードの「音同士の線」を残像として薄く重ねる
//   ・外側の紫の弧は、今のキーのダイアトニック範囲（五度圏で隣り合う7音）
//   五度圏の並び（C が真上）は固定。キー / スケールを変えると、紫のキーの弧だけが
//   新しいダイアトニック範囲まで円に沿って滑らかに回り込む（弧の位置が同じならひと回りする）。
const SIZE = 300
const C = SIZE / 2
const R_NODE = 112 // ノードを並べる半径
const NODE_R = 19
const R_KEY = 145 // キーの弧（ノードの外側に、間を空けて沿わせる）
const R_TRAIL = 70 // ルートの足跡の半径
const TRAIL = 4 // 足跡として残すコード数
const GHOSTS = 3 // 残像として線を残すコード数

const rad = deg => ((deg - 90) * Math.PI) / 180
const point = (idx, r) => [C + r * Math.cos(rad(idx * 30)), C + r * Math.sin(rad(idx * 30))]
const pcsOf = chord => [...new Set((chord?.midis || []).map(m => m % 12))]
const rootOf = chord => (chord ? (chord.kind === 'blk' ? chord.voicing.bass % 12 : chord.rootPc) : null)
// -180〜180 に正規化（最短方向に回すため）
const shortest = d => ((((d + 180) % 360) + 360) % 360) - 180
// スケールの並び（スライドスイッチと同じ順）。下へ動かすと時計回り、上へ動かすと反時計回りに回る
const SCALE_ORDER = ['major', 'minor', 'majorPenta', 'minorPenta']

function polygonPath(pcs, r) {
  const pts = pcs
    .map(circleIndex)
    .sort((a, b) => a - b)
    .map(i => point(i, r))
  if (pts.length < 2) return ''
  return pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + (pts.length > 2 ? ' Z' : '')
}

// 隣り合うノードの中心を結んだ12角形
function dodecagonPath(r) {
  return (
    Array.from({ length: 12 }, (_, i) => point(i, r))
      .map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ') + ' Z'
  )
}

// 音どうしを全部結ぶ線分
function allLinks(pcs, r) {
  const pts = pcs.map(pc => point(circleIndex(pc), r))
  const out = []
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) out.push([pts[a], pts[b]])
  return out
}

// ノード間を、中心側へ少したわませて結ぶ曲線
function bowPath(fromIdx, toIdx, k = 0.22) {
  const [x1, y1] = point(fromIdx, R_NODE)
  const [x2, y2] = point(toIdx, R_NODE)
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${(mx + (C - mx) * k).toFixed(1)} ${(my + (C - my) * k).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

// 前のボイシングの各声部が、今のどの音へ動いたか（声部数が同じなら順番どおり、違えば最寄りの音へ）
function voiceMoves(prevV, nowV) {
  if (!prevV || !nowV) return []
  const a = [...prevV.upper].sort((x, y) => x - y)
  const b = [...nowV.upper].sort((x, y) => x - y)
  const pairs =
    a.length === b.length
      ? a.map((m, i) => [m, b[i]])
      : a.map(m => [m, b.reduce((best, n) => (Math.abs(n - m) < Math.abs(best - m) ? n : best), b[0])])
  const moves = pairs.filter(([x, y]) => x % 12 !== y % 12).map(([x, y]) => ({ from: x % 12, to: y % 12, bass: false }))
  if (prevV.bass % 12 !== nowV.bass % 12) moves.push({ from: prevV.bass % 12, to: nowV.bass % 12, bass: true })
  return moves
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

  // キーの弧の回転角（C メジャーの位置が 0°）。直前の角度から最短方向に回るよう累積で持つ
  // （前回のレンダー結果から状態を導く、React 推奨のパターン）
  const target = majorTonicIdx * 30
  const [rot, setRot] = useState({ target, scale, angle: target })
  if (rot.target !== target || rot.scale !== scale) {
    let next = rot.angle + shortest(target - rot.angle)
    if (rot.scale !== scale && next === rot.angle) {
      // スケールを変えても弧の位置が同じとき（メジャー ⇄ メジャーペンタ等）は、ひと回りさせて変化を見せる
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

  const arcSpin = { transform: `rotate(${angle}deg)` }

  return (
    <div className="cof" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          {/* 矢じり: 細長く、根元に切れ込みのあるシャープなダート形。線の太さに関わらず一定の大きさ */}
          <marker
            id="cof-arrow"
            viewBox="0 0 14 8"
            refX="11"
            refY="4"
            markerUnits="userSpaceOnUse"
            markerWidth="13"
            markerHeight="7.5"
            orient="auto-start-reverse"
          >
            <path d="M0 0.4 L14 4 L0 7.6 L4 4 Z" className="cof__arrowhead" />
          </marker>
        </defs>


        {/* キーの弧: C メジャーの位置に描いて、回転だけで新しい範囲へ動かす */}
        <path d={arcPath(-1.5, 5.5, R_KEY)} className="cof__key" style={arcSpin} />

        <g className="cof__ring">
          {/* 台座: 隣り合うノードの中心を結んだ12角形 */}
          <path d={dodecagonPath(R_NODE)} className="cof__plate" />
          <circle cx={C} cy={C} r={R_NODE} className="cof__orbit" />

          {/* 残像: 直前のコードの「音同士の線」（古いほど薄い） */}
          {history.slice(1, GHOSTS + 1).map((c, k) => (
            <g key={c.id} className="cof__ghost" style={{ opacity: 0.32 - k * 0.09 }}>
              {allLinks(pcsOf(c), R_NODE).map(([[x1, y1], [x2, y2]], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
            </g>
          ))}

          {/* ルートの軌跡（足跡の点を細い線で繋ぐ） */}
          {trail.length > 1 && (
            <polyline
              points={[circleIndex(rootOf(now)), ...trail].map(i => point(i, R_TRAIL).map(n => n.toFixed(1)).join(',')).join(' ')}
              className="cof__trail-line"
            />
          )}

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
            {/* ボイスリーディング: 前の各声部 → 今の音 */}
            {voiceMoves(prev?.voicing, now?.voicing).map((m, i) => (
              <path
                key={i}
                d={bowPath(circleIndex(m.from), circleIndex(m.to))}
                className={'cof__voice' + (m.bass ? ' is-bass' : '')}
              />
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
                <text x={x} y={y} dy="0.36em" textAnchor="middle">
                  {spellPc(pc, { keyFlat })}
                </text>
              </g>
            )
          })}
        </g>

      </svg>
    </div>
  )
}
