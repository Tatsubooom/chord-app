import { useState } from 'react'
import './app.css'
import { useChordSequencer } from './hooks/useChordSequencer'
import ChordDisplay from './components/ChordDisplay'
import ChordHistory from './components/ChordHistory'
import Piano from './components/Piano'
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
    <div className="app">
      <div className="stage">
        <Piano activeMidis={currentChord?.midis || []} />
        <ChordDisplay chord={currentChord} />
        <ChordHistory history={history} />
      </div>

      <TransportControls
        playing={playing}
        onToggle={toggle}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(s => !s)}
      />

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
          enableMultiChord={enableMultiChord}
          onToggleMultiChord={setEnableMultiChord}
        />
      )}

      <div className="readout">
        <ProbabilityMeter distribution={distribution} />
        <DecorationInfo temperature={temperature} enableMultiChord={enableMultiChord} />
      </div>
    </div>
  )
}
