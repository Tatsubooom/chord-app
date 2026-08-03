export default function ChordDisplay({ chord }) {
  return (
    <div className="chord-display">
      {chord?.pattern && (
        // key に chord.id を使い、コードが変わるたびに再マウントしてアニメーションを再生する
        <div className="pattern-popup" key={chord.id} role="status">
          +{chord.pattern}
        </div>
      )}
      <h1 className="chord-display__name">{chord ? chord.name : '—'}</h1>
      <p className="chord-display__notes">
        {chord ? chord.noteNames.join(' / ') : ''}
      </p>
      <p className="chord-display__roman">{chord?.roman}</p>
    </div>
  )
}
