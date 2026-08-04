import { useState, useRef, useEffect } from 'react'
import { SCALES, buildChord } from '../engines/chordEngine'
import { weightedRandom, calcWeights, getPatternMatches, pickPhraseTemplate } from '../engines/weightEngine'
import { playChord } from '../engines/audioEngine'
import {
  BEATS_PER_MEASURE,
  HISTORY_BEATS,
  MEASURE_SPLIT_SCALE,
  PATTERN_MIN_RUN,
  PATTERN_POPUP_COOLDOWN,
  RHYTHM_SPEEDS,
} from '../constants'

// DAWのグリッド入力に合わせた、自然なリズムの分割ロジック。
// 拍位置に応じてコードの長さ（拍数）を決める。
function pickBeats(totalBeats, temperature, enableMultiChord) {
  if (!enableMultiChord) return BEATS_PER_MEASURE

  const beatInMeasure = totalBeats % BEATS_PER_MEASURE
  const rem = BEATS_PER_MEASURE - beatInMeasure
  const r = Math.random()

  // 分割確率は temperature^2 に全体スケールを掛けて低めに抑える（Temp=0.3 で約3.6%）。
  // 1拍になる確率はさらに低い。
  const splitProb = Math.pow(temperature, 2) * MEASURE_SPLIT_SCALE
  const oneBeatProb = splitProb * 0.3

  if (rem === 4) {
    // 小節の頭: 分割する場合は「2拍」にして安定させる
    return r < splitProb ? 2 : 4
  }
  if (rem === 2) {
    // 3拍目: ごく稀に1拍の経過和音を入れる
    return r < oneBeatProb ? 1 : 2
  }
  // 中途半端な位置は強制的に1拍にしてグリッドを合わせる
  return 1
}

// 履歴を直近 HISTORY_BEATS 拍ぶんに切り詰める
function trimHistory(history) {
  let beatSum = 0
  let keepCount = 0
  for (const c of history) {
    beatSum += c.beats
    keepCount++
    if (beatSum >= HISTORY_BEATS) break
  }
  return history.slice(0, keepCount)
}

/**
 * コード進行を確率的に生成し続けるスケジューラ。
 * settings（key/scale/bpm/temperature/enableMultiChord）は最新値を ref 経由で参照する。
 */
export function useChordSequencer(settings) {
  const [playing, setPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState(null)
  const [history, setHistory] = useState([])
  const [distribution, setDistribution] = useState([])

  const timerRef = useRef(null)
  const historyRef = useRef([])
  const totalBeatsRef = useRef(0)
  const idRef = useRef(0)
  const cooldownRef = useRef(0)
  const phraseRef = useRef(null)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  function next() {
    const { key, scale, bpm, temperature, enableMultiChord, playStyle, enableSubs, waveform, rhythmSpeed } = settingsRef.current
    const speedDiv = RHYTHM_SPEEDS.find(s => s.value === rhythmSpeed)?.div ?? 2

    const scaleLength = SCALES[scale].intervals.length
    const currentDegree = historyRef.current[0]?.degree ?? 0
    const mode = ['major', 'minor'].includes(scale) ? scale : 'major'

    const totalBeats = totalBeatsRef.current
    const isMeasureStart = totalBeats % BEATS_PER_MEASURE === 0
    const measureId = Math.floor(totalBeats / BEATS_PER_MEASURE)

    // 小節頭では、フレーズテンプレートの骨格に沿った目標度数を設定する。
    // フレーズを使い切ったら（直前と別の）テンプレートを選び直して塊ごとに変化させる。
    let target = null
    if (isMeasureStart) {
      let phrase = phraseRef.current
      if (!phrase || measureId - phrase.startMeasure >= phrase.seq.length) {
        const tpl = pickPhraseTemplate(mode, scaleLength, phrase?.name)
        phrase = { name: tpl.name, seq: tpl.seq, startMeasure: measureId }
        phraseRef.current = phrase
      }
      target = phrase.seq[measureId - phrase.startMeasure] % scaleLength
    }

    const weights = calcWeights(currentDegree, historyRef.current, mode, temperature, scaleLength, target)
    const degree = weightedRandom(weights)

    // 選ばれた度数が定番進行の「次の一手」に一致していれば、その進行名を通知に載せる。
    // 単発の偶然を避けるため直近 PATTERN_MIN_RUN コード以上の連続一致に限り、
    // 連続で出しすぎないよう PATTERN_POPUP_COOLDOWN コードぶんのクールダウンを設ける。
    const matches = getPatternMatches(historyRef.current, mode, temperature, scaleLength)[degree] || []
    const strong = matches.filter(m => m.matchLen >= PATTERN_MIN_RUN)
    let pattern = null
    if (strong.length && cooldownRef.current <= 0) {
      // 最も長く確定している（＝確信度の高い）進行を選ぶ。同点は加点の大きい方。
      const best = strong.reduce((a, b) =>
        b.matchLen > a.matchLen || (b.matchLen === a.matchLen && b.value > a.value) ? b : a,
      )
      pattern = best.name
      cooldownRef.current = PATTERN_POPUP_COOLDOWN
    }
    cooldownRef.current = Math.max(0, cooldownRef.current - 1)

    const beats = pickBeats(totalBeats, temperature, enableMultiChord)

    const chord = buildChord(key, scale, degree, temperature, enableSubs)
    chord.id = idRef.current++
    chord.pattern = pattern
    chord.beats = beats
    chord.isMeasureStart = isMeasureStart
    chord.measureId = measureId

    totalBeatsRef.current = totalBeats + beats
    historyRef.current = trimHistory([chord, ...historyRef.current])

    // 次のコードの確率分布を算出（ビジュアライザ用）。今鳴らしたコードを起点にした遷移重み。
    const nextWeights = calcWeights(degree, historyRef.current, mode, temperature, scaleLength)
    const total = nextWeights.reduce((a, b) => a + b, 0) || 1
    const dist = nextWeights.map((w, d) => ({
      degree: d,
      name: buildChord(key, scale, d, 0).name, // 決定的なトライアド名をラベルに
      prob: w / total,
    }))

    const durSec = (60 / bpm) * beats
    playChord(chord.midis, durSec, { style: playStyle, bpm, waveform, speedDiv })
    setCurrentChord(chord)
    setHistory([...historyRef.current])
    setDistribution(dist)
    timerRef.current = setTimeout(next, durSec * 1000)
  }

  function toggle() {
    if (playing) {
      clearTimeout(timerRef.current)
      historyRef.current = []
      totalBeatsRef.current = 0
      cooldownRef.current = 0
      phraseRef.current = null
      setHistory([])
      setCurrentChord(null)
      setDistribution([])
      setPlaying(false)
    } else {
      setPlaying(true)
    }
  }

  useEffect(() => {
    if (playing) next()
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  return { playing, currentChord, history, distribution, toggle }
}
