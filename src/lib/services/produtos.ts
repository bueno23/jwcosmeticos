import { prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId, usuarioIdObrigatorio } from '@/lib/auth/dal'
import { Prisma } from '@/generated/prisma'

export type FiltroProdutos = {
  busca?: string
  categoria?: string
  situacao?: 'ativos' | 'inativos' | 'baixo' | 'todos'
}

export async function listarProdutos(filtro: FiltroProdutos = {}) {
  const companyId = await getCompanyId()
  const where: Prisma.ProductWhereInput = { companyId }

  if (filtro.busca) {
    where.OR = [
      { name: { contains: filtro.busca, mode: 'insensitive' } },
      { sku: { contains: filtro.busca, mode: 'insensitive' } },
      { barcode: { contains: filtro.busca, mode: 'insensitive' } },
      { brand: { contains: filtro.busca, mode: 'insensitive' } },
    ]
  }
  if (filtro.categoria) where.categoryId = filtro.categoria
  if (filtro.situacao === 'inativos') where.active = false
  else if (filtro.situacao === 'todos') void 0
  else where.active = true

  const produtos = await prisma.product.findMany({
    where,
    include: { category: true, supplier: { select: { id: true, tradeName: true, legalName: true } } },
    orderBy: { name: 'asc' },
  })

  if (filtro.situacao === 'baixo') return produtos.filter((p) => p.trackStock && p.stock <= p.minStock)
  return produtos
}

export async function getProduto(id: string) {
  const companyId = await getCompanyId()
  return prisma.product.findFirst({
    where: { id, companyId },
    include: {
      category: true,
      supplier: true,
      movements: { orderBy: { createdAt: 'desc' }, take: 40, include: { user: { select: { name: true } } } },
    },
  })
}

export async function resumoEstoque() {
  const companyId = await getCompanyId()
  const produtos = await prisma.product.findMany({
    where: { companyId, active: true },
    select: { stock: true, costPrice: true, salePrice: true, minStock: true, trackStock: true },
  })

  const comEstoque = produtos.filter((p) => p.trackStock)
  return {
    itens: produtos.length,
    unidades: comEstoque.reduce((n, p) => n + Math.max(p.stock, 0), 0),
    valorCusto: comEstoque.reduce((n, p) => n + Math.max(p.stock, 0) * Number(p.costPrice), 0),
    valorVenda: comEstoque.reduce((n, p) => n + Math.max(p.stock, 0) * Number(p.salePrice), 0),
    baixos: comEstoque.filter((p) => p.stock <= p.minStock).length,
  }
}

export async function listarCategorias() {
  const companyId = await getCompanyId()
  return prisma.category.findMany({
    where: { companyId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function listarFornecedores() {
  const companyId = await getCompanyId()
  return prisma.supplier.findMany({
    where: { companyId },
    include: { _count: { select: { products: true } } },
    orderBy: { legalName: 'asc' },
  })
}

/** Consumo dos últimos dias, usado na ficha do produto para dizer quanto tempo o estoque dura. */
export async function getGiroProduto(id: string, dias = 30) {
  const companyId = await getCompanyId()
  const desde = new Date(Date.now() - dias * 86400000)

  const [agregado, ultimo, movimentos] = await Promise.all([
    prisma.saleItem.aggregate({
      _sum: { quantity: true, total: true },
      where: { productId: id, sale: { companyId, status: 'CONCLUIDA', createdAt: { gte: desde } } },
    }),
    prisma.saleItem.findFirst({
      where: { productId: id, sale: { companyId, status: 'CONCLUIDA' } },
      orderBy: { sale: { createdAt: 'desc' } },
      select: { sale: { select: { createdAt: true } } },
    }),
    prisma.stockMovement.count({ where: { productId: id, companyId, type: 'ENTRADA' } }),
  ])

  const unidades = agregado._sum.quantity ?? 0
  return {
    dias,
    unidades,
    receita: Number(agregado._sum.total ?? 0),
    mediaDiaria: unidades / dias,
    ultimaVenda: ultimo?.sale.createdAt ?? null,
    entradas: movimentos,
  }
}

export type DadosProduto = {
  name: string
  sku: string | null
  barcode: string | null
  brand: string | null
  description: string | null
  unit: string
  categoryId: string | null
  supplierId: string | null
  costPrice: number
  salePrice: number
  minStock: number
  trackStock: boolean
  active: boolean
  /** Só faz sentido na criação: depois disso o saldo só muda por movimento. */
  estoqueInicial: number
}

export async function criarProduto(dados: DadosProduto) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const custo = new Prisma.Decimal(dados.costPrice)
  const venda = new Prisma.Decimal(dados.salePrice)
  // Regra 7: quem não controla estoque nunca carrega unidades
  const estoque = dados.trackStock ? Math.max(Math.trunc(dados.estoqueInicial), 0) : 0

  return prisma.$transaction(async (tx) => {
    const produto = await tx.product.create({
      data: {
        companyId,
        categoryId: dados.categoryId,
        supplierId: dados.supplierId,
        name: dados.name,
        sku: dados.sku,
        barcode: dados.barcode,
        brand: dados.brand,
        description: dados.description,
        unit: dados.unit,
        costPrice: custo,
        salePrice: venda,
        stock: estoque,
        minStock: Math.max(Math.trunc(dados.minStock), 0),
        trackStock: dados.trackStock,
        active: dados.active,
      },
    })

    // Regra 1: um saldo inicial sem movimento seria um estoque que ninguém sabe de onde veio
    if (estoque > 0) {
      await tx.stockMovement.create({
        data: {
          companyId,
          userId: await usuarioIdObrigatorio(),
          productId: produto.id,
          type: 'ENTRADA',
          quantity: estoque,
          unitCost: custo,
          totalCost: new Prisma.Decimal(custo).mul(estoque),
          balance: estoque,
          reason: 'Estoque inicial',
          origin: 'CADASTRO',
        },
      })
    }

    return produto
  })
}

/**
 * Atualizar produto não mexe no saldo. Alterar quantidade por aqui burlaria a auditoria,
 * então quem precisa disso usa /estoque/ajustes, que grava o movimento com motivo.
 */
export async function atualizarProduto(id: string, dados: DadosProduto) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()

  return prisma.product.updateMany({
    where: { id, companyId },
    data: {
      categoryId: dados.categoryId,
      supplierId: dados.supplierId,
      name: dados.name,
      sku: dados.sku,
      barcode: dados.barcode,
      brand: dados.brand,
      description: dados.description,
      unit: dados.unit,
      costPrice: new Prisma.Decimal(dados.costPrice),
      salePrice: new Prisma.Decimal(dados.salePrice),
      minStock: Math.max(Math.trunc(dados.minStock), 0),
      trackStock: dados.trackStock,
      active: dados.active,
    },
  })
}

/**
 * Não existe exclusão de produto: StockMovement cai em cascade na remoção, o que apagaria
 * a auditoria de estoque. Por isso o cadastro é desativado e continua no histórico.
 */
export async function alternarStatusProduto(id: string, ativo: boolean) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  await prisma.product.updateMany({ where: { id, companyId }, data: { active: ativo } })
}

export type DadosCategoria = { name: string; color: string }

export async function salvarCategoria(id: string | null, dados: DadosCategoria) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  if (id) {
    await prisma.category.updateMany({ where: { id, companyId }, data: dados })
    return { id }
  }
  const criada = await prisma.category.create({ data: { companyId, ...dados } })
  return { id: criada.id }
}

/** Categoria pode ser removida de verdade: o produto só fica sem categoria (SetNull). */
export async function removerCategoria(id: string) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const [produtosSemCategoria] = await prisma.$transaction([
    prisma.product.count({ where: { companyId, categoryId: id } }),
    prisma.category.deleteMany({ where: { id, companyId } }),
  ])
  return { produtosSemCategoria }
}
