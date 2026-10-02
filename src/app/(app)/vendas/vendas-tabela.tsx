'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2 } from 'lucide-react'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { hora, money } from '@/lib/format'
import type { VendaLinha } from '@/lib/services/vendas'
import { cancelarVendaAction } from './actions'
import { ROTULO_PAGAMENTO } from './venda'

const dia = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })

function Status({ status }: { status: VendaLinha['status'] }) {
  return (
    <span className={cn(
      'inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium',
      status === 'CONCLUIDA' ? 'bg-positivo/12 text-positivo' : 'bg-negativo/12 text-negativo',
    )}>
      {status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
    </span>
  )
}

export function VendasTabela({
  vendas, podeCancelar, verCusto,
}: {
  vendas: VendaLinha[]
  podeCancelar: boolean
  verCusto: boolean
}) {
  const [aberta, setAberta] = useState<VendaLinha | null>(null)

  const colunas: Coluna<VendaLinha>[] = [
    {
      chave: 'numero', titulo: 'Nº',
      render: (v) => (
        <button type="button" onClick={() => setAberta(v)} className="num font-semibold text-dourado hover:underline">
          #{v.numero}
        </button>
      ),
    },
    { chave: 'data', titulo: 'Data e hora', className: 'num whitespace-nowrap', render: (v) => `${dia(v.criadaEm)} ${hora(v.criadaEm)}` },
    { chave: 'cliente', titulo: 'Cliente', render: (v) => v.cliente ?? <span className="text-texto-3">Balcão</span> },
    { chave: 'pagamento', titulo: 'Pagamento', render: (v) => ROTULO_PAGAMENTO[v.pagamento] },
    { chave: 'total', titulo: 'Total', alinhamento: 'direita', className: 'num font-medium', render: (v) => money(v.total) },
    { chave: 'status', titulo: 'Status', render: (v) => <Status status={v.status} /> },
  ]

  return (
    <>
      <div className="card">
        <DataTable
          colunas={colunas}
          linhas={vendas}
          vazio={<EmptyState titulo="Nenhuma venda encontrada" descricao="Ajuste o período ou os filtros para ver outras vendas." />}
        />
      </div>
      {aberta && <DetalheVenda venda={aberta} podeCancelar={podeCancelar} verCusto={verCusto} onFechar={() => setAberta(null)} />}
    </>
  )
}

function DetalheVenda({
  venda, podeCancelar, verCusto, onFechar,
}: {
  venda: VendaLinha
  podeCancelar: boolean
  verCusto: boolean
  onFechar: () => void
}) {
  const router = useRouter()
  const aviso = useToast()
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function cancelar() {
    if (!motivo.trim() || enviando) return
    setEnviando(true)
    setErro(null)
    const r = await cancelarVendaAction(venda.id, motivo)
    setEnviando(false)
    if (!r.ok) {
      setErro(r.mensagem)
      return
    }
    aviso(r.mensagem)
    router.refresh()
    onFechar()
  }

  const linha = (rotulo: string, valor: React.ReactNode, forte = false) => (
    <div className={cn('flex items-center justify-between gap-3 text-[13.5px]', forte ? 'text-base font-bold' : 'text-texto-2')}>
      <span>{rotulo}</span>
      <span className={cn('num', forte ? 'text-dourado' : 'text-texto')}>{valor}</span>
    </div>
  )

  return (
    <Modal
      titulo={`Venda #${venda.numero}`}
      descricao={`${dia(venda.criadaEm)} às ${hora(venda.criadaEm)}`}
      onFechar={onFechar}
      largura="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <div><span className="text-texto-3">Vendido por</span><p className="font-medium">{venda.vendedor ?? '—'}</p></div>
          <div><span className="text-texto-3">Cliente</span><p className="font-medium">{venda.cliente ?? 'Balcão'}</p></div>
          <div><span className="text-texto-3">Pagamento</span><p className="font-medium">{ROTULO_PAGAMENTO[venda.pagamento]}{venda.pagamento === 'FIADO' && !venda.paga ? ' (em aberto)' : ''}</p></div>
          <div><span className="text-texto-3">Status</span><p className="pt-0.5"><Status status={venda.status} /></p></div>
        </div>

        {venda.status === 'CANCELADA' && (
          <div className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
            Cancelada{venda.canceladaEm ? ` em ${dia(venda.canceladaEm)} às ${hora(venda.canceladaEm)}` : ''}
            {venda.canceladaPor ? ` por ${venda.canceladaPor}` : ''}.
            <span className="mt-0.5 block text-texto-2">Motivo: {venda.motivoCancelamento ?? 'não registrado'}</span>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-borda">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-borda text-[12px] text-texto-3">
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Qtd</th>
                <th className="px-3 py-2 text-right font-medium">Preço</th>
                {verCusto && <th className="px-3 py-2 text-right font-medium">Custo</th>}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {venda.itens.map((i) => (
                <tr key={i.id} className="border-b border-borda last:border-0">
                  <td className="px-3 py-2">{i.nome}</td>
                  <td className="num px-3 py-2 text-right">{i.quantidade}</td>
                  <td className="num px-3 py-2 text-right">{money(i.precoUnit)}</td>
                  {verCusto && <td className="num px-3 py-2 text-right text-texto-2">{money(i.custoUnit ?? 0)}</td>}
                  <td className="num px-3 py-2 text-right font-medium">{money(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5">
          {linha('Subtotal', money(venda.subtotal))}
          {venda.desconto > 0 && linha('Desconto', `- ${money(venda.desconto)}`)}
          {linha('Total', money(venda.total), true)}
          {verCusto && venda.custo !== undefined && venda.lucro !== undefined && (
            <>
              {linha('Custo', money(venda.custo))}
              {linha('Lucro', money(venda.lucro))}
            </>
          )}
        </div>

        {podeCancelar && venda.status === 'CONCLUIDA' && (
          <div className="border-t border-borda pt-4">
            {!cancelando ? (
              <Botao type="button" variante="perigo" onClick={() => setCancelando(true)}>
                <Ban size={15} /> Cancelar venda
              </Botao>
            ) : (
              <div className="space-y-3">
                <Campo label="Motivo do cancelamento" hint="Obrigatório. O estoque volta e, se foi em dinheiro no caixa aberto, o caixa é estornado.">
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={2}
                    maxLength={300}
                    autoFocus
                    className={inputClass}
                    placeholder="Ex.: cliente desistiu, item lançado errado"
                  />
                </Campo>
                {erro && (
                  <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3 py-2 text-[13px] text-negativo">{erro}</p>
                )}
                <div className="flex justify-end gap-2.5">
                  <Botao type="button" variante="secundario" onClick={() => { setCancelando(false); setErro(null) }} disabled={enviando}>Voltar</Botao>
                  <Botao type="button" variante="perigo" onClick={cancelar} disabled={!motivo.trim() || enviando}>
                    {enviando && <Loader2 size={15} className="animate-spin" />}
                    Confirmar cancelamento
                  </Botao>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
