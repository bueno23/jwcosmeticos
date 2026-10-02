'use server'

import { redirect } from 'next/navigation'
import { ZodError, z } from 'zod'
import { conferirSenha } from '@/lib/auth/senha'
import { criarSessao, destruirSessao } from '@/lib/auth/dal'
import { prisma } from '@/lib/prisma'

export type EstadoLogin = {
  ok: boolean
  mensagem?: string
  erros?: Record<string, string>
}

const schema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
  de: z.string().optional(),
})

/** Só caminho interno: "de" vem do formulário e não pode virar URL externa. */
function destino(valor: string | undefined): string {
  return valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/'
}

export async function entrarAction(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  let dados: z.infer<typeof schema>
  try {
    dados = schema.parse({
      email: formData.get('email') ?? '',
      senha: formData.get('senha') ?? '',
      de: formData.get('de') ?? '',
    })
  } catch (e) {
    if (e instanceof ZodError) {
      const erros: Record<string, string> = {}
      for (const issue of e.issues) {
        const chave = String(issue.path[0] ?? '')
        if (chave && !erros[chave]) erros[chave] = issue.message
      }
      return { ok: false, mensagem: 'Revise os campos destacados.', erros }
    }
    throw e
  }

  // insensível a maiúsculas: o e-mail é único no banco, mas ninguém digita
  // "Ana@Exemplo.com" com a mesma caixa com que cadastrou
  const user = await prisma.user.findFirst({
    where: { email: { equals: dados.email, mode: 'insensitive' } },
  })

  // mesma resposta para e-mail errado, senha errada e usuário inativo:
  // não damos pista de quais e-mails existem
  const conferir = user ? await conferirSenha(dados.senha, user.passwordHash) : false
  if (!user || !conferir || !user.active) {
    return { ok: false, mensagem: 'E-mail ou senha incorretos.' }
  }

  await criarSessao(user.id)
  redirect(destino(dados.de)) // redirect lança NEXT_REDIRECT: fica fora do try
}

export async function sairAction(): Promise<void> {
  await destruirSessao()
  redirect('/login')
}
