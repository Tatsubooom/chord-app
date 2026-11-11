const signed = n => (n > 0 ? `+${n}` : n === 0 ? '±0' : `−${-n}`)

// 現在のコード（中央）。コード名と構成音に、声部の動きを小さく添える。
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
      <p className="chord-display__motion">
        {chord?.motion
          ? `bass ${signed(chord.motion.bass)}   upper ${chord.motion.upper ? chord.motion.upper.map(signed).join(' ') : '(声部数が変化)'}`
          : ''}
      </p>
    </div>
  )
}
