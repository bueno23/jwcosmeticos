import { prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId, getUsuario } from '@/lib/auth/dal'
import { podeVerCusto } from '@/lib/auth/papeis'
import { Prisma, type PaymentMethod, type SaleStatus } from '@/generated/prisma'
import { FUSO, inicioDoDia, inicioDoMes } from '@/lib/format'
import { getCaixaAberto, registrarMovimentoDeCaixa } from './caixa'

const PAPEIS_VENDER = ['DONO', 'GERENTE', 'OPERADOR'] as const
const PAPEIS_CANCELAR = ['DONO', 'GERENTE'] as const

export const FORMAS_PAGAMENTO: PaymentMethod[] = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'FIADO']

const emCentavos = (n: number) => Math.round(n * 100)
const decimal = (centavos: number) => new Prisma.Decimal((centavos / 100).toFixed(2))

/** Erro que a pessoa corrige; quem chama devolve como mensagem, e a transação desfaz tudo. */
export class ErroDeVenda extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeVenda'
  }
}

/** Data de hoje (mais `dias`) no calendário de São Paulo, no formato AAAA-MM-DD. */
export function dataIsoNoFuso(dias = 0, base = new Date()) {
  return new Date(base.getTime() + dias * 86400000).toLocaleDateString('en-CA', { timeZone: FUSO })
}

// ---------------------------------------------------------------- PDV: leitura

/** Catálogo do PDV. Nunca leva custo: o operador também recebe este payload. */
export async function listarProdutosPdv() {
  const companyId = await getCompanyId()
  const produtos = await prisma.product.findMany({
    where: { companyId, active: true },
    select: {
      id: true, name: true, sku: true, barcode: true, unit: true, salePrice: true, stock: true, trackStock: true,
      category: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })
  return produtos.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    unit: p.unit,
    salePrice: Number(p.salePrice),
    stock: p.stock,
    trackStock: p.trackStock,
    categoria: p.category?.name ?? null,
  }))
}

export async function listarClientesPdv() {
  const companyId = await getCompanyId()
  const clientes = await prisma.customer.findMany({
    where: { companyId },
    select: { id: true, name: true, phone: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return clientes.map((c) => ({ id: c.id, name: c.name, phone: c.phone, criadoEm: c.createdAt.getTime() }))
}

export async function caixaEstaAberto() {
  return Boolean(await getCaixaAberto())
}

// ---------------------------------------------------------------- PDV: venda

export type DadosVenda = {
  itens: { productId: string; quantidade: number }[]
  /** Em reais. */
  desconto: number
  pagamento: PaymentMethod
  /** Só em dinheiro. */
  recebido: number | null
  customerId: string | null
  /** AAAA-MM-DD, só no fiado. */
  vencimento: string | null
}

export type ReciboVenda = {
  numero: number
  criadaEm: Date
  total: number
  subtotal: number
  desconto: number
  pagamento: PaymentMethod
  recebido: number | null
  troco: number
  vendedor: string
  cliente: string | null
  noCaixa: boolean
  itens: { nome: string; quantidade: number; precoUnit: number; total: number }[]
}

export type ResultadoVenda = { ok: true; venda: ReciboVenda } | { ok: false; mensagem: string }

/**
 * Venda inteira em uma transação (regra 2): preço e custo vêm do banco, o
 * estoque baixa só onde há controle, e qualquer falha desfaz tudo.
 */
export async function finalizarVenda(dados: DadosVenda): Promise<ResultadoVenda> {
  const usuario = await exigirPapelNoServico(...PAPEIS_VENDER)
  const companyId = usuario.companyId

  try {
    if (!FORMAS_PAGAMENTO.includes(dados.pagamento)) throw new ErroDeVenda('Forma de pagamento inválida.')
    if (!Number.isFinite(dados.desconto) || dados.desconto < 0) throw new ErroDeVenda('Desconto inválido.')

    const quantidades = new Map<string, number>()
    for (const item of dados.itens) {
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) throw new ErroDeVenda('Quantidade inválida no carrinho.')
      quantidades.set(item.productId, (quantidades.get(item.productId) ?? 0) + item.quantidade)
    }
    if (quantidades.size === 0) throw new ErroDeVenda('O carrinho está vazio.')

    if (dados.pagamento === 'FIADO') {
      if (!dados.customerId) throw new ErroDeVenda('Venda no fiado precisa de cliente.')
      if (!dados.vencimento || !/^\d{4}-\d{2}-\d{2}$/.test(dados.vencimento)) throw new ErroDeVenda('Informe o vencimento do fiado.')
      if (dados.vencimento < dataIsoNoFuso()) throw new ErroDeVenda('O vencimento não pode ser no passado.')
    }

    const venda = await prisma.$transaction(async (tx) => {
      // Serializa a numeração da empresa: dois PDVs fechando juntos não repetem número
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`venda:${companyId}`}))`

      const ids = [...quantidades.keys()].sort()
      const produtos = await tx.product.findMany({ where: { id: { in: ids }, companyId } })
      const porId = new Map(produtos.map((p) => [p.id, p]))

      const linhas = ids.map((id) => {
        const produto = porId.get(id)
        if (!produto) throw new ErroDeVenda('Um produto do carrinho não existe mais. Atualize a tela e tente de novo.')
        if (!produto.active) throw new ErroDeVenda(`${produto.name} está inativo e não pode ser vendido.`)
        const quantidade = quantidades.get(id)!
        const preco = emCentavos(Number(produto.salePrice))
        return { produto, quantidade, preco, custo: emCentavos(Number(produto.costPrice)) }
      })

      const subtotal = linhas.reduce((n, l) => n + l.preco * l.quantidade, 0)
      const custoTotal = linhas.reduce((n, l) => n + l.custo * l.quantidade, 0)
      const desconto = emCentavos(dados.desconto)
      if (desconto > subtotal) throw new ErroDeVenda('O desconto não pode passar do subtotal.')
      const total = subtotal - desconto
      if (total <= 0) throw new ErroDeVenda('O total da venda precisa ser maior que zero.')

      let recebido: number | null = null
      let troco = 0
      if (dados.pagamento === 'DINHEIRO') {
        if (dados.recebido == null || !Number.isFinite(dados.recebido)) throw new ErroDeVenda('Informe o valor recebido.')
        recebido = emCentavos(dados.recebido)
        if (recebido < total) throw new ErroDeVenda('O valor recebido é menor que o total da venda.')
        troco = recebido - total
      }

      let cliente: { id: string; name: string } | null = null
      if (dados.customerId) {
        cliente = await tx.customer.findFirst({ where: { id: dados.customerId, companyId }, select: { id: true, name: true } })
        if (!cliente) throw new ErroDeVenda('Cliente não encontrado.')
      }

      const { _max } = await tx.sale.aggregate({ _max: { number: true }, where: { companyId } })
      const numero = (_max.number ?? 0) + 1

      // Dinheiro primeiro: o movimento diz em qual caixa a venda caiu
      let registerId: string | null
      let noCaixa = false
      if (dados.pagamento === 'DINHEIRO') {
        const mov = await registrarMovimentoDeCaixa(tx, {
          tipo: 'VENDA', valor: total / 100, descricao: `Venda #${numero}`, userId: usuario.id,
        })
        registerId = mov?.registerId ?? null
        noCaixa = Boolean(mov)
      } else {
        registerId = (await getCaixaAberto(tx))?.id ?? null
      }

      const fiado = dados.pagamento === 'FIADO'
      const sale = await tx.sale.create({
        data: {
          companyId,
          userId: usuario.id,
          customerId: cliente?.id ?? null,
          registerId,
          number: numero,
          payment: dados.pagamento,
          subtotal: decimal(subtotal),
          discount: decimal(desconto),
          total: decimal(total),
          costTotal: decimal(custoTotal),
          paid: !fiado,
          paidAt: fiado ? null : new Date(),
          items: {
            create: linhas.map((l) => ({
              productId: l.produto.id,
              name: l.produto.name,
              quantity: l.quantidade,
              unitPrice: decimal(l.preco),
              unitCost: decimal(l.custo),
              total: decimal(l.preco * l.quantidade),
            })),
          },
        },
      })

      for (const l of linhas) {
        if (!l.produto.trackStock) continue
        const { count } = await tx.product.updateMany({
          where: { id: l.produto.id, companyId, stock: { gte: l.quantidade } },
          data: { stock: { decrement: l.quantidade } },
        })
        if (count !== 1) {
          const atual = await tx.product.findUnique({ where: { id: l.produto.id }, select: { stock: true } })
          throw new ErroDeVenda(
            `Estoque insuficiente de ${l.produto.name}: restam ${atual?.stock ?? 0} ${l.produto.unit} e o carrinho pede ${l.quantidade}.`,
          )
        }
        const { stock } = await tx.product.findUniqueOrThrow({ where: { id: l.produto.id }, select: { stock: true } })
        await tx.stockMovement.create({
          data: {
            companyId,
            userId: usuario.id,
            productId: l.produto.id,
            saleId: sale.id,
            type: 'VENDA',
            quantity: -l.quantidade,
            unitCost: decimal(l.custo),
            totalCost: decimal(l.custo * l.quantidade),
            balance: stock,
            reason: `Venda #${numero}`,
            origin: 'PDV',
          },
        })
      }

      if (fiado && cliente) {
        await tx.accountReceivable.create({
          data: {
            companyId,
            customerId: cliente.id,
            saleId: sale.id,
            description: `Fiado — venda #${numero}`,
            amount: decimal(total),
            dueDate: new Date(`${dados.vencimento}T12:00:00-03:00`),
            status: 'ABERTA',
          },
        })
      }

      return {
        numero,
        criadaEm: sale.createdAt,
        total: total / 100,
        subtotal: subtotal / 100,
        desconto: desconto / 100,
        pagamento: dados.pagamento,
        recebido: recebido == null ? null : recebido / 100,
        troco: troco / 100,
        vendedor: usuario.name,
        cliente: cliente?.name ?? null,
        noCaixa,
        itens: linhas.map((l) => ({
          nome: l.produto.name,
          quantidade: l.quantidade,
          precoUnit: l.preco / 100,
          total: (l.preco * l.quantidade) / 100,
        })),
      } satisfies ReciboVenda
    }, { timeout: 15000 })

    return { ok: true, venda }
  } catch (e) {
    if (e instanceof ErroDeVenda) return { ok: false, mensagem: e.message }
    throw e
  }
}

// ---------------------------------------------------------------- Cancelamento

export type ResultadoCancelamento = { ok: true; numero: number } | { ok: false; mensagem: string }

/**
 * Cancela sem apagar (regra 5). O motivo vive no `reason` do movimento
 * CANCELAMENTO; venda sem item com estoque grava um movimento de quantidade 0
 * só para guardar motivo e autor, já que Sale não tem campo para isso.
 */
export async function cancelarVenda(saleId: string, motivo: string): Promise<ResultadoCancelamento> {
  const usuario = await exigirPapelNoServico(...PAPEIS_CANCELAR)
  const companyId = usuario.companyId
  const texto = motivo.trim()
  if (!texto) return { ok: false, mensagem: 'Informe o motivo do cancelamento.' }
  if (texto.length > 300) return { ok: false, mensagem: 'Motivo muito longo (máximo 300 caracteres).' }

  try {
    const numero = await prisma.$transaction(async (tx) => {
      // Mesmo lock da venda: cancelar e vender ao mesmo tempo não disputam as linhas de produto
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`venda:${companyId}`}))`

      const venda = await tx.sale.findFirst({
        where: { id: saleId, companyId },
        include: { items: true, receivables: true },
      })
      if (!venda) throw new ErroDeVenda('Venda não encontrada.')
      if (venda.status === 'CANCELADA') throw new ErroDeVenda('Esta venda já foi cancelada.')

      const fiadoPago = venda.receivables.some((r) => r.status === 'PAGA')
      if (venda.payment === 'FIADO' && (fiadoPago || venda.paid)) {
        throw new ErroDeVenda('O fiado desta venda já foi pago. Estorne o recebimento antes de cancelar a venda.')
      }

      const { count } = await tx.sale.updateMany({
        where: { id: venda.id, companyId, status: 'CONCLUIDA' },
        data: { status: 'CANCELADA', canceledAt: new Date() },
      })
      if (count !== 1) throw new ErroDeVenda('Esta venda já foi cancelada.')

      const quantidades = new Map<string, number>()
      for (const item of venda.items) {
        if (item.productId) quantidades.set(item.productId, (quantidades.get(item.productId) ?? 0) + item.quantity)
      }
      const itemCusto = new Map(venda.items.filter((i) => i.productId).map((i) => [i.productId!, Number(i.unitCost)]))

      let registrou = false
      for (const id of [...quantidades.keys()].sort()) {
        const quantidade = quantidades.get(id)!
        const produto = await tx.product.findFirst({ where: { id, companyId } })
        if (!produto?.trackStock) continue

        const { stock } = await tx.product.update({
          where: { id }, data: { stock: { increment: quantidade } }, select: { stock: true },
        })
        const custo = itemCusto.get(id) ?? 0
        await tx.stockMovement.create({
          data: {
            companyId, userId: usuario.id, productId: id, saleId: venda.id,
            type: 'CANCELAMENTO', quantity: quantidade,
            unitCost: decimal(emCentavos(custo)), totalCost: decimal(emCentavos(custo) * quantidade),
            balance: stock, reason: texto, origin: `Cancelamento da venda #${venda.number}`,
          },
        })
        registrou = true
      }

      if (!registrou) {
        const id = venda.items.find((i) => i.productId)?.productId
        const produto = id ? await tx.product.findFirst({ where: { id, companyId } }) : null
        if (produto) {
          await tx.stockMovement.create({
            data: {
              companyId, userId: usuario.id, productId: produto.id, saleId: venda.id,
              type: 'CANCELAMENTO', quantity: 0, balance: produto.stock, reason: texto,
              origin: `Cancelamento da venda #${venda.number} (sem movimento de estoque)`,
            },
          })
        }
      }

      if (venda.payment === 'DINHEIRO' && venda.registerId) {
        const caixa = await getCaixaAberto(tx)
        if (caixa?.id === venda.registerId) {
          await tx.cashMovement.create({
            data: {
              registerId: caixa.id, userId: usuario.id, type: 'VENDA',
              amount: venda.total.neg(), description: `Cancelamento da venda #${venda.number}`,
            },
          })
        }
      }

      if (venda.payment === 'FIADO') {
        await tx.accountReceivable.updateMany({
          where: { saleId: venda.id, companyId, status: { not: 'PAGA' } },
          data: { status: 'CANCELADA' },
        })
      }

      return venda.number
    }, { timeout: 15000 })

    return { ok: true, numero }
  } catch (e) {
    if (e instanceof ErroDeVenda) return { ok: false, mensagem: e.message }
    throw e
  }
}

// ---------------------------------------------------------------- Listagens

export type Periodo = 'hoje' | '7d' | 'mes' | 'livre'

export type FiltroVendas = {
  periodo: Periodo
  de?: string
  ate?: string
  pagamento?: string
  customerId?: string
  status?: string
  numero?: number | null
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Intervalo [inicio, fim) no fuso de São Paulo. Intervalo livre inválido cai em hoje. */
export function resolverPeriodo(periodo: Periodo, de?: string, ate?: string) {
  const agora = new Date()
  const amanha = new Date(inicioDoDia(agora).getTime() + 86400000)
  if (periodo === '7d') return { inicio: inicioDoDia(new Date(agora.getTime() - 6 * 86400000)), fim: amanha }
  if (periodo === 'mes') return { inicio: inicioDoMes(agora), fim: amanha }
  if (periodo === 'livre' && de && ISO.test(de)) {
    const inicio = new Date(`${de}T00:00:00-03:00`)
    const fimIso = ate && ISO.test(ate) ? ate : de
    const fim = new Date(new Date(`${fimIso}T00:00:00-03:00`).getTime() + 86400000)
    if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fim.getTime()) && fim > inicio) return { inicio, fim }
  }
  return { inicio: inicioDoDia(agora), fim: amanha }
}

function montarWhere(companyId: string, f: FiltroVendas, campo: 'createdAt' | 'canceledAt'): Prisma.SaleWhereInput {
  const { inicio, fim } = resolverPeriodo(f.periodo, f.de, f.ate)
  const where: Prisma.SaleWhereInput = { companyId, [campo]: { gte: inicio, lt: fim } }
  if (f.pagamento && FORMAS_PAGAMENTO.includes(f.pagamento as PaymentMethod)) where.payment = f.pagamento as PaymentMethod
  if (f.customerId) where.customerId = f.customerId
  if (f.status === 'CONCLUIDA' || f.status === 'CANCELADA') where.status = f.status as SaleStatus
  if (f.numero) where.number = f.numero
  return where
}

/** Motivo e autor do cancelamento por venda, lidos do movimento CANCELAMENTO. */
async function dadosDeCancelamento(companyId: string, saleIds: string[]) {
  const mapa = new Map<string, { motivo: string | null; por: string | null }>()
  if (saleIds.length === 0) return mapa
  const movimentos = await prisma.stockMovement.findMany({
    where: { companyId, type: 'CANCELAMENTO', saleId: { in: saleIds } },
    select: { saleId: true, reason: true, user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  for (const m of movimentos) {
    if (m.saleId && !mapa.has(m.saleId)) mapa.set(m.saleId, { motivo: m.reason, por: m.user?.name ?? null })
  }
  return mapa
}

export type VendaLinha = {
  id: string
  numero: number
  criadaEm: Date
  canceladaEm: Date | null
  cliente: string | null
  vendedor: string | null
  pagamento: PaymentMethod
  status: SaleStatus
  paga: boolean
  subtotal: number
  desconto: number
  total: number
  /** Só DONO/GERENTE: para o operador a chave nem existe no payload. */
  custo?: number
  lucro?: number
  motivoCancelamento: string | null
  canceladaPor: string | null
  itens: { id: string; nome: string; quantidade: number; precoUnit: number; total: number; custoUnit?: number }[]
}

const LIMITE_LISTA = 200

export async function listarVendas(filtro: FiltroVendas) {
  const [usuario, companyId] = await Promise.all([getUsuario(), getCompanyId()])
  const comCusto = Boolean(usuario && podeVerCusto(usuario.role))
  const where = montarWhere(companyId, filtro, 'createdAt')
  // Os cards contam o que foi vendido; só no filtro de canceladas passam a somar as canceladas
  const whereCards: Prisma.SaleWhereInput = { ...where, status: filtro.status === 'CANCELADA' ? 'CANCELADA' : 'CONCLUIDA' }

  const [vendas, cards, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { items: true, customer: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_LISTA,
    }),
    prisma.sale.aggregate({ where: whereCards, _sum: { total: true, costTotal: true }, _count: { _all: true } }),
    prisma.sale.count({ where }),
  ])

  const canc = await dadosDeCancelamento(companyId, vendas.filter((v) => v.status === 'CANCELADA').map((v) => v.id))

  const linhas: VendaLinha[] = vendas.map((v) => ({
    id: v.id,
    numero: v.number,
    criadaEm: v.createdAt,
    canceladaEm: v.canceledAt,
    cliente: v.customer?.name ?? null,
    vendedor: v.user?.name ?? null,
    pagamento: v.payment,
    status: v.status,
    paga: v.paid,
    subtotal: Number(v.subtotal),
    desconto: Number(v.discount),
    total: Number(v.total),
    ...(comCusto ? { custo: Number(v.costTotal), lucro: Number(v.total) - Number(v.costTotal) } : {}),
    motivoCancelamento: canc.get(v.id)?.motivo ?? null,
    canceladaPor: canc.get(v.id)?.por ?? null,
    itens: v.items.map((i) => ({
      id: i.id,
      nome: i.name,
      quantidade: i.quantity,
      precoUnit: Number(i.unitPrice),
      total: Number(i.total),
      ...(comCusto ? { custoUnit: Number(i.unitCost) } : {}),
    })),
  }))

  const vendido = Number(cards._sum.total ?? 0)
  const quantidade = cards._count._all
  return {
    linhas,
    totalEncontrado: total,
    limite: LIMITE_LISTA,
    resumo: {
      vendido,
      quantidade,
      ticket: quantidade ? vendido / quantidade : 0,
      lucro: comCusto ? vendido - Number(cards._sum.costTotal ?? 0) : null,
      dasCanceladas: filtro.status === 'CANCELADA',
    },
  }
}

export async function listarClientesFiltro() {
  const companyId = await getCompanyId()
  return prisma.customer.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export type CancelamentoLinha = {
  id: string
  numero: number
  criadaEm: Date
  canceladaEm: Date | null
  vendedor: string | null
  canceladaPor: string | null
  motivo: string | null
  pagamento: PaymentMethod
  cliente: string | null
  total: number
}

export async function listarCancelamentos(filtro: FiltroVendas) {
  const companyId = await getCompanyId()
  const where: Prisma.SaleWhereInput = { ...montarWhere(companyId, filtro, 'canceledAt'), status: 'CANCELADA' }

  const [vendas, soma] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { customer: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { canceledAt: 'desc' },
      take: LIMITE_LISTA,
    }),
    prisma.sale.aggregate({ where, _sum: { total: true }, _count: { _all: true } }),
  ])
  const canc = await dadosDeCancelamento(companyId, vendas.map((v) => v.id))

  const linhas: CancelamentoLinha[] = vendas.map((v) => ({
    id: v.id,
    numero: v.number,
    criadaEm: v.createdAt,
    canceladaEm: v.canceledAt,
    vendedor: v.user?.name ?? null,
    canceladaPor: canc.get(v.id)?.por ?? null,
    motivo: canc.get(v.id)?.motivo ?? null,
    pagamento: v.payment,
    cliente: v.customer?.name ?? null,
    total: Number(v.total),
  }))

  const totalCancelado = Number(soma._sum.total ?? 0)
  return { linhas, totalCancelado, quantidade: soma._count._all, limite: LIMITE_LISTA }
}
