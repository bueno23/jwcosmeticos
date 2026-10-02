import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/cn'

export function StatCard({
  titulo, valor, icone: Icone, variacao, legenda,
}: {
  titulo: string
  valor: string
  icone: React.ElementType
  variacao?: number | null
  legenda?: string
}) {
  const subiu = (variacao ?? 0) >= 0

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dourado/12 text-dourado">
          <Icone size={19} />
        </span>
        <span className="text-sm text-texto-2">{titulo}</span>
      </div>
      <div className="num mt-3 text-[26px] font-bold leading-none tracking-tight">{valor}</div>
      {variacao != null ? (
        <div className={cn('mt-3 flex items-center gap-1 text-[12.5px]', subiu ? 'text-positivo' : 'text-negativo')}>
          {subiu ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          <span className="num font-semibold">{subiu ? '+' : ''}{variacao.toFixed(0)}%</span>
          <span className="text-texto-3">{legenda ?? 'em relação a ontem'}</span>
        </div>
      ) : (
        <div className="mt-3 text-[12.5px] text-texto-3">{legenda ?? 'sem base de comparação'}</div>
      )}
    </div>
  )
}
