import { prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId, usuarioIdObrigatorio } from '@/lib/auth/dal'
import { Prisma } from '@/generated/prisma'
import { custoMedioPonderado } from '@/lib/margem'

/** Lista enxuta para os seletores de produto das telas de entrada e ajuste. */
export async function listarProdutosComEstoque() {
  const companyId = await getCompanyId()
  return prisma.product.findMany({
    where: { companyId, active: true, trackStock: true },
    select: {
      id: true, name: true, sku: true, unit: true,
      stock: true, minStock: true, costPrice: true, salePrice: true, trackStock: true,
    },
    orderBy: { name: 'asc' },
  })
}

export type DadosEntrada = {
  productId: string
  quantidade: number
  custoUnitario: number
  supplierId: string | null
  nota: string | null
  /** Descrição livre do que entrou. */
  motivo: string | null
  gerarContaPagar: boolean
  descricaoConta: string | null
  vencimento: Date | null
}

export type ResultadoEntrada = {
  novoSaldo: number
  custoAnterior: number
  custoNovo: number
  custoMudou: boolean
}

/**
 * Entrada de mercadoria: movimento, saldo e custo médio na mesma transação.
 * Se a conta a pagar for criada e algo falhar, nada é gravado.
 */
export async function registrarEntrada(dados: DadosEntrada): Promise<ResultadoEntrada> {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const quantidade = Math.trunc(dados.quantidade)
  if (quantidade <= 0) throw new Error('Quantidade inválida.')

  const custo = new Prisma.Decimal(dados.custoUnitario)

  return prisma.$transaction(async (tx) => {
    const produto = await tx.product.findFirst({ where: { id: dados.productId, companyId } })
    if (!produto) throw new Error('Produto não encontrado.')
    if (!produto.trackStock) throw new Error('Este produto não controla estoque, então não recebe entrada.')

    // Regra 6: a entrada se mistura ao custo do que já está em estoque
    const custoAnterior = Number(produto.costPrice)
    const custoNovo = custoMedioPonderado(custoAnterior, produto.stock, Number(custo), quantidade)
    const novoSaldo = produto.stock + quantidade

    await tx.stockMovement.create({
      data: {
        companyId,
        userId: await usuarioIdObrigatorio(),
        productId: produto.id,
        type: 'ENTRADA',
        quantity: quantidade,
        unitCost: custo,
        totalCost: new Prisma.Decimal(custo).mul(quantidade),
        balance: novoSaldo,
        reason: dados.motivo,
        origin: dados.nota ? `NF ${dados.nota}` : 'ENTRADA',
      },
    })

    await tx.product.update({
      where: { id: produto.id },
      data: { stock: novoSaldo, costPrice: new Prisma.Decimal(custoNovo) },
    })

    if (dados.gerarContaPagar && dados.vencimento) {
      await tx.accountPayable.create({
        data: {
          companyId,
          supplierId: dados.supplierId,
          description: dados.descricaoConta?.trim()
            || `Entrada de ${quantidade} ${quantidade === 1 ? 'unidade' : 'unidades'} — ${produto.name}`,
          amount: new Prisma.Decimal(custo).mul(quantidade),
          dueDate: dados.vencimento,
          status: 'ABERTA',
        },
      })
    }

    return { novoSaldo, custoAnterior, custoNovo, custoMudou: Math.abs(custoNovo - custoAnterior) >= 0.005 }
  })
}

export type DadosAjuste = {
  productId: string
  tipo: 'AJUSTE' | 'PERDA'
  /** Em AJUSTE é o saldo contado; em PERDA é quantas unidades saem. */
  quantidade: number
  motivo: string
}

export type ResultadoAjuste = { novoSaldo: number; diferenca: number }

/** Ajuste de contagem e perda: os dois gravam movimento com a diferença e o motivo obrigatório. */
export async function registrarAjuste(dados: DadosAjuste): Promise<ResultadoAjuste> {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const motivo = dados.motivo.trim()
  if (!motivo) throw new Error('Informe o motivo.')

  return prisma.$transaction(async (tx) => {
    const produto = await tx.product.findFirst({ where: { id: dados.productId, companyId } })
    if (!produto) throw new Error('Produto não encontrado.')
    if (!produto.trackStock) throw new Error('Este produto não controla estoque.')

    const contado = Math.trunc(dados.quantidade)
    const diferenca = dados.tipo === 'AJUSTE' ? contado - produto.stock : -Math.abs(contado)

    if (dados.tipo === 'AJUSTE' && diferenca === 0) throw new Error('O saldo contado é igual ao do sistema.')
    if (dados.tipo === 'PERDA' && contado === 0) throw new Error('Informe quantas unidades foram perdidas.')
    if (dados.tipo === 'PERDA' && Math.abs(diferenca) > produto.stock) {
      throw new Error(`O sistema tem ${produto.stock} ${produto.unit} em estoque.`)
    }
    if (produto.stock + diferenca < 0) throw new Error('O ajuste deixaria o estoque negativo.')

    const novoSaldo = produto.stock + diferenca
    const custo = Number(produto.costPrice)

    await tx.stockMovement.create({
      data: {
        companyId,
        userId: await usuarioIdObrigatorio(),
        productId: produto.id,
        type: dados.tipo,
        quantity: diferenca,
        unitCost: new Prisma.Decimal(custo),
        totalCost: new Prisma.Decimal(custo).mul(Math.abs(diferenca)),
        balance: novoSaldo,
        reason: motivo,
        origin: 'AJUSTE',
      },
    })

    await tx.product.update({ where: { id: produto.id }, data: { stock: novoSaldo } })

    return { novoSaldo, diferenca }
  })
}

/** Histórico por tipo(s) de movimento, usado nas telas de entrada e ajuste. */
export async function listarMovimentos(filtro: { tipos?: string[]; busca?: string; limite?: number } = {}) {
  const companyId = await getCompanyId()
  const where: Prisma.StockMovementWhereInput = { companyId }
  if (filtro.tipos?.length) where.type = { in: filtro.tipos as Prisma.EnumMovementTypeFilter['in'] }
  if (filtro.busca) where.product = { name: { contains: filtro.busca, mode: 'insensitive' } }

  return prisma.stockMovement.findMany({
    where,
    include: {
      product: { select: { name: true, unit: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: filtro.limite ?? 50,
  })
}

export type ItemInventario = { productId: string; saldoContado: number }

export type ResultadoInventario = {
  ajustados: number
  semDivergencia: number
  ignorados: number
  linhas: { nome: string; de: number; para: number }[]
}

/**
 * Fecha uma contagem geral: um movimento AJUSTE por produto que divergiu,
 * todos na mesma transação — ou nenhum é gravado.Produto que o usuário não
 * preencheu fica de fora, para não virar ajuste em branco.
 */
export async function registrarInventario(itens: ItemInventario[], motivo: string): Promise<ResultadoInventario> {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const texto = motivo.trim()
  if (!texto) throw new Error('Informe o motivo da contagem.')

  return prisma.$transaction(async (tx) => {
    const produtos = await tx.product.findMany({
      where: { companyId, id: { in: itens.map((i) => i.productId) } },
      select: { id: true, name: true, stock: true, unit: true, costPrice: true, trackStock: true },
    })
    const porId = new Map(produtos.map((p) => [p.id, p]))

    const userId = await usuarioIdObrigatorio()
    const linhas: ResultadoInventario['linhas'] = []
    let ajustados = 0
    let semDivergencia = 0
    let ignorados = 0

    for (const item of itens) {
      const produto = porId.get(item.productId)
      if (!produto || !produto.trackStock) {
        ignorados++
        continue
      }

      const contado = Math.trunc(item.saldoContado)
      if (contado < 0) throw new Error(`O saldo contado de ${produto.name} não pode ser negativo.`)
      if (contado === produto.stock) {
        semDivergencia++
        continue
      }

      const diferenca = contado - produto.stock
      const custo = Number(produto.costPrice)

      await tx.stockMovement.create({
        data: {
          companyId,
          userId,
          productId: produto.id,
          type: 'AJUSTE',
          quantity: diferenca,
          unitCost: new Prisma.Decimal(custo),
          totalCost: new Prisma.Decimal(custo).mul(Math.abs(diferenca)),
          balance: contado,
          reason: texto,
          origin: 'INVENTARIO',
        },
      })
      await tx.product.update({ where: { id: produto.id }, data: { stock: contado } })

      linhas.push({ nome: produto.name, de: produto.stock, para: contado })
      ajustados++
    }

    return { ajustados, semDivergencia, ignorados, linhas }
  })
}
