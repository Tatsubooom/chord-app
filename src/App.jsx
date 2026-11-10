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
import SectionMap from './components/SectionMap'
import { SCALES } from './engines/chordEngine'
import { KEY_LABELS } from './constants'

export default function App() {
  const [key, setKey] = useState('C')
  const [scale, setScale] = useState('major')
  const [bpm, setBpm] = useState(90)
  const [temperature, setTemperature] = useState(0.3)
  const [spice, setSpice] = useState(0.5)
  const [enableMultiChord, setEnableMultiChord] = useState(true)
  const [enableSubs, setEnableSubs] = useState(true)
  const [playStyle, setPlayStyle] = useState('block')
  const [rhythmSpeed, setRhythmSpeed] = useState('normal')
  const [waveform, setWaveform] = useState('triangle')
  const [showSettings, setShowSettings] = useState(true)

  const { playing, currentChord, history, distribution, upcoming, beatPos, sectionView, toggle } = useChordSequencer({
    key,
    scale,
    bpm,
    temperature,
    spice,
    enableMultiChord,
    enableSubs,
    playStyle,
    rhythmSpeed,
    waveform,
  })

  return (
    <div className="app">
      <header className="masthead">
        <span className="masthead__brand">Chord Stream</span>
        <span className="masthead__summary">
          {KEY_LABELS[key] ?? key} · {SCALES[scale].label} · {bpm} BPM
        </span>
      </header>

      <main>
        <div className="stage">
          <ChordDisplay chord={currentChord} />
          <ProbabilityMeter distribution={distribution} />
        </div>

        <Piano activeMidis={currentChord?.midis || []} bassMidi={currentChord?.voicing?.bass ?? null} />

        <TransportControls
          playing={playing}
          onToggle={toggle}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(s => !s)}
          beatPos={beatPos}
          bpm={bpm}
        />

        <SectionMap section={sectionView} upcoming={upcoming} />
        <ChordHistory history={history} />

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
            spice={spice}
            onSpiceChange={setSpice}
            enableMultiChord={enableMultiChord}
            onToggleMultiChord={setEnableMultiChord}
            enableSubs={enableSubs}
            onToggleSubs={setEnableSubs}
            playStyle={playStyle}
            onPlayStyleChange={setPlayStyle}
            rhythmSpeed={rhythmSpeed}
            onRhythmSpeedChange={setRhythmSpeed}
            waveform={waveform}
            onWaveformChange={setWaveform}
          />
        )}

        <DecorationInfo
          scale={scale}
          temperature={temperature}
          spice={spice}
          enableMultiChord={enableMultiChord}
          enableSubs={enableSubs}
        />
      </main>
    </div>
  )
}
