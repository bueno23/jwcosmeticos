import { nomeTabela, prisma } from '@/lib/prisma'
import { getCompanyId } from '@/lib/auth/dal'
import { calcularResumo, getCaixaAberto } from '@/lib/services/caixa'
import { inicioDoDia, inicioDoMes, variacao } from '@/lib/format'

const num = (v: { toString(): string } | null | undefined) => Number(v ?? 0)

export type ResumoDoDia = {
  faturamento: number
  itens: number
  ticket: number
  saldoCaixa: number
  variacaoFaturamento: number | null
  variacaoItens: number | null
  variacaoTicket: number | null
  caixaAberto: boolean
}

export async function getResumoDoDia(): Promise<ResumoDoDia> {
  const companyId = await getCompanyId()
  const hoje = inicioDoDia()
  const ontem = new Date(hoje.getTime() - 86400000)

  const periodo = async (de: Date, ate: Date) => {
    const [agregado, itens] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
        where: { companyId, status: 'CONCLUIDA', createdAt: { gte: de, lt: ate } },
      }),
      prisma.saleItem.aggregate({
        _sum: { quantity: true },
        where: { sale: { companyId, status: 'CONCLUIDA', createdAt: { gte: de, lt: ate } } },
      }),
    ])
    const faturamento = num(agregado._sum.total)
    const vendas = agregado._count
    return { faturamento, vendas, itens: itens._sum.quantity ?? 0, ticket: vendas ? faturamento / vendas : 0 }
  }

  const [atual, anterior, caixa] = await Promise.all([
    periodo(hoje, new Date(hoje.getTime() + 86400000)),
    periodo(ontem, hoje),
    getSaldoCaixa(),
  ])

  return {
    faturamento: atual.faturamento,
    itens: atual.itens,
    ticket: atual.ticket,
    saldoCaixa: caixa.saldo,
    variacaoFaturamento: variacao(atual.faturamento, anterior.faturamento),
    variacaoItens: variacao(atual.itens, anterior.itens),
    variacaoTicket: variacao(atual.ticket, anterior.ticket),
    caixaAberto: caixa.aberto,
  }
}

export async function getSaldoCaixa() {
  const caixa = await getCaixaAberto()
  if (!caixa) return { saldo: 0, aberto: false, abertoDesde: null as Date | null }

  // Mesma conta da tela do caixa; somar os movimentos VENDA contaria a venda em dobro
  const { esperado } = await calcularResumo(caixa)
  return { saldo: esperado, aberto: true, abertoDesde: caixa.openedAt }
}

export async function getVendasUltimos7Dias() {
  const companyId = await getCompanyId()
  const inicio = inicioDoDia(new Date(Date.now() - 6 * 86400000))
  const vendas = await prisma.sale.findMany({
    where: { companyId, status: 'CONCLUIDA', createdAt: { gte: inicio } },
    select: { total: true, createdAt: true },
  })

  return Array.from({ length: 7 }, (_, i) => {
    const dia = inicioDoDia(new Date(inicio.getTime() + i * 86400000))
    const fim = new Date(dia.getTime() + 86400000)
    const total = vendas
      .filter((v) => v.createdAt >= dia && v.createdAt < fim)
      .reduce((n, v) => n + num(v.total), 0)
    return { data: dia, total, hoje: i === 6 }
  })
}

export async function getVendasPorCategoria() {
  const companyId = await getCompanyId()
  const hoje = inicioDoDia()
  const itens = await prisma.saleItem.findMany({
    where: { sale: { companyId, status: 'CONCLUIDA', createdAt: { gte: hoje } } },
    select: { total: true, product: { select: { category: { select: { name: true, color: true } } } } },
  })

  const mapa = new Map<string, { nome: string; cor: string; total: number }>()
  for (const item of itens) {
    const nome = item.product?.category?.name ?? 'Outros'
    const cor = item.product?.category?.color ?? '#9CA3AF'
    const atual = mapa.get(nome) ?? { nome, cor, total: 0 }
    atual.total += num(item.total)
    mapa.set(nome, atual)
  }

  const linhas = [...mapa.values()].sort((a, b) => b.total - a.total)
  const total = linhas.reduce((n, l) => n + l.total, 0)
  return {
    total,
    fatias: linhas.map((l) => ({ ...l, percentual: total ? (l.total / total) * 100 : 0 })),
  }
}

export async function getEstoqueBaixo(limite = 5) {
  const companyId = await getCompanyId()
  const produtos = await prisma.$queryRawUnsafe<
    { id: string; name: string; stock: number; minStock: number; categoria: string | null; cor: string | null }[]
  >(
    `select p.id, p.name, p.stock, p."minStock", c.name as categoria, c.color as cor
    from ${nomeTabela('Product')} p
    left join ${nomeTabela('Category')} c on c.id = p."categoryId"
    where p."companyId" = $1 and p.active = true and p."trackStock" = true and p.stock <= p."minStock"
    order by (p.stock::float / nullif(p."minStock", 0)) asc nulls first, p.stock asc
    limit $2`,
    companyId,
    limite,
  )
  const total = await prisma.product.count({
    where: { companyId, active: true, trackStock: true, stock: { lte: prisma.product.fields.minStock } },
  })
  return { produtos, total }
}

export async function getResumoFinanceiro() {
  const companyId = await getCompanyId()
  const inicio = inicioDoMes()

  const [vendas, despesas, evolucao] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true, costTotal: true },
      where: { companyId, status: 'CONCLUIDA', createdAt: { gte: inicio } },
    }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { companyId, spentAt: { gte: inicio } } }),
    prisma.sale.findMany({
      where: { companyId, status: 'CONCLUIDA', createdAt: { gte: inicioDoDia(new Date(Date.now() - 13 * 86400000)) } },
      select: { total: true, costTotal: true, createdAt: true },
    }),
  ])

  const entradas = num(vendas._sum.total)
  const custoMercadoria = num(vendas._sum.costTotal)
  const saidas = num(despesas._sum.amount)
  const lucro = entradas - custoMercadoria - saidas

  const dias = Array.from({ length: 14 }, (_, i) => {
    const dia = inicioDoDia(new Date(Date.now() - (13 - i) * 86400000))
    const fim = new Date(dia.getTime() + 86400000)
    const doDia = evolucao.filter((v) => v.createdAt >= dia && v.createdAt < fim)
    return {
      data: dia,
      lucro: doDia.reduce((n, v) => n + num(v.total) - num(v.costTotal), 0),
    }
  })

  return {
    entradas,
    saidas,
    custoMercadoria,
    lucro,
    margem: entradas ? (lucro / entradas) * 100 : 0,
    evolucao: dias,
  }
}

export type Movimentacao = {
  id: string
  tipo: 'VENDA' | 'ENTRADA' | 'SAIDA' | 'DESPESA'
  titulo: string
  detalhe: string
  valor: number | null
  quando: Date
}

/** Sem `comCusto`, some a despesa e o valor de compra das entradas: é o que o operador recebe. */
export async function getMovimentacoesRecentes(limite = 6, comCusto = true): Promise<Movimentacao[]> {
  const companyId = await getCompanyId()

  const [vendas, estoque, despesas] = await Promise.all([
    prisma.sale.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: { items: { select: { name: true, quantity: true } } },
    }),
    prisma.stockMovement.findMany({
      where: { companyId, type: { in: ['ENTRADA', 'SAIDA', 'PERDA', 'AJUSTE'] } },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: { product: { select: { name: true } } },
    }),
    comCusto ? prisma.expense.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: limite }) : [],
  ])

  const linhas: Movimentacao[] = [
    ...vendas.map((v) => ({
      id: v.id,
      tipo: (v.status === 'CANCELADA' ? 'SAIDA' : 'VENDA') as Movimentacao['tipo'],
      titulo: v.status === 'CANCELADA' ? 'Venda cancelada' : 'Venda realizada',
      detalhe: v.items.map((i) => `${i.name} (${i.quantity} un)`).join(', ') || `Venda #${v.number}`,
      valor: num(v.total),
      quando: v.createdAt,
    })),
    ...estoque.map((m) => ({
      id: m.id,
      tipo: (m.quantity >= 0 ? 'ENTRADA' : 'SAIDA') as Movimentacao['tipo'],
      titulo: m.quantity >= 0 ? 'Entrada de estoque' : 'Saída de estoque',
      detalhe: `${m.product.name} (${Math.abs(m.quantity)} un)`,
      valor: comCusto ? num(m.totalCost) : null,
      quando: m.createdAt,
    })),
    ...despesas.map((d) => ({
      id: d.id,
      tipo: 'DESPESA' as const,
      titulo: 'Despesa',
      detalhe: d.description,
      valor: num(d.amount),
      quando: d.createdAt,
    })),
  ]

  return linhas.sort((a, b) => b.quando.getTime() - a.quando.getTime()).slice(0, limite)
}
