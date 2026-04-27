import { useState, useRef, useEffect } from 'react'
import { buildChord, getDefs } from './engines/chordEngine'
import { weightedRandom } from './engines/weightEngine'
import { calcWeights } from './engines/weightEngine'
import { playChord } from './engines/audioEngine'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function App() {
  const [playing, setPlaying] = useState(false)
  const [key, setKey] = useState('C')
  const [mode, setMode] = useState('major')
  const [bpm, setBpm] = useState(90)
  const [temperature, setTemperature] = useState(0.3)
  const [history, setHistory] = useState([])
  const [currentChord, setCurrentChord] = useState(null)

  const timerRef = useRef(null)
  const historyRef = useRef([])
  const stateRef = useRef({ playing, key, mode, bpm, temperature })

  useEffect(() => {
    stateRef.current = { playing, key, mode, bpm, temperature }
  }, [playing, key, mode, bpm, temperature])

  function next() {
    const { playing, key, mode, bpm, temperature } = stateRef.current
    if (!playing) return

    const currentDegree = historyRef.current[0]?.degree ?? 0
    const weights = calcWeights(currentDegree, historyRef.current, mode, temperature)
    const degree = weightedRandom(weights)
    const chord = buildChord(key, mode, degree, temperature)
    const durSec = (60 / bpm) * 4

    historyRef.current = [chord, ...historyRef.current].slice(0, 20)
    playChord(chord.midis, durSec)
    setCurrentChord(chord)
    setHistory([...historyRef.current])
    timerRef.current = setTimeout(next, durSec * 1000)
  }

  function toggle() {
    if (playing) {
      clearTimeout(timerRef.current)
      historyRef.current = []
      setHistory([])
      setPlaying(false)
      setCurrentChord(null)
    } else {
      setPlaying(true)
    }
  }

  useEffect(() => {
    if (playing) next()
    return () => clearTimeout(timerRef.current)
  }, [playing])

  return (
    <div>
      <h1>{currentChord ? currentChord.name : '—'}</h1>
      <p>{currentChord?.roman}</p>

      <div style={{ display: 'flex', gap: '12px', flexDirection: 'row-reverse', overflowX: 'auto', justifyContent: 'center' }}>
        {history.map((c, i) => (
          <div key={i} style={{ opacity: 1 - i * 0.05, whiteSpace: 'nowrap' }}>
            {c.name} {c.roman}
          </div>
        ))}
      </div>

      <button onClick={toggle}>{playing ? 'Stop' : 'Play'}</button>

      <select value={key} onChange={e => setKey(e.target.value)}>
        {KEYS.map(k => <option key={k}>{k}</option>)}
      </select>

      <select value={mode} onChange={e => setMode(e.target.value)}>
        <option value="major">Major</option>
        <option value="minor">Minor</option>
      </select>

      <input type="range" min="50" max="200" value={bpm}
        onChange={e => {
          setBpm(Number(e.target.value))
          clearTimeout(timerRef.current)
          timerRef.current = setTimeout(next, (60 / Number(e.target.value)) * 4 * 1000)
        }} />
      <span>{bpm} BPM</span>

      <input type="range" min="0" max="1" step="0.01" value={temperature}
        onChange={e => setTemperature(Number(e.target.value))} />
      <span>{Math.round(temperature * 100)}% random</span>
    </div>
  )
}