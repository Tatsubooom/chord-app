import { test } from 'node:test'
import assert from 'node:assert/strict'
import { circleIndex, circleSteps, connection } from './connection.js'

const chord = (rootPc, ivs, func) => ({ rootPc, pcs: ivs.map(i => (rootPc + i) % 12), func })

test('circleIndex places notes on the circle of fifths', () => {
  assert.equal(circleIndex(0), 0) // C
  assert.equal(circleIndex(7), 1) // G
  assert.equal(circleIndex(5), 11) // F
})

test('circleSteps is negative for a falling fifth (counter-clockwise)', () => {
  assert.equal(circleSteps(7, 0), -1) // G -> C
  assert.equal(circleSteps(0, 7), 1) // C -> G
  assert.equal(circleSteps(0, 6), 6) // tritone
})

test('V7 -> I is a stronger connection than I -> bII', () => {
  const g7 = chord(7, [0, 4, 7, 10], 'D')
  const c = chord(0, [0, 4, 7], 'T')
  const db = chord(1, [0, 4, 7], 'D')
  assert.ok(connection(g7, c).strength > connection(c, db).strength)
})

test('common tones are reported (C -> Am shares C and E)', () => {
  const r = connection(chord(0, [0, 4, 7], 'T'), chord(9, [0, 3, 7], 'T'))
  assert.deepEqual(r.common.sort((a, b) => a - b), [0, 4])
  assert.ok(r.strength >= 0 && r.strength <= 1)
})
