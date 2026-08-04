import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCALES, getDefs, buildChord, midiToNoteName, getSubstituteChance } from './chordEngine.js'

// temperature=0 だと 7th/テンションの付与確率が 0 になり、buildChord は決定的（トライアドのみ）になる
const triad = (key, scale, degree) => buildChord(key, scale, degree, 0)

test('midiToNoteName maps MIDI numbers to pitch + octave', () => {
  assert.equal(midiToNoteName(60), 'C4')
  assert.equal(midiToNoteName(69), 'A4')
  assert.equal(midiToNoteName(36), 'C2')
})

test('major scale produces theoretically correct diatonic triads', () => {
  const defs = getDefs('major')
  const isMajor = d => d.relThird === 4 && d.relFifth === 7
  const isMinor = d => d.relThird === 3 && d.relFifth === 7
  const isDim = d => d.relThird === 3 && d.relFifth === 6

  assert.ok(isMajor(defs[0]), 'I is major')
  assert.ok(isMinor(defs[1]), 'ii is minor')
  assert.ok(isMinor(defs[2]), 'iii is minor')
  assert.ok(isMajor(defs[3]), 'IV is major')
  assert.ok(isMajor(defs[4]), 'V is major')
  assert.ok(isMinor(defs[5]), 'vi is minor')
  assert.ok(isDim(defs[6]), 'vii is diminished')

  // 7th: I/IV は maj7(+11)、V は dom7(+10)、ii/iii/vi は m7(+10)
  assert.equal(defs[0].relSeventh, 11)
  assert.equal(defs[4].relSeventh, 10)
  assert.equal(defs[1].relSeventh, 10)
})

test('natural minor scale produces theoretically correct diatonic triads', () => {
  const defs = getDefs('minor')
  assert.deepEqual(
    defs.map(d => [d.relThird, d.relFifth]),
    [
      [3, 7], // i  min
      [3, 6], // ii dim
      [4, 7], // III maj
      [3, 7], // iv min
      [3, 7], // v  min
      [4, 7], // VI maj
      [4, 7], // VII maj
    ],
  )
})

test('buildChord names common C-major chords correctly (triad, temp=0)', () => {
  assert.equal(triad('C', 'major', 0).name, 'C')
  assert.equal(triad('C', 'major', 1).name, 'Dm')
  assert.equal(triad('C', 'major', 4).name, 'G')
  assert.equal(triad('C', 'major', 6).name, 'B°')
})

test('buildChord emits roman numerals with correct case/suffix (current behavior)', () => {
  assert.equal(triad('C', 'major', 0).roman, 'I')
  // 現状仕様: 小文字ローマ数字に加えて 'm' も付く（例: iim）
  assert.equal(triad('C', 'major', 1).roman, 'iim')
  assert.equal(triad('C', 'major', 6).roman, 'vii°')
})

test('buildChord (triad, temp=0) has no added bass and stays in the voice-leading window', () => {
  const chord = triad('C', 'major', 0)
  for (const m of chord.midis) {
    assert.ok(m >= 55 && m <= 66, `tone ${m} sits in G3..F#4`)
  }
  // 音はユニーク & 昇順、トライアドの3音のみ（低音のルート重複なし）
  assert.deepEqual(chord.midis, [...chord.midis].sort((a, b) => a - b))
  assert.equal(chord.midis.length, 3)
})

test('degree wraps around the scale length', () => {
  const len = SCALES.major.intervals.length
  assert.equal(triad('C', 'major', len).name, triad('C', 'major', 0).name)
})

test('getSubstituteChance is 0 when disabled or at temperature 0, positive otherwise', () => {
  assert.equal(getSubstituteChance(0.5, false), 0)
  assert.equal(getSubstituteChance(0, true), 0)
  assert.ok(getSubstituteChance(0.3, true) > 0)
  assert.ok(getSubstituteChance(1, true) <= 0.6) // 上限クランプ
})

test('enableSubs does not alter chords at temperature 0 (stays diatonic/deterministic)', () => {
  // temperature=0 では代理確率が 0 なので、有効でもダイアトニックのまま
  assert.equal(buildChord('C', 'major', 1, 0, true).name, 'Dm')
  assert.equal(buildChord('A', 'minor', 4, 0, true).name, 'Em')
})

test('enableSubs can turn a diatonic minor chord into a non-diatonic secondary dominant', () => {
  // C major の ii(Dm) は代理で II7(D7 系, メジャー3度) になり得る
  let sawSecondaryDominant = false
  for (let i = 0; i < 300; i++) {
    const c = buildChord('C', 'major', 1, 1, true)
    // 代理成立時はルート D のメジャー系（'Dm' で始まらない 'D...'）になる
    if (c.name.startsWith('D') && !c.name.startsWith('Dm')) {
      sawSecondaryDominant = true
      assert.ok(c.name.includes('7'), `secondary dominant should carry a 7th: ${c.name}`)
    }
  }
  assert.ok(sawSecondaryDominant, 'ii should sometimes become a major-rooted secondary dominant')
})

test('enableSubs keeps midis finite, unique and ascending', () => {
  for (let i = 0; i < 200; i++) {
    const c = buildChord('C', 'major', i % 7, 0.8, true)
    assert.deepEqual(c.midis, [...c.midis].sort((a, b) => a - b))
    assert.equal(c.midis.length, new Set(c.midis).size)
    for (const m of c.midis) assert.ok(Number.isFinite(m))
  }
})

// 現状の挙動を丸ごと固定するゴールデンテスト（getDefs の可読化リファクタで壊さないための保険）
test('getDefs golden snapshot is stable across scales', () => {
  const snapshot = {}
  for (const name of Object.keys(SCALES)) {
    snapshot[name] = getDefs(name).map(d => [d.root, d.relThird, d.relFifth, d.relSeventh, d.relNinth])
  }
  assert.deepEqual(snapshot, {
    major: [
      [0, 4, 7, 11, 2],
      [2, 3, 7, 10, 2],
      [4, 3, 7, 10, 1],
      [5, 4, 7, 11, 2],
      [7, 4, 7, 10, 2],
      [9, 3, 7, 10, 2],
      [11, 3, 6, 10, 1],
    ],
    minor: [
      [0, 3, 7, 10, 2],
      [2, 3, 6, 10, 1],
      [3, 4, 7, 11, 2],
      [5, 3, 7, 10, 2],
      [7, 3, 7, 10, 1],
      [8, 4, 7, 11, 2],
      [10, 4, 7, 10, 2],
    ],
    majorPenta: [
      [0, 4, 7, 9, 2],
      [2, 2, 7, 10, 2],
      [4, 3, 8, 10, 3],
      [7, 2, 7, 9, 2],
      [9, 3, 7, 10, 3],
    ],
    minorPenta: [
      [0, 3, 7, 10, 3],
      [3, 4, 7, 9, 2],
      [5, 2, 7, 10, 2],
      [7, 3, 8, 10, 3],
      [10, 2, 7, 9, 2],
    ],
  })
})
