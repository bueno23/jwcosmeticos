// Cálculo de margem em um lugar só: a tabela, o formulário e o PDV precisam concordar
const num = (v: number | { toString(): string } | null | undefined) => Number(v ?? 0)

export type Valor = number | { toString(): string } | null | undefined

/** Margem sobre o preço de venda: quanto do que o cliente paga sobra. É a usada na dashboard. */
export function margem(custo: Valor, venda: Valor): number {
  const pv = num(venda)
  if (pv <= 0) return 0
  return ((pv - num(custo)) / pv) * 100
}

/** Markup sobre o custo: quanto foi acrescentado. Serve para saber se o preço está saudável. */
export function markup(custo: Valor, venda: Valor): number {
  const pc = num(custo)
  if (pc <= 0) return 0
  return ((num(venda) - pc) / pc) * 100
}

export function lucroUnitario(custo: Valor, venda: Valor): number {
  return num(venda) - num(custo)
}

/** Custo médio ponderado: a entrada nova não substitui o custo, ela se mistura ao que já está em estoque. */
export function custoMedioPonderado(
  custoAtual: Valor, estoqueAtual: number, custoEntrada: Valor, quantidadeEntrada: number,
): number {
  const entrada = Math.max(quantidadeEntrada, 0)
  if (entrada === 0) return num(custoAtual)
  const existente = Math.max(estoqueAtual, 0)
  const total = existente + entrada
  if (total === 0) return num(custoEntrada)
  return (num(custoAtual) * existente + num(custoEntrada) * entrada) / total
}

/** Margem em uma faixa legível, para pintar o texto sem repetir a mesma condicional em cada tela. */
export function corMargem(valor: number): string {
  if (valor >= 40) return 'text-positivo'
  if (valor >= 20) return 'text-laranja'
  if (valor > 0) return 'text-negativo'
  return 'text-negativo'
}
