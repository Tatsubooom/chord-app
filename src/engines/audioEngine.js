// Web Audio によるコード再生。
//
// 信号経路:
//   上声: osc×2(わずかにデチューン) → note gain → chord gain → upperBus → lowpass ─┐
//   ベース: osc(三角+サイン) → note gain → chord gain → bassBus → lowpass ─────────┤
//                                                                                  ├→ dry → compressor → out
//                                                     (send) → convolver(リバーブ) → wet ┘
// chord gain をコードごとに作って追跡し、停止時はそれをまとめてフェードアウトする。

let ctx = null
let bus = null
const activeGroups = new Set()

function createImpulse(context, seconds = 2.4, decay = 3.2) {
  const rate = context.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = context.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      // 減衰するノイズ＋立ち上がりを少し遅らせて初期反射っぽく
      const t = i / len
      const env = Math.pow(1 - t, decay) * Math.min(1, i / (rate * 0.012))
      data[i] = (Math.random() * 2 - 1) * env
    }
  }
  return buf
}

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    bus = buildBus(ctx)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function buildBus(context) {
  const comp = context.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 12
  comp.ratio.value = 4
  comp.attack.value = 0.006
  comp.release.value = 0.25

  const master = context.createGain()
  master.gain.value = 0.9
  comp.connect(master)
  master.connect(context.destination)

  const dry = context.createGain()
  dry.gain.value = 1
  dry.connect(comp)

  const reverb = context.createConvolver()
  reverb.buffer = createImpulse(context)
  const wet = context.createGain()
  wet.gain.value = 0.22
  reverb.connect(wet)
  wet.connect(comp)

  const upperFilter = context.createBiquadFilter()
  upperFilter.type = 'lowpass'
  upperFilter.frequency.value = 3200
  upperFilter.Q.value = 0.5
  upperFilter.connect(dry)
  upperFilter.connect(reverb)

  const upperBus = context.createGain()
  upperBus.connect(upperFilter)

  const bassFilter = context.createBiquadFilter()
  bassFilter.type = 'lowpass'
  bassFilter.frequency.value = 700
  bassFilter.Q.value = 0.7
  bassFilter.connect(dry)
  const bassSend = context.createGain()
  bassSend.gain.value = 0.25 // ベースはリバーブ控えめ（低域が濁らないように）
  bassFilter.connect(bassSend)
  bassSend.connect(reverb)

  const bassBus = context.createGain()
  bassBus.connect(bassFilter)

  return { upperBus, upperFilter, bassBus }
}

const freq = midi => 440 * Math.pow(2, (midi - 69) / 12)

// 波形ごとの音量補正と、角を取るためのローパス周波数
const WAVE = {
  sine: { gain: 1.15, cutoff: 6000 },
  triangle: { gain: 1.0, cutoff: 4200 },
  square: { gain: 0.5, cutoff: 2200 },
  sawtooth: { gain: 0.55, cutoff: 2600 },
}
const DETUNE_CENTS = 6

// 速さが遅い（＝1音が長い）ほど音が大きく聞こえる偏りを打ち消す音量係数
function durGain(dur) {
  return Math.max(0.5, Math.min(1, 0.16 / dur))
}

// コード1回ぶんの出力グループ（停止時にまとめてフェードするため）
function openGroup(context, dest, end) {
  const g = context.createGain()
  g.gain.value = 1
  g.connect(dest)
  const group = { gain: g, end }
  activeGroups.add(group)
  // 鳴り終わったら掃除
  const ms = Math.max(0, (end - context.currentTime + 0.6) * 1000)
  setTimeout(() => {
    activeGroups.delete(group)
    try { g.disconnect() } catch { /* already disconnected */ }
  }, ms)
  return g
}

// 1音を鳴らす。shape で余韻の付き方を変える。
//   'sustain' : アタック → ゆるやかな減衰 → リリース（余韻あり）
//   'pluck'   : 立ち上がり後に減衰する打鍵的な音（刻み向け）
// layers: [{ type, detune, level }] 重ねるオシレーター
function playNote(context, dest, midi, start, dur, peak, layers, shape = 'sustain') {
  if (dur <= 0.01 || peak <= 0.0001) return
  const gain = context.createGain()
  gain.gain.setValueAtTime(0, start)
  if (shape === 'pluck') {
    gain.gain.linearRampToValueAtTime(peak, start + 0.004)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.06, 0.0001), start + dur * 0.95)
    gain.gain.linearRampToValueAtTime(0, start + dur)
  } else {
    const atk = Math.min(0.025, dur * 0.3)
    const rel = Math.min(0.08, dur * 0.3)
    gain.gain.linearRampToValueAtTime(peak, start + atk)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.3, 0.0001), start + dur - rel)
    gain.gain.linearRampToValueAtTime(0, start + dur)
  }
  gain.connect(dest)
  for (const l of layers) {
    const osc = context.createOscillator()
    osc.type = l.type
    osc.frequency.setValueAtTime(freq(midi), start)
    osc.detune.setValueAtTime(l.detune || 0, start)
    if (l.level === 1) {
      osc.connect(gain)
    } else {
      const lg = context.createGain()
      lg.gain.value = l.level
      osc.connect(lg)
      lg.connect(gain)
    }
    osc.start(start)
    osc.stop(start + dur + 0.03)
  }
}

const upperLayers = waveform => [
  { type: waveform, detune: -DETUNE_CENTS, level: 0.5 },
  { type: waveform, detune: DETUNE_CENTS, level: 0.5 },
]
const BASS_LAYERS = [
  { type: 'triangle', detune: 0, level: 0.7 },
  { type: 'sine', detune: 0, level: 0.5 },
]
const BASS_PEAK = 0.34

// アルペジオ用の往復インデックス列（上行→下行）
function pingPong(n) {
  if (n <= 1) return [0]
  const seq = []
  for (let i = 0; i < n; i++) seq.push(i)
  for (let i = n - 2; i >= 1; i--) seq.push(i)
  return seq
}

// ブロック: 和音をひとまとめに鳴らす
function playBlock(c, dest, upper, now, durationSec, layers, gainScale) {
  const peak = (0.36 / Math.max(3, upper.length)) * gainScale
  upper.forEach(m => playNote(c, dest, m, now, durationSec, peak, layers))
}

// 刻み: 1拍を div 分割した短いプラックで和音を反復（拍頭を強く・裏拍を弱く）
function playComp(c, dest, upper, now, durationSec, beatSec, layers, gainScale, div) {
  const step = beatSec / div
  const hits = Math.max(1, Math.round(durationSec / step))
  const base = (0.55 / Math.max(3, upper.length)) * gainScale
  const half = Math.floor(div / 2)
  for (let h = 0; h < hits; h++) {
    const start = now + h * step
    if (start >= now + durationSec - 0.01) break
    const pos = h % div
    const vel = pos === 0 ? 1.0 : pos === half && div > 1 ? 0.82 : 0.64
    const dur = Math.min(step * 0.55, now + durationSec - start)
    upper.forEach(m => playNote(c, dest, m, start, dur, base * vel * durGain(dur), layers, 'pluck'))
  }
}

// アルペジオ: 一定テンポで往復。phaseStart で前のコードからの位相を引き継ぐ
function playArpeggio(c, dest, upper, now, durationSec, beatSec, layers, gainScale, div, phaseStart) {
  const step = beatSec / div
  const order = [...upper].sort((a, b) => a - b)
  const pat = pingPong(order.length)
  const steps = Math.max(1, Math.round(durationSec / step))
  const peak = 0.22 * gainScale
  for (let s = 0; s < steps; s++) {
    const start = now + s * step
    if (start >= now + durationSec - 0.01) break
    const midi = order[pat[(phaseStart + s) % pat.length]]
    const dur = Math.min(step * 1.8, 0.5)
    playNote(c, dest, midi, start, dur, peak * durGain(dur), layers)
  }
}

// 積み上げ: 低い音から1音ずつ加わり、最後は和音として鳴り切る
function playBuildup(c, dest, upper, now, durationSec, beatSec, layers, gainScale, div) {
  const order = [...upper].sort((a, b) => a - b)
  const n = order.length
  const peak = (0.36 / Math.max(3, n)) * gainScale
  const enterStep = Math.min(beatSec / div, (durationSec * 0.6) / n)
  order.forEach((midi, i) => {
    const start = now + (i + 1) * enterStep * 0.999
    playNote(c, dest, midi, start, durationSec - (start - now), peak, layers)
  })
}

// ベース: 刻みのときは拍ごとに、それ以外はコード長ぶん保持
function playBass(c, dest, bass, now, durationSec, beatSec, style) {
  if (bass == null) return
  if (style === 'comp') {
    const beats = Math.max(1, Math.round(durationSec / beatSec))
    for (let b = 0; b < beats; b++) {
      const start = now + b * beatSec
      const dur = Math.min(beatSec * 0.9, now + durationSec - start)
      playNote(c, dest, bass, start, dur, BASS_PEAK * (b === 0 ? 1 : 0.8), BASS_LAYERS, 'pluck')
    }
    return
  }
  playNote(c, dest, bass, now, durationSec, BASS_PEAK, BASS_LAYERS)
}

/**
 * コードを指定した演奏スタイル・音色・速さで鳴らす。
 * @param {{bass:number, upper:number[]}|number[]} voicing ボイシング（配列なら先頭をベースとみなす）
 * @param {number}   durationSec コード全体の長さ（秒）
 * @param {object}   [opts]
 * @param {'block'|'comp'|'arpeggio'|'buildup'} [opts.style]
 * @param {number}   [opts.bpm]
 * @param {OscillatorType} [opts.waveform]
 * @param {number}   [opts.speedDiv]  刻み/アルペジオ/積み上げの1拍あたり分割数
 * @param {number}   [opts.phaseStart] アルペジオの位相オフセット
 */
export function playChord(
  voicing,
  durationSec,
  { style = 'block', bpm = 90, waveform = 'triangle', speedDiv = 2, phaseStart = 0 } = {},
) {
  const v = Array.isArray(voicing) ? { bass: voicing[0], upper: voicing.slice(1) } : voicing
  if (!v || !v.upper || !v.upper.length) return
  const c = getCtx()
  const now = c.currentTime + 0.01
  const beatSec = 60 / bpm
  const w = WAVE[waveform] ?? WAVE.triangle
  const div = Math.max(1, speedDiv)
  bus.upperFilter.frequency.setTargetAtTime(w.cutoff, now, 0.05)

  // アルペジオは各音が次のコードへ余韻を渡すので少し長めにグループを保持
  const tail = style === 'arpeggio' ? 0.6 : 0.1
  const upperDest = openGroup(c, bus.upperBus, now + durationSec + tail)
  const bassDest = openGroup(c, bus.bassBus, now + durationSec + 0.1)
  const layers = upperLayers(waveform)

  playBass(c, bassDest, v.bass, now, durationSec, beatSec, style)
  if (style === 'comp') return playComp(c, upperDest, v.upper, now, durationSec, beatSec, layers, w.gain, div)
  if (style === 'arpeggio') return playArpeggio(c, upperDest, v.upper, now, durationSec, beatSec, layers, w.gain, div, phaseStart)
  if (style === 'buildup') return playBuildup(c, upperDest, v.upper, now, durationSec, beatSec, layers, w.gain, div)
  return playBlock(c, upperDest, v.upper, now, durationSec, layers, w.gain)
}

/** 鳴っている音をすばやくフェードアウトさせる（停止ボタン用） */
export function stopAll() {
  if (!ctx) return
  const t = ctx.currentTime
  for (const g of activeGroups) {
    g.gain.gain.cancelScheduledValues(t)
    g.gain.gain.setValueAtTime(g.gain.gain.value, t)
    g.gain.gain.linearRampToValueAtTime(0, t + 0.12)
  }
}
