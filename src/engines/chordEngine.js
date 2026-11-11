import { describeChord, mod12 } from './theory.js';
import { voiceChord } from './voicing.js';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES = {
  major: { label: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPenta: { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPenta: { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
};

// 装飾（テンション / sus / 分数）の付与確率の係数。実際の確率は temperature^2 * 係数（上限1）。
const DECORATION_COEF = {
  seventh: 2.0,
  ninth: 1.0,
  eleventh: 0.5,
  thirteenth: 0.4,
  sus4: 0.35,
  slash: 0.5,
};

// 非ダイアトニックの代理コード（セカンダリードミナント / 借用和音）。
// 同じ度数スロットは保ったまま、コードの性質を半音単位で差し替える。
//   third: 3rd の相対半音（3=短3度→マイナー / 4=長3度→メジャー）
//   dom7 : true なら ♭7 を必ず付与してドミナント7thにする（セカンダリードミナント）
const SUBSTITUTIONS = {
  major: {
    0: [{ third: 4, dom7: true }],  // I7   = V7/IV
    1: [{ third: 4, dom7: true }],  // II7  = V7/V
    2: [{ third: 4, dom7: true }],  // III7 = V7/vi
    3: [{ third: 3, dom7: false }], // iv   借用（同主短調のサブドミナント）
    5: [{ third: 4, dom7: true }],  // VI7  = V7/ii
  },
  minor: {
    3: [{ third: 4, dom7: false }], // IV   ドリアン借用
    4: [{ third: 4, dom7: true }],  // V7   和声的短音階のドミナント
  },
};

// 代理コードの発生確率係数（enableSubs 有効時: temperature に比例）
const SUBSTITUTE_COEF = 0.55;

// 代理コード（非ダイアトニック）の発生確率。無効時や temperature=0 では 0（＝決定的）。
export function getSubstituteChance(temperature, enableSubs) {
  if (!enableSubs) return 0;
  return Math.min(temperature * SUBSTITUTE_COEF, 0.6);
}

// 各装飾の発生確率（temperature依存）を UI 表示用にまとめて返す
export function getDecorationChances(temperature) {
  const t = Math.pow(temperature, 2);
  const clamp = (x) => Math.min(x, 1);
  return [
    { key: '7th', prob: clamp(t * DECORATION_COEF.seventh) },
    { key: '9th', prob: clamp(t * DECORATION_COEF.ninth) },
    { key: '11th', prob: clamp(t * DECORATION_COEF.eleventh) },
    { key: '13th', prob: clamp(t * DECORATION_COEF.thirteenth) },
    { key: 'sus4', prob: clamp(t * DECORATION_COEF.sus4) },
    { key: '分数 (slash)', prob: clamp(t * DECORATION_COEF.slash) },
  ];
}

export function midiToNoteName(midi) {
  const noteIdx = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTES[noteIdx]}${octave}`;
}

function buildDefs(intervals) {
  if (!intervals) return [];
  const len = intervals.length;
  
  return intervals.map((_, i) => {
    const root = intervals[i];
    // 3rd/5th/7th/9th の理想音程(半音)に最も近いスケール構成音を、ルートから3オクターブ内で探す。
    // 7音スケールなら理論通りのダイアトニックコード、ペンタでは「最寄りのスケール音」になる。
    // 戻り値は1オクターブ内の相対半音。末尾の `|| %24` は、9th等がオクターブ上の同音(=0)へ
    // 潰れて構成音から消えるのを防ぐための保険。
    const getRel = (targetDegree) => {
      const targets = { 2: 3.5, 4: 7, 6: 10.5, 8: 14 };
      const targetSemitone = targets[targetDegree];
      let bestNote = intervals[0];
      let minDiff = 100;
      
      for (let j = 0; j < len * 3; j++) {
        const note = intervals[j % len] + Math.floor(j / len) * 12;
        const diff = Math.abs((note - root) - targetSemitone);
        if (diff < minDiff) {
          minDiff = diff;
          bestNote = note;
        }
      }
      return (bestNote - root + 36) % 12 || (bestNote - root + 36) % 24;
    };

    return {
      root,
      relThird: getRel(2),
      relFifth: getRel(4),
      relSeventh: getRel(6),
      relNinth: getRel(8),
    };
  });
}

/**
 * 度数から（装飾込みの）コード spec を作り、表示名とボイシングを付けて返す。
 * spec は キー相対のルート rel ＋ 構成音程 ivs ＋ ベース bassRel（任意）で表す（theory.js 参照）。
 * 戻り値の midis は直前のボイシングを考慮しない単発の配置。連続再生時は realizeChord で前のコードに繋げる。
 */
export function buildChord(key, scaleName, degree, temperature = 0.5, enableSubs = false) {
  const spec = buildChordSpec(scaleName, degree, temperature, enableSubs);
  return realizeChord(spec, key, scaleName, null);
}

export function buildChordSpec(scaleName, degree, temperature = 0.5, enableSubs = false) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  const intervals = scaleData.intervals;
  const defs = buildDefs(intervals);
  const deg = degree % intervals.length;
  const def = defs[deg];
  const isDiatonic = intervals.length === 7;
  const isDim = def.relFifth === 6;

  // --- 代理コード（非ダイアトニック）: dim 以外で、確率的にコードの性質を差し替える ---
  const subMode = scaleName === 'major' ? 'major' : scaleName === 'minor' ? 'minor' : null;
  let workThird = def.relThird;
  let forcedDom7 = false;
  let tag = null;
  if (subMode && !isDim && Math.random() < getSubstituteChance(temperature, enableSubs)) {
    const opts = SUBSTITUTIONS[subMode][deg % 7];
    if (opts) {
      const s = opts[Math.floor(Math.random() * opts.length)];
      workThird = s.third;
      forcedDom7 = s.dom7;
      tag = s.dom7 ? 'セカンダリー' : '借用';
    }
  }

  const ivs = [0, workThird, def.relFifth];
  const tensionProb = Math.pow(temperature, 2);

  // --- sus4: 3rd を完全4度に置換（dim以外）---
  let sus = false;
  if (!isDim && !forcedDom7 && Math.random() < tensionProb * DECORATION_COEF.sus4) {
    ivs[1] = 5;
    sus = true;
  }

  // --- 7th / 6th ---
  let seventh = null;
  if (forcedDom7) {
    seventh = 10;
  } else if (Math.random() < Math.min(tensionProb * DECORATION_COEF.seventh, 1.0)) {
    if ([9, 10, 11].includes(def.relSeventh)) seventh = def.relSeventh;
  }
  if (seventh != null) ivs.push(seventh);

  // --- 上部テンション (9 / 11 / 13) ---
  if (def.relNinth % 12 === 2 && Math.random() < tensionProb * DECORATION_COEF.ninth) ivs.push(14);
  const has7 = seventh === 10 || seventh === 11;
  if (isDiatonic && has7 && !sus && Math.random() < tensionProb * DECORATION_COEF.eleventh) {
    ivs.push(workThird === 4 ? 18 : 17); // メジャー3度とぶつかる 11 は #11 に
  }
  if (isDiatonic && seventh === 10 && workThird === 4 && !sus && Math.random() < tensionProb * DECORATION_COEF.thirteenth) {
    ivs.push(21);
  }

  // --- 分数コード: 一定確率でベースを3rd/5thに置いた転回形にする ---
  let bassRel = null;
  if (!sus && Math.random() < tensionProb * DECORATION_COEF.slash) {
    const chosen = [ivs[1], ivs[2]][Math.floor(Math.random() * 2)];
    bassRel = def.root + chosen;
  }

  return { rel: def.root, ivs, bassRel, degree: deg, tag };
}

/**
 * spec を具体的なコード（名前 / ローマ数字 / 音高）にする。
 * prevVoicing を渡すと、そこから最小の動きで繋がるボイシングを選ぶ。
 */
export function realizeChord(spec, key, scaleName, prevVoicing = null) {
  const keyPc = NOTES.indexOf(key);
  const mode = scaleName === 'minor' || scaleName === 'minorPenta' ? 'minor' : 'major';
  const { name, roman, rootPc } = describeChord(spec, keyPc, mode);
  const bassPc = spec.bassRel != null ? mod12(keyPc + spec.bassRel) : null;
  const voicing = voiceChord(rootPc, spec.ivs, bassPc, prevVoicing, spec.kind);
  return {
    ...spec,
    name,
    roman,
    rootPc, // 絶対ピッチクラス（キーが後で変わっても位置がずれないように）
    voicing,
    midis: voicing.midis,
    noteNames: voicing.midis.map(m => midiToNoteName(m)),
  };
}

export function getDefs(scaleName) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  return buildDefs(scaleData.intervals);
}