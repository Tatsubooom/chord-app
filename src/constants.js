export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// 演奏スタイル（コードの鳴らし方）
export const PLAY_STYLES = [
  { value: 'block', label: 'ブロック（一斉）' },
  { value: 'comp', label: '刻み（バッキング）' },
  { value: 'arpeggio', label: 'アルペジオ（分散）' },
]

// 刻み・アルペジオの速さ（1拍あたりの分割数 div。非線形）
export const RHYTHM_SPEEDS = [
  { value: 'slow', label: 'ゆっくり（4分）', div: 1 },
  { value: 'normal', label: 'ふつう（8分）', div: 2 },
  { value: 'fast', label: '速い（3連）', div: 3 },
  { value: 'rapid', label: '倍速（16分）', div: 4 },
]

// 音色（オシレータの波形）
export const WAVEFORMS = [
  { value: 'triangle', label: '三角波（やわらか）' },
  { value: 'sine', label: 'サイン波（ピュア）' },
  { value: 'square', label: '矩形波（レトロ）' },
  { value: 'sawtooth', label: 'ノコギリ波（明るい）' },
]

// 1小節の拍数
export const BEATS_PER_MEASURE = 4
// 履歴として保持する拍数（8小節ぶん）
export const HISTORY_BEATS = 32
// 区切り線を入れる小節ブロックの大きさ（4小節ごと）
export const BLOCK_MEASURES = 4

// 小節を分割して複数コードにする確率の全体スケール（小さいほど分割しにくい）。
// 実際の分割確率は temperature^2 * このスケール。
export const MEASURE_SPLIT_SCALE = 0.4

// 有名進行ポップアップの発火条件
// - 直近この数以上のコードが連続一致したら「進行をなぞっている」とみなす
export const PATTERN_MIN_RUN = 2
// - 一度通知したら、この数のコードぶんは次の通知を抑制する（出しすぎ防止）
export const PATTERN_POPUP_COOLDOWN = 4
