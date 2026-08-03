import { useState } from 'react'
import './app.css'
import { useChordSequencer } from './hooks/useChordSequencer'
import ChordDisplay from './components/ChordDisplay'
import ChordHistory from './components/ChordHistory'
import TransportControls from './components/TransportControls'
import WeightPanel from './components/WeightPanel'
import ScaleLegend from './components/ScaleLegend'

export default function App() {
  const [key, setKey] = useState('C')
  const [scale, setScale] = useState('major')
  const [bpm, setBpm] = useState(90)
  const [temperature, setTemperature] = useState(0.3)
  const [enableMultiChord, setEnableMultiChord] = useState(true)

  const { playing, currentChord, history, toggle } = useChordSequencer({
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

      <TransportControls
        playing={playing}
        onToggle={toggle}
        enableMultiChord={enableMultiChord}
        onToggleMultiChord={setEnableMultiChord}
      />

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

      <ScaleLegend scale={scale} />
    </div>
  )
}
