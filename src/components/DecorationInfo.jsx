import { useEffect, useRef, useState } from 'react'
import { colorChances, gestureChances, splitChance } from '../engines/planner'

const SEGMENTS = 10
const TICK_MS = 150 // 表示を更新する間隔
const EASE = 0.22 // 1 tick で目標値に近づく割合（なめらかに追従）
const NOISE = 0.025 // 目標値に乗せる小さなゆらぎ（目標値に対する割合）

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

// 仕掛け / 色 / 分割の起きやすさ。再生中は今のコードの状態に合わせた「今この瞬間の目安」を表示する。
//   ・設定から決まる基本の確率に、今のコードの機能（D / T / SD）や 7th / 9th などに応じた補正を掛ける
//   ・今のコードで実際に起きている仕掛けの行は 100 になり、明るく強調される
//   ・値へはなめらかに近づき、小さなゆらぎだけを乗せる。停止中は設定どおりの基本の確率
export default function DecorationInfo({ scale, temperature, spice, enableMultiChord, enableSubs, chord, playing }) {
  const color = colorChances(temperature)
  const rows = [
    { key: '7th 色', prob: color.seventh, note: 'セクション' },
    { key: '9th 色', prob: color.rich, note: 'セクション' },
    { key: '経過和音', prob: splitChance(temperature, enableMultiChord), note: '小節' },
    ...gestureChances({ spice, enableSubs, enableMultiChord, scale }).map(g => ({ ...g, note: g.key === '終止' ? 'セクション末' : '箇所' })),
  ]
  const hitRow = rowOfTag(chord?.gesture)

  const [levels, setLevels] = useState(null) // 再生中の表示値（0〜1）
  const live = useRef({ rows, chord, hitRow })
  useEffect(() => {
    live.current = { rows, chord, hitRow }
  })

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      const { rows: rs, chord: c, hitRow: hit } = live.current
      setLevels(prev =>
        rs.map((r, i) => {
          const p = Math.min(1, r.prob)
          if (p <= 0) return 0
          // 今のコードに関係する仕掛けほど起きやすい（補正は最大で約2倍）
          const target = r.key === hit ? 1 : Math.min(0.97, p * (1 + contextBoost(r.key, c) * 2))
          const from = prev?.[i] ?? p
          const wobble = target * NOISE * (Math.random() * 2 - 1)
          return Math.min(1, Math.max(0, from + (target - from) * EASE + wobble))
        }),
      )
    }, TICK_MS)
    return () => {
      clearInterval(id)
      setLevels(null)
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
          // 停止中は設定どおりの基本の確率をそのまま表示
          const level = levels ? levels[i] : Math.min(1, r.prob)
          const lit = Math.round(level * SEGMENTS)
          const hit = playing && r.key === hitRow
          return (
            <li key={r.key} className={'odds__row' + (r.prob <= 0 ? ' is-off' : '') + (hit ? ' is-hit' : '')}>
              <span className="odds__name">{r.key}</span>
              <span className="odds__bar" aria-hidden="true">
                {Array.from({ length: SEGMENTS }, (_, s) => (
                  <i key={s} className={s < lit ? 'on' : ''} />
                ))}
              </span>
              <span className="odds__pct">{Math.round(level * 100)}</span>
              <span className="odds__unit">/{r.note}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
