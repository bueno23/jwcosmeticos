import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getUsuario } from '@/lib/auth/dal'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function LoginPage({ searchParams }: Props) {
  // o proxy já redireciona quem tem sessão, mas conferimos contra o banco
  if (await getUsuario()) redirect('/')

  const sp = await searchParams
  const de = Array.isArray(sp.de) ? sp.de[0] : sp.de

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <div className="space-y-4">
            <Image
              src="/brand/logo.png"
              alt="JW Cosméticos"
              width={64}
              height={64}
              className="rounded-full"
              priority
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">JW Cosméticos</h1>
              <p className="mt-1 text-[13.5px] text-texto-3">Gestão da loja</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <LoginForm destino={de} />
        </div>

        <p className="text-center text-[12px] text-texto-3">
          Problema para entrar? Fale com o responsável pela loja.
        </p>
      </div>
    </div>
  )
}
