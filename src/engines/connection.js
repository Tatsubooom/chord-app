// 2つのコードの「つながりの強さ」を求める（五度圏の表示用）。
//
// 強さは 0〜1 で、次の3つの重み付き和:
//   ・共通音の割合（多いほど滑らかに繋がる）              … 40%
//   ・五度圏上のルートの動き（5度下行＝左回り1つが最強）  … 40%
//   ・和声機能の流れ（D→T の解決が最強）                  … 20%

/** ピッチクラス pc の五度圏上の位置（C=0, G=1, D=2, …） */
export const circleIndex = pc => (((pc * 7) % 12) + 12) % 12

/** 五度圏上でのルートの移動ステップ（-5〜+6。負 = 左回り = 5度下行の方向） */
export function circleSteps(fromPc, toPc) {
  const d = (((circleIndex(toPc) - circleIndex(fromPc)) % 12) + 12) % 12
  return d > 6 ? d - 12 : d
}

// ルートの動き（五度圏のステップ）ごとの強さ
const MOTION = {
  '-1': 1.0, // 5度下行（V→I, ii→V）。もっとも強い解決
  1: 0.7, // 5度上行
  '-3': 0.6, // 短3度下（I→vi）
  3: 0.6, // 長6度 / 平行調方向
  '-2': 0.5,
  2: 0.5,
  '-4': 0.45,
  4: 0.45,
  '-5': 0.5, // 半音の動き（裏コードの解決など）
  5: 0.5,
  6: 0.35, // 三全音
  0: 0.3, // 同じルート（色の変化だけ）
}

function functionFlow(from, to) {
  if (!from || !to) return 0.5
  if (from === 'D' && to === 'T') return 1
  if (from === 'SDm' && to === 'T') return 0.9
  if (from === 'SD' && to === 'D') return 0.8
  if (from === 'T' && to === 'SD') return 0.6
  if (from === 'D' && to === 'SD') return 0.3
  if (from === to) return 0.4
  return 0.5
}

/**
 * @param {{rootPc:number, pcs:number[], func?:string}} prev
 * @param {{rootPc:number, pcs:number[], func?:string}} now
 * @returns {{ strength:number, steps:number, common:number[] }}
 */
export function connection(prev, now) {
  const a = new Set(prev.pcs)
  const b = new Set(now.pcs)
  const common = [...b].filter(pc => a.has(pc))
  const commonRatio = Math.min(a.size, b.size) ? common.length / Math.min(a.size, b.size) : 0
  const steps = circleSteps(prev.rootPc, now.rootPc)
  const motion = MOTION[steps] ?? 0.4
  const strength = 0.4 * commonRatio + 0.4 * motion + 0.2 * functionFlow(prev.func, now.func)
  return { strength: Math.max(0, Math.min(1, strength)), steps, common }
}
