'use client'

import { History } from 'lucide-react'
import { Card, CardHeader, EmptyState } from '@/components/ui/card'
import { DataTable, type Coluna } from '@/components/ui/data-table'
import { cn } from '@/lib/cn'
import { dataLonga, hora, money } from '@/lib/format'
import type { CaixaFechado } from './tipos'

export function HistoricoCaixas({ caixas }: { caixas: CaixaFechado[] }) {
  const colunas: Coluna<CaixaFechado>[] = [
    {
      chave: 'data',
      titulo: 'Data',
      render: (c) => (
        <span className="whitespace-nowrap text-[12.5px]">
          {dataLonga(c.openedAt)}{' '}
          <span className="text-texto-3">
            {hora(c.openedAt)}{c.closedAt ? ` – ${hora(c.closedAt)}` : ''}
          </span>
        </span>
      ),
    },
    {
      chave: 'quem',
      titulo: 'Abriu / fechou',
      render: (c) => (
        <span className="text-[12.5px] text-texto-2">
          {c.abertoPor ?? '—'}
          {c.fechadoPor && c.fechadoPor !== c.abertoPor ? <span className="text-texto-3"> / {c.fechadoPor}</span> : null}
        </span>
      ),
    },
    {
      chave: 'inicial',
      titulo: 'Inicial',
      alinhamento: 'direita',
      render: (c) => <span className="num text-texto-2">{money(c.inicial)}</span>,
    },
    {
      chave: 'esperado',
      titulo: 'Esperado',
      alinhamento: 'direita',
      render: (c) => <span className="num">{money(c.esperado)}</span>,
    },
    {
      chave: 'informado',
      titulo: 'Informado',
      alinhamento: 'direita',
      render: (c) => <span className="num">{money(c.informado)}</span>,
    },
    {
      chave: 'diferenca',
      titulo: 'Diferença',
      alinhamento: 'direita',
      render: (c) => (
        <span
          className={cn(
            'num font-semibold',
            c.diferenca === 0 ? 'text-texto-3' : c.diferenca > 0 ? 'text-laranja' : 'text-negativo',
          )}
        >
          {c.diferenca > 0 ? '+' : c.diferenca < 0 ? '−' : ''}{money(Math.abs(c.diferenca))}
        </span>
      ),
    },
    {
      chave: 'notas',
      titulo: 'Observação',
      render: (c) => <span className="text-[12.5px] text-texto-2">{c.notes ?? '—'}</span>,
    },
  ]

  return (
    <Card>
      <CardHeader titulo="Caixas fechados" icone={History} />
      {caixas.length === 0 ? (
        <EmptyState titulo="Nenhum caixa fechado" descricao="Cada fechamento aparece aqui com o esperado, o contado e a diferença." />
      ) : (
        <DataTable colunas={colunas} linhas={caixas} vazio={null} />
      )}
    </Card>
  )
}
