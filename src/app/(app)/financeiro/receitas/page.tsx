import { TelaLancamentos, type ParametrosBusca } from '../_lancamentos/tela'

// Sem isso o Next gera a rota estática e congela no primeiro build
export const dynamic = 'force-dynamic'

export default function ReceitasPage({ searchParams }: { searchParams: ParametrosBusca }) {
  return <TelaLancamentos tipo="receita" searchParams={searchParams} />
}
