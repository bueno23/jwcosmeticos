// CNPJ numérico e alfanumérico (IN RFB 2.229/2024): 12 posições [0-9A-Z] e 2 dígitos verificadores.

/** Tira máscara e espaços; letras ficam maiúsculas porque o CNPJ novo pode ter letras. */
export function limparCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

function digitoVerificador(base: string): number {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const soma = [...base].reduce((n, c, i) => n + (c.charCodeAt(0) - 48) * pesos[i]!, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cnpjValido(valor: string): boolean {
  const c = limparCnpj(valor)
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)) return false
  if (/^(\d)\1{13}$/.test(c)) return false
  const d1 = digitoVerificador(c.slice(0, 12))
  const d2 = digitoVerificador(c.slice(0, 12) + d1)
  return c.endsWith(`${d1}${d2}`)
}

/** Máscara 00.000.000/0000-00; o que não tiver 14 posições volta como veio. */
export function mascararCnpj(valor: string | null | undefined): string {
  if (!valor) return ''
  const c = limparCnpj(valor)
  if (c.length !== 14) return valor
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}

/** Máscara progressiva para o campo enquanto a pessoa digita. */
export function mascararCnpjParcial(valor: string): string {
  const c = limparCnpj(valor).slice(0, 14)
  let saida = c.slice(0, 2)
  if (c.length > 2) saida += `.${c.slice(2, 5)}`
  if (c.length > 5) saida += `.${c.slice(5, 8)}`
  if (c.length > 8) saida += `/${c.slice(8, 12)}`
  if (c.length > 12) saida += `-${c.slice(12)}`
  return saida
}
