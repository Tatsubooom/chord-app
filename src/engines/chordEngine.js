// 音階の設定
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

//各スケールの音配置（全半全全半全...etc）
const MAJOR = [0,2,4,5,7,9,11]
const MINOR = [0,2,3,5,7,8,10]

//基本コード設定
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

// キーとスケール、各コードの重みから次コードを生成する
export function buildChord(key, mode, degree) {
  // キーからルート音を探す（ex. C → 0, F# → 6）
  const rootIdx = NOTES.indexOf(key)
  const scale = mode === 'major' ? MAJOR : MINOR

  // キー（第一引数）と、コード番号から音階配列を取得
  const def = DEFS[mode][degree]

  // ルート音（数字）から、ルート音（MIDI音階）を生成（48 = C3）
  const midiRoot = 48 + (rootIdx + scale[degree]) % 12

  // name: ”コード”のルート音をNoteから取得 (CメジャーのⅣ → F)
  // roman : def = ({roman : xx ,offsets[x,x,x]})からroman記号を取得
  // midis : offset[x,x,x]にmap関数でルート音（MIDI音階）を全ての項に足す
  return {
    name: NOTES[(rootIdx + scale[degree]) % 12],
    roman: def.roman,
    midis: def.offsets.map(x => x + midiRoot ),
  }
}

//スケールと基本コードの組み合わせを問い合せるだけの関数
export function getDefs(mode) {
  return DEFS[mode]
}