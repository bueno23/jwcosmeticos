import { Download } from 'lucide-react'
import { FiltroSelect } from '@/components/ui/filtro-select'
import { PageHeader } from '@/components/ui/page-header'
import { exigirPapel } from '@/lib/auth/dal'
import { opcoesFiltros } from '@/lib/services/relatorios'
import { hoje } from '@/app/(app)/financeiro/_lancamentos/datas'
import { ABAS, lerParametros, type Busca } from './abas'
import { Abas, FiltroPeriodo, Segmentado } from './controles'
import { carregar } from './dados'
import { FORMAS_PAGAMENTO, ROTULO_PAGAMENTO } from './formas'
import { Painel } from './paineis'

// Sem isso o Next gera a rota estática e congela no primeiro build
export const dynamic = 'force-dynamic'

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams
  await exigirPapel('DONO', 'GERENTE')

  const p = lerParametros(sp)
  const def = ABAS.find((a) => a.id === p.aba)!
  const [resultado, opcoes] = await Promise.all([carregar(p), opcoesFiltros()])

  const exportar = new URLSearchParams({ aba: p.aba, de: p.periodo.de, ate: p.periodo.ate })
  if (p.filtro.categoriaId) exportar.set('categoria', p.filtro.categoriaId)
  if (p.filtro.produtoId) exportar.set('produto', p.filtro.produtoId)
  if (p.filtro.pagamento) exportar.set('pagamento', p.filtro.pagamento)
  if (p.aba === 'lucro') exportar.set('visao', p.visao)
  if (p.aba === 'mais-vendidos') exportar.set('ordem', p.ordem)

  const categorias = p.aba === 'despesas' ? opcoes.categoriasDespesa : opcoes.categorias
  const usa = (f: (typeof def.filtros)[number]) => def.filtros.includes(f)

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Relatórios"
        descricao="Vendas, estoque, lucro e caixa. Custo e lucro usam o custo congelado no momento da venda."
        acao={
          <a
            href={`/relatorios/exportar?${exportar.toString()}`}
            download
            className="focus-dourado inline-flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie-2 px-4 text-sm font-semibold text-texto transition-colors hover:border-borda-clara"
          >
            <Download size={16} /> Exportar CSV
          </a>
        }
      />

      <Abas atual={p.aba} />

      <div className="flex flex-wrap items-center gap-2.5">
        {usa('periodo') && <FiltroPeriodo key={`${p.periodo.de}-${p.periodo.ate}`} periodo={p.periodo} hoje={hoje()} />}
        {usa('categoria') && (
          <FiltroSelect
            param="categoria"
            todos="Todas as categorias"
            opcoes={categorias}
          />
        )}
        {usa('produto') && <FiltroSelect param="produto" todos="Todos os produtos" opcoes={opcoes.produtos} />}
        {usa('pagamento') && (
          <FiltroSelect
            param="pagamento"
            todos="Todas as formas"
            opcoes={FORMAS_PAGAMENTO.map((f) => ({ valor: f, label: ROTULO_PAGAMENTO[f] }))}
          />
        )}
        {p.aba === 'lucro' && (
          <Segmentado param="visao" valor={p.visao} opcoes={[{ valor: 'produto', label: 'Por produto' }, { valor: 'categoria', label: 'Por categoria' }]} />
        )}
        {p.aba === 'mais-vendidos' && (
          <Segmentado param="ordem" valor={p.ordem} opcoes={[{ valor: 'quantidade', label: 'Por quantidade' }, { valor: 'faturamento', label: 'Por faturamento' }]} />
        )}
      </div>

      <Painel r={resultado} p={p} />
    </div>
  )
}
