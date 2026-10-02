import Link from 'next/link'
import { AlertTriangle, CalendarClock, CircleDollarSign, Info, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { exigirPapel } from '@/lib/auth/dal'
import { money, number } from '@/lib/format'
import {
  diaEmSaoPaulo, listarContasAPagar, resumoContasAPagar, type FiltroStatus,
} from '@/lib/services/contas-a-pagar'
import { listarFornecedores } from '@/lib/services/produtos'
import type { Opcao } from '@/app/(app)/estoque/produtos/produto'
import { ContasTabela } from './contas-tabela'
import { paraConta } from './conta'

// Sem isso o Next gera a rota estática e congela no primeiro build
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const STATUS: FiltroStatus[] = ['abertas', 'vencidas', 'pagas', 'canceladas', 'todas']

const legendaQuantidade = (n: number, zero: string) =>
  n === 0 ? zero : `${number(n)} ${n === 1 ? 'conta' : 'contas'}`

export default async function ContasAPagarPage({ searchParams }: Props) {
  const sp = await searchParams
  await exigirPapel('DONO', 'GERENTE')

  const statusBruto = primeiro(sp.status) as FiltroStatus | undefined
  const status = statusBruto && STATUS.includes(statusBruto) ? statusBruto : 'abertas'
  const filtro = {
    status,
    fornecedor: primeiro(sp.fornecedor) || undefined,
    de: primeiro(sp.de) || undefined,
    ate: primeiro(sp.ate) || undefined,
    busca: primeiro(sp.q)?.trim() || undefined,
  }

  const [contas, resumo, fornecedores] = await Promise.all([
    listarContasAPagar(filtro),
    resumoContasAPagar(),
    listarFornecedores(),
  ])

  const hoje = diaEmSaoPaulo()
  const opcoesFornecedores: Opcao[] = fornecedores.map((f) => ({ valor: f.id, label: f.tradeName || f.legalName }))
  const linhas = contas.map((c) => paraConta(c, hoje))
  const totalLista = linhas.reduce((n, c) => n + c.amount, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Contas a pagar"
        descricao="Boletos e compras a prazo: o que vence, o que já venceu e o que foi pago."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Total em aberto"
          valor={money(resumo.aberto.total)}
          icone={Receipt}
          legenda={legendaQuantidade(resumo.aberto.quantidade, 'nenhuma conta em aberto')}
        />
        <StatCard
          titulo="Vencido"
          valor={money(resumo.vencido.total)}
          icone={AlertTriangle}
          legenda={legendaQuantidade(resumo.vencido.quantidade, 'nada vencido')}
        />
        <StatCard
          titulo="Vence em 7 dias"
          valor={money(resumo.proximos7.total)}
          icone={CalendarClock}
          legenda={resumo.proximos7.quantidade === 0 ? 'nada para esta semana' : `${legendaQuantidade(resumo.proximos7.quantidade, '')}, incluindo hoje`}
        />
        <StatCard
          titulo="Pago no mês"
          valor={money(resumo.pagoMes.total)}
          icone={CircleDollarSign}
          legenda={legendaQuantidade(resumo.pagoMes.quantidade, 'nenhum pagamento neste mês')}
        />
      </div>

      {resumo.vencido.quantidade > 0 && status !== 'vencidas' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-negativo/35 bg-negativo/10 px-4 py-3 text-[13px]">
          <AlertTriangle size={16} className="shrink-0 text-negativo" />
          <span>
            <strong className="font-semibold">{resumo.vencido.quantidade}</strong>{' '}
            {resumo.vencido.quantidade === 1 ? 'conta vencida' : 'contas vencidas'}, somando {money(resumo.vencido.total)}.{' '}
            <Link href="?status=vencidas" className="text-dourado hover:underline">Ver vencidas</Link>
          </span>
        </div>
      )}

      <ContasTabela contas={linhas} fornecedores={opcoesFornecedores} hoje={hoje} />

      <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-texto-3">
        <span className="flex items-center gap-1.5">
          <Info size={13} />
          Marcar uma conta como paga aqui não lança saída no caixa.
        </span>
        {linhas.length > 0 && (
          <span>
            {number(linhas.length)} {linhas.length === 1 ? 'conta' : 'contas'} no filtro, somando{' '}
            <span className="num text-texto-2">{money(totalLista)}</span>
          </span>
        )}
      </div>
    </div>
  )
}
