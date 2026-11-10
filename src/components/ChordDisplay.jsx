import { FUNCTION_LABELS } from '../constants'

const signed = n => (n > 0 ? `+${n}` : n === 0 ? '±0' : `−${-n}`)

// 現在のコード（中央）。コード名・構成音・ローマ数字に、機能・仕掛け・声部の動きを小さく添える。
export default function ChordDisplay({ chord }) {
  const popup = chord?.pattern || chord?.tag

  return (
    <div className="chord-display">
      {popup && (
        // key に chord.id を使い、コードが変わるたびに再マウントしてアニメーションを再生する
        <div className="pattern-popup" key={chord.id} role="status">
          +{popup}
        </div>
      )}
      <h1 className="chord-display__name">{chord ? chord.name : '—'}</h1>
      <p className="chord-display__notes">{chord ? chord.noteNames.join(' / ') : ''}</p>
      <p className="chord-display__roman">
        {chord?.roman}
        {chord?.func && (
          <span className="chord-display__fn" title={FUNCTION_LABELS[chord.func]}>
            {chord.func}
          </span>
        )}
        {chord?.gesture && <span className="chord-display__gesture">{chord.gesture}</span>}
      </p>
      <p className="chord-display__motion">
        {chord?.motion
          ? `bass ${signed(chord.motion.bass)}   upper ${chord.motion.upper ? chord.motion.upper.map(signed).join(' ') : '(声部数が変化)'}`
          : ''}
      </p>
    </div>
  )
}
