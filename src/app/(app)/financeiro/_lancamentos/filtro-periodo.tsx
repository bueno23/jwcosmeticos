'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ATALHOS, type Periodo } from './periodo'

export function FiltroPeriodo({ periodo, hoje }: { periodo: Periodo; hoje: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [de, setDe] = useState(periodo.de)
  const [ate, setAte] = useState(periodo.ate)

  function navegar(mudar: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('periodo')
    params.delete('de')
    params.delete('ate')
    mudar(params)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function escolherAtalho(valor: string) {
    navegar((p) => {
      if (valor !== 'mes') p.set('periodo', valor)
    })
  }

  function aplicarIntervalo(e: React.FormEvent) {
    e.preventDefault()
    if (!de || !ate) return
    navegar((p) => {
      p.set('de', de)
      p.set('ate', ate)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex rounded-lg border border-borda bg-superficie p-1" role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button
            key={a.valor}
            type="button"
            onClick={() => escolherAtalho(a.valor)}
            aria-pressed={periodo.atalho === a.valor}
            className={cn(
              'focus-dourado rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              periodo.atalho === a.valor ? 'bg-dourado text-preto' : 'text-texto-2 hover:text-texto',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={aplicarIntervalo}
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-lg border bg-superficie px-2.5 py-1',
          periodo.atalho === 'livre' ? 'border-dourado/60' : 'border-borda',
        )}
      >
        <CalendarRange size={15} className="text-texto-3" />
        <input
          type="date"
          aria-label="De"
          value={de}
          max={ate || hoje}
          onChange={(e) => setDe(e.target.value)}
          className="focus-dourado rounded bg-transparent px-1 py-1.5 text-[13px] text-texto [color-scheme:dark]"
        />
        <span className="text-[12px] text-texto-3">até</span>
        <input
          type="date"
          aria-label="Até"
          value={ate}
          min={de}
          onChange={(e) => setAte(e.target.value)}
          className="focus-dourado rounded bg-transparent px-1 py-1.5 text-[13px] text-texto [color-scheme:dark]"
        />
        <button
          type="submit"
          disabled={!de || !ate}
          className="focus-dourado rounded-md px-2.5 py-1.5 text-[13px] font-medium text-dourado hover:bg-dourado/10 disabled:opacity-50"
        >
          Aplicar
        </button>
      </form>
    </div>
  )
}
