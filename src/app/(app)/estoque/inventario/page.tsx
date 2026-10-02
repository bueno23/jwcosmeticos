import { ClipboardList } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { exigirPapel } from '@/lib/auth/dal'
import { listarProdutosComEstoque } from '@/lib/services/estoque'
import { paraProdutoEstoque } from '../produto-estoque'
import { InventarioForm } from './inventario-form'

// Sem isso o Next gera a rota estática e congela no primeiro build
export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  await exigirPapel('DONO', 'GERENTE')
  const produtos = await listarProdutosComEstoque()

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Inventário"
        descricao="Conte o estoque físico e feche a contagem. Só os produtos que divergirem geram ajuste."
      />

      <Card>
        <CardHeader titulo="Contagem geral" icone={ClipboardList} />
        <div className="p-5">
          <InventarioForm produtos={produtos.map(paraProdutoEstoque)} />
        </div>
      </Card>
    </div>
  )
}
