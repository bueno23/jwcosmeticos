'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ABAS, type IdAba } from './abas'
import { ATALHOS, type Periodo } from './periodo'

/** Trocar de aba mantém o período, mas larga categoria, produto e pagamento: o significado muda por aba. */
export function Abas({ atual }: { atual: IdAba }) {
  const sp = useSearchParams()

  function href(id: IdAba) {
    const p = new URLSearchParams()
    for (const k of ['periodo', 'de', 'ate']) {
      const v = sp.get(k)
      if (v) p.set(k, v)
    }
    p.set('aba', id)
    return `/relatorios?${p.toString()}`
  }

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Relatórios">
      {ABAS.map((a) => (
        <Link
          key={a.id}
          href={href(a.id)}
          aria-current={a.id === atual ? 'page' : undefined}
          className={cn(
            'focus-dourado shrink-0 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors',
            a.id === atual
              ? 'border-dourado bg-dourado text-preto'
              : 'border-borda bg-superficie text-texto-2 hover:border-borda-clara hover:text-texto',
          )}
        >
          {a.label}
        </Link>
      ))}
    </nav>
  )
}

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
      <div className="flex flex-wrap rounded-lg border border-borda bg-superficie p-1" role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button
            key={a.valor}
            type="button"
            // Sempre explícito na URL: o padrão muda de aba para aba
            onClick={() => navegar((p) => p.set('periodo', a.valor))}
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

/** Alternância de duas ou mais opções guardada na URL (ex.: lucro por produto ou categoria). */
export function Segmentado({
  param, valor, opcoes,
}: {
  param: string
  valor: string
  opcoes: { valor: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function escolher(v: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(param, v)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex rounded-lg border border-borda bg-superficie p-1" role="group">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => escolher(o.valor)}
          aria-pressed={valor === o.valor}
          className={cn(
            'focus-dourado rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
            valor === o.valor ? 'bg-dourado text-preto' : 'text-texto-2 hover:text-texto',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
