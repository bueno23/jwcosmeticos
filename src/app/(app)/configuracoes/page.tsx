import { EmConstrucao } from '@/components/ui/em-construcao'
import { exigirPapel } from '@/lib/auth/dal'

export default async function ConfiguracoesPage() {
  await exigirPapel('DONO')
  return <EmConstrucao titulo="Configurações" descricao="Dados da empresa, usuários e parâmetros." />
}
