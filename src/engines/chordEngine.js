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

export function buildChord(key, scaleName, degree, temperature = 0.5) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  const intervals = scaleData.intervals;
  const defs = buildDefs(intervals);
  const def = defs[degree % intervals.length];
  
  const rootIdx = NOTES.indexOf(key);
  const rootNoteName = NOTES[(rootIdx + def.root) % 12];
  const isDiatonic = intervals.length === 7;

  let offsets = [0, def.relThird, def.relFifth];
  let nameSuffix = (def.relThird === 3) ? 'm' : '';
  const isDim = def.relFifth === 6;
  if (isDim) nameSuffix = '°';

  const tensionProb = Math.pow(temperature, 2);

  // --- sus4: 3rd を完全4度に置換（dim以外）。長短の性質を失う ---
  let susLabel = '';
  if (!isDim && Math.random() < tensionProb * DECORATION_COEF.sus4) {
    offsets[1] = 5;
    nameSuffix = '';
    susLabel = 'sus4';
  }

  // --- 7th / 6th ---
  let seventhLabel = '';
  let has7 = false;
  const t7 = Math.min(tensionProb * DECORATION_COEF.seventh, 1.0);
  if (Math.random() < t7) {
    const s7 = def.relSeventh;
    if (s7 === 11) { offsets.push(11); seventhLabel = 'maj7'; has7 = true; }
    else if (s7 === 10) { offsets.push(10); seventhLabel = '7'; has7 = true; }
    else if (s7 === 9) { offsets.push(9); seventhLabel = '6'; } // 6thは厳密には7thではない
  }
  const has6 = offsets.includes(9);

  // --- 上部テンション (9 / 11 / 13) ---
  const tensionParts = [];
  // 9th
  if (Math.random() < tensionProb * DECORATION_COEF.ninth) {
    const n9 = def.relNinth % 12;
    if (!offsets.includes(n9) && n9 !== 0) { offsets.push(n9); tensionParts.push('9'); }
  }
  // 11th: メジャー3度とはぶつかるので major は #11、minor は natural 11。7音スケール・7th付き・sus無しのみ
  if (isDiatonic && has7 && !susLabel && Math.random() < tensionProb * DECORATION_COEF.eleventh) {
    const eleven = def.relThird === 4 ? 6 : 5;
    if (!offsets.includes(eleven)) { offsets.push(eleven); tensionParts.push(def.relThird === 4 ? '#11' : '11'); }
  }
  // 13th: ドミナント7th上のみ。6thと衝突する音なので6th無し時のみ
  if (isDiatonic && seventhLabel === '7' && !susLabel && !has6 && Math.random() < tensionProb * DECORATION_COEF.thirteenth) {
    offsets.push(9); tensionParts.push('13');
  }

  let extLabel = '';
  if (tensionParts.length) {
    // 7th等が無く 9th 単独なら add9 表記、それ以外は括弧でまとめる
    if (!has7 && seventhLabel === '' && tensionParts.length === 1 && tensionParts[0] === '9') extLabel = 'add9';
    else extLabel = '(' + tensionParts.join(',') + ')';
  }

  const tensionSuffix = seventhLabel + susLabel + extLabel;

  // Voice Leading（滑らかな繋がり）を実現するためのアルゴリズム
  // 構成音をすべて C4(60) に近い音域（G3(55)〜F#4(66)）に折り畳んで転回形を作る
  const chordTones = offsets.map(o => {
    const noteClass = (rootIdx + def.root + o) % 12;
    let midi = 60 + noteClass; // 一旦C4〜B4に配置
    if (midi > 66) midi -= 12; // G4以上なら1オクターブ下げてG3〜F#4に収める
    return midi;
  });
  const finalChordTones = Array.from(new Set(chordTones)).sort((a, b) => a - b);

  // --- 分数コード: 一定確率でベースを3rd/5thに置いた転回形にする ---
  let slashLabel = '';
  const bassMidis = [];
  if (!susLabel && Math.random() < tensionProb * DECORATION_COEF.slash) {
    const candidates = [offsets[1], offsets[2]].filter(o => o && o % 12 !== 0);
    if (candidates.length) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const bassClass = (rootIdx + def.root + chosen) % 12;
      let bassMidi = 48 + bassClass; // 和音域(55〜)より下に配置
      while (bassMidi >= 55) bassMidi -= 12;
      bassMidis.push(bassMidi);
      slashLabel = '/' + NOTES[bassClass];
    }
  }

  const midis = [...bassMidis, ...finalChordTones].sort((a, b) => a - b);

  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const baseRoman = romanNumerals[degree % 7] || (degree + 1).toString();
  const isMinor = nameSuffix === 'm' || nameSuffix === '°';
  const roman = (isMinor ? baseRoman.toLowerCase() : baseRoman) + nameSuffix + tensionSuffix;

  return {
    name: rootNoteName + nameSuffix + tensionSuffix + slashLabel,
    roman: roman,
    degree: degree % intervals.length,
    midis: midis,
    noteNames: midis.map(m => midiToNoteName(m)),
  };
}

export function getDefs(scaleName) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  return buildDefs(scaleData.intervals);
}