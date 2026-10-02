import { HandCoins, Users, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeEditarCadastros } from '@/lib/auth/papeis'
import { money, number } from '@/lib/format'
import { listarClientes, resumoClientes } from '@/lib/services/clientes'
import { ClientesTabela } from './clientes-tabela'
import { dataCurta, dataIso, type ClienteLinha } from './cliente'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function ClientesPage({ searchParams }: Props) {
  const sp = await searchParams
  const busca = primeiro(sp.q)?.trim() ?? ''

  const [{ role }, brutos, resumo] = await Promise.all([
    usuarioObrigatorio(),
    listarClientes(busca),
    resumoClientes(),
  ])

  const clientes: ClienteLinha[] = brutos.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    document: c.document,
    birthDate: dataIso(c.birthDate),
    notes: c.notes,
    totalComprado: c.totalComprado,
    compras: c.compras,
    ultimaCompra: c.ultimaCompra ? dataCurta(c.ultimaCompra) : null,
    fiadoAberto: c.fiadoAberto,
    vendasOuFiado: c._count.sales + c._count.receivables,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Clientes"
        descricao="Quem compra na loja, quanto já comprou e o que ficou no fiado."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard titulo="Clientes" valor={number(resumo.clientes)} icone={Users} legenda="no cadastro" />
        <StatCard
          titulo="Com fiado em aberto"
          valor={number(resumo.comFiado)}
          icone={HandCoins}
          legenda={resumo.comFiado > 0 ? 'clientes devendo' : 'ninguém devendo'}
        />
        <StatCard titulo="Total em aberto" valor={money(resumo.totalEmAberto)} icone={Wallet} legenda="a receber no fiado" />
      </div>

      <ClientesTabela clientes={clientes} podeRemover={podeEditarCadastros(role)} buscando={Boolean(busca)} />

      {busca && (
        <p className="text-[12.5px] text-texto-3">
          {number(clientes.length)} cliente(s) no resultado da busca.
        </p>
      )}
    </div>
  )
}
