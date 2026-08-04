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
//   'sustain' : アタック → ゆるやかな減衰 → リリース（ブロック/アルペジオ向け・余韻あり）
//   'pluck'   : 立ち上がり後すぐに減衰しきる打鍵的な音（刻み向け・粒立ち重視）
// プチノイズ防止のため必ず 0 から立ち上げ、0 で終える。
function playNote(context, midi, start, dur, peak, waveform, shape = 'sustain') {
  if (dur <= 0.01 || peak <= 0.0001) return
  const gain = context.createGain()
  gain.gain.setValueAtTime(0, start)

  if (shape === 'pluck') {
    // 刻み: 素早く立ち上げ、音符の終わりに向けてほぼ無音まで一気に減衰（swell させない）
    const atk = 0.004
    gain.gain.linearRampToValueAtTime(peak, start + atk)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.02, 0.0001), start + dur * 0.9)
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

// ブロック: 和音をひとまとめに、コード長ぶん鳴らす（従来の挙動）
function playBlock(context, midis, now, durationSec, waveform, gainScale) {
  const peak = (0.4 / midis.length) * gainScale
  midis.forEach(m => playNote(context, m, now, durationSec, peak, waveform))
}

// 刻み: 1拍を div 分割した短いプラックで和音を反復（バッキング風）。
// 単調な「ワンワンワン」を避けるため、拍頭を強く、裏拍を弱くアクセントを付ける。
function playComp(context, midis, now, durationSec, beatSec, waveform, gainScale, div) {
  const step = beatSec / div
  const hits = Math.max(1, Math.round(durationSec / step))
  const base = (0.42 / midis.length) * gainScale
  const half = Math.floor(div / 2)
  for (let h = 0; h < hits; h++) {
    const start = now + h * step
    if (start >= now + durationSec - 0.01) break
    // 拍内の位置でベロシティを変える: 拍頭=強 / 中間=中 / それ以外=弱
    const pos = h % div
    const vel = pos === 0 ? 1.0 : pos === half && div > 1 ? 0.72 : 0.5
    const dur = Math.min(step * 0.42, now + durationSec - start) // 短めのスタッカート
    midis.forEach(m => playNote(context, m, start, dur, base * vel, waveform, 'pluck'))
  }
}

// アルペジオ: 構成音を低い順に1音ずつ、少し余韻を残して分散させる
function playArpeggio(context, midis, now, durationSec, beatSec, waveform, gainScale, div) {
  const step = beatSec / div
  const steps = Math.max(1, Math.round(durationSec / step))
  const order = [...midis].sort((a, b) => a - b)
  const peak = 0.32 * gainScale
  for (let s = 0; s < steps; s++) {
    const start = now + s * step
    if (start >= now + durationSec - 0.01) break
    const midi = order[s % order.length]
    const dur = Math.min(step * 1.7, now + durationSec - start)
    playNote(context, midi, start, dur, peak, waveform)
  }
}

/**
 * コードを指定した演奏スタイル・音色・速さで鳴らす。
 * @param {number[]} midis      構成音（MIDIノート番号）
 * @param {number}   durationSec コード全体の長さ（秒）
 * @param {object}   [opts]
 * @param {'block'|'comp'|'arpeggio'} [opts.style]  演奏スタイル
 * @param {number}   [opts.bpm]       テンポ
 * @param {OscillatorType} [opts.waveform] 音色（sine/triangle/square/sawtooth）
 * @param {number}   [opts.speedDiv]  刻み/アルペジオの1拍あたり分割数
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
  return playBlock(context, midis, now, durationSec, waveform, gainScale)
}
