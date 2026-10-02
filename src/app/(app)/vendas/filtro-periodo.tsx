'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/cn'
import { inputClass } from '@/components/ui/form'

const ATALHOS = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: '7d', label: '7 dias' },
  { valor: 'mes', label: 'Mês' },
  { valor: 'livre', label: 'Intervalo' },
]

/** Atalhos de período e datas livres, tudo em searchParams (periodo, de, ate). */
export function FiltroPeriodo() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const periodo = sp.get('periodo') ?? 'hoje'

  function mudar(mudancas: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-borda bg-superficie" role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button
            key={a.valor}
            type="button"
            onClick={() => mudar({ periodo: a.valor, ...(a.valor === 'livre' ? {} : { de: null, ate: null }) })}
            className={cn(
              'h-10 px-3.5 text-[13px] transition-colors',
              periodo === a.valor ? 'bg-dourado/15 font-semibold text-dourado' : 'text-texto-2 hover:text-texto',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      {periodo === 'livre' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="De"
            value={sp.get('de') ?? ''}
            onChange={(e) => mudar({ de: e.target.value || null })}
            className={cn(inputClass, 'h-10 w-40 [color-scheme:dark]')}
          />
          <span className="text-[13px] text-texto-3">até</span>
          <input
            type="date"
            aria-label="Até"
            value={sp.get('ate') ?? ''}
            onChange={(e) => mudar({ ate: e.target.value || null })}
            className={cn(inputClass, 'h-10 w-40 [color-scheme:dark]')}
          />
        </div>
      )}
    </div>
  )
}
