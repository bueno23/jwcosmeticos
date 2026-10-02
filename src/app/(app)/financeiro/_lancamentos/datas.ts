// Datas de lançamento circulam como "AAAA-MM-DD" no fuso da loja; só viram instante na hora de gravar ou filtrar.

export const FUSO = 'America/Sao_Paulo'

// Brasil não tem horário de verão desde 2019, então o deslocamento é fixo
const DESLOCAMENTO = '-03:00'

const DIA = /^\d{4}-\d{2}-\d{2}$/

const formatadorDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
})

/** Dia civil do instante no fuso da loja, independente do fuso do servidor. */
export function diaDe(instante: Date): string {
  return formatadorDia.format(instante)
}

export function hoje(): string {
  return diaDe(new Date())
}

export function ehDiaValido(dia: string): boolean {
  if (!DIA.test(dia)) return false
  const [a, m, d] = dia.split('-').map(Number)
  const data = new Date(Date.UTC(a, m - 1, d))
  return data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d
}

/** Meio-dia no fuso da loja: qualquer fuso de leitura ainda cai no mesmo dia. */
export function instanteDoDia(dia: string): Date {
  return new Date(`${dia}T12:00:00${DESLOCAMENTO}`)
}

export function inicioDoDia(dia: string): Date {
  return new Date(`${dia}T00:00:00${DESLOCAMENTO}`)
}

export function somarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

export function primeiroDoMes(dia: string, deslocamentoMeses = 0): string {
  const [a, m] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1 + deslocamentoMeses, 1)).toISOString().slice(0, 10)
}

export function ultimoDoMes(dia: string, deslocamentoMeses = 0): string {
  return somarDias(primeiroDoMes(dia, deslocamentoMeses + 1), -1)
}

/** "2026-09-07" -> "07/09/2026", sem passar por Date para não escorregar de fuso. */
export function diaBR(dia: string): string {
  const [a, m, d] = dia.split('-')
  return `${d}/${m}/${a}`
}
