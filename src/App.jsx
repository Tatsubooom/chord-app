import { useState } from 'react'
import './app.css'
import { useChordSequencer } from './hooks/useChordSequencer'
import ChordDisplay from './components/ChordDisplay'
import ChordHistory from './components/ChordHistory'
import Piano from './components/Piano'
import TransportControls from './components/TransportControls'
import WeightPanel from './components/WeightPanel'
import PlayControls from './components/PlayControls'
import DecorationInfo from './components/DecorationInfo'
import CircleOfFifths from './components/CircleOfFifths'

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

  const { playing, currentChord, history, beatPos, toggle } = useChordSequencer({
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
      <div className="stage-row">
        <div className="stage">
          <Piano activeMidis={currentChord?.midis || []} bassMidi={currentChord?.voicing?.bass ?? null} />
          <ChordDisplay chord={currentChord} />
          <ChordHistory history={history} />
          {/* 五度圏はピアノロールの右端に重ねる「補助計器」。主役のコード名はページ中央の軸に置く */}
          <CircleOfFifths history={history} keyName={key} scale={scale} />
        </div>
      </div>

      <TransportControls playing={playing} onToggle={toggle} beatPos={beatPos} bpm={bpm}>
        <PlayControls
          playStyle={playStyle}
          onPlayStyleChange={setPlayStyle}
          rhythmSpeed={rhythmSpeed}
          onRhythmSpeedChange={setRhythmSpeed}
          waveform={waveform}
          onWaveformChange={setWaveform}
        />
      </TransportControls>

      <WeightPanel
        open={showSettings}
        onToggleOpen={() => setShowSettings(s => !s)}
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
      />

      <div className="readout">
        <DecorationInfo
          scale={scale}
          temperature={temperature}
          spice={spice}
          enableMultiChord={enableMultiChord}
          enableSubs={enableSubs}
          chord={currentChord}
          playing={playing}
        />
      </div>
    </div>
  )
}
