const TRANSITION = {
  major: [
    [       1,   2,   2,   7,   5,   6,   1  ],  // from I
    [       1,   1,   1,   3,   9,   2,   1  ],  // from ii
    [       1,   1,   1,   6,   1,   7,   1  ],  // from iii
    [       5,   2,   4,   1,   8,   1,   1  ],  // from IV
    [       8,   1,   3,   1,   1,   5,   1  ],  // from V
    [       1,   6,   1,   6,   2,   1,   1  ],  // from vi
    [       8,   1,   1,   1,   1,   2,   1  ],  // from vii°
  ],
  minor: [
    [       1,   1,   3,   6,   3,   6,   4  ],  // from i
    [       1,   1,   1,   1,   8,   2,   2  ],  // from ii°
    [       1,   1,   1,   4,   1,   6,   2  ],  // from III
    [       3,   2,   3,   1,   7,   1,   3  ],  // from iv
    [       8,   1,   1,   1,   1,   4,   1  ],  // from v
    [       1,   3,   1,   6,   2,   1,   5  ],  // from VI
    [       5,   1,   4,   1,   1,   1,   1  ],  // from VII
  ],
  majorPenta: [
    [       1,   2,   2,   5,   4  ], // from 0(I)
    [       2,   1,   1,   4,   2  ], // from 1(II)
    [       1,   1,   1,   2,   5  ], // from 2(III)
    [       5,   1,   1,   1,   2  ], // from 3(V)
    [       2,   3,   1,   4,   1  ], // from 4(VI)
  ],
  minorPenta: [
    [       1,   3,   4,   5,   4  ], // from 0(i)
    [       1,   1,   4,   2,   2  ], // from 1(III)
    [       3,   1,   1,   5,   2  ], // from 2(iv)
    [       6,   1,   1,   1,   4  ], // from 3(v)
    [       4,   2,   1,   1,   1  ], // from 4(VII)
  ]
};

const PATTERNS = {
  major: [
    { name: '王道進行', seq: [3, 4, 2, 5], bonus: 15 },
    { name: 'カノン進行', seq: [0, 4, 5, 2, 3, 0, 3, 4], bonus: 15 },
    { name: '小室進行', seq: [5, 3, 4, 0], bonus: 12 },
    { name: 'ツーファイブ', seq: [1, 4, 0], bonus: 18 },
    { name: 'JustTheTwoOfUs', seq: [3, 2, 5, 0], bonus: 14 },
    { name: 'サブドミナント終止', seq: [3, 0], bonus: 10 },
    { name: 'ポップス展開', seq: [0, 3, 4, 5], bonus: 12 },
  ],
  minor: [
    { name: '小室(Minor)', seq: [5, 3, 6, 0], bonus: 15 },
    { name: '2-5-1', seq: [1, 4, 0], bonus: 18 },
    { name: 'アンダルシア', seq: [0, 6, 5, 4], bonus: 12 },
    { name: 'マイナー展開', seq: [5, 6, 0], bonus: 12 },
  ],
  majorPenta: [
    { name: 'ペンタ進行1', seq: [0, 3, 4], bonus: 15 }, 
    { name: 'ペンタ進行2', seq: [4, 3, 0], bonus: 12 }, 
  ],
  minorPenta: [
    { name: 'ペンタマイナー1', seq: [0, 2, 3], bonus: 15 }, 
    { name: 'ロックリフ的', seq: [0, 1, 2], bonus: 12 }, 
  ]
};

// 代理コードのグループ定義 (Tonic, Subdominant, Dominant)
const SUBSTITUTES = {
  0: [0, 5, 2], // I (T) は vi, iii で代理
  1: [1, 3],    // ii (SD) は IV で代理
  2: [2, 0, 5], // iii (T) は I, vi で代理
  3: [3, 1],    // IV (SD) は ii で代理
  4: [4, 6],    // V (D) は vii° で代理
  5: [5, 0],    // vi (T) は I で代理
  6: [6, 4],    // vii° (D) は V で代理
};

function isSimilar(degreeA, degreeB, scaleLength) {
  if (degreeA === degreeB) return true;
  // ペンタトニック（5音）の場合は代理コードの判定を行わず厳密に比較する
  if (scaleLength === 7) {
    const subs = SUBSTITUTES[degreeB % 7];
    return subs ? subs.includes(degreeA % 7) : false;
  }
  return false; 
}

function calcPatternBonus(history, mode, temperature, scaleLength) {
  const bonus = new Array(scaleLength).fill(0);
  if (!history.length) return bonus;

  const recent = history.slice(0, 4).map(c => c.degree).reverse();
  // ペンタトニックモードにも対応
  const patterns = PATTERNS[mode] || PATTERNS.major;

  patterns.forEach(({ seq, bonus: value }) => {
    for (let i = 0; i < seq.length - 1; i++) {
      for (let matchLen = 1; matchLen <= Math.min(recent.length, 3); matchLen++) {
        const subRecent = recent.slice(-matchLen);
        const subPattern = seq.slice(i, i + matchLen);
        
        if (subRecent.every((d, idx) => isSimilar(d, subPattern[idx], scaleLength))) {
          const nextIdx = i + matchLen;
          if (nextIdx < seq.length) {
            const targetDegree = seq[nextIdx] % scaleLength;
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
  // スケール長に合わせて適切なテーブルを選択
  let effectiveMode = mode;
  if (scaleLength === 5) {
    effectiveMode = mode.startsWith('minor') ? 'minorPenta' : 'majorPenta';
  }
  
  const table = TRANSITION[effectiveMode] || TRANSITION.major;
  const harmonic = [...(table[currentDegree % scaleLength] || new Array(scaleLength).fill(1))];
  
  const patternBonus = calcPatternBonus(history, effectiveMode, temperature, scaleLength);
  const exponent = 2.5 - (temperature * 2.0);
  
  let finalWeights = harmonic.map((w, i) => {
    let combined = w + (patternBonus[i] || 0);
    return Math.pow(combined, exponent);
  });

  if (finalWeights.length !== scaleLength) {
    const resized = new Array(scaleLength).fill(1);
    finalWeights.forEach((w, i) => { if (i < scaleLength) resized[i] = w; });
    return resized;
  }

  return finalWeights;
}