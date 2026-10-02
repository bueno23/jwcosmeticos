import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarToken } from '@/lib/auth/token'

/**
 * Guarda de porta, não de segurança. Aqui só verificamos assinatura e validade
 * do token para mandar quem não tem sessão para o login — sem tocar no banco,
 * porque o proxy roda em edge. A autorização de verdade está na DAL
 * (`src/lib/auth/dal.ts`), chamada por todo serviço antes de ler ou escrever.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userId = await verificarToken(request.cookies.get(COOKIE_SESSAO)?.value)

  if (pathname === '/login') {
    return userId ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next()
  }

  if (!userId) {
    const destino = new URL('/login', request.url)
    // guardar o destino para devolver o usuário ao ponto certo depois do login
    if (pathname !== '/') destino.searchParams.set('de', pathname)
    return NextResponse.redirect(destino)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|brand/|sw.js|registerSW.js|workbox-.*|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
