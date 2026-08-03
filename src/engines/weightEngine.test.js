import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weightedRandom, calcWeights, getPatternMatches } from './weightEngine.js'

test('weightedRandom always returns a valid in-range index', () => {
  const weights = [1, 2, 3, 4]
  for (let i = 0; i < 200; i++) {
    const idx = weightedRandom(weights)
    assert.ok(Number.isInteger(idx) && idx >= 0 && idx < weights.length)
  }
})

test('weightedRandom never picks a zero-weight bucket', () => {
  const weights = [0, 5, 0, 0]
  for (let i = 0; i < 200; i++) {
    assert.equal(weightedRandom(weights), 1)
  }
})

test('weightedRandom falls back to a valid index when all weights are zero', () => {
  const weights = [0, 0, 0]
  for (let i = 0; i < 50; i++) {
    const idx = weightedRandom(weights)
    assert.ok(idx >= 0 && idx < weights.length)
  }
})

test('weightedRandom roughly respects the distribution', () => {
  const weights = [1, 9] // 期待比 1:9
  let ones = 0
  const N = 20000
  for (let i = 0; i < N; i++) if (weightedRandom(weights) === 1) ones++
  const ratio = ones / N
  assert.ok(ratio > 0.82 && ratio < 0.96, `bucket1 ratio ${ratio} should be near 0.9`)
})

test('calcWeights returns finite non-negative weights of scale length', () => {
  for (const [mode, len] of [['major', 7], ['minor', 7], ['majorPenta', 5], ['minorPenta', 5]]) {
    const w = calcWeights(0, [], mode, 0.3, len)
    assert.equal(w.length, len)
    for (const x of w) assert.ok(Number.isFinite(x) && x >= 0)
  }
})

test('getPatternMatches reports the pattern that predicts the next chord', () => {
  // major の王道進行 seq=[3,4,2,5]。直近が IV(3) なら次の V(4) に王道進行が寄与するはず
  const contributors = getPatternMatches([{ degree: 3 }], 'major', 0.3, 7)
  assert.ok(
    contributors[4].some(m => m.name === '王道進行'),
    'IV -> V should be credited to 王道進行',
  )
})

test('getPatternMatches returns no contributions for empty history', () => {
  const contributors = getPatternMatches([], 'major', 0.3, 7)
  assert.equal(contributors.length, 7)
  assert.ok(contributors.every(list => list.length === 0))
})

test('calcWeights emphasizes strong transitions more at low temperature', () => {
  // major, from V(4): I(0) は最も重い遷移先のはず
  const cold = calcWeights(4, [], 'major', 0.05, 7)
  const argmax = cold.indexOf(Math.max(...cold))
  assert.equal(argmax, 0, 'V should most strongly pull toward I when temperature is low')
})
