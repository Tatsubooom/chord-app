const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES = {
  major: { label: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPenta: { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPenta: { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
};

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
  
  // ベース音はC2(36)〜B2(47)の音域に固定して低音の濁りを防ぐ
  const bassMidi = 36 + ((rootIdx + def.root) % 12);

  let offsets = [0, def.relThird, def.relFifth];
  let nameSuffix = (def.relThird === 3) ? 'm' : '';
  if (def.relFifth === 6) nameSuffix = '°';
  let tensionSuffix = '';

  const tensionProb = Math.pow(temperature, 2);
  const t7 = Math.min(tensionProb * 2.0, 1.0); 

  if (Math.random() < t7) {
    const s7 = def.relSeventh;
    if (s7 >= 9 && s7 <= 11) {
      offsets.push(s7);
      if (s7 === 11) tensionSuffix = 'maj7';
      else if (s7 === 10) tensionSuffix = '7';
      else if (s7 === 9) tensionSuffix = '6';
    }
  }

  if (Math.random() < tensionProb) {
    const n9 = def.relNinth % 12;
    if (!offsets.includes(n9) && n9 !== 0) {
      offsets.push(n9);
      tensionSuffix += (tensionSuffix ? '(9)' : 'add9');
    }
  }

  // Voice Leading（滑らかな繋がり）を実現するためのアルゴリズム
  // 構成音をすべて C4(60) に近い音域（G3(55)〜F#4(66)）に折り畳んで転回形を作る
  const chordTones = offsets.map(o => {
    const noteClass = (rootIdx + def.root + o) % 12;
    let midi = 60 + noteClass; // 一旦C4〜B4に配置
    if (midi > 66) midi -= 12; // G4以上なら1オクターブ下げてG3〜F#4に収める
    return midi;
  });

  const finalChordTones = Array.from(new Set(chordTones)).sort((a, b) => a - b);
  // ベース音と和音を結合
  const midis = [bassMidi, ...finalChordTones];

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

export function getDefs(scaleName) {
  const scaleData = SCALES[scaleName] || SCALES.major;
  return buildDefs(scaleData.intervals);
}