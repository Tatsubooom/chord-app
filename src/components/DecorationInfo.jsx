import { useEffect, useRef, useState } from 'react'
import { colorChances, gestureChances, splitChance } from '../engines/planner'

const SEGMENTS = 10
const TICK_MS = 90 // メーターを揺らす間隔
const DECAY = 0.8 // 1 tick ごとの落ち方（VU メーター風に、上がるのは速く落ちるのはゆっくり）
const PEAK_FALL = 0.035 // ピークホールドの落ちる速さ

// 仕掛けのタグ（プランナーが付けるもの）→ この一覧のどの行か
function rowOfTag(tag) {
  if (!tag) return null
  if (tag.includes('裏')) return '裏コード'
  if (tag.startsWith('V7/')) return 'セカンダリー'
  if (tag.includes('クリシェ')) return 'クリシェ'
  if (tag === 'サブドミナントマイナー' || tag === '♭VI-♭VII-I') return '借用'
  if (tag === 'ドミナント' || tag === 'V7(和声的)') return '終止'
  return tag // ツーファイブ / イキスギ / 経過dim / sus4解決 / 転回 はそのまま
}

// 今のコードの状態から、関係しそうな行を持ち上げる量（0〜）
function contextBoost(key, chord) {
  if (!chord) return 0
  const ivs = chord.ivs || []
  const has7 = ivs.includes(10) || ivs.includes(11)
  const f = chord.func
  switch (key) {
    case '7th 色':
      return has7 ? 0.45 : 0
    case '9th 色':
      return ivs.includes(14) ? 0.55 : 0
    case '経過和音':
      return chord.beats < 4 ? 0.5 : 0
    case '裏コード':
    case 'sus4解決':
    case 'イキスギ':
      return f === 'D' ? 0.35 : 0
    case 'セカンダリー':
      return f === 'D' ? 0.3 : f === 'T' ? 0.15 : 0
    case 'ツーファイブ':
      return f === 'SD' ? 0.35 : 0
    case '借用':
      return f === 'SD' || f === 'SDm' ? 0.35 : 0
    case 'クリシェ':
    case '転回':
      return f === 'T' ? 0.3 : 0
    case '終止':
      return f === 'D' ? 0.4 : 0
    default:
      return 0
  }
}

// 仕掛け / 色 / 分割の起きやすさ。今のコードの状態に合わせて、メーターがわさわさ動く。
//   ・今のコードで実際に起きた仕掛けの行は振り切れて紫に光る
//   ・今のコードの機能（D / T / SD）や 7th / 9th などから、関係する行が持ち上がる
//   ・その上で VU メーターのように揺れ、ピークを一瞬ホールドする（見た目重視で線形ではない）
//   右の数値は、今の設定での目安の確率（変わらない）
export default function DecorationInfo({ scale, temperature, spice, enableMultiChord, enableSubs, chord, playing }) {
  const color = colorChances(temperature)
  const rows = [
    { key: '7th 色', prob: color.seventh, note: 'セクション' },
    { key: '9th 色', prob: color.rich, note: 'セクション' },
    { key: '経過和音', prob: splitChance(temperature, enableMultiChord), note: '小節' },
    ...gestureChances({ spice, enableSubs, enableMultiChord, scale }).map(g => ({ ...g, note: g.key === '終止' ? 'セクション末' : '箇所' })),
  ]
  const hitRow = rowOfTag(chord?.gesture)

  const [meters, setMeters] = useState(null) // { level: number[], peak: number[] }
  const live = useRef({ rows, chord, hitRow })
  useEffect(() => {
    live.current = { rows, chord, hitRow }
  })

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      const { rows: rs, chord: c, hitRow: hit } = live.current
      setMeters(prev => {
        const level = rs.map((r, i) => {
          if (r.prob <= 0) return 0
          const base = 0.12 + Math.min(1, r.prob) * 0.55
          const target = r.key === hit ? 1 : Math.min(0.95, base * 0.75 + contextBoost(r.key, c))
          const kick = target * (0.5 + Math.random() * 0.65) // わさわさ揺らす
          return Math.min(1, Math.max(kick, (prev?.level[i] ?? 0) * DECAY))
        })
        const peak = level.map((l, i) => Math.max(l, (prev?.peak[i] ?? 0) - PEAK_FALL))
        return { level, peak }
      })
    }, TICK_MS)
    return () => {
      clearInterval(id)
      setMeters(null)
    }
  }, [playing])

  return (
    <section className="odds" aria-label="仕掛けの起きやすさ">
      <div className="readout__caption">
        <span>仕掛けの起きやすさ</span>
        <span className="readout__dim">
          ランダム度 {Math.round(temperature * 100)} · スパイス {Math.round(spice * 100)} · 単位あたりの目安 %
        </span>
      </div>
      <ul className="odds__list">
        {rows.map((r, i) => {
          // 停止中は目安の確率をそのまま静かに表示
          const level = meters ? meters.level[i] : Math.min(1, r.prob)
          const lit = Math.round(level * SEGMENTS)
          const peakSeg = meters ? Math.round(meters.peak[i] * SEGMENTS) - 1 : -1
          const hit = playing && r.key === hitRow
          return (
            <li key={r.key} className={'odds__row' + (r.prob <= 0 ? ' is-off' : '') + (hit ? ' is-hit' : '')}>
              <span className="odds__name">{r.key}</span>
              <span className="odds__bar" aria-hidden="true">
                {Array.from({ length: SEGMENTS }, (_, s) => (
                  <i key={s} className={(s < lit ? 'on' : '') + (s === peakSeg && s >= lit ? ' peak' : '')} />
                ))}
              </span>
              <span className="odds__pct">{(Math.min(1, r.prob) * 100).toFixed(0)}</span>
              <span className="odds__unit">/{r.note}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
