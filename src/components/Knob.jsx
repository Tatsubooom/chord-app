import { useEffect, useRef } from 'react'

// DJ コントローラー風のロータリーノブ。
//   上下ドラッグ / ホイール / 矢印キーで値を変え、ダブルクリックで初期値に戻す。
//   周囲の LED リングが値に応じて点灯する。role="slider" でスクリーンリーダーにも値を伝える。
//   hint は画面には出さず、マウスを乗せたときのツールチップとしてだけ使う。
const START = -135 // ノブの可動域（度）。真上を 0° とする
const END = 135
const TICKS = 11
const DRAG_RANGE_PX = 160 // この距離のドラッグで最小〜最大を移動する

const polar = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}
function arc(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from)
  const [x2, y2] = polar(cx, cy, r, to)
  const large = to - from > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

export default function Knob({ label, value, min, max, step = 1, defaultValue, onChange, format = v => v, hint }) {
  const ref = useRef(null)
  const drag = useRef(null)
  const stateRef = useRef({ value, min, max, step, onChange })
  useEffect(() => {
    stateRef.current = { value, min, max, step, onChange }
  })

  const clampStep = v => {
    const { min: lo, max: hi, step: st } = stateRef.current
    const snapped = Math.round((v - lo) / st) * st + lo
    return Math.min(hi, Math.max(lo, Number(snapped.toFixed(4))))
  }
  const set = v => {
    const next = clampStep(v)
    if (next !== stateRef.current.value) stateRef.current.onChange(next)
  }

  // ホイールはページのスクロールを止めたいので passive: false で直接登録する
  useEffect(() => {
    const el = ref.current
    const onWheel = e => {
      e.preventDefault()
      const { value: v, step: st } = stateRef.current
      set(v + (e.deltaY < 0 ? st : -st) * (e.shiftKey ? 10 : 1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = e => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, v: value }
  }
  const onPointerMove = e => {
    if (!drag.current) return
    const dy = drag.current.y - e.clientY
    set(drag.current.v + (dy / DRAG_RANGE_PX) * (max - min) * (e.shiftKey ? 0.2 : 1))
  }
  const onPointerUp = () => {
    drag.current = null
  }
  const onKeyDown = e => {
    const big = (max - min) / 10
    const map = {
      ArrowUp: value + step,
      ArrowRight: value + step,
      ArrowDown: value - step,
      ArrowLeft: value - step,
      PageUp: value + big,
      PageDown: value - big,
      Home: min,
      End: max,
    }
    if (e.key in map) {
      e.preventDefault()
      set(map[e.key])
    }
  }

  const t = (value - min) / (max - min)
  const angle = START + t * (END - START)
  const [ix, iy] = polar(32, 32, 15, angle)
  const [ox, oy] = polar(32, 32, 7, angle)

  return (
    <div className="knob" title={hint}>
      <div
        ref={ref}
        className="knob__dial"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={String(format(value))}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={() => defaultValue != null && set(defaultValue)}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => {
            const a = START + (i / (TICKS - 1)) * (END - START)
            const [x1, y1] = polar(32, 32, 29.5, a)
            const [x2, y2] = polar(32, 32, 31.5, a)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="knob__tick" />
          })}
          <path d={arc(32, 32, 25, START, END)} className="knob__ring" />
          {t > 0.001 && <path d={arc(32, 32, 25, START, angle)} className="knob__led" />}
          <circle cx="32" cy="32" r="19" className="knob__cap" />
          <circle cx="32" cy="32" r="16.5" className="knob__grip" />
          <line x1={ox} y1={oy} x2={ix} y2={iy} className="knob__pointer" />
        </svg>
      </div>
      <div className="knob__value">{format(value)}</div>
      <div className="knob__label">{label}</div>
    </div>
  )
}

// 押すと点灯するトグルパッド（DJ コントローラーの SYNC / CUE ボタン風）
export function Pad({ label, on, onChange, hint }) {
  return (
    <div className="knob">
      <button className={'pad' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => onChange(!on)} title={hint}>
        <span className="pad__led" aria-hidden="true" />
        <span className="pad__state">{on ? 'ON' : 'OFF'}</span>
      </button>
      <div className="knob__value">&nbsp;</div>
      <div className="knob__label">{label}</div>
    </div>
  )
}
