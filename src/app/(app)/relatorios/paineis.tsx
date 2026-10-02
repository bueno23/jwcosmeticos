import {
  ArrowDownCircle, ArrowUpCircle, Boxes, CircleDollarSign, Hash, Package, PackageX, Percent, PiggyBank,
  Receipt, ShoppingBag, Ticket, TrendingUp, Wallet,
} from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { StatCard } from '@/components/ui/stat-card'
import { cn } from '@/lib/cn'
import { money, number, percent } from '@/lib/format'
import { corMargem } from '@/lib/margem'
import { diaBR } from '@/app/(app)/financeiro/_lancamentos/datas'
import type { LinhaVendida } from '@/lib/services/relatorios'
import type { Carregado } from './dados'
import type { Parametros } from './abas'
import { GraficoFluxo, GraficoPagamentos, GraficoVendasDia } from './graficos'

const COR_FORMA: Record<string, string> = {
  DINHEIRO: '#22C55E', PIX: '#F5C518', DEBITO: '#3B82F6', CREDITO: '#A855F7', FIADO: '#F59E3B',
}

const VAZIO = <EmptyState titulo="Nenhum dado no período" descricao="Não há registros para os filtros escolhidos." />

const Num = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('num', className)}>{children}</span>
)
const Lucro = ({ v }: { v: number }) => <Num className={cn('font-semibold', v < 0 ? 'text-negativo' : 'text-positivo')}>{money(v)}</Num>
const Margem = ({ v }: { v: number }) => <Num className={cn('font-semibold', corMargem(v))}>{percent(v, 1)}</Num>

const curto = (dia: string) => diaBR(dia).slice(0, 5)
const dir = 'direita' as const

function Stats({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

function Nome({ nome, categoria }: { nome: string; categoria?: string }) {
  return (
    <div>
      <div className="font-medium">{nome}</div>
      {categoria && <div className="text-[12px] text-texto-3">{categoria}</div>}
    </div>
  )
}

function colunasVendidas(visao: 'produto' | 'categoria'): Coluna<LinhaVendida>[] {
  return [
    { chave: 'nome', titulo: visao === 'categoria' ? 'Categoria' : 'Produto', render: (l) => <Nome nome={l.nome} categoria={visao === 'produto' ? l.categoria : undefined} /> },
    { chave: 'qtd', titulo: 'Quantidade', alinhamento: dir, render: (l) => <Num>{number(l.quantidade)}</Num> },
    { chave: 'receita', titulo: 'Receita', alinhamento: dir, render: (l) => <Num>{money(l.receita)}</Num> },
    { chave: 'custo', titulo: 'Custo', alinhamento: dir, render: (l) => <Num className="text-texto-2">{money(l.custo)}</Num> },
    { chave: 'lucro', titulo: 'Lucro', alinhamento: dir, render: (l) => <Lucro v={l.lucro} /> },
    { chave: 'margem', titulo: 'Margem', alinhamento: dir, render: (l) => <Margem v={l.margem} /> },
  ]
}

export function Painel({ r, p }: { r: Carregado; p: Parametros }) {
  const rotulo = p.periodo.rotulo

  switch (r.aba) {
    case 'vendas': {
      const d = r.dados
      return (
        <>
          <Stats>
            <StatCard titulo="Faturamento" valor={money(d.total)} icone={CircleDollarSign} legenda={rotulo} />
            <StatCard titulo="Nº de vendas" valor={number(d.vendas)} icone={ShoppingBag} legenda={rotulo} />
            <StatCard titulo="Ticket médio" valor={money(d.ticket)} icone={Ticket} legenda="faturamento ÷ vendas" />
            <StatCard titulo="Lucro bruto" valor={money(d.total - d.custo)} icone={TrendingUp} legenda="vendas − custo da mercadoria" />
          </Stats>
          <Card>
            <CardHeader titulo="Faturamento por dia" icone={TrendingUp} />
            {d.vendas === 0 ? VAZIO : <GraficoVendasDia dados={d.dias.map((x) => ({ rotulo: curto(x.dia), total: x.total }))} />}
          </Card>
          <Card>
            <CardHeader titulo="Vendas por dia" icone={Receipt} />
            {d.vendas === 0 ? VAZIO : (
              <DataTable
                linhas={[...d.dias].reverse().map((x) => ({ ...x, id: x.dia }))}
                vazio={VAZIO}
                colunas={[
                  { chave: 'dia', titulo: 'Data', render: (x) => <Num className="text-texto-2">{diaBR(x.dia)}</Num> },
                  { chave: 'v', titulo: 'Vendas', alinhamento: dir, render: (x) => <Num>{number(x.vendas)}</Num> },
                  { chave: 't', titulo: 'Faturamento', alinhamento: dir, render: (x) => <Num>{money(x.total)}</Num> },
                  { chave: 'tk', titulo: 'Ticket médio', alinhamento: dir, render: (x) => <Num className="text-texto-2">{money(x.vendas ? x.total / x.vendas : 0)}</Num> },
                  { chave: 'l', titulo: 'Lucro bruto', alinhamento: dir, render: (x) => <Lucro v={x.total - x.custo} /> },
                ]}
              />
            )}
          </Card>
        </>
      )
    }

    case 'mais-vendidos': {
      const d = r.dados
      return (
        <>
          <Stats>
            <StatCard titulo="Unidades vendidas" valor={number(d.quantidade)} icone={Package} legenda={rotulo} />
            <StatCard titulo="Faturamento" valor={money(d.receita)} icone={CircleDollarSign} legenda={rotulo} />
            <StatCard titulo="Lucro" valor={money(d.lucro)} icone={TrendingUp} legenda="custo congelado na venda" />
            <StatCard titulo="Produtos vendidos" valor={number(d.linhas.length)} icone={Hash} legenda={rotulo} />
          </Stats>
          <Card>
            <CardHeader titulo={`Ranking por ${p.ordem === 'quantidade' ? 'quantidade' : 'faturamento'}`} icone={TrendingUp} />
            <DataTable
              linhas={d.linhas}
              vazio={VAZIO}
              colunas={[
                { chave: 'pos', titulo: '#', render: (l) => <Num className="text-texto-3">{d.linhas.indexOf(l) + 1}</Num> },
                ...colunasVendidas('produto'),
              ]}
            />
          </Card>
        </>
      )
    }

    case 'lucro': {
      const d = r.dados
      return (
        <>
          <Stats>
            <StatCard titulo="Receita" valor={money(d.receita)} icone={CircleDollarSign} legenda={rotulo} />
            <StatCard titulo="Custo" valor={money(d.custo)} icone={Wallet} legenda="custo congelado na venda" />
            <StatCard titulo="Lucro" valor={money(d.lucro)} icone={TrendingUp} legenda={rotulo} />
            <StatCard titulo="Margem" valor={percent(d.margem, 1)} icone={Percent} legenda="lucro ÷ receita" />
          </Stats>
          <Card>
            <CardHeader titulo={`Lucro por ${p.visao}`} icone={TrendingUp} />
            <DataTable linhas={d.linhas} vazio={VAZIO} colunas={colunasVendidas(p.visao)} />
          </Card>
        </>
      )
    }

    case 'parados': {
      const d = r.dados
      return (
        <>
          <Stats>
            <StatCard titulo="Produtos parados" valor={number(d.linhas.length)} icone={PackageX} legenda={`sem venda em ${rotulo}`} />
            <StatCard titulo="Valor parado" valor={money(d.valorParado)} icone={PiggyBank} legenda="estoque × custo" />
          </Stats>
          <Card>
            <CardHeader titulo="Ativos com estoque e sem venda" icone={PackageX} />
            <DataTable
              linhas={d.linhas}
              vazio={<EmptyState titulo="Nenhum produto parado" descricao="Todo produto com estoque vendeu ao menos uma vez no período." />}
              colunas={[
                { chave: 'nome', titulo: 'Produto', render: (l) => <Nome nome={l.nome} categoria={l.categoria} /> },
                { chave: 'est', titulo: 'Estoque', alinhamento: dir, render: (l) => <Num>{number(l.estoque)}</Num> },
                { chave: 'custo', titulo: 'Custo unit.', alinhamento: dir, render: (l) => <Num className="text-texto-2">{money(l.custo)}</Num> },
                { chave: 'valor', titulo: 'Valor parado', alinhamento: dir, render: (l) => <Num className="font-semibold">{money(l.valorParado)}</Num> },
                { chave: 'ult', titulo: 'Última venda', alinhamento: dir, render: (l) => <Num className="text-texto-2">{l.ultimaVenda ? diaBR(l.ultimaVenda) : 'nunca vendeu'}</Num> },
              ]}
            />
          </Card>
        </>
      )
    }

    case 'estoque': {
      const d = r.dados
      return (
        <>
          <Stats>
            <StatCard titulo="Produtos" valor={number(d.linhas.length)} icone={Boxes} legenda="ativos" />
            <StatCard titulo="Unidades em estoque" valor={number(d.unidades)} icone={Package} legenda="soma dos saldos" />
            <StatCard titulo="Valor de custo" valor={money(d.valorCusto)} icone={Wallet} legenda="saldo × custo médio" />
            <StatCard titulo="Valor de venda" valor={money(d.valorVenda)} icone={CircleDollarSign} legenda="saldo × preço de venda" />
          </Stats>
          <Card>
            <CardHeader titulo="Estoque atual" icone={Boxes} />
            <DataTable
              linhas={d.linhas}
              vazio={VAZIO}
              colunas={[
                { chave: 'nome', titulo: 'Produto', render: (l) => <Nome nome={l.nome} categoria={l.categoria} /> },
                { chave: 'est', titulo: 'Saldo', alinhamento: dir, render: (l) => <Num className={cn(l.estoque <= l.minimo && 'font-semibold text-negativo')}>{number(l.estoque)}</Num> },
                { chave: 'custo', titulo: 'Custo unit.', alinhamento: dir, render: (l) => <Num className="text-texto-2">{money(l.custo)}</Num> },
                { chave: 'preco', titulo: 'Preço', alinhamento: dir, render: (l) => <Num className="text-texto-2">{money(l.preco)}</Num> },
                { chave: 'vc', titulo: 'Valor de custo', alinhamento: dir, render: (l) => <Num>{money(l.valorCusto)}</Num> },
                { chave: 'vv', titulo: 'Valor de venda', alinhamento: dir, render: (l) => <Num>{money(l.valorVenda)}</Num> },
              ]}
            />
          </Card>
        </>
      )
    }

    case 'estoque-baixo': {
      const d = r.dados
      return (
        <>
          <Stats>
            <StatCard titulo="Produtos no limite" valor={number(d.linhas.length)} icone={PackageX} legenda="saldo no mínimo ou abaixo" />
            <StatCard titulo="Unidades a repor" valor={number(d.falta)} icone={Package} legenda="até atingir o mínimo" />
            <StatCard titulo="Custo da reposição" valor={money(d.custoReposicao)} icone={Wallet} legenda="unidades × custo atual" />
          </Stats>
          <Card>
            <CardHeader titulo="Abaixo do mínimo" icone={PackageX} />
            <DataTable
              linhas={d.linhas}
              vazio={<EmptyState titulo="Nenhum produto abaixo do mínimo" descricao="Todo o estoque está acima do limite definido." />}
              colunas={[
                { chave: 'nome', titulo: 'Produto', render: (l) => <Nome nome={l.nome} categoria={l.categoria} /> },
                { chave: 'est', titulo: 'Saldo', alinhamento: dir, render: (l) => <Num className="font-semibold text-negativo">{number(l.estoque)}</Num> },
                { chave: 'min', titulo: 'Mínimo', alinhamento: dir, render: (l) => <Num className="text-texto-2">{number(l.minimo)}</Num> },
                { chave: 'falta', titulo: 'Falta repor', alinhamento: dir, render: (l) => <Num className="font-semibold">{number(l.falta)}</Num> },
                { chave: 'custo', titulo: 'Custo da reposição', alinhamento: dir, render: (l) => <Num>{money(l.custoReposicao)}</Num> },
              ]}
            />
          </Card>
        </>
      )
    }

    case 'despesas': {
      const d = r.dados
      return (
        <>
          <Stats>
            <StatCard titulo="Total de despesas" valor={money(d.total)} icone={Wallet} legenda={rotulo} />
            <StatCard titulo="Lançamentos" valor={number(d.lancamentos)} icone={Hash} legenda={rotulo} />
            <StatCard titulo="Maior categoria" valor={d.linhas[0]?.categoria ?? '—'} icone={Receipt} legenda={d.linhas[0] ? money(d.linhas[0].total) : 'nada lançado no período'} />
          </Stats>
          <Card>
            <CardHeader titulo="Despesas por categoria" icone={Receipt} />
            <DataTable
              linhas={d.linhas}
              vazio={VAZIO}
              colunas={[
                { chave: 'cat', titulo: 'Categoria', render: (l) => <span className="font-medium">{l.categoria}</span> },
                { chave: 'n', titulo: 'Lançamentos', alinhamento: dir, render: (l) => <Num>{number(l.lancamentos)}</Num> },
                { chave: 't', titulo: 'Total', alinhamento: dir, render: (l) => <Num className="font-semibold">{money(l.total)}</Num> },
                { chave: 'p', titulo: '% do total', alinhamento: dir, render: (l) => <Num className="text-texto-2">{percent(l.percentual, 1)}</Num> },
              ]}
            />
          </Card>
        </>
      )
    }

    case 'fluxo': {
      const d = r.dados
      const vazio = d.entradas === 0 && d.saidas === 0
      return (
        <>
          <Stats>
            <StatCard titulo="Entradas" valor={money(d.entradas)} icone={ArrowUpCircle} legenda="vendas recebidas + receitas" />
            <StatCard titulo="Saídas" valor={money(d.saidas)} icone={ArrowDownCircle} legenda="despesas + contas pagas" />
            <StatCard titulo="Saldo do período" valor={money(d.saldo)} icone={Wallet} legenda={rotulo} />
          </Stats>
          <Card>
            <CardHeader titulo="Entradas × saídas por dia" icone={TrendingUp} />
            {vazio ? VAZIO : <GraficoFluxo dados={d.dias.map((x) => ({ rotulo: curto(x.dia), entradas: x.entradas, saidas: x.saidas, acumulado: x.acumulado }))} />}
          </Card>
          <Card>
            <CardHeader titulo="Movimento diário" icone={Receipt} />
            {vazio ? VAZIO : (
              <DataTable
                linhas={[...d.dias].reverse().map((x) => ({ ...x, id: x.dia }))}
                vazio={VAZIO}
                colunas={[
                  { chave: 'dia', titulo: 'Data', render: (x) => <Num className="text-texto-2">{diaBR(x.dia)}</Num> },
                  { chave: 'e', titulo: 'Entradas', alinhamento: dir, render: (x) => <Num className="text-positivo">{money(x.entradas)}</Num> },
                  { chave: 's', titulo: 'Saídas', alinhamento: dir, render: (x) => <Num className="text-negativo">{money(x.saidas)}</Num> },
                  { chave: 'sd', titulo: 'Saldo do dia', alinhamento: dir, render: (x) => <Lucro v={x.saldo} /> },
                  { chave: 'ac', titulo: 'Acumulado', alinhamento: dir, render: (x) => <Num className="font-semibold">{money(x.acumulado)}</Num> },
                ]}
              />
            )}
          </Card>
        </>
      )
    }

    case 'pagamentos': {
      const d = r.dados
      const maior = [...d.linhas].sort((a, b) => b.total - a.total)[0]
      return (
        <>
          <Stats>
            <StatCard titulo="Faturamento" valor={money(d.total)} icone={CircleDollarSign} legenda={rotulo} />
            <StatCard titulo="Nº de vendas" valor={number(d.vendas)} icone={ShoppingBag} legenda={rotulo} />
            <StatCard titulo="Forma mais usada" valor={d.total > 0 ? maior.rotulo : '—'} icone={Wallet} legenda={d.total > 0 ? `${percent(maior.percentual, 1)} do faturamento` : 'sem vendas no período'} />
          </Stats>
          <Card>
            <CardHeader titulo="Vendas por forma de pagamento" icone={Wallet} />
            {d.total === 0 ? VAZIO : (
              <>
                <GraficoPagamentos
                  total={d.total}
                  fatias={d.linhas.map((l) => ({ nome: l.rotulo, cor: COR_FORMA[l.forma], total: l.total, percentual: l.percentual }))}
                />
                <DataTable
                  linhas={d.linhas.map((l) => ({ ...l, id: l.forma }))}
                  vazio={VAZIO}
                  colunas={[
                    { chave: 'f', titulo: 'Forma', render: (l) => <span className="font-medium">{l.rotulo}</span> },
                    { chave: 'v', titulo: 'Vendas', alinhamento: dir, render: (l) => <Num>{number(l.vendas)}</Num> },
                    { chave: 't', titulo: 'Total', alinhamento: dir, render: (l) => <Num className="font-semibold">{money(l.total)}</Num> },
                    { chave: 'p', titulo: '% do total', alinhamento: dir, render: (l) => <Num className="text-texto-2">{percent(l.percentual, 1)}</Num> },
                  ]}
                />
              </>
            )}
          </Card>
        </>
      )
    }
  }
}
