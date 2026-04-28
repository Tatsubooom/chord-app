let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playChord(midis, durationSec) {
  const context = getCtx();
  const now = context.currentTime;
  
  // 全体の音量バランスを調整（音数が増えるほど1音を小さく）
  const masterGain = context.createGain();
  const volumeScale = 0.25 / Math.sqrt(midis.length); // 非線形に抑えて迫力を維持
  
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(volumeScale, now + 0.04);
  masterGain.gain.linearRampToValueAtTime(volumeScale * 0.8, now + durationSec * 0.5);
  masterGain.gain.linearRampToValueAtTime(0, now + durationSec);
  
  masterGain.connect(context.destination);

  // 周波数のソート（低い音から順に発音させて美しく）
  const sortedMidis = [...midis].sort((a, b) => a - b);

  sortedMidis.forEach((midi, i) => {
    const osc = context.createOscillator();
    
    // 音色のブレンド: 低音は力強く、高音は繊細に
    if (i === 0) {
      osc.type = 'sine'; // ベースはサイン波で芯を作る
    } else {
      osc.type = 'triangle'; // 上モノはトライアングル波
    }
    
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    osc.frequency.setValueAtTime(freq, now);
    
    // ストラム（バラし）効果: 高い音ほど少し遅れて鳴らす
    const delay = i * 0.02; 
    
    osc.connect(masterGain);
    osc.start(now + delay);
    osc.stop(now + durationSec);
  });
}