let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const freq = midi => 440 * Math.pow(2, (midi - 69) / 12)

// 波形ごとの音量補正。倍音の多い矩形/ノコギリは耳につきやすく音割れしやすいので下げる。
const WAVE_GAIN = { sine: 1.15, triangle: 1.0, square: 0.58, sawtooth: 0.62 }

// 1音を「アタック → ゆるやかな減衰 → リリース」のエンベロープで鳴らす。
// プチノイズ防止のため必ず 0 から立ち上げ、0 で終える。
function playNote(context, midi, start, dur, peak, waveform) {
  if (dur <= 0.01) return
  const gain = context.createGain()
  const atk = Math.min(0.03, dur * 0.3)
  const rel = Math.min(0.04, dur * 0.3)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + atk)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.2, 0.0001), start + dur - rel)
  gain.gain.linearRampToValueAtTime(0, start + dur)
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

// 刻み: 8分音符ぶんの短いスタッカートで和音を反復（バッキング風）
function playComp(context, midis, now, durationSec, beatSec, waveform, gainScale) {
  const step = beatSec / 2
  const hits = Math.max(1, Math.round(durationSec / step))
  const peak = (0.4 / midis.length) * gainScale
  for (let h = 0; h < hits; h++) {
    const start = now + h * step
    if (start >= now + durationSec - 0.01) break
    const dur = Math.min(step * 0.5, now + durationSec - start)
    midis.forEach(m => playNote(context, m, start, dur, peak, waveform))
  }
}

// アルペジオ: 構成音を低い順に1音ずつ、少し余韻を残して分散させる
function playArpeggio(context, midis, now, durationSec, beatSec, waveform, gainScale) {
  const step = beatSec / 2
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
 * コードを指定した演奏スタイル・音色で鳴らす。
 * @param {number[]} midis      構成音（MIDIノート番号）
 * @param {number}   durationSec コード全体の長さ（秒）
 * @param {'block'|'comp'|'arpeggio'} style 演奏スタイル
 * @param {number}   bpm        テンポ（刻み/アルペジオの細分に使う）
 * @param {OscillatorType} waveform 音色（sine/triangle/square/sawtooth）
 */
export function playChord(midis, durationSec, style = 'block', bpm = 90, waveform = 'triangle') {
  if (!midis || !midis.length) return
  const context = getCtx()
  const now = context.currentTime
  const beatSec = 60 / bpm
  const gainScale = WAVE_GAIN[waveform] ?? 1
  if (style === 'comp') return playComp(context, midis, now, durationSec, beatSec, waveform, gainScale)
  if (style === 'arpeggio') return playArpeggio(context, midis, now, durationSec, beatSec, waveform, gainScale)
  return playBlock(context, midis, now, durationSec, waveform, gainScale)
}
