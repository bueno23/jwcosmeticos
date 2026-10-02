import { PackagePlus } from 'lucide-react'
import { exigirPapel } from '@/lib/auth/dal'
import { Card, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { listarMovimentos, listarProdutosComEstoque } from '@/lib/services/estoque'
import { listarFornecedores } from '@/lib/services/produtos'
import { paraMovimento, paraProdutoEstoque } from '../produto-estoque'
import type { Opcao } from '../produtos/produto'
import { EntradaForm } from './entrada-form'
import { MovimentosTabela } from './movimentos-tabela'

// Sem isso o Next gera a rota estática e congela no primeiro build
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function EntradasPage({ searchParams }: Props) {
  const sp = await searchParams
  await exigirPapel('DONO', 'GERENTE')
  const busca = primeiro(sp.q)?.trim() ?? ''

  const [produtos, fornecedores, movimentos] = await Promise.all([
    listarProdutosComEstoque(),
    listarFornecedores(),
    listarMovimentos({ tipos: ['ENTRADA'], busca: busca || undefined, limite: 50 }),
  ])

  const opcoesFornecedores: Opcao[] = fornecedores.map((f) => ({
    valor: f.id,
    label: f.tradeName || f.legalName,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Entrada de estoque"
        descricao="Registre a compra de mercadoria. O custo médio do produto é recalculado com o preço desta entrada."
      />

      <Card>
        <CardHeader titulo="Nova entrada" icone={PackagePlus} />
        <div className="p-5">
          <EntradaForm
            produtos={produtos.map(paraProdutoEstoque)}
            fornecedores={opcoesFornecedores}
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Buscar entrada por produto..." />
        <span className="text-[12.5px] text-texto-3">
          {movimentos.length === 0
            ? 'Nenhuma entrada registrada ainda.'
            : `Mostrando as ${movimentos.length} entradas mais recentes${busca ? ` para "${busca}"` : ''}.`}
        </span>
      </div>

      <MovimentosTabela movimentos={movimentos.map(paraMovimento)} />
    </div>
  )
}
