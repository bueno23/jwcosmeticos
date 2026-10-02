'use client'

import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

export function SearchInput({ placeholder = 'Buscar...', param = 'q' }: { placeholder?: string; param?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [valor, setValor] = useState(searchParams.get(param) ?? '')
  const [, startTransition] = useTransition()

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (valor.trim()) params.set(param, valor.trim())
      else params.delete(param)
      const alvo = `${pathname}?${params.toString()}`
      startTransition(() => router.replace(alvo, { scroll: false }))
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <label className="relative block w-full sm:w-72">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        className="focus-dourado w-full rounded-lg border border-borda bg-superficie py-2.5 pl-9 pr-3 text-sm placeholder:text-texto-3"
      />
    </label>
  )
}
