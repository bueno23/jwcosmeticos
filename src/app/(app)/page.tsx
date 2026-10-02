import Image from 'next/image'
import Link from 'next/link'
import {
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, BarChart3, Boxes, Coins, FileText,
  PackagePlus, Receipt, ShoppingBag, ShoppingCart, TrendingUp, Wallet,
} from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { StockBadge } from '@/components/ui/stock-badge'
import { CategoriasChart } from '@/components/dashboard/categorias-chart'
import { LucroSparkline } from '@/components/dashboard/lucro-sparkline'
import { VendasChart } from '@/components/dashboard/vendas-chart'
import { dataLonga, diaCurto, diaSemana, hora, money, number, percent, saudacao } from '@/lib/format'
import {
  getEstoqueBaixo, getMovimentacoesRecentes, getResumoDoDia, getResumoFinanceiro,
  getVendasPorCategoria, getVendasUltimos7Dias, type Movimentacao,
} from '@/lib/services/dashboard'
import { getEmpresa } from '@/lib/services/empresa'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeGerenciarEstoque, podeVerFinanceiro, podeVerRelatorios } from '@/lib/auth/papeis'
import type { Role } from '@/generated/prisma'

export const dynamic = 'force-dynamic'

const ACOES: { label: string; href: string; icone: React.ElementType; destaque?: boolean; requer?: (role: Role) => boolean }[] = [
  { label: 'Nova venda', href: '/vendas/nova', icone: ShoppingCart, destaque: true },
  { label: 'Entrada de produtos', href: '/estoque/entradas', icone: PackagePlus, requer: podeGerenciarEstoque },
  { label: 'Lançar despesa', href: '/financeiro/despesas', icone: Receipt, requer: podeVerFinanceiro },
  { label: 'Ver estoque', href: '/estoque/produtos', icone: Boxes },
  { label: 'Gerar relatório', href: '/relatorios', icone: FileText, requer: podeVerRelatorios },
]

const ICONE_MOVIMENTO: Record<Movimentacao['tipo'], { icone: React.ElementType; cor: string }> = {
  VENDA: { icone: ShoppingCart, cor: 'text-positivo bg-positivo/12' },
  ENTRADA: { icone: ArrowUpCircle, cor: 'text-dourado bg-dourado/12' },
  SAIDA: { icone: ArrowDownCircle, cor: 'text-negativo bg-negativo/12' },
  DESPESA: { icone: Coins, cor: 'text-laranja bg-laranja/12' },
}

export default async function DashboardPage() {
  const agora = new Date()
  const { role } = await usuarioObrigatorio()
  const verFinanceiro = podeVerFinanceiro(role)
  const [empresa, resumo, semana, categorias, estoque, financeiro, movimentos] = await Promise.all([
    getEmpresa(),
    getResumoDoDia(),
    getVendasUltimos7Dias(),
    getVendasPorCategoria(),
    getEstoqueBaixo(),
    verFinanceiro ? getResumoFinanceiro() : null,
    getMovimentacoesRecentes(6, verFinanceiro),
  ])
  const acoes = ACOES.filter((a) => !a.requer || a.requer(role))

  const serieSemana = semana.map((d) => {
    const { dia, semana: sem } = diaCurto(d.data)
    return { rotulo: `${dia}\n${sem}`, dia, total: d.total, hoje: d.hoje }
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">{saudacao(agora)}! 👋</h1>
          <p className="mt-1 text-sm text-texto-2">Aqui está o resumo da sua loja hoje.</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right text-[13px] leading-tight">
            <div className="font-medium">{dataLonga(agora)}</div>
            <div className="text-texto-3">
              <span className="capitalize">{diaSemana(agora)}</span> · {hora(agora)}
            </div>
          </div>
          <div className="hidden items-center gap-3 border-l border-borda pl-5 sm:flex">
            <Image src="/brand/logo.png" alt="" width={44} height={44} className="rounded-full" />
            <p className="max-w-[150px] text-[13px] italic leading-snug text-dourado">{empresa.tagline}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Vendas do dia" valor={money(resumo.faturamento)} icone={ShoppingBag} variacao={resumo.variacaoFaturamento} />
        <StatCard titulo="Itens vendidos" valor={number(resumo.itens)} icone={Boxes} variacao={resumo.variacaoItens} />
        <StatCard titulo="Ticket médio" valor={money(resumo.ticket)} icone={TrendingUp} variacao={resumo.variacaoTicket} />
        <StatCard
          titulo="Saldo em caixa"
          valor={money(resumo.saldoCaixa)}
          icone={Wallet}
          legenda={resumo.caixaAberto ? 'caixa aberto agora' : 'nenhum caixa aberto'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader titulo="Vendas dos últimos 7 dias" icone={BarChart3} />
          <VendasChart dados={serieSemana} />
        </Card>

        <Card>
          <CardHeader titulo="Vendas por categoria" />
          {categorias.fatias.length === 0 ? (
            <EmptyState titulo="Nenhuma venda hoje" descricao="Quando a primeira venda do dia sair, a divisão por categoria aparece aqui." />
          ) : (
            <CategoriasChart fatias={categorias.fatias} total={categorias.total} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            titulo={`Produtos em estoque baixo${estoque.total ? ` (${estoque.total})` : ''}`}
            icone={AlertTriangle}
            acao={{ label: 'Ver todos', href: '/estoque/produtos' }}
          />
          {estoque.produtos.length === 0 ? (
            <EmptyState titulo="Estoque em dia" descricao="Nenhum produto está abaixo do mínimo configurado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-borda text-left text-[12px] text-texto-3">
                    <th className="px-5 py-2.5 font-medium">Produto</th>
                    <th className="px-3 py-2.5 font-medium">Categoria</th>
                    <th className="px-3 py-2.5 text-right font-medium">Estoque</th>
                    <th className="px-5 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {estoque.produtos.map((p) => (
                    <tr key={p.id} className="border-b border-borda last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.cor ?? '#9CA3AF' }} />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-texto-2">{p.categoria ?? '—'}</td>
                      <td className="num px-3 py-3 text-right font-semibold">{p.stock}</td>
                      <td className="px-5 py-3 text-right"><StockBadge estoque={p.stock} minimo={p.minStock} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader titulo="Ações rápidas" />
          <div className="space-y-2 p-4">
            {acoes.map(({ label, href, icone: Icone, destaque }) => (
              <Link
                key={href}
                href={href}
                className={`card-hover flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
                  destaque
                    ? 'border-dourado/45 bg-dourado/10 text-dourado'
                    : 'border-borda bg-superficie-2 text-texto-2'
                }`}
              >
                <Icone size={17} />
                {label}
                <span className="ml-auto text-texto-3">›</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {financeiro && <Card className="xl:col-span-2">
          <CardHeader titulo="Resumo financeiro do mês" icone={BarChart3} acao={{ label: 'Ver detalhes', href: '/financeiro' }} />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <dl className="space-y-3.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-texto-2">Vendas (entradas)</dt>
                <dd className="num font-semibold text-positivo">{money(financeiro.entradas)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-texto-2">Custo das mercadorias</dt>
                <dd className="num font-semibold">− {money(financeiro.custoMercadoria)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-texto-2">Despesas (saídas)</dt>
                <dd className="num font-semibold text-negativo">− {money(financeiro.saidas)}</dd>
              </div>
              <div className="flex justify-between border-t border-borda pt-3.5">
                <dt className="font-semibold">Lucro do período</dt>
                <dd className={`num font-bold ${financeiro.lucro >= 0 ? 'text-positivo' : 'text-negativo'}`}>
                  {money(financeiro.lucro)}
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-borda bg-superficie-2 p-4">
              <div className="text-[12.5px] text-texto-2">Margem sobre as vendas</div>
              <div className={`num mt-1 text-[22px] font-bold ${financeiro.margem >= 0 ? 'text-positivo' : 'text-negativo'}`}>
                {percent(financeiro.margem)}
              </div>
              <div className="mt-3"><LucroSparkline dados={financeiro.evolucao} /></div>
              <div className="mt-1 text-[11.5px] text-texto-3">lucro dia a dia, últimos 14 dias</div>
            </div>
          </div>
        </Card>}

        <Card className={financeiro ? undefined : 'xl:col-span-3'}>
          <CardHeader
            titulo="Movimentações recentes"
            acao={podeVerRelatorios(role) ? { label: 'Ver todas', href: '/relatorios' } : undefined}
          />
          <ul className="divide-y divide-borda">
            {movimentos.map((m) => {
              const { icone: Icone, cor } = ICONE_MOVIMENTO[m.tipo]
              return (
                <li key={`${m.tipo}-${m.id}`} className="flex items-start gap-3 px-5 py-3.5">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cor}`}>
                    <Icone size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] font-medium">{m.titulo}</span>
                      <span className="num shrink-0 text-[11.5px] text-texto-3">{hora(m.quando)}</span>
                    </div>
                    <div className="truncate text-[12.5px] text-texto-3">{m.detalhe}</div>
                  </div>
                  {m.valor !== null && <span className="num shrink-0 text-[13px] font-semibold">{money(m.valor)}</span>}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}
