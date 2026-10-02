import { Boxes, Receipt, Truck } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { podeEditarCadastros, podeVerFinanceiro } from '@/lib/auth/papeis'
import { money, number } from '@/lib/format'
import { listarFornecedoresResumo } from '@/lib/services/fornecedores'
import { FornecedoresTabela } from './fornecedores-tabela'
import type { FornecedorLinha } from './fornecedor'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function FornecedoresPage({ searchParams }: Props) {
  const sp = await searchParams
  const busca = primeiro(sp.q)?.trim() ?? ''

  const { role } = await usuarioObrigatorio()
  const verFinanceiro = podeVerFinanceiro(role)
  const brutos = await listarFornecedoresResumo({ busca, comFinanceiro: verFinanceiro })

  const linhas: FornecedorLinha[] = brutos.map((f) => ({
    id: f.id,
    legalName: f.legalName,
    tradeName: f.tradeName,
    document: f.document,
    phone: f.phone,
    email: f.email,
    address: f.address,
    contactName: f.contactName,
    produtos: f.produtos,
    contasAbertas: verFinanceiro ? f.contasAbertas : 0,
    valorAberto: verFinanceiro ? f.valorAberto : 0,
  }))

  const produtos = linhas.reduce((n, f) => n + f.produtos, 0)
  const emAberto = linhas.reduce((n, f) => n + f.valorAberto, 0)
  const contas = linhas.reduce((n, f) => n + f.contasAbertas, 0)

  return (
    <div className="space-y-5">
      <PageHeader titulo="Fornecedores" descricao="Quem abastece a loja: contatos, produtos fornecidos e compras." />

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${verFinanceiro ? 'xl:grid-cols-3' : ''}`}>
        <StatCard
          titulo="Fornecedores"
          valor={number(linhas.length)}
          icone={Truck}
          legenda={busca ? 'no resultado da busca' : 'cadastrados'}
        />
        <StatCard titulo="Produtos vinculados" valor={number(produtos)} icone={Boxes} legenda="com fornecedor definido" />
        {verFinanceiro && (
          <StatCard
            titulo="A pagar em aberto"
            valor={money(emAberto)}
            icone={Receipt}
            legenda={contas > 0 ? `${number(contas)} conta(s) em aberto` : 'nenhuma conta em aberto'}
          />
        )}
      </div>

      <FornecedoresTabela
        fornecedores={linhas}
        verFinanceiro={verFinanceiro}
        podeEditar={podeEditarCadastros(role)}
        buscando={Boolean(busca)}
      />
    </div>
  )
}
