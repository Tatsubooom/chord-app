let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playChord(midis, durationSec) {
  const context = getCtx();
  const now = context.currentTime;
  
  const masterGain = context.createGain();
  // 音数による音量補正
  const volume = 0.18 / Math.sqrt(midis.length);
  
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(volume, now + 0.05);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
  
  // 低域を少し強調し、高域のトゲを抑えるためのフィルター
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2500, now); // 高すぎる倍音をカット

  masterGain.connect(filter);
  filter.connect(context.destination);

  midis.forEach((midi, i) => {
    const osc = context.createOscillator();
    // ベース音はより太いサイン波、構成音は柔らかなトライアングル波
    osc.type = i === 0 ? 'sine' : 'triangle';
    
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    osc.frequency.setValueAtTime(freq, now);
    
    // 微小なデチューンで厚みを出す
    if (i > 0) osc.detune.setValueAtTime(Math.random() * 4 - 2, now);

    const delay = i * 0.012;
    osc.connect(masterGain);
    osc.start(now + delay);
    osc.stop(now + durationSec);
  });
}