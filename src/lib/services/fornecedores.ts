import { nomeTabela, prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId } from '@/lib/auth/dal'
import { Prisma, type PayableStatus } from '@/generated/prisma'
import { limparCnpj } from '@/lib/cnpj'

/** Aberta e vencida ainda são dinheiro a sair; paga e cancelada já não pesam. */
const EM_ABERTO: PayableStatus[] = ['ABERTA', 'VENCIDA']

/** Erro que a pessoa consegue corrigir no formulário; a action devolve como mensagem. */
export class ErroDeCadastro extends Error {
  constructor(mensagem: string, public campo?: string) {
    super(mensagem)
    this.name = 'ErroDeCadastro'
  }
}

async function idsPorDocumento(companyId: string, documento: string): Promise<string[]> {
  // O seed guarda CNPJ com máscara e o cadastro novo sem; comparar só os caracteres cobre os dois
  const linhas = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM ${nomeTabela('Supplier')}
    WHERE "companyId" = $1
      AND upper(regexp_replace(coalesce(document, ''), '[^0-9A-Za-z]', '', 'g')) LIKE $2`,
    companyId,
    `%${documento}%`,
  )
  return linhas.map((l) => l.id)
}

export async function listarFornecedoresResumo({ busca = '', comFinanceiro = false } = {}) {
  const companyId = await getCompanyId()
  const where: Prisma.SupplierWhereInput = { companyId }

  if (busca) {
    const documento = limparCnpj(busca)
    const ids = /\d/.test(busca) && documento.length >= 2 ? await idsPorDocumento(companyId, documento) : []
    where.OR = [
      { legalName: { contains: busca, mode: 'insensitive' } },
      { tradeName: { contains: busca, mode: 'insensitive' } },
      { id: { in: ids } },
    ]
  }

  const fornecedores = await prisma.supplier.findMany({
    where,
    include: {
      _count: { select: { products: true, payables: { where: { status: { in: EM_ABERTO } } } } },
    },
    orderBy: [{ tradeName: 'asc' }, { legalName: 'asc' }],
  })

  const totais = new Map<string, number>()
  if (comFinanceiro && fornecedores.length > 0) {
    const grupos = await prisma.accountPayable.groupBy({
      by: ['supplierId'],
      where: { companyId, status: { in: EM_ABERTO }, supplierId: { in: fornecedores.map((f) => f.id) } },
      _sum: { amount: true },
    })
    for (const g of grupos) if (g.supplierId) totais.set(g.supplierId, Number(g._sum.amount ?? 0))
  }

  return fornecedores.map((f) => ({
    id: f.id,
    legalName: f.legalName,
    tradeName: f.tradeName,
    document: f.document,
    phone: f.phone,
    email: f.email,
    address: f.address,
    contactName: f.contactName,
    produtos: f._count.products,
    contasAbertas: comFinanceiro ? f._count.payables : 0,
    valorAberto: totais.get(f.id) ?? 0,
  }))
}

// O movimento não guarda fornecedor: as compras são as entradas dos produtos que hoje apontam para ele
export async function getFornecedor(id: string, { comFinanceiro = false } = {}) {
  const companyId = await getCompanyId()
  const fornecedor = await prisma.supplier.findFirst({ where: { id, companyId } })
  if (!fornecedor) return null

  const ondeCompras: Prisma.StockMovementWhereInput = { companyId, type: 'ENTRADA', product: { supplierId: id } }

  const [produtos, compras, resumoCompras, contas, contasTotal] = await Promise.all([
    prisma.product.findMany({
      where: { companyId, supplierId: id },
      select: {
        id: true, name: true, sku: true, unit: true, stock: true, minStock: true,
        trackStock: true, active: true, costPrice: true, salePrice: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    }),
    prisma.stockMovement.findMany({
      where: ondeCompras,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, quantity: true, unitCost: true, totalCost: true, origin: true, reason: true, createdAt: true,
        product: { select: { id: true, name: true, unit: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.stockMovement.aggregate({
      where: ondeCompras,
      _count: true,
      _sum: { quantity: true, totalCost: true },
      _max: { createdAt: true },
    }),
    comFinanceiro
      ? prisma.accountPayable.findMany({
          where: { companyId, supplierId: id, status: { in: EM_ABERTO } },
          orderBy: { dueDate: 'asc' },
          select: { id: true, description: true, amount: true, dueDate: true, status: true },
        })
      : Promise.resolve([]),
    prisma.accountPayable.count({ where: { companyId, supplierId: id } }),
  ])

  return {
    fornecedor,
    produtos,
    compras,
    resumoCompras: {
      entradas: resumoCompras._count,
      unidades: resumoCompras._sum.quantity ?? 0,
      total: Number(resumoCompras._sum.totalCost ?? 0),
      ultima: resumoCompras._max.createdAt,
    },
    contas,
    vinculos: { produtos: produtos.length, contas: contasTotal },
  }
}

export type DadosFornecedor = {
  legalName: string
  tradeName: string | null
  /** Só os caracteres do CNPJ, sem máscara. */
  document: string | null
  phone: string | null
  email: string | null
  address: string | null
  contactName: string | null
}

async function garantirCnpjUnico(companyId: string, documento: string, ignorar: string | null) {
  const ids = await idsPorDocumento(companyId, documento)
  const outros = await prisma.supplier.findMany({
    where: { companyId, id: { in: ids, ...(ignorar ? { not: ignorar } : {}) } },
    select: { legalName: true, document: true },
  })
  const repetido = outros.find((o) => o.document && limparCnpj(o.document) === documento)
  if (repetido) throw new ErroDeCadastro(`Este CNPJ já está cadastrado em ${repetido.legalName}.`, 'document')
}

export async function salvarFornecedor(id: string | null, dados: DadosFornecedor) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const documento = dados.document ? limparCnpj(dados.document) : null
  if (documento) await garantirCnpjUnico(companyId, documento, id)

  const data = { ...dados, document: documento }
  if (id) {
    const { count } = await prisma.supplier.updateMany({ where: { id, companyId }, data })
    if (count === 0) throw new ErroDeCadastro('Fornecedor não encontrado.')
    return { id }
  }
  const criado = await prisma.supplier.create({ data: { companyId, ...data } })
  return { id: criado.id }
}

export type ResultadoRemocao =
  | { removido: true }
  | { removido: false; produtos: number; contas: number }

// Com vínculo, o SetNull apagaria o histórico de compras e a origem da dívida
export async function removerFornecedor(id: string): Promise<ResultadoRemocao> {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()

  return prisma.$transaction(async (tx) => {
    const fornecedor = await tx.supplier.findFirst({ where: { id, companyId }, select: { id: true } })
    if (!fornecedor) throw new ErroDeCadastro('Fornecedor não encontrado.')

    const produtos = await tx.product.count({ where: { companyId, supplierId: id } })
    const contas = await tx.accountPayable.count({ where: { companyId, supplierId: id } })
    if (produtos > 0 || contas > 0) return { removido: false, produtos, contas }

    await tx.supplier.deleteMany({ where: { id, companyId } })
    return { removido: true }
  })
}
