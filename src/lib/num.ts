/**
 * O usuário brasileiro digita "30,00", mas também acaba digitando "30.00".
 * `Number()` devolve NaN para a vírgula e o preço vira 0 silenciosamente,
 * então toda leitura de número do formulário passa por aqui.
 */

/** Tira separador de milhar e troca a vírgula decimal por ponto. */
function normalizar(texto: string): string {
  return texto.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.')
}

/** Um número, no máximo um separador decimal. "30.5.5" e "5." não passam. */
const VALIDO = /^-?\d+(\.\d+)?$/

/** Aceita vírgula ou ponto decimal, e ponto como separador de milhar ("1.234,56"). */
export function paraNumero(texto: string | number | null | undefined): number {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : 0
  if (!ehNumero(texto)) return 0
  return Number(normalizar(String(texto)))
}

/**
 * Diferente de paraNumero: diz se o texto é de fato UM número, para o servidor
 * recusar "abc" em vez de gravar 0. Mesma normalização, então nunca divergem.
 */
export function ehNumero(texto: string | number | null | undefined): boolean {
  if (typeof texto === 'number') return Number.isFinite(texto)
  if (!texto) return false
  return VALIDO.test(normalizar(String(texto)))
}
