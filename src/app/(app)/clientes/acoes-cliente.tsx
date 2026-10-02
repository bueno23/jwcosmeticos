'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ClienteForm, type ClienteEditavel } from './cliente-form'
import { RemoverClienteModal } from './remover-cliente'

/** Botões da ficha: o mesmo formulário e a mesma confirmação da lista. */
export function AcoesCliente({
  cliente, vendasOuFiado, podeRemover,
}: {
  cliente: ClienteEditavel
  vendasOuFiado: number
  podeRemover: boolean
}) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setEditando(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie-2 px-4 text-sm font-semibold transition-colors hover:border-borda-clara"
      >
        <Pencil size={15} />
        Editar cliente
      </button>
      {podeRemover && (
        <button
          onClick={() => setRemovendo(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-negativo/40 px-4 text-sm font-semibold text-negativo transition-colors hover:bg-negativo/10"
        >
          <Trash2 size={15} />
          Remover
        </button>
      )}

      {editando && (
        <Modal titulo="Editar cliente" descricao={cliente.name} onFechar={() => setEditando(false)} largura="max-w-2xl">
          <ClienteForm
            cliente={cliente}
            onCancelar={() => setEditando(false)}
            onSalvo={(mensagem) => {
              setEditando(false)
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}

      {removendo && (
        <RemoverClienteModal
          cliente={{ id: cliente.id, name: cliente.name, vendasOuFiado }}
          onFechar={() => setRemovendo(false)}
          voltarParaLista
        />
      )}
    </div>
  )
}
