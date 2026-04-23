//インスタンス保持（グローバル化）
let ctx = null

//インスタンス初期生成（再生ボタンに紐づけ）
function getCtx() {
  //音声コンテンツをインスタンス化
  if (!ctx) ctx = new AudioContext()

  // state = suspend（停止状態）からの復帰
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

//　コード再生
export function playChord(midis, durationSec) {
  //　インスタンス生成
  const context = getCtx()

  //タイマー起動
  const now = context.currentTime
  const gain = context.createGain()

  //　ゲイン（ボリューム）の変更・設定
  gain.gain.setValueAtTime(0, now)
  //フェードイン (0.05秒後)
  gain.gain.linearRampToValueAtTime(0.12, now + 0.05) 
  // フェードアウト　（1コードの流れる時間の5%前）
  gain.gain.linearRampToValueAtTime(0, now + durationSec * 0.95) 

  //　スピーカーと音声の接続 
  gain.connect(context.destination) 

  //　オシレーター（音）の設定　＆　コード音声生成
  midis.forEach(midi => {
    const osc = context.createOscillator()
    osc.type = 'triangle'

    //　MIDI番号　→　周波数変換 (A4 = 69　= 440Hzを基本とする)
    // ex. B4 = 71 ≒ 493.9 Hz = 440 * 2 ^{(71 - 69) / 12} = 440 * 2^0.167 = 440 * 1.123
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)

    // オシレータをゲインに接続、現在時刻の音源を再生し、設定された演奏時間後止める
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + durationSec)
  })
}