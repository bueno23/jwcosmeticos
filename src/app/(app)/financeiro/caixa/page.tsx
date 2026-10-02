import { ArrowDownToLine, ArrowUpFromLine, Landmark, LockOpen, Wallet } from 'lucide-react'
import { exigirPapel } from '@/lib/auth/dal'
import { Card, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { dataLonga, hora, money } from '@/lib/format'
import { getPainelCaixa, listarCaixasFechados } from '@/lib/services/caixa'
import { AberturaForm } from './abertura-form'
import { HistoricoCaixas } from './historico-caixas'
import { PainelCaixa } from './painel-caixa'
import type { CaixaFechado, MovimentoCaixa } from './tipos'

// Sem isso o Next gera a rota estática e congela no primeiro build
export const dynamic = 'force-dynamic'

function Numero({ titulo, valor, detalhe, icone: Icone, destaque }: {
  titulo: string
  valor: string
  detalhe: string
  icone: React.ElementType
  destaque?: boolean
}) {
  return (
    <div className={`card p-5 ${destaque ? 'border-dourado/40' : ''}`}>
      <div className="flex items-center gap-2.5 text-sm text-texto-2">
        <Icone size={16} className="text-dourado" />
        {titulo}
      </div>
      <div className={`num mt-3 text-[24px] font-bold leading-none tracking-tight ${destaque ? 'text-dourado' : ''}`}>{valor}</div>
      <div className="mt-2.5 text-[12px] text-texto-3">{detalhe}</div>
    </div>
  )
}

export default async function CaixaPage() {
  await exigirPapel('DONO', 'GERENTE')

  const [painel, fechados] = await Promise.all([getPainelCaixa(), listarCaixasFechados()])

  const historico: CaixaFechado[] = fechados.map((c) => ({
    id: c.id,
    openedAt: c.openedAt,
    closedAt: c.closedAt,
    abertoPor: c.user?.name ?? null,
    fechadoPor: c.movements[0]?.user?.name ?? null,
    inicial: Number(c.openingAmount),
    esperado: Number(c.expectedAmount ?? 0),
    informado: Number(c.closingAmount ?? 0),
    diferenca: Number(c.difference ?? 0),
    notes: c.notes,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Caixa"
        descricao={
          painel
            ? `Aberto desde ${dataLonga(painel.caixa.openedAt)} às ${hora(painel.caixa.openedAt)}${painel.abertoPor ? ` por ${painel.abertoPor}` : ''}.`
            : 'Nenhum caixa aberto. Abra o caixa para registrar sangrias, suprimentos e as vendas em dinheiro.'
        }
      />

      {painel ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Numero titulo="Saldo inicial" valor={money(painel.resumo.inicial)} detalhe="troco na abertura" icone={Wallet} />
            <Numero
              titulo="Entradas"
              valor={money(painel.resumo.entradas)}
              detalhe={`${money(painel.resumo.vendasDinheiro)} em vendas · ${money(painel.resumo.suprimentos)} em suprimentos`}
              icone={ArrowDownToLine}
            />
            <Numero
              titulo="Saídas"
              valor={money(painel.resumo.saidas)}
              detalhe={`${money(painel.resumo.sangrias)} em sangrias · ${money(painel.resumo.despesas)} em despesas`}
              icone={ArrowUpFromLine}
            />
            <Numero titulo="Saldo esperado" valor={money(painel.resumo.esperado)} detalhe="o que deve haver na gaveta" icone={Landmark} destaque />
          </div>

          <PainelCaixa
            resumo={painel.resumo}
            movimentos={painel.movimentos.map((m): MovimentoCaixa => ({
              id: m.id,
              type: m.type,
              amount: Number(m.amount),
              description: m.description,
              usuario: m.user?.name ?? null,
              createdAt: m.createdAt,
            }))}
          />
        </>
      ) : (
        <Card>
          <CardHeader titulo="Abrir caixa" icone={LockOpen} />
          <div className="p-5">
            <AberturaForm ultimoInformado={historico[0]?.informado ?? null} />
          </div>
        </Card>
      )}

      <HistoricoCaixas caixas={historico} />
    </div>
  )
}
