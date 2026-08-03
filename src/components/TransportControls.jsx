export default function TransportControls({ playing, onToggle, showSettings, onToggleSettings }) {
  return (
    <div className="transport">
      <button onClick={onToggle}>{playing ? 'Stop' : 'Play'}</button>
      <button
        className="transport__settings"
        onClick={onToggleSettings}
        aria-expanded={showSettings}
      >
        {showSettings ? '設定を閉じる ▲' : '設定を開く ▼'}
      </button>
    </div>
  )
}
