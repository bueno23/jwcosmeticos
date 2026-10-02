import { usuarioObrigatorio } from '@/lib/auth/dal'
import { dataIsoNoFuso, caixaEstaAberto, listarClientesPdv, listarProdutosPdv } from '@/lib/services/vendas'
import { Pdv } from './pdv'

export const dynamic = 'force-dynamic'

export default async function NovaVendaPage() {
  const usuario = await usuarioObrigatorio()
  const [produtos, clientes, caixaAberto] = await Promise.all([
    listarProdutosPdv(),
    listarClientesPdv(),
    caixaEstaAberto(),
  ])

  return <Pdv produtos={produtos} clientes={clientes} caixaAberto={caixaAberto} vencimentoPadrao={dataIsoNoFuso(15)} empresa={usuario.companyName} />
}
