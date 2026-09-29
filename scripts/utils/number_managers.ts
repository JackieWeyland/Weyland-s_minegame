export function randomBetween(a: number, b: number) { // RETORNA UM NUMERO ALEATORIO ENTRE A E B
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  return Math.floor(Math.random() * (max - min + 1)) + min
}