import { ClipboardCheck } from 'lucide-react'
import { exigirPapel } from '@/lib/auth/dal'
import { Card, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { listarMovimentos, listarProdutosComEstoque } from '@/lib/services/estoque'
import { paraMovimento, paraProdutoEstoque } from '../produto-estoque'
import { AjusteForm } from './ajuste-form'
import { AjustesTabela } from './ajustes-tabela'

// Sem isso o Next gera a rota estática e congela no primeiro build
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function AjustesPage({ searchParams }: Props) {
  const sp = await searchParams
  await exigirPapel('DONO', 'GERENTE')
  const busca = primeiro(sp.q)?.trim() ?? ''

  const [produtos, movimentos] = await Promise.all([
    listarProdutosComEstoque(),
    listarMovimentos({ tipos: ['AJUSTE', 'PERDA'], busca: busca || undefined, limite: 50 }),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Ajustes de estoque"
        descricao="Corrija o saldo depois de uma contagem ou registre uma perda. Todo ajuste exige motivo e fica no histórico."
      />

      <Card>
        <CardHeader titulo="Novo ajuste ou perda" icone={ClipboardCheck} />
        <div className="p-5">
          <AjusteForm produtos={produtos.map(paraProdutoEstoque)} />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Buscar ajuste por produto..." />
        <span className="text-[12.5px] text-texto-3">
          {movimentos.length === 0
            ? 'Nenhum ajuste registrado ainda.'
            : `Mostrando os ${movimentos.length} mais recentes${busca ? ` para "${busca}"` : ''}.`}
        </span>
      </div>

      <AjustesTabela movimentos={movimentos.map(paraMovimento)} />
    </div>
  )
}
