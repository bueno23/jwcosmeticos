import { prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId } from '@/lib/auth/dal'
import type { PayableStatus, Prisma } from '@/generated/prisma'
import { cpfValido, soDigitos, telefoneValido } from '@/app/(app)/clientes/cliente'

const EM_ABERTO: PayableStatus[] = ['ABERTA', 'VENCIDA']

/** Erro que a pessoa consegue corrigir; a action devolve como mensagem, não como exceção. */
export class ErroDeCliente extends Error {
  constructor(mensagem: string, public campo?: string) {
    super(mensagem)
    this.name = 'ErroDeCliente'
  }
}

export async function listarClientes(busca = '') {
  const companyId = await getCompanyId()
  const where: Prisma.CustomerWhereInput = { companyId }

  const termo = busca.trim()
  if (termo) {
    const digitos = soDigitos(termo)
    where.OR = [
      { name: { contains: termo, mode: 'insensitive' } },
      { phone: { contains: termo } },
      { document: { contains: termo } },
      ...(digitos ? [{ phone: { contains: digitos } }, { document: { contains: digitos } }] : []),
    ]
  }

  const clientes = await prisma.customer.findMany({
    where,
    select: {
      id: true, name: true, phone: true, document: true, birthDate: true, notes: true,
      _count: { select: { sales: true, receivables: true } },
    },
    orderBy: { name: 'asc' },
  })
  const ids = clientes.map((c) => c.id)

  const [vendas, fiado] = await Promise.all([
    prisma.sale.groupBy({
      by: ['customerId'],
      where: { companyId, customerId: { in: ids }, status: 'CONCLUIDA' },
      _sum: { total: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.accountReceivable.groupBy({
      by: ['customerId'],
      where: { companyId, customerId: { in: ids }, status: { in: EM_ABERTO } },
      _sum: { amount: true },
    }),
  ])

  const porVenda = new Map(vendas.map((v) => [v.customerId, v]))
  const porFiado = new Map(fiado.map((f) => [f.customerId, Number(f._sum.amount ?? 0)]))

  return clientes.map((c) => {
    const v = porVenda.get(c.id)
    return {
      ...c,
      totalComprado: Number(v?._sum.total ?? 0),
      compras: v?._count._all ?? 0,
      ultimaCompra: v?._max.createdAt ?? null,
      fiadoAberto: porFiado.get(c.id) ?? 0,
    }
  })
}

export async function resumoClientes() {
  const companyId = await getCompanyId()
  const [clientes, fiado] = await Promise.all([
    prisma.customer.count({ where: { companyId } }),
    prisma.accountReceivable.groupBy({
      by: ['customerId'],
      where: { companyId, customerId: { not: null }, status: { in: EM_ABERTO } },
      _sum: { amount: true },
    }),
  ])
  return {
    clientes,
    comFiado: fiado.length,
    totalEmAberto: fiado.reduce((n, f) => n + Number(f._sum.amount ?? 0), 0),
  }
}

export async function getCliente(id: string) {
  const companyId = await getCompanyId()
  const cliente = await prisma.customer.findFirst({
    where: { id, companyId },
    select: {
      id: true, name: true, phone: true, document: true, birthDate: true, notes: true, createdAt: true,
      _count: { select: { sales: true, receivables: true } },
    },
  })
  if (!cliente) return null

  const [agregado, fiado, ultimas] = await Promise.all([
    prisma.sale.aggregate({
      where: { companyId, customerId: id, status: 'CONCLUIDA' },
      _sum: { total: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.accountReceivable.findMany({
      where: { companyId, customerId: id, status: { in: EM_ABERTO } },
      select: { id: true, description: true, amount: true, dueDate: true, createdAt: true },
      orderBy: { dueDate: 'asc' },
    }),
    // Sem costTotal no select: a ficha é aberta pelo operador e custo não pode ir no payload
    prisma.sale.findMany({
      where: { companyId, customerId: id },
      select: {
        id: true, number: true, status: true, payment: true, total: true, discount: true, createdAt: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ])

  const agora = Date.now()
  const totalComprado = Number(agregado._sum.total ?? 0)
  const ultimaCompra = agregado._max.createdAt ?? null
  const compras = agregado._count._all
  return {
    cliente,
    totalComprado,
    compras,
    ticketMedio: compras > 0 ? totalComprado / compras : 0,
    ultimaCompra,
    diasDesdeUltima: ultimaCompra ? Math.floor((agora - ultimaCompra.getTime()) / 86400000) : null,
    fiado: fiado.map((f) => ({ ...f, amount: Number(f.amount), vencido: f.dueDate.getTime() < agora })),
    fiadoAberto: fiado.reduce((n, f) => n + Number(f.amount), 0),
    ultimasVendas: ultimas.map((v) => ({
      id: v.id,
      number: v.number,
      status: v.status,
      payment: v.payment,
      total: Number(v.total),
      discount: Number(v.discount),
      createdAt: v.createdAt,
      itens: v._count.items,
    })),
  }
}

export type DadosCliente = {
  name: string
  phone: string | null
  document: string | null
  birthDate: Date | null
  notes: string | null
}

/** Regra do cadastro: CPF e telefone só com dígitos, CPF válido e único na empresa. */
async function normalizar(companyId: string, id: string | null, dados: DadosCliente): Promise<DadosCliente> {
  const phone = dados.phone ? soDigitos(dados.phone) : ''
  const document = dados.document ? soDigitos(dados.document) : ''

  if (phone && !telefoneValido(phone)) throw new ErroDeCliente('Telefone precisa ter DDD e 8 ou 9 dígitos.', 'phone')
  if (document && !cpfValido(document)) throw new ErroDeCliente('CPF inválido: confira os dígitos.', 'document')
  if (dados.birthDate && dados.birthDate.getTime() > Date.now()) {
    throw new ErroDeCliente('A data de nascimento está no futuro.', 'birthDate')
  }

  if (document) {
    const outro = await prisma.customer.findFirst({
      where: { companyId, document, ...(id ? { id: { not: id } } : {}) },
      select: { name: true },
    })
    if (outro) throw new ErroDeCliente(`Este CPF já está no cadastro de ${outro.name}.`, 'document')
  }

  return { ...dados, phone: phone || null, document: document || null }
}

// O balcão cadastra cliente na hora de vender fiado, por isso o operador também escreve aqui
export async function salvarCliente(id: string | null, dados: DadosCliente) {
  await exigirPapelNoServico('DONO', 'GERENTE', 'OPERADOR')
  const companyId = await getCompanyId()
  const data = await normalizar(companyId, id, dados)

  if (id) {
    const { count } = await prisma.customer.updateMany({ where: { id, companyId }, data })
    if (count === 0) throw new ErroDeCliente('Cliente não encontrado.')
    return { id }
  }
  const criado = await prisma.customer.create({ data: { companyId, ...data } })
  return { id: criado.id }
}

/**
 * Venda e fiado ficam com customerId nulo (SetNull) se o cliente sumir, e aí ninguém sabe
 * de quem cobrar. Por isso só sai quem nunca comprou nem deve.
 */
export async function removerCliente(id: string) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()

  return prisma.$transaction(async (tx) => {
    const cliente = await tx.customer.findFirst({
      where: { id, companyId },
      select: { name: true, _count: { select: { sales: true, receivables: true } } },
    })
    if (!cliente) throw new ErroDeCliente('Cliente não encontrado.')

    const { sales, receivables } = cliente._count
    if (sales > 0 || receivables > 0) {
      const partes = [
        sales > 0 && `${sales} venda(s)`,
        receivables > 0 && `${receivables} lançamento(s) de fiado`,
      ].filter(Boolean).join(' e ')
      throw new ErroDeCliente(
        `${cliente.name} tem ${partes} no histórico. Remover apagaria de quem é essa venda ou dívida, então o cadastro fica.`,
      )
    }

    await tx.customer.delete({ where: { id } })
    return { nome: cliente.name }
  })
}
