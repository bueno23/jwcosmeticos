import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Role } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { COOKIE_SESSAO, DIAS_SESSAO, assinarToken, verificarToken } from './token'

export type UsuarioSessao = {
  id: string
  name: string
  email: string
  role: Role
  companyId: string
  companyName: string
}

/** Lança quando não há sessão. As actions já capturam `Error` e mostram a mensagem. */
export class ErroDeSessao extends Error {
  constructor() {
    super('Sua sessão expirou. Entre de novo para continuar.')
    this.name = 'ErroDeSessao'
  }
}

/** Lança quando o papel logado não pode fazer a operação. */
export class ErroDePermissao extends Error {
  constructor(area = 'esta área') {
    super(`Seu perfil não permite alterar ${area}.`)
    this.name = 'ErroDePermissao'
  }
}

export async function getSessao(): Promise<string | null> {
  const jar = await cookies()
  return verificarToken(jar.get(COOKIE_SESSAO)?.value)
}

/**
 * Usuário da sessão, com a empresa junto. Cacheado por render pass, então
 * várias chamadas na mesma árvore não repetem a query.
 */
export const getUsuario = cache(async (): Promise<UsuarioSessao | null> => {
  const userId = await getSessao()
  if (!userId) return null

  const user = await prisma.user.findFirst({
    where: { id: userId, active: true },
    select: { id: true, name: true, email: true, role: true, company: { select: { id: true, name: true } } },
  })
  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.company.id,
    companyName: user.company.name,
  }
})

/** Para layout e páginas: sem sessão, manda para o login. */
export async function usuarioObrigatorio(): Promise<UsuarioSessao> {
  const user = await getUsuario()
  if (!user) redirect('/login')
  return user
}

/** Para as actions: devolve o id ou falha alto, sem redirecionar. */
export async function usuarioIdObrigatorio(): Promise<string> {
  const user = await getUsuario()
  if (!user) throw new ErroDeSessao()
  return user.id
}

/**
 * Empresa do usuário logado. Este é o único ponto de tenant: todo serviço
 * chama esta função, então trocar a origem da empresa mexe só aqui.
 */
export async function getCompanyId(): Promise<string> {
  const user = await getUsuario()
  if (!user) throw new ErroDeSessao()
  return user.companyId
}

export async function exigirPapel(...papeis: Role[]): Promise<UsuarioSessao> {
  const user = await usuarioObrigatorio()
  if (!papeis.includes(user.role)) redirect('/sem-permissao')
  return user
}

/**
 * O mesmo que exigirPapel, mas para dentro dos serviços: falha alto em vez de
 * redirecionar. Guardar a página não basta, porque dá para chamar uma server
 * action direto pelo navegador — a checagem precisa ficar junto do dado.
 */
export async function exigirPapelNoServico(...papeis: Role[]): Promise<UsuarioSessao> {
  const user = await getUsuario()
  if (!user) throw new ErroDeSessao()
  if (!papeis.includes(user.role)) throw new ErroDePermissao()
  return user
}

export async function criarSessao(userId: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_SESSAO, await assinarToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DIAS_SESSAO * 24 * 60 * 60,
  })
}

export async function destruirSessao(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_SESSAO)
}
