import { test } from 'node:test'
import assert from 'node:assert/strict'
import { voiceChord, BASS_LO, BASS_HI, UPPER_LO, UPPER_HI } from './voicing.js'

const pcs = notes => notes.map(m => m % 12).sort((a, b) => a - b)

test('voiceChord keeps bass and upper voices in their ranges', () => {
  for (let root = 0; root < 12; root++) {
    const v = voiceChord(root, [0, 4, 7, 11, 14], null)
    assert.ok(v.bass >= BASS_LO && v.bass <= BASS_HI)
    assert.equal(v.bass % 12, root)
    for (const m of v.upper) assert.ok(m >= UPPER_LO && m <= UPPER_HI)
    assert.ok(v.upper.length >= 3 && v.upper.length <= 4)
  }
})

test('voiceChord honours a slash bass', () => {
  const v = voiceChord(0, [0, 4, 7], 11) // C/B
  assert.equal(v.bass % 12, 11)
})

test('voiceChord moves smoothly from the previous voicing (C -> F keeps the common tone C)', () => {
  const c = voiceChord(0, [0, 4, 7], null)
  const f = voiceChord(5, [0, 4, 7], null, c)
  assert.deepEqual(pcs(f.upper), [0, 5, 9])
  const moved = f.upper.reduce((acc, m, i) => acc + Math.abs(m - c.upper[i]), 0)
  assert.ok(moved <= 4, `upper voices should move by small steps (moved ${moved})`)
  assert.ok(f.upper.some(m => c.upper.includes(m)), 'common tone is held')
})

test('cliché line C -> Caug -> C6 moves a single voice by half steps', () => {
  const a = voiceChord(0, [0, 4, 7], null)
  const b = voiceChord(0, [0, 4, 8], null, a)
  const c = voiceChord(0, [0, 4, 9], null, b)
  const diff = (x, y) => x.filter(m => !y.includes(m))
  assert.equal(diff(b.upper, a.upper).length, 1)
  assert.equal(diff(c.upper, b.upper).length, 1)
})
