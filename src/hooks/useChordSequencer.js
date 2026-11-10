import { useState, useRef, useEffect } from 'react'
import { buildChord, realizeChord } from '../engines/chordEngine'
import { getPatternMatches } from '../engines/weightEngine'
import { planSection, degreeFunction } from '../engines/planner'
import { playChord, stopAll } from '../engines/audioEngine'
import {
  BEATS_PER_MEASURE,
  HISTORY_BEATS,
  PATTERN_MIN_RUN,
  PATTERN_POPUP_COOLDOWN,
  RHYTHM_SPEEDS,
} from '../constants'

// 先読みキューに最低限確保しておく拍数（これを下回ったら次のセクションを計画する）
const MIN_QUEUED_BEATS = BEATS_PER_MEASURE * 4

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

const modeOf = scale => (scale === 'minor' || scale === 'minorPenta' ? 'minor' : 'major')

// これを変えたら計画済みの進行を作り直す（temperature / spice は次のセクションから反映）
const planSignature = s => [s.scale, s.enableSubs, s.enableMultiChord].join('|')

/**
 * コード進行を8小節先読みで計画し、BPM に合わせて鳴らし続けるスケジューラ。
 * settings は最新値を ref 経由で参照する。
 */
export function useChordSequencer(settings) {
  const [playing, setPlaying] = useState(false)
  const [currentChord, setCurrentChord] = useState(null)
  const [history, setHistory] = useState([])
  const [distribution, setDistribution] = useState([])
  const [beatPos, setBeatPos] = useState(null)

  const timerRef = useRef(null)
  const beatTimersRef = useRef([])
  const historyRef = useRef([])
  const totalBeatsRef = useRef(0)
  const idRef = useRef(0)
  const cooldownRef = useRef(0)
  const arpPhaseRef = useRef(0)
  const voicingRef = useRef(null)
  const queueRef = useRef([])
  const planCtxRef = useRef({})
  const planSigRef = useRef(null)
  const sectionIdxRef = useRef(0)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  function queuedBeats() {
    return queueRef.current.reduce((a, e) => a + e.beats, 0)
  }

  function ensureQueue(s) {
    const sig = planSignature(s)
    if (planSigRef.current !== sig) {
      // 設定が変わったら、今の小節の残りだけ残して計画し直す（小節線の位置は崩さない）
      const keep = []
      let beat = totalBeatsRef.current
      for (const e of queueRef.current) {
        if (beat % BEATS_PER_MEASURE === 0) break
        keep.push(e)
        beat += e.beats
      }
      queueRef.current = keep
      if (planSigRef.current?.split('|')[0] !== s.scale) planCtxRef.current = {}
      planSigRef.current = sig
    }
    while (queuedBeats() < MIN_QUEUED_BEATS) {
      const r = planSection(s, planCtxRef.current)
      planCtxRef.current = r.nextCtx
      const sectionIndex = sectionIdxRef.current++
      for (const e of r.events) queueRef.current.push({ ...e, sectionIndex, section: r.info })
    }
  }

  function next() {
    const s = settingsRef.current
    const { key, scale, bpm, temperature, playStyle, waveform, rhythmSpeed } = s
    const speedDiv = RHYTHM_SPEEDS.find(x => x.value === rhythmSpeed)?.div ?? 2
    const scaleLength = scale === 'majorPenta' || scale === 'minorPenta' ? 5 : 7
    const mode = modeOf(scale)

    ensureQueue(s)
    const e = queueRef.current.shift()
    ensureQueue(s)

    const totalBeats = totalBeatsRef.current
    const spec = e.spec
    const degree = spec.degree

    // 定番進行の「次の一手」に一致していれば、その進行名を通知に載せる（骨格の度数を持つコードのみ）
    let pattern = null
    if (degree != null) {
      const matches = getPatternMatches(historyRef.current, mode, temperature, scaleLength)[degree] || []
      const strong = matches.filter(m => m.matchLen >= PATTERN_MIN_RUN)
      if (strong.length && cooldownRef.current <= 0) {
        const best = strong.reduce((a, b) =>
          b.matchLen > a.matchLen || (b.matchLen === a.matchLen && b.value > a.value) ? b : a,
        )
        pattern = best.name
        cooldownRef.current = PATTERN_POPUP_COOLDOWN
      }
    }
    cooldownRef.current = Math.max(0, cooldownRef.current - 1)

    // 直前のボイシングから最小の動きで繋がるように音高を決める
    const prevVoicing = voicingRef.current
    const chord = realizeChord(spec, key, scale, prevVoicing)
    voicingRef.current = chord.voicing
    // 各声部がどれだけ動いたか（表示用）。声部数が変わったときは上声の比較を省く
    chord.motion = prevVoicing
      ? {
          bass: chord.voicing.bass - prevVoicing.bass,
          upper:
            prevVoicing.upper.length === chord.voicing.upper.length
              ? chord.voicing.upper.map((m, i) => m - prevVoicing.upper[i])
              : null,
        }
      : null
    chord.id = idRef.current++
    chord.pattern = pattern
    chord.tag = e.gestureStart === false ? null : e.tag ?? null
    chord.gesture = e.tag ?? null
    chord.beats = e.beats
    chord.isMeasureStart = totalBeats % BEATS_PER_MEASURE === 0
    chord.measureId = Math.floor(totalBeats / BEATS_PER_MEASURE)
    chord.bar = e.bar
    chord.beatInBar = e.beatInBar
    chord.sectionIndex = e.sectionIndex
    chord.section = e.section
    chord.func = spec.func ?? null
    chord.startBeat = totalBeats

    totalBeatsRef.current = totalBeats + e.beats
    historyRef.current = trimHistory([chord, ...historyRef.current])

    // 次の小節の骨格が、どの確率分布から選ばれたか（履歴の右側に「これから」として淡く出す）
    const nextHead = queueRef.current.find(x => x.beatInBar === 0 && x.dist)
    const dist = nextHead
      ? nextHead.dist.map((p, d) => ({
          degree: d,
          name: buildChord(key, scale, d, 0).name, // 決定的なトライアド名をラベルに
          prob: p,
          func: degreeFunction(scale, d),
          chosen: d === nextHead.chosen,
          target: d === nextHead.target,
        }))
      : []

    const durSec = (60 / bpm) * e.beats

    // アルペジオはコード跨ぎで位相を継続させ、変わり目のリセット（ぶつ切り）をなくす
    let phaseStart = 0
    if (playStyle === 'arpeggio') {
      phaseStart = arpPhaseRef.current
      const stepSec = 60 / bpm / speedDiv
      arpPhaseRef.current += Math.max(1, Math.round(durSec / stepSec))
    }
    playChord(chord.voicing, durSec, { style: playStyle, bpm, waveform, speedDiv, phaseStart })

    // 拍カウンター（コードの長さぶん、1拍ごとに位置を進める）
    beatTimersRef.current.forEach(clearTimeout)
    beatTimersRef.current = Array.from({ length: e.beats }, (_, k) =>
      setTimeout(
        () => setBeatPos({ sectionIndex: e.sectionIndex, bar: e.bar, beat: e.beatInBar + k, total: totalBeats + k }),
        (k * 60 * 1000) / bpm,
      ),
    )

    setCurrentChord(chord)
    setHistory([...historyRef.current])
    setDistribution(dist)
    timerRef.current = setTimeout(next, durSec * 1000)
  }

  function toggle() {
    if (playing) {
      clearTimeout(timerRef.current)
      beatTimersRef.current.forEach(clearTimeout)
      stopAll()
      historyRef.current = []
      totalBeatsRef.current = 0
      cooldownRef.current = 0
      arpPhaseRef.current = 0
      voicingRef.current = null
      queueRef.current = []
      planCtxRef.current = {}
      planSigRef.current = null
      sectionIdxRef.current = 0
      setHistory([])
      setCurrentChord(null)
      setDistribution([])
      setBeatPos(null)
      setPlaying(false)
    } else {
      setPlaying(true)
    }
  }

  useEffect(() => {
    if (playing) next()
    return () => {
      clearTimeout(timerRef.current)
      beatTimersRef.current.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  return { playing, currentChord, history, distribution, beatPos, toggle }
}
