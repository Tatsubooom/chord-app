// ボイスリーディング: ベース＋上声（3〜5音）の具体的な音高を決める。
//
// - ベース: ルート（分数コードならその音）を低音域に置く。前のベースに近いオクターブを選ぶ。
// - 上声: 各構成音のオクターブ配置を総当たりし、
//   「前の上声からの移動量」「音域の中心からのずれ」「密集・濁り」の合計コストが最小の配置を選ぶ。
//   共通音は自然に保持され、クリシェの半音進行は1つの声部の動きとして現れる。

import { mod12 } from './theory.js'

export const BASS_LO = 36 // C2
export const BASS_HI = 50 // D3
export const UPPER_LO = 52 // E3
export const UPPER_HI = 77 // F5
const BASS_CENTER = 43
const UPPER_CENTER = 64
const MAX_UPPER_VOICES = 4

// 上声に載せる音（ピッチクラス）を重要度順に並べ、多すぎる場合は間引く
function upperTones(rootPc, ivs, bassPc, kind) {
  // 重要度: 3rd/7th > テンション > ルート > 5th
  const rank = iv => {
    const r = iv % 12
    if (iv >= 12) return 2
    if (r === 3 || r === 4 || r === 10 || r === 11) return 0
    if (r === 5 || r === 2 || r === 9 || r === 6 || r === 8) return 1 // sus / 6th / 変化5度
    if (r === 0) return 3
    return 4 // 完全5度
  }
  let list = [...new Set(ivs)].sort((a, b) => rank(a) - rank(b))
  if (kind === 'blk') list = list.filter(iv => iv !== 0) // ベースが担う
  let pcs = []
  for (const iv of list) {
    const pc = mod12(rootPc + iv)
    if (!pcs.includes(pc)) pcs.push(pc)
  }
  // ベースと同じ音は、他に十分な音があれば上声から外す（低音の重複を避ける）
  if (pcs.length > 3) pcs = pcs.filter(pc => pc !== bassPc || pcs.length <= 3)
  if (pcs.length > MAX_UPPER_VOICES) pcs = pcs.slice(0, MAX_UPPER_VOICES)
  return pcs
}

function candidatesFor(pc) {
  const out = []
  for (let m = UPPER_LO; m <= UPPER_HI; m++) if (mod12(m) === pc) out.push(m)
  return out
}

// 2つの音集合の距離（各音から相手の最寄り音への距離の和を両方向で）
function motionCost(a, b) {
  let c = 0
  for (const x of a) c += Math.min(...b.map(y => Math.abs(x - y)))
  for (const y of b) c += Math.min(...a.map(x => Math.abs(x - y)))
  return c / 2
}

function scoreUpper(notes, bass, prevUpper) {
  const sorted = [...notes].sort((a, b) => a - b)
  let cost = 0
  const lo = sorted[0]
  const hi = sorted[sorted.length - 1]
  const span = hi - lo
  if (span > 15) cost += (span - 15) * 2.5
  for (let i = 1; i < sorted.length; i++) {
    const iv = sorted[i] - sorted[i - 1]
    if (iv === 1) cost += 3.5 // 短2度の密集は濁りやすい
    if (iv <= 2 && sorted[i - 1] < 58) cost += 3 // 低い音域の密集はさらに濁る
    if (i >= 2 && sorted[i] - sorted[i - 2] <= 4) cost += 3 // 3音が団子になるクラスター
  }
  if (lo < 55) cost += (55 - lo) * 1.2
  if (lo - bass < 7) cost += 5
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length
  if (prevUpper && prevUpper.length) {
    cost += motionCost(sorted, prevUpper)
    cost += 0.4 * Math.abs(hi - Math.max(...prevUpper)) // メロディ的に聞こえる最上声も滑らかに
    cost += 0.35 * Math.abs(mean - UPPER_CENTER) // 長時間で音域が流れていかないように
  } else {
    cost += Math.abs(mean - UPPER_CENTER)
  }
  return cost
}

/**
 * @param {number} rootPc  絶対ピッチクラス（0=C）
 * @param {number[]} ivs   構成音程
 * @param {number|null} bassPc ベースのピッチクラス（null ならルート）
 * @param {{bass:number, upper:number[]}|null} prev 直前のボイシング
 * @param {string} [kind]
 * @returns {{bass:number, upper:number[], midis:number[]}}
 */
export function voiceChord(rootPc, ivs, bassPc, prev = null, kind = undefined) {
  const bPc = bassPc == null ? rootPc : mod12(bassPc)

  // ベース
  let bass = null
  let best = Infinity
  const ref = prev?.bass ?? BASS_CENTER
  for (let m = BASS_LO; m <= BASS_HI; m++) {
    if (mod12(m) !== bPc) continue
    const d = Math.abs(m - ref) + 0.3 * Math.abs(m - BASS_CENTER)
    if (d < best) { best = d; bass = m }
  }

  // 上声
  const pcs = upperTones(rootPc, ivs, bPc, kind)
  const options = pcs.map(candidatesFor)
  let bestUpper = null
  let bestCost = Infinity
  const pick = new Array(pcs.length)
  const walk = i => {
    if (i === pcs.length) {
      const c = scoreUpper(pick, bass, prev?.upper)
      if (c < bestCost) { bestCost = c; bestUpper = [...pick] }
      return
    }
    for (const m of options[i]) {
      pick[i] = m
      walk(i + 1)
    }
  }
  walk(0)

  const upper = (bestUpper || []).sort((a, b) => a - b)
  return { bass, upper, midis: [bass, ...upper] }
}
