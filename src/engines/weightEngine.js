export function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  if (!total) return 0
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}