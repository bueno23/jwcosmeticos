'use server'

import { z } from 'zod'
import { ErroDeSessao, usuarioIdObrigatorio } from '@/lib/auth/dal'
import { SenhaAtualIncorretaError, trocarSenha } from '@/lib/auth/trocar-senha'

export type EstadoTrocarSenha = { ok: boolean; mensagem?: string }

const schema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: z.string().min(6, 'A nova senha precisa ter pelo menos 6 caracteres'),
})

export async function trocarSenhaAction(senhaAtual: string, novaSenha: string): Promise<EstadoTrocarSenha> {
  const dados = schema.safeParse({ senhaAtual, novaSenha })
  if (!dados.success) {
    return { ok: false, mensagem: dados.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  try {
    const userId = await usuarioIdObrigatorio()
    await trocarSenha(userId, dados.data.senhaAtual, dados.data.novaSenha)
  } catch (e) {
    if (e instanceof SenhaAtualIncorretaError || e instanceof ErroDeSessao) return { ok: false, mensagem: e.message }
    throw e
  }

  return { ok: true, mensagem: 'Senha alterada com sucesso.' }
}
