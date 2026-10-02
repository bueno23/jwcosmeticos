import { Ban, Hash } from 'lucide-react'
import { exigirPapel } from '@/lib/auth/dal'
import { hora, money, number } from '@/lib/format'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { listarCancelamentos, type CancelamentoLinha, type Periodo } from '@/lib/services/vendas'
import { FiltroPeriodo } from '../filtro-periodo'
import { ROTULO_PAGAMENTO } from '../venda'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const PERIODOS: Periodo[] = ['hoje', '7d', 'mes', 'livre']
const quando = (d: Date | null) =>
  d ? `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })} ${hora(d)}` : '—'

const colunas: Coluna<CancelamentoLinha>[] = [
  { chave: 'numero', titulo: 'Nº', className: 'num font-semibold', render: (v) => `#${v.numero}` },
  { chave: 'vendida', titulo: 'Vendida em', className: 'num whitespace-nowrap', render: (v) => quando(v.criadaEm) },
  { chave: 'cancelada', titulo: 'Cancelada em', className: 'num whitespace-nowrap', render: (v) => quando(v.canceladaEm) },
  { chave: 'vendedor', titulo: 'Vendido por', render: (v) => v.vendedor ?? '—' },
  { chave: 'por', titulo: 'Cancelado por', render: (v) => v.canceladaPor ?? '—' },
  { chave: 'motivo', titulo: 'Motivo', className: 'max-w-[280px]', render: (v) => v.motivo ?? <span className="text-texto-3">Não registrado</span> },
  { chave: 'pagamento', titulo: 'Pagamento', render: (v) => ROTULO_PAGAMENTO[v.pagamento] },
  { chave: 'total', titulo: 'Total', alinhamento: 'direita', className: 'num font-medium', render: (v) => money(v.total) },
]

export default async function CancelamentosPage({ searchParams }: Props) {
  const sp = await searchParams
  await exigirPapel('DONO', 'GERENTE')

  const bruto = primeiro(sp.periodo) as Periodo
  const periodo = PERIODOS.includes(bruto) ? bruto : 'hoje'
  const dados = await listarCancelamentos({ periodo, de: primeiro(sp.de), ate: primeiro(sp.ate) })

  return (
    <div className="space-y-5">
      <PageHeader titulo="Cancelamentos" descricao="Vendas canceladas no período, com quem cancelou e por quê. Nenhuma venda é apagada." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard titulo="Total cancelado" valor={money(dados.totalCancelado)} icone={Ban} legenda="no período filtrado" />
        <StatCard titulo="Vendas canceladas" valor={number(dados.quantidade)} icone={Hash} legenda="no período filtrado" />
      </div>

      <FiltroPeriodo />

      <div className="card">
        <DataTable
          colunas={colunas}
          linhas={dados.linhas}
          vazio={<EmptyState titulo="Nenhum cancelamento no período" descricao="Quando uma venda for cancelada, ela aparece aqui com o motivo." />}
        />
      </div>

      {dados.quantidade > dados.limite && (
        <p className="text-[12.5px] text-texto-3">Mostrando os {dados.limite} cancelamentos mais recentes de {number(dados.quantidade)}.</p>
      )}
    </div>
  )
}
