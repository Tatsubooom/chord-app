let ctx = null

function getCtx() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function playChord(midis, durationSec) {
  const context = getCtx()
  const now = context.currentTime
  const gain = context.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.12, now + 0.05)
  gain.gain.linearRampToValueAtTime(0, now + durationSec * 0.95)
  gain.connect(context.destination)

  midis.forEach(midi => {
    const osc = context.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + durationSec)
  })
}