'use client'

import { X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const campo = 'focus-dourado rounded-lg border border-borda bg-superficie px-3 py-2 text-sm text-texto [color-scheme:dark]'

/** Período de vencimento na URL (`de` e `ate`), no mesmo esquema do FiltroSelect. */
export function FiltroPeriodo() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const de = searchParams.get('de') ?? ''
  const ate = searchParams.get('ate') ?? ''

  function mudar(mudancas: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) params.set(chave, valor)
      else params.delete(chave)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-texto-3">
      <span>Vence de</span>
      <input type="date" aria-label="Vencimento a partir de" value={de} max={ate || undefined} onChange={(e) => mudar({ de: e.target.value })} className={campo} />
      <span>até</span>
      <input type="date" aria-label="Vencimento até" value={ate} min={de || undefined} onChange={(e) => mudar({ ate: e.target.value })} className={campo} />
      {(de || ate) && (
        <button
          type="button"
          onClick={() => mudar({ de: '', ate: '' })}
          title="Limpar período"
          className="rounded-md p-1.5 text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
