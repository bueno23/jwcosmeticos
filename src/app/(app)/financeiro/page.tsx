import { EmConstrucao } from '@/components/ui/em-construcao'
import { exigirPapel } from '@/lib/auth/dal'

export default async function FinanceiroPage() {
  await exigirPapel('DONO', 'GERENTE')
  return <EmConstrucao titulo="Financeiro" descricao="Receitas, despesas, lucro e saldo do período." />
}
