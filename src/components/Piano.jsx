// 背景に薄く敷くピアノ鍵盤。現在鳴っている音（midis）の鍵をハイライトする。
const LO = 36 // C2
const HI = 72 // C5
const BLACK_PC = new Set([1, 3, 6, 8, 10])

const WHITE_W = 12
const HEIGHT = 100
const BLACK_W = 7
const BLACK_H = 62

export default function Piano({ activeMidis = [] }) {
  const active = new Set(activeMidis)

  const whites = []
  const blacks = []
  let whiteIndex = 0
  for (let m = LO; m <= HI; m++) {
    if (BLACK_PC.has(m % 12)) {
      blacks.push({ m, x: whiteIndex * WHITE_W - BLACK_W / 2 })
    } else {
      whites.push({ m, x: whiteIndex * WHITE_W })
      whiteIndex++
    }
  }
  const totalW = whiteIndex * WHITE_W

  return (
    <svg
      className="piano"
      viewBox={`0 0 ${totalW} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {whites.map(k => (
        <rect
          key={k.m}
          x={k.x}
          y="0"
          width={WHITE_W}
          height={HEIGHT}
          className={'piano__white' + (active.has(k.m) ? ' is-on' : '')}
        />
      ))}
      {blacks.map(k => (
        <rect
          key={k.m}
          x={k.x}
          y="0"
          width={BLACK_W}
          height={BLACK_H}
          className={'piano__black' + (active.has(k.m) ? ' is-on' : '')}
        />
      ))}
    </svg>
  )
}
