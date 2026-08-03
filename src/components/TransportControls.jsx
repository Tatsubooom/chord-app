export default function TransportControls({ playing, onToggle, enableMultiChord, onToggleMultiChord }) {
  return (
    <div className="transport">
      <button onClick={onToggle}>{playing ? 'Stop' : 'Play'}</button>
      <label className="transport__checkbox">
        <input
          type="checkbox"
          checked={enableMultiChord}
          onChange={e => onToggleMultiChord(e.target.checked)}
        />
        Multi-Chord (複数コード)
      </label>
    </div>
  )
}
