import { FUNCTION_LABELS } from '../constants'

const signed = n => (n > 0 ? `+${n}` : n === 0 ? '±0' : `−${-n}`)

// 現在のコード。大きなコード名と、その下に機能・ローマ数字・ボイシングの表。
export default function ChordDisplay({ chord }) {
  const popup = chord?.pattern || chord?.tag
  const [bassName, ...upperNames] = chord ? chord.noteNames : []

  return (
    <div className="now">
      <div className="now__line">
        <span className="now__roman">{chord?.roman ?? '—'}</span>
        {chord?.func && (
          <span className="now__fn" title={FUNCTION_LABELS[chord.func]}>
            {chord.func}
          </span>
        )}
        {chord?.gesture && <span className="now__gesture">{chord.gesture}</span>}
      </div>

      <div className="now__name-wrap">
        <h1 className="now__name">{chord ? chord.name : '—'}</h1>
        {popup && (
          // key に chord.id を使い、コードが変わるたびに再マウントしてアニメーションを再生する
          <div className="popup" key={chord.id} role="status">
            {chord.pattern ? '定番 ' : ''}
            {popup}
          </div>
        )}
      </div>

      <dl className="voicing">
        <dt>Bass</dt>
        <dd>{chord ? bassName : '—'}</dd>
        <dt>Upper</dt>
        <dd>{chord ? upperNames.join(' ') : '—'}</dd>
        <dt>Motion</dt>
        <dd>
          {chord?.motion
            ? `B ${signed(chord.motion.bass)}  /  ` +
              (chord.motion.upper ? chord.motion.upper.map(signed).join(' ') : '声部数が変化')
            : '—'}
        </dd>
      </dl>
    </div>
  )
}
