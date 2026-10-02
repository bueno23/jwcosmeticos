import { NextResponse, type NextRequest } from 'next/server'
import { ErroDePermissao, ErroDeSessao } from '@/lib/auth/dal'
import { lerParametros } from '../abas'
import { paraCsv } from '../csv'
import { carregar } from '../dados'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const busca = Object.fromEntries(request.nextUrl.searchParams)
  const params = lerParametros(busca)

  try {
    const resultado = await carregar(params)
    const periodo = params.aba === 'estoque' || params.aba === 'estoque-baixo'
      ? params.periodo.ate
      : `${params.periodo.de}_a_${params.periodo.ate}`
    const nome = `relatorio-${params.aba}${params.aba === 'lucro' ? `-${params.visao}` : ''}-${periodo}.csv`

    return new NextResponse(paraCsv(resultado, params.visao), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (erro) {
    if (erro instanceof ErroDeSessao) return new NextResponse('Sessão expirada.', { status: 401 })
    if (erro instanceof ErroDePermissao) return new NextResponse('Seu perfil não permite exportar relatórios.', { status: 403 })
    throw erro
  }
}
