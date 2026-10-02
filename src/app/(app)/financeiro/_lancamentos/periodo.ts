import { diaBR, ehDiaValido, hoje, primeiroDoMes, somarDias, ultimoDoMes } from './datas'

export type Atalho = 'mes' | 'mes-passado' | '30d' | 'livre'

export type Periodo = { atalho: Atalho; de: string; ate: string; rotulo: string }

export const ATALHOS: { valor: Exclude<Atalho, 'livre'>; label: string }[] = [
  { valor: 'mes', label: 'Mês atual' },
  { valor: 'mes-passado', label: 'Mês passado' },
  { valor: '30d', label: 'Últimos 30 dias' },
]

/** Lê o período dos searchParams; qualquer coisa inválida cai no mês atual. */
export function resolverPeriodo(atalho?: string, de?: string, ate?: string): Periodo {
  const dia = hoje()

  if (de && ate && ehDiaValido(de) && ehDiaValido(ate)) {
    const [ini, fim] = de <= ate ? [de, ate] : [ate, de]
    return { atalho: 'livre', de: ini, ate: fim, rotulo: `${diaBR(ini)} a ${diaBR(fim)}` }
  }
  if (atalho === 'mes-passado') {
    return { atalho, de: primeiroDoMes(dia, -1), ate: ultimoDoMes(dia, -1), rotulo: 'mês passado' }
  }
  if (atalho === '30d') {
    return { atalho, de: somarDias(dia, -29), ate: dia, rotulo: 'últimos 30 dias' }
  }
  return { atalho: 'mes', de: primeiroDoMes(dia), ate: dia, rotulo: 'mês atual' }
}
