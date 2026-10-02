'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ProdutoForm } from './produto-form'
import type { Opcao, ProdutoLinha } from './produto'

/** Mesmo formulário da lista, aberto em modal — a edição é a mesma nas duas telas. */
export function EditarProduto({
  produto, categorias, fornecedores,
}: {
  produto: ProdutoLinha
  categorias: Opcao[]
  fornecedores: Opcao[]
}) {
  const [aberto, setAberto] = useState(false)
  const toast = useToast()

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie-2 px-4 text-sm font-semibold transition-colors hover:border-borda-clara"
      >
        <Pencil size={15} />
        Editar produto
      </button>

      {aberto && (
        <Modal
          titulo="Editar produto"
          descricao={produto.name}
          onFechar={() => setAberto(false)}
          largura="max-w-3xl"
        >
          <ProdutoForm
            produto={produto}
            categorias={categorias}
            fornecedores={fornecedores}
            onCancelar={() => setAberto(false)}
            onSalvo={(mensagem) => {
              setAberto(false)
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}
    </>
  )
}
