import { PLAY_STYLES, RHYTHM_SPEEDS, WAVEFORMS } from '../constants'

// 再生ボタンの横に並べる「鳴らし方」の切り替え（今聴こえている音をすぐ変える設定）。
//   STYLE: 奏法 / RATE: 刻み・アルペジオの速さ（ブロック以外のときだけ横からせり出す）/ SOUND: 波形
// 各ボタンは小さなアイコンで示し、正式名はツールチップと読み上げで伝える。

// 奏法のアイコン（20×14）
const STYLE_ICONS = {
  // ブロック: 3音が同時に縦に積まれた和音
  block: (
    <>
      <rect x="7" y="2" width="6" height="2.4" />
      <rect x="7" y="6" width="6" height="2.4" />
      <rect x="7" y="10" width="6" height="2.4" />
    </>
  ),
  // 刻み: 同じ和音を細かく反復
  comp: (
    <>
      {[2, 6.5, 11, 15.5].map(x => (
        <rect key={x} x={x} y="3" width="2.4" height="9" />
      ))}
    </>
  ),
  // アルペジオ: 上がって下がる分散
  arpeggio: <path d="M2 12 L6 8 L10 3 L14 8 L18 12" fill="none" strokeWidth="1.8" />,
  // 積み上げ: 低い音から段々に重なる
  buildup: (
    <>
      <rect x="2" y="10" width="16" height="2.4" />
      <rect x="7" y="6" width="11" height="2.4" />
      <rect x="12" y="2" width="6" height="2.4" />
    </>
  ),
}

// 波形のアイコン（20×14）
const WAVE_ICONS = {
  triangle: <path d="M1 11 L5.5 3 L10 11 L14.5 3 L19 11" />,
  sine: <path d="M1 7 C3.5 0, 6 0, 8.5 7 S13.5 14, 16 7 S18.5 3, 19 4" />,
  square: <path d="M1 11 V3 H6 V11 H11 V3 H16 V11 H19" />,
  sawtooth: <path d="M1 11 L7 3 V11 L13 3 V11 L19 3 V11" />,
}

// 速さの表示（拍の分割）
const RATE_TEXT = { slow: '1/4', normal: '1/8', fast: '3連', rapid: '1/16' }

function Segmented({ label, options, value, onChange, render }) {
  return (
    <div className="seg">
      <div className="seg__label" aria-hidden="true">
        {label}
      </div>
      <div className="seg__buttons" role="radiogroup" aria-label={label}>
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            aria-label={o.label}
            title={o.label}
            className={'seg__btn' + (value === o.value ? ' is-on' : '')}
            onClick={() => onChange(o.value)}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

const icon = (glyph, filled) => (
  <svg viewBox="0 0 20 14" className={'seg__icon' + (filled ? ' is-filled' : '')} aria-hidden="true">
    {glyph}
  </svg>
)

export default function PlayControls({ playStyle, onPlayStyleChange, rhythmSpeed, onRhythmSpeedChange, waveform, onWaveformChange }) {
  // 速さは刻み / アルペジオ / 積み上げのときだけ効く
  const rateActive = playStyle !== 'block'
  return (
    <div className="play-controls">
      <Segmented
        label="STYLE"
        options={PLAY_STYLES}
        value={playStyle}
        onChange={onPlayStyleChange}
        render={o => icon(STYLE_ICONS[o.value], o.value !== 'arpeggio')}
      />
      <div className={'hreveal' + (rateActive ? ' is-open' : '')} inert={!rateActive}>
        <div className="hreveal__inner">
          <Segmented
            label="RATE"
            options={RHYTHM_SPEEDS}
            value={rhythmSpeed}
            onChange={onRhythmSpeedChange}
            render={o => <span className="seg__text">{RATE_TEXT[o.value]}</span>}
          />
        </div>
      </div>
      <Segmented
        label="SOUND"
        options={WAVEFORMS}
        value={waveform}
        onChange={onWaveformChange}
        render={o => icon(WAVE_ICONS[o.value], false)}
      />
    </div>
  )
}
