let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function playChord(midis, durationSec) {
  const context = getCtx()
  const now = context.currentTime
  const gain = context.createGain()
  
  // 構成音の数に応じてボリュームを調整（音割れ防止）
  const volume = 0.4 / midis.length
  
  gain.gain.setValueAtTime(0, now)
  // 1. アタック：0.05秒で素早く最大音量へ
  gain.gain.linearRampToValueAtTime(volume, now + 0.05) 
  
  // 2. ディケイ（減衰）：ゼロに向かって急降下するのではなく、
  // 終了0.05秒前までに「最大音量の20%」まで緩やかに下げる
  gain.gain.exponentialRampToValueAtTime(volume * 0.2, now + durationSec - 0.05)
  
  // 3. リリース：次のコードに切り替わる直前の0.05秒で完全に音を消す（プチノイズ防止）
  gain.gain.linearRampToValueAtTime(0, now + durationSec)
  
  gain.connect(context.destination)

  midis.forEach(midi => {
    const osc = context.createOscillator()
    osc.type = 'triangle'
    
    // タイミングずれを防ぐための setValueAtTime
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), now)
    
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + durationSec)
  })
}