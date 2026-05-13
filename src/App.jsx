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
  
  const [enableMultiChord, setEnableMultiChord] = useState(true)

  const [history, setHistory] = useState([])
  const [currentChord, setCurrentChord] = useState(null)

  const timerRef = useRef(null)
  const historyRef = useRef([])
  const totalBeatsRef = useRef(0) 
  const stateRef = useRef({ playing, key, scale, bpm, temperature, enableMultiChord })

  useEffect(() => {
    stateRef.current = { playing, key, scale, bpm, temperature, enableMultiChord }
  }, [playing, key, scale, bpm, temperature, enableMultiChord])

  function next() {
    const { playing, key, scale, bpm, temperature, enableMultiChord } = stateRef.current
    if (!playing) return

    const scaleData = SCALES[scale]
    const scaleLength = scaleData.intervals.length
    const currentDegree = historyRef.current[0]?.degree ?? 0
    const mode = ['major', 'minor'].includes(scale) ? scale : 'major'
    const weights = calcWeights(currentDegree, historyRef.current, mode, temperature, scaleLength)
    const degree = weightedRandom(weights)
    
    let beats = 4;
    // DAWのグリッド入力に合わせた、自然なリズムの分割ロジック
    const currentMeasureId = Math.floor(totalBeatsRef.current / 4);

    if (enableMultiChord) {
      const currentBeatInMeasure = totalBeatsRef.current % 4;
      const rem = 4 - currentBeatInMeasure; 
      const r = Math.random();
      
      // Temp=0.3の時、分割される確率は 0.09 (9%) と極めて低く設定
      const splitProb = Math.pow(temperature, 2); 
      // 1拍になる確率はさらに低く設定
      const oneBeatProb = splitProb * 0.3; 

      if (rem === 4) {
        // 小節の頭: 分割される場合は基本的に「2拍」にして安定させる
        if (r < splitProb) beats = 2;
        else beats = 4;
      } else if (rem === 2) {
        // 小節の半分(3拍目): ごく稀に1拍の経過和音を入れる
        if (r < oneBeatProb) beats = 1;
        else beats = 2;
      } else {
        // 1拍目裏や3拍目裏などの中途半端な位置は強制的に1拍にしてグリッドを合わせる
        beats = 1;
      }
    }

    const chord = buildChord(key, scale, degree, temperature)
    chord.beats = beats
    chord.isMeasureStart = (totalBeatsRef.current % 4) === 0
    chord.measureId = currentMeasureId

    totalBeatsRef.current += beats
    const durSec = (60 / bpm) * beats

    let newHistory = [chord, ...historyRef.current]
    let beatSum = 0
    let keepCount = 0
    for(let c of newHistory) {
      beatSum += c.beats
      keepCount++
      if(beatSum >= 32) break // 厳密に32拍(8小節)で打ち切り
    }
    historyRef.current = newHistory.slice(0, keepCount)

    playChord(chord.midis, durSec, bpm, beats)
    setCurrentChord(chord)
    setHistory([...historyRef.current])
    timerRef.current = setTimeout(next, durSec * 1000)
  }

  function toggle() {
    if (playing) {
      clearTimeout(timerRef.current)
      historyRef.current = []
      totalBeatsRef.current = 0
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
      <div style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ margin: '0' }}>{currentChord ? currentChord.name : '—'}</h1>
        <p style={{ fontSize: '1.2em', color: '#555', margin: '8px 0' }}>
          {currentChord ? currentChord.noteNames.join(' / ') : ''}
        </p>
        <p style={{ margin: '0', fontSize: '1.1em' }}>
          {currentChord?.roman} 
          {/* 現在のコードからは (4 beats) などの長さを削除しました */}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexDirection: 'row-reverse', overflowX: 'auto', justifyContent: 'center', alignItems: 'center', margin: '30px 0', minHeight: '60px' }}>
        {history.map((c, i) => {
          // 4小節ごと（measureIdが4の倍数）の小節頭に区切り線を配置する
          const isBlockStart = c.isMeasureStart && (c.measureId % 4 === 0);

          return (
            <Fragment key={i}>
              <div style={{ opacity: 1 - i * 0.05, whiteSpace: 'nowrap', textAlign: 'center' }}>
                {/* 履歴表示からローマ数字を削除し、コード名とドットのみに */}
                <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{c.name}</div>
                <div style={{ fontSize: '0.6em', letterSpacing: '2px', color: '#888', marginTop: '6px' }}>
                  {'・'.repeat(c.beats)}
                </div>
              </div>
              {isBlockStart && i !== history.length - 1 && (
                <div style={{ color: '#666', fontWeight: 'bold', margin: '0 4px' }}>|</div>
              )}
            </Fragment>
          )
        })}
      </div>

      <div style={{ margin: '20px 0', display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button onClick={toggle}>{playing ? 'Stop' : 'Play'}</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input type="checkbox" checked={enableMultiChord} onChange={e => setEnableMultiChord(e.target.checked)} />
          Multi-Chord (複数コード)
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '300px', margin: '0 auto' }}>
        <select value={key} onChange={e => setKey(e.target.value)} style={{ width: '100%' }}>
          {KEYS.map(k => <option key={k}>{k}</option>)}
        </select>

        <select value={scale} onChange={e => setScale(e.target.value)} style={{ width: '100%' }}>
          {Object.entries(SCALES).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          <input type="range" min="50" max="200" value={bpm} style={{ flexGrow: 1 }}
            onChange={e => setBpm(Number(e.target.value))} />
          <span style={{ marginLeft: '15px', minWidth: '70px', textAlign: 'right' }}>{bpm} BPM</span>
        </div>

        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          <input type="range" min="0" max="1" step="0.01" value={temperature} style={{ flexGrow: 1 }}
            onChange={e => setTemperature(Number(e.target.value))} />
          <span style={{ marginLeft: '15px', minWidth: '70px', textAlign: 'right' }}>{Math.round(temperature * 100)}%</span>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        {getDefs(scale).map((def, i) => {
          const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
          const baseRoman = romanNumerals[i % 7] || '?';
          const isMinor = def.relThird === 3; 
          const isDim = def.relThird === 3 && def.relFifth === 6;
          
          let roman = isMinor ? baseRoman.toLowerCase() : baseRoman;
          if (isMinor && !isDim) roman += 'm';
          if (isDim) roman = baseRoman.toLowerCase() + '°';
          
          return (
            <div key={i} style={{ marginBottom: '4px', color: '#888' }}>
              <span>{roman} (Root: +{def.root})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}