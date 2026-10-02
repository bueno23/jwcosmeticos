import { cn } from '@/lib/cn'

export function StockBadge({ estoque, minimo }: { estoque: number; minimo: number }) {
  const situacao = estoque <= 0 ? 'Esgotado' : estoque <= minimo ? 'Baixo' : 'Normal'
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold',
        situacao === 'Esgotado' && 'bg-negativo/15 text-negativo',
        situacao === 'Baixo' && 'bg-negativo/15 text-negativo',
        situacao === 'Normal' && 'bg-positivo/15 text-positivo',
      )}
    >
      {situacao}
    </span>
  )
}
