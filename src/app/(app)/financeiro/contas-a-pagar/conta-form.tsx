'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Botao, Campo, CampoSelecao, inputClass } from '@/components/ui/form'
import type { Opcao } from '@/app/(app)/estoque/produtos/produto'
import { salvarConta, type EstadoFormulario } from './actions'
import type { ContaLinha } from './conta'

type Rascunho = {
  description: string
  amount: string
  vencimento: string
  supplierId: string
}

const valorParaCampo = (v: number) => v.toFixed(2).replace('.', ',')

export function ContaForm({
  conta, fornecedores, hoje, onCancelar, onSalvo,
}: {
  conta?: ContaLinha
  fornecedores: Opcao[]
  hoje: string
  onCancelar: () => void
  onSalvo: (mensagem: string) => void
}) {
  const [rascunho, setRascunho] = useState<Rascunho>(() => (
    conta
      ? {
          description: conta.description,
          amount: valorParaCampo(conta.amount),
          vencimento: conta.vencimento,
          supplierId: conta.fornecedor?.id ?? '',
        }
      : { description: '', amount: '', vencimento: hoje, supplierId: '' }
  ))
  const [estado, enviar, pendente] = useActionState<EstadoFormulario, FormData>(salvarConta, { ok: false })
  const tratado = useRef<string | null>(null)

  useEffect(() => {
    if (pendente) tratado.current = null
  }, [pendente])

  useEffect(() => {
    if (estado.ok && estado.mensagem && tratado.current !== estado.mensagem) {
      tratado.current = estado.mensagem
      onSalvo(estado.mensagem)
    }
  }, [estado, onSalvo])

  const mudar = <C extends keyof Rascunho>(campo: C, valor: Rascunho[C]) =>
    setRascunho((r) => ({ ...r, [campo]: valor }))

  return (
    <form action={enviar} className="space-y-5">
      {conta && <input type="hidden" name="id" value={conta.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Descrição" erro={estado.erros?.description} className="sm:col-span-2">
          <input
            name="description"
            value={rascunho.description}
            onChange={(e) => mudar('description', e.target.value)}
            placeholder="Ex.: Boleto da distribuidora, aluguel de outubro"
            className={inputClass}
            autoFocus
          />
        </Campo>

        <Campo label="Valor" erro={estado.erros?.amount}>
          <input
            name="amount"
            value={rascunho.amount}
            onChange={(e) => mudar('amount', e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass}
          />
        </Campo>

        <Campo label="Vencimento" erro={estado.erros?.vencimento}>
          <input
            type="date"
            name="vencimento"
            value={rascunho.vencimento}
            onChange={(e) => mudar('vencimento', e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </Campo>

        <CampoSelecao
          label="Fornecedor"
          name="supplierId"
          erro={estado.erros?.supplierId}
          placeholder="Sem fornecedor"
          hint="Opcional. Aluguel e contas de consumo costumam ficar sem."
          value={rascunho.supplierId}
          onChange={(v) => mudar('supplierId', v)}
          className="sm:col-span-2"
        >
          {fornecedores.map((f) => (
            <option key={f.valor} value={f.valor}>{f.label}</option>
          ))}
        </CampoSelecao>
      </div>

      {estado.mensagem && !estado.ok && (
        <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          {estado.mensagem}
        </p>
      )}

      <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
        <Botao type="button" variante="secundario" onClick={onCancelar} disabled={pendente}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente && <Loader2 size={15} className="animate-spin" />}
          {conta ? 'Salvar alterações' : 'Cadastrar conta'}
        </Botao>
      </div>
    </form>
  )
}
