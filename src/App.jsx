import { useState, useRef, useEffect } from 'react'
import { buildChord, getDefs } from './engines/chordEngine'
import { weightedRandom } from './engines/weightEngine'
import { playChord } from './engines/audioEngine'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function App() {
  const [playing, setPlaying] = useState(false)
  const [key, setKey] = useState('C')
  const [mode, setMode] = useState('major')
  const [bpm, setBpm] = useState(90)
  const [weights, setWeights] = useState([8,2,2,7,8,6,1])
  const [currentChord, setCurrentChord] = useState(null)

  const timerRef = useRef(null)
  const stateRef = useRef({ playing, key, mode, bpm, weights })

  useEffect(() => {
    stateRef.current = { playing, key, mode, bpm, weights }
  }, [playing, key, mode, bpm, weights])

  function next() {
    const { playing, key, mode, bpm, weights } = stateRef.current
    if (!playing) return
    const degree = weightedRandom(weights)
    const chord = buildChord(key, mode, degree)
    const durSec = (60 / bpm) * 4
    playChord(chord.midis, durSec)
    setCurrentChord(chord)
    timerRef.current = setTimeout(next, durSec * 1000)
  }

  function toggle() {
    if (playing) {
      clearTimeout(timerRef.current)
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

      <button onClick={toggle}>{playing ? 'Stop' : 'Play'}</button>

      <select value={key} onChange={e => setKey(e.target.value)}>
        {KEYS.map(k => <option key={k}>{k}</option>)}
      </select>

      <select value={mode} onChange={e => setMode(e.target.value)}>
        <option value="major">Major</option>
        <option value="minor">Minor</option>
      </select>

      <input type="range" min="50" max="200" value={bpm}
        onChange={e => setBpm(Number(e.target.value))} />
      <span>{bpm} BPM</span>

      {getDefs(mode).map((def, i) => (
        <div key={i}>
          <span>{def.roman}</span>
          <input type="range" min="0" max="10" value={weights[i]}
            onChange={e => {
              const next = [...weights]
              next[i] = Number(e.target.value)
              setWeights(next)
            }} />
        </div>
      ))}
    </div>
  )
}