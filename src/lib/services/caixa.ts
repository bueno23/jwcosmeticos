import { prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId } from '@/lib/auth/dal'
import { Prisma, type CashMovementType } from '@/generated/prisma'

type Cliente = Prisma.TransactionClient | typeof prisma

const PAPEIS_CAIXA = ['DONO', 'GERENTE'] as const

const centavos = (n: number) => Math.round(n * 100) / 100
const decimal = (n: number) => new Prisma.Decimal(centavos(n).toFixed(2))

/** Tipos que tiram dinheiro da gaveta: o valor é gravado negativo. */
const SAIDAS: CashMovementType[] = ['SANGRIA', 'DESPESA']

/**
 * Serializa as escritas de caixa da empresa até o fim da transação. Sem
 * índice único no schema, é o que impede dois caixas abertos ao mesmo tempo.
 */
async function travarCaixa(tx: Prisma.TransactionClient, companyId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`caixa:${companyId}`}))`
}

/** Caixa aberto da empresa logada, ou null. Aceita o client da transação do PDV. */
export async function getCaixaAberto(cliente: Cliente = prisma) {
  const companyId = await getCompanyId()
  return cliente.cashRegister.findFirst({
    where: { companyId, status: 'ABERTO' },
    orderBy: { openedAt: 'desc' },
  })
}

export type ResumoCaixa = {
  inicial: number
  vendasDinheiro: number
  suprimentos: number
  sangrias: number
  despesas: number
  entradas: number
  saidas: number
  esperado: number
}

type CaixaBase = { id: string; companyId: string; openingAmount: Prisma.Decimal; openedAt: Date; closedAt: Date | null }

/**
 * Mesma conta de getSaldoCaixa da dashboard: vendas em dinheiro vêm da tabela
 * Sale (cancelamento sai sozinho), então movimento VENDA não entra na soma.
 */
export async function calcularResumo(caixa: CaixaBase, cliente: Cliente = prisma): Promise<ResumoCaixa> {
  const [vendas, porTipo] = await Promise.all([
    cliente.sale.aggregate({
      _sum: { total: true },
      where: {
        companyId: caixa.companyId,
        status: 'CONCLUIDA',
        payment: 'DINHEIRO',
        createdAt: { gte: caixa.openedAt, ...(caixa.closedAt ? { lte: caixa.closedAt } : {}) },
      },
    }),
    cliente.cashMovement.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: { registerId: caixa.id, type: { in: ['SUPRIMENTO', 'SANGRIA', 'DESPESA'] } },
    }),
  ])

  const soma = (tipo: CashMovementType) =>
    Math.abs(Number(porTipo.find((g) => g.type === tipo)?._sum.amount ?? 0))

  const inicial = Number(caixa.openingAmount)
  const vendasDinheiro = Number(vendas._sum.total ?? 0)
  const suprimentos = soma('SUPRIMENTO')
  const sangrias = soma('SANGRIA')
  const despesas = soma('DESPESA')
  const entradas = centavos(vendasDinheiro + suprimentos)
  const saidas = centavos(sangrias + despesas)

  return {
    inicial, vendasDinheiro, suprimentos, sangrias, despesas, entradas, saidas,
    esperado: centavos(inicial + entradas - saidas),
  }
}

/** Caixa aberto com resumo e movimentos, para a tela. */
export async function getPainelCaixa() {
  const caixa = await getCaixaAberto()
  if (!caixa) return null

  const [resumo, movimentos, abertoPor] = await Promise.all([
    calcularResumo(caixa),
    prisma.cashMovement.findMany({
      where: { registerId: caixa.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    caixa.userId ? prisma.user.findUnique({ where: { id: caixa.userId }, select: { name: true } }) : null,
  ])

  return { caixa, resumo, movimentos, abertoPor: abertoPor?.name ?? null }
}

export async function listarCaixasFechados(limite = 30) {
  const companyId = await getCompanyId()
  return prisma.cashRegister.findMany({
    where: { companyId, status: 'FECHADO' },
    include: {
      user: { select: { name: true } },
      movements: { where: { type: 'FECHAMENTO' }, select: { user: { select: { name: true } } }, take: 1 },
    },
    orderBy: { closedAt: 'desc' },
    take: limite,
  })
}

export type DadosMovimentoCaixa = {
  tipo: CashMovementType
  /** Sempre positivo; o sinal sai do tipo. */
  valor: number
  descricao: string | null
  userId: string
}

/**
 * Grava um movimento no caixa aberto dentro da transação de quem chama. É o
 * ponto de entrada do PDV: devolve null quando não há caixa aberto.
 */
export async function registrarMovimentoDeCaixa(tx: Prisma.TransactionClient, dados: DadosMovimentoCaixa) {
  if (!(dados.valor > 0)) throw new Error('O valor precisa ser maior que zero.')
  const companyId = await getCompanyId()
  await travarCaixa(tx, companyId)

  const caixa = await getCaixaAberto(tx)
  if (!caixa) return null

  const valor = SAIDAS.includes(dados.tipo) ? -dados.valor : dados.valor
  return tx.cashMovement.create({
    data: {
      registerId: caixa.id,
      userId: dados.userId,
      type: dados.tipo,
      amount: decimal(valor),
      description: dados.descricao,
    },
  })
}

export async function abrirCaixa(valorInicial: number, observacao: string | null) {
  const usuario = await exigirPapelNoServico(...PAPEIS_CAIXA)
  if (!Number.isFinite(valorInicial) || valorInicial < 0) throw new Error('Valor inicial inválido.')

  return prisma.$transaction(async (tx) => {
    await travarCaixa(tx, usuario.companyId)
    if (await getCaixaAberto(tx)) throw new Error('Já existe um caixa aberto. Feche-o antes de abrir outro.')

    const caixa = await tx.cashRegister.create({
      data: {
        companyId: usuario.companyId,
        userId: usuario.id,
        openingAmount: decimal(valorInicial),
        notes: observacao,
      },
    })
    await tx.cashMovement.create({
      data: {
        registerId: caixa.id,
        userId: usuario.id,
        type: 'ABERTURA',
        amount: decimal(valorInicial),
        description: observacao || 'Abertura do caixa',
      },
    })
    return caixa
  })
}

/** Sangria e suprimento: motivo obrigatório, e sangria não tira mais do que há na gaveta. */
export async function movimentarCaixa(tipo: 'SANGRIA' | 'SUPRIMENTO', valor: number, motivo: string) {
  const usuario = await exigirPapelNoServico(...PAPEIS_CAIXA)
  const texto = motivo.trim()
  if (!texto) throw new Error('Informe o motivo.')
  if (!(valor > 0)) throw new Error('O valor precisa ser maior que zero.')

  return prisma.$transaction(async (tx) => {
    await travarCaixa(tx, usuario.companyId)
    const caixa = await getCaixaAberto(tx)
    if (!caixa) throw new Error('Não há caixa aberto.')

    const antes = await calcularResumo(caixa, tx)
    if (tipo === 'SANGRIA' && centavos(valor) > antes.esperado) {
      throw new Error(`A sangria passa do saldo esperado no caixa (R$ ${antes.esperado.toFixed(2).replace('.', ',')}).`)
    }

    await tx.cashMovement.create({
      data: {
        registerId: caixa.id,
        userId: usuario.id,
        type: tipo,
        amount: decimal(tipo === 'SANGRIA' ? -valor : valor),
        description: texto,
      },
    })

    return { esperado: centavos(antes.esperado + (tipo === 'SANGRIA' ? -valor : valor)) }
  })
}

export type ResultadoFechamento = { esperado: number; contado: number; diferenca: number }

/** Fecha o caixa aberto. Com diferença (sobra ou falta), o motivo é obrigatório e vai para notes. */
export async function fecharCaixa(contado: number, motivo: string | null): Promise<ResultadoFechamento> {
  const usuario = await exigirPapelNoServico(...PAPEIS_CAIXA)
  if (!Number.isFinite(contado) || contado < 0) throw new Error('Valor contado inválido.')
  const texto = motivo?.trim() || null

  return prisma.$transaction(async (tx) => {
    await travarCaixa(tx, usuario.companyId)
    const caixa = await getCaixaAberto(tx)
    if (!caixa) throw new Error('Não há caixa aberto.')

    const fechadoEm = new Date()
    const { esperado } = await calcularResumo({ ...caixa, closedAt: fechadoEm }, tx)
    const diferenca = centavos(contado - esperado)
    if (diferenca !== 0 && !texto) throw new Error('Há diferença no caixa: informe o motivo.')

    const notas = [caixa.notes, texto].filter(Boolean).join(' | ') || null
    const { count } = await tx.cashRegister.updateMany({
      where: { id: caixa.id, status: 'ABERTO' },
      data: {
        status: 'FECHADO',
        closedAt: fechadoEm,
        closingAmount: decimal(contado),
        expectedAmount: decimal(esperado),
        difference: decimal(diferenca),
        notes: notas,
      },
    })
    if (count !== 1) throw new Error('Este caixa já foi fechado.')

    // Informativo: o valor contado, fora da conta do saldo
    await tx.cashMovement.create({
      data: {
        registerId: caixa.id,
        userId: usuario.id,
        type: 'FECHAMENTO',
        amount: decimal(contado),
        description: texto ?? 'Fechamento sem diferença',
      },
    })

    return { esperado, contado: centavos(contado), diferenca }
  })
}
