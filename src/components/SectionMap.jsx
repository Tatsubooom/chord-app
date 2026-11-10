import { BEATS_PER_MEASURE, FUNCTION_LABELS } from '../constants'

const SECTION_BARS = 8

// 今のセクション（8小節）を譜面のように俯瞰する。小節線で区切り、コード幅は拍数に比例。
// 鳴らし終えたものは薄く、今のコードは反転表示、仕掛けは朱色の注記で示す。
export default function SectionMap({ section, upcoming }) {
  const bars = Array.from({ length: SECTION_BARS }, () => [])
  if (section) for (const it of section.items) if (it.bar != null && it.bar < SECTION_BARS) bars[it.bar].push(it)
  const { templates = [], color } = section?.info || {}
  const colorLabel = { triad: 'トライアド', '7th': '7th', rich: '9th' }[color] ?? '—'
  const beyond = section ? upcoming.filter(u => u.sectionIndex !== section.index).slice(0, 4) : []

  return (
    <section className="score" aria-label="今のセクション">
      <header className="label-row">
        <span className="label">
          Section {section ? String(section.index + 1).padStart(2, '0') : '––'}
        </span>
        <span className="label label--dim">
          骨格 {templates.length ? templates.join(' + ') : '—'} · 色 {colorLabel}
        </span>
        <span className="label label--dim score__legend">
          {Object.entries(FUNCTION_LABELS).map(([k, v]) => (
            <span key={k} title={v}>
              {k} {v.split('（')[0]}
            </span>
          ))}
        </span>
      </header>

      <div className="score__grid">
        {bars.map((items, b) => {
          const used = items.reduce((a, x) => a + x.beats, 0)
          return (
            <div key={b} className={'score__bar' + (b % 4 === 0 ? ' is-phrase' : '')}>
              <span className="score__num">{b + 1}</span>
              <div className="score__chords">
                {items.map(it => (
                  <div
                    key={it.key}
                    className={`score__chord is-${it.state}`}
                    style={{ flexGrow: it.beats }}
                    title={`${it.name}  ${it.roman}${it.tag ? '  «' + it.tag + '»' : ''}`}
                  >
                    <span className="score__name">{it.name}</span>
                    <span className="score__sub">
                      {it.roman}
                      {it.func && <span className="score__fn">{it.func}</span>}
                    </span>
                    {it.tag && <span className="score__tag">{it.tag}</span>}
                  </div>
                ))}
                {used < BEATS_PER_MEASURE && <div className="score__chord is-rest" style={{ flexGrow: BEATS_PER_MEASURE - used }} />}
              </div>
            </div>
          )
        })}
      </div>

      {!section && <p className="score__empty">再生すると、8小節ぶんを先読みした進行がここに並びます。</p>}

      {beyond.length > 0 && (
        <p className="score__next">
          <span className="label">次のセクション</span>
          {beyond.map(u => (
            <span key={u.key}>
              {u.name}
              {u.tag && <em> {u.tag}</em>}
            </span>
          ))}
        </p>
      )}
    </section>
  )
}
