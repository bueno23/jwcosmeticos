import { prisma } from '@/lib/prisma'
import { exigirPapelNoServico, getCompanyId } from '@/lib/auth/dal'
import { Prisma } from '@/generated/prisma'
import {
  diaDe, ehDiaValido, hoje, inicioDoDia, instanteDoDia, somarDias,
} from '@/app/(app)/financeiro/_lancamentos/datas'

/** Despesa e receita avulsas: nenhuma das duas passa pelo caixa, que tem sangria e suprimento próprios. */
export type TipoLancamento = 'despesa' | 'receita'

export type Lancamento = {
  id: string
  descricao: string
  valor: number
  dia: string
  categoria: { id: string; nome: string } | null
}

export type CategoriaFinanceira = { id: string; nome: string; lancamentos: number }

export type FiltroLancamentos = {
  de: string
  ate: string
  categoria?: string
  busca?: string
}

export type DadosLancamento = {
  descricao: string
  valor: number
  dia: string
  categoriaId: string | null
}

/** Erro que o usuário corrige no formulário; a action devolve como mensagem no campo. */
export class ErroDeLancamento extends Error {
  constructor(public campo: string, mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeLancamento'
  }
}

const VALOR_MAXIMO = 9_999_999_999.99

const selecaoCategoria = { select: { id: true, name: true } } as const

function paraLancamento(r: {
  id: string
  description: string
  amount: Prisma.Decimal
  category: { id: string; name: string } | null
}, quando: Date): Lancamento {
  return {
    id: r.id,
    descricao: r.description,
    valor: Number(r.amount),
    dia: diaDe(quando),
    categoria: r.category ? { id: r.category.id, nome: r.category.name } : null,
  }
}

export async function listarLancamentos(tipo: TipoLancamento, filtro: FiltroLancamentos): Promise<Lancamento[]> {
  const companyId = await getCompanyId()
  const intervalo = { gte: inicioDoDia(filtro.de), lt: inicioDoDia(somarDias(filtro.ate, 1)) }
  const comum = {
    companyId,
    ...(filtro.categoria === 'sem' ? { categoryId: null } : filtro.categoria ? { categoryId: filtro.categoria } : {}),
    ...(filtro.busca ? { description: { contains: filtro.busca, mode: 'insensitive' as const } } : {}),
  }

  if (tipo === 'despesa') {
    const linhas = await prisma.expense.findMany({
      where: { ...comum, spentAt: intervalo },
      include: { category: selecaoCategoria },
      orderBy: [{ spentAt: 'desc' }, { createdAt: 'desc' }],
    })
    return linhas.map((l) => paraLancamento(l, l.spentAt))
  }

  const linhas = await prisma.revenue.findMany({
    where: { ...comum, receivedAt: intervalo },
    include: { category: selecaoCategoria },
    orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
  })
  return linhas.map((l) => paraLancamento(l, l.receivedAt))
}

/** Total, contagem e a categoria que mais pesou, sobre a mesma lista que a tabela mostra. */
export function resumirLancamentos(lancamentos: Lancamento[]) {
  const porCategoria = new Map<string, number>()
  let total = 0
  for (const l of lancamentos) {
    total += l.valor
    const nome = l.categoria?.nome ?? 'Sem categoria'
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + l.valor)
  }
  const [maior] = [...porCategoria.entries()].sort((a, b) => b[1] - a[1])
  return {
    total: Math.round(total * 100) / 100,
    quantidade: lancamentos.length,
    maiorCategoria: maior ? { nome: maior[0], valor: maior[1], fatia: total > 0 ? (maior[1] / total) * 100 : 0 } : null,
  }
}

export async function listarCategoriasFinanceiras(tipo: TipoLancamento): Promise<CategoriaFinanceira[]> {
  const companyId = await getCompanyId()
  const categorias = await prisma.financeCategory.findMany({
    where: { companyId, kind: tipo },
    include: { _count: { select: { expenses: true, revenues: true } } },
    orderBy: { name: 'asc' },
  })
  return categorias.map((c) => ({
    id: c.id,
    nome: c.name,
    lancamentos: tipo === 'despesa' ? c._count.expenses : c._count.revenues,
  }))
}

/**
 * As regras moram aqui, não na action: valor positivo, data que já aconteceu e
 * categoria da própria empresa e do mesmo tipo (o id vem do navegador).
 */
async function validar(tipo: TipoLancamento, companyId: string, dados: DadosLancamento) {
  if (!(dados.valor > 0)) throw new ErroDeLancamento('valor', 'O valor precisa ser maior que zero.')
  if (dados.valor > VALOR_MAXIMO) throw new ErroDeLancamento('valor', 'Valor alto demais.')
  if (!ehDiaValido(dados.dia)) throw new ErroDeLancamento('dia', 'Data inválida.')
  // Compromisso futuro é conta a pagar/receber; aqui só entra o que já saiu ou já entrou
  if (dados.dia > hoje()) {
    throw new ErroDeLancamento('dia', tipo === 'despesa'
      ? 'Despesa futura é conta a pagar. Lance aqui só o que já foi pago.'
      : 'Receita futura é conta a receber. Lance aqui só o que já entrou.')
  }
  if (dados.categoriaId) {
    const existe = await prisma.financeCategory.count({ where: { id: dados.categoriaId, companyId, kind: tipo } })
    if (!existe) throw new ErroDeLancamento('categoriaId', 'Categoria não encontrada.')
  }
}

export async function criarLancamento(tipo: TipoLancamento, dados: DadosLancamento) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  await validar(tipo, companyId, dados)

  const base = {
    companyId,
    categoryId: dados.categoriaId,
    description: dados.descricao,
    amount: new Prisma.Decimal(dados.valor.toFixed(2)),
  }
  const quando = instanteDoDia(dados.dia)
  const criado = tipo === 'despesa'
    ? await prisma.expense.create({ data: { ...base, spentAt: quando } })
    : await prisma.revenue.create({ data: { ...base, receivedAt: quando } })
  return { id: criado.id }
}

export async function atualizarLancamento(tipo: TipoLancamento, id: string, dados: DadosLancamento) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  await validar(tipo, companyId, dados)

  const base = {
    categoryId: dados.categoriaId,
    description: dados.descricao,
    amount: new Prisma.Decimal(dados.valor.toFixed(2)),
  }
  const quando = instanteDoDia(dados.dia)
  const { count } = tipo === 'despesa'
    ? await prisma.expense.updateMany({ where: { id, companyId }, data: { ...base, spentAt: quando } })
    : await prisma.revenue.updateMany({ where: { id, companyId }, data: { ...base, receivedAt: quando } })
  if (!count) throw new ErroDeLancamento('', 'Lançamento não encontrado. Talvez já tenha sido excluído.')
}

export async function excluirLancamento(tipo: TipoLancamento, id: string) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const { count } = tipo === 'despesa'
    ? await prisma.expense.deleteMany({ where: { id, companyId } })
    : await prisma.revenue.deleteMany({ where: { id, companyId } })
  if (!count) throw new ErroDeLancamento('', 'Lançamento não encontrado. Talvez já tenha sido excluído.')
}

export async function salvarCategoriaFinanceira(tipo: TipoLancamento, id: string | null, nome: string) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  if (id) {
    const { count } = await prisma.financeCategory.updateMany({ where: { id, companyId, kind: tipo }, data: { name: nome } })
    if (!count) throw new ErroDeLancamento('nome', 'Categoria não encontrada.')
    return { id, nome }
  }
  const criada = await prisma.financeCategory.create({ data: { companyId, name: nome, kind: tipo } })
  return { id: criada.id, nome: criada.name }
}

/** Remove de verdade: os lançamentos ficam sem categoria (SetNull) e o valor não muda. */
export async function removerCategoriaFinanceira(tipo: TipoLancamento, id: string) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const onde = { companyId, categoryId: id }
  const [semCategoria, { count }] = await prisma.$transaction([
    tipo === 'despesa' ? prisma.expense.count({ where: onde }) : prisma.revenue.count({ where: onde }),
    prisma.financeCategory.deleteMany({ where: { id, companyId, kind: tipo } }),
  ])
  if (!count) throw new ErroDeLancamento('', 'Categoria não encontrada.')
  return { semCategoria }
}
