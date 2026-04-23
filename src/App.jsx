import { useState, useRef, useEffect } from 'react'
import { buildChord, getDefs } from './engines/chordEngine'
import { weightedRandom } from './engines/weightEngine'
import { playChord } from './engines/audioEngine'

//　キーのドロップダウン
const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']


export default function App() {
  const [playing, setPlaying] = useState(false)
  const [key, setKey] = useState('C')
  const [mode, setMode] = useState('major')
  const [bpm, setBpm] = useState(90)
  const [history, setHistory] = useState([])

  //　各コードの重み（出やすさ）
  const [weights, setWeights] = useState([8,2,2,7,8,6,1])
  const [currentChord, setCurrentChord] = useState(null)

  //　再レンダリングされないようにrefで全状態・時間を管理する
  const timerRef = useRef(null)
  const stateRef = useRef({ playing, key, mode, bpm, weights })

  // useEffectで差分を検出 / stateref経由で状態を管理する
  useEffect(() => {
    stateRef.current = { playing, key, mode, bpm, weights }
  }, [playing, key, mode, bpm, weights])

  // MAIN処理
  function next() {
    const { playing, key, mode, bpm, weights } = stateRef.current
    if (!playing) return
    const degree = weightedRandom(weights)
    const chord = buildChord(key, mode, degree)
    const durSec = (60 / bpm) * 4

    //　音の再生
    playChord(chord.midis, durSec)
    setCurrentChord(chord)
    setHistory(prev => [chord, ...prev].slice(0, 20))
    timerRef.current = setTimeout(next, durSec * 1000)
  }

  //　再生・停止の切り替え
  function toggle() {
    if (playing) {
      clearTimeout(timerRef.current)
      setHistory([])
      setPlaying(false)
      setCurrentChord(null)
    } else {
      setPlaying(true)
    }
  }

  // playingの差分取得してnext()を一回だけ実行
  useEffect(() => {
    if (playing) next()
    return () => clearTimeout(timerRef.current)
  }, [playing])

  return (
    <div>
      <h1>{currentChord ? currentChord.name : '—'}</h1>
      <p>{currentChord?.roman}</p>

      <div style={{ display: 'flex', gap: '12px', flexDirection: 'row-reverse', overflowX: 'auto' , justifyContent: 'center'}}>
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