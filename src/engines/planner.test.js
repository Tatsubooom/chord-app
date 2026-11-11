import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planSection, SECTION_BARS } from './planner.js'
import { SCALES } from './chordEngine.js'

const SCALE_NAMES = Object.keys(SCALES)
const pcsOf = spec => [
  ...spec.ivs.map(iv => (spec.rel + iv) % 12),
  ...(spec.bassRel != null ? [spec.bassRel % 12] : []),
].map(x => (x + 12) % 12)

function run(settings, sections = 6) {
  let ctx = {}
  const all = []
  for (let i = 0; i < sections; i++) {
    const r = planSection(settings, ctx)
    ctx = r.nextCtx
    all.push(r)
  }
  return all
}

test('every section fills exactly 8 bars and no chord crosses a bar line', () => {
  for (const scale of SCALE_NAMES) {
    for (const spice of [0, 0.5, 1]) {
      for (const r of run({ scale, temperature: 0.6, spice, enableSubs: true, enableMultiChord: true })) {
        const total = r.events.reduce((a, e) => a + e.beats, 0)
        assert.equal(total, SECTION_BARS * 4, `${scale} spice=${spice}`)
        for (const e of r.events) {
          assert.ok(e.beats >= 1 && Number.isInteger(e.beats))
          assert.ok(e.beatInBar + e.beats <= 4, `chord crosses bar line: ${JSON.stringify(e.spec)}`)
        }
      }
    }
  }
})

test('every bar head carries the skeleton distribution for the meter', () => {
  for (const r of run({ scale: 'major', temperature: 0.4, spice: 0.8, enableSubs: true, enableMultiChord: true })) {
    const heads = r.events.filter(e => e.beatInBar === 0)
    assert.equal(heads.length, SECTION_BARS)
    for (const h of heads) {
      assert.ok(Array.isArray(h.dist) && h.dist.length === 7)
      assert.ok(Math.abs(h.dist.reduce((a, b) => a + b, 0) - 1) < 1e-9)
    }
  }
})

test('with substitutions off, every chord stays diatonic', () => {
  for (const scale of ['major', 'minor']) {
    const diatonic = new Set(SCALES[scale].intervals)
    for (const r of run({ scale, temperature: 0.7, spice: 1, enableSubs: false, enableMultiChord: true }, 10)) {
      for (const e of r.events) {
        for (const pc of pcsOf(e.spec)) {
          assert.ok(diatonic.has(pc), `${scale}: non-diatonic pc ${pc} in ${JSON.stringify(e.spec)}`)
        }
      }
    }
  }
})

test('with multi-chord off, every chord lasts a full bar', () => {
  for (const r of run({ scale: 'major', temperature: 0.8, spice: 1, enableSubs: true, enableMultiChord: false }, 10)) {
    for (const e of r.events) assert.equal(e.beats, 4)
  }
})

test('a section starts on the head its predecessor prepared (cadence lands where expected)', () => {
  let ctx = {}
  for (let i = 0; i < 20; i++) {
    const r = planSection({ scale: 'major', temperature: 0.9, spice: 0.5, enableSubs: true, enableMultiChord: true }, ctx)
    if (ctx.nextTemplate && !r.info.templates[0].startsWith('(')) {
      assert.equal(r.events[0].chosen, ctx.nextTemplate.seq[0])
    }
    ctx = r.nextCtx
  }
})

test('gestures appear with spice and enableSubs (Blackadder, clichés, secondary dominants)', () => {
  const tags = new Set()
  for (const r of run({ scale: 'major', temperature: 0.4, spice: 1, enableSubs: true, enableMultiChord: true }, 80)) {
    for (const e of r.events) if (e.tag) tags.add(e.tag.replace(/→裏$/, ''))
  }
  for (const t of ['イキスギ', '上行クリシェ', 'マイナークリシェ', '経過dim', 'ツーファイブ', 'sus4解決', 'サブドミナントマイナー']) {
    assert.ok(tags.has(t), `expected gesture ${t}; saw ${[...tags].join(', ')}`)
  }
  assert.ok([...tags].some(t => t.startsWith('V7/')), 'secondary dominants appear')
})

test('Blackadder chord resolves to the chord a fifth below its bass', () => {
  for (const r of run({ scale: 'major', temperature: 0.4, spice: 1, enableSubs: true, enableMultiChord: true }, 40)) {
    r.events.forEach((e, i) => {
      if (e.spec.kind !== 'blk' || i + 1 >= r.events.length) return
      const next = r.events[i + 1].spec
      assert.equal(((e.spec.rel - next.rel) % 12 + 12) % 12, 7)
    })
  }
})

test('the meter distribution is the probability the bar head was actually drawn with', () => {
  for (const r of run({ scale: 'major', temperature: 0.3, spice: 0.5, enableSubs: true, enableMultiChord: true }, 20)) {
    const heads = r.events.filter(e => e.beatInBar === 0)
    // セクション頭は必ずテンプレートに従う
    assert.equal(heads[0].dist[heads[0].target], 1)
    for (const h of heads) {
      // テンプレートの目標は、少なくとも「従う確率」ぶんの確率を持つ
      assert.ok(h.dist[h.target] >= 1 - 0.5 * 0.3 - 1e-9)
    }
  }
})
