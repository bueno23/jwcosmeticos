'use client'

import { useActionState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { Botao, Campo, inputClass } from '@/components/ui/form'
import { entrarAction, type EstadoLogin } from './actions'

export function LoginForm({ destino }: { destino?: string }) {
  const [estado, enviar, pendente] = useActionState<EstadoLogin, FormData>(entrarAction, { ok: false })

  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="de" value={destino ?? ''} />

      <Campo label="E-mail" erro={estado.erros?.email}>
        <input
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="voce@jwcosmeticos.com"
          className={inputClass}
        />
      </Campo>

      <Campo label="Senha" erro={estado.erros?.senha}>
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClass}
        />
      </Campo>

      {estado.mensagem && (
        <p
          role="alert"
          className="rounded-lg border border-negativo/40 bg-negativo/10 px-3.5 py-2.5 text-[13px] text-negativo"
        >
          {estado.mensagem}
        </p>
      )}

      <Botao type="submit" disabled={pendente} className="w-full">
        {pendente ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
        {pendente ? 'Entrando...' : 'Entrar'}
      </Botao>
    </form>
  )
}
