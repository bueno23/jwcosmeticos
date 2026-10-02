import { Receipt, ShoppingBag, TrendingUp, Ticket, Ban } from 'lucide-react'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeVerCusto } from '@/lib/auth/papeis'
import { money, number } from '@/lib/format'
import { FiltroSelect } from '@/components/ui/filtro-select'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { StatCard } from '@/components/ui/stat-card'
import { listarClientesFiltro, listarVendas, type Periodo } from '@/lib/services/vendas'
import { FiltroPeriodo } from './filtro-periodo'
import { VendasTabela } from './vendas-tabela'
import { OPCOES_PAGAMENTO } from './venda'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const PERIODOS: Periodo[] = ['hoje', '7d', 'mes', 'livre']

export default async function VendasPage({ searchParams }: Props) {
  const sp = await searchParams
  const usuario = await usuarioObrigatorio()

  const periodoBruto = primeiro(sp.periodo) as Periodo
  const periodo = PERIODOS.includes(periodoBruto) ? periodoBruto : 'hoje'
  const q = primeiro(sp.q)?.trim() ?? ''
  const numero = /^\d{1,9}$/.test(q.replace('#', '')) ? Number(q.replace('#', '')) : null

  const [dados, clientes] = await Promise.all([
    listarVendas({
      periodo,
      de: primeiro(sp.de),
      ate: primeiro(sp.ate),
      pagamento: primeiro(sp.pagamento),
      customerId: primeiro(sp.cliente),
      status: primeiro(sp.status),
      numero,
    }),
    listarClientesFiltro(),
  ])

  const { resumo } = dados
  const verCusto = podeVerCusto(usuario.role)
  const podeCancelar = usuario.role === 'DONO' || usuario.role === 'GERENTE'

  return (
    <div className="space-y-5">
      <PageHeader titulo="Vendas realizadas" descricao="Consulte, filtre e, se for o caso, cancele vendas." />

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${verCusto ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        <StatCard
          titulo={resumo.dasCanceladas ? 'Total cancelado' : 'Total vendido'}
          valor={money(resumo.vendido)}
          icone={resumo.dasCanceladas ? Ban : ShoppingBag}
          legenda="no período filtrado"
        />
        <StatCard titulo="Nº de vendas" valor={number(resumo.quantidade)} icone={Receipt} legenda="no período filtrado" />
        <StatCard titulo="Ticket médio" valor={money(resumo.ticket)} icone={Ticket} legenda="por venda" />
        {verCusto && resumo.lucro != null && (
          <StatCard titulo="Lucro" valor={money(resumo.lucro)} icone={TrendingUp} legenda="preço menos custo congelado" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <FiltroPeriodo />
        <FiltroSelect param="pagamento" todos="Todos os pagamentos" opcoes={OPCOES_PAGAMENTO.map((o) => ({ valor: o.valor, label: o.label }))} />
        <FiltroSelect param="cliente" todos="Todos os clientes" opcoes={clientes.map((c) => ({ valor: c.id, label: c.name }))} />
        <FiltroSelect
          param="status"
          todos="Todos os status"
          opcoes={[{ valor: 'CONCLUIDA', label: 'Concluídas' }, { valor: 'CANCELADA', label: 'Canceladas' }]}
        />
        <div className="sm:ml-auto"><SearchInput placeholder="Nº da venda..." /></div>
      </div>

      <VendasTabela vendas={dados.linhas} podeCancelar={podeCancelar} verCusto={verCusto} />

      {dados.totalEncontrado > dados.limite && (
        <p className="text-[12.5px] text-texto-3">
          Mostrando as {dados.limite} vendas mais recentes de {number(dados.totalEncontrado)}. Restrinja o período para ver as outras.
        </p>
      )}
    </div>
  )
}
