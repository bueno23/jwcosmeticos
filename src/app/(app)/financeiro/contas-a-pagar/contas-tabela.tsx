'use client'

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Ban, CheckCircle2, Loader2, Pencil, Plus, RotateCcw } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { FiltroSelect } from '@/components/ui/filtro-select'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { SearchInput } from '@/components/ui/search-input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { money } from '@/lib/format'
import type { Opcao } from '@/app/(app)/estoque/produtos/produto'
import { cancelarConta, pagarConta, reabrirConta, type EstadoFormulario } from './actions'
import { ContaForm } from './conta-form'
import { FiltroPeriodo } from './filtro-periodo'
import type { ContaLinha, Situacao } from './conta'

const STATUS = [
  { valor: 'vencidas', label: 'Vencidas' },
  { valor: 'pagas', label: 'Pagas' },
  { valor: 'canceladas', label: 'Canceladas' },
  { valor: 'todas', label: 'Todas' },
]

const dataBR = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`

const SELO: Record<Situacao, { rotulo: string; classe: string }> = {
  aberta: { rotulo: 'Em aberto', classe: 'bg-superficie-2 text-texto-2' },
  'vence-logo': { rotulo: 'Vence logo', classe: 'bg-laranja/15 text-laranja' },
  vencida: { rotulo: 'Vencida', classe: 'bg-negativo/15 text-negativo' },
  paga: { rotulo: 'Paga', classe: 'bg-positivo/15 text-positivo' },
  cancelada: { rotulo: 'Cancelada', classe: 'bg-superficie-2 text-texto-3 line-through' },
}

function prazo(c: ContaLinha): string | null {
  if (c.situacao !== 'vencida' && c.situacao !== 'vence-logo') return null
  if (c.dias === 0) return 'vence hoje'
  if (c.dias === 1) return 'vence amanhã'
  if (c.dias > 1) return `em ${c.dias} dias`
  return c.dias === -1 ? 'venceu ontem' : `há ${-c.dias} dias`
}

const emAberto = (c: ContaLinha) => c.situacao === 'aberta' || c.situacao === 'vence-logo' || c.situacao === 'vencida'

const botaoIcone = 'rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 disabled:opacity-50'

export function ContasTabela({
  contas, fornecedores, hoje,
}: {
  contas: ContaLinha[]
  fornecedores: Opcao[]
  hoje: string
}) {
  const toast = useToast()
  const [editando, setEditando] = useState<ContaLinha | null | undefined>(undefined)
  const [pagando, setPagando] = useState<ContaLinha | null>(null)
  const [cancelando, setCancelando] = useState<ContaLinha | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const fecharEdicao = useCallback(() => setEditando(undefined), [])
  const fecharPagamento = useCallback(() => setPagando(null), [])
  const fecharCancelamento = useCallback(() => setCancelando(null), [])

  function executar(c: ContaLinha, acao: (id: string) => Promise<EstadoFormulario>, depois?: () => void) {
    setOcupado(c.id)
    startTransition(async () => {
      const r = await acao(c.id)
      toast(r.mensagem ?? (r.ok ? 'Pronto.' : 'Não foi possível concluir.'), r.ok ? 'ok' : 'erro')
      setOcupado(null)
      if (r.ok) depois?.()
    })
  }

  const colunas: Coluna<ContaLinha>[] = [
    {
      chave: 'descricao',
      titulo: 'Descrição',
      render: (c) => (
        <div className="min-w-[220px]">
          <div className={cn('font-medium', c.situacao === 'cancelada' && 'text-texto-3')}>{c.description}</div>
          <div className="mt-0.5 text-[12px] text-texto-3">{c.fornecedor?.nome ?? 'Sem fornecedor'}</div>
        </div>
      ),
    },
    {
      chave: 'vencimento',
      titulo: 'Vencimento',
      render: (c) => {
        const p = prazo(c)
        return (
          <div className="whitespace-nowrap">
            <div className={cn('num', c.situacao === 'vencida' && 'font-semibold text-negativo', c.situacao === 'vence-logo' && 'font-semibold text-laranja')}>
              {dataBR(c.vencimento)}
            </div>
            {p && <div className={cn('text-[12px]', c.situacao === 'vencida' ? 'text-negativo/80' : 'text-laranja/80')}>{p}</div>}
          </div>
        )
      },
    },
    {
      chave: 'valor',
      titulo: 'Valor',
      alinhamento: 'direita',
      render: (c) => (
        <span className={cn('num font-semibold', c.situacao === 'cancelada' && 'font-normal text-texto-3 line-through')}>
          {money(c.amount)}
        </span>
      ),
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      render: (c) => (
        <div className="whitespace-nowrap">
          <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold', SELO[c.situacao].classe)}>
            {SELO[c.situacao].rotulo}
          </span>
          {c.pagamento && <div className="num mt-0.5 text-[12px] text-texto-3">em {dataBR(c.pagamento)}</div>}
        </div>
      ),
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      render: (c) => (
        <div className="flex justify-end gap-1">
          {ocupado === c.id ? (
            <span className="p-2 text-texto-3"><Loader2 size={15} className="animate-spin" /></span>
          ) : emAberto(c) ? (
            <>
              <button onClick={() => setPagando(c)} title="Marcar como paga" className={cn(botaoIcone, 'hover:text-positivo')}>
                <CheckCircle2 size={15} />
              </button>
              <button onClick={() => setEditando(c)} title="Editar" className={cn(botaoIcone, 'hover:text-texto')}>
                <Pencil size={15} />
              </button>
              <button onClick={() => setCancelando(c)} title="Cancelar conta" className={cn(botaoIcone, 'hover:text-negativo')}>
                <Ban size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={() => executar(c, reabrirConta)}
              title={c.situacao === 'paga' ? 'Reabrir (desfaz o pagamento)' : 'Reabrir conta'}
              className={cn(botaoIcone, 'hover:text-dourado')}
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-borda p-4">
          <SearchInput placeholder="Buscar na descrição..." />
          <FiltroSelect param="status" opcoes={STATUS} todos="Em aberto" />
          <FiltroSelect
            param="fornecedor"
            opcoes={[{ valor: 'nenhum', label: 'Sem fornecedor' }, ...fornecedores]}
            todos="Todos os fornecedores"
          />
          <button
            onClick={() => setEditando(null)}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-dourado px-4 text-sm font-semibold text-preto transition-colors hover:bg-dourado-escuro"
          >
            <Plus size={16} />
            Nova conta
          </button>
        </div>
        <div className="border-b border-borda px-4 py-3">
          <FiltroPeriodo />
        </div>

        <DataTable
          colunas={colunas}
          linhas={contas}
          vazio={
            <EmptyState
              titulo="Nenhuma conta encontrada"
              descricao="Ajuste os filtros ou cadastre uma conta. Entradas de estoque a prazo também aparecem aqui."
            />
          }
        />
      </Card>

      {editando !== undefined && (
        <Modal
          titulo={editando ? 'Editar conta' : 'Nova conta a pagar'}
          descricao={editando ? editando.description : 'Vencimento e valor aparecem nos alertas desta tela.'}
          onFechar={fecharEdicao}
          largura="max-w-xl"
        >
          <ContaForm
            conta={editando ?? undefined}
            fornecedores={fornecedores}
            hoje={hoje}
            onCancelar={fecharEdicao}
            onSalvo={(mensagem) => {
              fecharEdicao()
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}

      {pagando && (
        <Modal titulo="Marcar como paga" descricao={pagando.description} onFechar={fecharPagamento}>
          <PagamentoForm
            conta={pagando}
            hoje={hoje}
            onCancelar={fecharPagamento}
            onPago={(mensagem) => {
              fecharPagamento()
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}

      {cancelando && (
        <Modal titulo="Cancelar conta" descricao={cancelando.description} onFechar={fecharCancelamento}>
          <p className="text-[13.5px] text-texto-2">
            A conta de <strong className="num text-texto">{money(cancelando.amount)}</strong> com vencimento em{' '}
            <span className="num">{dataBR(cancelando.vencimento)}</span> sai dos totais em aberto. Dá para reabrir depois, se precisar.
          </p>
          <div className="mt-5 flex justify-end gap-2.5 border-t border-borda pt-5">
            <Botao type="button" variante="secundario" onClick={fecharCancelamento} disabled={ocupado === cancelando.id}>
              Voltar
            </Botao>
            <Botao
              type="button"
              variante="perigo"
              disabled={ocupado === cancelando.id}
              onClick={() => executar(cancelando, cancelarConta, fecharCancelamento)}
            >
              {ocupado === cancelando.id && <Loader2 size={15} className="animate-spin" />}
              Cancelar conta
            </Botao>
          </div>
        </Modal>
      )}
    </>
  )
}

function PagamentoForm({
  conta, hoje, onCancelar, onPago,
}: {
  conta: ContaLinha
  hoje: string
  onCancelar: () => void
  onPago: (mensagem: string) => void
}) {
  const [data, setData] = useState(hoje)
  const [estado, enviar, pendente] = useActionState<EstadoFormulario, FormData>(pagarConta, { ok: false })
  const tratado = useRef<string | null>(null)

  useEffect(() => {
    if (pendente) tratado.current = null
  }, [pendente])

  useEffect(() => {
    if (estado.ok && estado.mensagem && tratado.current !== estado.mensagem) {
      tratado.current = estado.mensagem
      onPago(estado.mensagem)
    }
  }, [estado, onPago])

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="id" value={conta.id} />
      <div className="flex items-center justify-between rounded-lg border border-borda bg-superficie-2 px-4 py-3">
        <div>
          <div className="text-[12px] text-texto-3">Valor</div>
          <div className="num text-[19px] font-bold">{money(conta.amount)}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-texto-3">Vencimento</div>
          <div className="num text-[15px] font-semibold">{dataBR(conta.vencimento)}</div>
        </div>
      </div>

      <Campo label="Data do pagamento" erro={estado.erros?.dataPagamento} hint="Não lança saída no caixa.">
        <input
          type="date"
          name="dataPagamento"
          value={data}
          max={hoje}
          onChange={(e) => setData(e.target.value)}
          className={`${inputClass} [color-scheme:dark]`}
          autoFocus
        />
      </Campo>

      {estado.mensagem && !estado.ok && (
        <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          {estado.mensagem}
        </p>
      )}

      <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
        <Botao type="button" variante="secundario" onClick={onCancelar} disabled={pendente}>
          Voltar
        </Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente && <Loader2 size={15} className="animate-spin" />}
          Confirmar pagamento
        </Botao>
      </div>
    </form>
  )
}
