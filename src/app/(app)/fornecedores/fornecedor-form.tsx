'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { cnpjValido, limparCnpj, mascararCnpj, mascararCnpjParcial } from '@/lib/cnpj'
import { salvarFornecedorAction, type EstadoFormulario } from './actions'
import type { FornecedorDados } from './fornecedor'

type Rascunho = {
  legalName: string
  tradeName: string
  document: string
  phone: string
  email: string
  address: string
  contactName: string
}

const inicial = (f?: FornecedorDados): Rascunho => ({
  legalName: f?.legalName ?? '',
  tradeName: f?.tradeName ?? '',
  document: mascararCnpj(f?.document),
  phone: f?.phone ?? '',
  email: f?.email ?? '',
  address: f?.address ?? '',
  contactName: f?.contactName ?? '',
})

export function FornecedorForm({
  fornecedor, onCancelar, onSalvo,
}: {
  fornecedor?: FornecedorDados
  onCancelar: () => void
  onSalvo: (mensagem: string) => void
}) {
  const [rascunho, setRascunho] = useState<Rascunho>(() => inicial(fornecedor))
  const [estado, enviar, pendente] = useActionState<EstadoFormulario, FormData>(salvarFornecedorAction, { ok: false })
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

  const mudar = (campo: keyof Rascunho, valor: string) => setRascunho((r) => ({ ...r, [campo]: valor }))

  // Aviso imediato só com o CNPJ completo; o Zod da action continua sendo quem decide
  const cnpjCompleto = limparCnpj(rascunho.document).length === 14
  const avisoCnpj = cnpjCompleto && !cnpjValido(rascunho.document) ? 'CNPJ inválido: confira os números digitados' : undefined

  return (
    <form action={enviar} className="space-y-5">
      {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Razão social" erro={estado.erros?.legalName} className="sm:col-span-2">
          <input
            name="legalName"
            value={rascunho.legalName}
            onChange={(e) => mudar('legalName', e.target.value)}
            placeholder="Ex.: Distribuidora Beleza Central LTDA"
            className={inputClass}
            autoFocus
          />
        </Campo>

        <Campo label="Nome fantasia" erro={estado.erros?.tradeName}>
          <input
            name="tradeName"
            value={rascunho.tradeName}
            onChange={(e) => mudar('tradeName', e.target.value)}
            placeholder="Como a loja chama o fornecedor"
            className={inputClass}
          />
        </Campo>

        <Campo
          label="CNPJ"
          erro={estado.erros?.document ?? avisoCnpj}
          hint="Com ou sem pontuação. Deixe vazio se não souber."
        >
          <input
            name="document"
            value={rascunho.document}
            onChange={(e) => mudar('document', mascararCnpjParcial(e.target.value))}
            placeholder="00.000.000/0000-00"
            autoCapitalize="characters"
            className={`${inputClass} num`}
          />
        </Campo>

        <Campo label="Contato" erro={estado.erros?.contactName}>
          <input
            name="contactName"
            value={rascunho.contactName}
            onChange={(e) => mudar('contactName', e.target.value)}
            placeholder="Quem atende a loja"
            className={inputClass}
          />
        </Campo>

        <Campo label="Telefone" erro={estado.erros?.phone}>
          <input
            name="phone"
            value={rascunho.phone}
            onChange={(e) => mudar('phone', e.target.value)}
            placeholder="(11) 3344-5566"
            inputMode="tel"
            className={inputClass}
          />
        </Campo>

        <Campo label="E-mail" erro={estado.erros?.email} className="sm:col-span-2">
          <input
            name="email"
            value={rascunho.email}
            onChange={(e) => mudar('email', e.target.value)}
            placeholder="pedidos@fornecedor.com.br"
            inputMode="email"
            className={inputClass}
          />
        </Campo>

        <Campo label="Endereço" erro={estado.erros?.address} className="sm:col-span-2">
          <textarea
            name="address"
            value={rascunho.address}
            onChange={(e) => mudar('address', e.target.value)}
            rows={2}
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
          {fornecedor ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        </Botao>
      </div>
    </form>
  )
}
