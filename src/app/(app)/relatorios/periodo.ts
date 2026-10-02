import { diaBR, ehDiaValido, hoje, primeiroDoMes, somarDias, ultimoDoMes } from '@/app/(app)/financeiro/_lancamentos/datas'

export type Atalho = 'hoje' | '7d' | 'mes' | 'mes-passado' | '30d' | 'livre'

export type Periodo = { atalho: Atalho; de: string; ate: string; rotulo: string }

export const ATALHOS: { valor: Exclude<Atalho, 'livre'>; label: string }[] = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: '7d', label: '7 dias' },
  { valor: 'mes', label: 'Mês atual' },
  { valor: 'mes-passado', label: 'Mês passado' },
  { valor: '30d', label: '30 dias' },
]

/** Lê o período dos searchParams; o que for inválido cai no padrão da aba. */
export function resolverPeriodo(atalho: string | undefined, de: string | undefined, ate: string | undefined, padrao: Atalho = 'mes'): Periodo {
  const dia = hoje()

  if (de && ate && ehDiaValido(de) && ehDiaValido(ate)) {
    const [ini, fim] = de <= ate ? [de, ate] : [ate, de]
    return { atalho: 'livre', de: ini, ate: fim, rotulo: `${diaBR(ini)} a ${diaBR(fim)}` }
  }

  switch (atalho ?? padrao) {
    case 'hoje':
      return { atalho: 'hoje', de: dia, ate: dia, rotulo: 'hoje' }
    case '7d':
      return { atalho: '7d', de: somarDias(dia, -6), ate: dia, rotulo: 'últimos 7 dias' }
    case 'mes-passado':
      return { atalho: 'mes-passado', de: primeiroDoMes(dia, -1), ate: ultimoDoMes(dia, -1), rotulo: 'mês passado' }
    case '30d':
      return { atalho: '30d', de: somarDias(dia, -29), ate: dia, rotulo: 'últimos 30 dias' }
    case 'mes':
      return { atalho: 'mes', de: primeiroDoMes(dia), ate: dia, rotulo: 'mês atual' }
    default:
      return resolverPeriodo(undefined, undefined, undefined, padrao)
  }
}
