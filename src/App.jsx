import { useState } from 'react'
import './app.css'
import { useChordSequencer } from './hooks/useChordSequencer'
import ChordDisplay from './components/ChordDisplay'
import ChordHistory from './components/ChordHistory'
import ProbabilityMeter from './components/ProbabilityMeter'
import TransportControls from './components/TransportControls'
import WeightPanel from './components/WeightPanel'
import DecorationInfo from './components/DecorationInfo'

export default function App() {
  const [key, setKey] = useState('C')
  const [scale, setScale] = useState('major')
  const [bpm, setBpm] = useState(90)
  const [temperature, setTemperature] = useState(0.3)
  const [enableMultiChord, setEnableMultiChord] = useState(true)
  const [showSettings, setShowSettings] = useState(true)

  const { playing, currentChord, history, distribution, toggle } = useChordSequencer({
    key,
    scale,
    bpm,
    temperature,
    enableMultiChord,
  })

  return (
    <div>
      <ChordDisplay chord={currentChord} />
      <ChordHistory history={history} />
      <ProbabilityMeter distribution={distribution} />

      <TransportControls
        playing={playing}
        onToggle={toggle}
        enableMultiChord={enableMultiChord}
        onToggleMultiChord={setEnableMultiChord}
      />

      <div className="settings">
        <button
          className="settings__toggle"
          onClick={() => setShowSettings(s => !s)}
          aria-expanded={showSettings}
        >
          {showSettings ? '設定を閉じる ▲' : '設定を開く ▼'}
        </button>

        {showSettings && (
          <WeightPanel
            keyName={key}
            onKeyChange={setKey}
            scale={scale}
            onScaleChange={setScale}
            bpm={bpm}
            onBpmChange={setBpm}
            temperature={temperature}
            onTemperatureChange={setTemperature}
          />
        )}
      </div>

      <DecorationInfo temperature={temperature} enableMultiChord={enableMultiChord} />
    </div>
  )
}
