const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const MAJOR = [0,2,4,5,7,9,11]
const MINOR = [0,2,3,5,7,8,10]
const DEFS = {
  major: [
    {roman:'I',   offsets:[0,4,7]},
    {roman:'ii',  offsets:[0,3,7]},
    {roman:'iii', offsets:[0,3,7]},
    {roman:'IV',  offsets:[0,4,7]},
    {roman:'V',   offsets:[0,4,7]},
    {roman:'vi',  offsets:[0,3,7]},
    {roman:'vii°',offsets:[0,3,6]},
  ],
  minor: [
    {roman:'i',   offsets:[0,3,7]},
    {roman:'ii°', offsets:[0,3,6]},
    {roman:'III', offsets:[0,4,7]},
    {roman:'iv',  offsets:[0,3,7]},
    {roman:'v',   offsets:[0,3,7]},
    {roman:'VI',  offsets:[0,4,7]},
    {roman:'VII', offsets:[0,4,7]},
  ],
}

export function buildChord(key, mode, degree) {
  const rootIdx = NOTES.indexOf(key)
  const scale = mode === 'major' ? MAJOR : MINOR
  const def = DEFS[mode][degree]
  const midiRoot = 48 + (rootIdx + scale[degree]) % 12
  return {
    name: NOTES[(rootIdx + scale[degree]) % 12],
    roman: def.roman,
    midis: def.offsets.map(o => midiRoot + o),
  }
}

export function getDefs(mode) {
  return DEFS[mode]
}