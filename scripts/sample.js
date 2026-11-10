// 生成されるコード進行をテキストで書き出す（耳で聴く前に「文字で」確かめる用）。
//   npm run sample -- --key C --scale major --temp 0.3 --spice 0.5 --sections 4 [--no-subs] [--no-multi]
import process from 'node:process'
import { planSection } from '../src/engines/planner.js'
import { describeChord } from '../src/engines/theory.js'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}
const flag = name => args.includes(`--${name}`)

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const key = opt('key', 'C')
const scale = opt('scale', 'major')
const settings = {
  scale,
  temperature: Number(opt('temp', 0.3)),
  spice: Number(opt('spice', 0.5)),
  enableSubs: !flag('no-subs'),
  enableMultiChord: !flag('no-multi'),
}
const sections = Number(opt('sections', 4))
const keyPc = KEYS.indexOf(key)
const mode = scale.startsWith('minor') ? 'minor' : 'major'

console.log(`key=${key} scale=${scale} temp=${settings.temperature} spice=${settings.spice}` +
  ` subs=${settings.enableSubs} multi=${settings.enableMultiChord}\n`)

let ctx = {}
for (let s = 0; s < sections; s++) {
  const { events, info, nextCtx } = planSection(settings, ctx)
  ctx = nextCtx
  console.log(`--- section ${s + 1}  [${info.templates.join(' + ')}]  color=${info.color}`)
  const bars = Array.from({ length: 8 }, () => [])
  for (const e of events) {
    const { name } = describeChord(e.spec, keyPc, mode)
    bars[e.bar].push(name + (e.beats !== 4 ? `(${e.beats})` : '') + (e.tag && e.gestureStart !== false ? ` «${e.tag}»` : ''))
  }
  for (let b = 0; b < 8; b += 4) {
    console.log('| ' + bars.slice(b, b + 4).map(x => x.join(' ')).join(' | ') + ' |')
  }
  console.log()
}
