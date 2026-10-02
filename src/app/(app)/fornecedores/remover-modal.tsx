'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Botao } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { removerFornecedorAction } from './actions'

export type AlvoRemocao = { id: string; nome: string; produtos: number; contas: number }

export function RemoverFornecedorModal({
  alvo, onFechar, onRemovido,
}: {
  alvo: AlvoRemocao
  onFechar: () => void
  onRemovido: (mensagem: string) => void
}) {
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const vinculado = alvo.produtos > 0 || alvo.contas > 0

  async function confirmar() {
    setPendente(true)
    setErro(null)
    const r = await removerFornecedorAction(alvo.id)
    setPendente(false)
    if (r.ok) onRemovido(r.mensagem ?? 'Fornecedor removido.')
    else setErro(r.mensagem ?? 'Não foi possível remover.')
  }

  return (
    <Modal titulo="Remover fornecedor" descricao={alvo.nome} onFechar={onFechar}>
      <div className="space-y-5">
        {vinculado ? (
          <div className="space-y-2.5 text-[13.5px] leading-relaxed text-texto-2">
            <p>
              Este fornecedor não pode ser removido porque tem{' '}
              {alvo.produtos > 0 && <strong className="text-texto">{alvo.produtos} produto(s)</strong>}
              {alvo.produtos > 0 && alvo.contas > 0 && ' e '}
              {alvo.contas > 0 && <strong className="text-texto">{alvo.contas} conta(s) a pagar</strong>} vinculados.
            </p>
            <p>
              Remover apagaria de onde vieram as compras desses produtos e a quem se deve cada conta.
              Troque o fornecedor dos produtos no cadastro e quite ou cancele as contas antes.
            </p>
          </div>
        ) : (
          <p className="text-[13.5px] leading-relaxed text-texto-2">
            Nenhum produto nem conta a pagar usa este fornecedor. O cadastro será apagado de vez.
          </p>
        )}

        {erro && (
          <p role="alert" className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2.5 border-t border-borda pt-5">
          <Botao variante="secundario" onClick={onFechar} disabled={pendente}>
            {vinculado ? 'Entendi' : 'Cancelar'}
          </Botao>
          {!vinculado && (
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
