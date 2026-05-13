const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES = {
  major: { label: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPenta: { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPenta: { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
};

/**
 * MIDI番号をノート名（例: A4, C#3）に変換する
 */
export function midiToNoteName(midi) {
  const noteIdx = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTES[noteIdx]}${octave}`;
}

/**
 * スケール内の音度から適切な和音構成（3度、5度、7度、9度）を抽出する定義を生成
 */
function buildDefs(intervals) {
  if (!intervals) return [];
  const len = intervals.length;
  
  return intervals.map((_, i) => {
    const root = intervals[i];
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
  const midiRoot = 48 + (rootIdx + def.root) % 12;

  let offsets = [0, def.relThird, def.relFifth];
  let nameSuffix = (def.relThird === 3) ? 'm' : '';
  if (def.relFifth === 6) nameSuffix = '°';
  let tensionSuffix = '';

  const t7 = temperature * 1.2;
  if (Math.random() < t7) {
    const s7 = def.relSeventh;
    if (s7 >= 9 && s7 <= 11) {
      offsets.push(s7);
      if (s7 === 11) tensionSuffix = 'maj7';
      else if (s7 === 10) tensionSuffix = '7';
      else if (s7 === 9) tensionSuffix = '6';
    }
  }

  if (Math.random() < temperature) {
    const n9 = def.relNinth % 12;
    if (!offsets.includes(n9) && n9 !== 0) {
      offsets.push(n9);
      tensionSuffix += (tensionSuffix ? '(9)' : 'add9');
    }
  }

  const finalOffsets = Array.from(new Set(offsets)).sort((a, b) => a - b);
  const midis = [midiRoot - 12, ...finalOffsets.map(o => midiRoot + o)];

  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const baseRoman = romanNumerals[degree % 7] || (degree + 1).toString();
  const isMinor = nameSuffix === 'm' || nameSuffix === '°';
  const roman = (isMinor ? baseRoman.toLowerCase() : baseRoman) + nameSuffix + tensionSuffix;

  return {
    name: rootNoteName + nameSuffix + tensionSuffix,
    roman: roman,
    degree: degree % intervals.length,
    midis: midis,
    noteNames: midis.map(m => midiToNoteName(m)),
  };
}

// App.jsx から参照されるため、スケール名から定義を返す関数を追加してエクスポート
export function getDefs(scaleName) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  return buildDefs(scaleData.intervals);
}