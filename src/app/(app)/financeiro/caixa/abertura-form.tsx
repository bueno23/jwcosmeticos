'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2, LockOpen } from 'lucide-react'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { ehNumero, paraNumero } from '@/lib/num'
import { abrirCaixaAction } from './actions'
import type { EstadoCaixa } from './tipos'

export function AberturaForm({ ultimoInformado }: { ultimoInformado: number | null }) {
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')
  const [estado, enviar, pendente] = useActionState<EstadoCaixa, FormData>(abrirCaixaAction, { ok: false })
  const toast = useToast()
  const tratado = useRef<EstadoCaixa | null>(null)

  useEffect(() => {
    if (estado.ok && tratado.current !== estado) {
      tratado.current = estado
      toast(estado.mensagem ?? 'Caixa aberto.')
    }
  }, [estado, toast])

  const invalido = valor.trim() !== '' && (!ehNumero(valor) || paraNumero(valor) < 0)

  return (
    <form action={enviar} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          label="Valor inicial (troco na gaveta)"
          erro={estado.erros?.valor ?? (invalido ? 'Valor inválido' : undefined)}
          hint={ultimoInformado != null ? `O último caixa fechou com ${money(ultimoInformado)} contados.` : 'Quanto há em dinheiro na gaveta agora.'}
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
        <Campo label="Observação" erro={estado.erros?.observacao} hint="Opcional.">
          <input
            name="observacao"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: turno da noite"
            className={inputClass}
          />
        </Campo>
      </div>

      {!estado.ok && estado.mensagem && (
        <p role="status" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
          {estado.mensagem}
        </p>
      )}

      <div className="flex justify-end border-t border-borda pt-5">
        <Botao type="submit" disabled={pendente || invalido || valor.trim() === ''}>
          {pendente ? <Loader2 size={15} className="animate-spin" /> : <LockOpen size={15} />}
          Abrir caixa
        </Botao>
      </div>
    </form>
  )
}
