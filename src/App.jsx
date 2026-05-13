import { useState, useRef, useEffect, Fragment } from 'react'
import { SCALES, buildChord, getDefs } from './engines/chordEngine'
import { weightedRandom, calcWeights } from './engines/weightEngine'
import { playChord } from './engines/audioEngine'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export default function App() {
  const [playing, setPlaying] = useState(false)
  const [key, setKey] = useState('C')
  const [scale, setScale] = useState('major')
  const [bpm, setBpm] = useState(90)
  const [temperature, setTemperature] = useState(0.3)
  const [history, setHistory] = useState([])
  const [currentChord, setCurrentChord] = useState(null)

  const timerRef = useRef(null)
  const historyRef = useRef([])
  const stateRef = useRef({ playing, key, scale, bpm, temperature })

  useEffect(() => {
    stateRef.current = { playing, key, scale, bpm, temperature }
  }, [playing, key, scale, bpm, temperature])

  function next() {
    const { playing, key, scale, bpm, temperature } = stateRef.current
    if (!playing) return

    const scaleData = SCALES[scale]
    const scaleLength = scaleData.intervals.length
    const currentDegree = historyRef.current[0]?.degree ?? 0
    const mode = ['major', 'minor'].includes(scale) ? scale : 'major'
    const weights = calcWeights(currentDegree, historyRef.current, mode, temperature, scaleLength)
    const degree = weightedRandom(weights)
    const chord = buildChord(key, scale, degree, temperature)
    const durSec = (60 / bpm) * 4

    // 履歴を直近12件に制限
    historyRef.current = [chord, ...historyRef.current].slice(0, 12)
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
      {/* 構成音の表示を追加 */}
      <p style={{ fontSize: '1.2em', color: '#555', margin: '4px 0' }}>
        {currentChord ? currentChord.noteNames.join(' / ') : ''}
      </p>
      <p>{currentChord?.roman}</p>

      <div style={{ display: 'flex', gap: '12px', flexDirection: 'row-reverse', overflowX: 'auto', justifyContent: 'center', alignItems: 'center', margin: '20px 0' }}>
        {history.map((c, i) => (
          <Fragment key={i}>
            <div style={{ opacity: 1 - i * 0.05, whiteSpace: 'nowrap' }}>
              {c.name} {c.roman}
            </div>
            {/* 4コードごとに区切り線を追加 (最後の要素には表示しない) */}
            {(i + 1) % 4 === 0 && i !== history.length - 1 && (
              <div style={{ color: '#aaa', fontWeight: 'bold' }}>|</div>
            )}
          </Fragment>
        ))}
      </div>

      <button onClick={toggle}>{playing ? 'Stop' : 'Play'}</button>

      <select value={key} onChange={e => setKey(e.target.value)}>
        {KEYS.map(k => <option key={k}>{k}</option>)}
      </select>

      <select value={scale} onChange={e => setScale(e.target.value)}>
        {Object.entries(SCALES).map(([value, { label }]) => (
          <option key={value} value={value}>{label}</option>
        ))}
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

      <div style={{ marginTop: '20px' }}>
        {getDefs(scale).map((def, i) => {
          const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
          const baseRoman = romanNumerals[i % 7] || '?';
          const isMinor = def.relThird === 3; 
          const isDim = def.relThird === 3 && def.relFifth === 6;
          
          let roman = isMinor ? baseRoman.toLowerCase() : baseRoman;
          if (isMinor && !isDim) roman += 'm';
          if (isDim) roman = baseRoman.toLowerCase() + '°';
          
          return (
            <div key={i}>
              <span>{roman} (Root: +{def.root})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}