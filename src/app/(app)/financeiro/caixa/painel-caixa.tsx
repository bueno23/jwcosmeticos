'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Info, Loader2, Lock, ReceiptText } from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { hora, money } from '@/lib/format'
import { ehNumero, paraNumero } from '@/lib/num'
import { fecharCaixaAction, movimentarCaixaAction } from './actions'
import { ROTULO_MOVIMENTO, type EstadoCaixa, type MovimentoCaixa, type ResumoCaixa } from './tipos'

type Aberto = null | 'SANGRIA' | 'SUPRIMENTO' | 'FECHAR'

const MOTIVOS: Record<'SANGRIA' | 'SUPRIMENTO', string[]> = {
  SANGRIA: ['Sangria para o cofre', 'Depósito no banco', 'Pagamento de fornecedor'],
  SUPRIMENTO: ['Reforço de troco', 'Troco do cofre'],
}

/** Fecha o modal e avisa uma vez por resposta de sucesso da action. */
function useSucesso(estado: EstadoCaixa, aoConcluir: () => void) {
  const toast = useToast()
  const tratado = useRef<EstadoCaixa | null>(null)
  useEffect(() => {
    if (estado.ok && tratado.current !== estado) {
      tratado.current = estado
      toast(estado.mensagem ?? 'Pronto.')
      aoConcluir()
    }
  }, [estado, toast, aoConcluir])
}

function Mensagem({ estado }: { estado: EstadoCaixa }) {
  if (estado.ok || !estado.mensagem) return null
  return (
    <p role="status" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
      {estado.mensagem}
    </p>
  )
}

const valorInvalido = (v: string, aceitaZero: boolean) =>
  v.trim() !== '' && (!ehNumero(v) || (aceitaZero ? paraNumero(v) < 0 : paraNumero(v) <= 0))

function MovimentoForm({ tipo, esperado, aoConcluir }: { tipo: 'SANGRIA' | 'SUPRIMENTO'; esperado: number; aoConcluir: () => void }) {
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [estado, enviar, pendente] = useActionState<EstadoCaixa, FormData>(movimentarCaixaAction, { ok: false })
  useSucesso(estado, aoConcluir)

  const sangria = tipo === 'SANGRIA'
  const invalido = valorInvalido(valor, false)
  const n = paraNumero(valor)
  const passa = sangria && !invalido && n > esperado
  const depois = esperado + (sangria ? -n : n)

  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />
      <Campo
        label="Valor"
        erro={estado.erros?.valor ?? (invalido ? 'Valor inválido' : passa ? `Há ${money(esperado)} esperados no caixa.` : undefined)}
        hint={`Saldo esperado agora: ${money(esperado)}.`}
      >
        <input
          name="valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          className={inputClass}
        />
      </Campo>
      <Campo label="Motivo" erro={estado.erros?.motivo}>
        <input
          name="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Obrigatório: fica no histórico do caixa"
          className={inputClass}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MOTIVOS[tipo].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className="rounded-md border border-borda px-2 py-1 text-[11.5px] text-texto-2 transition-colors hover:border-borda-clara hover:text-texto"
            >
              {m}
            </button>
          ))}
        </div>
      </Campo>

      {n > 0 && !invalido && !passa && (
        <div className="flex items-center justify-between rounded-lg border border-borda bg-superficie-2 px-3.5 py-2.5 text-[13px]">
          <span className="text-texto-3">Saldo esperado depois</span>
          <span className="num font-semibold">{money(depois)}</span>
        </div>
      )}

      <Mensagem estado={estado} />

      <div className="flex justify-end gap-2 border-t border-borda pt-4">
        <Botao type="button" variante="secundario" onClick={aoConcluir}>Cancelar</Botao>
        <Botao type="submit" disabled={pendente || invalido || passa || valor.trim() === '' || motivo.trim().length < 3}>
          {pendente && <Loader2 size={15} className="animate-spin" />}
          {sangria ? 'Registrar sangria' : 'Registrar suprimento'}
        </Botao>
      </div>
    </form>
  )
}

function FechamentoForm({ resumo, aoConcluir }: { resumo: ResumoCaixa; aoConcluir: () => void }) {
  const [contado, setContado] = useState('')
  const [motivo, setMotivo] = useState('')
  const [estado, enviar, pendente] = useActionState<EstadoCaixa, FormData>(fecharCaixaAction, { ok: false })
  useSucesso(estado, aoConcluir)

  const invalido = valorInvalido(contado, true)
  const preenchido = contado.trim() !== '' && !invalido
  const diferenca = preenchido ? Math.round((paraNumero(contado) - resumo.esperado) * 100) / 100 : 0
  const faltaMotivo = diferenca !== 0 && motivo.trim().length < 3

  return (
    <form action={enviar} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-borda bg-superficie-2 p-3.5 text-[13px]">
        <span className="text-texto-3">Saldo inicial</span>
        <span className="num text-right">{money(resumo.inicial)}</span>
        <span className="text-texto-3">Entradas</span>
        <span className="num text-right text-positivo">+{money(resumo.entradas)}</span>
        <span className="text-texto-3">Saídas</span>
        <span className="num text-right text-negativo">−{money(resumo.saidas)}</span>
        <span className="font-medium text-texto">Saldo esperado</span>
        <span className="num text-right font-semibold text-dourado">{money(resumo.esperado)}</span>
      </div>

      <Campo
        label="Valor contado na gaveta"
        erro={estado.erros?.contado ?? (invalido ? 'Valor inválido' : undefined)}
        hint="Conte o dinheiro físico e informe o total."
      >
        <input
          name="contado"
          value={contado}
          onChange={(e) => setContado(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          className={inputClass}
        />
      </Campo>

      {preenchido && (
        <div
          className={cn(
            'flex items-center justify-between rounded-lg border px-3.5 py-3 text-[13.5px]',
            diferenca === 0 && 'border-positivo/40 bg-positivo/10 text-positivo',
            diferenca > 0 && 'border-laranja/40 bg-laranja/10 text-laranja',
            diferenca < 0 && 'border-negativo/40 bg-negativo/10 text-negativo',
          )}
        >
          <span className="font-medium">
            {diferenca === 0 ? 'Caixa confere' : diferenca > 0 ? 'Sobra no caixa' : 'Falta no caixa'}
          </span>
          <span className="num font-semibold">
            {diferenca > 0 ? '+' : diferenca < 0 ? '−' : ''}{money(Math.abs(diferenca))}
          </span>
        </div>
      )}

      <Campo
        label={diferenca !== 0 ? 'Motivo da diferença' : 'Observação'}
        erro={estado.erros?.motivo}
        hint={diferenca !== 0 ? 'Obrigatório quando o contado não bate com o esperado.' : 'Opcional.'}
      >
        <input
          name="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={diferenca !== 0 ? 'Ex.: troco errado em uma venda' : ''}
          className={inputClass}
        />
      </Campo>

      <Mensagem estado={estado} />

      <div className="flex justify-end gap-2 border-t border-borda pt-4">
        <Botao type="button" variante="secundario" onClick={aoConcluir}>Cancelar</Botao>
        <Botao type="submit" disabled={pendente || !preenchido || faltaMotivo}>
          {pendente ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
          Confirmar fechamento
        </Botao>
      </div>
    </form>
  )
}

export function PainelCaixa({ resumo, movimentos }: { resumo: ResumoCaixa; movimentos: MovimentoCaixa[] }) {
  const [aberto, setAberto] = useState<Aberto>(null)
  const fechar = useCallback(() => setAberto(null), [])

  const colunas: Coluna<MovimentoCaixa>[] = [
    {
      chave: 'hora',
      titulo: 'Hora',
      render: (m) => <span className="num text-[12.5px] text-texto-2">{hora(m.createdAt)}</span>,
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      render: (m) => (
        <span
          className={cn(
            'inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold',
            m.type === 'SANGRIA' || m.type === 'DESPESA' ? 'bg-negativo/15 text-negativo'
              : m.type === 'SUPRIMENTO' || m.type === 'VENDA' ? 'bg-positivo/15 text-positivo'
                : 'bg-dourado/15 text-dourado',
          )}
        >
          {ROTULO_MOVIMENTO[m.type]}
        </span>
      ),
    },
    {
      chave: 'descricao',
      titulo: 'Descrição',
      render: (m) => <span className="text-[12.5px] text-texto-2">{m.description ?? '—'}</span>,
    },
    {
      chave: 'usuario',
      titulo: 'Quem',
      render: (m) => <span className="text-[12.5px] text-texto-2">{m.usuario ?? '—'}</span>,
    },
    {
      chave: 'valor',
      titulo: 'Valor',
      alinhamento: 'direita',
      render: (m) => (
        <span className={cn('num font-semibold', m.amount < 0 ? 'text-negativo' : m.type === 'ABERTURA' ? 'text-texto' : 'text-positivo')}>
          {m.amount < 0 ? '−' : m.type === 'ABERTURA' ? '' : '+'}{money(Math.abs(m.amount))}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Botao variante="secundario" onClick={() => setAberto('SUPRIMENTO')}>
          <ArrowDownToLine size={15} className="text-positivo" /> Suprimento
        </Botao>
        <Botao variante="secundario" onClick={() => setAberto('SANGRIA')}>
          <ArrowUpFromLine size={15} className="text-negativo" /> Sangria
        </Botao>
        <Botao className="ml-auto" onClick={() => setAberto('FECHAR')}>
          <Lock size={15} /> Fechar caixa
        </Botao>
      </div>

      <Card>
        <CardHeader titulo="Movimentos do caixa" icone={ReceiptText} />
        {movimentos.length === 0 ? (
          <EmptyState titulo="Nenhum movimento" descricao="Sangrias, suprimentos e a abertura aparecem aqui." />
        ) : (
          <DataTable colunas={colunas} linhas={movimentos} vazio={null} />
        )}
        {resumo.vendasDinheiro > 0 && (
          <p className="flex items-center gap-2 border-t border-borda px-5 py-3 text-[12px] text-texto-3">
            <Info size={13} className="shrink-0" />
            As vendas em dinheiro ({money(resumo.vendasDinheiro)}) entram no saldo pelo registro de vendas.
          </p>
        )}
      </Card>

      {(aberto === 'SANGRIA' || aberto === 'SUPRIMENTO') && (
        <Modal
          titulo={aberto === 'SANGRIA' ? 'Sangria' : 'Suprimento'}
          descricao={aberto === 'SANGRIA' ? 'Dinheiro retirado da gaveta.' : 'Dinheiro colocado na gaveta.'}
          onFechar={fechar}
        >
          <MovimentoForm tipo={aberto} esperado={resumo.esperado} aoConcluir={fechar} />
        </Modal>
      )}

      {aberto === 'FECHAR' && (
        <Modal titulo="Fechar caixa" descricao="Confira o dinheiro antes de confirmar." onFechar={fechar}>
          <FechamentoForm resumo={resumo} aoConcluir={fechar} />
        </Modal>
      )}
    </>
  )
}
