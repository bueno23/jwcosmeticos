import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, CalendarClock, Cake, FileText, HandCoins, Phone, Receipt, ShoppingBag, TrendingUp, UserRound,
} from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeEditarCadastros } from '@/lib/auth/papeis'
import { money, number } from '@/lib/format'
import { getCliente } from '@/lib/services/clientes'
import { AcoesCliente } from '../acoes-cliente'
import { dataCurta, dataHora, dataIso, dataNascimento, idade, mascararCpf, mascararTelefone } from '../cliente'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const PAGAMENTO: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', DEBITO: 'Débito', CREDITO: 'Crédito', FIADO: 'Fiado',
}

function Indicador({ icone: Icone, titulo, valor, legenda }: {
  icone: React.ElementType; titulo: string; valor: string; legenda: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dourado/12 text-dourado">
          <Icone size={19} />
        </span>
        <span className="text-sm text-texto-2">{titulo}</span>
      </div>
      <div className="num mt-3 text-[26px] font-bold leading-none">{valor}</div>
      <div className="mt-3 text-[12.5px] text-texto-3">{legenda}</div>
    </Card>
  )
}

function Dado({ icone: Icone, rotulo, children }: { icone: React.ElementType; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icone size={15} className="mt-0.5 shrink-0 text-texto-3" />
      <div className="min-w-0">
        <div className="text-[12px] text-texto-3">{rotulo}</div>
        <div className="mt-0.5 text-[13.5px]">{children}</div>
      </div>
    </div>
  )
}

export default async function ClientePage({ params }: Props) {
  const { id } = await params
  const [{ role }, ficha] = await Promise.all([usuarioObrigatorio(), getCliente(id)])
  if (!ficha) notFound()

  const { cliente } = ficha
  const nascimento = dataIso(cliente.birthDate)
  const anos = idade(nascimento)
  const vencido = ficha.fiado.filter((f) => f.vencido).reduce((n, f) => n + f.amount, 0)

  return (
    <div className="space-y-5">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-[13px] text-texto-2 transition-colors hover:text-dourado">
        <ArrowLeft size={14} />
        Clientes
      </Link>

      <PageHeader
        titulo={cliente.name}
        descricao={`Cliente desde ${dataCurta(cliente.createdAt)}`}
        acao={
          <AcoesCliente
            cliente={{
              id: cliente.id, name: cliente.name, phone: cliente.phone, document: cliente.document,
              birthDate: nascimento, notes: cliente.notes,
            }}
            vendasOuFiado={cliente._count.sales + cliente._count.receivables}
            podeRemover={podeEditarCadastros(role)}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador icone={ShoppingBag} titulo="Total comprado" valor={money(ficha.totalComprado)} legenda={`${number(ficha.compras)} compra(s)`} />
        <Indicador icone={TrendingUp} titulo="Ticket médio" valor={money(ficha.ticketMedio)} legenda="por compra concluída" />
        <Indicador
          icone={CalendarClock}
          titulo="Última compra"
          valor={ficha.ultimaCompra ? dataCurta(ficha.ultimaCompra) : '—'}
          legenda={ficha.ultimaCompra
            ? `há ${number(ficha.diasDesdeUltima ?? 0)} dia(s)`
            : 'ainda não comprou'}
        />
        <Indicador
          icone={HandCoins}
          titulo="Fiado em aberto"
          valor={money(ficha.fiadoAberto)}
          legenda={vencido > 0 ? `${money(vencido)} já vencido` : ficha.fiadoAberto > 0 ? 'nada vencido' : 'nada a receber'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader titulo="Fiado em aberto" icone={HandCoins} />
            {ficha.fiado.length === 0 ? (
              <EmptyState titulo="Nada em aberto" descricao="Quando este cliente comprar no fiado, a dívida aparece aqui até ser paga." />
            ) : (
              <ul className="divide-y divide-borda">
                {ficha.fiado.map((f) => {
                  const atrasado = f.vencido
                  return (
                    <li key={f.id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{f.description}</div>
                        <div className="text-[12px] text-texto-3">lançado em {dataCurta(f.createdAt)}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="num text-[13.5px] font-semibold">{money(f.amount)}</div>
                        <div className={`num text-[11.5px] ${atrasado ? 'font-semibold text-negativo' : 'text-texto-3'}`}>
                          {atrasado ? 'venceu' : 'vence'} em {dataCurta(f.dueDate)}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader titulo="Últimas vendas" icone={Receipt} />
            {ficha.ultimasVendas.length === 0 ? (
              <EmptyState titulo="Nenhuma venda" descricao="As vendas feitas no PDV com este cliente aparecem aqui." />
            ) : (
              <ul className="divide-y divide-borda">
                {ficha.ultimasVendas.map((v) => {
                  const cancelada = v.status === 'CANCELADA'
                  return (
                    <li key={v.id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2.5">
                          <span className="num text-[13.5px] font-medium">Venda #{v.number}</span>
                          <span className="text-[12px] text-texto-3">{dataHora(v.createdAt)}</span>
                          {cancelada && (
                            <span className="rounded bg-negativo/12 px-1.5 py-0.5 text-[11px] font-semibold text-negativo">cancelada</span>
                          )}
                        </div>
                        <div className="text-[12.5px] text-texto-3">
                          {PAGAMENTO[v.payment] ?? v.payment} · {number(v.itens)} item(ns)
                          {v.discount > 0 && ` · desconto de ${money(v.discount)}`}
                        </div>
                      </div>
                      <div className={`num shrink-0 text-[13.5px] font-semibold ${cancelada ? 'text-texto-3 line-through' : ''}`}>
                        {money(v.total)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader titulo="Cadastro" icone={UserRound} />
          <dl className="grid gap-4 p-5">
            <Dado icone={Phone} rotulo="Telefone">{cliente.phone ? mascararTelefone(cliente.phone) : '—'}</Dado>
            <Dado icone={FileText} rotulo="CPF">{cliente.document ? mascararCpf(cliente.document) : '—'}</Dado>
            <Dado icone={Cake} rotulo="Nascimento">
              {nascimento ? `${dataNascimento(nascimento)}${anos !== null ? ` · ${anos} anos` : ''}` : '—'}
            </Dado>
            {cliente.notes && (
              <div className="border-t border-borda pt-3.5">
                <div className="text-[12px] text-texto-3">Observações</div>
                <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-texto-2">{cliente.notes}</p>
              </div>
            )}
          </dl>
        </Card>
      </div>
    </div>
  )
}
