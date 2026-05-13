// 機能和声の遷移テーブル（基本の重み）
const TRANSITION = {
  major: [
    // to: I   ii  iii  IV   V   vi  vii°
    [       2,   3,   2,   5,   5,   4,   1  ],  // from I
    [       3,   1,   1,   2,   8,   2,   1  ],  // from ii
    [       2,   1,   1,   5,   3,   6,   1  ],  // from iii
    [       4,   3,   1,   1,   7,   2,   1  ],  // from IV
    [       9,   1,   1,   2,   1,   4,   1  ],  // from V
    [       2,   6,   1,   5,   3,   1,   1  ],  // from vi
    [       8,   1,   1,   1,   2,   2,   1  ],  // from vii°
  ],
  minor: [
    // to: i   ii° III  iv   v   VI  VII
    [       2,   1,   2,   5,   4,   4,   3  ],  // from i
    [       2,   1,   1,   2,   8,   2,   2  ],  // from ii°
    [       2,   1,   1,   3,   3,   6,   2  ],  // from III
    [       3,   2,   1,   1,   7,   2,   3  ],  // from iv
    [       7,   1,   1,   3,   1,   3,   1  ],  // from v
    [       2,   3,   1,   6,   3,   1,   5  ],  // from VI
    [       6,   1,   2,   1,   3,   3,   1  ],  // from VII
  ]
};

// 有名な進行パターン（クリシェを含む）
const PATTERNS = {
  major: [
    { name: '王道進行', seq: [3, 4, 2, 5], bonus: 12 }, // IV-V-iii-vi
    { name: 'カノン進行', seq: [0, 4, 5, 2, 3, 0, 3, 4], bonus: 14 }, // I-V-vi-iii-IV-I-IV-V
    { name: '小室進行', seq: [5, 3, 4, 0], bonus: 10 }, // vi-IV-V-I
    { name: 'ツーファイブ', seq: [1, 4, 0], bonus: 15 }, // ii-V-I
    { name: 'メジャークリシェ', seq: [0, 0, 0, 3], bonus: 20 }, // I-I(maj7)-I7-IV (同一ルート内変化を想定)
    { name: '下降クリシェ', seq: [5, 5, 5, 3], bonus: 18 }, // vi-vi(maj7)-vi7-IV
  ],
  minor: [
    { name: 'マイナークリシェ', seq: [0, 0, 0, 3], bonus: 20 }, // i-i(maj7)-i7-iv
    { name: '小室(Minor)', seq: [5, 3, 6, 0], bonus: 12 }, // VI-iv-VII-i
    { name: '2-5-1', seq: [1, 4, 0], bonus: 15 }, // ii°-v-i
    { name: 'アンダルシア', seq: [0, 6, 5, 4], bonus: 12 }, // i-VII-VI-V
  ]
};

// 代理コードの定義（判定を緩くするためのグループ）
const SUBSTITUTES = {
  0: [0, 5, 2], // I は vi, iii で代用
  1: [1, 3, 6], // ii は IV, vii° で代用
  2: [2, 0, 5], // iii は I, vi で代用
  3: [3, 1, 5], // IV は ii, vi で代用
  4: [4, 6],    // V は vii° で代用
  5: [5, 0, 3], // vi は I, IV で代用
  6: [6, 4, 1], // vii° は V, ii で代用
};

function isSimilar(degreeA, degreeB) {
  if (degreeA === degreeB) return true;
  const subs = SUBSTITUTES[degreeB % 7];
  return subs ? subs.includes(degreeA % 7) : false;
}

function calcPatternBonus(history, mode, temperature) {
  const bonus = new Array(7).fill(0);
  if (!history.length) return bonus;

  // 直近の履歴（古い順にソート）
  const recent = history.slice(0, 4).map(c => c.degree).reverse();
  const patterns = PATTERNS[mode] || PATTERNS.major;

  patterns.forEach(({ seq, bonus: value }) => {
    for (let i = 0; i < seq.length - 1; i++) {
      // 1〜3音の短いマッチでもボーナスを与える
      for (let matchLen = 1; matchLen <= Math.min(recent.length, 3); matchLen++) {
        const subRecent = recent.slice(-matchLen);
        const subPattern = seq.slice(i, i + matchLen);
        
        if (subRecent.every((d, idx) => isSimilar(d, subPattern[idx]))) {
          const nextIdx = i + matchLen;
          if (nextIdx < seq.length) {
            const targetDegree = seq[nextIdx] % 7;
            // Temperatureが低いほど、パターンの拘束力を強める
            bonus[targetDegree] += value * (1.8 - temperature);
          }
        }
      }
    }
  });

  return bonus;
}

export function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return 0;
}

export function calcWeights(currentDegree, history, mode, temperature, scaleLength = 7) {
  const table = TRANSITION[mode] || TRANSITION.major;
  const harmonic = [...(table[currentDegree % 7] || new Array(7).fill(1))];
  
  const patternBonus = calcPatternBonus(history, mode, temperature);
  
  // 重みの合成とスケーリング
  let finalWeights = harmonic.map((w, i) => {
    let combined = w + (patternBonus[i] || 0);
    // Temperatureが高いほど、重みの差を平坦にする（意外性を出す）
    return Math.pow(combined, 1.0 / (temperature + 0.5));
  });

  // スケール長に合わせたリサイズ
  if (finalWeights.length !== scaleLength) {
    const resized = new Array(scaleLength).fill(1);
    finalWeights.forEach((w, i) => { if (i < scaleLength) resized[i] = w; });
    return resized;
  }

  return finalWeights;
}