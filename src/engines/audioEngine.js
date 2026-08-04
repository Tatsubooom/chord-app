let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const freq = midi => 440 * Math.pow(2, (midi - 69) / 12)

// 波形ごとの音量補正。倍音の多い矩形/ノコギリは耳につきやすく音割れしやすいので下げる。
const WAVE_GAIN = { sine: 1.15, triangle: 1.0, square: 0.58, sawtooth: 0.62 }

// 1音を鳴らす。shape で余韻の付き方を変える。
//   'sustain' : アタック → ゆるやかな減衰 → リリース（ブロック/アルペジオ/積み上げ向け・余韻あり）
//   'pluck'   : 立ち上がり後に減衰する打鍵的な音（刻み向け・粒立ち重視）
// プチノイズ防止のため必ず 0 から立ち上げ、0 で終える。
function playNote(context, midi, start, dur, peak, waveform, shape = 'sustain') {
  if (dur <= 0.01 || peak <= 0.0001) return
  const gain = context.createGain()
  gain.gain.setValueAtTime(0, start)

  if (shape === 'pluck') {
    // 刻み: 素早く立ち上げ、音符終わりに向けて減衰。細くなりすぎないよう floor を高めに。
    gain.gain.linearRampToValueAtTime(peak, start + 0.004)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.06, 0.0001), start + dur * 0.95)
    gain.gain.linearRampToValueAtTime(0, start + dur)
  } else {
    const atk = Math.min(0.03, dur * 0.3)
    const rel = Math.min(0.04, dur * 0.3)
    gain.gain.linearRampToValueAtTime(peak, start + atk)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.2, 0.0001), start + dur - rel)
    gain.gain.linearRampToValueAtTime(0, start + dur)
  }
  gain.connect(context.destination)

  const osc = context.createOscillator()
  osc.type = waveform
  osc.frequency.setValueAtTime(freq(midi), start)
  osc.connect(gain)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// アルペジオ用の往復インデックス列（上行→下行）。構成音数によらず粒立ちを均一にする。
function pingPong(n) {
  if (n <= 1) return [0]
  const seq = []
  for (let i = 0; i < n; i++) seq.push(i)
  for (let i = n - 2; i >= 1; i--) seq.push(i)
  return seq // 長さ 2n-2
}

// ブロック: 和音をひとまとめに、コード長ぶん鳴らす（従来の挙動）
function playBlock(context, midis, now, durationSec, waveform, gainScale) {
  const peak = (0.4 / midis.length) * gainScale
  midis.forEach(m => playNote(context, m, now, durationSec, peak, waveform))
}

// 刻み: 1拍を div 分割した短いプラックで和音を反復（バッキング風）。
// 拍頭を強く・裏拍を弱くアクセントし、単調な「ワンワンワン」を避ける。
function playComp(context, midis, now, durationSec, beatSec, waveform, gainScale, div) {
  const step = beatSec / div
  const hits = Math.max(1, Math.round(durationSec / step))
  const base = (0.6 / midis.length) * gainScale
  const half = Math.floor(div / 2)
  for (let h = 0; h < hits; h++) {
    const start = now + h * step
    if (start >= now + durationSec - 0.01) break
    const pos = h % div
    const vel = pos === 0 ? 1.0 : pos === half && div > 1 ? 0.82 : 0.64
    const dur = Math.min(step * 0.55, now + durationSec - start)
    midis.forEach(m => playNote(context, m, start, dur, base * vel, waveform, 'pluck'))
  }
}

// アルペジオ: 一定テンポ（beatSec/div）で往復させ、構成音数で速度が偏らないようにする。
function playArpeggio(context, midis, now, durationSec, beatSec, waveform, gainScale, div) {
  const step = beatSec / div
  const order = [...midis].sort((a, b) => a - b)
  const pat = pingPong(order.length)
  const steps = Math.max(1, Math.round(durationSec / step))
  const peak = 0.34 * gainScale
  for (let s = 0; s < steps; s++) {
    const start = now + s * step
    if (start >= now + durationSec - 0.01) break
    const midi = order[pat[s % pat.length]]
    const dur = Math.min(step * 1.8, now + durationSec - start)
    playNote(context, midi, start, dur, peak, waveform)
  }
}

// 積み上げ: 低い音から1音ずつ加わり、各音は保持されて最後は和音として鳴り切る。
function playBuildup(context, midis, now, durationSec, beatSec, waveform, gainScale, div) {
  const order = [...midis].sort((a, b) => a - b)
  const n = order.length
  const peak = (0.4 / n) * gainScale
  // durationSec の 60% までに全音が出そろうよう流入間隔を決める（速いほど早く積み上がる）
  const enterStep = Math.min(beatSec / div, (durationSec * 0.6) / n)
  order.forEach((midi, i) => {
    const start = now + i * enterStep
    const dur = durationSec - i * enterStep // 各音はコード終端まで保持
    playNote(context, midi, start, dur, peak, waveform)
  })
}

/**
 * コードを指定した演奏スタイル・音色・速さで鳴らす。
 * @param {number[]} midis      構成音（MIDIノート番号）
 * @param {number}   durationSec コード全体の長さ（秒）
 * @param {object}   [opts]
 * @param {'block'|'comp'|'arpeggio'|'buildup'} [opts.style] 演奏スタイル
 * @param {number}   [opts.bpm]       テンポ
 * @param {OscillatorType} [opts.waveform] 音色（sine/triangle/square/sawtooth）
 * @param {number}   [opts.speedDiv]  刻み/アルペジオ/積み上げの1拍あたり分割数
 */
export function playChord(
  midis,
  durationSec,
  { style = 'block', bpm = 90, waveform = 'triangle', speedDiv = 2 } = {},
) {
  if (!midis || !midis.length) return
  const context = getCtx()
  const now = context.currentTime
  const beatSec = 60 / bpm
  const gainScale = WAVE_GAIN[waveform] ?? 1
  const div = Math.max(1, speedDiv)
  if (style === 'comp') return playComp(context, midis, now, durationSec, beatSec, waveform, gainScale, div)
  if (style === 'arpeggio') return playArpeggio(context, midis, now, durationSec, beatSec, waveform, gainScale, div)
  if (style === 'buildup') return playBuildup(context, midis, now, durationSec, beatSec, waveform, gainScale, div)
  return playBlock(context, midis, now, durationSec, waveform, gainScale)
}
