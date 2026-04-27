const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const MAJOR = [0,2,4,5,7,9,11]
const MINOR = [0,2,3,5,7,8,10]

const DEFS = {
  major: [
    { roman:'I',    offsets:[0,4,7] },
    { roman:'ii',   offsets:[0,3,7] },
    { roman:'iii',  offsets:[0,3,7] },
    { roman:'IV',   offsets:[0,4,7] },
    { roman:'V',    offsets:[0,4,7] },
    { roman:'vi',   offsets:[0,3,7] },
    { roman:'vii°', offsets:[0,3,6] },
  ],
  minor: [
    { roman:'i',    offsets:[0,3,7] },
    { roman:'ii°',  offsets:[0,3,6] },
    { roman:'III',  offsets:[0,4,7] },
    { roman:'iv',   offsets:[0,3,7] },
    { roman:'v',    offsets:[0,3,7] },
    { roman:'VI',   offsets:[0,4,7] },
    { roman:'VII',  offsets:[0,4,7] },
  ],
}

// ③ 各degreeの拡張音（7th/9th）
// temperature > 0.3 で7th付加、> 0.6 で9th付加
const EXTENSIONS = {
  major: [
    { suffix:'maj7', seventh:11, ninth:14 },   // I
    { suffix:'m7',   seventh:10, ninth:14 },   // ii
    { suffix:'m7',   seventh:10, ninth:null },  // iii
    { suffix:'maj7', seventh:11, ninth:14 },   // IV
    { suffix:'7',    seventh:10, ninth:14 },   // V（ドミナント7th）
    { suffix:'m7',   seventh:10, ninth:14 },   // vi
    { suffix:'m7b5', seventh:10, ninth:null },  // vii°
  ],
  minor: [
    { suffix:'m7',   seventh:10, ninth:14 },   // i
    { suffix:'m7b5', seventh:10, ninth:null },  // ii°
    { suffix:'maj7', seventh:11, ninth:null },  // III
    { suffix:'m7',   seventh:10, ninth:null },  // iv
    { suffix:'m7',   seventh:10, ninth:null },  // v
    { suffix:'maj7', seventh:11, ninth:14 },   // VI
    { suffix:'7',    seventh:10, ninth:null },  // VII
  ],
}

// ③ 代理コード（代理元 → 代理先の候補）
// temperature > 0.6 で確率的に適用
const SUBSTITUTIONS = {
  major: {
    0: [2, 5],   // I  → iii/vi（トニック代理）
    3: [1],      // IV → ii（サブドミナント代理）
    4: [6],      // V  → vii°（ドミナント代理）
  },
  minor: {
    0: [2, 5],   // i  → III/VI
    3: [1],      // iv → ii°
    4: [6],      // v  → VII
  },
}

export function buildChord(key, mode, degree, temperature = 0.5) {
  // 代理コードの適用（temperature > 0.6 で確率的に）
  let actualDegree = degree
  const subs = SUBSTITUTIONS[mode][degree]
  if (subs && temperature > 0.6 && Math.random() < (temperature - 0.6) * 0.8) {
    actualDegree = subs[Math.floor(Math.random() * subs.length)]
  }

  const rootIdx = NOTES.indexOf(key)
  const scale = mode === 'major' ? MAJOR : MINOR
  const def = DEFS[mode][actualDegree]
  const ext = EXTENSIONS[mode][actualDegree]
  const midiRoot = 48 + (rootIdx + scale[actualDegree]) % 12

  // 拡張音を温度に応じて追加
  const extraOffsets = []
  let suffix = ''
  if (temperature > 0.3 && ext.seventh != null) {
    extraOffsets.push(ext.seventh)
    suffix = ext.suffix
  }
  if (temperature > 0.6 && ext.ninth != null) {
    extraOffsets.push(ext.ninth)
    suffix = suffix.replace('7', '9')  // m7→m9, maj7→maj9, 7→9
  }

  return {
    name: NOTES[(rootIdx + scale[actualDegree]) % 12] + suffix,
    roman: def.roman + suffix,
    degree: actualDegree,  // パターンマッチングに必要
    midis: [...def.offsets, ...extraOffsets].map(o => midiRoot + o),
  }
}

export function getDefs(mode) {
  return DEFS[mode]
}