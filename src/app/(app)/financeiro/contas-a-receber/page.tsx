import { EmConstrucao } from '@/components/ui/em-construcao'
import { exigirPapel } from '@/lib/auth/dal'

export default async function ContasAReceberPage() {
  await exigirPapel('DONO', 'GERENTE')
  return <EmConstrucao titulo="Contas a receber" descricao="Fiado e recebimentos por cliente." />
}
