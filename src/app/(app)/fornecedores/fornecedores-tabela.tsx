'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { Modal } from '@/components/ui/modal'
import { SearchInput } from '@/components/ui/search-input'
import { useToast } from '@/components/ui/toast'
import { mascararCnpj } from '@/lib/cnpj'
import { money, number } from '@/lib/format'
import { FornecedorForm } from './fornecedor-form'
import { RemoverFornecedorModal, type AlvoRemocao } from './remover-modal'
import type { FornecedorLinha } from './fornecedor'

export function FornecedoresTabela({
  fornecedores, verFinanceiro, podeEditar, buscando,
}: {
  fornecedores: FornecedorLinha[]
  verFinanceiro: boolean
  podeEditar: boolean
  buscando: boolean
}) {
  const toast = useToast()
  const [editando, setEditando] = useState<FornecedorLinha | null | undefined>(undefined)
  const [removendo, setRemovendo] = useState<AlvoRemocao | null>(null)

  const todas: Coluna<FornecedorLinha>[] = [
    {
      chave: 'fornecedor',
      titulo: 'Fornecedor',
      render: (f) => (
        <div className="min-w-[220px]">
          <Link href={`/fornecedores/${f.id}`} className="font-medium hover:text-dourado">
            {f.tradeName || f.legalName}
          </Link>
          {f.tradeName && <div className="mt-0.5 text-[12px] text-texto-3">{f.legalName}</div>}
        </div>
      ),
    },
    {
      chave: 'cnpj',
      titulo: 'CNPJ',
      render: (f) => (
        <span className="num whitespace-nowrap text-[12.5px] text-texto-2">{mascararCnpj(f.document) || '—'}</span>
      ),
    },
    {
      chave: 'contato',
      titulo: 'Contato',
      render: (f) => (
        <div className="min-w-[140px]">
          <div className="text-texto-2">{f.contactName ?? '—'}</div>
          {f.email && <div className="mt-0.5 text-[12px] text-texto-3">{f.email}</div>}
        </div>
      ),
    },
    {
      chave: 'telefone',
      titulo: 'Telefone',
      render: (f) => <span className="num whitespace-nowrap text-texto-2">{f.phone ?? '—'}</span>,
    },
    {
      chave: 'produtos',
      titulo: 'Produtos',
      alinhamento: 'direita',
      render: (f) => <span className="num text-texto-2">{number(f.produtos)}</span>,
    },
    {
      chave: 'contas',
      titulo: 'Contas em aberto',
      alinhamento: 'direita',
      render: (f) =>
        f.contasAbertas > 0 ? (
          <div className="whitespace-nowrap">
            <span className="num font-semibold text-laranja">{money(f.valorAberto)}</span>
            <div className="num text-[11.5px] text-texto-3">{f.contasAbertas} conta(s)</div>
          </div>
        ) : (
          <span className="text-[12.5px] text-texto-3">nenhuma</span>
        ),
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      render: (f) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setEditando(f)}
            title="Editar"
            className="rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setRemovendo({
              id: f.id, nome: f.tradeName || f.legalName, produtos: f.produtos, contas: f.contasAbertas,
            })}
            title="Remover"
            className="rounded-md p-2 text-texto-3 transition-colors hover:bg-negativo/10 hover:text-negativo"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  const ocultas = new Set([...(verFinanceiro ? [] : ['contas']), ...(podeEditar ? [] : ['acoes'])])
  const colunas = todas.filter((c) => !ocultas.has(c.chave))

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-borda p-4">
          <SearchInput placeholder="Buscar por razão social, fantasia ou CNPJ..." />
          {podeEditar && (
            <button
              onClick={() => setEditando(null)}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-dourado px-4 text-sm font-semibold text-preto transition-colors hover:bg-dourado-escuro"
            >
              <Plus size={16} />
              Novo fornecedor
            </button>
          )}
        </div>

        <DataTable
          colunas={colunas}
          linhas={fornecedores}
          vazio={
            <EmptyState
              titulo={buscando ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
              descricao={buscando
                ? 'Confira a grafia ou busque pelo CNPJ, com ou sem pontuação.'
                : 'Cadastre quem abastece a loja para ligar produtos, compras e contas a pagar.'}
            />
          }
        />
      </Card>

      {editando !== undefined && (
        <Modal
          titulo={editando ? 'Editar fornecedor' : 'Novo fornecedor'}
          descricao={editando ? editando.tradeName || editando.legalName : 'Os produtos e as compras passam a apontar para ele.'}
          onFechar={() => setEditando(undefined)}
          largura="max-w-2xl"
        >
          <FornecedorForm
            fornecedor={editando ?? undefined}
            onCancelar={() => setEditando(undefined)}
            onSalvo={(mensagem) => {
              setEditando(undefined)
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}

      {removendo && (
        <RemoverFornecedorModal
          alvo={removendo}
          onFechar={() => setRemovendo(null)}
          onRemovido={(mensagem) => {
            setRemovendo(null)
            toast(mensagem, 'ok')
          }}
        />
      )}
    </>
  )
}
