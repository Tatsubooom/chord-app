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
  // 7音スケールのみ代理コードで一致判定する（ペンタトニックは厳密比較のまま）
  if (scaleLength === 7) {
    const subs = SUBSTITUTES[degreeB % 7];
    return subs ? subs.includes(degreeA % 7) : false;
  }
  return false; 
}

// スケール長に応じて有効なテーブル名（major/minor/majorPenta/minorPenta）を決める
function resolveMode(mode, scaleLength) {
  if (scaleLength === 5) return mode.startsWith('minor') ? 'minorPenta' : 'majorPenta';
  return mode;
}

// 直近履歴が定番進行の途中に一致していれば、次に来るべき度数へボーナスを加える。
// bonus: 度数ごとの加点、contributors: 度数ごとに寄与したパターン({name, matchLen, value})の一覧。
function calcPatternBonus(history, mode, temperature, scaleLength) {
  const bonus = new Array(scaleLength).fill(0);
  const contributors = Array.from({ length: scaleLength }, () => []);
  if (!history.length) return { bonus, contributors };

  const recent = history.slice(0, 4).map(c => c.degree).reverse();
  // ペンタトニックモードにも対応
  const patterns = PATTERNS[mode] || PATTERNS.major;

  patterns.forEach(({ name, seq, bonus: value }) => {
    for (let i = 0; i < seq.length - 1; i++) {
      for (let matchLen = 1; matchLen <= Math.min(recent.length, 3); matchLen++) {
        const subRecent = recent.slice(-matchLen);
        const subPattern = seq.slice(i, i + matchLen);

        if (subRecent.every((d, idx) => isSimilar(d, subPattern[idx], scaleLength))) {
          const nextIdx = i + matchLen;
          if (nextIdx < seq.length) {
            const targetDegree = seq[nextIdx] % scaleLength;
            const added = value * (1.8 - temperature);
            bonus[targetDegree] += added;
            // isFinal: この一手でパターンが最後まで完成する（＝進行の締め）
            contributors[targetDegree].push({
              name,
              matchLen,
              value: added,
              isFinal: nextIdx === seq.length - 1,
            });
          }
        }
      }
    }
  });

  return { bonus, contributors };
}

// 与えられた履歴に対し、各度数に寄与した定番進行パターンの一覧を返す（UI通知用）。
export function getPatternMatches(history, mode, temperature, scaleLength = 7) {
  const effectiveMode = resolveMode(mode, scaleLength);
  return calcPatternBonus(history, effectiveMode, temperature, scaleLength).contributors;
}

// ---- 音楽理論による補正 --------------------------------------------------
// ダイアトニック各度数のルート半音（機能和声・5度圏のルート進行の計算に使う）
const SCALE_ROOTS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

// 各度数の和声機能: T(トニック) / SD(サブドミナント) / D(ドミナント)
const FUNCTION = {
  major: ['T', 'SD', 'T', 'SD', 'D', 'T', 'D'], // I ii iii IV V vi vii°
  minor: ['T', 'SD', 'T', 'SD', 'D', 'SD', 'D'], // i ii° III iv v VI VII
};

// ルート進行の質（現コード→次コードのルート移動・半音単位, 0-11）。
// 下降5度(=+5)が最も自然な「解決」、下降3度は共通音が多く滑らか、上行2度は定番。
const ROOT_MOTION_MULT = {
  5: 1.6, // 下降完全5度 / 上行完全4度: V→I, ii→V。最も強い進行
  9: 1.3, // 下降短3度: I→vi など、共通音2つで滑らか
  8: 1.25, // 下降長3度: I→VI(b) 等
  2: 1.2, // 上行長2度: IV→V, I→ii
  10: 1.1, // 下降長2度
  3: 1.05, // 上行短3度
  4: 1.05, // 上行長3度
  7: 1.05, // 上行完全5度: T→D は可
  0: 0.4, // 同じルートの停滞は強く抑制
  6: 0.85, // 三全音移動は控えめ
  1: 0.9,
  11: 1.0,
};

function functionMult(curF, nextF) {
  if (curF === 'D' && nextF === 'T') return 1.45; // ドミナント→トニックの解決
  if (curF === 'D' && nextF === 'SD') return 0.5; // 逆行(retrogression)を抑制
  if (curF === 'SD' && nextF === 'D') return 1.35; // 準備→ドミナント
  if (curF === 'SD' && nextF === 'T') return 1.1; // 変終止(plagal)
  if (curF === 'T' && nextF === 'SD') return 1.15; // 前進 T→SD
  if (curF === 'T' && nextF === 'D') return 1.1;
  if (curF === 'T' && nextF === 'T') return 0.85; // トニック内の停滞は控えめ
  return 1.0;
}

// 現コードから各度数へ進むときの理論スコア（乗数）を返す。7音ダイアトニックのみ適用。
function calcTheoryMultipliers(currentDegree, mode, scaleLength) {
  if (scaleLength !== 7 || !SCALE_ROOTS[mode]) return new Array(scaleLength).fill(1);

  const roots = SCALE_ROOTS[mode];
  const funcs = FUNCTION[mode];
  const cur = currentDegree % 7;

  return roots.map((_, i) => {
    const motion = (roots[i] - roots[cur] + 12) % 12;
    const rootMult = ROOT_MOTION_MULT[motion] ?? 1.0;
    return rootMult * functionMult(funcs[cur], funcs[i]);
  });
}

// ---- フレーズ（小節ブロック）単位のテンプレート -----------------------------
// より大きな塊で進行を確率選択し、フレーズごとに骨格を変えて単調なループを避ける。
// seq は各小節の頭に狙う度数（0-indexed）。フレーズ長は seq.length 小節。
const PHRASE_TEMPLATES = {
  major: [
    { name: '王道', seq: [3, 4, 2, 5], w: 3 },
    { name: 'カノン', seq: [0, 4, 5, 2, 3, 0, 3, 4], w: 2 },
    { name: '小室', seq: [5, 3, 4, 0], w: 3 },
    { name: '50s', seq: [0, 5, 3, 4], w: 3 },
    { name: 'Axis', seq: [0, 4, 5, 3], w: 3 },
    { name: 'PopPunk', seq: [5, 3, 0, 4], w: 2 },
    { name: 'ターンアラウンド', seq: [0, 5, 1, 4], w: 2 },
    { name: 'JustTheTwoOfUs', seq: [3, 2, 5, 0], w: 2 },
    { name: '上行', seq: [0, 1, 2, 3], w: 1 },
    { name: 'サブドミナント往復', seq: [0, 3, 0, 4], w: 1 },
  ],
  minor: [
    { name: 'アンダルシア', seq: [0, 6, 5, 4], w: 3 },
    { name: 'エピック', seq: [0, 5, 2, 6], w: 3 },
    { name: 'i-iv-v', seq: [0, 3, 4, 0], w: 3 },
    { name: '小室m', seq: [5, 3, 6, 0], w: 2 },
    { name: 'VI-VII-i', seq: [5, 6, 0, 0], w: 2 },
    { name: 'III往来', seq: [0, 2, 6, 3], w: 1 },
    { name: 'i-VI-VII', seq: [0, 5, 6, 0], w: 2 },
  ],
  majorPenta: [
    { name: 'ペンタ1', seq: [0, 3, 4, 0], w: 3 },
    { name: 'ペンタ2', seq: [0, 2, 3, 0], w: 2 },
    { name: 'ペンタ3', seq: [4, 3, 0, 0], w: 2 },
  ],
  minorPenta: [
    { name: 'ペンタm1', seq: [0, 2, 3, 0], w: 3 },
    { name: 'ペンタm2', seq: [0, 4, 2, 0], w: 2 },
    { name: 'ロック', seq: [0, 1, 4, 0], w: 2 },
  ],
};

// フレーズ目標度数を後押しする強さ（temperature が高いほど緩む）
const PHRASE_TARGET_STRENGTH = 10;

// 直前と同じにならないよう避けつつ、重み付きでフレーズテンプレートを1つ選ぶ
export function pickPhraseTemplate(mode, scaleLength, avoidName) {
  const effectiveMode = resolveMode(mode, scaleLength);
  const list = PHRASE_TEMPLATES[effectiveMode] || PHRASE_TEMPLATES.major;
  const pool = list.filter((t) => t.name !== avoidName);
  const from = pool.length ? pool : list;
  const total = from.reduce((a, t) => a + t.w, 0);
  let r = Math.random() * total;
  for (const t of from) {
    if (r < t.w) return t;
    r -= t.w;
  }
  return from[0];
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

export function calcWeights(currentDegree, history, mode, temperature, scaleLength = 7, target = null) {
  // スケール長に合わせて適切なテーブルを選択
  const effectiveMode = resolveMode(mode, scaleLength);

  const table = TRANSITION[effectiveMode] || TRANSITION.major;
  const harmonic = [...(table[currentDegree % scaleLength] || new Array(scaleLength).fill(1))];

  const { bonus: patternBonus } = calcPatternBonus(history, effectiveMode, temperature, scaleLength);
  const theory = calcTheoryMultipliers(currentDegree, effectiveMode, scaleLength);
  const exponent = 2.5 - (temperature * 2.0);

  let finalWeights = harmonic.map((w, i) => {
    const combined = w + (patternBonus[i] || 0);
    // 理論補正は temperature が高いほど弱める（＝多様性を優先）
    let mult = 1 + (theory[i] - 1) * (1 - temperature);
    // フレーズ骨格の目標度数（小節頭）を強く後押し。temperature が高いほど緩む。
    // 理論のペナルティ(同一ルート等)に負けないよう下限1でクランプしてから加勢する
    if (target != null && i === target % scaleLength) {
      mult = Math.max(mult, 1) * (1 + PHRASE_TARGET_STRENGTH * (1 - temperature));
    }
    return Math.pow(combined * mult, exponent);
  });

  if (finalWeights.length !== scaleLength) {
    const resized = new Array(scaleLength).fill(1);
    finalWeights.forEach((w, i) => { if (i < scaleLength) resized[i] = w; });
    return resized;
  }

  return finalWeights;
}