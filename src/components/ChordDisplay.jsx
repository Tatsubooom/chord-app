import { FUNCTION_LABELS } from '../constants'

const signed = n => (n > 0 ? `+${n}` : n === 0 ? '0' : `−${-n}`)

export default function ChordDisplay({ chord }) {
  const popup = chord?.pattern || chord?.tag
  const [bassName, ...upperNames] = chord ? chord.noteNames : []

  return (
    <div className="chord-display">
      {popup && (
        // key に chord.id を使い、コードが変わるたびに再マウントしてアニメーションを再生する
        <div className={'pattern-popup' + (chord.pattern ? '' : ' pattern-popup--gesture')} key={chord.id} role="status">
          +{popup}
        </div>
      )}
      <div className="chord-display__meta">
        {chord?.func && (
          <span className={`fn fn--${chord.func}`} title={FUNCTION_LABELS[chord.func]}>
            {chord.func}
          </span>
        )}
        <span className="chord-display__roman">{chord?.roman ?? '—'}</span>
        {chord?.gesture && <span className="chip">{chord.gesture}</span>}
      </div>
      <h1 className="chord-display__name">{chord ? chord.name : '—'}</h1>
      <div className="chord-display__voicing">
        {chord ? (
          <>
            <span className="voicing__k">BASS</span>
            <span className="voicing__v">{bassName}</span>
            <span className="voicing__k">UPPER</span>
            <span className="voicing__v">{upperNames.join(' ')}</span>
            <span className="voicing__k">MOTION</span>
            <span className="voicing__v">
              {chord.motion
                ? `B ${signed(chord.motion.bass)}` +
                  (chord.motion.upper ? ` · U ${chord.motion.upper.map(signed).join(' ')}` : ' · U (声部数変化)')
                : '—'}
            </span>
          </>
        ) : (
          <span className="voicing__k">ベース＋上声のボイシングと、前のコードからの各声部の動き（半音）を表示</span>
        )}
      </div>
    </div>
  )
}
