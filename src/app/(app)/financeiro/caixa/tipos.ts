// Formas simples (sem Decimal) que a página passa aos componentes de cliente.

import type { CashMovementType } from '@/generated/prisma'
import type { ResumoCaixa } from '@/lib/services/caixa'

export type { ResumoCaixa }

export type MovimentoCaixa = {
  id: string
  type: CashMovementType
  amount: number
  description: string | null
  usuario: string | null
  createdAt: Date
}

export type CaixaFechado = {
  id: string
  openedAt: Date
  closedAt: Date | null
  abertoPor: string | null
  fechadoPor: string | null
  inicial: number
  esperado: number
  informado: number
  diferenca: number
  notes: string | null
}

export type EstadoCaixa = {
  ok: boolean
  mensagem?: string
  erros?: Record<string, string>
}

export const ROTULO_MOVIMENTO: Record<CashMovementType, string> = {
  ABERTURA: 'Abertura',
  VENDA: 'Venda',
  SANGRIA: 'Sangria',
  SUPRIMENTO: 'Suprimento',
  DESPESA: 'Despesa',
  FECHAMENTO: 'Fechamento',
}
