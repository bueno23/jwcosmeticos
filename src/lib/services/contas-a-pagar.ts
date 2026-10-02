import { prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId } from '@/lib/auth/dal'
import { Prisma, type PayableStatus } from '@/generated/prisma'

const FINANCEIRO = ['DONO', 'GERENTE'] as const
const FUSO = 'America/Sao_Paulo'
const DIA_MS = 86400000

/** Dia do calendário em São Paulo ("AAAA-MM-DD"), seja qual for o fuso do servidor. */
export function diaEmSaoPaulo(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function ehDia(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const [a, m, d] = texto.split('-').map(Number)
  const data = new Date(Date.UTC(a!, m! - 1, d!))
  return data.getUTCFullYear() === a && data.getUTCMonth() === m! - 1 && data.getUTCDate() === d
}

// Meio-dia UTC cai no mesmo dia do calendário em São Paulo e em UTC, então a data gravada é a digitada
export function diaParaData(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a!, m! - 1, d!, 12))
}

/** Meia-noite de São Paulo daquele dia (UTC-3, sem horário de verão desde 2019). */
function inicioDoDiaSP(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a!, m! - 1, d!, 3))
}

export function somarDias(dia: string, dias: number): string {
  return new Date(diaParaData(dia).getTime() + dias * DIA_MS).toISOString().slice(0, 10)
}

/** Regra de conta a pagar violada: a action mostra a mensagem em vez de estourar. */
export class ErroDeConta extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeConta'
  }
}

const EM_ABERTO: PayableStatus[] = ['ABERTA', 'VENCIDA']

export type FiltroStatus = 'abertas' | 'vencidas' | 'pagas' | 'canceladas' | 'todas'

export type FiltroContas = {
  status?: FiltroStatus
  /** Id do fornecedor, ou "nenhum" para as contas sem fornecedor. */
  fornecedor?: string
  de?: string
  ate?: string
  busca?: string
}

export async function listarContasAPagar(filtro: FiltroContas = {}) {
  await exigirPapelNoServico(...FINANCEIRO)
  const companyId = await getCompanyId()
  const hoje = inicioDoDiaSP(diaEmSaoPaulo())
  const status = filtro.status ?? 'abertas'

  const where: Prisma.AccountPayableWhereInput = { companyId }
  if (status === 'abertas' || status === 'vencidas') where.status = { in: EM_ABERTO }
  if (status === 'pagas') where.status = 'PAGA'
  if (status === 'canceladas') where.status = 'CANCELADA'

  if (filtro.fornecedor === 'nenhum') where.supplierId = null
  else if (filtro.fornecedor) where.supplierId = filtro.fornecedor

  if (filtro.busca) where.description = { contains: filtro.busca, mode: 'insensitive' }

  const vencimento: Prisma.DateTimeFilter = {}
  if (filtro.de && ehDia(filtro.de)) vencimento.gte = inicioDoDiaSP(filtro.de)
  if (filtro.ate && ehDia(filtro.ate)) vencimento.lt = inicioDoDiaSP(somarDias(filtro.ate, 1))
  if (status === 'vencidas' && (!vencimento.lt || (vencimento.lt as Date) > hoje)) vencimento.lt = hoje
  if (vencimento.gte || vencimento.lt) where.dueDate = vencimento

  return prisma.accountPayable.findMany({
    where,
    select: {
      id: true, description: true, amount: true, dueDate: true, paidAt: true, status: true, createdAt: true,
      supplier: { select: { id: true, legalName: true, tradeName: true } },
    },
    orderBy: status === 'pagas' ? [{ paidAt: 'desc' }, { dueDate: 'desc' }] : [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    take: 500,
  })
}

/** Os cards olham a empresa inteira, sem os filtros da lista. */
export async function resumoContasAPagar() {
  await exigirPapelNoServico(...FINANCEIRO)
  const companyId = await getCompanyId()
  const diaHoje = diaEmSaoPaulo()
  const hoje = inicioDoDiaSP(diaHoje)
  const daquiA7 = inicioDoDiaSP(somarDias(diaHoje, 8))
  const inicioMes = inicioDoDiaSP(`${diaHoje.slice(0, 8)}01`)

  const soma = (where: Prisma.AccountPayableWhereInput) =>
    prisma.accountPayable.aggregate({ _sum: { amount: true }, _count: true, where: { companyId, ...where } })

  const [aberto, vencido, proximos, pagoMes] = await Promise.all([
    soma({ status: { in: EM_ABERTO } }),
    soma({ status: { in: EM_ABERTO }, dueDate: { lt: hoje } }),
    soma({ status: { in: EM_ABERTO }, dueDate: { gte: hoje, lt: daquiA7 } }),
    soma({ status: 'PAGA', paidAt: { gte: inicioMes, lt: inicioDoDiaSP(somarDias(diaHoje, 1)) } }),
  ])

  const valor = (r: typeof aberto) => ({ total: Number(r._sum.amount ?? 0), quantidade: r._count })
  return { aberto: valor(aberto), vencido: valor(vencido), proximos7: valor(proximos), pagoMes: valor(pagoMes) }
}

export type DadosConta = {
  description: string
  amount: number
  vencimento: string
  supplierId: string | null
}

async function validarFornecedor(companyId: string, supplierId: string | null) {
  if (!supplierId) return
  const existe = await prisma.supplier.count({ where: { id: supplierId, companyId } })
  if (!existe) throw new ErroDeConta('Fornecedor não encontrado.')
}

async function contaDaEmpresa(id: string) {
  const companyId = await getCompanyId()
  const conta = await prisma.accountPayable.findFirst({ where: { id, companyId }, select: { id: true, status: true } })
  if (!conta) throw new ErroDeConta('Conta não encontrada.')
  return { companyId, conta }
}

export async function criarContaAPagar(dados: DadosConta) {
  await exigirPapelNoServico(...FINANCEIRO)
  const companyId = await getCompanyId()
  if (!(dados.amount > 0)) throw new ErroDeConta('O valor precisa ser maior que zero.')
  if (!ehDia(dados.vencimento)) throw new ErroDeConta('Vencimento inválido.')
  await validarFornecedor(companyId, dados.supplierId)

  return prisma.accountPayable.create({
    data: {
      companyId,
      description: dados.description.trim(),
      amount: new Prisma.Decimal(dados.amount.toFixed(2)),
      dueDate: diaParaData(dados.vencimento),
      supplierId: dados.supplierId,
      status: 'ABERTA',
    },
  })
}

export async function atualizarContaAPagar(id: string, dados: DadosConta) {
  await exigirPapelNoServico(...FINANCEIRO)
  const { companyId, conta } = await contaDaEmpresa(id)
  if (!EM_ABERTO.includes(conta.status)) throw new ErroDeConta('Conta paga ou cancelada não se edita. Reabra antes.')
  if (!(dados.amount > 0)) throw new ErroDeConta('O valor precisa ser maior que zero.')
  if (!ehDia(dados.vencimento)) throw new ErroDeConta('Vencimento inválido.')
  await validarFornecedor(companyId, dados.supplierId)

  return prisma.accountPayable.update({
    where: { id },
    data: {
      description: dados.description.trim(),
      amount: new Prisma.Decimal(dados.amount.toFixed(2)),
      dueDate: diaParaData(dados.vencimento),
      supplierId: dados.supplierId,
      // VENCIDA gravado vira ABERTA: a situação é recalculada pelo vencimento na leitura
      status: 'ABERTA',
    },
  })
}

export async function pagarContaAPagar(id: string, dataPagamento: string) {
  await exigirPapelNoServico(...FINANCEIRO)
  const { conta } = await contaDaEmpresa(id)
  if (!EM_ABERTO.includes(conta.status)) throw new ErroDeConta('Só conta em aberto pode ser paga.')
  if (!ehDia(dataPagamento)) throw new ErroDeConta('Data de pagamento inválida.')
  if (dataPagamento > diaEmSaoPaulo()) throw new ErroDeConta('A data de pagamento não pode ser no futuro.')

  return prisma.accountPayable.update({
    where: { id },
    data: { status: 'PAGA', paidAt: diaParaData(dataPagamento) },
  })
}

/** Desfaz pagamento ou cancelamento; a conta volta a ser aberta. */
export async function reabrirContaAPagar(id: string) {
  await exigirPapelNoServico(...FINANCEIRO)
  const { conta } = await contaDaEmpresa(id)
  if (EM_ABERTO.includes(conta.status)) throw new ErroDeConta('A conta já está em aberto.')

  return prisma.accountPayable.update({ where: { id }, data: { status: 'ABERTA', paidAt: null } })
}

export async function cancelarContaAPagar(id: string) {
  await exigirPapelNoServico(...FINANCEIRO)
  const { conta } = await contaDaEmpresa(id)
  if (!EM_ABERTO.includes(conta.status)) throw new ErroDeConta('Só conta em aberto pode ser cancelada.')

  return prisma.accountPayable.update({ where: { id }, data: { status: 'CANCELADA', paidAt: null } })
}
