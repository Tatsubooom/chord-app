// ① 機能和声の遷移テーブル（from → toの強さ）
const TRANSITION = {
  major: [
    // to: I   ii  iii  IV   V   vi  vii°
    [       2,   3,   2,   5,   5,   4,   1  ],  // from I
    [       3,   1,   1,   2,   6,   2,   1  ],  // from ii   → V が強い
    [       2,   1,   1,   4,   3,   4,   1  ],  // from iii  → IV/vi
    [       3,   2,   1,   1,   6,   2,   1  ],  // from IV   → V が強い
    [       7,   1,   1,   2,   1,   3,   1  ],  // from V    → I（解決）
    [       2,   4,   1,   4,   3,   1,   1  ],  // from vi   → ii/IV
    [       6,   1,   1,   1,   2,   2,   1  ],  // from vii° → I
  ],
  minor: [
    // to: i   ii° III  iv   v   VI  VII
    [       2,   1,   2,   5,   4,   4,   3  ],  // from i
    [       2,   1,   1,   2,   6,   2,   2  ],  // from ii°  → v が強い
    [       2,   1,   1,   2,   2,   2,   5  ],  // from III  → VII
    [       3,   2,   1,   1,   5,   3,   2  ],  // from iv   → v
    [       5,   1,   2,   2,   1,   2,   3  ],  // from v    → i
    [       2,   1,   2,   4,   3,   1,   4  ],  // from VI   → iv/VII
    [       5,   1,   1,   2,   3,   2,   1  ],  // from VII  → i
  ],
}

// ② 著名なコード進行パターン
const PATTERNS = {
  major: [
    { seq: [0, 4, 5, 2, 3, 0, 3, 4] },  // カノン I-V-vi-iii-IV-I-IV-V
    { seq: [3, 4, 2, 5] },               // 王道   IV-V-iii-vi
    { seq: [0, 5, 3, 4] },               // 1645   I-vi-IV-V
    { seq: [5, 3, 0, 4] },               // 小室   vi-IV-I-V
    { seq: [1, 4, 0] },                  // ii-V-I（ジャズ基本）
  ],
  minor: [
    { seq: [0, 6, 5, 3] },              // i-VII-VI-iv
    { seq: [5, 3, 0, 4] },              // VI-iv-i-v
    { seq: [1, 4, 0] },                 // ii°-v-i
  ],
}

// 直近の履歴がパターンと一致するか調べ、次のコードにボーナスを加算
function calcPatternBonus(history, mode) {
  const bonus = new Array(7).fill(0)
  if (!history.length) return bonus

  // 古い順に並べた直近3コードのdegree列
  const recent = history.slice(0, 3).map(c => c.degree).reverse()

  PATTERNS[mode].forEach(({ seq }) => {
    for (let i = 0; i + recent.length < seq.length; i++) {
      if (recent.every((d, j) => d === seq[i + j])) {
        bonus[seq[i + recent.length]] += 3  // 次に来るべきコードを加点
      }
    }
  })

  return bonus
}


// メイン：各コードの重みを返す
export function calcWeights(currentDegree, history, mode, temperature, scaleLength = 7) {
  if (scaleLength !== 7 || !TRANSITION[mode]) {
    const flat = new Array(scaleLength).fill(1)
    return flat
  }
  const harmonic = [...TRANSITION[mode][currentDegree]]
  const pattern = calcPatternBonus(history, mode)
  const structured = harmonic.map((w, i) => w + pattern[i])

  // temperatureで均等にフラット化（0=構造的, 1=完全ランダム）
  const avg = structured.reduce((a, b) => a + b, 0) / structured.length
  return structured.map(w => w * (1 - temperature) + avg * temperature)
}

export function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  if (!total) return 0
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}