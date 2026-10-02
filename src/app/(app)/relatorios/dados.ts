import {
  relatorioDespesas, relatorioEstoque, relatorioEstoqueBaixo, relatorioFluxo, relatorioLucro,
  relatorioMaisVendidos, relatorioPagamentos, relatorioParados, relatorioVendas,
} from '@/lib/services/relatorios'
import type { Parametros } from './abas'

/** Um lugar só para escolher o relatório da aba: a página e o CSV leem exatamente os mesmos dados. */
export async function carregar(p: Parametros) {
  const f = p.filtro
  switch (p.aba) {
    case 'vendas': return { aba: p.aba, dados: await relatorioVendas(f) } as const
    case 'mais-vendidos': return { aba: p.aba, dados: await relatorioMaisVendidos(f, p.ordem) } as const
    case 'parados': return { aba: p.aba, dados: await relatorioParados(f) } as const
    case 'estoque': return { aba: p.aba, dados: await relatorioEstoque(f) } as const
    case 'estoque-baixo': return { aba: p.aba, dados: await relatorioEstoqueBaixo(f) } as const
    case 'lucro': return { aba: p.aba, dados: await relatorioLucro(f, p.visao) } as const
    case 'despesas': return { aba: p.aba, dados: await relatorioDespesas(f) } as const
    case 'fluxo': return { aba: p.aba, dados: await relatorioFluxo(f) } as const
    case 'pagamentos': return { aba: p.aba, dados: await relatorioPagamentos(f) } as const
  }
}

export type Carregado = NonNullable<Awaited<ReturnType<typeof carregar>>>
