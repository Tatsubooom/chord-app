import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chordSymbol, describeChord, spellPc } from './theory.js'

test('chordSymbol names common qualities', () => {
  const cases = [
    [[0, 4, 7], ''],
    [[0, 3, 7], 'm'],
    [[0, 3, 6], 'dim'],
    [[0, 3, 6, 9], 'dim7'],
    [[0, 3, 6, 10], 'm7(♭5)'],
    [[0, 4, 8], 'aug'],
    [[0, 4, 7, 9], '6'],
    [[0, 3, 7, 9], 'm6'],
    [[0, 4, 7, 10], '7'],
    [[0, 4, 7, 11], 'M7'],
    [[0, 3, 7, 10], 'm7'],
    [[0, 3, 7, 11], 'mM7'],
    [[0, 5, 7], 'sus4'],
    [[0, 5, 7, 10], '7sus4'],
    [[0, 4, 7, 14], 'add9'],
    [[0, 4, 7, 10, 14], '9'],
    [[0, 4, 7, 11, 14], 'M9'],
    [[0, 3, 7, 10, 14], 'm9'],
    [[0, 4, 7, 10, 13], '7(♭9)'],
    [[0, 4, 7, 10, 21], '7(13)'],
  ]
  for (const [ivs, sym] of cases) assert.equal(chordSymbol(ivs), sym, JSON.stringify(ivs))
})

test('describeChord spells slash chords and roman numerals', () => {
  // C キーの C/B♭（ベース下降クリシェの途中）
  const c = describeChord({ rel: 0, ivs: [0, 4, 7], bassRel: 10 }, 0)
  assert.equal(c.name, 'C/B♭')
  assert.equal(c.roman, 'I/♭VII')
})

test('describeChord writes the Blackadder chord as an augmented triad over the bass', () => {
  // C キーで G をベースにしたブラックアダー（G, D♭, F, A）= Faug/G
  const c = describeChord({ rel: 7, ivs: [0, 6, 10, 14], kind: 'blk' }, 0)
  assert.equal(c.name, 'Faug/G')
  assert.equal(c.roman, 'IVaug/V')
})

test('spellPc prefers flats on flat keys and flat-side degrees', () => {
  assert.equal(spellPc(10, { keyFlat: true }), 'B♭')
  assert.equal(spellPc(10, { keyFlat: false }), 'A#')
  assert.equal(spellPc(8, { rel: 8 }), 'A♭')
  assert.equal(spellPc(1, { rel: 1, spell: 'sharp' }), 'C#')
})
