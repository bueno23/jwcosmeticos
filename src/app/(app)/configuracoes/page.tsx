import { Card, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { TemaSelector } from '@/components/configuracoes/tema-selector'
import { exigirPapel } from '@/lib/auth/dal'

export default async function ConfiguracoesPage() {
  await exigirPapel('DONO')
  return (
    <div className="space-y-5">
      <PageHeader titulo="Configurações" descricao="Parâmetros do sistema." />
      <Card>
        <CardHeader titulo="Aparência" />
        <div className="space-y-3 px-5 py-5">
          <p className="text-[13px] text-texto-2">Escolha a cor de fundo do sistema.</p>
          <TemaSelector />
        </div>
      </Card>
    </div>
  )
}
