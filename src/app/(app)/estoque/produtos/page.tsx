import { AlertTriangle, Boxes, Coins, PackageX, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { podeEditarCadastros, podeGerenciarEstoque, podeVerCusto } from '@/lib/auth/papeis'
import { usuarioObrigatorio } from '@/lib/auth/dal'
import { money, number } from '@/lib/format'
import {
  listarCategorias, listarFornecedores, listarProdutos, resumoEstoque,
} from '@/lib/services/produtos'
import { ProdutosTabela } from './produtos-tabela'
import { paraLinha, semCusto, type Opcao } from './produto'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function ProdutosPage({ searchParams }: Props) {
  const sp = await searchParams
  const busca = primeiro(sp.q)?.trim() ?? ''
  const categoria = primeiro(sp.categoria) ?? ''
  const situacao = (primeiro(sp.situacao) as 'ativos' | 'inativos' | 'baixo' | 'todos' | undefined) ?? 'ativos'

  const { role } = await usuarioObrigatorio()
  const verCusto = podeVerCusto(role)

  const [brutos, categorias, fornecedores, resumo] = await Promise.all([
    listarProdutos({ busca, categoria: categoria || undefined, situacao }),
    listarCategorias(),
    listarFornecedores(),
    resumoEstoque(),
  ])

  const opcoesCategorias: Opcao[] = categorias.map((c) => ({ valor: c.id, label: c.name }))
  const opcoesFornecedores: Opcao[] = fornecedores.map((f) => ({
    valor: f.id,
    label: f.tradeName || f.legalName,
  }))

  const filtrando = Boolean(busca || categoria || situacao !== 'ativos')

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Produtos"
        descricao={verCusto
          ? 'O catálogo da loja: preço, margem e o que está em cada produto.'
          : 'O catálogo da loja: preço e o que está em cada produto.'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Produtos ativos" valor={number(resumo.itens)} icone={Boxes} legenda="no catálogo" />
        <StatCard titulo="Unidades em estoque" valor={number(resumo.unidades)} icone={PackageX} legenda="soma de quem tem controle" />
        {verCusto ? (
          <>
            <StatCard titulo="Valor de custo" valor={money(resumo.valorCusto)} icone={Coins} />
            <StatCard
              titulo="Valor de venda"
              valor={money(resumo.valorVenda)}
              icone={Wallet}
              legenda={resumo.valorVenda > 0 ? `margem de ${money(resumo.valorVenda - resumo.valorCusto)}` : undefined}
            />
          </>
        ) : (
          <>
            <StatCard titulo="Abaixo do mínimo" valor={number(resumo.baixos)} icone={TriangleAlert} legenda="produtos para repor" />
            <StatCard titulo="Valor de venda" valor={money(resumo.valorVenda)} icone={Wallet} />
          </>
        )}
      </div>

      {resumo.baixos > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-laranja/35 bg-laranja/10 px-4 py-3 text-[13px]">
          <AlertTriangle size={16} className="shrink-0 text-laranja" />
          <span>
            <strong className="font-semibold">{resumo.baixos}</strong> produto(s) abaixo do estoque mínimo.{' '}
            {podeGerenciarEstoque(role) && <a href="/estoque/entradas" className="text-dourado hover:underline">Registrar entrada</a>}
          </span>
        </div>
      )}

      <ProdutosTabela
        produtos={brutos.map((b) => (verCusto ? paraLinha(b) : semCusto(paraLinha(b))))}
        categorias={opcoesCategorias}
        fornecedores={opcoesFornecedores}
        verCusto={verCusto}
        podeEditar={podeEditarCadastros(role)}
      />

      {filtrando && (
        <p className="text-[12.5px] text-texto-3">
          {number(brutos.length)} produto(s) no resultado atual do filtro.
        </p>
      )}
    </div>
  )
}
