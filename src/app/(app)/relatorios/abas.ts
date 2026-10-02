import type { PaymentMethod } from '@/generated/prisma'
import type { FiltroRelatorio, OrdemRanking, VisaoLucro } from '@/lib/services/relatorios'
import { FORMAS_PAGAMENTO } from './formas'
import { resolverPeriodo, type Atalho, type Periodo } from './periodo'

export type IdAba =
  | 'vendas' | 'mais-vendidos' | 'parados' | 'estoque' | 'estoque-baixo'
  | 'lucro' | 'despesas' | 'fluxo' | 'pagamentos'

type Filtro = 'periodo' | 'categoria' | 'produto' | 'pagamento'

export const ABAS: { id: IdAba; label: string; filtros: Filtro[]; periodoPadrao?: Atalho }[] = [
  { id: 'vendas', label: 'Vendas', filtros: ['periodo', 'pagamento'] },
  { id: 'mais-vendidos', label: 'Mais vendidos', filtros: ['periodo', 'categoria', 'produto', 'pagamento'] },
  { id: 'parados', label: 'Parados', filtros: ['periodo', 'categoria'], periodoPadrao: '30d' },
  { id: 'estoque', label: 'Estoque atual', filtros: ['categoria'] },
  { id: 'estoque-baixo', label: 'Estoque baixo', filtros: ['categoria'] },
  { id: 'lucro', label: 'Lucro', filtros: ['periodo', 'categoria', 'produto', 'pagamento'] },
  { id: 'despesas', label: 'Despesas', filtros: ['periodo', 'categoria'] },
  { id: 'fluxo', label: 'Fluxo de caixa', filtros: ['periodo'] },
  { id: 'pagamentos', label: 'Pagamentos', filtros: ['periodo'] },
]

export type Busca = Record<string, string | string[] | undefined>

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export type Parametros = {
  aba: IdAba
  periodo: Periodo
  filtro: FiltroRelatorio
  visao: VisaoLucro
  ordem: OrdemRanking
}

export function lerParametros(sp: Busca): Parametros {
  const aba = ABAS.find((a) => a.id === primeiro(sp.aba))?.id ?? 'vendas'
  const def = ABAS.find((a) => a.id === aba)!
  const periodo = resolverPeriodo(primeiro(sp.periodo), primeiro(sp.de), primeiro(sp.ate), def.periodoPadrao)

  const pagamento = primeiro(sp.pagamento) as PaymentMethod | undefined
  const usa = (f: Filtro) => def.filtros.includes(f)

  return {
    aba,
    periodo,
    filtro: {
      de: periodo.de,
      ate: periodo.ate,
      categoriaId: usa('categoria') ? primeiro(sp.categoria) || undefined : undefined,
      produtoId: usa('produto') ? primeiro(sp.produto) || undefined : undefined,
      pagamento: usa('pagamento') && pagamento && FORMAS_PAGAMENTO.includes(pagamento) ? pagamento : undefined,
    },
    visao: primeiro(sp.visao) === 'categoria' ? 'categoria' : 'produto',
    ordem: primeiro(sp.ordem) === 'faturamento' ? 'faturamento' : 'quantidade',
  }
}
