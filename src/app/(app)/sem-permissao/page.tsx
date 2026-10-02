import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { ROTULO_PAPEL } from '@/lib/auth/papeis'

export const dynamic = 'force-dynamic'

export default async function SemPermissaoPage() {
  const usuario = await usuarioObrigatorio()

  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-laranja/15 text-laranja">
        <ShieldAlert size={22} />
      </span>
      <h1 className="mt-4 text-lg font-bold">Você não tem acesso a esta tela</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-texto-2">
        Seu papel de {ROTULO_PAPEL[usuario.role].toLowerCase()} não permite ver esta área. Se precisar,
        peça ao responsável da loja.
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-borda bg-superficie-2 px-4 text-sm font-semibold text-texto transition-colors hover:border-borda-clara"
        >
          Voltar ao início
        </Link>
      </div>
    </Card>
  )
}
