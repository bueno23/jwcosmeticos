'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Botao } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { FornecedorForm } from './fornecedor-form'
import { RemoverFornecedorModal, type AlvoRemocao } from './remover-modal'
import type { FornecedorDados } from './fornecedor'

export function AcoesFornecedor({ fornecedor, alvo }: { fornecedor: FornecedorDados; alvo: AlvoRemocao }) {
  const [aberto, setAberto] = useState<'editar' | 'remover' | null>(null)
  const toast = useToast()
  const router = useRouter()

  return (
    <div className="flex gap-2">
      <Botao variante="secundario" onClick={() => setAberto('editar')}>
        <Pencil size={15} />
        Editar
      </Botao>
      <Botao variante="perigo" onClick={() => setAberto('remover')}>
        <Trash2 size={15} />
        Remover
      </Botao>

      {aberto === 'editar' && (
        <Modal titulo="Editar fornecedor" descricao={alvo.nome} onFechar={() => setAberto(null)} largura="max-w-2xl">
          <FornecedorForm
            fornecedor={fornecedor}
            onCancelar={() => setAberto(null)}
            onSalvo={(mensagem) => {
              setAberto(null)
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}

      {aberto === 'remover' && (
        <RemoverFornecedorModal
          alvo={alvo}
          onFechar={() => setAberto(null)}
          onRemovido={(mensagem) => {
            toast(mensagem, 'ok')
            router.replace('/fornecedores')
          }}
        />
      )}
    </div>
  )
}
