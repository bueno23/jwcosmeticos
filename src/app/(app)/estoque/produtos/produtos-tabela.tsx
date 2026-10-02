'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Loader2, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/card'
import { FiltroSelect } from '@/components/ui/filtro-select'
import { Modal } from '@/components/ui/modal'
import { SearchInput } from '@/components/ui/search-input'
import { StockBadge } from '@/components/ui/stock-badge'
import { useToast } from '@/components/ui/toast'
import { money, percent } from '@/lib/format'
import { corMargem, margem } from '@/lib/margem'
import { alternarStatus } from './actions'
import { ProdutoForm } from './produto-form'
import type { Opcao, ProdutoLinha } from './produto'

const SITUACOES = [
  { valor: 'ativos', label: 'Ativos' },
  { valor: 'inativos', label: 'Inativos' },
  { valor: 'baixo', label: 'Estoque baixo' },
  { valor: 'todos', label: 'Ativos e inativos' },
]

export function ProdutosTabela({
  produtos, categorias, fornecedores, verCusto, podeEditar,
}: {
  produtos: ProdutoLinha[]
  categorias: Opcao[]
  fornecedores: Opcao[]
  verCusto: boolean
  podeEditar: boolean
}) {
  const toast = useToast()
  const [editando, setEditando] = useState<ProdutoLinha | null | undefined>(undefined)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function alternar(p: ProdutoLinha) {
    setOcupado(p.id)
    startTransition(async () => {
      const r = await alternarStatus(p.id, !p.active)
      toast(r.mensagem ?? (r.ok ? 'Pronto.' : 'Não foi possível alterar o status.'), r.ok ? 'ok' : 'erro')
      setOcupado(null)
    })
  }

  const todas: Coluna<ProdutoLinha>[] = [
    {
      chave: 'produto',
      titulo: 'Produto',
      render: (p) => (
        <div className="min-w-[200px]">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.categoria?.color ?? '#71717A' }} />
            <Link href={`/estoque/produtos/${p.id}`} className="font-medium hover:text-dourado">
              {p.name}
            </Link>
            {!p.active && (
              <span className="rounded bg-superficie-2 px-1.5 py-0.5 text-[11px] text-texto-3">inativo</span>
            )}
          </div>
          {p.brand && <div className="mt-0.5 pl-5 text-[12px] text-texto-3">{p.brand}</div>}
        </div>
      ),
    },
    {
      chave: 'sku',
      titulo: 'SKU',
      render: (p) => <span className="num text-[12.5px] text-texto-2">{p.sku ?? '—'}</span>,
    },
    {
      chave: 'categoria',
      titulo: 'Categoria',
      render: (p) => <span className="text-texto-2">{p.categoria?.name ?? '—'}</span>,
    },
    {
      chave: 'custo',
      titulo: 'Custo',
      alinhamento: 'direita',
      render: (p) => <span className="num text-texto-2">{money(p.costPrice)}</span>,
    },
    {
      chave: 'venda',
      titulo: 'Venda',
      alinhamento: 'direita',
      render: (p) => <span className="num font-medium">{money(p.salePrice)}</span>,
    },
    {
      chave: 'margem',
      titulo: 'Margem',
      alinhamento: 'direita',
      render: (p) => {
        const m = margem(p.costPrice, p.salePrice)
        return <span className={`num font-semibold ${corMargem(m)}`}>{percent(m, 1)}</span>
      },
    },
    {
      chave: 'estoque',
      titulo: 'Estoque',
      alinhamento: 'direita',
      render: (p) =>
        p.trackStock ? (
          <div className="flex items-center justify-end gap-2">
            <span className="num font-semibold">
              {p.stock} <span className="text-[11.5px] font-normal text-texto-3">{p.unit}</span>
            </span>
            <StockBadge estoque={p.stock} minimo={p.minStock} />
          </div>
        ) : (
          <span className="text-[12.5px] text-texto-3">sem controle</span>
        ),
    },
    {
      chave: 'acoes',
      titulo: '',
      alinhamento: 'direita',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setEditando(p)}
            title="Editar"
            className="rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => alternar(p)}
            disabled={ocupado === p.id}
            title={p.active ? 'Desativar' : 'Reativar'}
            className="rounded-md p-2 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto disabled:opacity-50"
          >
            {ocupado === p.id ? <Loader2 size={15} className="animate-spin" /> : p.active ? <PowerOff size={15} /> : <Power size={15} />}
          </button>
        </div>
      ),
    },
  ]

  const ocultas = new Set([...(verCusto ? [] : ['custo', 'margem']), ...(podeEditar ? [] : ['acoes'])])
  const colunas = todas.filter((c) => !ocultas.has(c.chave))

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-borda p-4">
          <SearchInput placeholder="Buscar por nome, SKU ou marca..." />
          <FiltroSelect param="categoria" opcoes={categorias} todos="Todas as categorias" />
          <FiltroSelect param="situacao" opcoes={SITUACOES} todos="Ativos" />
          {podeEditar && <button
            onClick={() => setEditando(null)}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-dourado px-4 text-sm font-semibold text-preto transition-colors hover:bg-dourado-escuro"
          >
            <Plus size={16} />
            Novo produto
          </button>}
        </div>

        <DataTable
          colunas={colunas}
          linhas={produtos}
          vazio={
            <EmptyState
              titulo="Nenhum produto encontrado"
              descricao="Ajuste os filtros ou cadastre o primeiro produto do catálogo."
            />
          }
        />
      </Card>

      {editando !== undefined && (
        <Modal
          titulo={editando ? 'Editar produto' : 'Novo produto'}
          descricao={editando ? editando.name : 'O que for cadastrado já aparece no PDV.'}
          onFechar={() => setEditando(undefined)}
          largura="max-w-3xl"
        >
          <ProdutoForm
            produto={editando ?? undefined}
            categorias={categorias}
            fornecedores={fornecedores}
            onCancelar={() => setEditando(undefined)}
            onSalvo={(mensagem) => {
              setEditando(undefined)
              toast(mensagem, 'ok')
            }}
          />
        </Modal>
      )}
    </>
  )
}
