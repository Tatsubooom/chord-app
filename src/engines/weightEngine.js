// weights(各コードの重み)を受け、
export function weightedRandom(weights) {
  //weightの全要素を合算する
  const total = weights.reduce((a, b) => a + b, 0)

  //ゼロ除算回避
  if (!total) return 0

  //totalまでの範囲でランダムにコードを決める
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}