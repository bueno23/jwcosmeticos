'use client'

import { useState } from 'react'
import { Loader2, Lock, Trash2 } from 'lucide-react'
import { Botao } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { removerClienteAction } from './actions'

/** Confirmação de remoção. Com histórico, explica por que não dá e nem oferece o botão. */
export function RemoverClienteModal({
  cliente, onFechar, voltarParaLista = false,
}: {
  cliente: { id: string; name: string; vendasOuFiado: number }
  onFechar: () => void
  voltarParaLista?: boolean
}) {
  const toast = useToast()
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const bloqueado = cliente.vendasOuFiado > 0

  async function confirmar() {
    setPendente(true)
    const r = await removerClienteAction(cliente.id, voltarParaLista)
    setPendente(false)
    if (r && !r.ok) {
      setErro(r.mensagem ?? 'Não foi possível remover.')
      return
    }
    toast(r?.mensagem ?? `${cliente.name} removido do cadastro.`, 'ok')
    onFechar()
  }

  return (
    <Modal titulo="Remover cliente" descricao={cliente.name} onFechar={onFechar}>
      <div className="space-y-5">
        {bloqueado ? (
          <p className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-texto-2">
            <Lock size={15} className="mt-0.5 shrink-0 text-laranja" />
            <span>
              Este cliente tem vendas ou fiado no histórico. Remover deixaria essas vendas e dívidas sem dono,
              e ninguém saberia de quem cobrar. O cadastro fica; se algo estiver errado, edite os dados.
            </span>
          </p>
        ) : (
          <p className="text-[13.5px] leading-relaxed text-texto-2">
            Este cliente nunca comprou nem deve nada, então pode sair do cadastro. Não dá para desfazer.
          </p>
        )}

        {erro && (
          <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
          <Botao variante="secundario" onClick={onFechar} disabled={pendente}>
            {bloqueado ? 'Entendi' : 'Cancelar'}
          </Botao>
          {!bloqueado && (
            <Botao variante="perigo" onClick={confirmar} disabled={pendente}>
              {pendente ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Remover
            </Botao>
          )}
        </div>
      </div>
    </Modal>
  )
}
