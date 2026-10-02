import { Hammer } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'

export function EmConstrucao({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="space-y-5">
      <PageHeader titulo={titulo} descricao={descricao} />
      <Card>
        <div className="flex flex-col items-center px-5 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-dourado/12 text-dourado">
            <Hammer size={22} />
          </span>
          <p className="mt-4 text-sm font-medium">Em construção</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-texto-3">Esta tela ainda não está disponível. Em breve.</p>
        </div>
      </Card>
    </div>
  )
}
