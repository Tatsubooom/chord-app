import { BEATS_PER_MEASURE, FUNCTION_LABELS } from '../constants'

const SECTION_BARS = 8

// 今のセクション（8小節）を小節グリッドで俯瞰する。鳴らし終えた / 今 / これから を色分けし、
// 仕掛け（クリシェ・イキスギ等）はラベルで示す。コード幅は拍数に比例。
export default function SectionMap({ section, upcoming }) {
  if (!section) {
    return (
      <div className="section-map section-map--empty">
        <div className="section-map__head">
          <span className="section-map__title">SECTION</span>
          <span className="section-map__meta">Play で 8 小節ぶんの進行を先読みして表示します</span>
        </div>
      </div>
    )
  }

  const bars = Array.from({ length: SECTION_BARS }, () => [])
  for (const it of section.items) if (it.bar != null && it.bar < SECTION_BARS) bars[it.bar].push(it)
  const { templates = [], color } = section.info || {}
  const colorLabel = { triad: 'トライアド', '7th': '7th', rich: '9th' }[color] ?? color

  // セクション外（次のセクション）の頭の数コード
  const beyond = upcoming.filter(u => u.sectionIndex !== section.index).slice(0, 4)

  return (
    <div className="section-map">
      <div className="section-map__head">
        <span className="section-map__title">SECTION {String(section.index + 1).padStart(2, '0')}</span>
        <span className="section-map__meta">
          骨格 <b>{templates.join(' + ')}</b> · 色 <b>{colorLabel}</b>
        </span>
        <span className="section-map__legend" aria-hidden="true">
          {Object.entries(FUNCTION_LABELS).map(([k, v]) => (
            <span key={k} className={`fn fn--${k}`} title={v}>
              {k}
            </span>
          ))}
        </span>
      </div>

      <div className="section-map__grid">
        {bars.map((items, b) => {
          const beatsUsed = items.reduce((a, x) => a + x.beats, 0)
          return (
            <div key={b} className={'bar' + (b % 4 === 0 ? ' bar--phrase' : '')}>
              <div className="bar__num">{b + 1}</div>
              <div className="bar__cells">
                {items.map(it => (
                  <div
                    key={it.key}
                    className={`cell cell--${it.state}` + (it.func ? ` cell--fn-${it.func}` : '')}
                    style={{ flexGrow: it.beats }}
                    title={`${it.name}  ${it.roman}${it.tag ? '  «' + it.tag + '»' : ''}`}
                  >
                    <span className="cell__name">{it.name}</span>
                    <span className="cell__roman">{it.roman}</span>
                    {it.tag && <span className="cell__tag">{it.tag}</span>}
                  </div>
                ))}
                {beatsUsed < BEATS_PER_MEASURE && <div className="cell cell--blank" style={{ flexGrow: BEATS_PER_MEASURE - beatsUsed }} />}
              </div>
            </div>
          )
        })}
      </div>

      {beyond.length > 0 && (
        <div className="section-map__next">
          <span className="section-map__title">NEXT SECTION ▸</span>
          {beyond.map(u => (
            <span key={u.key} className="section-map__next-item">
              {u.name}
              {u.tag && <em> «{u.tag}»</em>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
