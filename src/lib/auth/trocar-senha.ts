import 'server-only'

import { prisma } from '@/lib/prisma'
import { conferirSenha, gerarHashSenha } from './senha'

export class SenhaAtualIncorretaError extends Error {
  constructor() {
    super('Senha atual incorreta.')
    this.name = 'SenhaAtualIncorretaError'
  }
}

export async function trocarSenha(userId: string, senhaAtual: string, novaSenha: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const confere = await conferirSenha(senhaAtual, user.passwordHash)
  if (!confere) throw new SenhaAtualIncorretaError()

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await gerarHashSenha(novaSenha) },
  })
}
