import { Hash, PieChart, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { exigirPapel } from '@/lib/auth/dal'
import { money, number, percent } from '@/lib/format'
import {
  listarCategoriasFinanceiras, listarLancamentos, resumirLancamentos, type TipoLancamento,
} from '@/lib/services/lancamentos'
import { hoje } from './datas'
import { LancamentosTabela } from './lancamentos-tabela'
import { resolverPeriodo } from './periodo'
import { TEXTOS } from './textos'

export type ParametrosBusca = Promise<Record<string, string | string[] | undefined>>

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Corpo comum de /financeiro/despesas e /financeiro/receitas; só o tipo muda. */
export async function TelaLancamentos({ tipo, searchParams }: { tipo: TipoLancamento; searchParams: ParametrosBusca }) {
  const sp = await searchParams
  await exigirPapel('DONO', 'GERENTE')

  const periodo = resolverPeriodo(primeiro(sp.periodo), primeiro(sp.de), primeiro(sp.ate))
  const busca = primeiro(sp.q)?.trim() ?? ''
  const categoria = primeiro(sp.categoria) ?? ''

  const [lancamentos, categorias] = await Promise.all([
    listarLancamentos(tipo, { de: periodo.de, ate: periodo.ate, categoria: categoria || undefined, busca: busca || undefined }),
    listarCategoriasFinanceiras(tipo),
  ])
  const resumo = resumirLancamentos(lancamentos)
  const textos = TEXTOS[tipo]

  return (
    <div className="space-y-5">
      <PageHeader titulo={textos.titulo} descricao={textos.descricao} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard titulo="Total do período" valor={money(resumo.total)} icone={Wallet} legenda={periodo.rotulo} />
        <StatCard titulo="Lançamentos" valor={number(resumo.quantidade)} icone={Hash} legenda={periodo.rotulo} />
        <StatCard
          titulo="Maior categoria"
          valor={resumo.maiorCategoria?.nome ?? '—'}
          icone={PieChart}
          legenda={resumo.maiorCategoria
            ? `${money(resumo.maiorCategoria.valor)} · ${percent(resumo.maiorCategoria.fatia, 0)} do total`
            : 'nada lançado no período'}
        />
      </div>

      <LancamentosTabela
        tipo={tipo}
        lancamentos={lancamentos}
        categorias={categorias}
        periodo={periodo}
        hoje={hoje()}
        total={resumo.total}
      />
    </div>
  )
}
