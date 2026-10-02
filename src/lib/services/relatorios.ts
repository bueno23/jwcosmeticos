import { Prisma, type PaymentMethod } from '@/generated/prisma'
import { exigirPapelNoServico, getCompanyId } from '@/lib/auth/dal'
import { margem } from '@/lib/margem'
import { prisma, tabela } from '@/lib/prisma'
import { inicioDoDia, somarDias } from '@/app/(app)/financeiro/_lancamentos/datas'
import { FORMAS_PAGAMENTO, ROTULO_PAGAMENTO } from '@/app/(app)/relatorios/formas'

export type FiltroRelatorio = {
  /** Dias civis "AAAA-MM-DD" no fuso da loja, inclusive nas duas pontas. */
  de: string
  ate: string
  categoriaId?: string
  produtoId?: string
  pagamento?: PaymentMethod
}

export type VisaoLucro = 'produto' | 'categoria'
export type OrdemRanking = 'quantidade' | 'faturamento'

// O resultado vai como texto + valores: o client em cache (dev) pode vir de outra camada do bundle, e aí não reconhece o Sql daqui
const consultar = <T>(q: Prisma.Sql) => prisma.$queryRawUnsafe<T>(q.text, ...q.values)

// Números voltam do SQL já em float8/int: Decimal não atravessa para Client Component
const DIA_SP = (coluna: Prisma.Sql) =>
  Prisma.sql`to_char((${coluna} at time zone 'UTC') at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`

async function contexto(f: FiltroRelatorio) {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  return {
    companyId,
    inicio: inicioDoDia(f.de),
    // Limite exclusivo: o dia final entra inteiro
    fim: inicioDoDia(somarDias(f.ate, 1)),
  }
}

const eSe = (cond: boolean, sql: Prisma.Sql) => (cond ? sql : Prisma.empty)

/** Dias do intervalo, para o gráfico não pular dia sem movimento. */
function diasDoIntervalo(de: string, ate: string): string[] {
  const dias: string[] = []
  for (let d = de; d <= ate && dias.length < 1000; d = somarDias(d, 1)) dias.push(d)
  return dias
}

/* ---------- Vendas por período ---------- */

export type VendaDia = { dia: string; vendas: number; total: number; custo: number }
export type RelVendas = { total: number; vendas: number; ticket: number; custo: number; dias: VendaDia[] }

export async function relatorioVendas(f: FiltroRelatorio): Promise<RelVendas> {
  const { companyId, inicio, fim } = await contexto(f)
  const linhas = await consultar<VendaDia[]>(Prisma.sql`
    select ${DIA_SP(Prisma.sql`s."createdAt"`)} as dia,
           count(*)::int as vendas,
           coalesce(sum(s.total), 0)::float8 as total,
           coalesce(sum(s."costTotal"), 0)::float8 as custo
    from ${tabela('Sale')} s
    where s."companyId" = ${companyId} and s.status = 'CONCLUIDA'
      and s."createdAt" >= ${inicio} and s."createdAt" < ${fim}
      ${eSe(!!f.pagamento, Prisma.sql`and s.payment::text = ${f.pagamento}`)}
    group by 1
  `)
  const porDia = new Map(linhas.map((l) => [l.dia, l]))
  const dias = diasDoIntervalo(f.de, f.ate).map((dia) => porDia.get(dia) ?? { dia, vendas: 0, total: 0, custo: 0 })
  const total = dias.reduce((n, d) => n + d.total, 0)
  const vendas = dias.reduce((n, d) => n + d.vendas, 0)
  const custo = dias.reduce((n, d) => n + d.custo, 0)
  return { total, vendas, ticket: vendas ? total / vendas : 0, custo, dias }
}

/* ---------- Mais vendidos e lucro (mesma base: itens vendidos) ---------- */

export type LinhaVendida = {
  id: string
  nome: string
  categoria: string
  quantidade: number
  receita: number
  custo: number
  lucro: number
  margem: number
}

type BrutoVendido = Omit<LinhaVendida, 'lucro' | 'margem'>

const comLucro = (l: BrutoVendido): LinhaVendida => ({
  ...l,
  lucro: l.receita - l.custo,
  margem: margem(l.custo, l.receita),
})

/**
 * Receita do item = total do item rateado pelo desconto da venda, para somar o mesmo
 * que Sale.total. O custo é o congelado em SaleItem.unitCost, nunca o atual do produto.
 */
async function itensVendidos(f: FiltroRelatorio, agrupar: VisaoLucro): Promise<BrutoVendido[]> {
  const { companyId, inicio, fim } = await contexto(f)
  const chave =
    agrupar === 'categoria'
      ? Prisma.sql`coalesce(p."categoryId", 'sem-categoria')`
      : Prisma.sql`coalesce(si."productId", 'nome:' || si.name)`
  const nome =
    agrupar === 'categoria' ? Prisma.sql`coalesce(c.name, 'Sem categoria')` : Prisma.sql`coalesce(min(p.name), min(si.name))`
  const categoria = agrupar === 'categoria' ? Prisma.sql`coalesce(c.name, 'Sem categoria')` : Prisma.sql`coalesce(min(c.name), 'Sem categoria')`

  return consultar<BrutoVendido[]>(Prisma.sql`
    select ${chave} as id,
           ${nome} as nome,
           ${categoria} as categoria,
           sum(si.quantity)::int as quantidade,
           coalesce(sum(si.total * s.total / nullif(s.subtotal, 0)), 0)::float8 as receita,
           coalesce(sum(si.quantity * si."unitCost"), 0)::float8 as custo
    from ${tabela('SaleItem')} si
    join ${tabela('Sale')} s on s.id = si."saleId"
    left join ${tabela('Product')} p on p.id = si."productId"
    left join ${tabela('Category')} c on c.id = p."categoryId"
    where s."companyId" = ${companyId} and s.status = 'CONCLUIDA'
      and s."createdAt" >= ${inicio} and s."createdAt" < ${fim}
      ${eSe(!!f.pagamento, Prisma.sql`and s.payment::text = ${f.pagamento}`)}
      ${eSe(!!f.categoriaId, Prisma.sql`and p."categoryId" = ${f.categoriaId}`)}
      ${eSe(!!f.produtoId, Prisma.sql`and si."productId" = ${f.produtoId}`)}
    group by ${agrupar === 'categoria' ? Prisma.sql`coalesce(p."categoryId", 'sem-categoria'), c.name` : chave}
  `)
}

export async function relatorioMaisVendidos(f: FiltroRelatorio, ordem: OrdemRanking = 'quantidade') {
  const linhas = (await itensVendidos(f, 'produto')).map(comLucro)
  linhas.sort((a, b) => (ordem === 'quantidade' ? b.quantidade - a.quantidade || b.receita - a.receita : b.receita - a.receita))
  return {
    linhas,
    quantidade: linhas.reduce((n, l) => n + l.quantidade, 0),
    receita: linhas.reduce((n, l) => n + l.receita, 0),
    lucro: linhas.reduce((n, l) => n + l.lucro, 0),
  }
}

export async function relatorioLucro(f: FiltroRelatorio, visao: VisaoLucro = 'produto') {
  const linhas = (await itensVendidos(f, visao)).map(comLucro).sort((a, b) => b.lucro - a.lucro)
  const receita = linhas.reduce((n, l) => n + l.receita, 0)
  const custo = linhas.reduce((n, l) => n + l.custo, 0)
  return { linhas, receita, custo, lucro: receita - custo, margem: margem(custo, receita) }
}

/* ---------- Produtos parados ---------- */

export type LinhaParado = {
  id: string
  nome: string
  categoria: string
  estoque: number
  custo: number
  valorParado: number
  ultimaVenda: string | null
}

export async function relatorioParados(f: FiltroRelatorio) {
  const { companyId, inicio, fim } = await contexto(f)
  const linhas = await consultar<LinhaParado[]>(Prisma.sql`
    select p.id, p.name as nome, coalesce(c.name, 'Sem categoria') as categoria,
           p.stock as estoque, p."costPrice"::float8 as custo,
           (p.stock * p."costPrice")::float8 as "valorParado",
           ${DIA_SP(Prisma.sql`(
             select max(s2."createdAt") from ${tabela('SaleItem')} si2
             join ${tabela('Sale')} s2 on s2.id = si2."saleId"
             where si2."productId" = p.id and s2.status = 'CONCLUIDA'
           )`)} as "ultimaVenda"
    from ${tabela('Product')} p
    left join ${tabela('Category')} c on c.id = p."categoryId"
    where p."companyId" = ${companyId} and p.active = true and p.stock > 0
      ${eSe(!!f.categoriaId, Prisma.sql`and p."categoryId" = ${f.categoriaId}`)}
      and not exists (
        select 1 from ${tabela('SaleItem')} si
        join ${tabela('Sale')} s on s.id = si."saleId"
        where si."productId" = p.id and s.status = 'CONCLUIDA'
          and s."createdAt" >= ${inicio} and s."createdAt" < ${fim}
      )
    order by (p.stock * p."costPrice") desc, p.name
  `)
  return { linhas, valorParado: linhas.reduce((n, l) => n + l.valorParado, 0) }
}

/* ---------- Estoque atual e baixo ---------- */

export type LinhaEstoque = {
  id: string
  nome: string
  categoria: string
  estoque: number
  minimo: number
  custo: number
  preco: number
  valorCusto: number
  valorVenda: number
}

export async function relatorioEstoque(f: FiltroRelatorio) {
  const { companyId } = await contexto(f)
  const linhas = await consultar<LinhaEstoque[]>(Prisma.sql`
    select p.id, p.name as nome, coalesce(c.name, 'Sem categoria') as categoria,
           p.stock as estoque, p."minStock" as minimo,
           p."costPrice"::float8 as custo, p."salePrice"::float8 as preco,
           (greatest(p.stock, 0) * p."costPrice")::float8 as "valorCusto",
           (greatest(p.stock, 0) * p."salePrice")::float8 as "valorVenda"
    from ${tabela('Product')} p
    left join ${tabela('Category')} c on c.id = p."categoryId"
    where p."companyId" = ${companyId} and p.active = true
      ${eSe(!!f.categoriaId, Prisma.sql`and p."categoryId" = ${f.categoriaId}`)}
    order by c.name nulls last, p.name
  `)
  return {
    linhas,
    unidades: linhas.reduce((n, l) => n + Math.max(l.estoque, 0), 0),
    valorCusto: linhas.reduce((n, l) => n + l.valorCusto, 0),
    valorVenda: linhas.reduce((n, l) => n + l.valorVenda, 0),
  }
}

export type LinhaBaixo = LinhaEstoque & { falta: number; custoReposicao: number }

/** Mesma regra do card da dashboard: saldo no mínimo ou abaixo, só produto que controla estoque. */
export async function relatorioEstoqueBaixo(f: FiltroRelatorio) {
  const { companyId } = await contexto(f)
  const linhas = await consultar<LinhaBaixo[]>(Prisma.sql`
    select p.id, p.name as nome, coalesce(c.name, 'Sem categoria') as categoria,
           p.stock as estoque, p."minStock" as minimo,
           p."costPrice"::float8 as custo, p."salePrice"::float8 as preco,
           (greatest(p.stock, 0) * p."costPrice")::float8 as "valorCusto",
           (greatest(p.stock, 0) * p."salePrice")::float8 as "valorVenda",
           greatest(p."minStock" - p.stock, 0) as falta,
           (greatest(p."minStock" - p.stock, 0) * p."costPrice")::float8 as "custoReposicao"
    from ${tabela('Product')} p
    left join ${tabela('Category')} c on c.id = p."categoryId"
    where p."companyId" = ${companyId} and p.active = true and p."trackStock" = true and p.stock <= p."minStock"
      ${eSe(!!f.categoriaId, Prisma.sql`and p."categoryId" = ${f.categoriaId}`)}
    order by (p.stock::float / nullif(p."minStock", 0)) asc nulls first, p.stock asc, p.name
  `)
  return {
    linhas,
    falta: linhas.reduce((n, l) => n + l.falta, 0),
    custoReposicao: linhas.reduce((n, l) => n + l.custoReposicao, 0),
  }
}

/* ---------- Despesas ---------- */

export type LinhaDespesa = { id: string; categoria: string; lancamentos: number; total: number; percentual: number }

export async function relatorioDespesas(f: FiltroRelatorio) {
  const { companyId, inicio, fim } = await contexto(f)
  const brutas = await consultar<Omit<LinhaDespesa, 'percentual'>[]>(Prisma.sql`
    select coalesce(e."categoryId", 'sem-categoria') as id,
           coalesce(min(fc.name), 'Sem categoria') as categoria,
           count(*)::int as lancamentos,
           coalesce(sum(e.amount), 0)::float8 as total
    from ${tabela('Expense')} e
    left join ${tabela('FinanceCategory')} fc on fc.id = e."categoryId"
    where e."companyId" = ${companyId} and e."spentAt" >= ${inicio} and e."spentAt" < ${fim}
      ${eSe(!!f.categoriaId, Prisma.sql`and e."categoryId" = ${f.categoriaId}`)}
    group by coalesce(e."categoryId", 'sem-categoria')
    order by 4 desc
  `)
  const total = brutas.reduce((n, l) => n + l.total, 0)
  return {
    total,
    lancamentos: brutas.reduce((n, l) => n + l.lancamentos, 0),
    linhas: brutas.map((l) => ({ ...l, percentual: total ? (l.total / total) * 100 : 0 })),
  }
}

export async function listarCategoriasDespesa() {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const cats = await prisma.financeCategory.findMany({
    where: { companyId, kind: 'despesa' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  return cats.map((c) => ({ valor: c.id, label: c.name }))
}

/* ---------- Fluxo de caixa ---------- */

export type FluxoDia = {
  dia: string
  vendas: number
  receitas: number
  despesas: number
  contas: number
  entradas: number
  saidas: number
  saldo: number
  acumulado: number
}

/**
 * Regime de caixa: venda entra no dia em que foi recebida (fiado só quando quitado) e
 * conta a pagar só quando paga. Despesa e receita avulsas entram na data do lançamento.
 */
export async function relatorioFluxo(f: FiltroRelatorio) {
  const { companyId, inicio, fim } = await contexto(f)
  const linhas = await consultar<{ dia: string; tipo: string; valor: number }[]>(Prisma.sql`
    select dia, tipo, sum(valor)::float8 as valor from (
      select ${DIA_SP(Prisma.sql`coalesce(s."paidAt", s."createdAt")`)} as dia, 'vendas' as tipo, s.total as valor
      from ${tabela('Sale')} s
      where s."companyId" = ${companyId} and s.status = 'CONCLUIDA' and s.paid = true
        and coalesce(s."paidAt", s."createdAt") >= ${inicio} and coalesce(s."paidAt", s."createdAt") < ${fim}
      union all
      select ${DIA_SP(Prisma.sql`a."paidAt"`)}, 'vendas', a.amount
      from ${tabela('AccountReceivable')} a
      left join ${tabela('Sale')} s on s.id = a."saleId"
      where a."companyId" = ${companyId} and a.status = 'PAGA' and a."paidAt" >= ${inicio} and a."paidAt" < ${fim}
        and (a."saleId" is null or s.paid = false)
      union all
      select ${DIA_SP(Prisma.sql`r."receivedAt"`)}, 'receitas', r.amount
      from ${tabela('Revenue')} r
      where r."companyId" = ${companyId} and r."receivedAt" >= ${inicio} and r."receivedAt" < ${fim}
      union all
      select ${DIA_SP(Prisma.sql`e."spentAt"`)}, 'despesas', e.amount
      from ${tabela('Expense')} e
      where e."companyId" = ${companyId} and e."spentAt" >= ${inicio} and e."spentAt" < ${fim}
      union all
      select ${DIA_SP(Prisma.sql`c."paidAt"`)}, 'contas', c.amount
      from ${tabela('AccountPayable')} c
      where c."companyId" = ${companyId} and c.status = 'PAGA' and c."paidAt" >= ${inicio} and c."paidAt" < ${fim}
    ) x group by dia, tipo
  `)

  const mapa = new Map<string, Record<string, number>>()
  for (const l of linhas) mapa.set(l.dia, { ...(mapa.get(l.dia) ?? {}), [l.tipo]: l.valor })

  let acumulado = 0
  const dias: FluxoDia[] = diasDoIntervalo(f.de, f.ate).map((dia) => {
    const m = mapa.get(dia) ?? {}
    const vendas = m.vendas ?? 0
    const receitas = m.receitas ?? 0
    const despesas = m.despesas ?? 0
    const contas = m.contas ?? 0
    const entradas = vendas + receitas
    const saidas = despesas + contas
    acumulado += entradas - saidas
    return { dia, vendas, receitas, despesas, contas, entradas, saidas, saldo: entradas - saidas, acumulado }
  })

  const entradas = dias.reduce((n, d) => n + d.entradas, 0)
  const saidas = dias.reduce((n, d) => n + d.saidas, 0)
  return { dias, entradas, saidas, saldo: entradas - saidas }
}

/* ---------- Vendas por forma de pagamento ---------- */

export type LinhaPagamento = { forma: PaymentMethod; rotulo: string; vendas: number; total: number; percentual: number }

export async function relatorioPagamentos(f: FiltroRelatorio) {
  const { companyId, inicio, fim } = await contexto(f)
  const brutas = await consultar<{ forma: PaymentMethod; vendas: number; total: number }[]>(Prisma.sql`
    select s.payment::text as forma, count(*)::int as vendas, coalesce(sum(s.total), 0)::float8 as total
    from ${tabela('Sale')} s
    where s."companyId" = ${companyId} and s.status = 'CONCLUIDA'
      and s."createdAt" >= ${inicio} and s."createdAt" < ${fim}
    group by s.payment
  `)
  const total = brutas.reduce((n, l) => n + l.total, 0)
  const vendas = brutas.reduce((n, l) => n + l.vendas, 0)
  const linhas: LinhaPagamento[] = FORMAS_PAGAMENTO.map((forma) => {
    const l = brutas.find((b) => b.forma === forma)
    return {
      forma,
      rotulo: ROTULO_PAGAMENTO[forma],
      vendas: l?.vendas ?? 0,
      total: l?.total ?? 0,
      percentual: total && l ? (l.total / total) * 100 : 0,
    }
  })
  return { linhas, total, vendas }
}

/* ---------- Opções de filtro ---------- */

export async function opcoesFiltros() {
  await exigirPapelNoServico('DONO', 'GERENTE')
  const companyId = await getCompanyId()
  const [categorias, produtos, categoriasDespesa] = await Promise.all([
    prisma.category.findMany({ where: { companyId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { companyId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    listarCategoriasDespesa(),
  ])
  return {
    categorias: categorias.map((c) => ({ valor: c.id, label: c.name })),
    produtos: produtos.map((p) => ({ valor: p.id, label: p.name })),
    categoriasDespesa,
  }
}
