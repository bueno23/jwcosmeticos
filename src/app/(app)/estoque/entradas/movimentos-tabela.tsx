'use client'

import { ArrowUpCircle } from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { dataLonga, hora, money, number } from '@/lib/format'
import type { MovimentoLista } from '../produto-estoque'

export function MovimentosTabela({ movimentos }: { movimentos: MovimentoLista[] }) {
  const colunas: Coluna<MovimentoLista>[] = [
    {
      chave: 'produto',
      titulo: 'Produto',
      render: (m) => (
        <div className="min-w-[180px]">
          <div className="font-medium">{m.produto.name}</div>
          <div className="mt-0.5 text-[12px] text-texto-3">{m.origin ?? 'sem nota'}</div>
        </div>
      ),
    },
    {
      chave: 'quantidade',
      titulo: 'Quantidade',
      alinhamento: 'direita',
      render: (m) => (
        <span className="num font-semibold text-positivo">
          +{number(m.quantity)} <span className="text-[11.5px] font-normal text-texto-3">{m.produto.unit}</span>
        </span>
      ),
    },
    {
      chave: 'custo',
      titulo: 'Custo unitário',
      alinhamento: 'direita',
      render: (m) => <span className="num text-texto-2">{m.unitCost === null ? '—' : money(m.unitCost)}</span>,
    },
    {
      chave: 'total',
      titulo: 'Total',
      alinhamento: 'direita',
      render: (m) => <span className="num text-texto-2">{money((m.unitCost ?? 0) * m.quantity)}</span>,
    },
    {
      chave: 'saldo',
      titulo: 'Saldo depois',
      alinhamento: 'direita',
      render: (m) => <span className="num">{number(m.balance)}</span>,
    },
    {
      chave: 'quando',
      titulo: 'Quando',
      alinhamento: 'direita',
      render: (m) => (
        <span className="whitespace-nowrap text-[12.5px] text-texto-2">
          {dataLonga(m.createdAt)} <span className="text-texto-3">{hora(m.createdAt)}</span>
        </span>
      ),
    },
    {
      chave: 'motivo',
      titulo: 'Observação',
      render: (m) => <span className="text-[12.5px] text-texto-3">{m.reason ?? '—'}</span>,
    },
  ]

  return (
    <Card>
      <CardHeader titulo="Entradas registradas" icone={ArrowUpCircle} />
      {movimentos.length === 0 ? (
        <EmptyState
          titulo="Nenhuma entrada ainda"
          descricao="As compras de mercadoria aparecem aqui, da mais recente para a mais antiga."
        />
      ) : (
        <DataTable colunas={colunas} linhas={movimentos} vazio={null} />
      )}
    </Card>
  )
}
