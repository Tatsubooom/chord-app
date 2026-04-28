const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES = {
  major: { label: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { label: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { label: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  locrian: { label: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  harmonicMinor: { label: 'Harmonic minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor: { label: 'Melodic minor', intervals: [0, 2, 3, 5, 7, 9, 11] },
  majorPenta: { label: 'Major pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPenta: { label: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10] },
};

function detectChordType(offsets) {
  const sorted = [...offsets].filter(o => o < 12).sort((a, b) => a - b);
  const s = JSON.stringify(Array.from(new Set(sorted)));
  if (s === '[0,3,7]') return { suffix: 'm' };
  if (s === '[0,4,7]') return { suffix: '' };
  if (s === '[0,3,6]') return { suffix: '°' };
  if (s === '[0,4,8]') return { suffix: 'aug' };
  if (s === '[0,2,7]') return { suffix: 'sus2' };
  if (s === '[0,5,7]') return { suffix: 'sus4' };
  return { suffix: '' };
}

function buildDefs(intervals) {
  const len = intervals.length;
  const step = len >= 7 ? 2 : 1;
  return intervals.map((_, i) => {
    const root = intervals[i];
    const third = intervals[(i + step) % len];
    const fifth = intervals[(i + step * 2) % len];
    const seventh = intervals[(i + step * 3) % len];
    const ninth = intervals[(i + step * 4) % len];
    return {
      root,
      relThird: (third - root + 12) % 12,
      relFifth: (fifth - root + 12) % 12,
      relSeventh: (seventh - root + 12) % 12,
      relNinth: (ninth - root + 12) % 12,
    };
  });
}

export function buildChord(key, scale, degree, temperature = 0.5) {
  const scaleData = SCALES[scale];
  const intervals = scaleData.intervals;
  const defs = buildDefs(intervals);
  const def = defs[degree % intervals.length];
  
  const rootIdx = NOTES.indexOf(key);
  const rootNoteName = NOTES[(rootIdx + def.root) % 12];
  const midiRoot = 48 + (rootIdx + def.root) % 12;

  let offsets = [0, def.relThird, def.relFifth];
  let nameSuffix = detectChordType(offsets).suffix;
  let tensionSuffix = '';

  // --- 確率ベースのテンション付与 (Temperature 0.0 ~ 1.0) ---
  
  // 1. セブンスの出現確率 (Temperatureに比例)
  if (Math.random() < temperature && intervals.length >= 7) {
    if (def.relSeventh === 11) {
      offsets.push(11);
      tensionSuffix = 'maj7';
    } else if (def.relSeventh === 10) {
      offsets.push(10);
      tensionSuffix = '7';
    } else if (def.relSeventh === 9) {
      offsets.push(9);
      tensionSuffix = '6';
    }
  }

  // 2. テンション add9 の出現確率 (Temperatureに比例)
  if (Math.random() < temperature && def.relNinth !== undefined) {
    // 9度は濁りを避けるため常に高いオクターブに配置
    offsets.push(def.relNinth + 12);
    tensionSuffix += (tensionSuffix.includes('7') || tensionSuffix.includes('6') ? '(9)' : 'add9');
  }

  // 3. sus4 への差し替え確率 (Temperatureに比例 / 主にV度やI度で発生しやすい)
  // ここでは degree 4 (V) または 0 (I) のときに発生しやすく設定
  if (Math.random() < (temperature * 0.4) && (degree === 4 || degree === 0)) {
    offsets = [0, 5, 7];
    nameSuffix = 'sus4';
    // sus4 の時もセブンスが乗る可能性を残す
    if (tensionSuffix.includes('7')) offsets.push(10);
  }

  // 最終的なMIDIノート番号の生成（重複削除）
  const chordNotes = Array.from(new Set(offsets));
  const midis = [
    midiRoot - 12, // ベース音を1オクターブ下に追加
    ...chordNotes.map(o => midiRoot + o)
  ];

  // 表示用ローマ数字の正規化
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const baseRoman = romanNumerals[degree % 7] || 'I';
  const isMinor = nameSuffix === 'm' || nameSuffix === '°';
  let roman = (isMinor ? baseRoman.toLowerCase() : baseRoman) + nameSuffix + tensionSuffix;

  return {
    name: rootNoteName + nameSuffix + tensionSuffix,
    roman: roman,
    degree,
    midis: midis,
  };
}

export function getDefs(intervals) {
  return buildDefs(intervals);
}