const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const inteiro = new Intl.NumberFormat('pt-BR')

export const money = (value: number | { toString(): string }) => brl.format(Number(value) || 0)
export const number = (value: number) => inteiro.format(value || 0)
export const percent = (value: number, digits = 2) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`

// Sem fuso fixo, servidor em UTC (Vercel) e navegador divergem no dia e na hora
export const FUSO = 'America/Sao_Paulo'
const DESLOCAMENTO_MS = 3 * 3600000

const noFuso = (d: Date) => new Date(d.getTime() - DESLOCAMENTO_MS)

export function saudacao(date = new Date()) {
  const h = noFuso(date).getUTCHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const dataLonga = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: FUSO })
export const diaSemana = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: FUSO })
export const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })
export const diaCurto = (d: Date) => ({
  dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO }),
  semana: d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: FUSO }).replace('.', ''),
})

export function variacao(atual: number, anterior: number) {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}

// Brasil não tem horário de verão desde 2019, então o deslocamento de 3h é fixo
export function inicioDoDia(d = new Date()) {
  const l = noFuso(d)
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate()) + DESLOCAMENTO_MS)
}
export function inicioDoMes(d = new Date()) {
  const l = noFuso(d)
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), 1) + DESLOCAMENTO_MS)
}
