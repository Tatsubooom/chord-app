const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export const SCALES = {
  // 7音スケール
  major:       { label: 'Major',            intervals: [0,2,4,5,7,9,11] },
  minor:       { label: 'Natural minor',    intervals: [0,2,3,5,7,8,10] },
  dorian:      { label: 'Dorian',           intervals: [0,2,3,5,7,9,10] },
  phrygian:    { label: 'Phrygian',         intervals: [0,1,3,5,7,8,10] },
  lydian:      { label: 'Lydian',           intervals: [0,2,4,6,7,9,11] },
  mixolydian:  { label: 'Mixolydian',       intervals: [0,2,4,5,7,9,10] },
  locrian:     { label: 'Locrian',          intervals: [0,1,3,5,6,8,10] },
  harmonicMinor: { label: 'Harmonic minor', intervals: [0,2,3,5,7,8,11] },
  melodicMinor:  { label: 'Melodic minor',  intervals: [0,2,3,5,7,9,11] },
  // 5音スケール
  majorPenta:  { label: 'Major pentatonic', intervals: [0,2,4,7,9]      },
  minorPenta:  { label: 'Minor pentatonic', intervals: [0,3,5,7,10]     },
  // 異国スケール
  arabian:     { label: 'Arabian',          intervals: [0,2,4,5,6,8,10] },
  japanese:    { label: 'Japanese (In)',    intervals: [0,1,5,7,8]      },
  hungarian:   { label: 'Hungarian minor',  intervals: [0,2,3,6,7,8,11] },
  wholetone:   { label: 'Whole tone',       intervals: [0,2,4,6,8,10]   },
  diminished:  { label: 'Diminished',       intervals: [0,2,3,5,6,8,9,11] },
}

// 構成音のオフセットからコードの種類を判定
function detectChordType(offsets) {
  const third = offsets[1]
  const fifth  = offsets[2] ?? 7
  if (third === 4 && fifth === 7)  return { quality: '',    suffix: ''    }  // メジャー
  if (third === 3 && fifth === 7)  return { quality: 'm',   suffix: 'm'   }  // マイナー
  if (third === 3 && fifth === 6)  return { quality: 'dim', suffix: '°'   }  // ディミニッシュ
  if (third === 4 && fifth === 8)  return { quality: 'aug', suffix: '+'   }  // オーギュメント
  if (third === 2 && fifth === 7)  return { quality: 'sus2',suffix: 'sus2'}  // sus2
  if (third === 5 && fifth === 7)  return { quality: 'sus4',suffix: 'sus4'}  // sus4
  return { quality: '', suffix: '' }
}

// スケールの各音から3和音を自動生成
function buildDefs(intervals) {
  return intervals.map((_, i) => {
    const root  = intervals[i]
    const third = intervals[(i + Math.floor(intervals.length / 3.5)) % intervals.length]
    const fifth  = intervals[(i + Math.floor(intervals.length / 2))   % intervals.length]

    const relThird = (third - root + 12) % 12
    const relFifth = (fifth - root + 12) % 12
    const offsets  = [0, relThird, relFifth]
    const { suffix } = detectChordType(offsets)

    const degree = i + 1
    const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII']
    const roman = suffix === 'm' || suffix === '°'
      ? romanNumerals[i].toLowerCase() + suffix
      : romanNumerals[i] + suffix

    return { roman, offsets }
  })
}

export function buildChord(key, scale, degree, temperature = 0.5) {
  const scaleData  = SCALES[scale]
  const intervals  = scaleData.intervals
  const defs       = buildDefs(intervals)
  const def        = defs[degree]
  const rootIdx    = NOTES.indexOf(key)
  const midiRoot   = 48 + (rootIdx + intervals[degree]) % 12

  const rootInterval = intervals[degree]
  const extraOffsets = []
  let nameSuffix = ''

  if (temperature > 0.3) {
    // スケール内に短7度(10)か長7度(11)が存在するか調べる
    const minor7th = intervals.find(iv => (iv - rootInterval + 12) % 12 === 10)
    const major7th = intervals.find(iv => (iv - rootInterval + 12) % 12 === 11)

    if (major7th !== undefined) {
      extraOffsets.push(11)
      nameSuffix = 'maj7'
    } else if (minor7th !== undefined) {
      extraOffsets.push(10)
      nameSuffix = '7'
    }
  }

  return {
    name:   NOTES[(rootIdx + intervals[degree]) % 12] + (def.roman.includes('m') || def.roman.includes('°') ? def.roman.slice(-1) === '°' ? '°' : 'm' : '') + nameSuffix,
    roman:  def.roman,
    degree,
    midis:  [...def.offsets, ...extraOffsets].map(o => midiRoot + o),
  }
}

export function getDefs(scale) {
  return buildDefs(SCALES[scale].intervals)
}