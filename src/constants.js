export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

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
