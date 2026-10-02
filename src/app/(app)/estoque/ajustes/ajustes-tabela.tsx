'use client'

import { ClipboardCheck, PackageMinus } from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { dataLonga, hora, money, number } from '@/lib/format'
import type { MovimentoLista } from '../produto-estoque'

export function AjustesTabela({ movimentos }: { movimentos: MovimentoLista[] }) {
  const colunas: Coluna<MovimentoLista>[] = [
    {
      chave: 'produto',
      titulo: 'Produto',
      render: (m) => <span className="min-w-[160px] font-medium">{m.produto.name}</span>,
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      render: (m) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
            m.type === 'PERDA' ? 'bg-negativo/15 text-negativo' : 'bg-laranja/15 text-laranja'
          }`}
        >
          {m.type === 'PERDA' ? <PackageMinus size={11} /> : <ClipboardCheck size={11} />}
          {m.type === 'PERDA' ? 'Perda' : 'Ajuste'}
        </span>
      ),
    },
    {
      chave: 'diferenca',
      titulo: 'Diferença',
      alinhamento: 'direita',
      render: (m) => (
        <span className={`num font-semibold ${m.quantity < 0 ? 'text-negativo' : 'text-positivo'}`}>
          {m.quantity > 0 ? '+' : ''}{number(m.quantity)}
        </span>
      ),
    },
    {
      chave: 'saldo',
      titulo: 'Saldo depois',
      alinhamento: 'direita',
      render: (m) => <span className="num">{number(m.balance)}</span>,
    },
    {
      chave: 'valor',
      titulo: 'Valor',
      alinhamento: 'direita',
      render: (m) => <span className="num text-texto-2">{money((m.unitCost ?? 0) * Math.abs(m.quantity))}</span>,
    },
    {
      chave: 'motivo',
      titulo: 'Motivo',
      render: (m) => <span className="text-[12.5px] text-texto-2">{m.reason}</span>,
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
  ]

  return (
    <Card>
      <CardHeader titulo="Ajustes e perdas" icone={ClipboardCheck} />
      {movimentos.length === 0 ? (
        <EmptyState
          titulo="Nenhum ajuste registrado"
          descricao="Contagens de inventário, quebras e perdas aparecem aqui com o motivo de cada uma."
        />
      ) : (
        <DataTable colunas={colunas} linhas={movimentos} vazio={null} />
      )}
    </Card>
  )
}
