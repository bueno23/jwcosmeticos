'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function FiltroSelect({
  param, opcoes, todos = 'Todos',
}: {
  param: string
  opcoes: { valor: string; label: string }[]
  todos?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function mudar(valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) params.set(param, valor)
    else params.delete(param)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <select
      value={searchParams.get(param) ?? ''}
      onChange={(e) => mudar(e.target.value)}
      className="focus-dourado rounded-lg border border-borda bg-superficie px-3 py-2.5 text-sm text-texto"
    >
      <option value="">{todos}</option>
      {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
    </select>
  )
}
