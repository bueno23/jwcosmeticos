import Link from 'next/link'
import { cn } from '@/lib/cn'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('card', className)}>{children}</section>
}

export function CardHeader({
  titulo, icone: Icone, acao,
}: {
  titulo: string
  icone?: React.ElementType
  acao?: { label: string; href: string }
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-borda px-5 py-4">
      {Icone && <Icone size={17} className="text-dourado" />}
      <h2 className="text-[15px] font-semibold">{titulo}</h2>
      {acao && (
        <Link href={acao.href} className="ml-auto text-[13px] text-texto-2 transition-colors hover:text-dourado">
          {acao.label} →
        </Link>
      )}
    </div>
  )
}

export function EmptyState({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-texto">{titulo}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-texto-3">{descricao}</p>
    </div>
  )
}
