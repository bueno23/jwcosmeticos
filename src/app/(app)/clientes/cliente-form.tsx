'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { salvarClienteAction, type EstadoFormulario } from './actions'
import { cpfValido, mascararCpf, mascararTelefone, soDigitos, type ClienteLinha } from './cliente'

type Rascunho = {
  name: string
  phone: string
  document: string
  birthDate: string
  notes: string
}

export type ClienteEditavel = Pick<ClienteLinha, 'id' | 'name' | 'phone' | 'document' | 'birthDate' | 'notes'>

const inicial = (c?: ClienteEditavel): Rascunho => ({
  name: c?.name ?? '',
  phone: mascararTelefone(c?.phone),
  document: mascararCpf(c?.document),
  birthDate: c?.birthDate ?? '',
  notes: c?.notes ?? '',
})

export function ClienteForm({
  cliente, onCancelar, onSalvo,
}: {
  cliente?: ClienteEditavel
  onCancelar: () => void
  onSalvo: (mensagem: string) => void
}) {
  const [rascunho, setRascunho] = useState<Rascunho>(() => inicial(cliente))
  const [estado, enviar, pendente] = useActionState<EstadoFormulario, FormData>(salvarClienteAction, { ok: false })
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

  const cpfCompleto = soDigitos(rascunho.document).length === 11
  const cpfOk = cpfCompleto && cpfValido(rascunho.document)

  return (
    <form action={enviar} className="space-y-5">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nome" erro={estado.erros?.name} className="sm:col-span-2">
          <input
            name="name"
            value={rascunho.name}
            onChange={(e) => mudar('name', e.target.value)}
            placeholder="Como o balcão chama o cliente"
            className={inputClass}
            autoFocus
          />
        </Campo>

        <Campo label="Telefone" erro={estado.erros?.phone} hint="Com DDD.">
          <input
            name="phone"
            value={rascunho.phone}
            onChange={(e) => mudar('phone', mascararTelefone(e.target.value))}
            inputMode="tel"
            placeholder="(11) 98888-7777"
            className={inputClass}
          />
        </Campo>

        <Campo
          label="CPF"
          erro={estado.erros?.document ?? (cpfCompleto && !cpfOk ? 'CPF inválido: confira os dígitos.' : undefined)}
          hint="Opcional. Pode colar com ou sem pontos."
        >
          <div className="relative">
            <input
              name="document"
              value={rascunho.document}
              onChange={(e) => mudar('document', mascararCpf(e.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className={`${inputClass} pr-9`}
            />
            {cpfCompleto && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                {cpfOk ? <Check size={15} className="text-positivo" /> : <X size={15} className="text-negativo" />}
              </span>
            )}
          </div>
        </Campo>

        <Campo label="Nascimento" erro={estado.erros?.birthDate} hint="Opcional.">
          <input
            type="date"
            name="birthDate"
            value={rascunho.birthDate}
            onChange={(e) => mudar('birthDate', e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </Campo>

        <Campo label="Observações" erro={estado.erros?.notes} className="sm:col-span-2">
          <textarea
            name="notes"
            value={rascunho.notes}
            onChange={(e) => mudar('notes', e.target.value)}
            rows={3}
            placeholder="Ex.: indicada pela Carla, prefere maquiagem matte"
            className={inputClass}
          />
        </Campo>
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
          {cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
        </Botao>
      </div>
    </form>
  )
}
