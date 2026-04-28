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
  const sorted = [...new Set(offsets.filter(o => o < 12))].sort((a, b) => a - b);
  const s = JSON.stringify(sorted);
  if (s === '[0,3,7]') return { suffix: 'm' };
  if (s === '[0,4,7]') return { suffix: '' };
  if (s === '[0,3,6]') return { suffix: '°' };
  if (s === '[0,4,8]') return { suffix: 'aug' };
  if (s === '[0,2,7]') return { suffix: 'sus2' };
  if (s === '[0,5,7]') return { suffix: 'sus4' };
  return { suffix: '' };
}

function buildDefs(intervals) {
  if (!intervals) return [];
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

export function buildChord(key, scaleName, degree, temperature = 0.5) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  const intervals = scaleData.intervals;
  const defs = buildDefs(intervals);
  const def = defs[degree % intervals.length];
  
  const rootIdx = NOTES.indexOf(key);
  const rootNoteName = NOTES[(rootIdx + def.root) % 12];
  const midiRoot = 48 + (rootIdx + def.root) % 12;

  let offsets = [0, def.relThird, def.relFifth];
  let nameSuffix = detectChordType(offsets).suffix;
  let tensionSuffix = '';

  // 1. セブンスの出現確率
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

  // 2. テンション(add9)の出現確率を低下 (0.8 -> 0.2)
  if (Math.random() < (temperature * 0.2) && def.relNinth !== undefined) {
    offsets.push(def.relNinth + 12);
    tensionSuffix += (tensionSuffix ? '(9)' : 'add9');
  }

  // 3. sus4 への変異確率を低下 (0.3 -> 0.1)
  if (Math.random() < (temperature * 0.1) && (degree === 4 || degree === 0)) {
    offsets = [0, 5, 7];
    if (tensionSuffix.includes('7')) offsets.push(10);
    nameSuffix = 'sus4';
  }

  const finalOffsets = Array.from(new Set(offsets));
  
  // ボイシングの改善: ベース音にルートを任せ、上モノからルートを抜いてスッキリさせる
  const upperVoicing = finalOffsets.filter(o => o !== 0);
  const midis = [midiRoot - 12, ...upperVoicing.map(o => midiRoot + o)];

  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const baseRoman = romanNumerals[degree % 7] || '?';
  const isMinor = nameSuffix === 'm' || nameSuffix === '°';
  let roman = (isMinor ? baseRoman.toLowerCase() : baseRoman) + nameSuffix + tensionSuffix;

  return {
    name: rootNoteName + nameSuffix + tensionSuffix,
    roman: roman,
    degree: degree % intervals.length,
    midis: midis,
  };
}

export function getDefs(scaleName) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  return buildDefs(scaleData.intervals);
}