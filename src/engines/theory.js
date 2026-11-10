// コードの表記（コード名 / ローマ数字）を、構成音程から生成するユーティリティ。
//
// コードは「キーからの相対ルート rel（半音）」＋「ルートからの構成音程 ivs」＋「ベース（相対, 任意）」で表す。
// ivs は 12 未満を和音構成音（3=短3度, 4=長3度, 7=完全5度, 10=短7度, 11=長7度 …）、
// 12 以上をテンション（13=♭9, 14=9, 15=#9, 17=11, 18=#11, 20=♭13, 21=13）として扱う。

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

// フラット系のメジャーキー（F, B♭, E♭, A♭, D♭）
const FLAT_MAJOR_KEYS = new Set([5, 10, 3, 8, 1])

const TENSION_NAMES = { 13: '♭9', 14: '9', 15: '#9', 17: '11', 18: '#11', 20: '♭13', 21: '13' }

const ROMAN = ['I', '♭II', 'II', '♭III', 'III', 'IV', '#IV', 'V', '♭VI', 'VI', '♭VII', 'VII']

export const mod12 = n => ((n % 12) + 12) % 12

/** キーがフラット系かどうか（マイナーは平行長調で判定） */
export function keyPrefersFlat(keyPc, mode = 'major') {
  const majorPc = mode === 'minor' ? mod12(keyPc + 3) : keyPc
  return FLAT_MAJOR_KEYS.has(majorPc)
}

/** 音名を綴る。spell が 'flat' / 'sharp' ならそれを優先、無指定ならキーとルート位置から決める */
export function spellPc(pc, { keyFlat = false, rel = null, spell = null } = {}) {
  const p = mod12(pc)
  let flat = keyFlat
  if (spell === 'flat') flat = true
  else if (spell === 'sharp') flat = false
  else if (rel != null && [1, 3, 8, 10].includes(mod12(rel))) flat = true // ♭II/♭III/♭VI/♭VII
  return (flat ? FLAT_NAMES : SHARP_NAMES)[p]
}

/** 構成音程からコードシンボル（ルート名の後ろに付く部分）を作る。例: [0,4,7,11,14] → 'M9' */
export function chordSymbol(ivs) {
  const s = new Set(ivs)
  const has = x => s.has(x)
  const third = has(4) ? 4 : has(3) ? 3 : null
  const fifth = has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : null
  const sev = has(11) ? 11 : has(10) ? 10 : null
  const isDim = third === 3 && fifth === 6
  const dim7 = isDim && !sev && has(9)
  const six = !sev && !dim7 && has(9)
  const tensions = ivs.filter(x => x >= 12).sort((a, b) => a - b)
  const alt = [] // 括弧で付ける変化音

  let sus = ''
  if (third == null) {
    if (has(5)) sus = 'sus4'
    else if (has(2)) sus = 'sus2'
  }

  let base
  if (isDim) {
    if (dim7) base = 'dim7'
    else if (sev === 10 || sev === 11) {
      base = sev === 10 ? 'm7' : 'mM7'
      alt.push('♭5')
    } else base = 'dim'
  } else if (third === 4 && fifth === 8) {
    base = sev === 10 ? 'aug7' : sev === 11 ? 'augM7' : 'aug'
  } else {
    const q = third === 3 ? 'm' : ''
    // テンションが 9th だけなら 7→9 に畳む（C7+9 → C9）
    const fold9 = tensions.length === 1 && tensions[0] === 14
    if (sev === 11) base = q + 'M' + (fold9 ? '9' : '7')
    else if (sev === 10) base = q + (fold9 ? '9' : '7')
    else if (six) base = q + (fold9 ? '6/9' : '6')
    else base = q
    if (fold9 && (sev || six)) tensions.length = 0
    if (!sev && !six && tensions.length === 1 && tensions[0] === 14) {
      base += 'add9'
      tensions.length = 0
    }
    base += sus
    if (third === 4 && fifth === 6) alt.push('♭5')
    if (third === 3 && fifth === 8) alt.push('#5')
  }

  for (const t of tensions) if (TENSION_NAMES[t]) alt.push(TENSION_NAMES[t])
  return base + (alt.length ? `(${alt.join(',')})` : '')
}

/** マイナー系（3度が短3度）かどうか */
export function isMinorQuality(ivs) {
  return ivs.includes(3) && !ivs.includes(4)
}

/**
 * コード spec を表示用の名前・ローマ数字にする。
 * spec: { rel, ivs, bassRel?, kind?, spell? }
 *   kind === 'blk' はブラックアダー・コード（イキスギコード）。ルート＝ベースで、
 *   上に「ベースの短7度をルートとする aug」を載せたもの（例: B♭aug/C）として表記する。
 */
export function describeChord(spec, keyPc, mode = 'major') {
  const keyFlat = keyPrefersFlat(keyPc, mode)
  const rootPc = mod12(keyPc + spec.rel)
  const sp = (rel, spell) => spellPc(keyPc + rel, { keyFlat, rel, spell })

  if (spec.kind === 'blk') {
    const augRel = spec.rel + 10
    return {
      name: `${sp(augRel, 'flat')}aug/${sp(spec.rel, spec.spell)}`,
      roman: `${ROMAN[mod12(augRel)]}aug/${ROMAN[mod12(spec.rel)]}`,
      rootPc,
    }
  }

  const symbol = chordSymbol(spec.ivs)
  const bass = spec.bassRel != null && mod12(spec.bassRel) !== mod12(spec.rel) ? spec.bassRel : null
  const name = sp(spec.rel, spec.spell) + symbol + (bass != null ? '/' + sp(bass, spec.bassSpell) : '')
  const roman = ROMAN[mod12(spec.rel)] + symbol + (bass != null ? '/' + ROMAN[mod12(bass)] : '')
  return { name, roman, rootPc }
}

export { ROMAN }
