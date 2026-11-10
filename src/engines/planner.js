// 8小節（1セクション）単位でコード進行を先読みして計画するプランナー。
//
// 1. 骨格   : フレーズテンプレート（4小節×2 / 8小節）を目標に、小節頭の度数を calcWeights から抽選
// 2. 色     : セクションごとに トライアド / 7th / 9th の「色」を決めて統一感を出す
// 3. 経過   : 複数コードON時、小節後半に次の小節へ向かう経過和音を入れる
// 4. 仕掛け : クリシェ / セカンダリードミナント / ツーファイブ / イキスギ / 経過dim / 借用 … を
//             スパイス量に応じた確率で、先読みしながら差し込む
// 5. 終止   : セクション末で次の頭がトニックなら、高い確率でドミナント系を置いて締める
//
// コード spec はキー相対（rel = キーからの半音）なので、再生時にキーが変わってもそのまま使える。

import { SCALES, getDefs } from './chordEngine.js'
import { calcWeights, weightedRandom, pickPhraseTemplate } from './weightEngine.js'
import { ROMAN, mod12 } from './theory.js'

export const SECTION_BARS = 8
const BEATS = 4

const FUNCTION = {
  major: ['T', 'SD', 'T', 'SD', 'D', 'T', 'D'],
  minor: ['T', 'SD', 'T', 'SD', 'D', 'SD', 'D'],
}

const DOM7 = [0, 4, 7, 10]

// ---- 確率（UI 表示にも使う） ------------------------------------------------

/** 色（トライアド / 7th / 9th）の選ばれやすさ */
export function colorChances(temperature) {
  const triad = 0.55 * (1 - temperature)
  const rich = 0.35 * temperature
  return { triad, seventh: 1 - triad - rich, rich }
}

/** 小節後半に経過和音を入れる確率（複数コードON時） */
export function splitChance(temperature, enableMultiChord) {
  return enableMultiChord ? 0.08 + 0.3 * temperature * temperature : 0
}

// 各仕掛けの発動しやすさ（境界1か所 / コード1つあたりの目安）
export function gestureChances({ spice, enableSubs, enableMultiChord, scale }) {
  const tonal = SCALES[scale]?.intervals.length === 7
  const nd = enableSubs && tonal ? 1 : 0
  const multi = enableMultiChord ? 1 : 0
  const b = spice * 0.6
  const inner = spice * 0.3 * multi
  return [
    { key: 'セカンダリー', prob: tonal ? b * (nd ? 0.3 : 0.1) : 0 },
    { key: 'ツーファイブ', prob: tonal ? b * 0.18 * multi : 0 },
    { key: 'イキスギ', prob: b * 0.14 * nd },
    { key: '経過dim', prob: b * 0.2 * nd * multi },
    { key: '裏コード', prob: spice * 0.25 * nd },
    { key: 'クリシェ', prob: inner * (nd ? 1 : 0) },
    { key: 'sus4解決', prob: tonal ? spice * 0.3 * multi : 0 },
    { key: '借用', prob: b * 0.2 * nd },
    { key: '転回', prob: tonal ? 0.2 + 0.4 * spice : 0 },
    { key: '終止', prob: tonal ? 0.45 + 0.4 * spice : 0 },
  ]
}

// ---- spec ヘルパ -----------------------------------------------------------

const isMinorSpec = s => s.ivs.includes(3) && !s.ivs.includes(4)
const isDimSpec = s => s.ivs.includes(3) && s.ivs.includes(6) && !s.ivs.includes(7)
// 7th/9th が付いていても、骨格がメジャー / マイナーの3和音ならクリシェの対象にする（ドミナント7thは除く）
const isMajorTriad = s => s.kind == null && s.ivs.includes(4) && s.ivs.includes(7) && !s.ivs.includes(10)
const isMinorTriad = s => s.kind == null && s.ivs.includes(3) && s.ivs.includes(7)
const isDominant = s => s.kind == null && s.ivs.includes(4) && s.ivs.includes(10)
const romanOf = s => ROMAN[mod12(s.rel)] + (isDimSpec(s) ? 'dim' : isMinorSpec(s) ? 'm' : '')

function diatonicSpec(defs, degree, color, mode) {
  const d = defs[degree]
  const ivs = [0, d.relThird, d.relFifth]
  if (color !== 'triad' && [9, 10, 11].includes(d.relSeventh)) ivs.push(d.relSeventh)
  if (color === 'rich' && d.relNinth % 12 === 2 && d.relFifth === 7) ivs.push(14)
  return { rel: d.root, ivs, degree, func: FUNCTION[mode]?.[degree] ?? null }
}

function pickColor(temperature) {
  const c = colorChances(temperature)
  const r = Math.random()
  if (r < c.triad) return 'triad'
  if (r < c.triad + c.rich) return 'rich'
  return '7th'
}

function ev(spec, beats, extra = {}) {
  return { spec, beats, ...extra }
}

// 小節頭が置き換わるときに、骨格の情報（確率分布・目標・選ばれた度数）を引き継ぐ
function carryHead(from, to) {
  to.dist = from.dist
  to.target = from.target
  to.chosen = from.chosen
}

// 重み付きで1つ選ぶ（[{w, ...}]）
function pickWeighted(list) {
  const total = list.reduce((a, x) => a + x.w, 0)
  if (total <= 0) return null
  let r = Math.random() * total
  for (const x of list) {
    if (r < x.w) return x
    r -= x.w
  }
  return list[list.length - 1]
}

// ---- 仕掛け: コードの内側（1小節ぶんを分割） ---------------------------------

function innerGestures(events, i, { nd, multi, mode }) {
  const e = events[i]
  const next = events[i + 1]
  const s = e.spec
  if (!multi || e.locked || e.beats !== BEATS) return []
  const out = []
  const sameNext = next && !next.locked && next.beats === BEATS && next.spec.rel === s.rel &&
    next.spec.ivs.join() === s.ivs.join()

  // 上行クリシェ: C → Caug → C6 → C7(→F) / Caug(往復)
  if (nd && isMajorTriad(s)) {
    out.push({
      w: 3,
      apply: () => {
        const resolvesDown5 = next && mod12(next.spec.rel - s.rel) === 5
        const steps = [[0, 4, 7], [0, 4, 8], [0, 4, 9], resolvesDown5 ? [0, 4, 7, 10] : [0, 4, 8]]
        return { steps, tag: '上行クリシェ' }
      },
    })
  }
  // マイナークリシェ: Am → AmM7 → Am7 → Am6
  if (nd && isMinorTriad(s)) {
    out.push({
      w: 4,
      apply: () => ({ steps: [[0, 3, 7], [0, 3, 7, 11], [0, 3, 7, 10], [0, 3, 7, 9]], tag: 'マイナークリシェ' }),
    })
  }
  // ベース下降クリシェ: C → C/B → C/B♭ → (Am | F/A)
  if (nd && mode === 'major' && isMajorTriad(s) && s.rel === 0 && next && [9, 5].includes(mod12(next.spec.rel))) {
    out.push({
      w: 4,
      apply: () => ({
        custom: [
          ev({ ...s }, 2),
          ev({ ...s, ivs: [0, 4, 7, 11], bassRel: 11 }, 1),
          ev({ ...s, ivs: [0, 4, 7, 10], bassRel: 10 }, 1),
        ],
        tag: 'ベース下降クリシェ',
        after: () => {
          if (mod12(next.spec.rel) === 5) next.spec = { ...next.spec, bassRel: next.spec.rel + 4 } // F/A
        },
      }),
    })
  }
  return out.map(g => ({ ...g, sameNext }))
}

function applyInner(events, i, g) {
  const e = events[i]
  const res = g.apply()
  const tag = res.tag
  let repl
  let removeCount = 1
  if (res.custom) {
    repl = res.custom
  } else if (g.sameNext && Math.random() < 0.6) {
    // 同じコードが2小節続くなら、2拍ずつゆったり2小節かけて動かす
    repl = res.steps.map(ivs => ev({ ...e.spec, ivs }, 2))
    removeCount = 2
  } else {
    repl = res.steps.map(ivs => ev({ ...e.spec, ivs }, 1))
  }
  repl.forEach((r, k) => {
    r.locked = true
    r.tag = tag
    r.gestureStart = k === 0
    r.spec = { ...r.spec, tag }
  })
  carryHead(e, repl[0])
  if (removeCount === 2) carryHead(events[i + 1], repl[2]) // 2小節目の頭の情報も引き継ぐ
  events.splice(i, removeCount, ...repl)
  res.after?.()
}

// ---- 仕掛け: コードの境界（次のコードへ向かう） -------------------------------

// prev の後半（または全体）を置き換える新しいコード列を返す候補
function boundaryGestures(prev, next, { nd, multi, mode, isLastBoundary, nextHeadIsTonic }) {
  const out = []
  if (prev.locked) return out
  const t = next.spec
  const tonic = mod12(t.rel) === 0
  const canTail = multi && prev.beats >= 2
  const tail = prev.beats >= 4 ? 2 : 1
  // 複数コードOFF時は、偶数小節目（弱い小節）だけ丸ごと置き換えてよい
  const canWhole = !multi && prev.bar % 2 === 1
  if (!canTail && !canWhole) return out
  const place = chords => ({ chords, tail: canTail ? tail : prev.beats })
  const prevIsDomOfT = mod12(prev.spec.rel - t.rel) === 7 && isDominant(prev.spec)
  const targetOk = !isDimSpec(t) && t.kind == null

  // ドミナント / セカンダリードミナント
  if (targetOk && !prevIsDomOfT) {
    const diatonicDom = mode === 'major' && tonic
    if (diatonicDom || nd) {
      const ivs = [...DOM7]
      if (isMinorSpec(t) && nd && Math.random() < 0.5) ivs.push(13) // マイナーへは ♭9 が映える
      const tag = tonic ? (mode === 'minor' ? 'V7(和声的)' : 'ドミナント') : `V7/${romanOf(t)}`
      out.push({ w: tonic ? 3 : 2.5, ...place([{ spec: { rel: t.rel + 7, ivs, func: 'D' }, tag }]) })
    }
  }
  // ツーファイブ（前のコード全体を IIm7 - V7 に）
  if (multi && targetOk && prev.beats === BEATS && prev.bar !== 0 && (nd || (mode === 'major' && tonic))) {
    const ii = isMinorSpec(t) ? [0, 3, 6, 10] : [0, 3, 7, 10]
    out.push({
      w: 1.6,
      chords: [
        { spec: { rel: t.rel + 2, ivs: ii, func: 'SD' }, tag: 'ツーファイブ', beats: 2 },
        { spec: { rel: t.rel + 7, ivs: [...DOM7], func: 'D' }, tag: 'ツーファイブ', beats: 2 },
      ],
      tail: BEATS,
    })
  }
  // イキスギコード（ブラックアダー）: 解決先の5度上をベースに、その短7度上の aug を載せる
  if (nd && targetOk) {
    const w = tonic || mod12(t.rel) === 9 ? 2 : 1
    out.push({ w, ...place([{ spec: { rel: t.rel + 7, ivs: [0, 6, 10, 14], kind: 'blk', func: 'D' }, tag: 'イキスギ' }]) })
  }
  // 経過ディミニッシュ: 全音上行（C → C#dim7 → Dm）/ 全音下行（Em → E♭dim7 → Dm）
  if (nd && multi && canTail) {
    const motion = mod12(t.rel - (prev.spec.bassRel ?? prev.spec.rel))
    if (motion === 2) {
      out.push({ w: 3, chords: [{ spec: { rel: t.rel - 1, ivs: [0, 3, 6, 9], spell: 'sharp', func: 'D' }, tag: '経過dim' }], tail: Math.min(tail, 2) })
    } else if (motion === 10) {
      out.push({ w: 1.5, chords: [{ spec: { rel: t.rel + 1, ivs: [0, 3, 6, 9], spell: 'flat', func: 'D' }, tag: '経過dim' }], tail: Math.min(tail, 2) })
    }
  }
  // サブドミナントマイナー: IV → IVm(6) → I
  if (nd && mode === 'major' && tonic && mod12(prev.spec.rel) === 5 && !isMinorSpec(prev.spec)) {
    const ivs = Math.random() < 0.5 ? [0, 3, 7, 9] : [0, 3, 7, 10]
    out.push({ w: 4, ...place([{ spec: { rel: 5, ivs, func: 'SDm' }, tag: 'サブドミナントマイナー' }]) })
  }
  // ♭VI - ♭VII - I（セクション末のみ）
  if (nd && mode === 'major' && isLastBoundary && nextHeadIsTonic && multi && prev.beats === BEATS) {
    out.push({
      w: 2.2,
      chords: [
        { spec: { rel: 8, ivs: [0, 4, 7, 11], func: 'SDm' }, tag: '♭VI-♭VII-I', beats: 2 },
        { spec: { rel: 10, ivs: [0, 4, 7], func: 'SDm' }, tag: '♭VI-♭VII-I', beats: 2 },
      ],
      tail: BEATS,
    })
  }
  return out
}

function applyBoundary(events, i, g) {
  const prev = events[i]
  const tail = Math.min(g.tail, prev.beats)
  const repl = []
  if (prev.beats - tail > 0) repl.push({ ...prev, beats: prev.beats - tail })
  const chords = g.chords
  const fixedSum = chords.reduce((a, c) => a + (c.beats || 0), 0)
  const free = chords.filter(c => !c.beats).length
  const each = free ? Math.max(1, Math.floor((tail - fixedSum) / free)) : 0
  chords.forEach((c, k) => {
    const n = ev({ ...c.spec, tag: c.tag }, c.beats || each, { locked: true, tag: c.tag, gestureStart: k === 0 })
    repl.push(n)
  })
  // 小節頭の情報（確率分布など）は先頭に残す
  if (prev.beats - tail <= 0) carryHead(prev, repl[0])
  events.splice(i, 1, ...repl)
  // 解決先として狙われたコード。後の仕掛けでルートを変えたり丸ごと置き換えたりしない
  const target = events[i + repl.length]
  if (target) target.aimed = true
  return repl.length - 1
}

// ---- メイン -------------------------------------------------------------

/**
 * 1セクション（8小節）を計画する。
 * @param {object} settings { scale, temperature, spice, enableSubs, enableMultiChord }
 * @param {object} [ctx]    前セクションから引き継ぐ状態（planSection の戻り値の nextCtx）
 * @returns {{ events: object[], nextCtx: object, info: object }}
 *   events[k] = { spec, beats, bar, beatInBar, tag?, dist?, target? }
 */
export function planSection(settings, ctx = {}) {
  const { scale, temperature = 0.3, spice = 0.5, enableSubs = true, enableMultiChord = true } = settings
  const scaleLength = SCALES[scale].intervals.length
  const mode = ['major', 'minor'].includes(scale) ? scale : scale === 'minorPenta' ? 'minor' : 'major'
  const tonal = scaleLength === 7
  const nd = enableSubs && tonal
  const multi = enableMultiChord
  const defs = getDefs(scale)

  // --- 1. 骨格 ---
  const avoid = ctx.lastTemplate
  const t1 = ctx.nextTemplate ?? pickPhraseTemplate(mode, scaleLength, avoid)
  let targets
  let templates
  const repeat = ctx.lastTargets && !ctx.wasRepeat && Math.random() < 0.3
  if (repeat) {
    targets = [...ctx.lastTargets] // A → A'（同じ骨格を仕掛け違いで繰り返す）
    templates = ['(くり返し)']
  } else if (t1.seq.length >= SECTION_BARS) {
    targets = t1.seq.slice(0, SECTION_BARS)
    templates = [t1.name]
  } else {
    const t2 = Math.random() < 0.4 ? t1 : pickPhraseTemplate(mode, scaleLength, t1.name)
    targets = [...t1.seq, ...t2.seq].slice(0, SECTION_BARS)
    templates = t2 === t1 ? [t1.name, '(くり返し)'] : [t1.name, t2.name]
  }
  const lastName = templates[templates.length - 1]
  const nextTemplate = pickPhraseTemplate(mode, scaleLength, lastName.startsWith('(') ? t1.name : lastName)
  const nextHead = nextTemplate.seq[0] % scaleLength

  let prevDeg = ctx.prevDegree ?? 0
  let hist = [...(ctx.history ?? [])]
  const degrees = []
  const dists = []
  for (let b = 0; b < SECTION_BARS; b++) {
    const target = targets[b] % scaleLength
    const w = calcWeights(prevDeg, hist, mode, temperature, scaleLength, target)
    const total = w.reduce((a, x) => a + x, 0) || 1
    // テンプレートの骨格はなるべく守る（定番進行として聴こえることが聞きごたえに直結する）。
    // セクション頭は前セクションの終止が準備した着地点なので必ず従う。
    // それ以外は temperature に応じて、遷移表から自由に抽選する。
    const pFollow = b === 0 ? 1 : 1 - 0.5 * temperature
    const d = Math.random() < pFollow ? target : weightedRandom(w)
    degrees.push(d)
    // メーターに出すのは「実際に選ばれた確率」: テンプレートに従う分 + 遷移表から抽選する分
    dists.push(w.map((x, i) => (1 - pFollow) * (x / total) + (i === target ? pFollow : 0)))
    hist = [{ degree: d }, ...hist].slice(0, 8)
    prevDeg = d
  }

  // --- 2. 色 ---
  const color = pickColor(temperature)

  let events = degrees.map((d, b) =>
    ev(diatonicSpec(defs, d, color, mode), BEATS, { bar: b, dist: dists[b], target: targets[b] % scaleLength, chosen: d }),
  )

  // --- 3. 経過和音（小節後半） ---
  const pSplit = splitChance(temperature, multi)
  for (let i = events.length - 1; i >= 0; i--) {
    if (Math.random() >= pSplit) continue
    const cur = events[i]
    const nextDeg = i + 1 < events.length ? events[i + 1].spec.degree : nextHead
    const fromW = calcWeights(cur.spec.degree, [], mode, temperature, scaleLength)
    const cand = fromW.map((w, d) => {
      if (d === cur.spec.degree || d === nextDeg) return 0
      const toW = calcWeights(d, [], mode, temperature, scaleLength)
      const toTotal = toW.reduce((a, x) => a + x, 0) || 1
      return w * (toW[nextDeg] / toTotal)
    })
    const d = weightedRandom(cand)
    if (cand[d] <= 0) continue
    events.splice(i, 1, { ...cur, beats: 2 }, ev(diatonicSpec(defs, d, color, mode), 2, { bar: cur.bar }))
  }

  const nextHeadSpec = diatonicSpec(defs, nextHead, color, mode)
  const opts = { nd, multi, mode }

  if (tonal) {
    // --- 4a. 内側の仕掛け（クリシェ） ---
    const pInner = spice * 0.3
    for (let i = 0; i < events.length; i++) {
      if (events[i - 1]?.tag?.includes('クリシェ')) continue // クリシェの連発は避ける
      const cands = innerGestures(events, i, opts)
      if (!cands.length || Math.random() >= pInner) continue
      const g = pickWeighted(cands)
      if (g) applyInner(events, i, g)
    }

    // --- 4b. 境界の仕掛け（次のコードへ向かう）＋ 終止 ---
    const pBoundary = spice * 0.6
    for (let i = 0; i < events.length; i++) {
      const isLast = i === events.length - 1
      const next = isLast ? { spec: nextHeadSpec } : events[i + 1]
      const prev = events[i]
      if (!isLast && next.bar === prev.bar && !multi) continue
      const nextHeadIsTonic = nextHead === 0
      let p = pBoundary
      if (isLast && nextHeadIsTonic && !isDominant(prev.spec)) p = Math.max(p, 0.45 + 0.4 * spice)
      if (prev.bar === 3 && next.bar === 4) p += 0.1
      if (Math.random() >= p) continue
      const cands = boundaryGestures(prev, next, { ...opts, isLastBoundary: isLast, nextHeadIsTonic })
      // 前の仕掛けの解決先は、頭を残す（後半だけ置き換える）仕掛けに限る
      const allowed = prev.aimed ? cands.filter(c => c.tail < prev.beats) : cands
      const g = pickWeighted(allowed)
      if (g) i += applyBoundary(events, i, g)
    }

    // --- 4c. ドミナントの味付け（sus4 解決 / 裏コード） ---
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      const next = i + 1 < events.length ? events[i + 1].spec : nextHeadSpec
      if (!isDominant(e.spec) || mod12(e.spec.rel - next.rel) !== 7) continue
      if (e.tag?.includes('クリシェ')) continue
      // イキスギ等が解決先として狙っているコードのルートは動かさない
      if (nd && !e.aimed && Math.random() < spice * 0.25 && e.spec.kind == null) {
        // 裏コード: 5度下への解決を半音下への解決に
        const tag = e.tag ? `${e.tag}→裏` : '裏コード'
        e.spec = { ...e.spec, rel: e.spec.rel + 6, ivs: [...DOM7], spell: 'flat', tag }
        e.tag = tag
        e.locked = true
      } else if (multi && e.beats >= 2 && !e.spec.ivs.includes(13) && Math.random() < spice * 0.3) {
        const half = e.beats / 2
        const tag = 'sus4解決'
        const a = { ...e, beats: Math.ceil(half), spec: { ...e.spec, ivs: [0, 5, 7, 10], tag }, tag, locked: true, gestureStart: true }
        const b = { ...e, beats: Math.floor(half), spec: { ...e.spec, tag }, tag, locked: true, gestureStart: false, dist: undefined, target: undefined }
        events.splice(i, 1, a, b)
        i++
      }
    }

    // --- 4d. ベース順次（転回形で低音を滑らかに: C → G/B → Am） ---
    const pInv = 0.2 + 0.4 * spice
    let prevBass = ctx.prevBassRel ?? null
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      const s = e.spec
      const next = i + 1 < events.length ? events[i + 1].spec : nextHeadSpec
      const third = s.ivs.find(x => x === 3 || x === 4)
      if (prevBass != null && s.bassRel == null && s.kind == null && third != null && !e.locked) {
        const cand = s.rel + third
        const step = (a, b) => {
          const d = mod12(b - a)
          return d > 6 ? d - 12 : d
        }
        const d1 = step(prevBass, cand)
        const d2 = step(cand, next.bassRel ?? next.rel)
        const stepwise = (d1 < 0 && d2 < 0 && d1 >= -2 && d2 >= -2) || (d1 > 0 && d2 > 0 && d1 <= 2 && d2 <= 2)
        if (stepwise && Math.random() < pInv) {
          e.spec = { ...s, bassRel: cand }
          if (!e.tag) e.tag = '転回'
        }
      }
      prevBass = e.spec.bassRel ?? e.spec.rel
    }
  }

  // --- 5. 位置情報 ---
  let beat = 0
  for (const e of events) {
    e.bar = Math.floor(beat / BEATS)
    e.beatInBar = beat % BEATS
    e.spec = { ...e.spec, tag: e.tag ?? e.spec.tag ?? null }
    beat += e.beats
  }

  const last = events[events.length - 1]
  return {
    events,
    info: { templates, color },
    nextCtx: {
      prevDegree: degrees[degrees.length - 1],
      history: hist,
      lastTemplate: lastName.startsWith('(') ? t1.name : lastName,
      nextTemplate,
      lastTargets: targets,
      wasRepeat: !!repeat,
      prevBassRel: last.spec.bassRel ?? last.spec.rel,
    },
  }
}
