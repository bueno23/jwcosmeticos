'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { Modal } from '@/components/ui/modal'
import { SearchInput } from '@/components/ui/search-input'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { ClienteForm } from './cliente-form'
import { mascararCpf, mascararTelefone, type ClienteLinha } from './cliente'
import { RemoverClienteModal } from './remover-cliente'

export function ClientesTabela({
  clientes, podeRemover, buscando,
}: {
  clientes: ClienteLinha[]
  podeRemover: boolean
  buscando: boolean
}) {
  const toast = useToast()
  const [editando, setEditando] = useState<ClienteLinha | null | undefined>(undefined)
  const [removendo, setRemovendo] = useState<ClienteLinha | null>(null)

  const colunas: Coluna<ClienteLinha>[] = [
    {
      chave: 'cliente',
      titulo: 'Cliente',
      render: (c) => (
        <div className="min-w-[180px]">
          <Link href={`/clientes/${c.id}`} className="font-medium hover:text-dourado">
            {c.name}
          </Link>
          {c.document && <div className="num mt-0.5 text-[12px] text-texto-3">CPF {mascararCpf(c.document)}</div>}
        </div>
      ),
    },
    {
      chave: 'telefone',
      titulo: 'Telefone',
      render: (c) => (
        <span className="num whitespace-nowrap text-texto-2">{c.phone ? mascararTelefone(c.phone) : '—'}</span>
      ),
    },
    {
      chave: 'total',
      titulo: 'Total comprado',
      alinhamento: 'direita',
      render: (c) => (
        <div>
          <span className="num font-medium">{money(c.totalComprado)}</span>
          <div className="num text-[11.5px] text-texto-3">{c.compras} compra(s)</div>
        </div>
      ),
    },
    {
      chave: 'ultima',
      titulo: 'Última compra',
      alinhamento: 'direita',
      render: (c) => (
        <span className="num whitespace-nowrap text-texto-2">{c.ultimaCompra ?? '—'}</span>
      ),
    },
    {
      chave: 'fiado',
      titulo: 'Fiado em aberto',
      alinhamento: 'direita',
      render: (c) =>
        c.fiadoAberto > 0 ? (
          <span className="num rounded-md bg-laranja/12 px-2 py-0.5 font-semibold text-laranja">{money(c.fiadoAberto)}</span>
        ) : (
          <span className="text-texto-3">—</span>
        ),
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setEditando(c)}
            title="Editar"
            className="rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto"
          >
            <Pencil size={15} />
          </button>
          {podeRemover && (
            <button
              onClick={() => setRemovendo(c)}
              title="Remover"
              className="rounded-md p-2 text-texto-3 transition-colors hover:bg-negativo/10 hover:text-negativo"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-borda p-4">
          <SearchInput placeholder="Buscar por nome, telefone ou CPF..." />
          <button
            onClick={() => setEditando(null)}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-dourado px-4 text-sm font-semibold text-preto transition-colors hover:bg-dourado-escuro"
          >
            <Plus size={16} />
            Novo cliente
          </button>
        </div>

        <DataTable
          colunas={colunas}
          linhas={clientes}
          vazio={
            buscando ? (
              <EmptyState titulo="Nenhum cliente encontrado" descricao="Confira o nome, o telefone ou o CPF digitado." />
            ) : (
              <EmptyState titulo="Nenhum cliente cadastrado" descricao="Cadastre quem compra no fiado para acompanhar o que está em aberto." />
            )
          }
        />
      </Card>

      {editando !== undefined && (
        <Modal
          titulo={editando ? 'Editar cliente' : 'Novo cliente'}
          descricao={editando ? editando.name : 'Só o nome é obrigatório.'}
          onFechar={() => setEditando(undefined)}
          largura="max-w-2xl"
        >
          <ClienteForm
            cliente={editando ?? undefined}
            onCancelar={() => setEditando(undefined)}
            onSalvo={(mensagem) => {
              setEditando(undefined)
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}

      {removendo && <RemoverClienteModal cliente={removendo} onFechar={() => setRemovendo(null)} />}
    </>
  )
}
