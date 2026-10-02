import type { TipoLancamento } from '@/lib/services/lancamentos'

export type Textos = {
  titulo: string
  descricao: string
  singular: string
  novo: string
  rotuloData: string
  exemploDescricao: string
  vazio: string
  categoriaNova: string
}

export const TEXTOS: Record<TipoLancamento, Textos> = {
  despesa: {
    titulo: 'Despesas',
    descricao: 'Gastos já pagos fora do caixa: aluguel, contas, salários. Lançar aqui não mexe no caixa — pagamento com dinheiro da gaveta é sangria, em Caixa.',
    singular: 'despesa',
    novo: 'Nova despesa',
    rotuloData: 'Data do pagamento',
    exemploDescricao: 'Ex.: Conta de luz de setembro',
    vazio: 'Nenhuma despesa neste período. Ajuste os filtros ou lance a primeira.',
    categoriaNova: 'Ex.: Manutenção',
  },
  receita: {
    titulo: 'Receitas',
    descricao: 'Entradas que não são venda: evento, aluguel de espaço, bonificação. Lançar aqui não mexe no caixa — dinheiro que entra na gaveta é suprimento, em Caixa.',
    singular: 'receita',
    novo: 'Nova receita',
    rotuloData: 'Data do recebimento',
    exemploDescricao: 'Ex.: Degustação para evento da empresa X',
    vazio: 'Nenhuma receita neste período. Ajuste os filtros ou lance a primeira.',
    categoriaNova: 'Ex.: Eventos',
  },
}
