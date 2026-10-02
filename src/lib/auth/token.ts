import { jwtVerify, SignJWT } from 'jose'

/**
 * Assinatura do token de sessão.
 *
 * Sem `server-only` e sem `next/headers` de propósito: o proxy (edge) precisa
 * verificar o token, e a DAL (node) precisa assinar. Nada de banco aqui.
 */
export const COOKIE_SESSAO = 'jw_sessao'
export const DIAS_SESSAO = 7

function segredo(): Uint8Array {
  const valor = process.env.AUTH_SECRET
  if (!valor) {
    throw new Error('AUTH_SECRET não configurada. Gere uma com: openssl rand -base64 32')
  }
  return new TextEncoder().encode(valor)
}

export async function assinarToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${DIAS_SESSAO}d`)
    .sign(segredo())
}

/** Devolve o userId, ou null se o token estiver ausente, adulterado ou vencido. */
export async function verificarToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ['HS256'] })
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}
